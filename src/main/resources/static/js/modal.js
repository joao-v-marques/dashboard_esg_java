/* ==========================================================================
   modal.js — modais com <dialog> nativo (foco preso, Esc fecha, backdrop).

   - openFormModal: formulário de cadastro/edição montado a partir de `fields`.
     onSubmit(data) é assíncrono; se lançar um ApiError, os `fields` do erro
     vão para baixo de cada campo e a `message` para o alerta do topo, e o
     modal continua aberto. Resolve true quando salvou, false se cancelou.
   - confirmModal: confirmação de uma ação (ex.: desativar), mesmo contrato.
   - detailModal: leitura de um registro em seções de rótulo/valor, com uma
     ação opcional no rodapé (ex.: "Editar"). Resolve com o id da ação
     escolhida ou false se fechou.

   Campos do formulário aceitam, além do básico: `mask: { format, parse }`
   (máscara de dígitos; o valor lido é parse(texto)), `validate(value)`
   (regra extra, devolve a mensagem ou null), `counter` em textarea com
   maxLength e, em select, grupos `{ group, options }` (viram <optgroup>).

   Todo texto vindo da API entra via textContent, nunca innerHTML.
   ========================================================================== */

import { ICONS } from './icons.js';
import { setFieldError, clearFieldErrors, clearErrorOnInput, applyMask } from './ui.js';

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

// Trava a rolagem da página enquanto houver modal aberto (contador para modais empilhados)
let openModals = 0;

function lockScroll() {
    if (openModals++ === 0) document.documentElement.classList.add('is-modal-open');
}

function unlockScroll() {
    if (--openModals === 0) document.documentElement.classList.remove('is-modal-open');
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
            unlockScroll();
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
        lockScroll();
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
    const wrapper = el('div', `field${field.full ? ' field--full' : ''}${field.span ? ` field--span-${field.span}` : ''}`);
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
        const optionNode = (option) => {
            const node = el('option', null, option.label);
            node.value = String(option.value);
            return node;
        };
        (field.options ?? []).forEach((option) => {
            if (!option.group) {
                input.append(optionNode(option));
                return;
            }
            const group = el('optgroup');
            group.label = option.group;
            option.options.forEach((child) => group.append(optionNode(child)));
            input.append(group);
        });
        input.value = value !== undefined && value !== null && input.querySelector(`option[value="${CSS.escape(String(value))}"]`)
            ? String(value)
            : '';
    } else if (field.type === 'textarea') {
        input = el('textarea', 'field__input field__input--plain field__input--textarea');
        input.value = value ?? '';
        input.rows = field.rows ?? 3;
        if (field.placeholder) input.placeholder = field.placeholder;
        if (field.maxLength) input.maxLength = field.maxLength;
    } else {
        input = el('input', 'field__input field__input--plain');
        input.type = field.type ?? 'text';
        input.value = field.mask && value ? field.mask.format(value) : (value ?? '');
        if (field.mask) {
            input.inputMode = 'numeric';
            input.addEventListener('input', () => applyMask(input, field.mask.format));
        }
        if (field.placeholder) input.placeholder = field.placeholder;
        if (field.maxLength) input.maxLength = field.maxLength;
        if (field.autocomplete) input.autocomplete = field.autocomplete;
        if (field.type === 'text' || !field.type) input.spellcheck = false;
        // number/date: limites nativos (o teclado numérico e o seletor de data respeitam)
        if (field.min !== undefined) input.min = String(field.min);
        if (field.max !== undefined) input.max = String(field.max);
        if (field.step !== undefined) input.step = String(field.step);
        if (field.type === 'number') input.inputMode = 'decimal';
    }

    input.id = id;
    input.name = field.name;
    if (field.required) input.required = true;

    const errorId = `${id}-error`;
    input.setAttribute('aria-describedby', errorId);
    control.append(input);

    // Unidade fixa à direita do campo (ex.: "kg")
    if (field.suffix) {
        input.classList.add('field__input--with-suffix');
        const suffix = el('span', 'field__suffix', field.suffix);
        suffix.setAttribute('aria-hidden', 'true');
        control.append(suffix);
    }

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

    // Contador "x / máx." alinhado à direita do rótulo
    let head = label;
    if (field.counter && field.maxLength) {
        head = el('div', 'field__label-row');
        const counter = el('span', 'field__counter');
        counter.setAttribute('aria-hidden', 'true');
        const update = () => {
            const length = input.value.length;
            counter.textContent = `${length.toLocaleString('pt-BR')} / ${field.maxLength.toLocaleString('pt-BR')}`;
            counter.classList.toggle('is-near', length >= field.maxLength * 0.9);
        };
        input.addEventListener('input', update);
        update();
        head.append(label, counter);
    }

    wrapper.append(head, control);
    if (field.help) wrapper.append(el('p', 'field__help', field.help));
    wrapper.append(error);
    return wrapper;
}

function readValue(form, field) {
    const raw = form.elements[field.name].value;
    if (field.mask) return field.mask.parse(raw) || null;
    const value = field.type === 'password' ? raw : raw.trim();
    if (value === '') {
        // Um number com texto inválido chega vazio em .value: marca para a validação não tratar como "não preenchido"
        return field.type === 'number' && form.elements[field.name].validity.badInput ? NaN : null;
    }
    if (field.valueType === 'number' || field.type === 'number') return Number(value);
    return value;
}

function validateField(field, value) {
    if (field.required && (value === null || value === undefined)) {
        return field.type === 'select' ? 'Selecione uma opção.' : 'Preencha este campo.';
    }
    if (value === null) return null;
    if (field.type === 'number') {
        if (Number.isNaN(value)) return 'Informe um número válido.';
        if (field.min !== undefined && value < field.min) return `Informe um valor maior ou igual a ${field.min}.`;
        if (field.max !== undefined && value > field.max) return `Informe um valor menor ou igual a ${field.max}.`;
    }
    // Datas ISO (aaaa-mm-dd) comparam corretamente como texto
    if (field.type === 'date') {
        if (field.max && value > field.max) return field.maxMessage ?? 'Informe uma data até hoje.';
        if (field.min && value < field.min) return 'Informe uma data válida.';
    }
    if (field.minLength && String(value).length < field.minLength) {
        return `Informe pelo menos ${field.minLength} caracteres.`;
    }
    if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return 'Informe um e-mail válido.';
    }
    return field.validate?.(value) ?? null;
}

/* ---------------------------------------------------------------------------
   API pública
   --------------------------------------------------------------------------- */

export function openFormModal({
    title, description, iconName, fields, values = {}, submitLabel = 'Salvar',
    busyLabel = 'Salvando...', size = 'md', columns = 2, onSubmit,
}) {
    const shell = createShell({ title, description, size, iconName });
    const { form, body, footer, alert } = shell;

    // columns: 4 para modais largos (xl); cada campo ocupa `span` colunas
    const grid = el('div', `form-grid${columns === 4 ? ' form-grid--4' : ''}`);
    fields.forEach((field) => grid.append(buildField(field, values[field.name])));
    body.append(grid);
    clearErrorOnInput(form);

    const cancel = makeButton('Cancelar', 'secondary');
    const submit = makeButton(submitLabel, 'primary', 'submit');
    footer.append(cancel, submit);

    return present(shell, ({ finish, setBusy: setModalBusy }) => {
        cancel.addEventListener('click', () => finish(false));
        form.querySelector('input, select, textarea')?.focus();

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
                form.querySelector('.is-invalid input, .is-invalid select, .is-invalid textarea')?.focus();
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

/**
 * sections: [{ title, full, columns, items: [{ label, value (texto ou nó), note, full, mono, long }] }]
 *   No modal xl as seções ficam em duas colunas; `full` ocupa a linha inteira e
 *   `columns` (2 a 4) define quantos pares rótulo/valor cabem lado a lado.
 * actions:  [{ id, label, icon, variant }] — botões do rodapé ao lado de "Fechar"
 */
export function detailModal({
    title, description, iconName, size = 'lg', sections = [], actions = [], emptyText = 'Não informado',
}) {
    const shell = createShell({ title, description, size, iconName });
    const { form, body, footer } = shell;
    body.classList.add('modal__body--sections');

    sections.forEach((section) => {
        const box = el('section', `detail-section${section.full ? ' detail-section--full' : ''}`);
        if (section.title) box.append(el('h3', 'detail-section__title', section.title));
        const list = el('dl', `detail-list${section.columns ? ` detail-list--${section.columns}` : ''}`);
        section.items.forEach((item) => {
            const row = el('div', item.full ? 'is-full' : '');
            const dd = el('dd');
            const empty = item.value === null || item.value === undefined || item.value === '';
            if (empty) dd.textContent = emptyText;
            else if (item.value instanceof Node) dd.append(item.value);
            else dd.textContent = item.value;
            dd.classList.toggle('is-empty', empty);
            dd.classList.toggle('is-mono', Boolean(item.mono));
            dd.classList.toggle('is-long', Boolean(item.long));
            if (item.note && !empty) dd.append(el('span', 'detail-list__note', item.note));
            row.append(el('dt', null, item.label), dd);
            list.append(row);
        });
        box.append(list);
        body.append(box);
    });

    const close = makeButton('Fechar', 'secondary');
    footer.append(close);
    const buttons = actions.map((action) => {
        const button = makeButton(action.label, action.variant ?? 'primary');
        if (action.icon) button.querySelector('.btn__spinner').after(iconNode(action.icon));
        footer.append(button);
        return [action, button];
    });

    return present(shell, ({ finish }) => {
        close.addEventListener('click', () => finish(false));
        buttons.forEach(([action, button]) => button.addEventListener('click', () => finish(action.id)));
        form.addEventListener('submit', (event) => event.preventDefault());
        close.focus();
    });
}
