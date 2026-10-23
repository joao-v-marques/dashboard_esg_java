/* ==========================================================================
   shell.js — comportamento comum das telas autenticadas: carrega o usuário
   (GET /api/auth/me), preenche a topbar, controla o dropdown, o tema, o
   logout e a sidebar no mobile. As páginas importam `currentUser` para usar os dados.
   ========================================================================== */

import { auth, url, ApiError } from './api.js';
import { toast, consumeQueryParam } from './ui.js';
import { openFormModal } from './modal.js';
import { getTheme, toggleTheme, onThemeChange } from './theme.js';

// Nomes de exibição das roles do backend. Role nova sem tradução aparece formatada.
const ROLE_LABELS = {
    ADMINISTRATOR: 'Administrador',
    MANAGER: 'Gestor',
    EMPLOYEE_WASTES: 'Colaborador · Resíduos',
    EMPLOYEE_LEGAL: 'Colaborador · Jurídico',
    EMPLOYEE: 'Colaborador',
};

export function roleLabel(role) {
    if (!role) return '-';
    return ROLE_LABELS[role] ?? role.charAt(0) + role.slice(1).toLowerCase().replace(/_/g, ' ');
}

// user.roles já vem com a hierarquia aplicada pelo backend (ADMINISTRATOR > MANAGER > EMPLOYEE_WASTES / EMPLOYEE_LEGAL)
export function hasRole(user, role) {
    return user?.roles?.includes(role) ?? false;
}

export function isAdmin(user) {
    return hasRole(user, 'ADMINISTRATOR');
}

export function initials(name) {
    const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    const first = parts[0][0];
    const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (first + last).toUpperCase();
}

export const currentUser = auth.me().then((user) => {
    renderUser(user);
    return user;
}).catch((error) => {
    toast(error.message, { type: 'danger' });
    renderUser(null);
    return null;
});

setupUserMenu();
setupThemeToggle();
setupSidebar();
setupNavGroups();
showReasonFromUrl();

function renderUser(user) {
    const name = user?.name || user?.username || 'Usuário';
    const role = roleLabel(user?.role);
    const sector = user?.sector || '-';

    setAll('[data-user-name]', name);
    setAll('[data-user-initials]', user ? initials(name) : '?');
    setAll('[data-user-username]', user ? `@${user.username}` : '');
    setAll('[data-user-role]', role);
    setAll('[data-user-sector]', sector);
    setAll('[data-user-meta]', user ? [role, user.sector].filter(Boolean).join(' · ') : '');

    // Só esconde/mostra: quem protege de fato as rotas é o SecurityConfig
    // data-requires-role aceita várias roles separadas por espaço: basta ter uma delas
    document.querySelectorAll('[data-requires-role]').forEach((el) => {
        el.hidden = !el.dataset.requiresRole.split(/\s+/).some((role) => hasRole(user, role));
    });
}

function setAll(selector, text) {
    document.querySelectorAll(selector).forEach((el) => { el.textContent = text; });
}

function setupUserMenu() {
    const menu = document.querySelector('[data-user-menu]');
    if (!menu) return;
    const trigger = menu.querySelector('[data-user-menu-trigger]');
    const dropdown = menu.querySelector('[data-user-menu-dropdown]');
    const logoutButton = menu.querySelector('[data-logout]');
    const changePasswordButton = menu.querySelector('[data-change-password]');
    const firstItem = menu.querySelector('[role^="menuitem"]');

    const open = () => {
        dropdown.hidden = false;
        trigger.setAttribute('aria-expanded', 'true');
    };
    const close = ({ focusTrigger = false } = {}) => {
        if (dropdown.hidden) return;
        dropdown.hidden = true;
        trigger.setAttribute('aria-expanded', 'false');
        if (focusTrigger) trigger.focus();
    };

    trigger.addEventListener('click', () => {
        if (dropdown.hidden) {
            open();
            firstItem.focus();
        } else {
            close();
        }
    });

    document.addEventListener('click', (event) => {
        if (!menu.contains(event.target)) close();
    });

    menu.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') close({ focusTrigger: true });
    });

    menu.addEventListener('focusout', (event) => {
        if (event.relatedTarget && !menu.contains(event.relatedTarget)) close();
    });

    changePasswordButton?.addEventListener('click', () => {
        close();
        changePassword();
    });

    logoutButton.addEventListener('click', async () => {
        const label = logoutButton.querySelector('[data-logout-label]');
        logoutButton.disabled = true;
        label.textContent = 'Saindo...';
        try {
            await auth.logout();
            window.location.assign(url('login?saiu'));
        } catch (error) {
            logoutButton.disabled = false;
            label.textContent = 'Sair da conta';
            toast(error.message, { type: 'danger' });
        }
    });
}

// Troca da própria senha (PATCH /api/auth/me/password); a confirmação só é conferida aqui
function changePassword() {
    const passwordField = { type: 'password', required: true, full: true };
    return openFormModal({
        title: 'Trocar senha',
        description: 'Informe sua senha atual e defina uma nova.',
        iconName: 'key',
        size: 'sm',
        submitLabel: 'Trocar senha',
        busyLabel: 'Salvando...',
        fields: [
            { ...passwordField, name: 'currentPassword', label: 'Senha atual', autocomplete: 'current-password' },
            { ...passwordField, name: 'newPassword', label: 'Nova senha', minLength: 4, maxLength: 72, autocomplete: 'new-password' },
            {
                ...passwordField, name: 'confirmPassword', label: 'Confirmar nova senha', minLength: 4, maxLength: 72,
                autocomplete: 'new-password', help: 'A senha deve conter entre 4 e 72 caracteres.',
            },
        ],
        onSubmit: async (data) => {
            // Mesmo caminho dos erros da API: a mensagem vai para baixo do campo e o modal continua aberto
            if (data.newPassword !== data.confirmPassword) {
                throw new ApiError(400, 'As senhas não conferem.', { confirmPassword: 'As senhas não conferem.' });
            }
            await auth.changePassword(data.currentPassword, data.newPassword);
        },
    }).then(async (saved) => {
        if (!saved) return;
        // Encerra a sessão para o usuário entrar de novo já com a nova senha
        try {
            await auth.logout();
            window.location.assign(url('login?senha-alterada'));
        } catch (error) {
            toast(`Senha alterada, mas não foi possível encerrar a sessão. ${error.message}`, { type: 'danger' });
        }
    });
}

function setupThemeToggle() {
    const button = document.querySelector('[data-theme-toggle]');
    if (!button) return;
    const label = button.querySelector('[data-theme-toggle-label]');

    const render = (theme) => {
        const dark = theme === 'dark';
        button.setAttribute('aria-checked', String(dark));
        label.textContent = dark ? 'Modo claro' : 'Modo escuro';
    };

    render(getTheme());
    onThemeChange(render);
    button.addEventListener('click', toggleTheme);
}

function setupSidebar() {
    const sidebar = document.querySelector('[data-sidebar]');
    const toggle = document.querySelector('[data-sidebar-toggle]');
    const scrim = document.querySelector('[data-sidebar-scrim]');
    if (!sidebar || !toggle) return;

    const setOpen = (open) => {
        sidebar.classList.toggle('is-open', open);
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? 'Fechar menu de navegação' : 'Abrir menu de navegação');
        if (scrim) scrim.hidden = !open;
    };

    toggle.addEventListener('click', () => setOpen(!sidebar.classList.contains('is-open')));
    scrim?.addEventListener('click', () => setOpen(false));
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && sidebar.classList.contains('is-open')) {
            setOpen(false);
            toggle.focus();
        }
    });
    window.matchMedia('(min-width: 1025px)').addEventListener('change', (event) => {
        if (event.matches) setOpen(false);
    });
}

// Grupos recolhíveis da sidebar (o estado inicial vem do Thymeleaf conforme a página ativa)
function setupNavGroups() {
    document.querySelectorAll('[data-nav-group]').forEach((toggle) => {
        const list = document.getElementById(toggle.getAttribute('aria-controls'));
        if (!list) return;
        toggle.addEventListener('click', () => {
            const open = toggle.getAttribute('aria-expanded') !== 'true';
            toggle.setAttribute('aria-expanded', String(open));
            list.hidden = !open;
        });
    });
}

function showReasonFromUrl() {
    if (consumeQueryParam('erro') === 'sem-acesso') {
        toast('Você não tem permissão para acessar aquela página.', { type: 'danger' });
    }
}
