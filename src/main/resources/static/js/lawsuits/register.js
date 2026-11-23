/* ==========================================================================
   register.js — controlador da tela Processos Jurídicos › Registrar Processo.

   Carrega objetos, trâmites, status e probabilidades de perda em paralelo,
   valida no cliente as mesmas regras do LawsuitRequest, mantém o resumo ao
   vivo (com a leitura do número CNJ) e envia o POST /api/lawsuits. Número do
   processo e valor da causa são mascarados na tela e enviados sem máscara:
   o número só com os 20 dígitos, o valor como número. O dígito verificador
   CNJ só gera aviso. Depois de salvar, troca o formulário pela confirmação.
   ========================================================================== */

import '../shell.js';
import { api, url } from '../api.js';
import { confirmModal } from '../modal.js';
import { toast, setFieldError, clearFieldErrors, clearErrorOnInput, applyMask } from '../ui.js';
import { todayIso, formatDay, dateTimeFormat, currencyFormat } from '../format.js';
import {
    onlyDigits, formatCaseNumber, CASE_NUMBER_DIGITS, isValidCaseNumber, describeCaseNumber,
    MONEY_MASK, riskTone, RISK_HINTS,
} from './lawsuit-format.js';

const ENDPOINT = 'api/lawsuits';
const SUBMIT_LABEL = 'Registrar processo';
const BUSY_LABEL = 'Registrando...';
const EMPTY = '—';
const MAX_CLAIM_VALUE = 1e13; // NUMERIC(15, 2): até 13 dígitos inteiros

// Espelha o LawsuitRequest: obrigatórios e tamanhos máximos.
// Campos com `mask` aparecem formatados na tela e são lidos pelo `parse` (sem máscara)
const FIELDS = [
    {
        name: 'caseNumber', required: true, digits: CASE_NUMBER_DIGITS,
        mask: { format: formatCaseNumber, parse: (text) => onlyDigits(text) || null },
        incompleteMessage: 'Informe os 20 dígitos do número do processo (padrão CNJ).',
    },
    { name: 'lawsuitDate', required: true, type: 'date' },
    { name: 'claimValue', required: true, type: 'money', mask: MONEY_MASK },
    { name: 'plaintiff', required: true, maxLength: 255 },
    { name: 'defendant', required: true, maxLength: 255 },
    { name: 'subjectMatterId', required: true, type: 'select', lookup: 'subjects' },
    { name: 'proceedingStageId', required: true, type: 'select', lookup: 'stages' },
    { name: 'statusId', required: true, type: 'select', lookup: 'statuses' },
    { name: 'lossProbabilityId', required: true, type: 'radio', lookup: 'risks' },
];
const REQUIRED_COUNT = FIELDS.filter((field) => field.required).length;

const LOOKUPS = {
    subjects: { endpoint: 'api/subject-matters', placeholder: 'Selecione o objeto' },
    stages: { endpoint: 'api/proceeding-stages', placeholder: 'Selecione o trâmite' },
    statuses: { endpoint: 'api/lawsuit-status', placeholder: 'Selecione o status' },
    risks: { endpoint: 'api/loss-probabilities' },
};

const form = document.querySelector('[data-lawsuit-form]');
const layout = document.querySelector('[data-layout]');
const formAlert = document.querySelector('[data-form-alert]');
const submitButton = form.querySelector('[data-submit]');
const clearButton = form.querySelector('[data-clear]');
const risksEl = form.querySelector('[data-risks]');
const lookupsEls = form.querySelectorAll('[data-lookups]');
const lookupsError = form.querySelector('[data-lookups-error]');
const caseCheck = form.querySelector('[data-case-check]');
const dateInput = form.elements.lawsuitDate;
const successEl = document.querySelector('[data-success]');
const anatomyEl = document.querySelector('[data-case-anatomy]');
const caseWarning = document.querySelector('[data-case-warning]');

const state = {
    lookups: 'loading',
    rows: { subjects: [], stages: [], statuses: [], risks: [] },
    busy: false,
};

dateInput.max = todayIso();

clearErrorOnInput(form);
FIELDS.filter((field) => field.mask).forEach((field) => {
    const input = form.elements[field.name];
    if (field.mask.inputMode) input.inputMode = field.mask.inputMode;
    input.addEventListener('input', () => applyMask(input, field.mask.format));
    input.addEventListener('blur', () => {
        // Acabamento ao sair do campo (ex.: "1.500" -> "1.500,00") e validação
        if (field.mask.finalize) {
            input.value = field.mask.finalize(input.value);
            renderSummary();
        }
        validateMaskedOnBlur(field);
    });
});
form.elements.caseNumber.addEventListener('input', renderCaseCheck);
form.querySelector('[data-swap-parties]').addEventListener('click', swapParties);
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

// Helpers como funções declaradas (içadas): renderSummary() já roda na carga, antes desta linha
function byName(a, b) {
    return String(a.name).localeCompare(String(b.name), 'pt-BR');
}

// Só opções ativas entram num cadastro novo (o backend recusa as inativas)
function activeRows(rows) {
    return (Array.isArray(rows) ? rows : []).filter((row) => row.isActive !== false);
}

async function loadLookups() {
    state.lookups = 'loading';
    renderLookups();
    try {
        const entries = await Promise.all(Object.entries(LOOKUPS).map(async ([key, { endpoint }]) => [key, await api.get(endpoint)]));
        entries.forEach(([key, rows]) => {
            state.rows[key] = activeRows(rows).sort(byName);
        });
        state.lookups = 'ready';
    } catch (error) {
        state.lookups = 'error';
        lookupsError.querySelector('[data-lookups-error-text]').textContent = error.message;
    }
    renderLookups();
    renderSummary();
}

function findById(rows, id) {
    return id ? rows.find((row) => String(row.id) === String(id)) : undefined;
}

function lookupRow(field, value) {
    return findById(state.rows[field.lookup], value);
}

function fieldByName(name) {
    return FIELDS.find((field) => field.name === name);
}

/* Selects e cards de risco ------------------------------------------------- */

function renderLookups() {
    const { lookups } = state;
    lookupsError.hidden = lookups !== 'error';
    lookupsEls.forEach((box) => { box.hidden = lookups === 'error'; });
    submitButton.disabled = lookups !== 'ready' || state.busy;
    if (lookups !== 'ready') return;

    FIELDS.filter((field) => field.type === 'select').forEach(renderSelect);
    renderRisks();
}

function renderSelect(field) {
    const select = form.elements[field.name];
    const selected = select.value;
    const options = state.rows[field.lookup].map((row) => {
        const option = new Option(row.name, String(row.id));
        option.title = row.name;
        return option;
    });
    select.replaceChildren(new Option(LOOKUPS[field.lookup].placeholder, ''), ...options);
    select.value = select.querySelector(`option[value="${CSS.escape(selected)}"]`) ? selected : '';
    select.disabled = false;
}

function renderRisks() {
    const selected = form.querySelector('input[name="lossProbabilityId"]:checked')?.value ?? '';
    // Remota antes de provável: do cenário mais favorável ao mais grave
    const order = { remote: 0, neutral: 1, probable: 2 };
    const rows = [...state.rows.risks].sort((a, b) => order[riskTone(a.name)] - order[riskTone(b.name)]);

    risksEl.replaceChildren(...rows.map((risk) => {
        const tone = riskTone(risk.name);
        const option = document.createElement('label');
        option.className = `nature-option risk-option risk-option--${tone}`;

        const input = document.createElement('input');
        input.type = 'radio';
        input.name = 'lossProbabilityId';
        input.value = String(risk.id);
        input.required = true;
        input.checked = input.value === selected;
        input.setAttribute('aria-describedby', 'lawsuit-risk-error');

        const radio = document.createElement('span');
        radio.className = 'nature-option__radio';
        radio.setAttribute('aria-hidden', 'true');

        const text = document.createElement('span');
        text.className = 'nature-option__text';
        const title = document.createElement('span');
        title.className = 'nature-option__title';
        title.textContent = risk.name;
        text.append(title);
        if (RISK_HINTS[tone]) {
            const description = document.createElement('span');
            description.className = 'nature-option__description';
            description.textContent = RISK_HINTS[tone];
            text.append(description);
        }

        option.append(input, radio, text);
        return option;
    }));
}

/* Máscaras e partes -------------------------------------------------------- */

function validateMaskedOnBlur(field) {
    const value = readValue(field);
    if (value === null) return;
    setFieldError(form, field.name, validateField(field, value));
}

// Dígito verificador: só avisa (o número pode ter sido copiado de um documento com erro e ainda assim ser o oficial)
function caseCheckFails() {
    const digits = readValue(fieldByName('caseNumber'));
    return digits?.length === CASE_NUMBER_DIGITS && !isValidCaseNumber(digits);
}

function renderCaseCheck() {
    const fails = caseCheckFails();
    caseCheck.hidden = !fails;
    caseWarning.hidden = !fails;
}

function swapParties() {
    const { plaintiff, defendant } = form.elements;
    [plaintiff.value, defendant.value] = [defendant.value, plaintiff.value];
    [plaintiff, defendant].forEach((input) => input.dispatchEvent(new Event('input', { bubbles: true })));
}

/* Leitura e validação ------------------------------------------------------ */

function readValue(field) {
    // Rádio pelo :checked: com uma única opção, elements[name].value devolve o valor mesmo desmarcado
    const control = field.type === 'radio'
        ? form.querySelector(`input[name="${field.name}"]:checked`)
        : form.elements[field.name];
    if (!control) return null;
    if (field.mask) return field.mask.parse(control.value);
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
    if (field.type === 'date' && value > todayIso()) return 'A data do processo não pode ser futura.';
    if (field.type === 'money' && value >= MAX_CLAIM_VALUE) return 'O valor da causa deve ter no máximo 13 dígitos inteiros.';
    if (field.digits && value.length !== field.digits) return field.incompleteMessage;
    return null;
}

function readForm() {
    return Object.fromEntries(FIELDS.map((field) => [field.name, readValue(field)]));
}

function isDirty() {
    return Object.values(readForm()).some((value) => value !== null);
}

function focusField(name) {
    const control = name === 'lossProbabilityId'
        ? form.querySelector('input[name="lossProbabilityId"]:checked, input[name="lossProbabilityId"]')
        : form.elements[name];
    control?.focus();
    control?.closest('[data-field]')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

/* Resumo ao vivo ----------------------------------------------------------- */

function renderSummary() {
    const data = readForm();
    const name = (fieldName) => lookupRow(fieldByName(fieldName), data[fieldName])?.name;

    setSummary('caseNumber', data.caseNumber && formatCaseNumber(data.caseNumber));
    setSummary('lawsuitDate', data.lawsuitDate && formatDay(data.lawsuitDate));
    setSummary('claimValue', data.claimValue !== null ? currencyFormat.format(data.claimValue) : null);
    setSummary('plaintiff', data.plaintiff);
    setSummary('defendant', data.defendant);
    setSummary('subjectMatterId', name('subjectMatterId'));
    setSummary('proceedingStageId', name('proceedingStageId'));
    setSummary('statusId', name('statusId'));

    renderAnatomy(data.caseNumber);
    renderCaseCheck();

    const risk = lookupRow(fieldByName('lossProbabilityId'), data.lossProbabilityId);
    const riskBadge = document.querySelector('[data-summary-risk]');
    riskBadge.textContent = risk ? `Perda ${risk.name.toLowerCase()}` : '';
    riskBadge.className = `badge risk-badge risk-badge--${risk ? riskTone(risk.name) : 'neutral'}`;
    riskBadge.hidden = !risk;

    // Progresso: obrigatórios preenchidos (o número só conta completo)
    const filled = FIELDS.filter((field) => field.required).filter((field) => {
        const value = data[field.name];
        return field.digits ? value?.length === field.digits : value !== null;
    }).length;
    const text = `${filled} de ${REQUIRED_COUNT} obrigatórios`;
    document.querySelector('[data-progress-text]').textContent = text;
    document.querySelector('[data-progress-compact]').textContent = text;
    document.querySelector('[data-progress-fill]').style.width = `${(filled / REQUIRED_COUNT) * 100}%`;
    document.querySelector('[data-progress-bar]').setAttribute('aria-valuenow', String(filled));
}

// Leitura do número CNJ: ano, Justiça, tribunal e origem aparecem conforme cada parte é digitada
function renderAnatomy(digits) {
    anatomyEl.replaceChildren(...describeCaseNumber(digits ?? '').map((part) => {
        const item = document.createElement('div');
        item.className = `case-anatomy__part${part.value ? ' is-known' : ''}`;
        const dt = document.createElement('dt');
        dt.textContent = part.label;
        const dd = document.createElement('dd');
        dd.textContent = part.value ?? EMPTY;
        item.append(dt, dd);
        return item;
    }));
}

function setSummary(name, value) {
    const target = document.querySelector(`[data-summary="${name}"]`);
    target.textContent = value || EMPTY;
    target.classList.toggle('is-empty', !value);
    if (value) target.title = value;
    else target.removeAttribute('title');
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
        toast(`Processo ${formatCaseNumber(created.caseNumber)} registrado com sucesso.`);
    } catch (error) {
        setBusy(false);

        // Número repetido (409) pertence ao campo do número; demais erros sem campo vão para o alerta do topo
        const fieldErrors = Object.entries(error.fields ?? {});
        if (error.status === 409 && !fieldErrors.length) fieldErrors.push(['caseNumber', error.message]);
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

function showSuccess(lawsuit) {
    const number = formatCaseNumber(lawsuit.caseNumber);
    successEl.querySelector('[data-success-text]').textContent =
        `O processo ${number} foi salvo e já está disponível em Controlar Processos.`;
    successEl.querySelector('[data-success-view]').href = url(`lawsuits?destaque=${encodeURIComponent(lawsuit.id)}`);

    const createdAt = lawsuit.createdAt ? dateTimeFormat.format(new Date(lawsuit.createdAt)) : null;
    const items = [
        ['Número do processo', number, true],
        ['Data do processo', formatDay(lawsuit.lawsuitDate)],
        ['Valor da causa', currencyFormat.format(Number(lawsuit.claimValue) || 0)],
        ['Autor', lawsuit.plaintiff],
        ['Réu', lawsuit.defendant],
        ['Objeto', lawsuit.subjectMatterName, true],
        ['Trâmite', lawsuit.proceedingStageName],
        ['Probabilidade de perda', lawsuit.lossProbabilityName],
        ['Status', lawsuit.statusName, true],
        ['Registrado', [createdAt, lawsuit.insertedByName && `por ${lawsuit.insertedByName}`].filter(Boolean).join(' ') || EMPTY, true],
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
    renderSummary();
}

function startOver() {
    resetForm();
    successEl.hidden = true;
    layout.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    form.elements.caseNumber.focus({ preventScroll: true });
}

async function confirmClear() {
    if (!isDirty()) {
        resetForm();
        return;
    }
    const confirmed = await confirmModal({
        title: 'Limpar formulário?',
        message: 'Tudo o que foi preenchido neste processo será apagado.',
        confirmLabel: 'Limpar',
        tone: 'danger',
        iconName: 'trash',
        onConfirm: async () => {},
    });
    if (confirmed) {
        resetForm();
        form.elements.caseNumber.focus();
    }
}
