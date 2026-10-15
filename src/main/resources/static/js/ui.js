/* ==========================================================================
   ui.js — pequenos utilitários de interface compartilhados entre as telas.
   ========================================================================== */

const ICONS = {
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>',
};

// Notificação flutuante e passageira (sucesso ou erro)
export function toast(message, { type = 'success', duration = 4500 } = {}) {
    let region = document.querySelector('[data-toast-region]');
    if (!region) {
        region = document.createElement('div');
        region.className = 'toast-region';
        region.setAttribute('data-toast-region', '');
        region.setAttribute('role', 'status');
        region.setAttribute('aria-live', 'polite');
        document.body.append(region);
    }

    const item = document.createElement('div');
    item.className = `toast${type === 'danger' ? ' toast--danger' : ''}`;
    item.innerHTML = type === 'danger' ? ICONS.alert : ICONS.check;
    const text = document.createElement('span');
    text.textContent = message;
    item.append(text);
    region.append(item);

    setTimeout(() => item.remove(), duration);
}

// Remove um parâmetro da URL sem recarregar (evita repetir a mensagem ao atualizar a página)
export function consumeQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    const value = params.get(name);
    if (params.has(name)) {
        params.delete(name);
        const query = params.toString();
        history.replaceState(null, '', window.location.pathname + (query ? `?${query}` : '') + window.location.hash);
    }
    return value;
}
