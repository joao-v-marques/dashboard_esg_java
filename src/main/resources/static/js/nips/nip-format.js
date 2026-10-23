/* ==========================================================================
   nip-format.js — máscaras e validações das NIP's, compartilhadas entre o
   registro e a tela de controle (número 000000/0000 e CPF 000.000.000-00).
   A aplicação da máscara no campo (applyMask) fica em ui.js.
   ========================================================================== */

export function onlyDigits(value) {
    return String(value ?? '').replace(/\D/g, '');
}

// "0012342026" -> "001234/2026" (aceita parcial enquanto digita)
export function formatNipNumber(value) {
    return onlyDigits(value).slice(0, 10).replace(/^(\d{6})(\d)/, '$1/$2');
}

// "12345678901" -> "123.456.789-01" (aceita parcial enquanto digita)
export function formatCpf(value) {
    return onlyDigits(value).slice(0, 11)
        .replace(/^(\d{3})(\d)/, '$1.$2')
        .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

// "12345678901" -> "***.456.789-**": na listagem o CPF completo só aparece no detalhe
export function maskCpf(value) {
    const digits = onlyDigits(value);
    if (digits.length !== 11) return formatCpf(digits);
    return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`;
}

export function isValidCpf(digits) {
    if (!/^\d{11}$/.test(digits) || /^(\d)\1{10}$/.test(digits)) return false;
    for (const length of [9, 10]) {
        let sum = 0;
        for (let i = 0; i < length; i++) sum += Number(digits[i]) * (length + 1 - i);
        if ((sum * 10) % 11 % 10 !== Number(digits[length])) return false;
    }
    return true;
}

// Status cujo nome começa com "Finalizada" encerram a NIP; os demais estão em andamento
export function isFinished(status) {
    return String(status?.name ?? '').trim().toLowerCase().startsWith('finalizada');
}
