import { getDb } from '@/db/client';
import type { Subscription, SubscriptionCategory } from '@/types/models';
import { newId } from '@/utils/id';
import { clampDay, nowISO, pick, toPositiveCents } from './_shared';

type SubscriptionRow = {
  id: string;
  label: string;
  category: string;
  amount_cents: number;
  billing_day: number;
  cycle: string;
  share_count: number | null;
  created_at: string;
  cancelled_at: string | null;
};

export type SubscriptionInput = Omit<Subscription, 'id' | 'createdAt' | 'cancelledAt'>;
export type SubscriptionPatch = Partial<Omit<Subscription, 'id' | 'createdAt'>>;

function mapRow(row: SubscriptionRow): Subscription {
  return {
    id: row.id,
    label: row.label,
    category: row.category as SubscriptionCategory,
    amountCents: row.amount_cents,
    billingDay: row.billing_day,
    cycle: row.cycle === 'yearly' ? 'yearly' : 'monthly',
    shareCount: row.share_count,
    createdAt: row.created_at,
    cancelledAt: row.cancelled_at,
  };
}

/** O schema aceita `share_count` nulo ou >= 1. Rachar com "0 pessoas" não existe. */
function normalizeShare(value: number | null): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  const count = Math.floor(value);
  return count >= 1 ? count : null;
}

function toRow(subscription: Subscription): SubscriptionRow {
  return {
    id: subscription.id,
    label: subscription.label,
    category: subscription.category,
    amount_cents: toPositiveCents(subscription.amountCents),
    billing_day: clampDay(subscription.billingDay),
    cycle: subscription.cycle,
    share_count: normalizeShare(subscription.shareCount),
    created_at: subscription.createdAt,
    cancelled_at: subscription.cancelledAt,
  };
}

async function findById(id: string): Promise<Subscription | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<SubscriptionRow>('SELECT * FROM subscriptions WHERE id = ?;', [
    id,
  ]);
  return row ? mapRow(row) : null;
}

async function list(opts?: { includeCancelled?: boolean }): Promise<Subscription[]> {
  const db = await getDb();
  const rows = opts?.includeCancelled
    ? await db.getAllAsync<SubscriptionRow>(
        'SELECT * FROM subscriptions ORDER BY cancelled_at IS NOT NULL, amount_cents DESC, created_at DESC;',
      )
    : await db.getAllAsync<SubscriptionRow>(
        'SELECT * FROM subscriptions WHERE cancelled_at IS NULL ORDER BY amount_cents DESC, created_at DESC;',
      );
  return rows.map(mapRow);
}

async function create(input: SubscriptionInput): Promise<Subscription> {
  const db = await getDb();
  const subscription: Subscription = {
    id: newId(),
    label: input.label,
    category: input.category,
    amountCents: toPositiveCents(input.amountCents),
    billingDay: clampDay(input.billingDay),
    cycle: input.cycle,
    shareCount: normalizeShare(input.shareCount),
    createdAt: nowISO(),
    cancelledAt: null,
  };

  const row = toRow(subscription);
  await db.runAsync(
    `INSERT INTO subscriptions
       (id, label, category, amount_cents, billing_day, cycle, share_count, created_at, cancelled_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      row.id,
      row.label,
      row.category,
      row.amount_cents,
      row.billing_day,
      row.cycle,
      row.share_count,
      row.created_at,
      row.cancelled_at,
    ],
  );

  return subscription;
}

async function update(id: string, patch: SubscriptionPatch): Promise<void> {
  const db = await getDb();
  const current = await findById(id);
  if (!current) {
    throw new Error(`Assinatura não encontrada: ${id}`);
  }

  const next: Subscription = {
    ...current,
    label: pick(patch.label, current.label),
    category: pick(patch.category, current.category),
    amountCents: toPositiveCents(pick(patch.amountCents, current.amountCents)),
    billingDay: clampDay(pick(patch.billingDay, current.billingDay)),
    cycle: pick(patch.cycle, current.cycle),
    shareCount: normalizeShare(pick(patch.shareCount, current.shareCount)),
    cancelledAt: pick(patch.cancelledAt, current.cancelledAt),
  };

  const row = toRow(next);
  await db.runAsync(
    `UPDATE subscriptions SET
       label = ?, category = ?, amount_cents = ?, billing_day = ?,
       cycle = ?, share_count = ?, cancelled_at = ?
     WHERE id = ?;`,
    [
      row.label,
      row.category,
      row.amount_cents,
      row.billing_day,
      row.cycle,
      row.share_count,
      row.cancelled_at,
      row.id,
    ],
  );
}

/**
 * Cancelar não apaga: a assinatura cancelada é a prova de que a pessoa cortou
 * o gasto, e o app precisa dela para dizer "isso aqui você já resolveu".
 */
async function cancel(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE subscriptions SET cancelled_at = ? WHERE id = ? AND cancelled_at IS NULL;',
    [nowISO(), id],
  );
}

async function remove(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM subscriptions WHERE id = ?;', [id]);
}

export const subscriptionsRepo = { list, create, update, cancel, remove };
