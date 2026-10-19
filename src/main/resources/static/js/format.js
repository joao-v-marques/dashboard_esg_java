/* ==========================================================================
   format.js — datas (ISO aaaa-mm-dd, sem fuso) e números em pt-BR,
   compartilhados pelas telas de resíduos e pelo dashboard.
   ========================================================================== */

export const kgFormat = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
// Percentuais sempre com 2 casas (0,88%); pesos com a precisão do lançamento (3 casas)
export const percentFormat = new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const intFormat = new Intl.NumberFormat('pt-BR');
export const dateTimeFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

const weekdayFormat = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'UTC' });
const monthFormat = new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' });
const monthLongFormat = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });

const pad = (n) => String(n).padStart(2, '0');

export function toIso(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayIso() {
    return toIso(new Date());
}

// "2026-10-19" -> Date local à meia-noite (sem o deslocamento de fuso de new Date("aaaa-mm-dd"))
export function fromIso(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
}

// "2026-10-19" -> "19/10/2026"
export function formatDay(iso) {
    if (!iso) return '-';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
}

// "2026-10-19" -> "19/10"
export function formatDayShort(iso) {
    if (!iso) return '-';
    const [, m, d] = iso.split('-');
    return `${d}/${m}`;
}

export function weekday(iso) {
    return iso ? weekdayFormat.format(new Date(`${iso}T00:00:00Z`)).replace('.', '') : '';
}

// "2026-10" -> "out" / "outubro de 2026"
export function monthLabel(key, { long = false } = {}) {
    const date = new Date(`${key}-01T00:00:00Z`);
    return long ? monthLongFormat.format(date) : monthFormat.format(date).replace('.', '');
}

// Peso sempre em kg, sem arredondar para toneladas
export function weightParts(kg) {
    return { value: kgFormat.format(kg), unit: 'kg' };
}

export function formatWeight(kg) {
    const { value, unit } = weightParts(kg);
    return `${value} ${unit}`;
}
