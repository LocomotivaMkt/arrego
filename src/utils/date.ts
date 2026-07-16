import type { ISODate, MonthKey } from '@/types/models';

const MONTHS_PT = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
] as const;

const MONTHS_PT_SHORT = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
] as const;

/**
 * Datas neste app são strings 'YYYY-MM-DD' tratadas como data LOCAL, sem fuso.
 * `new Date('2026-07-01')` é interpretado como UTC pelo JS e, no Brasil
 * (UTC−3), volta como 30/06 às 21h — o mês inteiro sai errado por um dia.
 * Por isso todo parse aqui é manual. Nunca use `new Date(isoString)` direto.
 */
export function parseISODate(iso: ISODate): Date {
  const [year, month, day] = iso.split('-').map((part) => Number.parseInt(part, 10));
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

export function toISODate(date: Date): ISODate {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayISO(): ISODate {
  return toISODate(new Date());
}

/** 'YYYY-MM' do mês corrente. */
export function currentMonthKey(): MonthKey {
  return monthKeyOf(new Date());
}

export function monthKeyOf(date: Date): MonthKey {
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}`;
}

export function monthKeyFromISO(iso: ISODate): MonthKey {
  return iso.slice(0, 7);
}

export function parseMonthKey(key: MonthKey): { year: number; month: number } {
  const [year, month] = key.split('-').map((part) => Number.parseInt(part, 10));
  return { year: year ?? 1970, month: month ?? 1 };
}

/** Soma (ou subtrai) meses a uma chave 'YYYY-MM'. */
export function addMonths(key: MonthKey, delta: number): MonthKey {
  const { year, month } = parseMonthKey(key);
  const zeroBased = month - 1 + delta;
  const newYear = year + Math.floor(zeroBased / 12);
  const newMonth = ((zeroBased % 12) + 12) % 12;
  return `${newYear}-${`${newMonth + 1}`.padStart(2, '0')}`;
}

/** Quantos meses de `from` até `to`. Negativo se `to` for anterior. */
export function monthsBetween(from: MonthKey, to: MonthKey): number {
  const a = parseMonthKey(from);
  const b = parseMonthKey(to);
  return (b.year - a.year) * 12 + (b.month - a.month);
}

export function daysInMonth(key: MonthKey): number {
  const { year, month } = parseMonthKey(key);
  return new Date(year, month, 0).getDate();
}

/**
 * Encaixa um dia do mês em um mês que talvez não o tenha.
 * Assinatura que cobra dia 31 cobra dia 28 em fevereiro — sem isso, o app
 * simplesmente perderia a cobrança de fevereiro, abril, junho, setembro e
 * novembro. É um bug clássico e silencioso de app financeiro.
 */
export function clampDayToMonth(day: number, key: MonthKey): number {
  const max = daysInMonth(key);
  return Math.min(Math.max(1, Math.floor(day)), max);
}

/** Data ISO de um dia dentro de um mês, já encaixado. */
export function dateInMonth(day: number, key: MonthKey): ISODate {
  const { year, month } = parseMonthKey(key);
  const safeDay = clampDayToMonth(day, key);
  return `${year}-${`${month}`.padStart(2, '0')}-${`${safeDay}`.padStart(2, '0')}`;
}

/** 'julho de 2026' */
export function formatMonthLong(key: MonthKey): string {
  const { year, month } = parseMonthKey(key);
  return `${MONTHS_PT[month - 1] ?? '?'} de ${year}`;
}

/** 'jul/26' */
export function formatMonthShort(key: MonthKey): string {
  const { year, month } = parseMonthKey(key);
  return `${MONTHS_PT_SHORT[month - 1] ?? '?'}/${`${year}`.slice(2)}`;
}

/** '14 de julho' */
export function formatDayMonth(iso: ISODate): string {
  const date = parseISODate(iso);
  return `${date.getDate()} de ${MONTHS_PT[date.getMonth()] ?? '?'}`;
}

/**
 * Traduz meses em linguagem de gente. O público do app não pensa em
 * "87 meses" — pensa em "7 anos e 3 meses".
 */
export function humanizeMonths(months: number): string {
  const total = Math.max(0, Math.round(months));
  if (total === 0) return 'menos de um mês';
  if (total === 1) return '1 mês';
  if (total < 12) return `${total} meses`;

  const years = Math.floor(total / 12);
  const rest = total % 12;
  const yearPart = years === 1 ? '1 ano' : `${years} anos`;
  if (rest === 0) return yearPart;
  const monthPart = rest === 1 ? '1 mês' : `${rest} meses`;
  return `${yearPart} e ${monthPart}`;
}

/** Dias até uma data. Negativo = já passou. */
export function daysUntil(iso: ISODate): number {
  const target = parseISODate(iso);
  const today = new Date();
  target.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}
