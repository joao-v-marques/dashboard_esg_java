/* ==========================================================================
   dashboard.js — controlador do Dashboard.

   Abas de tema no topo (o tema ativo fica no hash da URL). O tema Resíduos
   agrega no cliente GET /api/waste-records com /api/waste-types e /api/units:
   KPIs com variação vs. o período anterior, evolução mensal por tipo,
   composição por tipo (rosca + tabela) e detalhamento por unidade.
   "Reciclado" segue waste_types.is_recyclable.
   ========================================================================== */

import { currentUser, hasRole } from '../shell.js';
import { api, url } from '../api.js';
import { ICONS } from '../icons.js';
import {
    kgFormat, percentFormat, intFormat,
    toIso, todayIso, fromIso, formatDay, formatDayShort, monthLabel, weightParts, formatWeight,
} from '../format.js';
import { stackedColumns, donut, hbars, tipContent } from './charts.js';

// Cor de cada tipo pela ordem de id (Reciclável → água, Não Reciclável → laranja, Orgânico → azul).
// A cor acompanha o tipo, nunca a posição no gráfico; validadas para daltonismo em claro e escuro.
const TYPE_SLOTS = [3, 2, 1, 4];
const COLOR_RECYCLED = 'var(--color-chart-3)';
const COLOR_NOT_RECYCLED = 'var(--color-chart-2)';
const COLOR_OTHER = 'var(--color-text-faint)';

// Role mínima para ver cada tema (a aba fica oculta via data-requires-role no HTML)
const THEME_ROLES = { residuos: 'EMPLOYEE_WASTES', cooperados: 'MANAGER' };
const THEMES = Object.keys(THEME_ROLES);

// Até o usuário carregar, só Resíduos (todo usuário que chega no /dashboard pode vê-lo)
let allowedThemes = ['residuos'];

const tabsEl = document.querySelector('[data-theme-tabs]');
const filtersEl = document.querySelector('[data-filters]');
const presetsEl = document.querySelector('[data-presets]');
const fromInput = document.querySelector('[data-from]');
const toInput = document.querySelector('[data-to]');
const unitSelect = document.querySelector('[data-unit]');
const kpisEl = document.querySelector('[data-kpis]');
const gridEl = document.querySelector('[data-grid]');
const legendEl = document.querySelector('[data-legend]');
const trendSubtitle = document.querySelector('[data-trend-subtitle]');
const trendChart = document.querySelector('[data-chart="trend"]');
const donutChart = document.querySelector('[data-chart="donut"]');
const donutLegend = document.querySelector('[data-donut-legend]');
const detailTabs = document.querySelector('[data-detail-tabs]');
const detailBody = document.querySelector('[data-detail-body]');

const state = {
    theme: themeFromHash() ?? 'residuos',
    status: 'loading',
    error: null,
    records: [],
    types: [],
    units: [],
    preset: '12m',
    from: '',
    to: '',
    unit: '',
    detail: 'type',
};

bindTabs();
bindFilters();
applyPreset(state.preset);
renderTheme();
render();
load();

/* Dados -------------------------------------------------------------------- */

async function load() {
    state.status = 'loading';
    render();
    try {
        const [records, types, units] = await Promise.all([
            api.get('api/waste-records'),
            api.get('api/waste-types'),
            api.get('api/units'),
        ]);
        state.records = (records ?? []).map((row) => ({ ...row, weight: Number(row.weightKg) || 0 }));
        state.types = [...(types ?? [])].sort((a, b) => a.id - b.id)
            .map((type, index) => ({
                ...type,
                recyclable: Boolean(type.isRecyclable ?? type.recyclable),
                color: TYPE_SLOTS[index] ? `var(--color-chart-${TYPE_SLOTS[index]})` : COLOR_OTHER,
            }));
        state.units = [...(units ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
        fillUnits();
        state.status = 'ready';
        // "Tudo" depende da data do primeiro registro
        if (state.preset === 'all') applyPreset('all');
    } catch (error) {
        state.status = 'error';
        state.error = error.message;
    }
    render();
}

function fillUnits() {
    unitSelect.querySelectorAll('option:not([value=""])').forEach((option) => option.remove());
    state.units.forEach((unit) => {
        const option = document.createElement('option');
        option.value = String(unit.id);
        option.textContent = unit.name;
        unitSelect.append(option);
    });
    unitSelect.value = state.unit;
}

const typeById = (id) => state.types.find((type) => type.id === id);

/* Período ------------------------------------------------------------------ */

// Soma meses mantendo o dia válido (31/03 - 1 mês = 28/02)
function shiftMonths(iso, months) {
    const date = fromIso(iso);
    const day = date.getDate();
    const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
    const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
    target.setDate(Math.min(day, lastDay));
    return toIso(target);
}

function shiftDays(iso, days) {
    const date = fromIso(iso);
    date.setDate(date.getDate() + days);
    return toIso(date);
}

const daysBetween = (from, to) => Math.round((fromIso(to) - fromIso(from)) / 86400000) + 1;

function presetRange(preset) {
    const today = new Date();
    const to = toIso(today);
    const monthStart = (back) => toIso(new Date(today.getFullYear(), today.getMonth() - back, 1));
    switch (preset) {
    case 'month': return { from: monthStart(0), to };
    case '3m': return { from: monthStart(2), to };
    case 'year': return { from: `${today.getFullYear()}-01-01`, to };
    case 'all': {
        const first = state.records.reduce((min, row) => (row.recordDate < min ? row.recordDate : min), to);
        return { from: `${first.slice(0, 7)}-01`, to };
    }
    default: return { from: monthStart(11), to };
    }
}

// Período de comparação: o mesmo intervalo recuado (meses inteiros nos atalhos, dias no personalizado)
function previousRange() {
    const shift = { month: 1, '3m': 3, '12m': 12, year: 12 }[state.preset];
    if (state.preset === 'all') return null;
    if (shift) return { from: shiftMonths(state.from, -shift), to: shiftMonths(state.to, -shift) };
    const length = daysBetween(state.from, state.to);
    const to = shiftDays(state.from, -1);
    return { from: shiftDays(to, -(length - 1)), to };
}

function applyPreset(preset) {
    state.preset = preset;
    const range = presetRange(preset);
    state.from = range.from;
    state.to = range.to;
    fromInput.value = state.from;
    toInput.value = state.to;
    syncPresetButtons();
}

function syncPresetButtons() {
    presetsEl.querySelectorAll('[data-preset]').forEach((button) => {
        button.setAttribute('aria-pressed', String(button.dataset.preset === state.preset));
    });
    presetsEl.classList.toggle('is-custom', state.preset === 'custom');
    fromInput.max = state.to || todayIso();
    toInput.min = state.from;
    toInput.max = todayIso();
}

function bindFilters() {
    filtersEl.addEventListener('submit', (event) => event.preventDefault());

    presetsEl.addEventListener('click', (event) => {
        const button = event.target.closest('[data-preset]');
        if (!button) return;
        applyPreset(button.dataset.preset);
        render();
    });

    const onDate = () => {
        if (!fromInput.value || !toInput.value) return;
        let from = fromInput.value;
        let to = toInput.value;
        if (from > to) [from, to] = [to, from];
        state.from = from;
        state.to = to;
        fromInput.value = from;
        toInput.value = to;
        state.preset = 'custom';
        syncPresetButtons();
        render();
    };
    fromInput.addEventListener('change', onDate);
    toInput.addEventListener('change', onDate);

    unitSelect.addEventListener('change', () => {
        state.unit = unitSelect.value;
        unitSelect.classList.toggle('is-set', state.unit !== '');
        render();
    });

    detailTabs.addEventListener('click', (event) => {
        const button = event.target.closest('[data-detail]');
        if (!button) return;
        state.detail = button.dataset.detail;
        detailTabs.querySelectorAll('[data-detail]').forEach((tab) => {
            const active = tab === button;
            tab.setAttribute('aria-selected', String(active));
            tab.setAttribute('aria-pressed', String(active));
        });
        render();
    });
}

/* Abas de tema ------------------------------------------------------------- */

function themeFromHash() {
    const id = decodeURIComponent(location.hash.replace(/^#/, ''));
    return allowedThemes.includes(id) ? id : null;
}

// Libera os temas do perfil; um #tema não permitido na URL cai em Resíduos
function applyThemeAccess(user) {
    allowedThemes = THEMES.filter((theme) => hasRole(user, THEME_ROLES[theme]));
    const theme = themeFromHash() ?? 'residuos';
    if (theme !== state.theme || (location.hash && location.hash !== `#${theme}`)) selectTheme(theme);
}

function bindTabs() {
    currentUser.then(applyThemeAccess);
    tabsEl.addEventListener('click', (event) => {
        const tab = event.target.closest('[data-tab]');
        if (tab) selectTheme(tab.dataset.tab);
    });
    // Setas trocam de aba (padrão WAI-ARIA de tabs)
    tabsEl.addEventListener('keydown', (event) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const tabs = [...tabsEl.querySelectorAll('[data-tab]:not([hidden])')];
        const current = tabs.findIndex((tab) => tab.dataset.tab === state.theme);
        const next = event.key === 'Home' ? 0
            : event.key === 'End' ? tabs.length - 1
                : (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
        selectTheme(tabs[next].dataset.tab);
        tabs[next].focus();
    });
    window.addEventListener('hashchange', () => {
        const theme = themeFromHash();
        if (theme && theme !== state.theme) selectTheme(theme);
    });
}

function selectTheme(theme) {
    if (!allowedThemes.includes(theme)) return;
    state.theme = theme;
    history.replaceState(null, '', `#${theme}`);
    renderTheme();
    if (theme === 'residuos') render(); // os gráficos precisam medir o container visível
}

function renderTheme() {
    tabsEl.querySelectorAll('[data-tab]').forEach((tab) => {
        const active = tab.dataset.tab === state.theme;
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
    });
    document.querySelectorAll('[data-panel]').forEach((panel) => { panel.hidden = panel.dataset.panel !== state.theme; });
    // Os filtros só se aplicam a temas com dados
    filtersEl.hidden = state.theme !== 'residuos';
    document.title = `Dashboard · ${state.theme === 'residuos' ? 'Resíduos' : 'Cooperados'} · Acompanhamento ESG`;
}

/* Agregação ---------------------------------------------------------------- */

function rowsIn(range) {
    const unitId = state.unit ? Number(state.unit) : null;
    return state.records.filter((row) => row.recordDate >= range.from && row.recordDate <= range.to
        && (!unitId || row.unitId === unitId));
}

function summarize(rows) {
    const byType = new Map();
    const byUnit = new Map();
    const byMonth = new Map();
    const byDay = new Map();
    let total = 0;
    let recycled = 0;

    rows.forEach((row) => {
        const type = typeById(row.wasteTypeId);
        const isRecycled = Boolean(type?.recyclable);
        total += row.weight;
        if (isRecycled) recycled += row.weight;

        byType.set(row.wasteTypeId, (byType.get(row.wasteTypeId) ?? 0) + row.weight);

        const unit = byUnit.get(row.unitId) ?? { name: row.unitName, total: 0, recycled: 0 };
        unit.total += row.weight;
        if (isRecycled) unit.recycled += row.weight;
        byUnit.set(row.unitId, unit);

        const monthKey = row.recordDate.slice(0, 7);
        const month = byMonth.get(monthKey) ?? new Map();
        month.set(row.wasteTypeId, (month.get(row.wasteTypeId) ?? 0) + row.weight);
        byMonth.set(monthKey, month);

        byDay.set(row.recordDate, (byDay.get(row.recordDate) ?? 0) + row.weight);
    });

    const days = byDay.size;
    const [peakDay, peakKg] = [...byDay.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
    return {
        count: rows.length,
        total,
        recycled,
        notRecycled: total - recycled,
        rate: total > 0 ? recycled / total : null,
        days,
        avgPerDay: days > 0 ? total / days : null,
        peakDay,
        peakKg,
        byType,
        byUnit,
        byMonth,
    };
}

function monthKeys(from, to) {
    const keys = [];
    let [y, m] = from.split('-').map(Number);
    const [ty, tm] = to.split('-').map(Number);
    while (y < ty || (y === ty && m <= tm)) {
        keys.push(`${y}-${String(m).padStart(2, '0')}`);
        m += 1;
        if (m > 12) { m = 1; y += 1; }
    }
    return keys;
}

/* Renderização ------------------------------------------------------------- */

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
}

function icon(name) {
    const wrap = document.createElement('span');
    wrap.innerHTML = ICONS[name] ?? '';
    return wrap.firstElementChild;
}

function render() {
    if (state.theme !== 'residuos') return;
    filtersEl.querySelectorAll('input, select, button').forEach((control) => { control.disabled = state.status !== 'ready'; });

    if (state.status === 'loading') return renderLoading();
    if (state.status === 'error') return renderError();

    gridEl.hidden = false;
    gridEl.parentElement.querySelector('[data-dash-error]')?.remove();

    const range = { from: state.from, to: state.to };
    const current = summarize(rowsIn(range));
    const prevRange = previousRange();
    const previous = prevRange ? summarize(rowsIn(prevRange)) : null;

    renderKpis(current, previous, prevRange);
    renderLegend();

    if (current.count === 0) {
        [trendChart, donutChart, detailBody].forEach((node) => { node.chartDraw = null; });
        trendChart.replaceChildren(emptyState());
        donutChart.replaceChildren();
        donutLegend.replaceChildren();
        donutChart.append(el('p', 'dash-card__subtitle', 'Sem dados no período.'));
        detailBody.replaceChildren(el('p', 'dash-card__subtitle', 'Sem dados no período.'));
    } else {
        renderTrend(current, range);
        renderDonut(current);
        if (state.detail === 'unit') renderUnits(current);
        else renderTypeTable(current);
    }
}

function renderLoading() {
    kpisEl.replaceChildren(...Array.from({ length: 6 }, () => {
        const card = el('article', 'card stat');
        const label = el('span', 'skeleton skeleton--line skeleton--sm');
        label.style.width = '60%';
        const value = el('span', 'skeleton skeleton--line');
        value.style.cssText = 'width: 70%; height: 22px; margin: 8px 0 6px;';
        const foot = el('span', 'skeleton skeleton--line skeleton--sm');
        foot.style.width = '50%';
        card.append(label, value, foot);
        return card;
    }));
    [trendChart, donutChart].forEach((chart) => {
        chart.chartDraw = null;
        chart.replaceChildren(el('div', 'skeleton chart-skeleton'));
    });
    donutLegend.replaceChildren();
    detailBody.replaceChildren(el('div', 'skeleton chart-skeleton'));
}

function renderError() {
    kpisEl.replaceChildren();
    gridEl.hidden = true;
    const panel = gridEl.parentElement;
    panel.querySelector('[data-dash-error]')?.remove();

    const box = el('div', 'card empty empty--error');
    box.dataset.dashError = '';
    const badge = el('span', 'empty__icon');
    badge.append(icon('alert'));
    const retry = el('button', 'btn btn--secondary btn--sm');
    retry.type = 'button';
    retry.append(icon('refresh'), el('span', null, 'Tentar novamente'));
    retry.addEventListener('click', load);
    box.append(badge, el('p', 'empty__title', 'Não foi possível carregar o dashboard'), el('p', 'empty__text', state.error), retry);
    panel.append(box);
}

function emptyState() {
    const box = el('div', 'empty');
    const badge = el('span', 'empty__icon');
    badge.append(icon('inbox'));
    const link = el('a', 'btn btn--secondary btn--sm');
    link.href = url('wastes');
    link.append(icon('plus'), el('span', null, 'Lançar resíduos'));
    box.append(
        badge,
        el('p', 'empty__title', 'Nenhum resíduo registrado no período'),
        el('p', 'empty__text', 'Ajuste o período ou a unidade, ou registre novas pesagens em Controlar Resíduos.'),
        link,
    );
    return box;
}

/* KPIs */

// good: 'up' quando aumentar é bom, 'down' quando diminuir é bom
function deltaNode(current, previous, { good, points = false }) {
    if (previous === null || previous === undefined || current === null) return null;
    let text;
    let direction;
    if (points) {
        const diff = (current - previous) * 100;
        direction = Math.abs(diff) < 0.005 ? 0 : Math.sign(diff);
        text = `${Math.abs(diff).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} p.p.`;
    } else {
        if (previous === 0) return current > 0 ? el('span', 'delta delta--neutral', 'novo') : null;
        const change = (current - previous) / previous;
        direction = Math.abs(change) < 0.00005 ? 0 : Math.sign(change);
        text = percentFormat.format(Math.abs(change));
    }
    const tone = direction === 0 ? 'neutral' : ((direction > 0) === (good === 'up') ? 'good' : 'bad');
    const node = el('span', `delta delta--${tone}`);
    node.append(icon(direction > 0 ? 'arrowUp' : direction < 0 ? 'arrowDown' : 'minus'), text);
    return node;
}

function weightValue(kg) {
    const { value, unit } = weightParts(kg ?? 0);
    return [value, unit];
}

function renderKpis(cur, prev, prevRange) {
    const compareTitle = prevRange ? `Comparado a ${formatDay(prevRange.from)} – ${formatDay(prevRange.to)}` : '';
    const vs = prevRange ? 'vs. período anterior' : 'Todo o histórico';

    const cards = [
        {
            label: 'Total gerado', icon: 'scale', accent: true,
            value: weightValue(cur.total),
            delta: deltaNode(cur.total, prev?.total, { good: 'down' }), foot: vs,
        },
        {
            label: 'Enviado p/ reciclagem', icon: 'recycle',
            value: weightValue(cur.recycled),
            delta: deltaNode(cur.recycled, prev?.recycled, { good: 'up' }), foot: vs,
        },
        {
            label: 'Não reciclado', icon: 'trash',
            value: weightValue(cur.notRecycled),
            delta: deltaNode(cur.notRecycled, prev?.notRecycled, { good: 'down' }), foot: vs,
        },
        {
            label: 'Taxa de reciclagem', icon: 'percent',
            value: [cur.rate === null ? '–' : percentFormat.format(cur.rate), null],
            meter: cur.rate ?? 0,
            delta: deltaNode(cur.rate, prev?.rate ?? null, { good: 'up', points: true }), foot: vs,
        },
        {
            label: 'Média por dia de coleta', icon: 'gauge',
            value: cur.avgPerDay === null ? ['–', null] : weightValue(cur.avgPerDay),
            delta: deltaNode(cur.avgPerDay, prev?.avgPerDay ?? null, { good: 'down' }), foot: vs,
        },
        {
            label: 'Dias de coleta', icon: 'calendar',
            value: [intFormat.format(cur.days), cur.days === 1 ? 'dia' : 'dias'],
            delta: null,
            foot: cur.peakDay ? `Maior: ${formatWeight(cur.peakKg)} em ${formatDayShort(cur.peakDay)}` : 'Sem coletas no período',
        },
    ];

    kpisEl.replaceChildren(...cards.map((card) => {
        const node = el('article', `card stat${card.accent ? ' stat--accent' : ''}`);
        const head = el('div', 'stat__head');
        const badge = el('span', 'stat__icon');
        badge.append(icon(card.icon));
        head.append(el('p', 'stat__label', card.label), badge);
        node.title = compareTitle;

        const value = el('p', 'stat__value', card.value[0]);
        if (card.value[1]) value.append(el('span', 'stat__unit', card.value[1]));
        node.append(head, value);

        if (card.meter !== undefined) {
            const meter = el('div', 'stat__meter');
            meter.setAttribute('role', 'img');
            meter.setAttribute('aria-label', `Taxa de reciclagem: ${percentFormat.format(card.meter)}`);
            const fill = el('span');
            fill.style.width = `${(card.meter * 100).toFixed(1)}%`;
            meter.append(fill);
            node.append(meter);
        }

        const foot = el('p', 'stat__foot');
        if (card.delta) foot.append(card.delta);
        foot.append(card.delta ? ` ${card.foot}` : card.foot);
        node.append(foot);
        return node;
    }));
}

/* Legenda dos tipos (compartilhada pela evolução e pela rosca) */

function renderLegend() {
    legendEl.replaceChildren(...state.types.map((type) => {
        const item = el('li', 'legend__item');
        const swatch = el('span', 'swatch');
        swatch.style.background = type.color;
        item.append(swatch, type.name);
        return item;
    }));
}

/* Evolução mensal */

function renderTrend(summary, range) {
    const keys = monthKeys(range.from, range.to);
    trendSubtitle.textContent = `Peso gerado por mês e tipo · ${formatDay(range.from)} a ${formatDay(range.to)}`;
    const valueOf = (key, typeId) => summary.byMonth.get(key)?.get(Number(typeId)) ?? 0;
    const monthTotal = (key) => state.types.reduce((sum, type) => sum + valueOf(key, type.id), 0);
    const monthRecycled = (key) => state.types.filter((t) => t.recyclable).reduce((sum, type) => sum + valueOf(key, type.id), 0);

    stackedColumns(trendChart, {
        categories: keys.map((key, index) => ({
            key,
            label: monthLabel(key),
            sublabel: index === 0 || key.endsWith('-01') ? key.slice(0, 4) : '',
        })),
        series: state.types.map((type) => ({ key: String(type.id), label: type.name, color: type.color })),
        value: valueOf,
        formatValue: (kg) => formatWeight(kg),
        tooltip: (index) => {
            const key = keys[index];
            const total = monthTotal(key);
            return tipContent({
                title: monthLabel(key, { long: true }),
                rows: [
                    ...state.types.map((type) => {
                        const kg = valueOf(key, type.id);
                        return { color: type.color, label: type.name, value: total > 0 ? `${kgFormat.format(kg)} kg · ${percentFormat.format(kg / total)}` : '0 kg' };
                    }),
                    { label: 'Total', value: `${kgFormat.format(total)} kg`, strong: true },
                ],
                note: total > 0 ? `Taxa de reciclagem: ${percentFormat.format(monthRecycled(key) / total)}` : 'Sem registros no mês',
            });
        },
        describe: (index) => {
            const key = keys[index];
            const parts = state.types.map((type) => `${type.name} ${kgFormat.format(valueOf(key, type.id))} kg`);
            return `${monthLabel(key, { long: true })}: total ${kgFormat.format(monthTotal(key))} kg; ${parts.join(', ')}`;
        },
    });
}

/* Composição: rosca */

function typeSlices(summary) {
    return state.types
        .map((type) => ({ key: String(type.id), type, label: type.name, color: type.color, value: summary.byType.get(type.id) ?? 0 }));
}

function renderDonut(summary) {
    const slices = typeSlices(summary);
    const total = summary.total;
    const parts = weightParts(total);

    donut(donutChart, {
        slices,
        centerValue: `${parts.value} ${parts.unit}`,
        centerLabel: 'total gerado',
        tooltip: (slice) => tipContent({
            title: slice.label,
            rows: [
                { color: slice.color, label: 'Gerado', value: `${kgFormat.format(slice.value)} kg` },
                { label: '% do total', value: percentFormat.format(slice.value / total), strong: true },
            ],
            note: slice.type.recyclable ? 'Classificado como reciclável' : 'Classificado como não reciclável',
        }),
        describe: (slice) => `${slice.label}: ${kgFormat.format(slice.value)} kg, ${percentFormat.format(slice.value / total)} do total`,
    });

    donutLegend.replaceChildren(...slices.map((slice) => {
        const item = el('li', 'donut-legend__item');
        const swatch = el('span', 'swatch');
        swatch.style.background = slice.color;
        item.append(
            swatch,
            el('span', 'donut-legend__name', slice.label),
            el('span', 'donut-legend__pct', total > 0 ? percentFormat.format(slice.value / total) : '–'),
            el('span', 'donut-legend__kg', formatWeight(slice.value)),
        );
        return item;
    }));
}

/* Detalhamento: tabela por tipo */

function renderTypeTable(summary) {
    const total = summary.total;
    const rows = typeSlices(summary).sort((a, b) => b.value - a.value);

    const table = el('table', 'table table--compact');
    const thead = el('thead');
    const headRow = el('tr');
    [['Tipo'], ['Classificação'], ['Gerado', 'col-num'], ['% do gerado', 'col-num']].forEach(([label, className]) => {
        const th = el('th', className, label);
        th.scope = 'col';
        headRow.append(th);
    });
    thead.append(headRow);

    const tbody = el('tbody');
    rows.forEach((row) => {
        const tr = el('tr');
        const name = el('span', 'cell-type');
        const swatch = el('span', 'swatch');
        swatch.style.background = row.color;
        name.append(swatch, row.label);

        const badge = el('span', `badge badge--plain ${row.type.recyclable ? 'badge--recyclable' : 'badge--waste'}`);
        badge.append(icon(row.type.recyclable ? 'recycle' : 'trash'), row.type.recyclable ? 'Reciclável' : 'Não reciclável');

        const share = total > 0 ? row.value / total : 0;
        const shareCell = el('span', 'cell-share');
        const bar = el('span', 'cell-share__bar');
        const fill = el('span');
        fill.style.cssText = `width: ${(share * 100).toFixed(1)}%; background: ${row.color};`;
        bar.append(fill);
        shareCell.append(bar, percentFormat.format(share));

        const cells = [name, badge, `${kgFormat.format(row.value)} kg`, shareCell];
        cells.forEach((content, index) => {
            const td = el('td', index >= 2 ? 'col-num' : null);
            td.append(content);
            tr.append(td);
        });
        tbody.append(tr);
    });

    const tfoot = el('tfoot');
    const footRow = el('tr');
    const recycledShare = total > 0 ? percentFormat.format(summary.recycled / total) : '–';
    [['Total'], [`${recycledShare} reciclável`], [`${kgFormat.format(total)} kg`, 'col-num'], [total > 0 ? percentFormat.format(1) : '–', 'col-num']]
        .forEach(([text, className]) => footRow.append(el('td', className, text)));
    tfoot.append(footRow);

    table.append(thead, tbody, tfoot);
    const wrap = el('div', 'table-wrap');
    wrap.append(table);
    detailBody.replaceChildren(wrap);
}

/* Detalhamento: por unidade */

function renderUnits(summary) {
    const total = summary.total;
    const rows = [...summary.byUnit.entries()]
        .map(([id, unit]) => ({ key: String(id), ...unit, notRecycled: unit.total - unit.recycled }))
        .sort((a, b) => b.total - a.total)
        .map((unit) => ({
            key: unit.key,
            label: unit.name,
            total: unit.total,
            totalText: `${formatWeight(unit.total)} · ${percentFormat.format(unit.total / total)}`,
            segments: [
                { key: 'rec', color: COLOR_RECYCLED, value: unit.recycled },
                { key: 'nrec', color: COLOR_NOT_RECYCLED, value: unit.notRecycled },
            ],
            unit,
        }));

    detailBody.replaceChildren();
    const chart = el('div');
    hbars(chart, {
        rows,
        tooltip: (row) => tipContent({
            title: row.label,
            rows: [
                { color: COLOR_RECYCLED, label: 'Reciclado', value: `${kgFormat.format(row.unit.recycled)} kg` },
                { color: COLOR_NOT_RECYCLED, label: 'Não reciclado', value: `${kgFormat.format(row.unit.notRecycled)} kg` },
                { label: 'Total', value: `${kgFormat.format(row.unit.total)} kg`, strong: true },
            ],
            note: `Taxa de reciclagem: ${percentFormat.format(row.unit.total > 0 ? row.unit.recycled / row.unit.total : 0)} · ${percentFormat.format(row.unit.total / total)} do total gerado`,
        }),
        describe: (row) => `${row.label}: ${kgFormat.format(row.unit.total)} kg, sendo ${kgFormat.format(row.unit.recycled)} kg reciclado e ${kgFormat.format(row.unit.notRecycled)} kg não reciclado`,
    });

    const legend = el('ul', 'legend hbars__legend');
    [[COLOR_RECYCLED, 'Reciclado'], [COLOR_NOT_RECYCLED, 'Não reciclado']].forEach(([color, label]) => {
        const item = el('li', 'legend__item');
        const swatch = el('span', 'swatch');
        swatch.style.background = color;
        item.append(swatch, label);
        legend.append(item);
    });
    detailBody.append(chart, legend);
}
