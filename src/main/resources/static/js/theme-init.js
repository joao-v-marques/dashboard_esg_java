/* ==========================================================================
   theme-init.js — script clássico carregado no <head>, antes dos CSS, para
   aplicar o tema salvo (ou o do sistema) sem "piscar" o tema claro.
   A troca em tempo de execução fica em js/theme.js.
   ========================================================================== */

(function () {
    var theme = null;
    try { theme = localStorage.getItem('esg-theme'); } catch (e) { /* storage indisponível */ }
    if (theme !== 'light' && theme !== 'dark') {
        theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.dataset.theme = theme;
})();
