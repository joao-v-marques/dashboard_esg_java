/* ==========================================================================
   settings.js — controlador da tela de Configurações (somente ADMINISTRATOR).

   Carrega todas as seções em paralelo (os contadores da navegação e os selects
   de função/setor do formulário de usuário dependem delas), mantém a seção
   ativa no hash da URL e liga busca, filtro de status e ações aos modais.
   ========================================================================== */

import { api } from '../api.js';
import { ICONS } from '../icons.js';
import { openFormModal, confirmModal } from '../modal.js';
import { renderTable } from '../data-table.js';
import { currentUser } from '../shell.js';
import { toast } from '../ui.js';
import { SECTIONS } from './sections.js';

const nav = document.querySelector('[data-sections-nav]');
const titleEl = document.querySelector('[data-section-title]');
const descriptionEl = document.querySelector('[data-section-description]');
const newButton = document.querySelector('[data-new]');
const newLabel = document.querySelector('[data-new-label]');
const searchInput = document.querySelector('[data-search]');
const statusFilter = document.querySelector('[data-status-filter]');
const resultsEl = document.querySelector('[data-results]');
const tableEl = document.querySelector('[data-table]');

const state = {
    section: findSection(location.hash) ?? SECTIONS[0],
    status: 'active',
    search: '',
    // por seção: { status: 'loading' | 'error' | 'ready', rows, error }
    data: Object.fromEntries(SECTIONS.map((s) => [s.id, { status: 'loading', rows: [] }])),
    user: null,
};

const ctx = {
    get user() { return state.user; },
    get store() { return Object.fromEntries(SECTIONS.map((s) => [s.id, state.data[s.id].rows])); },
};

buildNav();
bindToolbar();
render();

currentUser.then((user) => {
    state.user = user;
    render();
});
loadAll();

/* Dados -------------------------------------------------------------------- */

async function loadAll() {
    await Promise.all(SECTIONS.map(loadSection));
}

async function loadSection(section) {
    const entry = state.data[section.id];
    try {
        const rows = await api.get(section.endpoint);
        state.data[section.id] = { status: 'ready', rows: Array.isArray(rows) ? rows : [] };
    } catch (error) {
        // Num recarregamento após uma ação, mantém o que já estava na tela
        state.data[section.id] = entry.status === 'ready'
            ? entry
            : { status: 'error', rows: [], error: error.message };
        if (entry.status === 'ready') toast(error.message, { type: 'danger' });
    }
    render();
}

/* Navegação ---------------------------------------------------------------- */

function findSection(hash) {
    const id = decodeURIComponent((hash ?? '').replace(/^#/, ''));
    return SECTIONS.find((section) => section.id === id);
}

function buildNav() {
    SECTIONS.forEach((section) => {
        const item = document.createElement('li');
        const link = document.createElement('a');
        link.className = 'settings-nav__item';
        link.href = `#${section.id}`;
        link.dataset.section = section.id;

        const iconBox = document.createElement('span');
        iconBox.className = 'settings-nav__icon';
        iconBox.innerHTML = ICONS[section.icon];

        const text = document.createElement('span');
        text.className = 'settings-nav__text';
        const title = document.createElement('span');
        title.className = 'settings-nav__title';
        title.textContent = section.title;
        const description = document.createElement('span');
        description.className = 'settings-nav__description';
        description.textContent = section.navDescription;
        text.append(title, description);

        const count = document.createElement('span');
        count.className = 'settings-nav__count';
        count.dataset.count = '';

        link.append(iconBox, text, count);
        item.append(link);
        nav.append(item);
    });

    window.addEventListener('hashchange', () => {
        const section = findSection(location.hash);
        if (!section || section === state.section) return;
        state.section = section;
        state.search = '';
        searchInput.value = '';
        render();
    });
}

function bindToolbar() {
    newButton.addEventListener('click', openCreate);

    searchInput.addEventListener('input', () => {
        state.search = searchInput.value;
        renderPanel();
    });

    statusFilter.addEventListener('click', (event) => {
        const option = event.target.closest('[data-value]');
        if (!option) return;
        state.status = option.dataset.value;
        statusFilter.querySelectorAll('[data-value]').forEach((button) => {
            button.setAttribute('aria-pressed', String(button === option));
        });
        renderPanel();
    });
}

/* Renderização ------------------------------------------------------------- */

function render() {
    renderNav();
    renderPanel();
}

function renderNav() {
    nav.querySelectorAll('[data-section]').forEach((link) => {
        const section = SECTIONS.find((s) => s.id === link.dataset.section);
        const entry = state.data[section.id];
        const active = section === state.section;
        link.classList.toggle('is-active', active);
        if (active) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');

        const count = link.querySelector('[data-count]');
        const activeCount = entry.rows.filter((row) => row.isActive).length;
        count.textContent = entry.status === 'ready' ? String(activeCount) : '';
        count.hidden = entry.status !== 'ready';
        count.title = `Cadastros ativos: ${activeCount}`;
    });
}

// Busca sem diferenciar acentos e maiúsculas ("joao" encontra "João")
function normalize(text) {
    return String(text ?? '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase();
}

function visibleRows(section, rows) {
    const term = normalize(state.search.trim());
    return rows
        .filter((row) => state.status === 'all' || (state.status === 'active' ? row.isActive : !row.isActive))
        .filter((row) => !term || normalize(section.searchText(row)).includes(term))
        .sort((a, b) => (Number(b.isActive) - Number(a.isActive))
            || section.displayName(a).localeCompare(section.displayName(b), 'pt-BR'));
}

function renderPanel() {
    const section = state.section;
    const entry = state.data[section.id];

    document.title = `${section.title} · Configurações · Acompanhamento ESG`;
    titleEl.textContent = section.title;
    descriptionEl.textContent = section.description;
    newLabel.textContent = section.newLabel;
    searchInput.placeholder = section.searchPlaceholder;
    searchInput.setAttribute('aria-label', section.searchPlaceholder);
    // O formulário de usuário depende das funções/setores; espera tudo carregar
    newButton.disabled = SECTIONS.some((s) => state.data[s.id].status === 'loading');

    const rows = visibleRows(section, entry.rows);

    resultsEl.textContent = entry.status === 'ready'
        ? `${rows.length} de ${entry.rows.length} ${entry.rows.length === 1 ? section.singular : section.plural}`
        : '';

    renderTable(tableEl, {
        state: entry.status,
        columns: section.columns(ctx),
        rows,
        rowClass: (row) => (row.isActive ? '' : 'is-inactive'),
        actions: (row) => actionsFor(section, row),
        errorText: entry.error,
        onRetry: () => {
            state.data[section.id] = { status: 'loading', rows: [] };
            render();
            loadSection(section);
        },
        empty: emptyStateFor(section, entry.rows),
    });
}

function emptyStateFor(section, allRows) {
    if (allRows.length === 0) {
        return { title: section.messages.empty, text: `Clique em "${section.newLabel}" para cadastrar o primeiro.` };
    }
    if (state.search.trim()) {
        return { title: 'Nenhum resultado encontrado', text: 'Revise o termo buscado ou altere o filtro de status.' };
    }
    if (state.status === 'inactive') {
        return { title: section.messages.emptyInactive, text: 'Todos os cadastros desta seção estão ativos.' };
    }
    return { title: section.messages.emptyActive, text: 'Use o filtro "Inativos" para ver os cadastros desativados.' };
}

/* Ações -------------------------------------------------------------------- */

function actionsFor(section, row) {
    // O backend não permite editar um registro inativo: na linha inativa só existe "Reativar"
    if (!row.isActive) {
        return [{ icon: 'restore', label: 'Reativar', onClick: () => toggleStatus(section, row, true) }];
    }
    return [
        { icon: 'edit', label: 'Editar', onClick: () => openEdit(section, row), disabledReason: section.editBlockedReason(row, ctx) },
        ...(section.extraActions?.(row, ctx) ?? []),
        {
            icon: 'ban', label: 'Desativar', tone: 'danger',
            onClick: () => toggleStatus(section, row, false),
            disabledReason: section.toggleBlockedReason(row, ctx),
        },
    ];
}

async function afterChange(message) {
    toast(message);
    // Recarrega tudo: editar uma função/setor muda o nome exibido na lista de usuários
    await loadAll();
}

async function openCreate() {
    const section = state.section;
    const saved = await openFormModal({
        title: section.newLabel,
        description: section.formDescription('create'),
        iconName: section.icon,
        size: section.modalSize,
        fields: section.formFields(ctx, 'create'),
        submitLabel: 'Cadastrar',
        busyLabel: 'Cadastrando...',
        onSubmit: (data) => api.post(section.endpoint, section.toPayload(data, 'create')),
    });
    if (saved) await afterChange(section.messages.created);
}

async function openEdit(section, row) {
    const saved = await openFormModal({
        title: `Editar ${section.singular}`,
        description: section.formDescription('edit') ?? section.displayName(row),
        iconName: 'edit',
        size: section.modalSize,
        fields: section.formFields(ctx, 'edit'),
        values: section.valuesFrom(row),
        submitLabel: 'Salvar alterações',
        onSubmit: (data) => api.put(`${section.endpoint}/${row.id}`, section.toPayload(data, 'edit')),
    });
    if (saved) await afterChange(section.messages.updated);
}

async function toggleStatus(section, row, activate) {
    const message = document.createDocumentFragment();
    const name = document.createElement('strong');
    name.textContent = section.displayName(row);
    message.append(activate ? 'Reativar ' : 'Desativar ', name, '? ', activate ? section.reactivateEffect : section.deactivateEffect);

    const done = await confirmModal({
        title: `${activate ? 'Reativar' : 'Desativar'} ${section.singular}`,
        message,
        iconName: activate ? 'restore' : 'ban',
        tone: activate ? 'primary' : 'danger',
        confirmLabel: activate ? 'Reativar' : 'Desativar',
        busyLabel: activate ? 'Reativando...' : 'Desativando...',
        onConfirm: () => api.patch(`${section.endpoint}/${row.id}/${activate ? 'reactivate' : 'deactivate'}`),
    });
    if (done) await afterChange(activate ? section.messages.reactivated : section.messages.deactivated);
}
