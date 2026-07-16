/**
 * Schema SQLite do Arrego.
 *
 * Migrações são versionadas via `PRAGMA user_version`. Para mudar o banco:
 * acrescente uma NOVA entrada em MIGRATIONS. Nunca edite uma migração já
 * publicada — os aparelhos que já rodaram aquela versão não vão rodar de novo.
 *
 * Dinheiro é INTEGER (centavos). Nunca REAL — float com dinheiro erra.
 */

export const MIGRATIONS: readonly string[] = [
  // v1 — base
  `
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS profile (
    id           INTEGER PRIMARY KEY CHECK (id = 1),
    name         TEXT    NOT NULL,
    photo_uri    TEXT,
    avatar_emoji TEXT    NOT NULL DEFAULT '🙂',
    payday       INTEGER CHECK (payday IS NULL OR (payday BETWEEN 1 AND 31)),
    created_at   TEXT    NOT NULL,
    onboarded_at TEXT
  );

  CREATE TABLE IF NOT EXISTS incomes (
    id           TEXT    PRIMARY KEY,
    label        TEXT    NOT NULL,
    kind         TEXT    NOT NULL,
    amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
    recurring    INTEGER NOT NULL CHECK (recurring IN (0, 1)),
    day_of_month INTEGER CHECK (day_of_month IS NULL OR (day_of_month BETWEEN 1 AND 31)),
    received_on  TEXT,
    created_at   TEXT    NOT NULL,
    archived_at  TEXT,
    -- Recorrente exige dia do mês; pontual exige data. Um ou outro, nunca os dois.
    CHECK (
      (recurring = 1 AND day_of_month IS NOT NULL AND received_on IS NULL) OR
      (recurring = 0 AND received_on IS NOT NULL AND day_of_month IS NULL)
    )
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id           TEXT    PRIMARY KEY,
    label        TEXT    NOT NULL,
    category     TEXT    NOT NULL,
    amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
    recurring    INTEGER NOT NULL CHECK (recurring IN (0, 1)),
    day_of_month INTEGER CHECK (day_of_month IS NULL OR (day_of_month BETWEEN 1 AND 31)),
    spent_on     TEXT,
    created_at   TEXT    NOT NULL,
    archived_at  TEXT,
    CHECK (
      (recurring = 1 AND day_of_month IS NOT NULL AND spent_on IS NULL) OR
      (recurring = 0 AND spent_on IS NOT NULL AND day_of_month IS NULL)
    )
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id           TEXT    PRIMARY KEY,
    label        TEXT    NOT NULL,
    category     TEXT    NOT NULL,
    amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
    billing_day  INTEGER NOT NULL CHECK (billing_day BETWEEN 1 AND 31),
    cycle        TEXT    NOT NULL CHECK (cycle IN ('monthly', 'yearly')),
    share_count  INTEGER CHECK (share_count IS NULL OR share_count >= 1),
    created_at   TEXT    NOT NULL,
    cancelled_at TEXT
  );

  -- SEM DADO DE CARTÃO. Só apelido e datas do ciclo da fatura.
  CREATE TABLE IF NOT EXISTS cards (
    id           TEXT    PRIMARY KEY,
    nickname     TEXT    NOT NULL,
    closing_day  INTEGER NOT NULL CHECK (closing_day BETWEEN 1 AND 31),
    due_day      INTEGER NOT NULL CHECK (due_day BETWEEN 1 AND 31),
    limit_cents  INTEGER CHECK (limit_cents IS NULL OR limit_cents >= 0),
    color_index  INTEGER NOT NULL DEFAULT 0,
    created_at   TEXT    NOT NULL,
    archived_at  TEXT
  );

  CREATE TABLE IF NOT EXISTS card_purchases (
    id                      TEXT    PRIMARY KEY,
    card_id                 TEXT    NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    description             TEXT    NOT NULL,
    category                TEXT    NOT NULL,
    total_cents             INTEGER NOT NULL CHECK (total_cents >= 0),
    installments            INTEGER NOT NULL CHECK (installments BETWEEN 1 AND 72),
    first_installment_month TEXT    NOT NULL,
    created_at              TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS goals (
    id           TEXT    PRIMARY KEY,
    label        TEXT    NOT NULL,
    kind         TEXT    NOT NULL CHECK (kind IN ('emergency', 'custom')),
    emoji        TEXT    NOT NULL DEFAULT '🎯',
    target_cents INTEGER NOT NULL CHECK (target_cents > 0),
    target_date  TEXT,
    priority     INTEGER NOT NULL DEFAULT 100,
    created_at   TEXT    NOT NULL,
    achieved_at  TEXT
  );

  CREATE TABLE IF NOT EXISTS goal_deposits (
    id            TEXT    PRIMARY KEY,
    goal_id       TEXT    NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    -- Pode ser negativo: sacar da meta é permitido e registrado sem drama.
    amount_cents  INTEGER NOT NULL,
    deposited_on  TEXT    NOT NULL,
    note          TEXT,
    created_at    TEXT    NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_incomes_active       ON incomes (archived_at);
  CREATE INDEX IF NOT EXISTS idx_expenses_active      ON expenses (archived_at);
  CREATE INDEX IF NOT EXISTS idx_subscriptions_active ON subscriptions (cancelled_at);
  CREATE INDEX IF NOT EXISTS idx_purchases_card       ON card_purchases (card_id);
  CREATE INDEX IF NOT EXISTS idx_purchases_month      ON card_purchases (first_installment_month);
  CREATE INDEX IF NOT EXISTS idx_deposits_goal        ON goal_deposits (goal_id);
  `,
];

/** Versão alvo = quantidade de migrações. */
export const TARGET_VERSION = MIGRATIONS.length;
