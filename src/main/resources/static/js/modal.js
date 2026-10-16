/* ==========================================================================
   modal.js — modais com <dialog> nativo (foco preso, Esc fecha, backdrop).

   - openFormModal: formulário de cadastro/edição montado a partir de `fields`.
     onSubmit(data) é assíncrono; se lançar um ApiError, os `fields` do erro
     vão para baixo de cada campo e a `message` para o alerta do topo, e o
     modal continua aberto. Resolve true quando salvou, false se cancelou.
   - confirmModal: confirmação de uma ação (ex.: desativar), mesmo contrato.

   Todo texto vindo da API entra via textContent, nunca innerHTML.
   ========================================================================== */

import { ICONS } from './icons.js';
import { setFieldError, clearFieldErrors, clearErrorOnInput } from './ui.js';

let uid = 0;

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
}

function iconNode(name) {
    const wrap = document.createElement('span');
    wrap.innerHTML = ICONS[name] ?? '';
    return wrap.firstElementChild;
}

/**
 * Estrutura base do modal. Devolve as partes para o chamador preencher.
 */
function createShell({ title, description, size = 'md', iconName, tone }) {
    const dialog = el('dialog', `modal modal--${size}`);
    const titleId = `modal-title-${++uid}`;
    dialog.setAttribute('aria-labelledby', titleId);

    const form = el('form', 'modal__form');
    form.noValidate = true;

    const header = el('header', 'modal__header');
    if (iconName) {
        const badge = el('span', `modal__icon${tone === 'danger' ? ' modal__icon--danger' : ''}`);
        badge.append(iconNode(iconName));
        header.append(badge);
    }
    const heading = el('div', 'modal__heading');
    const h2 = el('h2', 'modal__title', title);
    h2.id = titleId;
    heading.append(h2);
    if (description) heading.append(el('p', 'modal__description', description));

    const closeButton = el('button', 'modal__close');
    closeButton.type = 'button';
    closeButton.setAttribute('aria-label', 'Fechar');
    closeButton.append(iconNode('close'));
    header.append(heading, closeButton);

    const body = el('div', 'modal__body');
    const alert = el('div', 'alert');
    alert.setAttribute('role', 'alert');
    alert.hidden = true;
    alert.append(iconNode('alert'), el('span'));
    body.append(alert);

    const footer = el('footer', 'modal__footer');

    form.append(header, body, footer);
    dialog.append(form);

    return { dialog, form, body, footer, alert, closeButton };
}

function showAlert(alert, message) {
    alert.lastElementChild.textContent = message;
    alert.hidden = !message;
}

function makeButton(label, variant, type = 'button') {
    const button = el('button', `btn btn--${variant}`);
    button.type = type;
    const spinner = el('span', 'btn__spinner');
    spinner.hidden = true;
    spinner.setAttribute('aria-hidden', 'true');
    button.append(spinner, el('span', null, label));
    return button;
}

function setBusy(button, busy, busyLabel, idleLabel) {
    button.disabled = busy;
    button.querySelector('.btn__spinner').hidden = !busy;
    button.lastElementChild.textContent = busy ? busyLabel : idleLabel;
}

/**
 * Abre o dialog e controla fechamento. `run` recebe a função `finish(result)`.
 */
function present(shell, run) {
    const { dialog, closeButton } = shell;
    let busy = false;

    return new Promise((resolve) => {
        const finish = (result) => {
            dialog.close();
            dialog.remove();
            resolve(result);
        };

        closeButton.addEventListener('click', () => { if (!busy) finish(false); });

        // Esc: bloqueado enquanto uma requisição está em andamento
        dialog.addEventListener('cancel', (event) => {
            event.preventDefault();
            if (!busy) finish(false);
        });

        // Clique no backdrop (o alvo é o próprio <dialog>)
        dialog.addEventListener('mousedown', (event) => {
            if (event.target === dialog && !busy) finish(false);
        });

        document.body.append(dialog);
        dialog.showModal();

        run({
            finish,
            setBusy: (value) => { busy = value; },
        });
    });
}

/* ---------------------------------------------------------------------------
   Campos
   --------------------------------------------------------------------------- */

function buildField(field, value) {
    const id = `f-${field.name}-${++uid}`;
    const wrapper = el('div', `field${field.full ? ' field--full' : ''}`);
    wrapper.dataset.field = field.name;

    const label = el('label', 'field__label', field.label);
    label.htmlFor = id;
    if (!field.required) label.append(' ', el('span', 'field__optional', '(opcional)'));

    const control = el('div', 'field__control');
    let input;

    if (field.type === 'select') {
        input = el('select', 'field__input field__input--plain field__input--select');
        const placeholder = el('option', null, field.placeholder ?? 'Selecione...');
        placeholder.value = '';
        input.append(placeholder);
        (field.options ?? []).forEach((option) => {
            const node = el('option', null, option.label);
            node.value = String(option.value);
            input.append(node);
        });
        input.value = value !== undefined && value !== null && input.querySelector(`option[value="${CSS.escape(String(value))}"]`)
            ? String(value)
            : '';
    } else {
        input = el('input', 'field__input field__input--plain');
        input.type = field.type ?? 'text';
        input.value = value ?? '';
        if (field.placeholder) input.placeholder = field.placeholder;
        if (field.maxLength) input.maxLength = field.maxLength;
        if (field.autocomplete) input.autocomplete = field.autocomplete;
        if (field.type === 'text' || !field.type) input.spellcheck = false;
    }

    input.id = id;
    input.name = field.name;
    if (field.required) input.required = true;

    const errorId = `${id}-error`;
    input.setAttribute('aria-describedby', errorId);
    control.append(input);

    if (field.type === 'password') {
        input.classList.add('field__input--with-action');
        const toggle = el('button', 'field__action');
        toggle.type = 'button';
        toggle.setAttribute('aria-label', 'Mostrar senha');
        toggle.innerHTML = ICONS.eye;
        toggle.addEventListener('click', () => {
            const visible = input.type === 'text';
            input.type = visible ? 'password' : 'text';
            toggle.innerHTML = visible ? ICONS.eye : ICONS.eyeOff;
            toggle.setAttribute('aria-label', visible ? 'Mostrar senha' : 'Ocultar senha');
            input.focus();
        });
        control.append(toggle);
    }

    const error = el('p', 'field__error');
    error.id = errorId;
    error.dataset.fieldError = '';
    error.hidden = true;

    wrapper.append(label, control);
    if (field.help) wrapper.append(el('p', 'field__help', field.help));
    wrapper.append(error);
    return wrapper;
}

function readValue(form, field) {
    const raw = form.elements[field.name].value;
    const value = field.type === 'password' ? raw : raw.trim();
    if (value === '') return null;
    if (field.valueType === 'number') return Number(value);
    return value;
}

function validateField(field, value) {
    if (field.required && (value === null || value === undefined)) {
        return field.type === 'select' ? 'Selecione uma opção.' : 'Preencha este campo.';
    }
    if (value === null) return null;
    if (field.minLength && String(value).length < field.minLength) {
        return `Informe pelo menos ${field.minLength} caracteres.`;
    }
    if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return 'Informe um e-mail válido.';
    }
    return null;
}

/* ---------------------------------------------------------------------------
   API pública
   --------------------------------------------------------------------------- */

export function openFormModal({
    title, description, iconName, fields, values = {}, submitLabel = 'Salvar',
    busyLabel = 'Salvando...', size = 'md', onSubmit,
}) {
    const shell = createShell({ title, description, size, iconName });
    const { form, body, footer, alert } = shell;

    const grid = el('div', 'form-grid');
    fields.forEach((field) => grid.append(buildField(field, values[field.name])));
    body.append(grid);
    clearErrorOnInput(form);

    const cancel = makeButton('Cancelar', 'secondary');
    const submit = makeButton(submitLabel, 'primary', 'submit');
    footer.append(cancel, submit);

    return present(shell, ({ finish, setBusy: setModalBusy }) => {
        cancel.addEventListener('click', () => finish(false));
        form.querySelector('input, select')?.focus();

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            showAlert(alert, null);
            clearFieldErrors(form);

            const data = {};
            let firstInvalid = null;
            fields.forEach((field) => {
                const value = readValue(form, field);
                data[field.name] = value;
                const message = validateField(field, value);
                if (message) {
                    setFieldError(form, field.name, message);
                    firstInvalid ??= form.elements[field.name];
                }
            });
            if (firstInvalid) {
                firstInvalid.focus();
                return;
            }

            setModalBusy(true);
            setBusy(submit, true, busyLabel, submitLabel);
            cancel.disabled = true;
            try {
                await onSubmit(data);
                finish(true);
            } catch (error) {
                setModalBusy(false);
                setBusy(submit, false, busyLabel, submitLabel);
                cancel.disabled = false;

                // Erros de campo vão para o campo; os que não têm campo no formulário e a
                // mensagem geral (409, regra de negócio) vão para o alerta do topo
                const fieldErrors = Object.entries(error.fields ?? {});
                const unmatched = fieldErrors.filter(([name, message]) => !setFieldError(form, name, message));
                if (unmatched.length) showAlert(alert, unmatched.map(([, text]) => text).join(' '));
                else if (!fieldErrors.length) showAlert(alert, error.message);
                form.querySelector('.is-invalid input, .is-invalid select')?.focus();
            }
        });
    });
}

export function confirmModal({
    title, message, confirmLabel = 'Confirmar', busyLabel = 'Processando...',
    tone = 'primary', iconName, onConfirm,
}) {
    const shell = createShell({ title, size: 'sm', iconName, tone });
    const { form, body, footer, alert } = shell;

    // `message` pode ser texto ou um nó já montado com textContent
    const text = el('p', 'modal__text');
    if (message instanceof Node) text.append(message);
    else text.textContent = message;
    body.append(text);

    const cancel = makeButton('Cancelar', 'secondary');
    const confirm = makeButton(confirmLabel, tone === 'danger' ? 'danger' : 'primary', 'submit');
    footer.append(cancel, confirm);

    return present(shell, ({ finish, setBusy: setModalBusy }) => {
        cancel.addEventListener('click', () => finish(false));
        cancel.focus();

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            showAlert(alert, null);
            setModalBusy(true);
            setBusy(confirm, true, busyLabel, confirmLabel);
            cancel.disabled = true;
            try {
                await onConfirm();
                finish(true);
            } catch (error) {
                setModalBusy(false);
                setBusy(confirm, false, busyLabel, confirmLabel);
                cancel.disabled = false;
                showAlert(alert, error.message);
            }
        });
    });
}
