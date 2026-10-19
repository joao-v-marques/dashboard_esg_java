/* ==========================================================================
   theme.js — leitura e troca do tema (claro/escuro). A preferência fica só
   no navegador (localStorage); sem escolha explícita, segue o sistema.
   O tema inicial é aplicado antes por js/theme-init.js.
   ========================================================================== */

const STORAGE_KEY = 'esg-theme';
const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
const listeners = new Set();

export function getTheme() {
    return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function setTheme(theme, { persist = true } = {}) {
    document.documentElement.dataset.theme = theme;
    if (persist) {
        try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* storage indisponível */ }
    }
    listeners.forEach((listener) => listener(theme));
}

export function toggleTheme() {
    setTheme(getTheme() === 'dark' ? 'light' : 'dark');
}

export function onThemeChange(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function hasSavedTheme() {
    try { return localStorage.getItem(STORAGE_KEY) !== null; } catch { return false; }
}

// Acompanha o sistema enquanto o usuário não escolheu um tema
systemDark.addEventListener('change', (event) => {
    if (!hasSavedTheme()) setTheme(event.matches ? 'dark' : 'light', { persist: false });
});
