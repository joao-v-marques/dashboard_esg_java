/* ==========================================================================
   shell.js — comportamento comum das telas autenticadas: carrega o usuário
   (GET /api/auth/me), preenche a topbar, controla o dropdown, o logout e a
   sidebar no mobile. As páginas importam `currentUser` para usar os dados.
   ========================================================================== */

import { auth, url } from './api.js';
import { toast, consumeQueryParam } from './ui.js';

// Nomes de exibição das roles do backend. Role nova sem tradução aparece formatada.
const ROLE_LABELS = {
    ADMINISTRATOR: 'Administrador',
    EMPLOYEE: 'Colaborador',
};

export function roleLabel(role) {
    if (!role) return '-';
    return ROLE_LABELS[role] ?? role.charAt(0) + role.slice(1).toLowerCase().replace(/_/g, ' ');
}

export function isAdmin(user) {
    return user?.role === 'ADMINISTRATOR';
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
setupSidebar();
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

    // Só esconde/mostra: quem protege de fato as rotas de administração é o SecurityConfig
    document.querySelectorAll('[data-admin-only]').forEach((el) => { el.hidden = !isAdmin(user); });
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
            logoutButton.focus();
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

function showReasonFromUrl() {
    if (consumeQueryParam('erro') === 'sem-acesso') {
        toast('Você não tem permissão para acessar aquela página.', { type: 'danger' });
    }
}
