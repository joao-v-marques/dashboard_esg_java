/* ==========================================================================
   charts.js — gráficos SVG/HTML feitos à mão para o dashboard (sem
   dependências): colunas empilhadas, rosca e barras horizontais, mais o
   tooltip compartilhado.

   Cada gráfico ocupa 100% do container (que define o tamanho pelo CSS) e é
   redesenhado quando o container muda de tamanho. Cores chegam como
   `var(--color-chart-n)`, então a troca de tema não exige redesenho.
   Todo texto vindo dos dados entra via textContent.
   ========================================================================== */

const SVG_NS = 'http://www.w3.org/2000/svg';
const GAP = 2;          // espaço na cor da superfície entre marcas que se tocam
const BAR_MAX = 28;     // espessura máxima de coluna
const RADIUS = 4;       // canto arredondado só na ponta do dado

const axisFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 });

function svgEl(tag, attrs = {}) {
    const node = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
    return node;
}

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
}

/* Redesenho no resize ------------------------------------------------------ */

const resizeObserver = new ResizeObserver((entries) => {
    entries.forEach((entry) => entry.target.chartDraw?.());
});

function mount(container, draw) {
    container.chartDraw = draw;
    resizeObserver.observe(container);
    draw();
}

/* Tooltip ------------------------------------------------------------------ */

let tipEl = null;

function tip() {
    if (!tipEl) {
        tipEl = el('div', 'chart-tip');
        tipEl.setAttribute('aria-hidden', 'true'); // o mesmo conteúdo está no aria-label da marca e na tabela
        tipEl.hidden = true;
        document.body.append(tipEl);
    }
    return tipEl;
}

/**
 * Conteúdo padrão do tooltip.
 * @param {{ title: string, rows: { color?: string, label: string, value: string, strong?: boolean }[], note?: string }} spec
 */
export function tipContent({ title, rows = [], note }) {
    const box = document.createDocumentFragment();
    box.append(el('p', 'chart-tip__title', title));
    const list = el('dl', 'chart-tip__rows');
    rows.forEach((row) => {
        const item = el('div', `chart-tip__row${row.strong ? ' chart-tip__row--strong' : ''}`);
        const dt = el('dt');
        if (row.color) {
            const swatch = el('span', 'chart-tip__swatch');
            swatch.style.background = row.color;
            dt.append(swatch);
        }
        dt.append(row.label);
        item.append(dt, el('dd', null, row.value));
        list.append(item);
    });
    box.append(list);
    if (note) box.append(el('p', 'chart-tip__note', note));
    return box;
}

function showTip(content, clientX, clientY) {
    const node = tip();
    node.replaceChildren(content);
    node.hidden = false;
    const { width, height } = node.getBoundingClientRect();
    let left = clientX + 14;
    if (left + width > window.innerWidth - 8) left = clientX - width - 14;
    let top = clientY - height - 12;
    if (top < 8) top = clientY + 18;
    node.style.left = `${Math.max(8, left)}px`;
    node.style.top = `${Math.max(8, top)}px`;
}

function hideTip() {
    if (tipEl) tipEl.hidden = true;
}

// Liga hover (mouse) e foco (teclado) de uma marca ao tooltip
function bindTip(target, content, { onEnter, onLeave } = {}) {
    target.addEventListener('pointermove', (event) => {
        onEnter?.();
        showTip(content(), event.clientX, event.clientY);
    });
    target.addEventListener('pointerleave', () => { hideTip(); onLeave?.(); });
    target.addEventListener('focus', () => {
        onEnter?.();
        const rect = target.getBoundingClientRect();
        showTip(content(), rect.left + rect.width / 2, rect.top);
    });
    target.addEventListener('blur', () => { hideTip(); onLeave?.(); });
}

window.addEventListener('scroll', hideTip, { passive: true });

/* Escala ------------------------------------------------------------------- */

function niceScale(max, count = 4) {
    if (!(max > 0)) return { max: 1, step: 1 / count };
    const raw = max / count;
    const magnitude = 10 ** Math.floor(Math.log10(raw));
    const norm = raw / magnitude;
    const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * magnitude;
    return { max: Math.ceil(max / step) * step, step };
}

// Retângulo com cantos arredondados só em cima (a base fica reta, presa ao eixo)
function topRoundedRect(x, y, w, h, r) {
    const radius = Math.min(r, h, w / 2);
    return `M${x},${y + h}V${y + radius}Q${x},${y} ${x + radius},${y}H${x + w - radius}Q${x + w},${y} ${x + w},${y + radius}V${y + h}Z`;
}

/* Colunas empilhadas ------------------------------------------------------- */

/**
 * @param {HTMLElement} container
 * @param {{
 *   categories: { key: string, label: string, sublabel?: string }[],
 *   series: { key: string, label: string, color: string }[],
 *   value: (categoryKey: string, seriesKey: string) => number,
 *   formatValue: (n: number) => string,
 *   tooltip: (categoryIndex: number) => Node,
 *   describe: (categoryIndex: number) => string,
 * }} options
 */
export function stackedColumns(container, options) {
    mount(container, () => drawStackedColumns(container, options));
}

function drawStackedColumns(container, { categories, series, value, formatValue, tooltip, describe }) {
    const width = container.clientWidth;
    const height = container.clientHeight;
    container.replaceChildren();
    if (width < 40 || height < 60) return;

    const totals = categories.map((c) => series.reduce((sum, s) => sum + (value(c.key, s.key) || 0), 0));
    const { max, step } = niceScale(Math.max(...totals, 0));

    const tickLabels = [];
    for (let v = 0; v <= max + step / 2; v += step) tickLabels.push(v);

    const margin = { top: 20, right: 4, bottom: 36, left: 8 + Math.max(...tickLabels.map((v) => axisFormat.format(v).length)) * 7 };
    const plotW = width - margin.left - margin.right;
    const plotH = height - margin.top - margin.bottom;
    const band = plotW / Math.max(categories.length, 1);
    const barW = Math.max(6, Math.min(BAR_MAX, band * 0.56));
    const y = (v) => margin.top + plotH - (v / max) * plotH;

    const svg = svgEl('svg', { width, height, viewBox: `0 0 ${width} ${height}`, class: 'chart-svg', role: 'group' });

    // Grade horizontal e rótulos do eixo Y
    const grid = svgEl('g', { class: 'chart-grid' });
    tickLabels.forEach((v) => {
        const ty = Math.round(y(v)) + 0.5;
        grid.append(svgEl('line', { x1: margin.left, x2: width - margin.right, y1: ty, y2: ty, class: v === 0 ? 'chart-axis-line' : 'chart-grid-line' }));
        const label = svgEl('text', { x: margin.left - 8, y: ty, class: 'chart-tick', 'text-anchor': 'end', 'dominant-baseline': 'middle' });
        label.textContent = axisFormat.format(v);
        grid.append(label);
    });
    svg.append(grid);

    // Com muitas categorias, mostra só parte dos rótulos do eixo X
    const labelEvery = Math.ceil(categories.length / Math.max(1, Math.floor(plotW / 44)));
    const maxIndex = totals.indexOf(Math.max(...totals));
    const lastIndex = totals.length - 1;

    categories.forEach((category, index) => {
        const group = svgEl('g', { class: 'chart-col', tabindex: 0, role: 'img', 'aria-label': describe(index) });
        const bandX = margin.left + index * band;
        const x = bandX + (band - barW) / 2;

        // Fundo da faixa (realce no hover) e área de clique maior que a coluna
        group.append(svgEl('rect', { x: bandX + 1, y: margin.top, width: Math.max(0, band - 2), height: plotH, rx: 6, class: 'chart-col__hit' }));

        const visible = series.filter((s) => (value(category.key, s.key) || 0) > 0);
        let base = 0;
        visible.forEach((s, i) => {
            const v = value(category.key, s.key);
            const y0 = y(base);
            const y1 = y(base + v);
            const isTop = i === visible.length - 1;
            // Espaço de 2px acima de cada segmento que tem outro por cima
            const top = isTop ? y1 : y1 + GAP;
            const h = Math.max(0, y0 - top);
            if (h > 0) {
                group.append(isTop
                    ? svgEl('path', { d: topRoundedRect(x, top, barW, h, RADIUS), fill: s.color, class: 'chart-col__seg' })
                    : svgEl('rect', { x, y: top, width: barW, height: h, fill: s.color, class: 'chart-col__seg' }));
            }
            base += v;
        });

        // Rótulo do total: em todas as colunas se forem poucas; senão só no maior e no último mês
        const total = totals[index];
        if (total > 0 && (categories.length <= 6 || index === maxIndex || index === lastIndex)) {
            const cap = svgEl('text', { x: x + barW / 2, y: y(total) - 6, class: 'chart-cap', 'text-anchor': 'middle' });
            cap.textContent = formatValue(total);
            group.append(cap);
        }

        if (index % labelEvery === 0 || index === lastIndex) {
            const label = svgEl('text', { x: bandX + band / 2, y: height - margin.bottom + 16, class: 'chart-tick chart-tick--x', 'text-anchor': 'middle' });
            label.textContent = category.label;
            group.append(label);
            if (category.sublabel) {
                const sub = svgEl('text', { x: bandX + band / 2, y: height - margin.bottom + 30, class: 'chart-tick chart-tick--sub', 'text-anchor': 'middle' });
                sub.textContent = category.sublabel;
                group.append(sub);
            }
        }

        bindTip(group, () => tooltip(index), {
            onEnter: () => group.classList.add('is-hover'),
            onLeave: () => group.classList.remove('is-hover'),
        });
        svg.append(group);
    });

    container.append(svg);
}

/* Rosca -------------------------------------------------------------------- */

function polar(cx, cy, r, angle) {
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
}

function arcPath(cx, cy, inner, outer, a0, a1) {
    // Fatia de 100%: dois meios-arcos (um arco SVG não fecha um círculo completo)
    if (a1 - a0 >= Math.PI * 2 - 1e-6) {
        const mid = a0 + Math.PI;
        return arcPath(cx, cy, inner, outer, a0, mid) + arcPath(cx, cy, inner, outer, mid, a1);
    }
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const [x0, y0] = polar(cx, cy, outer, a0);
    const [x1, y1] = polar(cx, cy, outer, a1);
    const [x2, y2] = polar(cx, cy, inner, a1);
    const [x3, y3] = polar(cx, cy, inner, a0);
    return `M${x0},${y0}A${outer},${outer} 0 ${large} 1 ${x1},${y1}L${x2},${y2}A${inner},${inner} 0 ${large} 0 ${x3},${y3}Z`;
}

/**
 * @param {HTMLElement} container
 * @param {{
 *   slices: { key: string, label: string, color: string, value: number }[],
 *   centerValue: string, centerLabel: string,
 *   tooltip: (slice) => Node, describe: (slice) => string,
 * }} options
 */
export function donut(container, options) {
    mount(container, () => drawDonut(container, options));
}

function drawDonut(container, { slices, centerValue, centerLabel, tooltip, describe }) {
    const width = container.clientWidth;
    const height = container.clientHeight;
    container.replaceChildren();
    const size = Math.min(width, height);
    if (size < 60) return;

    const cx = width / 2;
    const cy = height / 2;
    const outer = size / 2 - 4;
    const inner = outer * 0.64;
    const total = slices.reduce((sum, s) => sum + s.value, 0);

    const svg = svgEl('svg', { width, height, viewBox: `0 0 ${width} ${height}`, class: 'chart-svg', role: 'group' });
    svg.append(svgEl('circle', { cx, cy, r: (outer + inner) / 2, fill: 'none', 'stroke-width': outer - inner, class: 'chart-donut__track' }));

    let angle = -Math.PI / 2;
    const paths = [];
    slices.filter((s) => s.value > 0).forEach((slice) => {
        const sweep = (slice.value / total) * Math.PI * 2;
        const path = svgEl('path', {
            d: arcPath(cx, cy, inner, outer, angle, angle + sweep),
            fill: slice.color,
            class: 'chart-donut__slice',
            tabindex: 0,
            role: 'img',
            'aria-label': describe(slice),
        });
        angle += sweep;
        paths.push(path);
        bindTip(path, () => tooltip(slice), {
            onEnter: () => paths.forEach((p) => p.classList.toggle('is-dim', p !== path)),
            onLeave: () => paths.forEach((p) => p.classList.remove('is-dim')),
        });
        svg.append(path);
    });
    container.append(svg);

    const center = el('div', 'chart-donut__center');
    center.style.setProperty('--donut-inner', `${inner * 2 - 12}px`);
    center.append(el('span', 'chart-donut__value', centerValue), el('span', 'chart-donut__label', centerLabel));
    container.append(center);
}

/* Barras horizontais empilhadas (HTML) -------------------------------------- */

/**
 * @param {HTMLElement} container
 * @param {{
 *   rows: { key: string, label: string, total: number, totalText: string, segments: { key: string, color: string, value: number }[] }[],
 *   tooltip: (row) => Node, describe: (row) => string,
 * }} options
 */
export function hbars(container, { rows, tooltip, describe }) {
    container.replaceChildren();
    const max = Math.max(...rows.map((row) => row.total), 0);
    const list = el('ul', 'hbars');
    rows.forEach((row) => {
        const item = el('li', 'hbars__row');
        item.tabIndex = 0;
        item.setAttribute('aria-label', describe(row));

        const head = el('div', 'hbars__head');
        head.append(el('span', 'hbars__label', row.label), el('span', 'hbars__value', row.totalText));

        const track = el('div', 'hbars__track');
        const bar = el('div', 'hbars__bar');
        bar.style.width = `${max > 0 ? (row.total / max) * 100 : 0}%`;
        row.segments.filter((s) => s.value > 0).forEach((segment) => {
            const part = el('span', 'hbars__seg');
            part.style.flexGrow = String(segment.value);
            part.style.background = segment.color;
            bar.append(part);
        });
        track.append(bar);

        item.append(head, track);
        bindTip(item, () => tooltip(row));
        list.append(item);
    });
    container.append(list);
}
