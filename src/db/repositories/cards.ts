/**
 * SEM DADO DE CARTÃO. Este repositório grava apelido, dias do ciclo e um limite
 * opcional — nada mais. Se um campo novo parecer número, CVV, validade,
 * bandeira ou titular, ele não entra aqui.
 */

import { getDb } from '@/db/client';
import type { Card, CardPurchase, ExpenseCategory } from '@/types/models';
import { newId } from '@/utils/id';
import { clampDay, nowISO, pick, toPositiveCents } from './_shared';

type CardRow = {
  id: string;
  nickname: string;
  closing_day: number;
  due_day: number;
  limit_cents: number | null;
  color_index: number;
  created_at: string;
  archived_at: string | null;
};

type CardPurchaseRow = {
  id: string;
  card_id: string;
  description: string;
  category: string;
  total_cents: number;
  installments: number;
  first_installment_month: string;
  created_at: string;
};

/** O CHECK do schema aceita de 1x a 72x. */
const MAX_INSTALLMENTS = 72;

export type CardInput = Omit<Card, 'id' | 'createdAt' | 'archivedAt'>;
export type CardPatch = Partial<Omit<Card, 'id' | 'createdAt'>>;
export type CardPurchaseInput = Omit<CardPurchase, 'id' | 'createdAt'>;

function mapRow(row: CardRow): Card {
  return {
    id: row.id,
    nickname: row.nickname,
    closingDay: row.closing_day,
    dueDay: row.due_day,
    limitCents: row.limit_cents,
    colorIndex: row.color_index,
    createdAt: row.created_at,
    archivedAt: row.archived_at,
  };
}

function toRow(card: Card): CardRow {
  return {
    id: card.id,
    nickname: card.nickname,
    closing_day: clampDay(card.closingDay),
    due_day: clampDay(card.dueDay),
    limit_cents: card.limitCents === null ? null : toPositiveCents(card.limitCents),
    color_index: Math.max(0, Math.floor(card.colorIndex)),
    created_at: card.createdAt,
    archived_at: card.archivedAt,
  };
}

function mapPurchaseRow(row: CardPurchaseRow): CardPurchase {
  return {
    id: row.id,
    cardId: row.card_id,
    description: row.description,
    category: row.category as ExpenseCategory,
    totalCents: row.total_cents,
    installments: row.installments,
    firstInstallmentMonth: row.first_installment_month,
    createdAt: row.created_at,
  };
}

function clampInstallments(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(MAX_INSTALLMENTS, Math.max(1, Math.floor(value)));
}

async function findById(id: string): Promise<Card | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<CardRow>('SELECT * FROM cards WHERE id = ?;', [id]);
  return row ? mapRow(row) : null;
}

async function list(opts?: { includeArchived?: boolean }): Promise<Card[]> {
  const db = await getDb();
  const rows = opts?.includeArchived
    ? await db.getAllAsync<CardRow>(
        'SELECT * FROM cards ORDER BY archived_at IS NOT NULL, created_at ASC;',
      )
    : await db.getAllAsync<CardRow>(
        'SELECT * FROM cards WHERE archived_at IS NULL ORDER BY created_at ASC;',
      );
  return rows.map(mapRow);
}

async function create(input: CardInput): Promise<Card> {
  const db = await getDb();
  const card: Card = {
    id: newId(),
    nickname: input.nickname,
    closingDay: clampDay(input.closingDay),
    dueDay: clampDay(input.dueDay),
    limitCents: input.limitCents === null ? null : toPositiveCents(input.limitCents),
    colorIndex: Math.max(0, Math.floor(input.colorIndex)),
    createdAt: nowISO(),
    archivedAt: null,
  };

  const row = toRow(card);
  await db.runAsync(
    `INSERT INTO cards
       (id, nickname, closing_day, due_day, limit_cents, color_index, created_at, archived_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      row.id,
      row.nickname,
      row.closing_day,
      row.due_day,
      row.limit_cents,
      row.color_index,
      row.created_at,
      row.archived_at,
    ],
  );

  return card;
}

async function update(id: string, patch: CardPatch): Promise<void> {
  const db = await getDb();
  const current = await findById(id);
  if (!current) {
    throw new Error(`Cartão não encontrado: ${id}`);
  }

  const next: Card = {
    ...current,
    nickname: pick(patch.nickname, current.nickname),
    closingDay: clampDay(pick(patch.closingDay, current.closingDay)),
    dueDay: clampDay(pick(patch.dueDay, current.dueDay)),
    limitCents: pick(patch.limitCents, current.limitCents),
    colorIndex: pick(patch.colorIndex, current.colorIndex),
    archivedAt: pick(patch.archivedAt, current.archivedAt),
  };

  const row = toRow(next);
  await db.runAsync(
    `UPDATE cards SET
       nickname = ?, closing_day = ?, due_day = ?, limit_cents = ?,
       color_index = ?, archived_at = ?
     WHERE id = ?;`,
    [
      row.nickname,
      row.closing_day,
      row.due_day,
      row.limit_cents,
      row.color_index,
      row.archived_at,
      row.id,
    ],
  );
}

/** Arquivar mantém as compras: as parcelas continuam caindo mesmo sem o cartão na lista. */
async function archive(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE cards SET archived_at = ? WHERE id = ? AND archived_at IS NULL;', [
    nowISO(),
    id,
  ]);
}

/** Apagar leva junto as compras (ON DELETE CASCADE). Para preservá-las, use `archive`. */
async function remove(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM cards WHERE id = ?;', [id]);
}

async function listPurchases(): Promise<CardPurchase[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<CardPurchaseRow>(
    'SELECT * FROM card_purchases ORDER BY first_installment_month DESC, created_at DESC;',
  );
  return rows.map(mapPurchaseRow);
}

async function listPurchasesByCard(cardId: string): Promise<CardPurchase[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<CardPurchaseRow>(
    'SELECT * FROM card_purchases WHERE card_id = ? ORDER BY first_installment_month DESC, created_at DESC;',
    [cardId],
  );
  return rows.map(mapPurchaseRow);
}

/**
 * `totalCents` é o valor CHEIO da compra, nunca o da parcela. A divisão em
 * parcelas é derivada na hora do cálculo (splitInstallments), para a soma das
 * parcelas bater com o total ao centavo.
 */
async function createPurchase(input: CardPurchaseInput): Promise<CardPurchase> {
  const db = await getDb();
  const purchase: CardPurchase = {
    id: newId(),
    cardId: input.cardId,
    description: input.description,
    category: input.category,
    totalCents: toPositiveCents(input.totalCents),
    installments: clampInstallments(input.installments),
    firstInstallmentMonth: input.firstInstallmentMonth,
    createdAt: nowISO(),
  };

  await db.runAsync(
    `INSERT INTO card_purchases
       (id, card_id, description, category, total_cents, installments, first_installment_month, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      purchase.id,
      purchase.cardId,
      purchase.description,
      purchase.category,
      purchase.totalCents,
      purchase.installments,
      purchase.firstInstallmentMonth,
      purchase.createdAt,
    ],
  );

  return purchase;
}

async function removePurchase(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM card_purchases WHERE id = ?;', [id]);
}

export const cardsRepo = {
  list,
  create,
  update,
  archive,
  remove,
  listPurchases,
  listPurchasesByCard,
  createPurchase,
  removePurchase,
};
