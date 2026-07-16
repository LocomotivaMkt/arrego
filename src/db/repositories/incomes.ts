import { getDb } from '@/db/client';
import type { Income, IncomeKind, ISODate } from '@/types/models';
import { currentMonthKey, dateInMonth, parseISODate } from '@/utils/date';
import { newId } from '@/utils/id';
import { boolToInt, clampDay, intToBool, nowISO, pick, toPositiveCents } from './_shared';

type IncomeRow = {
  id: string;
  label: string;
  kind: string;
  amount_cents: number;
  recurring: number;
  day_of_month: number | null;
  received_on: string | null;
  created_at: string;
  archived_at: string | null;
};

export type IncomeInput = Omit<Income, 'id' | 'createdAt' | 'archivedAt'>;
export type IncomePatch = Partial<Omit<Income, 'id' | 'createdAt'>>;

// A coluna `kind` não tem CHECK de enum no schema, e este repo é o único que
// escreve nela. O cast é a fronteira onde essa garantia vira tipo.
function mapRow(row: IncomeRow): Income {
  return {
    id: row.id,
    label: row.label,
    kind: row.kind as IncomeKind,
    amountCents: row.amount_cents,
    recurring: intToBool(row.recurring),
    dayOfMonth: row.day_of_month,
    receivedOn: row.received_on,
    createdAt: row.created_at,
    archivedAt: row.archived_at,
  };
}

function toRow(income: Income): IncomeRow {
  return {
    id: income.id,
    label: income.label,
    kind: income.kind,
    amount_cents: toPositiveCents(income.amountCents),
    recurring: boolToInt(income.recurring),
    day_of_month: income.dayOfMonth,
    received_on: income.receivedOn,
    created_at: income.createdAt,
    archived_at: income.archivedAt,
  };
}

type Schedule = {
  recurring: boolean;
  dayOfMonth: number | null;
  receivedOn: ISODate | null;
};

/**
 * O CHECK do schema é excludente: recorrente exige `day_of_month` e proíbe
 * `received_on`; pontual exige `received_on` e proíbe `day_of_month`. Gravar
 * sem normalizar estoura o INSERT em runtime.
 *
 * Ao virar recorrente, o dia sai da data que existia; ao virar pontual, a data
 * sai do dia dentro do mês corrente (já encaixado em mês curto). Quando não há
 * nada de onde derivar, o erro é de quem chamou — e precisa ser legível, não um
 * "CHECK constraint failed" cru.
 */
function normalizeSchedule(input: Schedule): Schedule {
  if (input.recurring) {
    const day =
      input.dayOfMonth ?? (input.receivedOn ? parseISODate(input.receivedOn).getDate() : null);
    if (day === null) {
      throw new Error('Entrada recorrente precisa de um dia do mês (dayOfMonth).');
    }
    return { recurring: true, dayOfMonth: clampDay(day), receivedOn: null };
  }

  const receivedOn =
    input.receivedOn ??
    (input.dayOfMonth === null ? null : dateInMonth(input.dayOfMonth, currentMonthKey()));
  if (receivedOn === null) {
    throw new Error('Entrada pontual precisa da data em que caiu (receivedOn).');
  }
  return { recurring: false, dayOfMonth: null, receivedOn };
}

async function findById(id: string): Promise<Income | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<IncomeRow>('SELECT * FROM incomes WHERE id = ?;', [id]);
  return row ? mapRow(row) : null;
}

async function list(opts?: { includeArchived?: boolean }): Promise<Income[]> {
  const db = await getDb();
  const rows = opts?.includeArchived
    ? await db.getAllAsync<IncomeRow>(
        'SELECT * FROM incomes ORDER BY archived_at IS NOT NULL, amount_cents DESC, created_at DESC;',
      )
    : await db.getAllAsync<IncomeRow>(
        'SELECT * FROM incomes WHERE archived_at IS NULL ORDER BY amount_cents DESC, created_at DESC;',
      );
  return rows.map(mapRow);
}

async function create(input: IncomeInput): Promise<Income> {
  const db = await getDb();
  const income: Income = {
    id: newId(),
    label: input.label,
    kind: input.kind,
    amountCents: toPositiveCents(input.amountCents),
    ...normalizeSchedule(input),
    createdAt: nowISO(),
    archivedAt: null,
  };

  const row = toRow(income);
  await db.runAsync(
    `INSERT INTO incomes
       (id, label, kind, amount_cents, recurring, day_of_month, received_on, created_at, archived_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      row.id,
      row.label,
      row.kind,
      row.amount_cents,
      row.recurring,
      row.day_of_month,
      row.received_on,
      row.created_at,
      row.archived_at,
    ],
  );

  return income;
}

/**
 * Lê, funde e regrava a linha inteira. Os três campos do CHECK são acoplados —
 * um UPDATE parcial de `recurring` sem revisar os outros dois quebra a linha.
 */
async function update(id: string, patch: IncomePatch): Promise<void> {
  const db = await getDb();
  const current = await findById(id);
  if (!current) {
    throw new Error(`Entrada não encontrada: ${id}`);
  }

  const next: Income = {
    ...current,
    label: pick(patch.label, current.label),
    kind: pick(patch.kind, current.kind),
    amountCents: toPositiveCents(pick(patch.amountCents, current.amountCents)),
    archivedAt: pick(patch.archivedAt, current.archivedAt),
    ...normalizeSchedule({
      recurring: pick(patch.recurring, current.recurring),
      dayOfMonth: pick(patch.dayOfMonth, current.dayOfMonth),
      receivedOn: pick(patch.receivedOn, current.receivedOn),
    }),
  };

  const row = toRow(next);
  await db.runAsync(
    `UPDATE incomes SET
       label = ?, kind = ?, amount_cents = ?, recurring = ?,
       day_of_month = ?, received_on = ?, archived_at = ?
     WHERE id = ?;`,
    [
      row.label,
      row.kind,
      row.amount_cents,
      row.recurring,
      row.day_of_month,
      row.received_on,
      row.archived_at,
      row.id,
    ],
  );
}

/** Arquivar preserva o histórico do mês em que a entrada ainda existia. */
async function archive(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE incomes SET archived_at = ? WHERE id = ? AND archived_at IS NULL;', [
    nowISO(),
    id,
  ]);
}

async function remove(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM incomes WHERE id = ?;', [id]);
}

export const incomesRepo = { list, create, update, archive, remove };
