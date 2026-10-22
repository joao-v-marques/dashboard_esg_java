/* ==========================================================================
   cooperados.js — tema Cooperados do Dashboard.

   Tudo vem pronto de GET /api/cooperative-members/dashboard?year=, que o
   backend monta a partir do certificados-cooperados: capacitados em
   cooperativismo, índice de satisfação, manifestações (ocorrências), cooperados
   por faixa de pontuação e cursos/horas por cooperado. O filtro é o ano-base,
   que é como a outra aplicação agrega.

   Os dados só são buscados quando a aba é aberta: quem só vê Resíduos não gera
   chamada ao certificados-cooperados. Percentuais chegam de 0 a 100.
   ========================================================================== */

import { api } from '../api.js';
import { ICONS } from '../icons.js';
import { percentFormat, intFormat, formatMinutes } from '../format.js';

const filtersEl = document.querySelector('[data-coop-filters]');
const yearSelect = document.querySelector('[data-coop-year]');
const kpisEl = document.querySelector('[data-coop-kpis]');
const gridEl = document.querySelector('[data-coop-grid]');
const bandsBody = document.querySelector('[data-coop-bands]');
const bandsSubtitle = document.querySelector('[data-coop-bands-subtitle]');
const trainingBody = document.querySelector('[data-coop-training]');
const trainingSubtitle = document.querySelector('[data-coop-training-subtitle]');

const state = {
    status: 'idle',
    error: null,
    year: new Date().getFullYear(),
    data: null,
};

fillYears([state.year]);
filtersEl.addEventListener('submit', (event) => event.preventDefault());
yearSelect.addEventListener('change', () => load(Number(yearSelect.value)));

// Chamado pelo dashboard.js sempre que a aba Cooperados é selecionada
export function showCooperados() {
    if (state.status === 'idle') load(state.year);
}

/* Dados -------------------------------------------------------------------- */

async function load(year) {
    state.year = year;
    state.status = 'loading';
    render();
    try {
        const data = await api.get(`api/cooperative-members/dashboard?year=${year}`);
        // O ano foi trocado enquanto esta resposta vinha: a do ano novo é que vale
        if (year !== state.year) return;
        state.data = data;
        state.status = 'ready';
        fillYears(data.availableYears);
    } catch (error) {
        if (year !== state.year) return;
        state.status = 'error';
        state.error = error.message;
    }
    render();
}

function fillYears(years) {
    const options = [...new Set([...(years ?? []), state.year])].sort((a, b) => b - a);
    yearSelect.replaceChildren(...options.map((year) => {
        const option = el('option', null, String(year));
        option.value = String(year);
        return option;
    }));
    yearSelect.value = String(state.year);
}

// 35.5 (0 a 100) -> "35,50%"
const percent = (value) => (value === null || value === undefined ? '–' : percentFormat.format(Number(value) / 100));

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
    yearSelect.disabled = state.status === 'loading';

    if (state.status === 'loading') return renderLoading();
    if (state.status === 'error') return renderError();
    if (state.status !== 'ready') return;

    gridEl.hidden = false;
    gridEl.parentElement.querySelector('[data-dash-error]')?.remove();

    renderKpis(state.data);
    renderBands(state.data);
    renderTraining(state.data);
}

function renderLoading() {
    gridEl.hidden = false;
    gridEl.parentElement.querySelector('[data-dash-error]')?.remove();
    kpisEl.replaceChildren(...Array.from({ length: 3 }, () => {
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
    [bandsBody, trainingBody].forEach((body) => body.replaceChildren(el('div', 'skeleton chart-skeleton')));
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
    retry.addEventListener('click', () => load(state.year));
    box.append(badge, el('p', 'empty__title', 'Não foi possível carregar os indicadores de Cooperados'), el('p', 'empty__text', state.error), retry);
    panel.append(box);
}

/* KPIs */

function renderKpis(data) {
    const trained = data.trainedInCooperativism;
    const hasSurvey = data.satisfactionIndex !== null && data.satisfactionIndex !== undefined;

    const cards = [
        {
            label: 'Capacitados em cooperativismo', icon: 'graduation', accent: true,
            value: [intFormat.format(trained.count), `de ${intFormat.format(trained.total)}`],
            meter: { value: Number(trained.percentage), label: `Capacitados em cooperativismo: ${percent(trained.percentage)}` },
            foot: `${percent(trained.percentage)} dos cooperados ativos`,
        },
        {
            label: 'Índice de satisfação', icon: 'smile',
            value: [percent(data.satisfactionIndex), null],
            meter: hasSurvey ? { value: Number(data.satisfactionIndex), label: `Índice de satisfação: ${percent(data.satisfactionIndex)}` } : null,
            foot: hasSurvey ? `Pesquisa de ${data.year}` : `Sem pesquisa cadastrada para ${data.year}`,
        },
        {
            label: 'Manifestações registradas', icon: 'message',
            value: [intFormat.format(data.registeredOccurrences), data.registeredOccurrences === 1 ? 'ocorrência' : 'ocorrências'],
            foot: `Registradas em ${data.year}`,
        },
    ];

    kpisEl.replaceChildren(...cards.map((card) => {
        const node = el('article', `card stat${card.accent ? ' stat--accent' : ''}`);
        const head = el('div', 'stat__head');
        const badge = el('span', 'stat__icon');
        badge.append(icon(card.icon));
        head.append(el('p', 'stat__label', card.label), badge);

        const value = el('p', 'stat__value', card.value[0]);
        if (card.value[1]) value.append(el('span', 'stat__unit', card.value[1]));
        node.append(head, value);

        if (card.meter) {
            const meter = el('div', 'stat__meter');
            meter.setAttribute('role', 'img');
            meter.setAttribute('aria-label', card.meter.label);
            const fill = el('span');
            fill.style.width = `${Math.min(Math.max(card.meter.value, 0), 100).toFixed(1)}%`;
            meter.append(fill);
            node.append(meter);
        }

        node.append(el('p', 'stat__foot', card.foot));
        return node;
    }));
}

/* Tabelas */

function table(headers, rows, footer) {
    const tableEl = el('table', 'table table--compact');
    const thead = el('thead');
    const headRow = el('tr');
    headers.forEach(([label, className]) => {
        const th = el('th', className, label);
        th.scope = 'col';
        headRow.append(th);
    });
    thead.append(headRow);

    const tbody = el('tbody');
    rows.forEach((cells) => {
        const tr = el('tr');
        cells.forEach((content, index) => {
            const td = el('td', headers[index][1]);
            td.append(content);
            tr.append(td);
        });
        tbody.append(tr);
    });

    const tfoot = el('tfoot');
    const footRow = el('tr');
    footer.forEach((text, index) => footRow.append(el('td', headers[index][1], text)));
    tfoot.append(footRow);

    tableEl.append(thead, tbody, tfoot);
    const wrap = el('div', 'table-wrap');
    wrap.append(tableEl);
    return wrap;
}

// A barra leva a cor da faixa (tokens --color-band-*), a mesma do certificados-cooperados
function shareCell(value, band) {
    const cell = el('span', 'cell-share');
    const bar = el('span', 'cell-share__bar');
    const fill = el('span', 'band-fill');
    fill.style.cssText = `width: ${Math.min(Number(value), 100).toFixed(1)}%; background: var(--color-band-${band}-bg, var(--color-brand));`;
    bar.append(fill);
    cell.append(bar, percent(value));
    return cell;
}

function renderBands(data) {
    const bands = data.membersByPointsBand ?? [];
    const total = bands.reduce((sum, band) => sum + band.memberCount, 0);
    bandsSubtitle.textContent = `Percentual da pontuação máxima possível em ${data.year}`;

    bandsBody.replaceChildren(table(
        [['Faixa'], ['Pontuação'], ['Cooperados', 'col-num'], ['% dos cooperados', 'col-num']],
        bands.map((band) => [
            el('span', `band band--${band.band}`, `Faixa ${band.band}`),
            `${band.lowerBoundPercent}% a ${band.upperBoundPercent}%`,
            intFormat.format(band.memberCount),
            shareCell(band.percentage, band.band),
        ]),
        ['Total', '', intFormat.format(total), total > 0 ? percentFormat.format(1) : '–'],
    ));
}

function renderTraining(data) {
    const members = data.trainingByMember ?? [];
    trainingSubtitle.textContent = `${intFormat.format(members.length)} cooperados ativos em ${data.year}, maior carga horária primeiro`;

    if (members.length === 0) {
        trainingBody.replaceChildren(el('p', 'dash-card__subtitle', 'Nenhum cooperado ativo no ano.'));
        return;
    }

    const totalCourses = members.reduce((sum, member) => sum + member.totalCourses, 0);
    // Sem totalMinutes (versão antiga do certificados-cooperados), o total também fica em travessão
    const hasMinutes = members.some((member) => member.totalMinutes !== null && member.totalMinutes !== undefined);
    const totalMinutes = members.reduce((sum, member) => sum + (member.totalMinutes ?? 0), 0);

    trainingBody.replaceChildren(table(
        [['Cooperado'], ['Cursos', 'col-num'], ['Horas', 'col-num']],
        members.map((member) => [
            el('span', 'cell-type', member.memberName),
            intFormat.format(member.totalCourses),
            formatMinutes(member.totalMinutes),
        ]),
        ['Total', intFormat.format(totalCourses), hasMinutes ? formatMinutes(totalMinutes) : '–'],
    ));
}
