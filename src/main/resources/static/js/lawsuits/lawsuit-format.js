/* ==========================================================================
   lawsuit-format.js — máscaras e regras dos processos jurídicos, para a tela
   de controle e o futuro registro: número no padrão CNJ, valor em reais e a
   leitura da probabilidade de perda. A aplicação no campo (applyMask) fica em ui.js.
   ========================================================================== */

import { onlyDigits } from '../nips/nip-format.js';
import { normalize } from '../ui.js';

export { onlyDigits };

export const CASE_NUMBER_DIGITS = 20;

// "00012345620248260100" -> "0001234-56.2024.8.26.0100" (NNNNNNN-DD.AAAA.J.TR.OOOO; aceita parcial enquanto digita)
export function formatCaseNumber(value) {
    const digits = onlyDigits(value).slice(0, CASE_NUMBER_DIGITS);
    const parts = [digits.slice(0, 7), digits.slice(7, 9), digits.slice(9, 13), digits.slice(13, 14), digits.slice(14, 16), digits.slice(16, 20)];
    const separators = ['-', '.', '.', '.', '.'];
    return parts.reduce((text, part, index) => (part ? text + (index ? separators[index - 1] : '') + part : text), '');
}

// Ordena pelo ano do processo e depois pelo número sequencial
export function caseNumberKey(value) {
    const digits = onlyDigits(value);
    return digits.slice(9, 13) + digits.slice(0, 7);
}

const MAX_MONEY_DIGITS = 15; // NUMERIC(15, 2): 13 inteiros + 2 decimais
const moneyInputFormat = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Máscara de moeda por centavos: cada dígito digitado entra pela direita ("5" -> "0,05", "1500000" -> "15.000,00").
// Também aceita o número vindo da API (15000.5 -> "15.000,50")
export function formatMoneyInput(value) {
    if (value === null || value === undefined || value === '') return '';
    if (typeof value === 'number') return Number.isFinite(value) ? moneyInputFormat.format(value) : '';
    const digits = onlyDigits(value).replace(/^0+(?=\d)/, '').slice(0, MAX_MONEY_DIGITS);
    return digits ? moneyInputFormat.format(Number(digits) / 100) : '';
}

// "15.000,50" -> 15000.5 (null se vazio)
export function parseMoneyInput(text) {
    const digits = onlyDigits(text);
    return digits ? Number(digits) / 100 : null;
}

// BigDecimal chega como número (ou texto, conforme a serialização)
export const toAmount = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
};

// Probabilidade de perda: "Provável" pede atenção; "Remota" é o cenário favorável
export function riskTone(name) {
    const text = normalize(name).trim();
    if (text.startsWith('provav')) return 'probable';
    if (text.startsWith('remot')) return 'remote';
    return 'neutral';
}

export const isProbable = (row) => riskTone(row.lossProbabilityName) === 'probable';

// 1 -> "1º"
export const ordinal = (n) => `${n}º`;
