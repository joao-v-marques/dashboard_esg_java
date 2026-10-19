/* ==========================================================================
   data-table.js — renderiza uma tabela de cadastro e seus estados.

   renderTable(container, {
     state: 'loading' | 'error' | 'ready',
     columns: [{ label, render(row) -> string | Node, className, sortKey }],
     rows, rowClass(row), actions(row) -> [{ icon, label, onClick, tone, disabledReason }],
     empty: { title, text }, errorText, onRetry,
     sort: { key, dir: 'asc' | 'desc' }, onSort(key),   // opcionais: cabeçalhos com sortKey viram botões
     stack: true,                                       // opcional: no celular cada linha vira um card
   })
   Strings retornadas por render entram via textContent (seguro para dados da API).
   ========================================================================== */

import { ICONS } from './icons.js';

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
}

function emptyState({ iconName, title, text, tone, action }) {
    const box = el('div', `empty${tone === 'error' ? ' empty--error' : ''}`);
    const badge = el('span', 'empty__icon');
    badge.innerHTML = ICONS[iconName] ?? '';
    box.append(badge, el('p', 'empty__title', title));
    if (text) box.append(el('p', 'empty__text', text));
    if (action) box.append(action);
    return box;
}

function actionButton(action) {
    const button = el('button', `icon-btn${action.tone === 'danger' ? ' icon-btn--danger' : ''}`);
    button.type = 'button';
    button.innerHTML = ICONS[action.icon] ?? '';
    // Desabilitado com aria-disabled (e não `disabled`) para o tooltip com o motivo continuar aparecendo
    const tooltip = action.disabledReason ?? action.label;
    button.setAttribute('aria-label', action.disabledReason ? `${action.label}: ${action.disabledReason}` : action.label);
    button.dataset.tooltip = tooltip;
    if (action.disabledReason) {
        button.setAttribute('aria-disabled', 'true');
    } else {
        button.addEventListener('click', action.onClick);
    }
    return button;
}

export function renderTable(container, options) {
    const { state, columns, rows = [], rowClass, actions, empty, errorText, onRetry, sort, onSort, stack } = options;
    container.replaceChildren();

    if (state === 'error') {
        const retry = el('button', 'btn btn--secondary btn--sm');
        retry.type = 'button';
        retry.innerHTML = ICONS.refresh;
        retry.append(el('span', null, 'Tentar novamente'));
        retry.addEventListener('click', onRetry);
        container.append(emptyState({
            iconName: 'alert', tone: 'error', title: 'Não foi possível carregar os dados',
            text: errorText, action: retry,
        }));
        return;
    }

    if (state === 'ready' && rows.length === 0) {
        container.append(emptyState({ iconName: 'inbox', ...empty }));
        return;
    }

    const wrap = el('div', 'table-wrap');
    const table = el('table', `table${stack ? ' table--stack' : ''}`);
    const thead = el('thead');
    const headRow = el('tr');
    columns.forEach((column) => {
        const th = el('th', column.className);
        th.scope = 'col';
        if (column.sortKey && onSort) {
            const active = sort?.key === column.sortKey;
            th.setAttribute('aria-sort', active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none');
            const button = el('button', `th-sort${active ? ' is-active' : ''}`);
            button.type = 'button';
            button.append(el('span', null, column.label));
            const icon = el('span', 'th-sort__icon');
            icon.innerHTML = active ? ICONS[sort.dir === 'asc' ? 'sortUp' : 'sortDown'] : ICONS.sort;
            button.append(icon);
            button.addEventListener('click', () => onSort(column.sortKey));
            th.append(button);
        } else {
            th.textContent = column.label;
        }
        headRow.append(th);
    });
    if (actions) {
        const th = el('th', 'col-actions');
        th.append(el('span', 'visually-hidden', 'Ações'));
        headRow.append(th);
    }
    thead.append(headRow);

    const tbody = el('tbody');

    if (state === 'loading') {
        for (let i = 0; i < 5; i++) {
            const tr = el('tr', 'skeleton-row');
            const total = columns.length + (actions ? 1 : 0);
            for (let c = 0; c < total; c++) {
                const td = el('td');
                const bar = el('span', 'skeleton');
                bar.style.width = `${c === 0 ? 70 : 40 + ((i + c) % 3) * 15}%`;
                td.append(bar);
                tr.append(td);
            }
            tbody.append(tr);
        }
    } else {
        rows.forEach((row) => {
            const tr = el('tr', rowClass?.(row) ?? '');
            columns.forEach((column) => {
                const td = el('td', column.className);
                td.dataset.label = column.label;
                const content = column.render(row);
                if (content instanceof Node) td.append(content);
                else td.textContent = content ?? '-';
                tr.append(td);
            });
            if (actions) {
                const td = el('td', 'col-actions');
                const group = el('div', 'row-actions');
                actions(row).forEach((action) => group.append(actionButton(action)));
                td.append(group);
                tr.append(td);
            }
            tbody.append(tr);
        });
    }

    table.append(thead, tbody);
    wrap.append(table);
    container.append(wrap);
    container.setAttribute('aria-busy', state === 'loading' ? 'true' : 'false');
}
