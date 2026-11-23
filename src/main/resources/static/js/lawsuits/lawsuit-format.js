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

// Dígito verificador (DD) do número CNJ: módulo 97 (ISO 7064), Res. CNJ 65/2008.
// Reordenado como NNNNNNN AAAA J TR OOOO DD, o número completo dá resto 1 na divisão por 97
export function isValidCaseNumber(value) {
    const digits = onlyDigits(value);
    if (digits.length !== CASE_NUMBER_DIGITS) return false;
    const reordered = digits.slice(0, 7) + digits.slice(9) + digits.slice(7, 9);
    return BigInt(reordered) % 97n === 1n;
}

// Códigos TR dos tribunais estaduais/eleitorais, na ordem do CNJ
const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SE', 'SP', 'TO'];

const SEGMENTS = {
    1: 'Supremo Tribunal Federal',
    2: 'Conselho Nacional de Justiça',
    3: 'Superior Tribunal de Justiça',
    4: 'Justiça Federal',
    5: 'Justiça do Trabalho',
    6: 'Justiça Eleitoral',
    7: 'Justiça Militar da União',
    8: 'Justiça Estadual',
    9: 'Justiça Militar Estadual',
};

function tribunalName(segment, code) {
    const number = Number(code);
    const uf = UFS[number - 1];
    if (segment === '8' && uf) return uf === 'DF' ? 'TJDFT' : `TJ${uf}`;
    if (segment === '6' && uf) return `TRE-${uf}`;
    if (segment === '9' && uf) return `TJM-${uf}`;
    if (segment === '4' && number) return `TRF da ${number}ª Região`;
    if (segment === '5') return number ? `TRT da ${number}ª Região` : 'TST';
    return `Tribunal ${code}`;
}

// Lê o número CNJ conforme é digitado: cada parte aparece quando estiver completa (null antes disso)
export function describeCaseNumber(value) {
    const digits = onlyDigits(value).slice(0, CASE_NUMBER_DIGITS);
    const year = digits.length >= 13 ? digits.slice(9, 13) : null;
    const segment = digits.length >= 14 ? digits[13] : null;
    const tribunal = digits.length >= 16 ? digits.slice(14, 16) : null;
    const origin = digits.length === CASE_NUMBER_DIGITS ? digits.slice(16, 20) : null;
    return [
        { key: 'year', label: 'Ano', value: year },
        { key: 'segment', label: 'Justiça', value: segment && (SEGMENTS[segment] ?? `Segmento ${segment}`) },
        { key: 'tribunal', label: 'Tribunal', value: segment && tribunal && tribunalName(segment, tribunal) },
        { key: 'origin', label: 'Origem', value: origin && (origin === '0000' ? 'No próprio tribunal' : `Unidade ${origin}`) },
    ];
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

// Apoio à escolha da probabilidade de perda (critério contábil usual para contingências)
export const RISK_HINTS = {
    probable: 'A perda é mais provável do que não. O valor em causa costuma ser provisionado.',
    remote: 'A chance de perda é pequena. Não exige provisão nem divulgação.',
    neutral: null,
};

// 1 -> "1º"
export const ordinal = (n) => `${n}º`;
