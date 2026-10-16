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

// Marca/limpa o erro de um campo [data-field="name"] dentro de `scope` (padrão .field.is-invalid)
export function setFieldError(scope, name, message) {
    const field = scope.querySelector(`[data-field="${name}"]`);
    if (!field) return false;
    const error = field.querySelector('[data-field-error]');
    const control = field.querySelector('input, select, textarea');

    field.classList.toggle('is-invalid', Boolean(message));
    control?.setAttribute('aria-invalid', message ? 'true' : 'false');
    if (error) {
        error.textContent = message ?? '';
        error.hidden = !message;
    }
    return true;
}

export function clearFieldErrors(scope) {
    scope.querySelectorAll('[data-field]').forEach((field) => setFieldError(scope, field.dataset.field, null));
}

// Limpa o erro do campo assim que o usuário volta a mexer nele
export function clearErrorOnInput(scope) {
    const handler = (event) => {
        const field = event.target.closest('[data-field]');
        if (field?.classList.contains('is-invalid')) setFieldError(scope, field.dataset.field, null);
    };
    scope.addEventListener('input', handler);
    scope.addEventListener('change', handler);
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
