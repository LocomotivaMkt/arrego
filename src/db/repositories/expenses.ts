import { getDb } from '@/db/client';
import type { Expense, ExpenseCategory, ISODate } from '@/types/models';
import { currentMonthKey, dateInMonth, parseISODate } from '@/utils/date';
import { newId } from '@/utils/id';
import { boolToInt, clampDay, intToBool, nowISO, pick, toPositiveCents } from './_shared';

type ExpenseRow = {
  id: string;
  label: string;
  category: string;
  amount_cents: number;
  recurring: number;
  day_of_month: number | null;
  spent_on: string | null;
  created_at: string;
  archived_at: string | null;
};

export type ExpenseInput = Omit<Expense, 'id' | 'createdAt' | 'archivedAt'>;
export type ExpensePatch = Partial<Omit<Expense, 'id' | 'createdAt'>>;

function mapRow(row: ExpenseRow): Expense {
  return {
    id: row.id,
    label: row.label,
    category: row.category as ExpenseCategory,
    amountCents: row.amount_cents,
    recurring: intToBool(row.recurring),
    dayOfMonth: row.day_of_month,
    spentOn: row.spent_on,
    createdAt: row.created_at,
    archivedAt: row.archived_at,
  };
}

function toRow(expense: Expense): ExpenseRow {
  return {
    id: expense.id,
    label: expense.label,
    category: expense.category,
    amount_cents: toPositiveCents(expense.amountCents),
    recurring: boolToInt(expense.recurring),
    day_of_month: expense.dayOfMonth,
    spent_on: expense.spentOn,
    created_at: expense.createdAt,
    archived_at: expense.archivedAt,
  };
}

type Schedule = {
  recurring: boolean;
  dayOfMonth: number | null;
  spentOn: ISODate | null;
};

/**
 * Mesmo CHECK excludente das entradas: recorrente exige `day_of_month` e proíbe
 * `spent_on`; pontual exige `spent_on` e proíbe `day_of_month`. Sem normalizar
 * antes, o INSERT estoura em runtime.
 *
 * Ao virar recorrente, o dia sai da data do gasto; ao virar pontual, a data sai
 * do dia de vencimento dentro do mês corrente.
 */
function normalizeSchedule(input: Schedule): Schedule {
  if (input.recurring) {
    const day = input.dayOfMonth ?? (input.spentOn ? parseISODate(input.spentOn).getDate() : null);
    if (day === null) {
      throw new Error('Despesa recorrente precisa de um dia de vencimento (dayOfMonth).');
    }
    return { recurring: true, dayOfMonth: clampDay(day), spentOn: null };
  }

  const spentOn =
    input.spentOn ??
    (input.dayOfMonth === null ? null : dateInMonth(input.dayOfMonth, currentMonthKey()));
  if (spentOn === null) {
    throw new Error('Despesa pontual precisa da data do gasto (spentOn).');
  }
  return { recurring: false, dayOfMonth: null, spentOn };
}

async function findById(id: string): Promise<Expense | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<ExpenseRow>('SELECT * FROM expenses WHERE id = ?;', [id]);
  return row ? mapRow(row) : null;
}

async function list(opts?: { includeArchived?: boolean }): Promise<Expense[]> {
  const db = await getDb();
  const rows = opts?.includeArchived
    ? await db.getAllAsync<ExpenseRow>(
        'SELECT * FROM expenses ORDER BY archived_at IS NOT NULL, amount_cents DESC, created_at DESC;',
      )
    : await db.getAllAsync<ExpenseRow>(
        'SELECT * FROM expenses WHERE archived_at IS NULL ORDER BY amount_cents DESC, created_at DESC;',
      );
  return rows.map(mapRow);
}

async function create(input: ExpenseInput): Promise<Expense> {
  const db = await getDb();
  const expense: Expense = {
    id: newId(),
    label: input.label,
    category: input.category,
    amountCents: toPositiveCents(input.amountCents),
    ...normalizeSchedule(input),
    createdAt: nowISO(),
    archivedAt: null,
  };

  const row = toRow(expense);
  await db.runAsync(
    `INSERT INTO expenses
       (id, label, category, amount_cents, recurring, day_of_month, spent_on, created_at, archived_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      row.id,
      row.label,
      row.category,
      row.amount_cents,
      row.recurring,
      row.day_of_month,
      row.spent_on,
      row.created_at,
      row.archived_at,
    ],
  );

  return expense;
}

async function update(id: string, patch: ExpensePatch): Promise<void> {
  const db = await getDb();
  const current = await findById(id);
  if (!current) {
    throw new Error(`Despesa não encontrada: ${id}`);
  }

  const next: Expense = {
    ...current,
    label: pick(patch.label, current.label),
    category: pick(patch.category, current.category),
    amountCents: toPositiveCents(pick(patch.amountCents, current.amountCents)),
    archivedAt: pick(patch.archivedAt, current.archivedAt),
    ...normalizeSchedule({
      recurring: pick(patch.recurring, current.recurring),
      dayOfMonth: pick(patch.dayOfMonth, current.dayOfMonth),
      spentOn: pick(patch.spentOn, current.spentOn),
    }),
  };

  const row = toRow(next);
  await db.runAsync(
    `UPDATE expenses SET
       label = ?, category = ?, amount_cents = ?, recurring = ?,
       day_of_month = ?, spent_on = ?, archived_at = ?
     WHERE id = ?;`,
    [
      row.label,
      row.category,
      row.amount_cents,
      row.recurring,
      row.day_of_month,
      row.spent_on,
      row.archived_at,
      row.id,
    ],
  );
}

async function archive(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE expenses SET archived_at = ? WHERE id = ? AND archived_at IS NULL;', [
    nowISO(),
    id,
  ]);
}

async function remove(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM expenses WHERE id = ?;', [id]);
}

export const expensesRepo = { list, create, update, archive, remove };
