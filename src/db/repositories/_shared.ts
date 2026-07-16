/**
 * Helpers internos da camada de repositórios. Não são re-exportados pelo
 * index.ts — o resto do app fala com os repos, nunca com isto aqui.
 */

import type { Cents, Timestamp } from '@/types/models';

/** Agora, no formato que todas as colunas `*_at` usam. */
export function nowISO(): Timestamp {
  return new Date().toISOString();
}

export function boolToInt(value: boolean): 0 | 1 {
  return value ? 1 : 0;
}

export function intToBool(value: number): boolean {
  return value === 1;
}

/**
 * Dinheiro entra no banco como inteiro, sempre. A coluna é INTEGER, mas o
 * SQLite é fracamente tipado e guardaria 10.5 sem reclamar — é assim que nasce
 * o centavo fantasma que reaparece três telas depois.
 */
export function toCents(value: Cents): number {
  return Math.round(value);
}

/** Dinheiro que o schema exige não-negativo (valor de despesa, limite, compra). */
export function toPositiveCents(value: Cents): number {
  return Math.max(0, Math.round(value));
}

/**
 * Dia do mês dentro de 1–31, que é o CHECK do schema. Clampar em vez de
 * estourar: dia 0 vira 1, dia 45 vira 31. O encaixe em mês curto (cobrança
 * dia 31 em fevereiro) é da camada de cálculo, via `clampDayToMonth`.
 */
export function clampDay(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(31, Math.max(1, Math.floor(value)));
}

export function clampDayOrNull(value: number | null | undefined): number | null {
  return value === null || value === undefined ? null : clampDay(value);
}

/**
 * Semântica de patch: `undefined` = "não mexe nesse campo",
 * `null` = "apaga esse campo". Sem isso, um patch parcial apagaria tudo que
 * não veio junto.
 */
export function pick<T>(value: T | undefined, current: T): T {
  return value === undefined ? current : value;
}
