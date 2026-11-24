/* ==========================================================================
   lawsuits.js — tema Processos Jurídicos do Dashboard.

   Sem endpoint agregado: busca GET /api/lawsuits e /api/loss-probabilities
   uma vez, na primeira abertura da aba, e calcula tudo no cliente. Trocar
   objeto ou justiça só recalcula.

   Regras:
   - ativo: isActive (encerrar/reabrir fica na tela de controle); closedAt
     diz quando foi encerrado;
   - trabalhista: Justiça do Trabalho no número CNJ (isLabor, J = 5);
   - chance de perda: nome cadastrado, com o tom de riskTone() (o id muda
     entre bancos). Cada tom tem uma cor fixa: provável → perigo, remota →
     marca, as demais (ex.: Possível) → amarelo, azul, laranja.
   ========================================================================== */

import { api } from '../api.js';
import { ICONS } from '../icons.js';
import { percentFormat, intFormat, currencyFormat, compactCurrencyFormat } from '../format.js';
import { caseCourt, formatCaseNumber, isLabor, riskTone, toAmount } from '../lawsuits/lawsuit-format.js';
import { stackedColumns, donut, hbars, tipContent } from './charts.js';

const FLOW_YEARS = 6;
const TOP_ROWS = 5;
const TOP_VALUES = 5;

const COLOR_OPENED = 'var(--color-chart-1)';
const COLOR_CLOSED = 'var(--color-text-faint)';
const TONE_COLORS = { probable: 'var(--color-danger)', remote: 'var(--color-brand)' };
const NEUTRAL_COLORS = ['var(--color-chart-4)', 'var(--color-chart-1)', 'var(--color-chart-2)'];
// Ordem de leitura da escala: do cenário favorável ao que pede atenção
const TONE_ORDER = { remote: 0, neutral: 1, probable: 2 };

const filtersEl = document.querySelector('[data-lawsuit-filters]');
const subjectSelect = document.querySelector('[data-lawsuit-subject]');
const segmentSelect = document.querySelector('[data-lawsuit-segment]');
const kpisEl = document.querySelector('[data-lawsuit-kpis]');
const gridEl = document.querySelector('[data-lawsuit-grid]');
const riskChart = document.querySelector('[data-lawsuit-chart="risk"]');
const riskLegend = document.querySelector('[data-lawsuit-risk-legend]');
const riskSubtitle = document.querySelector('[data-lawsuit-risk-subtitle]');
const flowChart = document.querySelector('[data-lawsuit-chart="flow"]');
const flowLegend = document.querySelector('[data-lawsuit-flow-legend]');
const flowSubtitle = document.querySelector('[data-lawsuit-flow-subtitle]');
const courtsBody = document.querySelector('[data-lawsuit-courts]');
const courtsSubtitle = document.querySelector('[data-lawsuit-courts-subtitle]');
const subjectsBody = document.querySelector('[data-lawsuit-subjects]');
const subjectsSubtitle = document.querySelector('[data-lawsuit-subjects-subtitle]');
const topBody = document.querySelector('[data-lawsuit-top]');
const topSubtitle = document.querySelector('[data-lawsuit-top-subtitle]');

const state = {
    status: 'idle',
    error: null,
    lawsuits: [],
    risks: [],
    subject: '',
    segment: '',
};

filtersEl.addEventListener('submit', (event) => event.preventDefault());
subjectSelect.addEventListener('change', () => {
    state.subject = subjectSelect.value;
    subjectSelect.classList.toggle('is-set', state.subject !== '');
    render();
});
segmentSelect.addEventListener('change', () => {
    state.segment = segmentSelect.value;
    segmentSelect.classList.toggle('is-set', state.segment !== '');
    render();
});

// Chamado pelo dashboard.js sempre que a aba Processos Jurídicos é selecionada
export function showLawsuits() {
    if (state.status === 'idle') load();
    else render(); // os gráficos precisam medir o container visível
}

/* Dados -------------------------------------------------------------------- */

async function load() {
    state.status = 'loading';
    render();
    try {
        const [lawsuits, risks] = await Promise.all([
            api.get('api/lawsuits'),
            api.get('api/loss-probabilities'),
        ]);
        state.lawsuits = (lawsuits ?? []).filter((row) => row.lawsuitDate).map((row) => {
            const court = caseCourt(row.caseNumber);
            return {
                id: row.id,
                caseNumber: row.caseNumber,
                openYear: Number(row.lawsuitDate.slice(0, 4)),
                closedYear: row.closedAt ? new Date(row.closedAt).getFullYear() : null,
                active: row.isActive !== false,
                value: toAmount(row.claimValue),
                subjectId: row.subjectMatterId,
                subjectName: row.subjectMatterName,
                riskId: row.lossProbabilityId,
                segment: court.segment,
                segmentName: court.segmentName,
                tribunal: court.tribunal,
                labor: isLabor(row),
            };
        });
        state.risks = riskCategories(risks ?? [], lawsuits ?? []);
        fillSubjects();
        fillSegments();
        state.status = 'ready';
    } catch (error) {
        state.status = 'error';
        state.error = error.message;
    }
    render();
}

// Chances cadastradas mais as que só aparecem nos processos, na ordem da escala, cada uma com a sua cor
function riskCategories(lookup, lawsuits) {
    const byId = new Map(lookup.map((risk) => [risk.id, risk.name]));
    lawsuits.forEach((row) => {
        if (!byId.has(row.lossProbabilityId)) byId.set(row.lossProbabilityId, row.lossProbabilityName);
    });
    let neutral = 0;
    return [...byId.entries()]
        .map(([id, name]) => ({ id, name, tone: riskTone(name) }))
        .sort((a, b) => TONE_ORDER[a.tone] - TONE_ORDER[b.tone] || a.id - b.id)
        .map((risk) => ({
            ...risk,
            color: TONE_COLORS[risk.tone] ?? NEUTRAL_COLORS[neutral++ % NEUTRAL_COLORS.length],
        }));
}

function fillSelect(select, options, current) {
    select.querySelectorAll('option:not([value=""])').forEach((option) => option.remove());
    options.forEach(({ value, label }) => {
        const option = el('option', null, label);
        option.value = value;
        option.title = label;
        select.append(option);
    });
    select.value = current;
}

// Só os objetos e as justiças que aparecem nos processos
function fillSubjects() {
    const names = new Map(state.lawsuits.map((row) => [row.subjectId, row.subjectName]));
    const options = [...names.entries()]
        .map(([id, name]) => ({ value: String(id), label: name }))
        .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
    fillSelect(subjectSelect, options, state.subject);
}

function fillSegments() {
    const names = new Map(state.lawsuits.filter((row) => row.segment).map((row) => [row.segment, row.segmentName]));
    const options = [...names.entries()]
        .map(([segment, name]) => ({ value: segment, label: name }))
        .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
    fillSelect(segmentSelect, options, state.segment);
}

/* Agregação ---------------------------------------------------------------- */

function filtered() {
    const subjectId = state.subject ? Number(state.subject) : null;
    return state.lawsuits.filter((row) => (!subjectId || row.subjectId === subjectId)
        && (!state.segment || row.segment === state.segment));
}

const sumValue = (rows) => rows.reduce((acc, row) => acc + row.value, 0);
const riskOf = (row) => state.risks.find((risk) => risk.id === row.riskId);

function countByRisk(rows) {
    const counts = new Map();
    rows.forEach((row) => counts.set(row.riskId, (counts.get(row.riskId) ?? 0) + 1));
    return counts;
}

// Segmentos de uma barra, um por chance de perda
function riskSegments(rows) {
    const counts = countByRisk(rows);
    return state.risks.map((risk) => ({ key: String(risk.id), color: risk.color, value: counts.get(risk.id) ?? 0 }));
}

function riskTipRows(rows) {
    const counts = countByRisk(rows);
    return state.risks
        .filter((risk) => counts.get(risk.id))
        .map((risk) => ({ color: risk.color, label: risk.name, value: intFormat.format(counts.get(risk.id)) }));
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

const lawsuitWord = (n) => (n === 1 ? 'processo' : 'processos');

function render() {
    filtersEl.querySelectorAll('select').forEach((control) => { control.disabled = state.status !== 'ready'; });

    if (state.status === 'loading') return renderLoading();
    if (state.status === 'error') return renderError();
    if (state.status !== 'ready') return;

    gridEl.hidden = false;
    gridEl.parentElement.querySelector('[data-dash-error]')?.remove();

    const rows = filtered();
    const active = rows.filter((row) => row.active);
    renderKpis(rows, active);
    renderRisk(active);
    renderFlow(rows);
    renderCourts(active);
    renderSubjects(active);
    renderTop(active);
}

function renderLoading() {
    gridEl.hidden = false;
    gridEl.parentElement.querySelector('[data-dash-error]')?.remove();
    kpisEl.replaceChildren(...Array.from({ length: 4 }, () => {
        const card = el('article', 'card stat');
        const label = el('span', 'skeleton skeleton--line skeleton--sm');
        label.style.width = '60%';
        const value = el('span', 'skeleton skeleton--line');
        value.style.cssText = 'width: 40%; height: 22px; margin: 8px 0 6px;';
        const foot = el('span', 'skeleton skeleton--line skeleton--sm');
        foot.style.width = '50%';
        card.append(label, value, foot);
        return card;
    }));
    [riskChart, flowChart].forEach((chart) => { chart.chartDraw = null; });
    riskLegend.replaceChildren();
    flowLegend.replaceChildren();
    [riskChart, flowChart, courtsBody, subjectsBody, topBody].forEach((body) => body.replaceChildren(el('div', 'skeleton chart-skeleton')));
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
    box.append(badge, el('p', 'empty__title', 'Não foi possível carregar os indicadores de processos jurídicos'), el('p', 'empty__text', state.error), retry);
    panel.append(box);
}

function emptyState(text) {
    const box = el('div', 'empty');
    const badge = el('span', 'empty__icon');
    badge.append(icon('inbox'));
    box.append(badge, el('p', 'empty__text', text));
    return box;
}

// Sem processo ativo, os cards dos ativos mostram o mesmo convite
function emptyActive() {
    return emptyState(state.lawsuits.length === 0
        ? 'Nenhum processo cadastrado. Registre o primeiro em Processos Jurídicos.'
        : 'Nenhum processo ativo no filtro');
}

/* KPIs */

function statCard({ label, iconName, tone, value, unit }) {
    const node = el('article', `card stat${tone ? ` stat--${tone}` : ''}`);
    const head = el('div', 'stat__head');
    const badge = el('span', 'stat__icon');
    badge.append(icon(iconName));
    head.append(el('p', 'stat__label', label), badge);
    const valueEl = el('p', 'stat__value', value);
    if (unit) valueEl.append(el('span', 'stat__unit', unit));
    node.append(head, valueEl);
    return node;
}

function meter(rate, label) {
    const bar = el('div', 'meter');
    bar.setAttribute('role', 'img');
    bar.setAttribute('aria-label', label);
    const fill = el('span', 'meter__fill');
    fill.style.width = `${((rate ?? 0) * 100).toFixed(1)}%`;
    bar.append(fill);
    return bar;
}

function renderKpis(rows, active) {
    const year = new Date().getFullYear();
    const closed = rows.length - active.length;
    const closedThisYear = rows.filter((row) => !row.active && row.closedYear === year).length;
    const activeValue = sumValue(active);

    const activeCard = statCard({ label: 'Processos ativos', iconName: 'scale', tone: 'accent', value: intFormat.format(active.length) });
    activeCard.title = `${intFormat.format(rows.length)} ${lawsuitWord(rows.length)} no filtro: ${intFormat.format(active.length)} ativos e ${intFormat.format(closed)} encerrados`;
    activeCard.append(el('p', 'stat__foot', `${intFormat.format(closedThisYear)} encerrado${closedThisYear === 1 ? '' : 's'} em ${year}`));

    const labor = active.filter((row) => row.labor);
    const laborCard = statCard({ label: 'Ações trabalhistas', iconName: 'gavel', value: intFormat.format(labor.length) });
    laborCard.title = 'Processos ativos da Justiça do Trabalho (TRT/TST), lidos do número CNJ';
    laborCard.append(el('p', 'stat__foot', active.length > 0
        ? `${percentFormat.format(labor.length / active.length)} dos ativos · ${compactCurrencyFormat.format(sumValue(labor))} em causa`
        : 'Nenhum processo ativo'));

    const probable = active.filter((row) => riskOf(row)?.tone === 'probable');
    const share = active.length > 0 ? probable.length / active.length : null;
    const probableCard = statCard({
        label: 'Chance de perda provável',
        iconName: 'alert',
        tone: probable.length > 0 ? 'danger' : null,
        value: share === null ? '–' : percentFormat.format(share),
    });
    probableCard.title = 'Processos ativos com chance de perda provável, sobre o total de ativos';
    probableCard.append(
        meter(share, share === null ? 'Chance de perda provável: sem processo ativo' : `Chance de perda provável: ${percentFormat.format(share)} dos ativos`),
        el('p', 'stat__foot', probable.length > 0
            ? `${intFormat.format(probable.length)} ${lawsuitWord(probable.length)} · ${compactCurrencyFormat.format(sumValue(probable))} expostos`
            : 'Nenhum processo com perda provável'),
    );

    const valueCard = statCard({ label: 'Valor em causa', iconName: 'coins', value: compactCurrencyFormat.format(activeValue) });
    valueCard.title = `${currencyFormat.format(activeValue)} nos processos ativos`;
    valueCard.append(el('p', 'stat__foot', active.length > 0
        ? `Média de ${compactCurrencyFormat.format(activeValue / active.length)} por processo`
        : 'Nenhum processo ativo'));

    kpisEl.replaceChildren(activeCard, laborCard, probableCard, valueCard);
}

/* Chance de perda: rosca dos ativos */

function renderRisk(active) {
    riskSubtitle.textContent = `Participação de cada chance nos ${intFormat.format(active.length)} ${lawsuitWord(active.length)} ativos`;
    if (active.length === 0) {
        riskChart.chartDraw = null;
        riskChart.replaceChildren(emptyActive());
        riskLegend.replaceChildren();
        return;
    }

    const total = active.length;
    const slices = state.risks.map((risk) => {
        const rows = active.filter((row) => row.riskId === risk.id);
        return { key: String(risk.id), label: risk.name, color: risk.color, value: rows.length, amount: sumValue(rows) };
    }).filter((slice) => slice.value > 0);

    donut(riskChart, {
        slices,
        centerValue: intFormat.format(total),
        centerLabel: total === 1 ? 'processo ativo' : 'processos ativos',
        tooltip: (slice) => tipContent({
            title: `Chance de perda ${slice.label.toLowerCase()}`,
            rows: [
                { color: slice.color, label: 'Processos', value: intFormat.format(slice.value) },
                { label: 'Valor em causa', value: currencyFormat.format(slice.amount) },
                { label: '% dos ativos', value: percentFormat.format(slice.value / total), strong: true },
            ],
        }),
        describe: (slice) => `${slice.label}: ${intFormat.format(slice.value)} ${lawsuitWord(slice.value)}, ${percentFormat.format(slice.value / total)} dos ativos`,
    });

    riskLegend.replaceChildren(...slices.map((slice) => {
        const item = el('li', 'donut-legend__item');
        const swatch = el('span', 'swatch');
        swatch.style.background = slice.color;
        item.append(
            swatch,
            el('span', 'donut-legend__name', slice.label),
            el('span', 'donut-legend__pct', percentFormat.format(slice.value / total)),
            el('span', 'donut-legend__kg', `${intFormat.format(slice.value)} ${lawsuitWord(slice.value)} · ${compactCurrencyFormat.format(slice.amount)}`),
        );
        return item;
    }));
}

/* Abertos (data do processo) e encerrados (data de encerramento) por ano */

function renderFlow(rows) {
    const current = new Date().getFullYear();
    const years = Array.from({ length: FLOW_YEARS }, (_, i) => current - FLOW_YEARS + 1 + i);
    const count = (key, year) => rows.filter((row) => (key === 'opened' ? row.openYear === year : row.closedYear === year)).length;
    const series = [
        { key: 'opened', label: 'Abertos', color: COLOR_OPENED },
        { key: 'closed', label: 'Encerrados', color: COLOR_CLOSED },
    ];
    flowSubtitle.textContent = `Pela data do processo e pela data de encerramento · ${years[0]} a ${current}`;

    flowLegend.replaceChildren(...series.map((s) => {
        const item = el('li', 'legend__item');
        const swatch = el('span', 'swatch');
        swatch.style.background = s.color;
        item.append(swatch, s.label);
        return item;
    }));

    const totals = { opened: years.reduce((acc, y) => acc + count('opened', y), 0), closed: years.reduce((acc, y) => acc + count('closed', y), 0) };
    if (totals.opened === 0 && totals.closed === 0) {
        flowChart.chartDraw = null;
        flowChart.replaceChildren(emptyState(`Nenhum processo aberto ou encerrado entre ${years[0]} e ${current}`));
        return;
    }

    const balance = (year) => count('opened', year) - count('closed', year);
    stackedColumns(flowChart, {
        grouped: true,
        integer: true,
        categories: years.map((year) => ({ key: year, label: String(year) })),
        series,
        value: (year, key) => count(key, year),
        formatValue: (n) => intFormat.format(n),
        tooltip: (index) => {
            const year = years[index];
            const diff = balance(year);
            return tipContent({
                title: String(year),
                rows: series.map((s) => ({ color: s.color, label: s.label, value: intFormat.format(count(s.key, year)) })),
                note: diff === 0 ? 'Saldo zero no ano' : `Saldo de ${diff > 0 ? '+' : '−'}${intFormat.format(Math.abs(diff))} ${lawsuitWord(Math.abs(diff))} no ano`,
            });
        },
        describe: (index) => {
            const year = years[index];
            return `${year}: ${intFormat.format(count('opened', year))} abertos e ${intFormat.format(count('closed', year))} encerrados`;
        },
    });

    flowChart.querySelector('svg')?.setAttribute('aria-label',
        `De ${years[0]} a ${current}: ${intFormat.format(totals.opened)} processos abertos e ${intFormat.format(totals.closed)} encerrados`);
}

/* Barras por grupo (tribunal, objeto), segmentadas por chance de perda */

// Agrupa, ordena pelo número de processos e junta o que passa de TOP_ROWS em "Outros"
function groupRows(active, keyOf, labelOf) {
    const groups = new Map();
    active.forEach((row) => {
        const key = keyOf(row);
        const group = groups.get(key) ?? { key, label: labelOf(row), rows: [] };
        group.rows.push(row);
        groups.set(key, group);
    });
    const sorted = [...groups.values()].sort((a, b) => b.rows.length - a.rows.length
        || sumValue(b.rows) - sumValue(a.rows) || a.label.localeCompare(b.label, 'pt-BR'));
    if (sorted.length <= TOP_ROWS) return { groups: sorted, count: sorted.length };
    const rest = sorted.slice(TOP_ROWS - 1);
    return {
        groups: [...sorted.slice(0, TOP_ROWS - 1), { key: '__others', label: `Outros (${rest.length})`, rows: rest.flatMap((g) => g.rows), others: true }],
        count: sorted.length,
    };
}

function renderBars(body, groups, { totalText, note, ariaLabel }) {
    const chart = el('div');
    // role group (não img): as barras dentro são focáveis e têm o próprio aria-label
    chart.setAttribute('role', 'group');
    chart.setAttribute('aria-label', ariaLabel);
    body.replaceChildren(chart);
    hbars(chart, {
        rows: groups.map((group) => ({
            key: String(group.key),
            label: group.label,
            total: group.rows.length,
            totalText: totalText(group),
            segments: riskSegments(group.rows),
            group,
        })),
        tooltip: (row) => tipContent({
            title: row.label,
            rows: [
                ...riskTipRows(row.group.rows),
                { label: 'Valor em causa', value: currencyFormat.format(sumValue(row.group.rows)), strong: true },
            ],
            note: note?.(row.group),
        }),
        describe: (row) => `${row.label}: ${intFormat.format(row.total)} ${lawsuitWord(row.total)}, ${currencyFormat.format(sumValue(row.group.rows))} em causa`,
    });
}

function renderCourts(active) {
    if (active.length === 0) {
        courtsSubtitle.textContent = 'Processos ativos, por chance de perda';
        courtsBody.replaceChildren(emptyActive());
        return;
    }
    const total = active.length;
    const { groups, count } = groupRows(active, (row) => row.tribunal ?? '__none', (row) => row.tribunal ?? 'Número CNJ incompleto');
    courtsSubtitle.textContent = `${intFormat.format(count)} ${count === 1 ? 'tribunal' : 'tribunais'} · barras por chance de perda`;
    renderBars(courtsBody, groups, {
        totalText: (group) => `${intFormat.format(group.rows.length)} · ${percentFormat.format(group.rows.length / total)}`,
        // Tribunal agrupado vem de uma justiça só; "Outros" pode misturar
        note: (group) => {
            const names = [...new Set(group.rows.map((row) => row.segmentName).filter(Boolean))];
            return names.length === 1 ? names[0] : null;
        },
        ariaLabel: `Processos ativos por tribunal: ${groups.map((g) => `${g.label} ${intFormat.format(g.rows.length)}`).join('; ')}`,
    });
}

function renderSubjects(active) {
    if (active.length === 0) {
        subjectsSubtitle.textContent = 'Processos ativos e valor em causa';
        subjectsBody.replaceChildren(emptyActive());
        return;
    }
    const { groups, count } = groupRows(active, (row) => row.subjectId, (row) => row.subjectName);
    subjectsSubtitle.textContent = `${intFormat.format(count)} ${count === 1 ? 'objeto' : 'objetos'} nos ativos · quantidade e valor em causa`;
    renderBars(subjectsBody, groups, {
        totalText: (group) => `${intFormat.format(group.rows.length)} · ${compactCurrencyFormat.format(sumValue(group.rows))}`,
        ariaLabel: `Processos ativos por objeto: ${groups.map((g) => `${g.label} ${intFormat.format(g.rows.length)}`).join('; ')}`,
    });
}

/* Maiores valores em causa */

function renderTop(active) {
    if (active.length === 0) {
        topSubtitle.textContent = 'Processos ativos de maior valor';
        topBody.replaceChildren(emptyActive());
        return;
    }
    const top = [...active].sort((a, b) => b.value - a.value || b.id - a.id).slice(0, TOP_VALUES);
    const share = sumValue(top) / (sumValue(active) || 1);
    topSubtitle.textContent = active.length > TOP_VALUES
        ? `Os ${TOP_VALUES} maiores somam ${percentFormat.format(share)} do valor em causa`
        : 'Processos ativos, do maior valor ao menor';

    const list = el('ol', 'law-top');
    top.forEach((row) => {
        const risk = riskOf(row);
        const item = el('li', 'law-top__item');
        const info = el('div', 'law-top__case');
        const meta = el('span', 'law-top__meta', [row.subjectName, row.tribunal].filter(Boolean).join(' · '));
        meta.title = meta.textContent;
        info.append(el('span', 'law-top__number', formatCaseNumber(row.caseNumber)), meta);

        const amount = el('div', 'law-top__amount');
        const value = el('span', 'law-top__value', compactCurrencyFormat.format(row.value));
        value.title = currencyFormat.format(row.value);
        amount.append(value, el('span', `badge risk-badge risk-badge--${risk?.tone ?? 'neutral'}`, risk?.name ?? '-'));
        item.append(info, amount);
        list.append(item);
    });
    topBody.replaceChildren(list);
}
