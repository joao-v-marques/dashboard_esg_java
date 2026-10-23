/* ==========================================================================
   nips.js — controlador da tela NIP's › Controlar NIP's.

   Carrega NIP's, status e naturezas em paralelo. Filtros, busca, ordenação,
   paginação e indicadores são calculados no cliente sobre a lista completa;
   cada linha abre o modal de detalhes ou o de edição (PUT /api/nips/{id}).
   ========================================================================== */

import '../shell.js';
import { api, ApiError } from '../api.js';
import { ICONS } from '../icons.js';
import { openFormModal, detailModal } from '../modal.js';
import { renderTable } from '../data-table.js';
import { toast, normalize } from '../ui.js';
import {
    intFormat, percentFormat, dateTimeFormat, todayIso, formatDay, weekday,
} from '../format.js';
import { onlyDigits, formatNipNumber, formatCpf, maskCpf, isValidCpf, isFinished } from './nip-format.js';

const ENDPOINT = 'api/nips';
const PAGE_SIZE = 20;

const filtersForm = document.querySelector('[data-filters]');
const filtersToggle = document.querySelector('[data-filters-toggle]');
const filtersToggleLabel = document.querySelector('[data-filters-toggle-label]');
const clearButton = document.querySelector('[data-filters-clear]');
const scopeEl = document.querySelector('[data-scope]');
const resultsEl = document.querySelector('[data-results]');
const tableEl = document.querySelector('[data-table]');
const pager = document.querySelector('[data-pager]');
const pageStatus = document.querySelector('[data-page-status]');
const kpisEl = document.querySelector('[data-kpis]');

const inputs = {
    search: filtersForm.elements.search,
    status: filtersForm.elements.status,
    nature: filtersForm.elements.nature,
    from: filtersForm.elements.from,
    to: filtersForm.elements.to,
};

const state = {
    nips: { status: 'loading', rows: [] },
    statuses: { status: 'loading', rows: [] },
    natures: { status: 'loading', rows: [] },
    filters: { search: '', status: '', nature: '', from: '', to: '', scope: '' },
    sort: { key: 'date', dir: 'desc' },
    page: 1,
    highlightId: null,
};

kpisEl.querySelectorAll('[data-kpi-icon]').forEach((box) => { box.innerHTML = ICONS[box.dataset.kpiIcon] ?? ''; });
inputs.from.max = todayIso();
inputs.to.max = todayIso();

bindFilters();
pager.addEventListener('click', (event) => {
    const button = event.target.closest('[data-page]');
    if (!button || button.disabled) return;
    state.page += button.dataset.page === 'next' ? 1 : -1;
    renderList();
    tableEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
});

renderList();
loadLookups();
loadNips();

/* Dados -------------------------------------------------------------------- */

async function loadNips() {
    const previous = state.nips;
    try {
        const rows = await api.get(ENDPOINT);
        state.nips = { status: 'ready', rows: Array.isArray(rows) ? rows : [] };
    } catch (error) {
        // Num recarregamento após salvar, mantém o que já estava na tela
        state.nips = previous.status === 'ready' ? previous : { status: 'error', rows: [], error: error.message };
        if (previous.status === 'ready') toast(error.message, { type: 'danger' });
    }
    renderList();
}

async function loadLookups() {
    const load = async (key, endpoint) => {
        try {
            const rows = await api.get(endpoint);
            state[key] = { status: 'ready', rows: (Array.isArray(rows) ? rows : []).sort(byName) };
        } catch (error) {
            state[key] = { status: 'error', rows: [], error: error.message };
        }
    };
    await Promise.all([load('statuses', 'api/nip-status'), load('natures', 'api/nip-natures')]);

    const failed = [state.statuses, state.natures].find((entry) => entry.status === 'error');
    if (failed) toast(`Não foi possível carregar status e naturezas. ${failed.error}`, { type: 'danger' });

    fillStatusFilter();
    fillSelect(inputs.nature, state.natures.rows);
    renderList();
}

const byName = (a, b) => String(a.name).localeCompare(String(b.name), 'pt-BR');

function fillSelect(select, rows) {
    rows.forEach((row) => select.append(new Option(row.name, String(row.id))));
}

function fillStatusFilter() {
    statusGroups().forEach((group) => {
        const optgroup = document.createElement('optgroup');
        optgroup.label = group.label;
        fillSelect(optgroup, group.rows);
        inputs.status.append(optgroup);
    });
}

// Status agrupados como no registro: em andamento primeiro, depois os finalizados
function statusGroups() {
    const rows = state.statuses.rows;
    return [
        { label: 'Em andamento', rows: rows.filter((status) => !isFinished(status)) },
        { label: 'Finalizadas', rows: rows.filter(isFinished) },
    ].filter((group) => group.rows.length);
}

const findById = (rows, id) => rows.find((row) => row.id === id);
const isNipFinished = (row) => isFinished({ name: row.statusName });
const lookupsReady = () => state.statuses.status === 'ready' && state.natures.status === 'ready';

/* Filtros ------------------------------------------------------------------ */

function bindFilters() {
    filtersForm.addEventListener('submit', (event) => event.preventDefault());

    filtersForm.addEventListener('input', (event) => {
        const name = event.target.name;
        if (!(name in state.filters)) return;
        state.filters[name] = event.target.value;
        // Mantém o período coerente: "até" nunca antes de "de"
        inputs.to.min = state.filters.from;
        inputs.from.max = state.filters.to || todayIso();
        state.page = 1;
        renderList();
    });

    filtersForm.addEventListener('reset', () => {
        Object.keys(state.filters).forEach((key) => { state.filters[key] = ''; });
        inputs.to.min = '';
        inputs.from.max = todayIso();
        state.page = 1;
        // O reset do form atualiza os campos depois do evento
        requestAnimationFrame(renderList);
    });

    scopeEl.addEventListener('click', (event) => {
        const button = event.target.closest('[data-scope-value]');
        if (!button) return;
        state.filters.scope = button.dataset.scopeValue;
        state.page = 1;
        renderList();
    });

    filtersToggle.addEventListener('click', () => {
        const open = !filtersForm.classList.contains('is-open');
        filtersForm.classList.toggle('is-open', open);
        filtersToggle.setAttribute('aria-expanded', String(open));
        if (open) inputs.search.focus();
    });
}

function activeFilterCount() {
    return Object.values(state.filters).filter((value) => value.trim() !== '').length;
}

function filteredRows() {
    const { search, status, nature, from, to, scope } = state.filters;
    const term = normalize(search.trim());
    const digits = onlyDigits(search);
    const statusId = status ? Number(status) : null;
    const natureId = nature ? Number(nature) : null;

    return state.nips.rows.filter((row) => (
        (!statusId || row.statusId === statusId)
        && (!natureId || row.natureId === natureId)
        && (!from || row.notificationDate >= from)
        && (!to || row.notificationDate <= to)
        && (!scope || (scope === 'finished') === isNipFinished(row))
        && (!term || matchesSearch(row, term, digits))
    ));
}

// Busca por texto (sem acento) ou só pelos dígitos, para achar "001234/2026" e "123.456.789-01" com ou sem máscara
function matchesSearch(row, term, digits) {
    const text = normalize([
        row.nipNumber, formatNipNumber(row.nipNumber), row.protocolCode, row.demandCode,
        row.beneficiaryName, row.natureName, row.statusName,
    ].join(' '));
    if (text.includes(term)) return true;
    return digits.length >= 3 && [row.nipNumber, row.beneficiaryCpf, row.protocolCode, row.demandCode]
        .some((value) => onlyDigits(value).includes(digits));
}

// "0012342026" -> "2026001234": ordena pelo ano e depois pela sequência
const numberKey = (row) => {
    const digits = onlyDigits(row.nipNumber);
    return digits.slice(6) + digits.slice(0, 6);
};

function sortRows(rows) {
    const { key, dir } = state.sort;
    const factor = dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
        const primary = key === 'number'
            ? numberKey(a).localeCompare(numberKey(b))
            : String(a.notificationDate).localeCompare(String(b.notificationDate));
        // Desempate estável: registrada por último primeiro
        return (primary * factor) || (b.id - a.id);
    });
}

function onSort(key) {
    state.sort = state.sort.key === key
        ? { key, dir: state.sort.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'desc' };
    state.page = 1;
    renderList();
}

/* Renderização ------------------------------------------------------------- */

function renderList() {
    const entry = state.nips;
    const filtered = entry.status === 'ready' ? filteredRows() : [];
    const sorted = sortRows(filtered);

    const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
    state.page = Math.min(Math.max(1, state.page), totalPages);
    const start = (state.page - 1) * PAGE_SIZE;
    const pageRows = sorted.slice(start, start + PAGE_SIZE);

    renderFilterState();
    renderKpis(entry.status, filtered);
    renderResults(entry, sorted.length, start, pageRows.length);

    renderTable(tableEl, {
        state: entry.status,
        columns: columns(),
        rows: pageRows,
        stack: true,
        sort: state.sort,
        onSort,
        rowClass: (row) => (row.id === state.highlightId ? 'is-highlight' : ''),
        actions: (row) => [
            { icon: 'eye', label: 'Ver detalhes', onClick: () => openDetails(row) },
            { icon: 'edit', label: 'Editar NIP', onClick: () => openEdit(row), disabledReason: editBlockedReason() },
        ],
        errorText: entry.error,
        onRetry: () => {
            state.nips = { status: 'loading', rows: [] };
            renderList();
            loadNips();
        },
        empty: entry.rows.length === 0
            ? { title: 'Nenhuma NIP registrada', text: 'Use "Registrar NIP" para lançar a primeira notificação.' }
            : { title: 'Nenhuma NIP encontrada', text: 'Revise a busca ou ajuste os filtros de status, natureza e período.' },
    });

    pager.hidden = entry.status !== 'ready' || totalPages <= 1;
    pager.querySelector('[data-page="prev"]').disabled = state.page <= 1;
    pager.querySelector('[data-page="next"]').disabled = state.page >= totalPages;
    pageStatus.textContent = `Página ${state.page} de ${totalPages}`;
}

function editBlockedReason() {
    if (lookupsReady()) return null;
    return state.statuses.status === 'error' || state.natures.status === 'error'
        ? 'Não foi possível carregar status e naturezas. Recarregue a página.'
        : 'Aguarde o carregamento de status e naturezas.';
}

function renderFilterState() {
    // A situação (Todas/Em andamento/Finalizadas) fica à vista; o contador do botão conta só o formulário
    const count = activeFilterCount() - (state.filters.scope ? 1 : 0);
    clearButton.disabled = activeFilterCount() === 0;
    filtersToggleLabel.textContent = count ? `Filtros (${count})` : 'Filtros';
    [inputs.status, inputs.nature, inputs.from, inputs.to].forEach((input) => {
        input.classList.toggle('is-set', input.value !== '');
    });
    scopeEl.querySelectorAll('[data-scope-value]').forEach((button) => {
        button.setAttribute('aria-pressed', String(button.dataset.scopeValue === state.filters.scope));
    });
}

function renderResults(entry, total, start, shown) {
    resultsEl.replaceChildren();
    if (entry.status !== 'ready') return;
    const all = entry.rows.length;
    const strong = (text) => {
        const node = document.createElement('strong');
        node.textContent = text;
        return node;
    };
    if (total === 0) {
        resultsEl.append(`0 de ${intFormat.format(all)} NIP's`);
        return;
    }
    resultsEl.append(
        'Exibindo ', strong(`${intFormat.format(start + 1)}–${intFormat.format(start + shown)}`),
        ' de ', strong(intFormat.format(total)), total === 1 ? ' NIP' : " NIP's",
        total !== all ? ` (filtradas de ${intFormat.format(all)})` : '',
    );
}

function setKpi(name, valueText, hint) {
    const value = kpisEl.querySelector(`[data-kpi="${name}"]`);
    value.replaceChildren(valueText);
    kpisEl.querySelector(`[data-kpi-hint="${name}"]`).textContent = hint ?? '';
}

function renderKpis(status, rows) {
    if (status === 'loading') return; // mantém os skeletons do HTML
    const fill = kpisEl.querySelector('[data-kpi-meter-fill]');
    const meter = kpisEl.querySelector('[data-kpi-meter]');

    if (status === 'error') {
        ['total', 'open', 'finished', 'year'].forEach((name) => setKpi(name, '–', 'Dados indisponíveis'));
        fill.style.width = '0';
        return;
    }

    const total = rows.length;
    const all = state.nips.rows.length;
    setKpi('total', intFormat.format(total),
        total === all ? 'Registradas no sistema' : `De ${intFormat.format(all)} registradas`);

    const finished = rows.filter(isNipFinished).length;
    const open = total - finished;
    const share = total > 0 ? finished / total : 0;
    setKpi('open', intFormat.format(open),
        total > 0 ? `${percentFormat.format(open / total)} das NIP's` : 'Nenhuma NIP no filtro');
    setKpi('finished', intFormat.format(finished),
        total > 0 ? `${percentFormat.format(share)} concluídas` : 'Nenhuma NIP no filtro');
    fill.style.width = `${(share * 100).toFixed(1)}%`;
    meter.setAttribute('aria-label', `Proporção finalizada: ${percentFormat.format(share)}`);

    // Pela data de notificação (aaaa-mm-dd), com o ano anterior como referência
    const year = new Date().getFullYear();
    const inYear = (y) => rows.filter((row) => String(row.notificationDate).startsWith(`${y}-`)).length;
    setKpi('year', intFormat.format(inYear(year)), `Notificadas em ${year} · ${intFormat.format(inYear(year - 1))} em ${year - 1}`);
}

/* Colunas ------------------------------------------------------------------ */

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
}

function statusBadge(row) {
    const finished = isNipFinished(row);
    const badge = el('span', `badge badge--status ${finished ? 'badge--success' : 'badge--progress'}`, row.statusName);
    const description = findById(state.statuses.rows, row.statusId)?.description;
    if (description) badge.title = description;
    return badge;
}

function natureBadge(row) {
    return el('span', 'badge badge--status badge--outline badge--plain', row.natureName);
}

function columns() {
    return [
        {
            label: 'NIP',
            sortKey: 'number',
            render: (row) => {
                const cell = el('div', 'cell-nip');
                cell.append(
                    el('span', 'cell-nip__number', formatNipNumber(row.nipNumber)),
                    el('span', 'cell-nip__meta', `Protocolo ${row.protocolCode}`),
                );
                return cell;
            },
        },
        {
            label: 'Notificação',
            sortKey: 'date',
            className: 'col-nowrap',
            render: (row) => {
                const cell = el('div', 'cell-date');
                cell.append(el('span', 'cell-date__day', formatDay(row.notificationDate)), el('span', 'cell-date__weekday', weekday(row.notificationDate)));
                return cell;
            },
        },
        {
            label: 'Beneficiário',
            className: 'col-stack-full',
            render: (row) => {
                const cell = el('div', 'cell-person');
                const name = el('span', 'cell-person__name', row.beneficiaryName);
                name.title = row.beneficiaryName;
                cell.append(name, el('span', 'cell-person__meta', `CPF ${maskCpf(row.beneficiaryCpf)}`));
                return cell;
            },
        },
        { label: 'Natureza', render: natureBadge },
        { label: 'Status', render: statusBadge },
        {
            label: 'Última atualização',
            className: 'col-stack-full nips-col-updated',
            render: (row) => {
                const cell = el('div', 'cell-user');
                const edited = row.updatedBy && row.updatedAt;
                cell.append(el('span', 'cell-user__name', (edited ? row.updatedBy : row.insertedBy) ?? '-'));
                const when = edited ? row.updatedAt : row.createdAt;
                if (when) cell.append(el('span', 'cell-user__meta', `${edited ? 'Editou' : 'Registrou'} em ${dateTimeFormat.format(new Date(when))}`));
                return cell;
            },
        },
    ];
}

/* Detalhes ----------------------------------------------------------------- */

function auditText(when, who) {
    return [when && dateTimeFormat.format(new Date(when)), who && `por ${who}`].filter(Boolean).join(' ') || null;
}

async function openDetails(row) {
    const status = findById(state.statuses.rows, row.statusId);
    const nature = findById(state.natures.rows, row.natureId);
    const notified = `${formatDay(row.notificationDate)} (${weekday(row.notificationDate)})`;

    const choice = await detailModal({
        title: `NIP ${formatNipNumber(row.nipNumber)}`,
        description: `${row.beneficiaryName} · notificada em ${formatDay(row.notificationDate)}`,
        iconName: 'fileAlert',
        size: 'xl',
        sections: [
            {
                title: 'Situação',
                items: [
                    { label: 'Status', value: statusBadge(row), note: status?.description },
                    { label: 'Natureza', value: natureBadge(row), note: nature?.description },
                ],
            },
            {
                title: 'Identificação',
                items: [
                    { label: 'Número da NIP', value: formatNipNumber(row.nipNumber), mono: true },
                    { label: 'Data de notificação', value: notified },
                    { label: 'Protocolo', value: row.protocolCode, mono: true },
                    { label: 'Código da demanda', value: row.demandCode, mono: true },
                ],
            },
            {
                title: 'Beneficiário',
                items: [
                    { label: 'Nome', value: row.beneficiaryName },
                    { label: 'CPF', value: formatCpf(row.beneficiaryCpf), mono: true },
                ],
            },
            {
                title: 'Histórico',
                items: [
                    { label: 'Registrada', value: auditText(row.createdAt, row.insertedBy) },
                    { label: 'Última edição', value: row.updatedAt ? auditText(row.updatedAt, row.updatedBy) : 'Nunca editada' },
                ],
            },
            {
                title: 'Descrições',
                full: true,
                items: [
                    { label: 'Descrição da demanda', value: row.description?.trim(), long: true },
                    { label: 'Resposta enviada', value: row.responseDescription?.trim(), long: true },
                ],
            },
        ],
        actions: lookupsReady() ? [{ id: 'edit', label: 'Editar NIP', icon: 'edit' }] : [],
    });

    if (choice === 'edit') openEdit(row);
}

/* Edição ------------------------------------------------------------------- */

function formFields() {
    const options = (rows) => rows.map((row) => ({ value: row.id, label: row.name }));
    return [
        {
            name: 'nipNumber', label: 'Número da NIP', required: true, maxLength: 11, placeholder: '000000/2026',
            mask: { format: formatNipNumber, parse: onlyDigits },
            validate: (value) => (value.length === 10 ? null : 'Informe o número completo da NIP (000000/0000).'),
        },
        {
            name: 'notificationDate', label: 'Data de notificação', type: 'date', required: true,
            max: todayIso(), maxMessage: 'A data de notificação não pode ser futura.',
        },
        { name: 'protocolCode', label: 'Protocolo', required: true, maxLength: 50, autocomplete: 'off' },
        { name: 'demandCode', label: 'Código da demanda', required: true, maxLength: 50, autocomplete: 'off' },
        { name: 'beneficiaryName', label: 'Nome do beneficiário', required: true, maxLength: 150, autocomplete: 'off', span: 3 },
        {
            name: 'beneficiaryCpf', label: 'CPF do beneficiário', required: true, maxLength: 14, placeholder: '000.000.000-00',
            mask: { format: formatCpf, parse: onlyDigits },
            validate: (value) => {
                if (value.length !== 11) return 'Informe os 11 dígitos do CPF.';
                return isValidCpf(value) ? null : 'CPF inválido. Confira os dígitos.';
            },
        },
        {
            name: 'natureId', label: 'Natureza', type: 'select', required: true, valueType: 'number',
            options: options(state.natures.rows),
        },
        {
            name: 'statusId', label: 'Status', type: 'select', required: true, valueType: 'number', span: 3,
            options: statusGroups().map((group) => ({ group: group.label, options: options(group.rows) })),
        },
        {
            name: 'description', label: 'Descrição da demanda', type: 'textarea', span: 2, rows: 5,
            maxLength: 5000, counter: true, placeholder: 'Resumo do que o beneficiário relatou',
        },
        {
            name: 'responseDescription', label: 'Resposta enviada', type: 'textarea', span: 2, rows: 5,
            maxLength: 5000, counter: true, placeholder: 'Providências tomadas e posicionamento enviado à ANS',
        },
    ];
}

// Número e protocolo são únicos: avisa no próprio campo antes de enviar (o backend confirma com 409)
function assertNotDuplicate(data, ignoreId) {
    const others = state.nips.rows.filter((row) => row.id !== ignoreId);
    const fields = {};
    if (others.some((row) => row.nipNumber === data.nipNumber)) {
        fields.nipNumber = 'Já existe outra NIP cadastrada com este número.';
    }
    if (others.some((row) => row.protocolCode === data.protocolCode)) {
        fields.protocolCode = 'Já existe outra NIP cadastrada com este protocolo.';
    }
    if (Object.keys(fields).length) throw new ApiError(409, Object.values(fields).join(' '), fields);
}

async function openEdit(row) {
    if (!lookupsReady()) return;
    let saved = null;
    const ok = await openFormModal({
        title: `Editar NIP ${formatNipNumber(row.nipNumber)}`,
        description: row.createdAt ? `Registrada em ${auditText(row.createdAt, row.insertedBy)}.` : 'Atualize os dados da NIP.',
        iconName: 'edit',
        size: 'xl',
        columns: 4,
        fields: formFields(),
        values: {
            nipNumber: row.nipNumber,
            notificationDate: row.notificationDate,
            protocolCode: row.protocolCode,
            demandCode: row.demandCode,
            beneficiaryName: row.beneficiaryName,
            beneficiaryCpf: row.beneficiaryCpf,
            natureId: row.natureId,
            statusId: row.statusId,
            description: row.description,
            responseDescription: row.responseDescription,
        },
        submitLabel: 'Salvar alterações',
        onSubmit: async (data) => {
            assertNotDuplicate(data, row.id);
            saved = await api.put(`${ENDPOINT}/${row.id}`, data);
        },
    });
    if (!ok) return;

    toast(`NIP ${formatNipNumber(saved?.nipNumber ?? row.nipNumber)} atualizada com sucesso.`);
    state.highlightId = saved?.id ?? row.id;
    await loadNips();
    // Destaque só por alguns segundos
    setTimeout(() => {
        state.highlightId = null;
        tableEl.querySelectorAll('tr.is-highlight').forEach((tr) => tr.classList.remove('is-highlight'));
    }, 2600);
}
