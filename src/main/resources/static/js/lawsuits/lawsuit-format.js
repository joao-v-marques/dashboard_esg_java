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

const MAX_MONEY_INTEGER_DIGITS = 13; // NUMERIC(15, 2): 13 inteiros + 2 decimais
const moneyInputFormat = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Separa o texto digitado em parte inteira e centavos: a vírgula abre os centavos e os pontos
// são de milhar (somem e voltam reagrupados), como no padrão brasileiro
function splitMoney(text) {
    const clean = String(text).replace(/[^\d,]/g, '');
    const comma = clean.indexOf(',');
    const integer = (comma === -1 ? clean : clean.slice(0, comma)).replace(/^0+(?=\d)/, '').slice(0, MAX_MONEY_INTEGER_DIGITS);
    const cents = comma === -1 ? null : clean.slice(comma + 1).replace(/,/g, '').slice(0, 2);
    return { integer, cents };
}

// Máscara de moeda enquanto digita: os dígitos entram como reais, com ponto de milhar
// ("1500" -> "1.500"); a vírgula abre os centavos ("1500,5" -> "1.500,5").
// Também aceita o número vindo da API (15000.5 -> "15.000,50")
export function formatMoneyInput(value) {
    if (value === null || value === undefined || value === '') return '';
    if (typeof value === 'number') return Number.isFinite(value) ? moneyInputFormat.format(value) : '';
    const { integer, cents } = splitMoney(value);
    const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    if (cents === null) return grouped;
    return `${grouped || '0'},${cents}`;
}

// Ao sair do campo: completa os centavos ("1.500" -> "1.500,00", "1.500,5" -> "1.500,50")
export function finalizeMoneyInput(text) {
    const value = parseMoneyInput(text);
    return value === null ? '' : moneyInputFormat.format(value);
}

// "15.000,50" -> 15000.5 (null se vazio)
export function parseMoneyInput(text) {
    const { integer, cents } = splitMoney(text ?? '');
    if (!integer && !cents) return null;
    return Number(`${integer || '0'}.${(cents ?? '').padEnd(2, '0')}`);
}

// Configuração completa do campo de moeda (máscara, teclado com vírgula e acabamento no blur)
export const MONEY_MASK = {
    format: formatMoneyInput,
    parse: parseMoneyInput,
    finalize: finalizeMoneyInput,
    inputMode: 'decimal',
};

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
