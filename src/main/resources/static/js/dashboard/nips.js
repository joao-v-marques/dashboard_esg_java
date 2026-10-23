/* ==========================================================================
   nips.js — tema NIP's do Dashboard.

   Sem endpoint agregado: busca GET /api/nips, /api/nip-status e
   /api/nip-natures uma vez, na primeira abertura da aba, e calcula tudo no
   cliente. Trocar ano ou natureza só recalcula. A data de referência é
   notificationDate (não há data de encerramento; updatedAt não serve).

   Classificação dos status, sempre pelo nome (o id muda entre bancos):
   - finalizada: isFinished() de nip-format.js (nome começa com "Finalizada");
   - em andamento: qualquer status não finalizado;
   - resolvida: RESOLVED_STATUS;
   - risco de processo sancionador: AWAITING_PROCESS_STATUS.
   ========================================================================== */

import { api } from '../api.js';
import { ICONS } from '../icons.js';
import { percentFormat, intFormat, fromIso, formatDay, monthLabel } from '../format.js';
import { isFinished, maskCpf, onlyDigits } from '../nips/nip-format.js';
import { stackedColumns, hbars, tipContent } from './charts.js';

// NIP encerrada com a demanda atendida pela operadora (Resolução Verificada na Etapa)
const RESOLVED_STATUS = 'Finalizada - NIP Resolvida (RVE)';
// NIP não resolvida na mediação, que pode virar processo administrativo sancionador da ANS
const AWAITING_PROCESS_STATUS = 'Aguardando Abertura de Processo';
// Em andamento há mais que isso (dias corridos desde a notificação) conta como parada
const STALE_DAYS = 10;
const TOP_REPEAT = 5;

const COLOR_CURRENT = 'var(--color-chart-1)';
const COLOR_PREVIOUS = 'var(--color-text-faint)';
const COLOR_RESOLVED = 'var(--color-brand)';
const COLOR_OTHER_STATUS = 'var(--color-text-faint)';

const normalize = (name) => String(name ?? '').trim().toLowerCase();
const isResolved = (nip) => normalize(nip.statusName) === normalize(RESOLVED_STATUS);
const isAwaitingProcess = (nip) => normalize(nip.statusName) === normalize(AWAITING_PROCESS_STATUS);

const filtersEl = document.querySelector('[data-nip-filters]');
const yearSelect = document.querySelector('[data-nip-year]');
const natureSelect = document.querySelector('[data-nip-nature]');
const kpisEl = document.querySelector('[data-nip-kpis]');
const gridEl = document.querySelector('[data-nip-grid]');
const legendEl = document.querySelector('[data-nip-legend]');
const trendSubtitle = document.querySelector('[data-nip-trend-subtitle]');
const trendChart = document.querySelector('[data-nip-chart="trend"]');
const statusBody = document.querySelector('[data-nip-status]');
const statusSubtitle = document.querySelector('[data-nip-status-subtitle]');
const naturesBody = document.querySelector('[data-nip-natures]');
const repeatBody = document.querySelector('[data-nip-repeat]');
const repeatSubtitle = document.querySelector('[data-nip-repeat-subtitle]');
const repeatCount = document.querySelector('[data-nip-repeat-count]');

const state = {
    status: 'idle',
    error: null,
    nips: [],
    natures: [],
    year: new Date().getFullYear(),
    nature: '',
};

filtersEl.addEventListener('submit', (event) => event.preventDefault());
yearSelect.addEventListener('change', () => {
    state.year = Number(yearSelect.value);
    render();
});
natureSelect.addEventListener('change', () => {
    state.nature = natureSelect.value;
    natureSelect.classList.toggle('is-set', state.nature !== '');
    render();
});

// Chamado pelo dashboard.js sempre que a aba NIP's é selecionada
export function showNips() {
    if (state.status === 'idle') load();
    else render(); // os gráficos precisam medir o container visível
}

/* Dados -------------------------------------------------------------------- */

async function load() {
    state.status = 'loading';
    render();
    try {
        const [nips, statuses, natures] = await Promise.all([
            api.get('api/nips'),
            api.get('api/nip-status'),
            api.get('api/nip-natures'),
        ]);
        const statusById = new Map((statuses ?? []).map((status) => [status.id, status.name]));
        state.nips = (nips ?? []).filter((row) => row.notificationDate).map((row) => ({
            date: row.notificationDate,
            year: Number(row.notificationDate.slice(0, 4)),
            month: row.notificationDate.slice(5, 7),
            statusName: statusById.get(row.statusId) ?? row.statusName,
            natureId: row.natureId,
            cpf: onlyDigits(row.beneficiaryCpf),
            name: row.beneficiaryName,
        }));
        state.natures = [...(natures ?? [])].sort((a, b) => a.id - b.id);
        fillYears();
        fillNatures();
        state.status = 'ready';
    } catch (error) {
        state.status = 'error';
        state.error = error.message;
    }
    render();
}

// Anos com notificação, mais recente primeiro; o padrão é o ano atual ou, sem dados nele, o mais recente
function fillYears() {
    const current = new Date().getFullYear();
    const years = [...new Set(state.nips.map((nip) => nip.year))].sort((a, b) => b - a);
    if (!years.length) years.push(current);
    state.year = years.includes(current) ? current : years[0];
    yearSelect.replaceChildren(...years.map((year) => {
        const option = el('option', null, String(year));
        option.value = String(year);
        return option;
    }));
    yearSelect.value = String(state.year);
}

function fillNatures() {
    natureSelect.querySelectorAll('option:not([value=""])').forEach((option) => option.remove());
    state.natures.forEach((nature) => {
        const option = el('option', null, nature.name);
        option.value = String(nature.id);
        natureSelect.append(option);
    });
    natureSelect.value = state.nature;
}

/* Agregação ---------------------------------------------------------------- */

const pad = (n) => String(n).padStart(2, '0');

function todayParts() {
    const today = new Date();
    return { year: today.getFullYear(), monthDay: `${pad(today.getMonth() + 1)}-${pad(today.getDate())}` };
}

// NIP's do ano, com o filtro de natureza (o comparativo por natureza passa byNature: false)
function nipsOf(year, { byNature = true, until = null } = {}) {
    const natureId = byNature && state.nature ? Number(state.nature) : null;
    return state.nips.filter((nip) => nip.year === year
        && (!natureId || nip.natureId === natureId)
        && (!until || nip.date <= until));
}

function daysSince(iso) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((today - fromIso(iso)) / 86400000);
}

function resolution(rows) {
    const finished = rows.filter((nip) => isFinished({ name: nip.statusName }));
    const resolved = finished.filter(isResolved).length;
    return { finished: finished.length, resolved, rate: finished.length > 0 ? resolved / finished.length : null };
}

function countByMonth(rows) {
    const map = new Map();
    rows.forEach((nip) => map.set(nip.month, (map.get(nip.month) ?? 0) + 1));
    return map;
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

const nipWord = (n) => (n === 1 ? 'NIP' : "NIP's");

function render() {
    filtersEl.querySelectorAll('select').forEach((control) => { control.disabled = state.status !== 'ready'; });

    if (state.status === 'loading') return renderLoading();
    if (state.status === 'error') return renderError();
    if (state.status !== 'ready') return;

    gridEl.hidden = false;
    gridEl.parentElement.querySelector('[data-dash-error]')?.remove();

    const rows = nipsOf(state.year);
    renderKpis(rows);
    renderTrend(rows);
    renderStatus(rows);
    renderNatures();
    renderRepeat(rows);
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
    trendChart.chartDraw = null;
    legendEl.replaceChildren();
    [trendChart, statusBody, naturesBody, repeatBody].forEach((body) => body.replaceChildren(el('div', 'skeleton chart-skeleton')));
    repeatCount.hidden = true;
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
    box.append(badge, el('p', 'empty__title', "Não foi possível carregar os indicadores de NIP's"), el('p', 'empty__text', state.error), retry);
    panel.append(box);
}

function emptyState(text) {
    const box = el('div', 'empty');
    const badge = el('span', 'empty__icon');
    badge.append(icon('inbox'));
    box.append(badge, el('p', 'empty__text', text));
    return box;
}

/* KPIs */

// Ano corrente: compara com o mesmo intervalo do ano anterior (1º/jan até a data de hoje)
function previousCount() {
    const prevYear = state.year - 1;
    const today = todayParts();
    const until = state.year === today.year ? `${prevYear}-${today.monthDay}` : null;
    return { year: prevYear, until, count: nipsOf(prevYear, { until }).length };
}

// Mais NIP's é ruim: subir fica vermelho, cair fica verde
function countDelta(current, previous) {
    const foot = el('p', 'stat__foot');
    if (previous.count === 0) {
        foot.append(el('span', 'delta delta--neutral', '–'), ` sem base em ${previous.year}`);
        return foot;
    }
    const change = (current - previous.count) / previous.count;
    const direction = Math.abs(change) < 0.00005 ? 0 : Math.sign(change);
    const tone = direction === 0 ? 'neutral' : direction > 0 ? 'bad' : 'good';
    const delta = el('span', `delta delta--${tone}`);
    delta.append(icon(direction > 0 ? 'arrowUp' : direction < 0 ? 'arrowDown' : 'minus'), percentFormat.format(Math.abs(change)));
    foot.append(delta, ` vs ${previous.year}`);
    return foot;
}

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

function renderKpis(rows) {
    const previous = previousCount();
    const { finished, resolved, rate } = resolution(rows);
    const ongoing = rows.filter((nip) => !isFinished({ name: nip.statusName }));
    const stale = ongoing.filter((nip) => daysSince(nip.date) > STALE_DAYS).length;
    const awaiting = rows.filter(isAwaitingProcess).length;

    const total = statCard({ label: "Número de NIP's", iconName: 'fileAlert', tone: 'accent', value: intFormat.format(rows.length), unit: `em ${state.year}` });
    total.title = previous.until
        ? `Comparado a 01/01/${previous.year} – ${formatDay(previous.until)} (mesmo intervalo do ano anterior)`
        : `Comparado ao ano de ${previous.year}`;
    total.append(countDelta(rows.length, previous));

    const resolvedCard = statCard({ label: "NIP's resolvidas", iconName: 'check', value: rate === null ? '–' : percentFormat.format(rate) });
    resolvedCard.title = `Resolvidas (${RESOLVED_STATUS}) sobre as finalizadas`;
    resolvedCard.append(
        meter(rate, rate === null ? 'Resolvidas: sem NIP finalizada' : `Resolvidas: ${percentFormat.format(rate)} das finalizadas`),
        el('p', 'stat__foot', finished > 0 ? `${intFormat.format(resolved)} de ${intFormat.format(finished)} finalizadas` : 'Nenhuma NIP finalizada'),
    );

    const ongoingCard = statCard({ label: 'Em andamento', iconName: 'clock', tone: 'info', value: intFormat.format(ongoing.length) });
    ongoingCard.title = `Em andamento há mais de ${STALE_DAYS} dias corridos desde a notificação`;
    ongoingCard.append(el('p', 'stat__foot', `${intFormat.format(stale)} há mais de ${STALE_DAYS} dias`));

    const awaitingCard = statCard({ label: 'Aguardando abertura de processo', iconName: 'alert', tone: awaiting > 0 ? 'danger' : null, value: intFormat.format(awaiting) });
    awaitingCard.title = 'NIP não resolvida na mediação, que pode virar processo sancionador da ANS';
    const awaitingFoot = el('p', 'stat__foot');
    if (awaiting > 0) awaitingFoot.append(icon('alert'), 'Risco de processo sancionador');
    else awaitingFoot.append('Nenhuma NIP em risco');
    awaitingCard.append(awaitingFoot);

    kpisEl.replaceChildren(total, resolvedCard, ongoingCard, awaitingCard);
}

/* Evolução mensal: ano filtrado vs. ano anterior, com o mesmo filtro de natureza */

function renderTrend(rows) {
    const year = state.year;
    const prevRows = nipsOf(year - 1);
    const series = [
        { key: 'cur', label: String(year), color: COLOR_CURRENT, counts: countByMonth(rows) },
        { key: 'prev', label: String(year - 1), color: COLOR_PREVIOUS, counts: countByMonth(prevRows) },
    ];
    trendSubtitle.textContent = `NIP's por mês de notificação · ${year} comparado a ${year - 1}`;

    legendEl.replaceChildren(...series.map((s) => {
        const item = el('li', 'legend__item');
        const swatch = el('span', 'swatch');
        swatch.style.background = s.color;
        item.append(swatch, s.label);
        return item;
    }));

    if (rows.length === 0 && prevRows.length === 0) {
        trendChart.chartDraw = null;
        trendChart.replaceChildren(emptyState(`Nenhuma NIP notificada em ${year - 1} ou ${year}`));
        return;
    }

    const months = Array.from({ length: 12 }, (_, i) => pad(i + 1));
    const valueOf = (month, key) => series.find((s) => s.key === key).counts.get(month) ?? 0;
    const describeMonth = (month) => monthLabel(`${year}-${month}`, { long: true }).replace(/ de \d{4}$/, '');

    stackedColumns(trendChart, {
        grouped: true,
        integer: true,
        categories: months.map((month) => ({ key: month, label: monthLabel(`${year}-${month}`) })),
        series,
        value: valueOf,
        formatValue: (n) => intFormat.format(n),
        tooltip: (index) => {
            const month = months[index];
            const cur = valueOf(month, 'cur');
            const prev = valueOf(month, 'prev');
            return tipContent({
                title: describeMonth(month),
                rows: series.map((s) => ({ color: s.color, label: s.label, value: `${intFormat.format(valueOf(month, s.key))} ${nipWord(valueOf(month, s.key))}` })),
                note: prev > 0 ? `${cur >= prev ? '+' : '−'}${percentFormat.format(Math.abs(cur - prev) / prev)} vs ${year - 1}` : `Sem NIP's em ${describeMonth(month)} de ${year - 1}`,
            });
        },
        describe: (index) => {
            const month = months[index];
            return `${describeMonth(month)}: ${intFormat.format(valueOf(month, 'cur'))} em ${year}, ${intFormat.format(valueOf(month, 'prev'))} em ${year - 1}`;
        },
    });

    trendChart.querySelector('svg')?.setAttribute('aria-label',
        `NIP's por mês: ${intFormat.format(rows.length)} em ${year} e ${intFormat.format(prevRows.length)} em ${year - 1}`);
}

/* Distribuição por status de encerramento (só finalizadas) */

function renderStatus(rows) {
    const finished = rows.filter((nip) => isFinished({ name: nip.statusName }));
    statusSubtitle.textContent = `${intFormat.format(finished.length)} ${nipWord(finished.length)} finalizada${finished.length === 1 ? '' : 's'} em ${state.year}`;

    if (finished.length === 0) {
        statusBody.replaceChildren(emptyState('Nenhuma NIP finalizada no período'));
        return;
    }

    const counts = new Map();
    finished.forEach((nip) => counts.set(nip.statusName, (counts.get(nip.statusName) ?? 0) + 1));
    const total = finished.length;
    const items = [...counts.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'))
        .map(([name, count]) => {
            const resolved = isResolved({ statusName: name });
            const color = resolved ? COLOR_RESOLVED : COLOR_OTHER_STATUS;
            return {
                key: name,
                label: name,
                total: count,
                totalText: `${intFormat.format(count)} · ${percentFormat.format(count / total)}`,
                segments: [{ key: name, color, value: count }],
                color,
            };
        });

    // role group (não img): as barras dentro são focáveis e têm o próprio aria-label
    const chart = el('div');
    chart.setAttribute('role', 'group');
    chart.setAttribute('aria-label', `Status de encerramento: ${items.map((row) => `${row.label} ${intFormat.format(row.total)}`).join('; ')}`);
    statusBody.replaceChildren(chart);
    hbars(chart, {
        rows: items,
        tooltip: (row) => tipContent({
            title: row.label,
            rows: [
                { color: row.color, label: 'NIP\'s', value: intFormat.format(row.total) },
                { label: '% das finalizadas', value: percentFormat.format(row.total / total), strong: true },
            ],
        }),
        describe: (row) => `${row.label}: ${intFormat.format(row.total)} ${nipWord(row.total)}, ${percentFormat.format(row.total / total)} das finalizadas`,
    });
}

/* Taxa de resolução por natureza (ignora o filtro de natureza) */

function renderNatures() {
    const rows = nipsOf(state.year, { byNature: false });
    if (state.natures.length === 0) {
        naturesBody.replaceChildren(emptyState('Nenhuma natureza cadastrada'));
        return;
    }
    const list = el('ul', 'nip-rates');
    state.natures.forEach((nature) => {
        const { finished, resolved, rate } = resolution(rows.filter((nip) => nip.natureId === nature.id));
        const item = el('li', 'nip-rates__item');
        const head = el('div', 'nip-rates__head');
        head.append(el('span', 'nip-rates__name', nature.name), el('span', 'nip-rates__pct', rate === null ? '–' : percentFormat.format(rate)));
        item.append(
            head,
            meter(rate, rate === null ? `${nature.name}: sem NIP finalizada` : `${nature.name}: ${percentFormat.format(rate)} resolvidas`),
            el('p', 'nip-rates__foot', finished > 0 ? `${intFormat.format(resolved)} de ${intFormat.format(finished)} finalizadas` : 'Nenhuma NIP finalizada'),
        );
        list.append(item);
    });
    naturesBody.replaceChildren(list);
}

/* Beneficiários reincidentes (2+ NIP's no ano) */

function renderRepeat(rows) {
    const byCpf = new Map();
    rows.filter((nip) => nip.cpf).forEach((nip) => {
        const entry = byCpf.get(nip.cpf) ?? { cpf: nip.cpf, name: nip.name, count: 0, last: '' };
        entry.count += 1;
        // O nome exibido é o da notificação mais recente
        if (nip.date >= entry.last) {
            entry.last = nip.date;
            entry.name = nip.name;
        }
        byCpf.set(nip.cpf, entry);
    });
    const repeat = [...byCpf.values()]
        .filter((entry) => entry.count >= 2)
        .sort((a, b) => b.count - a.count || b.last.localeCompare(a.last));

    repeatSubtitle.textContent = `Beneficiários com 2 ou mais NIP's em ${state.year}${repeat.length > TOP_REPEAT ? ` · top ${TOP_REPEAT}` : ''}`;
    repeatCount.hidden = repeat.length === 0;
    repeatCount.textContent = intFormat.format(repeat.length);
    repeatCount.setAttribute('aria-label', `${intFormat.format(repeat.length)} beneficiário${repeat.length === 1 ? '' : 's'} reincidente${repeat.length === 1 ? '' : 's'}`);

    if (repeat.length === 0) {
        repeatBody.replaceChildren(emptyState('Nenhum beneficiário com mais de uma NIP no período'));
        return;
    }

    const list = el('ol', 'nip-repeat');
    repeat.slice(0, TOP_REPEAT).forEach((entry) => {
        const item = el('li', 'nip-repeat__item');
        const who = el('div', 'nip-repeat__who');
        who.append(el('span', 'nip-repeat__name', entry.name), el('span', 'nip-repeat__cpf', maskCpf(entry.cpf)));
        const stats = el('div', 'nip-repeat__stats');
        stats.append(el('span', 'nip-repeat__count', `${intFormat.format(entry.count)} NIP's`), el('span', 'nip-repeat__last', `Última: ${formatDay(entry.last)}`));
        item.append(who, stats);
        list.append(item);
    });
    repeatBody.replaceChildren(list);
}
