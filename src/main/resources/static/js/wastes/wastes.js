/* ==========================================================================
   wastes.js — controlador da tela Resíduos › Controlar Resíduos.

   Carrega registros, unidades e tipos de resíduo em paralelo. Filtros,
   busca, ordenação, paginação e indicadores são calculados no cliente sobre
   a lista completa; cadastro (POST) e edição (PUT) abrem o modal de formulário.
   ========================================================================== */

import '../shell.js';
import { api, ApiError } from '../api.js';
import { ICONS } from '../icons.js';
import { openFormModal } from '../modal.js';
import { renderTable } from '../data-table.js';
import { toast, normalize } from '../ui.js';
import {
    kgFormat, percentFormat, intFormat, dateTimeFormat,
    todayIso, formatDay, weekday, weightParts,
} from '../format.js';

const ENDPOINT = 'api/waste-records';
const PAGE_SIZE = 20;
const DUPLICATE_MESSAGE = 'Já existe um registro para esta unidade, tipo de resíduo e data. Edite o registro existente em vez de lançar outro.';

const newButton = document.querySelector('[data-new]');
const filtersForm = document.querySelector('[data-filters]');
const filtersToggle = document.querySelector('[data-filters-toggle]');
const filtersToggleLabel = document.querySelector('[data-filters-toggle-label]');
const clearButton = document.querySelector('[data-filters-clear]');
const resultsEl = document.querySelector('[data-results]');
const tableEl = document.querySelector('[data-table]');
const pager = document.querySelector('[data-pager]');
const pageStatus = document.querySelector('[data-page-status]');
const kpisEl = document.querySelector('[data-kpis]');

const inputs = {
    search: filtersForm.elements.search,
    unit: filtersForm.elements.unit,
    type: filtersForm.elements.type,
    from: filtersForm.elements.from,
    to: filtersForm.elements.to,
};

const state = {
    records: { status: 'loading', rows: [] },
    units: { status: 'loading', rows: [] },
    types: { status: 'loading', rows: [] },
    filters: { search: '', unit: '', type: '', from: '', to: '' },
    sort: { key: 'date', dir: 'desc' },
    page: 1,
    highlightId: null,
};

kpisEl.querySelectorAll('[data-kpi-icon]').forEach((box) => { box.innerHTML = ICONS[box.dataset.kpiIcon] ?? ''; });
inputs.from.max = todayIso();
inputs.to.max = todayIso();

bindFilters();
newButton.addEventListener('click', openCreate);
pager.addEventListener('click', (event) => {
    const button = event.target.closest('[data-page]');
    if (!button || button.disabled) return;
    state.page += button.dataset.page === 'next' ? 1 : -1;
    renderList();
    tableEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
});

render();
loadLookups();
loadRecords();

/* Dados -------------------------------------------------------------------- */

async function loadRecords() {
    const previous = state.records;
    try {
        const rows = await api.get(ENDPOINT);
        state.records = { status: 'ready', rows: Array.isArray(rows) ? rows : [] };
    } catch (error) {
        // Num recarregamento após salvar, mantém o que já estava na tela
        state.records = previous.status === 'ready' ? previous : { status: 'error', rows: [], error: error.message };
        if (previous.status === 'ready') toast(error.message, { type: 'danger' });
    }
    render();
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
    await Promise.all([load('units', 'api/units'), load('types', 'api/waste-types')]);

    const failed = [state.units, state.types].find((entry) => entry.status === 'error');
    if (failed) toast(`Não foi possível carregar unidades e tipos de resíduo. ${failed.error}`, { type: 'danger' });

    fillSelect(inputs.unit, state.units.rows);
    fillSelect(inputs.type, state.types.rows);
    render();
}

const byName = (a, b) => String(a.name).localeCompare(String(b.name), 'pt-BR');

function fillSelect(select, rows) {
    rows.forEach((row) => {
        const option = document.createElement('option');
        option.value = String(row.id);
        option.textContent = row.name;
        select.append(option);
    });
}

// O record Java expõe "isRecyclable"; aceita também "recyclable" caso a serialização mude
function isRecyclableType(typeId) {
    const type = state.types.rows.find((row) => row.id === typeId);
    return Boolean(type?.isRecyclable ?? type?.recyclable);
}

const weightOf = (row) => Number(row.weightKg) || 0;

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
    const { search, unit, type, from, to } = state.filters;
    const term = normalize(search.trim());
    const unitId = unit ? Number(unit) : null;
    const typeId = type ? Number(type) : null;

    return state.records.rows.filter((row) => (
        (!unitId || row.unitId === unitId)
        && (!typeId || row.wasteTypeId === typeId)
        && (!from || row.recordDate >= from)
        && (!to || row.recordDate <= to)
        && (!term || normalize([row.unitName, row.wasteTypeName, row.observations, row.insertedBy, row.updatedBy].join(' ')).includes(term))
    ));
}

function sortRows(rows) {
    const { key, dir } = state.sort;
    const factor = dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
        const primary = key === 'weight'
            ? weightOf(a) - weightOf(b)
            : String(a.recordDate).localeCompare(String(b.recordDate));
        // Desempate estável: mais recente lançado primeiro
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

function render() {
    newButton.disabled = state.units.status !== 'ready' || state.types.status !== 'ready';
    newButton.title = newButton.disabled && (state.units.status === 'error' || state.types.status === 'error')
        ? 'Não foi possível carregar unidades e tipos de resíduo.'
        : '';
    renderList();
}

function renderList() {
    const entry = state.records;
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
        actions: (row) => [{ icon: 'edit', label: 'Editar registro', onClick: () => openEdit(row), disabledReason: editBlockedReason() }],
        errorText: entry.error,
        onRetry: () => {
            state.records = { status: 'loading', rows: [] };
            render();
            loadRecords();
        },
        empty: entry.rows.length === 0
            ? { title: 'Nenhum resíduo registrado', text: 'Clique em "Novo registro" para lançar a primeira pesagem.' }
            : { title: 'Nenhum registro encontrado', text: 'Revise a busca ou ajuste os filtros de unidade, tipo e período.' },
    });

    pager.hidden = entry.status !== 'ready' || totalPages <= 1;
    pager.querySelector('[data-page="prev"]').disabled = state.page <= 1;
    pager.querySelector('[data-page="next"]').disabled = state.page >= totalPages;
    pageStatus.textContent = `Página ${state.page} de ${totalPages}`;
}

function editBlockedReason() {
    return state.units.status === 'ready' && state.types.status === 'ready'
        ? null
        : 'Aguarde o carregamento de unidades e tipos de resíduo.';
}

function renderFilterState() {
    const count = activeFilterCount();
    clearButton.disabled = count === 0;
    filtersToggleLabel.textContent = count ? `Filtros (${count})` : 'Filtros';
    [inputs.unit, inputs.type, inputs.from, inputs.to].forEach((input) => {
        input.classList.toggle('is-set', input.value !== '');
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
        resultsEl.append(`0 de ${intFormat.format(all)} registros`);
        return;
    }
    resultsEl.append(
        'Exibindo ', strong(`${intFormat.format(start + 1)}–${intFormat.format(start + shown)}`),
        ' de ', strong(intFormat.format(total)), total === 1 ? ' registro' : ' registros',
        total !== all ? ` (filtrados de ${intFormat.format(all)})` : '',
    );
}

function setKpi(name, valueText, unit, hint) {
    const value = kpisEl.querySelector(`[data-kpi="${name}"]`);
    value.replaceChildren(valueText);
    if (unit) {
        const unitEl = document.createElement('span');
        unitEl.className = 'kpi__unit';
        unitEl.textContent = unit;
        value.append(unitEl);
    }
    value.title = typeof valueText === 'string' ? valueText : '';
    kpisEl.querySelector(`[data-kpi-hint="${name}"]`).textContent = hint ?? '';
}

function renderKpis(status, rows) {
    if (status === 'loading') return; // mantém os skeletons do HTML
    const fill = kpisEl.querySelector('[data-kpi-meter-fill]');
    const meter = kpisEl.querySelector('[data-kpi-meter]');

    if (status === 'error') {
        ['total', 'count', 'recyclable', 'topUnit'].forEach((name) => setKpi(name, '–', null, 'Dados indisponíveis'));
        fill.style.width = '0';
        return;
    }

    const total = rows.reduce((sum, row) => sum + weightOf(row), 0);
    const totalParts = weightParts(total);
    setKpi('total', totalParts.value, totalParts.unit,
        rows.length ? `Média de ${kgFormat.format(total / rows.length)} kg por registro` : 'Nenhum registro no filtro');

    const days = new Set(rows.map((row) => row.recordDate)).size;
    setKpi('count', intFormat.format(rows.length), null,
        rows.length ? `Em ${intFormat.format(days)} ${days === 1 ? 'dia' : 'dias'} com pesagem` : '');

    const recyclable = rows.filter((row) => isRecyclableType(row.wasteTypeId)).reduce((sum, row) => sum + weightOf(row), 0);
    const share = total > 0 ? recyclable / total : 0;
    setKpi('recyclable', total > 0 ? percentFormat.format(share) : '–', null,
        total > 0 ? `${kgFormat.format(recyclable)} kg de ${kgFormat.format(total)} kg` : 'Sem peso registrado');
    fill.style.width = `${(share * 100).toFixed(1)}%`;
    meter.setAttribute('aria-label', `Proporção reciclável: ${percentFormat.format(share)}`);

    const byUnit = new Map();
    rows.forEach((row) => byUnit.set(row.unitName, (byUnit.get(row.unitName) ?? 0) + weightOf(row)));
    const [topName, topKg] = [...byUnit.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
    if (topName && topKg > 0) {
        const parts = weightParts(topKg);
        setKpi('topUnit', topName, null, `${parts.value} ${parts.unit} · ${percentFormat.format(topKg / total)} do total`);
    } else {
        setKpi('topUnit', '–', null, '');
    }
}

/* Colunas ------------------------------------------------------------------ */

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
}

function columns() {
    return [
        {
            label: 'Data',
            sortKey: 'date',
            className: 'col-nowrap',
            render: (row) => {
                const cell = el('div', 'cell-date');
                cell.append(el('span', 'cell-date__day', formatDay(row.recordDate)), el('span', 'cell-date__weekday', weekday(row.recordDate)));
                return cell;
            },
        },
        { label: 'Unidade', render: (row) => row.unitName },
        {
            label: 'Tipo',
            render: (row) => {
                const recyclable = isRecyclableType(row.wasteTypeId);
                const badge = el('span', `badge badge--plain ${recyclable ? 'badge--recyclable' : 'badge--waste'}`);
                badge.innerHTML = ICONS[recyclable ? 'recycle' : 'trash'];
                badge.append(row.wasteTypeName);
                return badge;
            },
        },
        {
            label: 'Peso',
            sortKey: 'weight',
            className: 'col-num',
            render: (row) => {
                const cell = el('span', 'cell-weight', kgFormat.format(weightOf(row)));
                cell.append(el('small', null, 'kg'));
                return cell;
            },
        },
        {
            label: 'Observações',
            className: 'col-stack-full',
            render: (row) => {
                const notes = row.observations?.trim();
                const cell = el('span', `cell-notes${notes ? '' : ' cell-notes--empty'}`, notes || 'Sem observações');
                if (notes) cell.title = notes;
                return cell;
            },
        },
        {
            label: 'Lançado por',
            className: 'col-stack-full',
            render: (row) => {
                const cell = el('div', 'cell-user');
                cell.append(el('span', 'cell-user__name', row.insertedBy ?? '-'));
                const meta = row.updatedBy && row.updatedAt
                    ? `Editado por ${row.updatedBy} em ${dateTimeFormat.format(new Date(row.updatedAt))}`
                    : (row.createdAt ? `em ${dateTimeFormat.format(new Date(row.createdAt))}` : '');
                if (meta) cell.append(el('span', 'cell-user__meta', meta));
                return cell;
            },
        },
    ];
}

/* Cadastro e edição -------------------------------------------------------- */

function formFields() {
    const options = (rows) => rows.map((row) => ({ value: row.id, label: row.name }));
    return [
        { name: 'recordDate', label: 'Data da pesagem', type: 'date', required: true, max: todayIso(), maxMessage: 'A data não pode estar no futuro.' },
        { name: 'unitId', label: 'Unidade', type: 'select', required: true, valueType: 'number', options: options(state.units.rows) },
        { name: 'wasteTypeId', label: 'Tipo de resíduo', type: 'select', required: true, valueType: 'number', options: options(state.types.rows) },
        { name: 'weightKg', label: 'Peso', type: 'number', required: true, min: 0, step: 0.001, suffix: 'kg', placeholder: '0,000', help: 'Em quilogramas, até 3 casas decimais.' },
        { name: 'observations', label: 'Observações', type: 'textarea', maxLength: 500, rows: 3, full: true, placeholder: 'Ex.: coleta extra após evento, material úmido...', help: 'Até 500 caracteres.' },
    ];
}

// A combinação data + unidade + tipo é única no banco: avisa antes de enviar e traduz o 409 genérico
function assertNotDuplicate(data, ignoreId) {
    const exists = state.records.rows.some((row) => row.id !== ignoreId
        && row.recordDate === data.recordDate && row.unitId === data.unitId && row.wasteTypeId === data.wasteTypeId);
    if (exists) throw new ApiError(409, DUPLICATE_MESSAGE);
}

function translateConflict(error) {
    if (error instanceof ApiError && error.status === 409) throw new ApiError(409, DUPLICATE_MESSAGE);
    throw error;
}

async function afterSave(saved, message) {
    toast(message);
    state.highlightId = saved?.id ?? null;
    await loadRecords();
    // Destaque só por alguns segundos
    setTimeout(() => {
        state.highlightId = null;
        tableEl.querySelectorAll('tr.is-highlight').forEach((tr) => tr.classList.remove('is-highlight'));
    }, 2600);
}

async function openCreate() {
    let saved = null;
    const ok = await openFormModal({
        title: 'Novo registro de resíduo',
        description: 'Informe a pesagem do dia para uma unidade e um tipo de resíduo.',
        iconName: 'scale',
        size: 'lg',
        fields: formFields(),
        values: {
            recordDate: todayIso(),
            // Facilita lançamentos em sequência a partir de um filtro já aplicado
            unitId: state.filters.unit ? Number(state.filters.unit) : null,
            wasteTypeId: state.filters.type ? Number(state.filters.type) : null,
        },
        submitLabel: 'Registrar',
        busyLabel: 'Registrando...',
        onSubmit: async (data) => {
            assertNotDuplicate(data, null);
            saved = await api.post(ENDPOINT, data).catch(translateConflict);
        },
    });
    if (ok) {
        // Garante que o novo registro apareça: volta para a primeira página da ordenação padrão
        state.sort = { key: 'date', dir: 'desc' };
        state.page = 1;
        await afterSave(saved, 'Registro de resíduo cadastrado com sucesso.');
    }
}

async function openEdit(row) {
    let saved = null;
    const created = row.createdAt ? ` em ${dateTimeFormat.format(new Date(row.createdAt))}` : '';
    const ok = await openFormModal({
        title: 'Editar registro de resíduo',
        description: `${row.unitName} · ${formatDay(row.recordDate)} — lançado por ${row.insertedBy ?? '-'}${created}.`,
        iconName: 'edit',
        size: 'lg',
        fields: formFields(),
        values: {
            recordDate: row.recordDate,
            unitId: row.unitId,
            wasteTypeId: row.wasteTypeId,
            weightKg: row.weightKg !== null && row.weightKg !== undefined ? Number(row.weightKg) : null,
            observations: row.observations,
        },
        submitLabel: 'Salvar alterações',
        onSubmit: async (data) => {
            assertNotDuplicate(data, row.id);
            saved = await api.put(`${ENDPOINT}/${row.id}`, data).catch(translateConflict);
        },
    });
    if (ok) await afterSave(saved, 'Registro de resíduo atualizado com sucesso.');
}
