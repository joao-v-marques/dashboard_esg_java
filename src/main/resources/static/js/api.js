/* ==========================================================================
   api.js — única porta de comunicação com o backend.

   O token vive em um cookie HttpOnly (o JS não lê nem guarda o token): o
   navegador envia o cookie sozinho em toda requisição same-origin. O caminho
   base vem da <meta name="app-base">, renderizada pelo Thymeleaf com @{/},
   então o context-path (/dashboard-esg) nunca fica fixo no JS.
   ========================================================================== */

const BASE = document.querySelector('meta[name="app-base"]')?.content ?? '/';

// Monta uma URL da aplicação a partir de um caminho relativo ("home", "api/auth/me")
export function url(path = '') {
    return BASE.replace(/\/$/, '') + '/' + String(path).replace(/^\//, '');
}

// Erro padronizado: message e fields seguem o ApiError do backend
export class ApiError extends Error {
    constructor(status, message, fields = {}) {
        super(message);
        this.status = status;
        this.fields = fields;
    }
}

/**
 * Faz uma requisição JSON para a API.
 * @param {string} path caminho relativo à aplicação (ex.: "api/auth/me")
 * @param {object} options method, body (objeto, vira JSON) e redirectOnUnauthorized
 */
export async function request(path, { method = 'GET', body, redirectOnUnauthorized = true } = {}) {
    const headers = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    let response;
    try {
        response = await fetch(url(path), {
            method,
            headers,
            credentials: 'same-origin',
            body: body !== undefined ? JSON.stringify(body) : undefined,
        });
    } catch {
        throw new ApiError(0, 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.');
    }

    if (response.status === 401 && redirectOnUnauthorized) {
        window.location.assign(url('login?erro=sessao-expirada'));
        // Mantém a promise pendente enquanto a página troca, sem disparar tratamentos de erro na tela
        return new Promise(() => {});
    }

    const data = await readJson(response);

    if (!response.ok) {
        throw new ApiError(
            response.status,
            data?.message ?? 'Ocorreu um erro inesperado. Tente novamente em instantes.',
            data?.fields ?? {},
        );
    }

    return data;
}

async function readJson(response) {
    if (response.status === 204) return null;
    const type = response.headers.get('Content-Type') ?? '';
    if (!type.includes('application/json')) return null;
    try {
        return await response.json();
    } catch {
        return null;
    }
}

// Atalhos por método HTTP, usados pelas telas de cadastro
export const api = {
    get: (path) => request(path),
    post: (path, body) => request(path, { method: 'POST', body }),
    put: (path, body) => request(path, { method: 'PUT', body }),
    patch: (path, body) => request(path, { method: 'PATCH', body }),
};

export const auth = {
    login: (username, password) =>
        request('api/auth/login', { method: 'POST', body: { username, password }, redirectOnUnauthorized: false }),
    me: (options) => request('api/auth/me', options),
    changePassword: (currentPassword, newPassword) =>
        request('api/auth/me/password', { method: 'PATCH', body: { currentPassword, newPassword } }),
    logout: () => request('api/auth/logout', { method: 'POST', redirectOnUnauthorized: false }),
};
