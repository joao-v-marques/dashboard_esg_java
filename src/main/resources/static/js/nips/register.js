/* ==========================================================================
   register.js — controlador da tela NIP's › Registrar NIP.

   Carrega naturezas e status em paralelo, valida no cliente as mesmas regras
   do NipRequest (mais os dígitos verificadores do CPF), mantém o resumo ao
   vivo e envia o POST /api/nips. Depois de salvar, troca o formulário pelo
   painel de confirmação.
   ========================================================================== */

import '../shell.js';
import { api } from '../api.js';
import { confirmModal } from '../modal.js';
import { toast, setFieldError, clearFieldErrors, clearErrorOnInput } from '../ui.js';
import { todayIso, formatDay, dateTimeFormat } from '../format.js';

const ENDPOINT = 'api/nips';
const SUBMIT_LABEL = 'Registrar NIP';
const BUSY_LABEL = 'Registrando...';
const EMPTY = '—';

// Espelha o NipRequest: obrigatórios e tamanhos máximos.
// Campos com `format` são mascarados na tela e enviados só com os `digits` números
const FIELDS = [
    { name: 'nipNumber', required: true, digits: 10, format: formatNipNumber, incompleteMessage: 'Informe o número completo da NIP (000000/0000).' },
    { name: 'notificationDate', required: true, type: 'date' },
    { name: 'protocolCode', required: true, maxLength: 50 },
    { name: 'demandCode', required: true, maxLength: 50 },
    { name: 'beneficiaryName', required: true, maxLength: 150 },
    { name: 'beneficiaryCpf', required: true, type: 'cpf', digits: 11, format: formatCpf, incompleteMessage: 'Informe os 11 dígitos do CPF.' },
    { name: 'natureId', required: true, type: 'radio' },
    { name: 'statusId', required: true, type: 'select' },
    { name: 'description' },
    { name: 'responseDescription' },
];
const REQUIRED_COUNT = FIELDS.filter((field) => field.required).length;

const form = document.querySelector('[data-nip-form]');
const layout = document.querySelector('[data-layout]');
const formAlert = document.querySelector('[data-form-alert]');
const submitButton = form.querySelector('[data-submit]');
const clearButton = form.querySelector('[data-clear]');
const naturesEl = form.querySelector('[data-natures]');
const statusSelect = form.elements.statusId;
const statusHelp = form.querySelector('[data-status-help]');
const dateInput = form.elements.notificationDate;
const lookupsEl = form.querySelector('[data-lookups]');
const lookupsError = form.querySelector('[data-lookups-error]');
const successEl = document.querySelector('[data-success]');

const state = {
    lookups: 'loading',
    natures: [],
    statuses: [],
    busy: false,
};

dateInput.max = todayIso();

clearErrorOnInput(form);
FIELDS.filter((field) => field.format).forEach((field) => {
    const input = form.elements[field.name];
    input.addEventListener('input', () => applyMask(input, field.format));
    input.addEventListener('blur', () => validateMaskedOnBlur(field));
});
statusSelect.addEventListener('change', renderStatusHelp);
form.addEventListener('input', renderSummary);
form.addEventListener('change', renderSummary);
form.addEventListener('submit', submit);
clearButton.addEventListener('click', confirmClear);
form.querySelector('[data-lookups-retry]').addEventListener('click', loadLookups);
successEl.querySelector('[data-register-another]').addEventListener('click', startOver);

// Evita perder o que já foi digitado ao sair da página
window.addEventListener('beforeunload', (event) => {
    if (isDirty() && !state.busy && layout.hidden === false) event.preventDefault();
});

renderSummary();
loadLookups();

/* Dados -------------------------------------------------------------------- */

async function loadLookups() {
    state.lookups = 'loading';
    renderLookups();
    try {
        const [natures, statuses] = await Promise.all([api.get('api/nip-natures'), api.get('api/nip-status')]);
        state.natures = Array.isArray(natures) ? natures : [];
        state.statuses = Array.isArray(statuses) ? statuses : [];
        state.lookups = 'ready';
    } catch (error) {
        state.lookups = 'error';
        lookupsError.querySelector('[data-lookups-error-text]').textContent = error.message;
    }
    renderLookups();
    renderSummary();
}

/* Naturezas e status ------------------------------------------------------- */

function renderLookups() {
    const { lookups } = state;
    lookupsError.hidden = lookups !== 'error';
    lookupsEl.hidden = lookups === 'error';
    submitButton.disabled = lookups !== 'ready' || state.busy;
    if (lookups !== 'ready') return;

    renderNatures();
    renderStatuses();
}

function renderNatures() {
    const selected = form.querySelector('input[name="natureId"]:checked')?.value ?? '';
    naturesEl.replaceChildren(...state.natures.map((nature) => {
        const option = document.createElement('label');
        option.className = 'nature-option';

        const input = document.createElement('input');
        input.type = 'radio';
        input.name = 'natureId';
        input.value = String(nature.id);
        input.required = true;
        input.checked = input.value === selected;
        input.setAttribute('aria-describedby', 'nip-nature-error');

        const radio = document.createElement('span');
        radio.className = 'nature-option__radio';
        radio.setAttribute('aria-hidden', 'true');

        const text = document.createElement('span');
        text.className = 'nature-option__text';
        const title = document.createElement('span');
        title.className = 'nature-option__title';
        title.textContent = nature.name;
        text.append(title);
        if (nature.description) {
            const description = document.createElement('span');
            description.className = 'nature-option__description';
            description.textContent = nature.description;
            text.append(description);
        }

        option.append(input, radio, text);
        return option;
    }));
}

// Status agrupados: os que ainda estão em andamento primeiro, depois os finalizados
function renderStatuses() {
    const selected = statusSelect.value;
    const placeholder = new Option('Selecione o status', '');
    const groups = [
        { label: 'Em andamento', rows: state.statuses.filter((status) => !isFinished(status)) },
        { label: 'Finalizadas', rows: state.statuses.filter(isFinished) },
    ].filter((group) => group.rows.length);

    statusSelect.replaceChildren(placeholder, ...groups.map((group) => {
        const optgroup = document.createElement('optgroup');
        optgroup.label = group.label;
        group.rows.forEach((status) => optgroup.append(new Option(status.name, String(status.id))));
        return optgroup;
    }));
    statusSelect.value = statusSelect.querySelector(`option[value="${CSS.escape(selected)}"]`) ? selected : '';
    statusSelect.disabled = false;
    renderStatusHelp();
}

function isFinished(status) {
    return status.name.trim().toLowerCase().startsWith('finalizada');
}

function renderStatusHelp() {
    const status = findById(state.statuses, statusSelect.value);
    statusHelp.textContent = status?.description ?? '';
    statusHelp.hidden = !status?.description;
}

function findById(rows, id) {
    return id ? rows.find((row) => String(row.id) === String(id)) : undefined;
}

/* Máscaras (número da NIP e CPF) ------------------------------------------- */

function onlyDigits(value) {
    return String(value ?? '').replace(/\D/g, '');
}

// "0012342026" -> "001234/2026" (aceita parcial enquanto digita)
function formatNipNumber(value) {
    return onlyDigits(value).slice(0, 10).replace(/^(\d{6})(\d)/, '$1/$2');
}

// "12345678901" -> "123.456.789-01" (aceita parcial enquanto digita)
function formatCpf(value) {
    return onlyDigits(value).slice(0, 11)
        .replace(/^(\d{3})(\d)/, '$1.$2')
        .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

function isValidCpf(digits) {
    if (!/^\d{11}$/.test(digits) || /^(\d)\1{10}$/.test(digits)) return false;
    for (const length of [9, 10]) {
        let sum = 0;
        for (let i = 0; i < length; i++) sum += Number(digits[i]) * (length + 1 - i);
        if ((sum * 10) % 11 % 10 !== Number(digits[length])) return false;
    }
    return true;
}

// Aplica a máscara mantendo o cursor depois do mesmo dígito
function applyMask(input, format) {
    const caret = input.selectionStart ?? input.value.length;
    const digitsBefore = onlyDigits(input.value.slice(0, caret)).length;
    input.value = format(input.value);

    let position = 0;
    for (let seen = 0; position < input.value.length && seen < digitsBefore; position++) {
        if (/\d/.test(input.value[position])) seen++;
    }
    input.setSelectionRange(position, position);
}

function validateMaskedOnBlur(field) {
    const digits = readValue(field);
    if (!digits) return;
    setFieldError(form, field.name, validateField(field, digits));
}

/* Leitura e validação ------------------------------------------------------ */

function readValue(field) {
    // Rádio pelo :checked: com uma única opção, elements[name].value devolve o valor mesmo desmarcado
    const control = field.type === 'radio'
        ? form.querySelector(`input[name="${field.name}"]:checked`)
        : form.elements[field.name];
    if (!control) return null;
    if (field.format) return onlyDigits(control.value) || null;
    const value = control.value.trim();
    if (value === '') return null;
    if (field.type === 'radio' || field.type === 'select') return Number(value);
    return value;
}

function validateField(field, value) {
    if (value === null || value === undefined) {
        if (!field.required) return null;
        return field.type === 'radio' || field.type === 'select' ? 'Selecione uma opção.' : 'Preencha este campo.';
    }
    if (field.maxLength && String(value).length > field.maxLength) {
        return `Use no máximo ${field.maxLength} caracteres.`;
    }
    // Datas ISO (aaaa-mm-dd) comparam corretamente como texto
    if (field.type === 'date' && value > todayIso()) return 'A data de notificação não pode ser futura.';
    if (field.digits && value.length !== field.digits) return field.incompleteMessage;
    if (field.type === 'cpf' && !isValidCpf(value)) return 'CPF inválido. Confira os dígitos.';
    return null;
}

function readForm() {
    return Object.fromEntries(FIELDS.map((field) => [field.name, readValue(field)]));
}

function isDirty() {
    return Object.values(readForm()).some((value) => value !== null);
}

function focusField(name) {
    const control = name === 'natureId'
        ? form.querySelector('input[name="natureId"]:checked, input[name="natureId"]')
        : form.elements[name];
    control?.focus();
    control?.closest('[data-field]')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

/* Resumo ao vivo ----------------------------------------------------------- */

function renderSummary() {
    const data = readForm();
    const nature = findById(state.natures, data.natureId);
    const status = findById(state.statuses, data.statusId);

    setSummary('nipNumber', data.nipNumber && formatNipNumber(data.nipNumber));
    setSummary('notificationDate', data.notificationDate && formatDay(data.notificationDate));
    setSummary('protocolCode', data.protocolCode);
    setSummary('demandCode', data.demandCode);
    setSummary('beneficiaryName', data.beneficiaryName);
    setSummary('beneficiaryCpf', data.beneficiaryCpf && formatCpf(data.beneficiaryCpf));
    setSummary('statusId', status?.name);

    const natureBadge = document.querySelector('[data-summary="natureId"]');
    natureBadge.textContent = nature?.name ?? '';
    natureBadge.hidden = !nature;

    // Progresso: obrigatórios preenchidos (campos mascarados só contam completos)
    const filled = FIELDS.filter((field) => field.required).filter((field) => {
        const value = data[field.name];
        return field.digits ? value?.length === field.digits : value !== null;
    }).length;
    const text = `${filled} de ${REQUIRED_COUNT} obrigatórios`;
    document.querySelector('[data-progress-text]').textContent = text;
    document.querySelector('[data-progress-compact]').textContent = text;
    document.querySelector('[data-progress-fill]').style.width = `${(filled / REQUIRED_COUNT) * 100}%`;
    document.querySelector('[data-progress-bar]').setAttribute('aria-valuenow', String(filled));

    renderCounters();
}

function setSummary(name, value) {
    const target = document.querySelector(`[data-summary="${name}"]`);
    target.textContent = value || EMPTY;
    target.classList.toggle('is-empty', !value);
}

function renderCounters() {
    form.querySelectorAll('[data-counter-for]').forEach((counter) => {
        const control = form.elements[counter.dataset.counterFor];
        const length = control.value.length;
        counter.textContent = `${length.toLocaleString('pt-BR')} / ${control.maxLength.toLocaleString('pt-BR')}`;
        counter.classList.toggle('is-near', length >= control.maxLength * 0.9);
    });
}

/* Envio -------------------------------------------------------------------- */

async function submit(event) {
    event.preventDefault();
    if (state.busy || state.lookups !== 'ready') return;

    showAlert(null);
    clearFieldErrors(form);

    const data = readForm();
    let firstInvalid = null;
    FIELDS.forEach((field) => {
        const message = validateField(field, data[field.name]);
        if (message) {
            setFieldError(form, field.name, message);
            firstInvalid ??= field.name;
        }
    });
    if (firstInvalid) {
        focusField(firstInvalid);
        return;
    }

    setBusy(true);
    try {
        const created = await api.post(ENDPOINT, data);
        setBusy(false);
        showSuccess(created);
        toast(`NIP ${formatNipNumber(created.nipNumber)} registrada com sucesso.`);
    } catch (error) {
        setBusy(false);

        // Erros de campo vão para o campo; os sem campo e a mensagem geral (409) vão para o alerta do topo
        const fieldErrors = Object.entries(error.fields ?? {});
        const unmatched = fieldErrors.filter(([name, message]) => !setFieldError(form, name, message));
        if (unmatched.length) showAlert(unmatched.map(([, text]) => text).join(' '));
        else if (!fieldErrors.length) showAlert(error.message);

        const invalid = fieldErrors.find(([name]) => form.querySelector(`[data-field="${name}"]`));
        if (invalid) focusField(invalid[0]);
        else formAlert.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
}

function setBusy(busy) {
    state.busy = busy;
    submitButton.disabled = busy || state.lookups !== 'ready';
    clearButton.disabled = busy;
    submitButton.querySelector('.btn__spinner').hidden = !busy;
    submitButton.querySelector('[data-submit-icon]').hidden = busy;
    submitButton.querySelector('[data-submit-label]').textContent = busy ? BUSY_LABEL : SUBMIT_LABEL;
    form.setAttribute('aria-busy', String(busy));
}

function showAlert(message) {
    formAlert.lastElementChild.textContent = message ?? '';
    formAlert.hidden = !message;
}

/* Confirmação e limpeza ---------------------------------------------------- */

function showSuccess(nip) {
    successEl.querySelector('[data-success-text]').textContent =
        `A NIP ${formatNipNumber(nip.nipNumber)} foi salva e já está disponível no sistema.`;

    const createdAt = nip.createdAt ? dateTimeFormat.format(new Date(nip.createdAt)) : null;
    const items = [
        ['Número da NIP', formatNipNumber(nip.nipNumber)],
        ['Data de notificação', formatDay(nip.notificationDate)],
        ['Protocolo', nip.protocolCode],
        ['Código da demanda', nip.demandCode],
        ['Beneficiário', `${nip.beneficiaryName} · ${formatCpf(nip.beneficiaryCpf)}`, true],
        ['Natureza', nip.natureName],
        ['Status', nip.statusName],
        ['Registrada', [createdAt, nip.insertedBy && `por ${nip.insertedBy}`].filter(Boolean).join(' ') || EMPTY, true],
    ];
    successEl.querySelector('[data-success-list]').replaceChildren(...items.map(([label, value, full]) => {
        const item = document.createElement('div');
        if (full) item.className = 'is-full';
        const dt = document.createElement('dt');
        dt.textContent = label;
        const dd = document.createElement('dd');
        dd.textContent = value || EMPTY;
        item.append(dt, dd);
        return item;
    }));

    layout.hidden = true;
    successEl.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    successEl.querySelector('#sucesso-title').focus({ preventScroll: true });
}

function resetForm() {
    form.reset();
    clearFieldErrors(form);
    showAlert(null);
    dateInput.max = todayIso();
    renderStatusHelp();
    renderSummary();
}

function startOver() {
    resetForm();
    successEl.hidden = true;
    layout.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    form.elements.nipNumber.focus({ preventScroll: true });
}

async function confirmClear() {
    if (!isDirty()) {
        resetForm();
        return;
    }
    const confirmed = await confirmModal({
        title: 'Limpar formulário?',
        message: 'Tudo o que foi preenchido nesta NIP será apagado.',
        confirmLabel: 'Limpar',
        tone: 'danger',
        iconName: 'trash',
        onConfirm: async () => {},
    });
    if (confirmed) {
        resetForm();
        form.elements.nipNumber.focus();
    }
}
