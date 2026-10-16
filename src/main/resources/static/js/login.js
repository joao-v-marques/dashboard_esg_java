/* ==========================================================================
   login.js — autenticação via POST /api/auth/login.
   O backend devolve o token em cookie HttpOnly; aqui só tratamos estados da
   tela (validação, carregamento, erros) e redirecionamos para a home.
   ========================================================================== */

import { auth, url } from './api.js';
import { consumeQueryParam, setFieldError as markField, clearFieldErrors as clearFields, clearErrorOnInput } from './ui.js';

const REASONS = {
    'sessao-expirada': { type: 'error', text: 'Sua sessão expirou. Entre novamente para continuar.' },
    'login-necessario': { type: 'info', text: 'Entre com sua conta para acessar a aplicação.' },
    'saiu': { type: 'info', text: 'Você saiu da sua conta com segurança.' },
};

const form = document.querySelector('[data-login-form]');
const submit = form.querySelector('[data-login-submit]');
const spinner = form.querySelector('[data-login-spinner]');
const label = form.querySelector('[data-login-label]');
const alertBox = document.querySelector('[data-login-alert]');
const alertText = alertBox.querySelector('[data-login-alert-text]');
const passwordInput = form.elements.password;

showReasonFromUrl();
redirectIfAuthenticated();
setupPasswordToggle();
setupCapsLockHint();

form.username.focus();

form.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideAlert();
    clearFieldErrors();

    const username = form.username.value.trim();
    const password = passwordInput.value;

    if (!validate({ username, password })) return;

    setLoading(true);
    try {
        await auth.login(username, password);
        label.textContent = 'Entrando...';
        window.location.assign(url('home'));
    } catch (error) {
        setLoading(false);
        if (error.status === 401) {
            showAlert('Usuário ou senha inválidos. Verifique os dados e tente novamente.');
            passwordInput.select();
        } else if (error.status === 400 && Object.keys(error.fields).length) {
            Object.entries(error.fields).forEach(([name, message]) => setFieldError(name, message));
        } else {
            showAlert(error.message);
        }
    }
});

clearErrorOnInput(form);

function validate({ username, password }) {
    let valid = true;
    if (!username) {
        setFieldError('username', 'Informe o usuário.');
        valid = false;
    }
    if (!password) {
        setFieldError('password', 'Informe a senha.');
        valid = false;
    }
    if (!valid) form.querySelector('.is-invalid input')?.focus();
    return valid;
}

function setFieldError(name, message) {
    markField(form, name, message);
}

function clearFieldErrors() {
    clearFields(form);
}

function setLoading(loading) {
    submit.disabled = loading;
    spinner.hidden = !loading;
    label.textContent = loading ? 'Verificando...' : 'Entrar';
}

function showAlert(text, type = 'error') {
    alertBox.classList.toggle('alert--info', type === 'info');
    alertText.textContent = text;
    alertBox.hidden = false;
}

function hideAlert() {
    alertBox.hidden = true;
}

function showReasonFromUrl() {
    const reason = consumeQueryParam('erro') ?? (consumeQueryParam('saiu') !== null ? 'saiu' : null);
    const message = REASONS[reason];
    if (message) showAlert(message.text, message.type);
}

// Quem já tem sessão válida e abre /login vai direto para a home
async function redirectIfAuthenticated() {
    try {
        await auth.me({ redirectOnUnauthorized: false });
        window.location.replace(url('home'));
    } catch {
        // Sem sessão: permanece no login
    }
}

function setupPasswordToggle() {
    const toggle = form.querySelector('[data-toggle-password]');
    const iconShow = toggle.querySelector('[data-icon-show]');
    const iconHide = toggle.querySelector('[data-icon-hide]');

    toggle.addEventListener('click', () => {
        const visible = passwordInput.type === 'text';
        passwordInput.type = visible ? 'password' : 'text';
        toggle.setAttribute('aria-pressed', String(!visible));
        toggle.setAttribute('aria-label', visible ? 'Mostrar senha' : 'Ocultar senha');
        iconShow.hidden = !visible;
        iconHide.hidden = visible;
        passwordInput.focus();
    });
}

function setupCapsLockHint() {
    const hint = form.querySelector('[data-capslock]');
    const update = (event) => {
        if (typeof event.getModifierState === 'function') hint.hidden = !event.getModifierState('CapsLock');
    };
    passwordInput.addEventListener('keydown', update);
    passwordInput.addEventListener('keyup', update);
    passwordInput.addEventListener('blur', () => { hint.hidden = true; });
}
