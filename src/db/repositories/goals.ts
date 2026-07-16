import { getDb } from '@/db/client';
import type { Goal, GoalDeposit } from '@/types/models';
import { newId } from '@/utils/id';
import { nowISO, pick, toCents } from './_shared';

type GoalRow = {
  id: string;
  label: string;
  kind: string;
  emoji: string;
  target_cents: number;
  target_date: string | null;
  priority: number;
  created_at: string;
  achieved_at: string | null;
};

type GoalDepositRow = {
  id: string;
  goal_id: string;
  amount_cents: number;
  deposited_on: string;
  note: string | null;
  created_at: string;
};

export type GoalInput = Omit<Goal, 'id' | 'createdAt' | 'achievedAt'>;
export type GoalPatch = Partial<Omit<Goal, 'id' | 'createdAt'>>;
export type GoalDepositInput = Omit<GoalDeposit, 'id' | 'createdAt'>;

function mapRow(row: GoalRow): Goal {
  return {
    id: row.id,
    label: row.label,
    kind: row.kind === 'emergency' ? 'emergency' : 'custom',
    emoji: row.emoji,
    targetCents: row.target_cents,
    targetDate: row.target_date,
    priority: row.priority,
    createdAt: row.created_at,
    achievedAt: row.achieved_at,
  };
}

function mapDepositRow(row: GoalDepositRow): GoalDeposit {
  return {
    id: row.id,
    goalId: row.goal_id,
    amountCents: row.amount_cents,
    depositedOn: row.deposited_on,
    note: row.note,
    createdAt: row.created_at,
  };
}

/** O schema exige `target_cents > 0`. Meta de R$ 0 é bug de quem chamou, não meta. */
function assertTarget(targetCents: number): number {
  const cents = toCents(targetCents);
  if (cents <= 0) {
    throw new Error('Meta precisa de um valor alvo maior que zero (targetCents).');
  }
  return cents;
}

async function findById(id: string): Promise<Goal | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<GoalRow>('SELECT * FROM goals WHERE id = ?;', [id]);
  return row ? mapRow(row) : null;
}

/** Menor prioridade primeiro — é assim que a reserva de emergência encabeça a lista. */
async function list(): Promise<Goal[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<GoalRow>(
    'SELECT * FROM goals ORDER BY achieved_at IS NOT NULL, priority ASC, created_at ASC;',
  );
  return rows.map(mapRow);
}

async function create(input: GoalInput): Promise<Goal> {
  const db = await getDb();
  const goal: Goal = {
    id: newId(),
    label: input.label,
    kind: input.kind,
    emoji: input.emoji,
    targetCents: assertTarget(input.targetCents),
    targetDate: input.targetDate,
    priority: Math.floor(input.priority),
    createdAt: nowISO(),
    achievedAt: null,
  };

  await db.runAsync(
    `INSERT INTO goals
       (id, label, kind, emoji, target_cents, target_date, priority, created_at, achieved_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      goal.id,
      goal.label,
      goal.kind,
      goal.emoji,
      goal.targetCents,
      goal.targetDate,
      goal.priority,
      goal.createdAt,
      goal.achievedAt,
    ],
  );

  return goal;
}

async function update(id: string, patch: GoalPatch): Promise<void> {
  const db = await getDb();
  const current = await findById(id);
  if (!current) {
    throw new Error(`Meta não encontrada: ${id}`);
  }

  const next: Goal = {
    ...current,
    label: pick(patch.label, current.label),
    kind: pick(patch.kind, current.kind),
    emoji: pick(patch.emoji, current.emoji),
    targetCents: assertTarget(pick(patch.targetCents, current.targetCents)),
    targetDate: pick(patch.targetDate, current.targetDate),
    priority: Math.floor(pick(patch.priority, current.priority)),
    achievedAt: pick(patch.achievedAt, current.achievedAt),
  };

  await db.runAsync(
    `UPDATE goals SET
       label = ?, kind = ?, emoji = ?, target_cents = ?,
       target_date = ?, priority = ?, achieved_at = ?
     WHERE id = ?;`,
    [
      next.label,
      next.kind,
      next.emoji,
      next.targetCents,
      next.targetDate,
      next.priority,
      next.achievedAt,
      next.id,
    ],
  );
}

async function remove(id: string): Promise<void> {
  const db = await getDb();
  // Os depósitos vão junto (ON DELETE CASCADE).
  await db.runAsync('DELETE FROM goals WHERE id = ?;', [id]);
}

/** Bater a meta é uma data só: alcançar de novo não reescreve a primeira vez. */
async function markAchieved(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE goals SET achieved_at = ? WHERE id = ? AND achieved_at IS NULL;', [
    nowISO(),
    id,
  ]);
}

async function listDeposits(): Promise<GoalDeposit[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<GoalDepositRow>(
    'SELECT * FROM goal_deposits ORDER BY deposited_on DESC, created_at DESC;',
  );
  return rows.map(mapDepositRow);
}

async function listDepositsByGoal(goalId: string): Promise<GoalDeposit[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<GoalDepositRow>(
    'SELECT * FROM goal_deposits WHERE goal_id = ? ORDER BY deposited_on DESC, created_at DESC;',
    [goalId],
  );
  return rows.map(mapDepositRow);
}

/** Valor negativo é saque, e é gravado sem cerimônia: registrar é honestidade. */
async function createDeposit(input: GoalDepositInput): Promise<GoalDeposit> {
  const db = await getDb();
  const deposit: GoalDeposit = {
    id: newId(),
    goalId: input.goalId,
    amountCents: toCents(input.amountCents),
    depositedOn: input.depositedOn,
    note: input.note,
    createdAt: nowISO(),
  };

  await db.runAsync(
    `INSERT INTO goal_deposits (id, goal_id, amount_cents, deposited_on, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?);`,
    [
      deposit.id,
      deposit.goalId,
      deposit.amountCents,
      deposit.depositedOn,
      deposit.note,
      deposit.createdAt,
    ],
  );

  return deposit;
}

async function removeDeposit(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM goal_deposits WHERE id = ?;', [id]);
}

export const goalsRepo = {
  list,
  create,
  update,
  remove,
  markAchieved,
  listDeposits,
  listDepositsByGoal,
  createDeposit,
  removeDeposit,
};
