/* ==========================================================================
   lawsuits.js — controlador da tela Processos Jurídicos › Controlar Processos.

   Carrega processos, recursos e os cadastros do módulo em paralelo. Filtros,
   busca, ordenação, paginação e indicadores são calculados no cliente sobre a
   lista completa. Cada linha abre o detalhe, a edição (PUT /api/lawsuits/{id})
   ou o modal de recursos: a trilha recursal do processo e o registro de um novo
   recurso (POST /api/lawsuits/{id}/appeals).
   ========================================================================== */

import '../shell.js';
import { api, ApiError } from '../api.js';
import { ICONS } from '../icons.js';
import { openFormModal, detailModal, openCustomModal, mountFormFields } from '../modal.js';
import { renderTable } from '../data-table.js';
import { toast, normalize } from '../ui.js';
import {
    intFormat, percentFormat, dateTimeFormat, currencyFormat, compactCurrencyFormat, todayIso, formatDay, weekday,
} from '../format.js';
import {
    onlyDigits, formatCaseNumber, caseNumberKey, CASE_NUMBER_DIGITS, MONEY_MASK,
    toAmount, riskTone, isProbable, ordinal,
} from './lawsuit-format.js';

const ENDPOINT = 'api/lawsuits';
const PAGE_SIZE = 20;
const MAX_CLAIM_VALUE = 1e13; // NUMERIC(15, 2)

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
    subject: filtersForm.elements.subject,
    stage: filtersForm.elements.stage,
    status: filtersForm.elements.status,
    appeals: filtersForm.elements.appeals,
    from: filtersForm.elements.from,
    to: filtersForm.elements.to,
    min: filtersForm.elements.min,
    max: filtersForm.elements.max,
};

// Cadastros usados nos filtros e nos formulários
const LOOKUPS = {
    subjects: { endpoint: 'api/subject-matters', label: 'objetos' },
    stages: { endpoint: 'api/proceeding-stages', label: 'trâmites' },
    statuses: { endpoint: 'api/lawsuit-status', label: 'status' },
    risks: { endpoint: 'api/loss-probabilities', label: 'probabilidades de perda' },
    bodies: { endpoint: 'api/judging-bodies', label: 'órgãos julgadores' },
};

const state = {
    lawsuits: { status: 'loading', rows: [] },
    appeals: { status: 'loading', rows: [] },
    lookups: Object.fromEntries(Object.keys(LOOKUPS).map((key) => [key, { status: 'loading', rows: [] }])),
    filters: { search: '', subject: '', stage: '', status: '', appeals: '', from: '', to: '', min: '', max: '', scope: '' },
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
loadLawsuits();
loadAppeals();

/* Dados -------------------------------------------------------------------- */

async function loadLawsuits() {
    const previous = state.lawsuits;
    try {
        const rows = await api.get(ENDPOINT);
        state.lawsuits = { status: 'ready', rows: Array.isArray(rows) ? rows : [] };
    } catch (error) {
        // Num recarregamento após salvar, mantém o que já estava na tela
        state.lawsuits = previous.status === 'ready' ? previous : { status: 'error', rows: [], error: error.message };
        if (previous.status === 'ready') toast(error.message, { type: 'danger' });
    }
    renderList();
}

async function loadAppeals() {
    try {
        const rows = await api.get('api/lawsuit-appeals');
        state.appeals = { status: 'ready', rows: Array.isArray(rows) ? rows : [] };
    } catch (error) {
        state.appeals = { status: 'error', rows: [], error: error.message };
        toast(`Não foi possível carregar os recursos. ${error.message}`, { type: 'danger' });
    }
    renderList();
}

async function loadLookups() {
    await Promise.all(Object.entries(LOOKUPS).map(async ([key, { endpoint }]) => {
        try {
            const rows = await api.get(endpoint);
            state.lookups[key] = { status: 'ready', rows: (Array.isArray(rows) ? rows : []).sort(byName) };
        } catch (error) {
            state.lookups[key] = { status: 'error', rows: [], error: error.message };
        }
    }));

    const failed = Object.entries(state.lookups).filter(([, entry]) => entry.status === 'error');
    if (failed.length) {
        const names = failed.map(([key]) => LOOKUPS[key].label).join(', ');
        toast(`Não foi possível carregar ${names}. ${failed[0][1].error}`, { type: 'danger' });
    }

    fillFilterSelect(inputs.subject, lookup('subjects'));
    fillFilterSelect(inputs.stage, lookup('stages'));
    fillFilterSelect(inputs.status, lookup('statuses'));
    renderScope();
    renderList();
}

// Helpers como funções declaradas (içadas): renderList() já roda na carga, antes desta linha
function byName(a, b) { return String(a.name).localeCompare(String(b.name), 'pt-BR'); }
function lookup(key) { return state.lookups[key].rows; }
function findById(rows, id) { return rows.find((row) => row.id === id); }
function lookupsReady() { return Object.values(state.lookups).every((entry) => entry.status === 'ready'); }
function isActiveRow(row) { return row.isActive !== false; }
function inactiveLabel(row) { return isActiveRow(row) ? row.name : `${row.name} (inativo)`; }

function fillFilterSelect(select, rows) {
    rows.forEach((row) => {
        const option = new Option(inactiveLabel(row), String(row.id));
        option.title = row.name;
        select.append(option);
    });
}

// Recursos ativos agrupados por processo, na ordem da sequência
function appealsOf(lawsuitId) {
    return state.appeals.rows
        .filter((appeal) => appeal.lawsuitId === lawsuitId && isActiveRow(appeal))
        .sort((a, b) => a.appealSequence - b.appealSequence);
}

function appealCounts() {
    const counts = new Map();
    state.appeals.rows.forEach((appeal) => {
        if (isActiveRow(appeal)) counts.set(appeal.lawsuitId, (counts.get(appeal.lawsuitId) ?? 0) + 1);
    });
    return counts;
}

/* Filtros ------------------------------------------------------------------ */

function bindFilters() {
    filtersForm.addEventListener('submit', (event) => event.preventDefault());

    filtersForm.addEventListener('input', (event) => {
        const name = event.target.name;
        if (!(name in state.filters)) return;
        state.filters[name] = event.target.value;
        // Mantém os intervalos coerentes: "até" nunca antes de "de", máximo nunca abaixo do mínimo
        inputs.to.min = state.filters.from;
        inputs.from.max = state.filters.to || todayIso();
        inputs.max.min = state.filters.min || '0';
        state.page = 1;
        renderList();
    });

    filtersForm.addEventListener('reset', () => {
        Object.keys(state.filters).forEach((key) => { state.filters[key] = ''; });
        inputs.to.min = '';
        inputs.from.max = todayIso();
        inputs.max.min = '0';
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

// Filtro rápido de risco: uma opção por probabilidade de perda cadastrada
function renderScope() {
    scopeEl.querySelectorAll('[data-scope-value]:not([data-scope-value=""])').forEach((button) => button.remove());
    lookup('risks').filter(isActiveRow).forEach((risk) => {
        const button = el('button', `segmented__option segmented__option--${riskTone(risk.name)}`, risk.name);
        button.type = 'button';
        button.dataset.scopeValue = String(risk.id);
        button.setAttribute('aria-pressed', 'false');
        scopeEl.append(button);
    });
}

function activeFilterCount() {
    return Object.values(state.filters).filter((value) => value.trim() !== '').length;
}

function filteredRows() {
    const { search, subject, stage, status, appeals, from, to, min, max, scope } = state.filters;
    const term = normalize(search.trim());
    const digits = onlyDigits(search);
    const id = (value) => (value ? Number(value) : null);
    const [subjectId, stageId, statusId, riskId] = [id(subject), id(stage), id(status), id(scope)];
    const minValue = min === '' ? null : Number(min);
    const maxValue = max === '' ? null : Number(max);
    const counts = appealCounts();

    return state.lawsuits.rows.filter((row) => {
        const value = toAmount(row.claimValue);
        const appealCount = counts.get(row.id) ?? 0;
        return (!subjectId || row.subjectMatterId === subjectId)
            && (!stageId || row.proceedingStageId === stageId)
            && (!statusId || row.statusId === statusId)
            && (!riskId || row.lossProbabilityId === riskId)
            && (!appeals || state.appeals.status !== 'ready' || (appeals === 'with') === (appealCount > 0))
            && (!from || row.lawsuitDate >= from)
            && (!to || row.lawsuitDate <= to)
            && (minValue === null || Number.isNaN(minValue) || value >= minValue)
            && (maxValue === null || Number.isNaN(maxValue) || value <= maxValue)
            && (!term || matchesSearch(row, term, digits));
    });
}

// Busca por texto (sem acento) ou só pelos dígitos, para achar o número CNJ com ou sem máscara.
// Inclui o número dos recursos do processo
function matchesSearch(row, term, digits) {
    const appealNumbers = appealsOf(row.id).map((appeal) => appeal.appealNumber);
    const text = normalize([
        row.caseNumber, row.plaintiff, row.defendant, row.subjectMatterName,
        row.proceedingStageName, row.statusName, ...appealNumbers,
    ].join(' '));
    if (text.includes(term)) return true;
    return digits.length >= 3 && [row.caseNumber, ...appealNumbers].some((value) => onlyDigits(value).includes(digits));
}

function sortRows(rows) {
    const { key, dir } = state.sort;
    const factor = dir === 'asc' ? 1 : -1;
    const compare = {
        date: (a, b) => String(a.lawsuitDate).localeCompare(String(b.lawsuitDate)),
        number: (a, b) => caseNumberKey(a.caseNumber).localeCompare(caseNumberKey(b.caseNumber)),
        value: (a, b) => toAmount(a.claimValue) - toAmount(b.claimValue),
    }[key];
    // Desempate estável: cadastrado por último primeiro
    return [...rows].sort((a, b) => (compare(a, b) * factor) || (b.id - a.id));
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
    const entry = state.lawsuits;
    const filtered = entry.status === 'ready' ? filteredRows() : [];
    const sorted = sortRows(filtered);
    const counts = appealCounts();

    const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
    state.page = Math.min(Math.max(1, state.page), totalPages);
    const start = (state.page - 1) * PAGE_SIZE;
    const pageRows = sorted.slice(start, start + PAGE_SIZE);

    renderFilterState();
    renderKpis(entry.status, filtered, counts);
    renderResults(entry, sorted.length, start, pageRows.length);

    renderTable(tableEl, {
        state: entry.status,
        columns: columns(counts),
        rows: pageRows,
        stack: true,
        sort: state.sort,
        onSort,
        rowClass: (row) => [row.id === state.highlightId ? 'is-highlight' : '', isActiveRow(row) ? '' : 'is-inactive'].join(' ').trim(),
        actions: (row) => [
            { icon: 'eye', label: 'Ver detalhes', onClick: () => openDetails(row) },
            { icon: 'edit', label: 'Editar processo', onClick: () => openEdit(row), disabledReason: blockedReason(row) },
            { icon: 'gavel', label: 'Recursos do processo', onClick: () => openAppeals(row), disabledReason: lookupsBlockedReason() },
        ],
        errorText: entry.error,
        onRetry: () => {
            state.lawsuits = { status: 'loading', rows: [] };
            renderList();
            loadLawsuits();
        },
        empty: entry.rows.length === 0
            ? { title: 'Nenhum processo cadastrado', text: 'Use "Registrar Processo Jurídico" para lançar o primeiro processo.' }
            : { title: 'Nenhum processo encontrado', text: 'Revise a busca ou ajuste os filtros de objeto, trâmite, status, período e valor.' },
    });

    pager.hidden = entry.status !== 'ready' || totalPages <= 1;
    pager.querySelector('[data-page="prev"]').disabled = state.page <= 1;
    pager.querySelector('[data-page="next"]').disabled = state.page >= totalPages;
    pageStatus.textContent = `Página ${state.page} de ${totalPages}`;
}

function lookupsBlockedReason() {
    if (lookupsReady()) return null;
    return Object.values(state.lookups).some((entry) => entry.status === 'error')
        ? 'Não foi possível carregar os cadastros do módulo. Recarregue a página.'
        : 'Aguarde o carregamento dos cadastros.';
}

function blockedReason(row) {
    if (!isActiveRow(row)) return 'Processo inativo não pode ser editado.';
    return lookupsBlockedReason();
}

function renderFilterState() {
    // O risco (segmented) fica à vista; o contador do botão conta só o formulário
    const count = activeFilterCount() - (state.filters.scope ? 1 : 0);
    clearButton.disabled = activeFilterCount() === 0;
    filtersToggleLabel.textContent = count ? `Filtros (${count})` : 'Filtros';
    [inputs.subject, inputs.stage, inputs.status, inputs.appeals, inputs.from, inputs.to, inputs.min, inputs.max].forEach((input) => {
        input.classList.toggle('is-set', input.value !== '');
    });
    inputs.appeals.disabled = state.appeals.status === 'error';
    scopeEl.querySelectorAll('[data-scope-value]').forEach((button) => {
        button.setAttribute('aria-pressed', String(button.dataset.scopeValue === state.filters.scope));
    });
}

function renderResults(entry, total, start, shown) {
    resultsEl.replaceChildren();
    if (entry.status !== 'ready') return;
    const all = entry.rows.length;
    const strong = (text) => el('strong', null, text);
    if (total === 0) {
        resultsEl.append(`0 de ${intFormat.format(all)} processos`);
        return;
    }
    resultsEl.append(
        'Exibindo ', strong(`${intFormat.format(start + 1)}–${intFormat.format(start + shown)}`),
        ' de ', strong(intFormat.format(total)), total === 1 ? ' processo' : ' processos',
        total !== all ? ` (filtrados de ${intFormat.format(all)})` : '',
    );
}

function setKpi(name, valueText, hint) {
    const value = kpisEl.querySelector(`[data-kpi="${name}"]`);
    value.replaceChildren(valueText);
    kpisEl.querySelector(`[data-kpi-hint="${name}"]`).textContent = hint ?? '';
}

function renderKpis(status, rows, counts) {
    if (status === 'loading') return; // mantém os skeletons do HTML
    const fill = kpisEl.querySelector('[data-kpi-meter-fill]');
    const meter = kpisEl.querySelector('[data-kpi-meter]');

    if (status === 'error') {
        ['total', 'value', 'risk', 'appeals'].forEach((name) => setKpi(name, '–', 'Dados indisponíveis'));
        fill.style.width = '0';
        return;
    }

    const total = rows.length;
    const all = state.lawsuits.rows.length;
    setKpi('total', intFormat.format(total),
        total === all ? 'Cadastrados no sistema' : `De ${intFormat.format(all)} cadastrados`);

    const sum = rows.reduce((acc, row) => acc + toAmount(row.claimValue), 0);
    setKpi('value', compactCurrencyFormat.format(sum),
        total > 0 ? `Média de ${currencyFormat.format(sum / total)} por processo` : 'Nenhum processo no filtro');
    kpisEl.querySelector('[data-kpi="value"]').title = currencyFormat.format(sum);

    const probable = rows.filter(isProbable);
    const share = total > 0 ? probable.length / total : 0;
    const exposed = probable.reduce((acc, row) => acc + toAmount(row.claimValue), 0);
    setKpi('risk', intFormat.format(probable.length),
        total > 0 ? `${percentFormat.format(share)} dos processos, ${compactCurrencyFormat.format(exposed)} em causa` : 'Nenhum processo no filtro');
    fill.style.width = `${(share * 100).toFixed(1)}%`;
    meter.setAttribute('aria-label', `Proporção com risco provável: ${percentFormat.format(share)}`);

    if (state.appeals.status === 'loading') return;
    if (state.appeals.status === 'error') {
        setKpi('appeals', '–', 'Recursos indisponíveis');
        return;
    }
    const withAppeal = rows.filter((row) => counts.has(row.id));
    const appealTotal = rows.reduce((acc, row) => acc + (counts.get(row.id) ?? 0), 0);
    setKpi('appeals', intFormat.format(withAppeal.length),
        appealTotal ? `${intFormat.format(appealTotal)} ${appealTotal === 1 ? 'recurso registrado' : 'recursos registrados'}` : 'Nenhum recurso registrado');
}

/* Colunas ------------------------------------------------------------------ */

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
}

function iconNode(name) {
    const wrap = document.createElement('span');
    wrap.innerHTML = ICONS[name] ?? '';
    return wrap.firstElementChild;
}

function riskBadge(name) {
    return el('span', `badge risk-badge risk-badge--${riskTone(name)}`, name ?? '-');
}

function caseCell(row) {
    const cell = el('div', 'cell-case');
    cell.append(
        el('span', 'cell-case__number', formatCaseNumber(row.caseNumber)),
        el('span', 'cell-case__meta', `${formatDay(row.lawsuitDate)}, ${weekday(row.lawsuitDate)}`),
    );
    if (!isActiveRow(row)) cell.append(el('span', 'badge badge--muted badge--plain cell-case__flag', 'Inativo'));
    return cell;
}

function partiesCell(plaintiff, defendant, labels = ['Autor', 'Réu']) {
    const cell = el('div', 'cell-parties');
    [[labels[0], plaintiff], [labels[1], defendant]].forEach(([label, name]) => {
        const line = el('span', 'cell-parties__line');
        line.title = `${label}: ${name}`;
        line.append(el('span', 'cell-parties__role', label), el('span', 'cell-parties__name', name));
        cell.append(line);
    });
    return cell;
}

function appealChip(row, counts) {
    if (state.appeals.status !== 'ready') return el('span', 'appeal-chip appeal-chip--idle', '–');
    const count = counts.get(row.id) ?? 0;
    const button = el('button', `appeal-chip${count ? '' : ' appeal-chip--empty'}`);
    button.type = 'button';
    button.append(iconNode('gavel'), el('span', null, count ? intFormat.format(count) : 'Nenhum'));
    const reason = lookupsBlockedReason();
    button.setAttribute('aria-label', `Recursos do processo ${formatCaseNumber(row.caseNumber)}: ${count ? intFormat.format(count) : 'nenhum'}`);
    if (reason) {
        button.setAttribute('aria-disabled', 'true');
        button.title = reason;
    } else {
        button.addEventListener('click', () => openAppeals(row));
    }
    return button;
}

function columns(counts) {
    return [
        { label: 'Processo', sortKey: 'date', render: caseCell },
        {
            label: 'Partes',
            className: 'col-stack-full',
            render: (row) => partiesCell(row.plaintiff, row.defendant),
        },
        {
            label: 'Objeto',
            className: 'col-stack-full lawsuits-col-subject',
            render: (row) => {
                const text = el('span', 'cell-clamp', row.subjectMatterName);
                text.title = row.subjectMatterName;
                return text;
            },
        },
        {
            label: 'Andamento',
            className: 'col-stack-full',
            render: (row) => {
                const cell = el('div', 'cell-progress');
                const status = el('span', 'cell-progress__status cell-clamp', row.statusName);
                status.title = row.statusName;
                const stage = el('span', 'cell-progress__stage', row.proceedingStageName);
                stage.title = row.proceedingStageName;
                cell.append(status, stage);
                return cell;
            },
        },
        {
            label: 'Valor da causa',
            sortKey: 'value',
            className: 'col-num col-nowrap',
            render: (row) => el('span', 'cell-money', currencyFormat.format(toAmount(row.claimValue))),
        },
        { label: 'Risco', render: (row) => riskBadge(row.lossProbabilityName) },
        { label: 'Recursos', render: (row) => appealChip(row, counts) },
    ];
}

/* Detalhes ----------------------------------------------------------------- */

function auditText(when, who) {
    return [when && dateTimeFormat.format(new Date(when)), who && `por ${who}`].filter(Boolean).join(' ') || null;
}

async function openDetails(row) {
    const appeals = appealsOf(row.id);
    const last = appeals.at(-1);
    const appealsText = state.appeals.status !== 'ready'
        ? null
        : appeals.length
            ? `${intFormat.format(appeals.length)} ${appeals.length === 1 ? 'recurso' : 'recursos'}`
            : 'Nenhum recurso registrado';

    const actions = [];
    if (lookupsReady()) {
        actions.push({ id: 'appeals', label: 'Recursos', icon: 'gavel', variant: 'secondary' });
        if (isActiveRow(row)) actions.push({ id: 'edit', label: 'Editar processo', icon: 'edit' });
    }

    const choice = await detailModal({
        title: `Processo ${formatCaseNumber(row.caseNumber)}`,
        description: `${row.plaintiff} × ${row.defendant}`,
        iconName: 'scale',
        size: 'xl',
        sections: [
            {
                title: 'Situação',
                items: [
                    { label: 'Status', value: row.statusName },
                    { label: 'Trâmite', value: row.proceedingStageName },
                    { label: 'Probabilidade de perda', value: riskBadge(row.lossProbabilityName) },
                ],
            },
            {
                title: 'Identificação',
                items: [
                    { label: 'Número do processo', value: formatCaseNumber(row.caseNumber), mono: true },
                    { label: 'Data do processo', value: `${formatDay(row.lawsuitDate)} (${weekday(row.lawsuitDate)})` },
                    { label: 'Valor da causa', value: currencyFormat.format(toAmount(row.claimValue)), mono: true },
                    { label: 'Objeto', value: row.subjectMatterName },
                ],
            },
            {
                title: 'Partes',
                items: [
                    { label: 'Autor', value: row.plaintiff },
                    { label: 'Réu', value: row.defendant },
                ],
            },
            {
                title: 'Recursos',
                items: [
                    { label: 'Registrados', value: appealsText },
                    { label: 'Último recurso', value: last ? `${ordinal(last.appealSequence)} · ${last.judgingBodyName}` : null, note: last ? `Interposto em ${formatDay(last.appealDate)}` : null },
                ],
            },
            {
                title: 'Histórico',
                full: true,
                columns: 2,
                items: [
                    { label: 'Cadastrado', value: auditText(row.createdAt, row.insertedByName) },
                    { label: 'Última edição', value: row.updatedAt ? auditText(row.updatedAt, row.updatedByName) : 'Nunca editado' },
                ],
            },
        ],
        actions,
    });

    if (choice === 'edit') openEdit(row);
    if (choice === 'appeals') openAppeals(row);
}

/* Campos compartilhados ---------------------------------------------------- */

// Opções ativas; a que já está vinculada continua disponível mesmo se tiver sido inativada (o backend permite manter)
function lookupOptions(key, currentId = null) {
    return lookup(key)
        .filter((row) => isActiveRow(row) || row.id === currentId)
        .map((row) => ({ value: row.id, label: inactiveLabel(row) }));
}

function moneyField(name, label, extra = {}) {
    return {
        name, label, required: true, prefix: 'R$', maxLength: 21, placeholder: '0,00',
        mask: MONEY_MASK,
        validate: (value) => (value >= MAX_CLAIM_VALUE ? 'O valor deve ter no máximo 13 dígitos inteiros.' : null),
        ...extra,
    };
}

/* Edição ------------------------------------------------------------------- */

function lawsuitFields(row) {
    return [
        {
            name: 'caseNumber', label: 'Número do processo', required: true, span: 2, maxLength: 25,
            placeholder: '0000000-00.0000.0.00.0000', help: 'Padrão CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO',
            // Na tela fica com a máscara; para o backend vão só os 20 dígitos
            mask: { format: formatCaseNumber, parse: onlyDigits },
            validate: (value) => (onlyDigits(value).length === CASE_NUMBER_DIGITS ? null : 'Informe os 20 dígitos do número do processo.'),
        },
        {
            name: 'lawsuitDate', label: 'Data do processo', type: 'date', required: true,
            max: todayIso(), maxMessage: 'A data do processo não pode ser futura.',
        },
        moneyField('claimValue', 'Valor da causa'),
        { name: 'plaintiff', label: 'Autor', required: true, maxLength: 255, autocomplete: 'off', span: 2 },
        { name: 'defendant', label: 'Réu', required: true, maxLength: 255, autocomplete: 'off', span: 2 },
        {
            name: 'subjectMatterId', label: 'Objeto', type: 'select', required: true, valueType: 'number', span: 2,
            options: lookupOptions('subjects', row.subjectMatterId),
        },
        {
            name: 'proceedingStageId', label: 'Trâmite', type: 'select', required: true, valueType: 'number', span: 2,
            options: lookupOptions('stages', row.proceedingStageId),
        },
        {
            name: 'statusId', label: 'Status', type: 'select', required: true, valueType: 'number', span: 2,
            options: lookupOptions('statuses', row.statusId),
        },
        {
            name: 'lossProbabilityId', label: 'Probabilidade de perda', type: 'select', required: true, valueType: 'number', span: 2,
            options: lookupOptions('risks', row.lossProbabilityId),
        },
    ];
}

// O número do processo é único: avisa no próprio campo antes de enviar (o backend confirma com 409)
function assertNotDuplicate(data, ignoreId) {
    const duplicated = state.lawsuits.rows.some((row) => row.id !== ignoreId && onlyDigits(row.caseNumber) === onlyDigits(data.caseNumber));
    if (duplicated) {
        const message = 'Já existe outro processo cadastrado com este número.';
        throw new ApiError(409, message, { caseNumber: message });
    }
}

function flashRow(id) {
    state.highlightId = id;
    // Destaque só por alguns segundos
    setTimeout(() => {
        state.highlightId = null;
        tableEl.querySelectorAll('tr.is-highlight').forEach((tr) => tr.classList.remove('is-highlight'));
    }, 2600);
}

async function openEdit(row) {
    if (blockedReason(row)) return;
    let saved = null;
    const ok = await openFormModal({
        title: `Editar processo ${formatCaseNumber(row.caseNumber)}`,
        description: row.createdAt ? `Cadastrado em ${auditText(row.createdAt, row.insertedByName)}.` : 'Atualize os dados do processo.',
        iconName: 'edit',
        size: 'xl',
        columns: 4,
        fields: lawsuitFields(row),
        values: {
            caseNumber: row.caseNumber,
            lawsuitDate: row.lawsuitDate,
            claimValue: toAmount(row.claimValue),
            plaintiff: row.plaintiff,
            defendant: row.defendant,
            subjectMatterId: row.subjectMatterId,
            proceedingStageId: row.proceedingStageId,
            statusId: row.statusId,
            lossProbabilityId: row.lossProbabilityId,
        },
        submitLabel: 'Salvar alterações',
        onSubmit: async (data) => {
            assertNotDuplicate(data, row.id);
            saved = await api.put(`${ENDPOINT}/${row.id}`, data);
        },
    });
    if (!ok) return;

    toast(`Processo ${formatCaseNumber(saved?.caseNumber ?? row.caseNumber)} atualizado com sucesso.`);
    flashRow(saved?.id ?? row.id);
    await loadLawsuits();
}

/* Recursos ----------------------------------------------------------------- */

function appealFields(lawsuit) {
    const active = (key, id) => {
        const row = findById(lookup(key), id);
        return row && isActiveRow(row) ? id : null;
    };
    return {
        fields: [
            {
                name: 'appealNumber', label: 'Número do recurso', required: true, maxLength: 35, autocomplete: 'off',
                placeholder: 'Ex.: 1.0000.24.123456-7/001',
            },
            {
                name: 'appealDate', label: 'Data do recurso', type: 'date', required: true,
                max: todayIso(), maxMessage: 'A data do recurso não pode ser futura.',
                validate: (value) => (lawsuit.lawsuitDate && value < lawsuit.lawsuitDate
                    ? `A data do recurso não pode ser anterior à do processo (${formatDay(lawsuit.lawsuitDate)}).`
                    : null),
            },
            { name: 'appellant', label: 'Recorrente', required: true, maxLength: 255, autocomplete: 'off' },
            { name: 'appellee', label: 'Recorrido', required: true, maxLength: 255, autocomplete: 'off' },
            {
                name: 'judgingBodyId', label: 'Órgão julgador', type: 'select', required: true, valueType: 'number', full: true,
                options: lookupOptions('bodies'),
            },
            moneyField('claimValue', 'Valor da causa', { help: 'Preenchido com o valor do processo; ajuste se o recurso discutir outro valor.' }),
            {
                name: 'lossProbabilityId', label: 'Probabilidade de perda', type: 'select', required: true, valueType: 'number',
                options: lookupOptions('risks'),
            },
            {
                name: 'statusId', label: 'Status', type: 'select', required: true, valueType: 'number', full: true,
                options: lookupOptions('statuses'),
            },
        ],
        values: {
            claimValue: toAmount(lawsuit.claimValue),
            statusId: active('statuses', lawsuit.statusId),
            lossProbabilityId: active('risks', lawsuit.lossProbabilityId),
        },
    };
}

// Nó do processo de origem, no topo da trilha
function originNode(lawsuit) {
    const item = el('li', 'trail__item trail__item--origin');
    const marker = el('span', 'trail__marker');
    marker.append(iconNode('scale'));
    const content = el('div', 'trail__content');
    const head = el('div', 'trail__head');
    head.append(el('p', 'trail__kicker', 'Processo de origem'), el('span', 'trail__date', formatDay(lawsuit.lawsuitDate)));
    content.append(
        head,
        el('p', 'trail__title', lawsuit.proceedingStageName),
        el('p', 'trail__meta', lawsuit.statusName),
    );
    item.append(marker, content);
    return item;
}

function appealNode(appeal, { latest, highlight }) {
    const item = el('li', `trail__item${latest ? ' is-latest' : ''}${highlight ? ' is-new' : ''}`);
    const marker = el('span', 'trail__marker', ordinal(appeal.appealSequence));
    marker.setAttribute('aria-hidden', 'true');

    const content = el('article', 'trail__content trail__card');
    content.setAttribute('aria-label', `${ordinal(appeal.appealSequence)} recurso, ${appeal.judgingBodyName}`);

    const head = el('div', 'trail__head');
    const kicker = el('p', 'trail__kicker', `${ordinal(appeal.appealSequence)} recurso`);
    if (latest) kicker.append(el('span', 'trail__latest', 'Mais recente'));
    head.append(kicker, el('span', 'trail__date', formatDay(appeal.appealDate)));

    const number = el('p', 'trail__number', appeal.appealNumber);

    const facts = el('dl', 'trail__facts');
    [
        ['Recorrente', appeal.appellant],
        ['Recorrido', appeal.appellee],
        ['Valor da causa', currencyFormat.format(toAmount(appeal.claimValue))],
        ['Status', appeal.statusName],
    ].forEach(([label, value]) => {
        const row = el('div', label === 'Status' ? 'is-full' : '');
        row.append(el('dt', null, label), el('dd', null, value));
        facts.append(row);
    });

    const foot = el('div', 'trail__foot');
    foot.append(riskBadge(appeal.lossProbabilityName));
    const audit = auditText(appeal.createdAt, appeal.insertedByName);
    if (audit) foot.append(el('span', 'trail__audit', `Registrado em ${audit}`));

    content.append(head, el('p', 'trail__title', appeal.judgingBodyName), number, facts, foot);
    item.append(marker, content);
    return item;
}

function openAppeals(lawsuit) {
    if (lookupsBlockedReason()) return;
    const caseNumber = formatCaseNumber(lawsuit.caseNumber);

    return openCustomModal({
        title: 'Recursos do processo',
        description: caseNumber,
        iconName: 'gavel',
        size: 'lg',
        render: ({ form, body, footer, alert, finish, setBusy, showAlert, makeButton, setButtonBusy }) => {
            body.classList.add('appeals-modal');
            const view = { tab: 'trail', status: state.appeals.status === 'ready' ? 'ready' : 'loading', highlightId: null };
            const tabIds = { trail: `appeals-trail-${lawsuit.id}`, form: `appeals-form-${lawsuit.id}` };

            /* Resumo do processo */
            const strip = el('dl', 'case-strip');
            [
                ['Autor', lawsuit.plaintiff],
                ['Réu', lawsuit.defendant],
                ['Valor da causa', currencyFormat.format(toAmount(lawsuit.claimValue))],
                ['Risco', riskBadge(lawsuit.lossProbabilityName)],
            ].forEach(([label, value]) => {
                const row = el('div');
                const dd = el('dd');
                if (value instanceof Node) dd.append(value);
                else {
                    dd.textContent = value;
                    dd.title = value;
                }
                row.append(el('dt', null, label), dd);
                strip.append(row);
            });

            /* Abas */
            const tablist = el('div', 'segmented appeals-tabs');
            tablist.setAttribute('role', 'tablist');
            tablist.setAttribute('aria-label', 'Recursos do processo');
            const makeTab = (key, label) => {
                const tab = el('button', 'segmented__option', label);
                tab.type = 'button';
                tab.id = `${tabIds[key]}-tab`;
                tab.setAttribute('role', 'tab');
                tab.setAttribute('aria-controls', tabIds[key]);
                tab.addEventListener('click', () => switchTab(key));
                tablist.append(tab);
                return tab;
            };
            const tabs = { trail: makeTab('trail', 'Trilha recursal'), form: makeTab('form', 'Novo recurso') };
            tablist.addEventListener('keydown', (event) => {
                if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
                event.preventDefault();
                switchTab(view.tab === 'trail' ? 'form' : 'trail', { focusTab: true });
            });

            /* Painel da trilha */
            const trailPanel = el('section', 'appeals-panel');
            trailPanel.id = tabIds.trail;
            trailPanel.setAttribute('role', 'tabpanel');
            trailPanel.setAttribute('aria-labelledby', tabs.trail.id);

            /* Painel do formulário */
            const formPanel = el('section', 'appeals-panel');
            formPanel.id = tabIds.form;
            formPanel.setAttribute('role', 'tabpanel');
            formPanel.setAttribute('aria-labelledby', tabs.form.id);

            const assist = el('div', 'appeal-assist');
            assist.append(el('p', 'appeal-assist__text', 'O recurso entra na trilha como o próximo da sequência.'));
            const partiesButton = el('button', 'btn btn--secondary btn--sm appeal-assist__action');
            partiesButton.type = 'button';
            partiesButton.append(iconNode('refresh'), el('span', null, 'Usar as partes do processo'));
            assist.append(partiesButton);

            let controller = null;
            const mountForm = () => {
                const { fields, values } = appealFields(lawsuit);
                controller = mountFormFields(form, { fields, values, columns: 2, alert });
                formPanel.replaceChildren(assist, controller.grid);
                partiesButton.lastElementChild.textContent = 'Usar as partes do processo';
            };
            mountForm();

            // 1º clique: o réu recorre (cenário mais comum para a cooperativa); os seguintes invertem recorrente e recorrido
            partiesButton.addEventListener('click', () => {
                const { appellant, appellee } = form.elements;
                const filled = appellant.value.trim() || appellee.value.trim();
                if (!filled) {
                    appellant.value = lawsuit.defendant;
                    appellee.value = lawsuit.plaintiff;
                } else {
                    [appellant.value, appellee.value] = [appellee.value, appellant.value];
                }
                partiesButton.lastElementChild.textContent = 'Inverter recorrente e recorrido';
                [appellant, appellee].forEach((input) => input.dispatchEvent(new Event('input', { bubbles: true })));
            });

            body.append(strip, tablist, trailPanel, formPanel);

            /* Rodapé: muda conforme a aba */
            const close = makeButton('Fechar', 'secondary');
            const toForm = makeButton('Novo recurso', 'primary');
            toForm.querySelector('.btn__spinner').after(iconNode('plus'));
            const back = makeButton('Voltar à trilha', 'secondary');
            const submit = makeButton('Registrar recurso', 'primary', 'submit');
            footer.append(close, back, toForm, submit);
            close.addEventListener('click', () => finish(false));
            back.addEventListener('click', () => switchTab('trail'));
            toForm.addEventListener('click', () => switchTab('form'));

            function switchTab(key, { focusTab = false } = {}) {
                view.tab = key;
                Object.entries(tabs).forEach(([name, tab]) => {
                    const selected = name === key;
                    tab.setAttribute('aria-selected', String(selected));
                    tab.setAttribute('aria-pressed', String(selected));
                    tab.tabIndex = selected ? 0 : -1;
                });
                trailPanel.hidden = key !== 'trail';
                formPanel.hidden = key !== 'form';
                close.hidden = key !== 'trail';
                toForm.hidden = key !== 'trail';
                back.hidden = key !== 'form';
                submit.hidden = key !== 'form';
                showAlert(null);
                if (focusTab) tabs[key].focus();
                else if (key === 'form') form.elements.appealNumber?.focus();
            }

            function renderTrail() {
                const appeals = appealsOf(lawsuit.id);
                tabs.trail.textContent = view.status === 'ready' ? `Trilha recursal (${appeals.length})` : 'Trilha recursal';
                trailPanel.replaceChildren();

                if (view.status === 'error') {
                    const box = el('div', 'appeals-error');
                    const retry = el('button', 'btn btn--secondary btn--sm');
                    retry.type = 'button';
                    retry.append(iconNode('refresh'), el('span', null, 'Tentar novamente'));
                    retry.addEventListener('click', () => {
                        view.status = 'loading';
                        renderTrail();
                        refresh();
                    });
                    box.append(el('p', null, view.error ?? 'Não foi possível carregar os recursos.'), retry);
                    trailPanel.append(box);
                    return;
                }

                const list = el('ol', 'trail');
                list.setAttribute('aria-label', 'Trilha recursal, do processo de origem ao recurso mais recente');
                list.append(originNode(lawsuit));

                if (view.status === 'loading' && !appeals.length) {
                    const item = el('li', 'trail__item trail__item--skeleton');
                    item.append(el('span', 'trail__marker'), el('span', 'skeleton trail__skeleton'));
                    list.append(item);
                } else if (!appeals.length) {
                    const item = el('li', 'trail__item trail__item--empty');
                    const content = el('div', 'trail__content trail__empty');
                    const start = el('button', 'btn btn--secondary btn--sm');
                    start.type = 'button';
                    start.append(iconNode('plus'), el('span', null, 'Registrar o primeiro recurso'));
                    start.addEventListener('click', () => switchTab('form'));
                    content.append(
                        el('p', 'trail__title', 'Nenhum recurso registrado'),
                        el('p', 'trail__meta', 'Quando houver recurso contra a decisão, registre-o aqui para acompanhar cada instância.'),
                        start,
                    );
                    item.append(el('span', 'trail__marker'), content);
                    list.append(item);
                } else {
                    appeals.forEach((appeal, index) => list.append(appealNode(appeal, {
                        latest: index === appeals.length - 1,
                        highlight: appeal.id === view.highlightId,
                    })));
                }
                trailPanel.append(list);

                if (view.highlightId) {
                    trailPanel.querySelector('.is-new')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                    view.highlightId = null;
                }
            }

            // Troca os recursos deste processo pelos que vieram do backend
            function mergeAppeals(rows) {
                const others = state.appeals.rows.filter((appeal) => appeal.lawsuitId !== lawsuit.id);
                state.appeals = { status: 'ready', rows: [...others, ...rows] };
            }

            async function refresh() {
                try {
                    const rows = await api.get(`${ENDPOINT}/${lawsuit.id}/appeals`);
                    mergeAppeals(Array.isArray(rows) ? rows : []);
                    view.status = 'ready';
                } catch (error) {
                    // Com o cache da lista geral ainda dá para mostrar a trilha
                    if (state.appeals.status !== 'ready') {
                        view.status = 'error';
                        view.error = error.message;
                    }
                }
                if (form.isConnected) renderTrail();
                renderList();
            }

            form.addEventListener('submit', async () => {
                if (view.tab !== 'form') return;
                const data = controller.collect();
                if (!data) return;

                setBusy(true);
                setButtonBusy(submit, true, 'Registrando...', 'Registrar recurso');
                back.disabled = true;
                try {
                    const created = await api.post(`${ENDPOINT}/${lawsuit.id}/appeals`, data);
                    if (created) mergeAppeals([...appealsOf(lawsuit.id), created]);
                    view.status = 'ready';
                    view.highlightId = created?.id ?? null;
                    toast(`${ordinal(created?.appealSequence ?? appealsOf(lawsuit.id).length)} recurso registrado no processo ${caseNumber}.`);
                    mountForm();
                    switchTab('trail');
                    renderTrail();
                    flashRow(lawsuit.id);
                    renderList();
                } catch (error) {
                    controller.showError(error);
                } finally {
                    setBusy(false);
                    setButtonBusy(submit, false, 'Registrando...', 'Registrar recurso');
                    back.disabled = false;
                }
            });

            const hasAppeals = appealsOf(lawsuit.id).length > 0;
            switchTab(view.status === 'ready' && !hasAppeals ? 'form' : 'trail');
            renderTrail();
            refresh();
        },
    });
}
