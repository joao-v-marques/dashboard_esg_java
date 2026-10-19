/* ==========================================================================
   sections.js — definição declarativa de cada seção de Configurações.

   O controlador (settings.js) é genérico: lista, filtra, abre os modais e
   chama a API a partir do que está descrito aqui. Para uma nova seção,
   basta adicionar um objeto em SECTIONS.

   ctx = { user (usuário logado), store: { [sectionId]: rows } }
   ========================================================================== */

import { api } from '../api.js';
import { ICONS } from '../icons.js';
import { openFormModal } from '../modal.js';
import { roleLabel, initials } from '../shell.js';
import { toast } from '../ui.js';

const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' });

/* Células ------------------------------------------------------------------ */

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
}

function statusBadge(row) {
    return row.isActive
        ? el('span', 'badge badge--success', 'Ativo')
        : el('span', 'badge badge--muted', 'Inativo');
}

function primaryCell({ title, subtitle, avatar, tags = [] }) {
    const cell = el('div', 'cell-primary');
    if (avatar) {
        const badge = el('span', 'avatar avatar--sm', avatar);
        badge.setAttribute('aria-hidden', 'true');
        cell.append(badge);
    }
    const text = el('div', 'cell-primary__text');
    const titleRow = el('span', 'cell-primary__title', title);
    tags.forEach((tag) => titleRow.append(tag));
    text.append(titleRow);
    if (subtitle) text.append(el('span', 'cell-primary__subtitle', subtitle));
    cell.append(text);
    return cell;
}

function tag(text, iconName) {
    const node = el('span', 'badge badge--plain badge--outline');
    if (iconName) node.innerHTML = ICONS[iconName];
    node.append(text);
    return node;
}

const activeOptions = (rows = [], label = (name) => name) => rows
    .filter((row) => row.isActive)
    .map((row) => ({ value: row.id, label: label(row.name) }))
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));

/* Usuários ----------------------------------------------------------------- */

const isSelf = (row, ctx) => row.username === ctx.user?.username;

const usersSection = {
    id: 'usuarios',
    title: 'Usuários',
    navDescription: 'Contas de acesso',
    description: 'Gerencie quem acessa a aplicação, com qual função e em qual setor.',
    icon: 'users',
    endpoint: 'api/users',
    singular: 'usuário',
    plural: 'usuários',
    newLabel: 'Novo usuário',
    modalSize: 'lg',
    searchPlaceholder: 'Buscar por nome, usuário ou e-mail',
    messages: {
        created: 'Usuário cadastrado com sucesso.',
        updated: 'Usuário atualizado com sucesso.',
        deactivated: 'Usuário desativado.',
        reactivated: 'Usuário reativado.',
        empty: 'Nenhum usuário cadastrado',
        emptyInactive: 'Nenhum usuário inativo',
        emptyActive: 'Nenhum usuário ativo',
    },

    displayName: (row) => row.name || row.username,
    searchText: (row) => [row.name, row.username, row.email, roleLabel(row.roleName), row.sectorName].join(' '),

    columns: (ctx) => [
        {
            label: 'Nome',
            render: (row) => primaryCell({
                title: row.name || row.username,
                subtitle: `@${row.username}`,
                avatar: initials(row.name || row.username),
                tags: isSelf(row, ctx) ? [tag('Você')] : [],
            }),
        },
        { label: 'E-mail', render: (row) => row.email || '-' },
        { label: 'Função', className: 'col-nowrap', render: (row) => roleLabel(row.roleName) },
        { label: 'Setor', className: 'col-nowrap', render: (row) => row.sectorName },
        { label: 'Status', render: statusBadge },
        { label: 'Criado em', className: 'col-nowrap', render: (row) => (row.createdAt ? dateFormat.format(new Date(row.createdAt)) : '-') },
    ],

    formDescription: (mode) => (mode === 'create'
        ? 'Preencha os dados de acesso. A senha poderá ser redefinida depois.'
        : 'A senha não é alterada aqui. Use "Redefinir senha" na tabela.'),

    formFields: (ctx, mode) => [
        { name: 'name', label: 'Nome completo', maxLength: 255, placeholder: 'Ex.: Maria Clara Souza', autocomplete: 'off' },
        { name: 'username', label: 'Usuário', required: true, maxLength: 100, placeholder: 'Ex.: maria.souza', autocomplete: 'off' },
        { name: 'email', label: 'E-mail', type: 'email', maxLength: 255, placeholder: 'nome@empresa.com.br', autocomplete: 'off', full: true },
        { name: 'roleId', label: 'Função', type: 'select', required: true, valueType: 'number', options: activeOptions(ctx.store.funcoes, roleLabel) },
        { name: 'sectorId', label: 'Setor', type: 'select', required: true, valueType: 'number', options: activeOptions(ctx.store.setores) },
        ...(mode === 'create'
            ? [{ name: 'password', label: 'Senha inicial', type: 'password', required: true, minLength: 4, maxLength: 72, autocomplete: 'new-password', full: true, help: 'Entre 4 e 72 caracteres.' }]
            : []),
    ],

    valuesFrom: (row) => ({ name: row.name, username: row.username, email: row.email, roleId: row.roleId, sectorId: row.sectorId }),
    toPayload: (data) => data,

    deactivateEffect: 'O usuário perde o acesso à aplicação imediatamente. Você pode reativá-lo quando quiser.',
    reactivateEffect: 'O usuário volta a ter acesso à aplicação com a função e o setor atuais.',

    editBlockedReason: () => null,
    toggleBlockedReason: (row, ctx) => (row.isActive && isSelf(row, ctx) ? 'Você não pode desativar o próprio usuário.' : null),

    extraActions: (row) => [{
        icon: 'key',
        label: 'Redefinir senha',
        onClick: () => resetPassword(row),
    }],
};

function resetPassword(row) {
    const name = row.name || row.username;
    return openFormModal({
        title: 'Redefinir senha',
        description: `Defina uma nova senha para ${name} (@${row.username}).`,
        iconName: 'key',
        size: 'sm',
        submitLabel: 'Redefinir senha',
        busyLabel: 'Redefinindo...',
        fields: [{
            name: 'newPassword', label: 'Nova senha', type: 'password', required: true,
            minLength: 4, maxLength: 72, autocomplete: 'new-password', full: true, help: 'Entre 4 e 72 caracteres.',
        }],
        onSubmit: (data) => api.patch(`api/users/${row.id}/password`, data),
    }).then((saved) => {
        if (saved) toast(`Senha de ${name} redefinida com sucesso.`);
        return false; // a lista não muda
    });
}

/* Funções e Setores (mesmo formato: id, name, isActive) -------------------- */

function simpleNameSection(config) {
    const label = config.labelOf ?? ((name) => name);
    return {
        modalSize: 'sm',
        searchPlaceholder: 'Buscar por nome',
        displayName: (row) => label(row.name),
        searchText: (row) => `${row.name} ${label(row.name)}`,

        columns: () => [
            {
                label: 'Nome',
                render: (row) => primaryCell({
                    title: label(row.name),
                    subtitle: label(row.name) !== row.name ? row.name : null,
                    tags: config.protectedReason?.(row) ? [tag('Protegida', 'lock')] : [],
                }),
            },
            { label: 'Status', render: statusBadge },
        ],

        formDescription: () => null,
        formFields: () => [{
            name: 'name', label: config.nameLabel, required: true, maxLength: 100,
            placeholder: config.namePlaceholder, autocomplete: 'off', full: true,
        }],
        valuesFrom: (row) => ({ name: row.name }),
        toPayload: (data) => data,

        editBlockedReason: (row) => config.protectedReason?.(row) ?? null,
        toggleBlockedReason: (row) => config.protectedReason?.(row) ?? null,
        ...config,
    };
}

const rolesSection = simpleNameSection({
    id: 'funcoes',
    title: 'Funções',
    navDescription: 'Perfis de acesso',
    description: 'Funções (papéis) definem o perfil de acesso atribuído a cada usuário.',
    icon: 'shield',
    endpoint: 'api/roles',
    singular: 'função',
    plural: 'funções',
    newLabel: 'Nova função',
    nameLabel: 'Nome da função',
    namePlaceholder: 'Ex.: GESTOR',
    labelOf: roleLabel,
    protectedReason: (row) => (row.name === 'ADMINISTRATOR'
        ? 'A função de administrador é protegida e não pode ser alterada.'
        : null),
    messages: {
        created: 'Função cadastrada com sucesso.',
        updated: 'Função atualizada com sucesso.',
        deactivated: 'Função desativada.',
        reactivated: 'Função reativada.',
        empty: 'Nenhuma função cadastrada',
        emptyInactive: 'Nenhuma função inativa',
        emptyActive: 'Nenhuma função ativa',
    },
    deactivateEffect: 'Ela não poderá ser atribuída a usuários enquanto estiver inativa.',
    reactivateEffect: 'Ela volta a poder ser atribuída a usuários.',
});

const sectorsSection = simpleNameSection({
    id: 'setores',
    title: 'Setores',
    navDescription: 'Áreas da organização',
    description: 'Setores organizam os usuários por área de atuação dentro da organização.',
    icon: 'building',
    endpoint: 'api/sectors',
    singular: 'setor',
    plural: 'setores',
    newLabel: 'Novo setor',
    nameLabel: 'Nome do setor',
    namePlaceholder: 'Ex.: Recursos Humanos',
    messages: {
        created: 'Setor cadastrado com sucesso.',
        updated: 'Setor atualizado com sucesso.',
        deactivated: 'Setor desativado.',
        reactivated: 'Setor reativado.',
        empty: 'Nenhum setor cadastrado',
        emptyInactive: 'Nenhum setor inativo',
        emptyActive: 'Nenhum setor ativo',
    },
    deactivateEffect: 'Ele não poderá ser atribuído a usuários enquanto estiver inativo.',
    reactivateEffect: 'Ele volta a poder ser atribuído a usuários.',
});

export const SECTIONS = [usersSection, rolesSection, sectorsSection];
