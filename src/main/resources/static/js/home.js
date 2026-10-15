/* ==========================================================================
   home.js — saudação e data da tela inicial. O usuário vem de shell.js.
   ========================================================================== */

import { currentUser } from './shell.js';

const now = new Date();

document.querySelector('[data-today]').textContent = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
}).format(now);

document.querySelector('[data-greeting]').textContent = greeting(now.getHours());

currentUser.then((user) => {
    const name = user?.name || user?.username || '';
    document.querySelector('[data-user-first-name]').textContent = name.trim().split(/\s+/)[0] || 'bem-vindo';
});

function greeting(hour) {
    if (hour < 5) return 'Boa noite';
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
}
