/**
 * Tela "Grana": o que entra, o que sai todo mês e o que sai sem ninguém ver.
 *
 * As três abas são a mesma mecânica com três tabelas: cabeçalho com o total do
 * mês, lista, folha de formulário. O que muda de verdade entre elas é a REGRA
 * DE ESCRITA de cada tabela — e é aí que mora o cuidado deste arquivo:
 *
 * 1. O CHECK do SQLite em `incomes`/`expenses` é excludente: recorrente exige
 *    `dayOfMonth` e proíbe a data; pontual exige a data e proíbe `dayOfMonth`.
 *    O repo normaliza, mas normalizar o que chega vazio é o caminho do erro em
 *    runtime — aqui o formulário nunca deixa sair um item sem dia.
 *
 * 2. Arquivar != apagar. `buildSnapshot` ignora `archivedAt` em entrada/despesa
 *    PONTUAL de propósito (o freela de março entrou em março). Por isso só item
 *    RECORRENTE recebe a opção de arquivar: arquivar um gasto pontual não muda
 *    conta nenhuma e só confundiria quem clicou.
 */

import type { ExpenseInput, IncomeInput, SubscriptionInput } from '@/db/repositories';
import { subscriptionMonthlyCents } from '@/engine/analysis';
import { useArrego, useSnapshot } from '@/store/useArrego';
import { spacing } from '@/theme/tokens';
import type {
  Cents,
  Expense,
  ExpenseCategory,
  Income,
  IncomeKind,
  MonthKey,
  Subscription,
  SubscriptionCategory,
} from '@/types/models';
import {
  AppText,
  Badge,
  Button,
  Card,
  Chip,
  CurrencyField,
  DayField,
  EmptyState,
  Field,
  ListRow,
  MoneyText,
  Screen,
  SectionHeader,
  SegmentedControl,
  Sheet,
  TextField,
  type MoneyTone,
  type SegmentedOption,
} from '@/ui';
import {
  currentMonthKey,
  dateInMonth,
  formatDayMonth,
  formatMonthLong,
  monthKeyFromISO,
  parseISODate,
} from '@/utils/date';
import { formatCents, formatPercent, ratio } from '@/utils/money';
import { useState, type ReactNode } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

/* ────────────────────────────── Catálogos ─────────────────────────────── */

type Meta = { emoji: string; label: string };

const INCOME_META = {
  salary: { emoji: '💼', label: 'Salário' },
  allowance: { emoji: '👛', label: 'Mesada' },
  commission: { emoji: '🤝', label: 'Comissão' },
  freelance: { emoji: '🛠️', label: 'Freela' },
  gift: { emoji: '🎁', label: 'Presente' },
  other: { emoji: '🪙', label: 'Outro' },
} as const satisfies Record<IncomeKind, Meta>;

const EXPENSE_META = {
  moradia: { emoji: '🏠', label: 'Moradia' },
  contas: { emoji: '💡', label: 'Contas' },
  mercado: { emoji: '🛒', label: 'Mercado' },
  transporte: { emoji: '🚌', label: 'Transporte' },
  saude: { emoji: '💊', label: 'Saúde' },
  educacao: { emoji: '📚', label: 'Educação' },
  lazer: { emoji: '🍿', label: 'Lazer' },
  outros: { emoji: '📦', label: 'Outros' },
} as const satisfies Record<ExpenseCategory, Meta>;

const SUBSCRIPTION_META = {
  streaming: { emoji: '📺', label: 'Streaming' },
  musica: { emoji: '🎧', label: 'Música' },
  games: { emoji: '🎮', label: 'Games' },
  academia: { emoji: '🏋️', label: 'Academia' },
  apps: { emoji: '📱', label: 'Apps' },
  outros: { emoji: '📦', label: 'Outros' },
} as const satisfies Record<SubscriptionCategory, Meta>;

// A ordem é decisão de UI (o mais comum primeiro), não a ordem do type.
const INCOME_KINDS: readonly IncomeKind[] = [
  'salary',
  'allowance',
  'commission',
  'freelance',
  'gift',
  'other',
];

const EXPENSE_CATEGORIES: readonly ExpenseCategory[] = [
  'moradia',
  'contas',
  'mercado',
  'transporte',
  'saude',
  'educacao',
  'lazer',
  'outros',
];

const SUBSCRIPTION_CATEGORIES: readonly SubscriptionCategory[] = [
  'streaming',
  'musica',
  'games',
  'academia',
  'apps',
  'outros',
];

/**
 * Espelha `SUBSCRIPTION_SHARE_LIMIT` de `engine/insights.ts`, que não é
 * exportado. Se um dia divergirem, o cabeçalho daqui vai avisar num limite e a
 * fala do dashboard em outro — mesma pessoa, dois recados diferentes.
 */
const SUBSCRIPTION_SHARE_LIMIT = 0.1;

const LABEL_REQUIRED = 'Dá um nome pra isso — daqui a um mês você não lembra o que era.';
const AMOUNT_REQUIRED = 'Precisa de um valor maior que zero. Zero eu não consigo somar.';
const DAY_REQUIRED = 'Escolhe um dia — sem ele eu não sei em que mês isso cai.';

/* ──────────────────────────── Folha (Sheet) ───────────────────────────── */

type SheetState<T> = { visible: boolean; target: T | null; session: number };

type SheetControl<T> = {
  visible: boolean;
  target: T | null;
  session: number;
  openNew: () => void;
  openEdit: (target: T) => void;
  close: () => void;
};

/**
 * `session` incrementa a cada abertura e é a `key` do formulário: é o que
 * garante campo limpo em "novo" e campo do item certo em "editar", sem um
 * efeito sincronizando prop com estado.
 *
 * Hoje o Modal do RN desmonta os filhos com `visible={false}` e o formulário já
 * nasceria zerado sem a `key` — mas isso é detalhe interno dele, não promessa da
 * `Sheet`. Com a `key`, o reset é nosso e continua valendo se a folha um dia
 * passar a manter os filhos vivos entre aberturas.
 *
 * `close` só baixa o `visible`: zerar o `target` junto trocaria o título da
 * folha ("Editar" → "Nova") no meio da saída, sem ganho nenhum.
 */
function useSheet<T>(): SheetControl<T> {
  const [state, setState] = useState<SheetState<T>>({
    visible: false,
    target: null,
    session: 0,
  });

  return {
    visible: state.visible,
    target: state.target,
    session: state.session,
    openNew: () => setState((s) => ({ visible: true, target: null, session: s.session + 1 })),
    openEdit: (target: T) => setState((s) => ({ visible: true, target, session: s.session + 1 })),
    close: () => setState((s) => ({ ...s, visible: false })),
  };
}

/**
 * Toda escrita da store engole a exceção e vira `error` (ver `write` lá).
 * Fechar a folha sem conferir esconderia a falha: a folha some, o item não foi
 * salvo, e a pessoa acha que salvou. `write` zera o erro no sucesso, então
 * `error === null` depois do await é o teste honesto de "gravou".
 */
async function didSave(action: Promise<void>): Promise<boolean> {
  await action;
  return useArrego.getState().error === null;
}

/* ───────────────────────────── Peças comuns ───────────────────────────── */

const RECURRING_OPTIONS: SegmentedOption[] = [
  { key: 'sim', label: 'Todo mês' },
  { key: 'nao', label: 'Uma vez só' },
];

function TotalHeader({
  label,
  cents,
  caption,
  tone = 'neutral',
  children,
}: {
  label: string;
  cents: Cents;
  caption: string;
  tone?: MoneyTone;
  children?: ReactNode;
}) {
  return (
    <Card style={styles.header}>
      <AppText variant="caption" tone="muted">
        {label}
      </AppText>
      <MoneyText cents={cents} variant="title" tone={tone} />
      <AppText variant="small" tone="secondary">
        {caption}
      </AppText>
      {children}
    </Card>
  );
}

function ArchivedSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <SectionHeader title={title} />
      <AppText variant="small" tone="muted" style={styles.sectionNote}>
        Não entram mais nas contas do mês, mas ficam aqui para o histórico continuar certo.
      </AppText>
      <Card padded={false} style={styles.list}>
        {children}
      </Card>
    </View>
  );
}

function todayDay(): number {
  return new Date().getDate();
}

/** Dia sugerido para um item novo. Só existe "hoje" dentro do mês corrente. */
function defaultDay(anchor: MonthKey): number {
  return anchor === currentMonthKey() ? todayDay() : 1;
}

function dayOfISO(iso: string): number {
  return parseISODate(iso).getDate();
}

/* ─────────────────────────────── Entradas ─────────────────────────────── */

function incomeSubtitle(income: Income): string {
  const when = income.recurring
    ? income.dayOfMonth !== null
      ? `todo dia ${income.dayOfMonth}`
      : 'todo mês'
    : income.receivedOn !== null
      ? formatDayMonth(income.receivedOn)
      : 'sem data';
  return income.archivedAt !== null ? `${when} · arquivada` : when;
}

type IncomeFormProps = {
  initial: Income | null;
  month: MonthKey;
  onSave: (input: IncomeInput) => Promise<boolean>;
  onClose: () => void;
};

function IncomeForm({ initial, month, onSave, onClose }: IncomeFormProps) {
  /**
   * O mês de uma entrada pontual que JÁ EXISTE é o dela, não o que a pessoa
   * está olhando. Reancorar no mês da tela mudaria a data do freela de março
   * para agosto só porque alguém abriu a folha para corrigir o valor.
   */
  const anchor =
    initial !== null && !initial.recurring && initial.receivedOn !== null
      ? monthKeyFromISO(initial.receivedOn)
      : month;

  const [label, setLabel] = useState(initial?.label ?? '');
  const [kind, setKind] = useState<IncomeKind>(initial?.kind ?? 'salary');
  const [cents, setCents] = useState<Cents>(initial?.amountCents ?? 0);
  const [recurring, setRecurring] = useState(initial?.recurring ?? true);
  const [day, setDay] = useState<number | null>(() => {
    if (initial === null) return defaultDay(anchor);
    if (initial.recurring) return initial.dayOfMonth;
    return initial.receivedOn !== null ? dayOfISO(initial.receivedOn) : defaultDay(anchor);
  });
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const labelError = submitted && label.trim() === '' ? LABEL_REQUIRED : undefined;
  const amountError = submitted && cents <= 0 ? AMOUNT_REQUIRED : undefined;
  const dayError = submitted && day === null ? DAY_REQUIRED : undefined;

  async function submit(): Promise<void> {
    setSubmitted(true);
    if (label.trim() === '' || cents <= 0 || day === null) return;

    setSaving(true);
    // Os três campos do agendamento são acoplados pelo CHECK: recorrente com
    // data, ou pontual com dia, estoura o INSERT.
    const saved = await onSave({
      label: label.trim(),
      kind,
      amountCents: cents,
      recurring,
      dayOfMonth: recurring ? day : null,
      receivedOn: recurring ? null : dateInMonth(day, anchor),
    });
    if (saved) onClose();
    else setSaving(false);
  }

  return (
    <>
      <TextField
        label="O que é essa entrada?"
        value={label}
        onChangeText={setLabel}
        placeholder="Salário da firma"
        error={labelError}
        maxLength={60}
        autoFocus={initial === null}
      />

      <Field label="Tipo">
        <View style={styles.chips}>
          {INCOME_KINDS.map((option) => (
            <Chip
              key={option}
              label={INCOME_META[option].label}
              icon={INCOME_META[option].emoji}
              selected={kind === option}
              onPress={() => setKind(option)}
            />
          ))}
        </View>
      </Field>

      <CurrencyField
        label="Quanto entra?"
        cents={cents}
        onChangeCents={setCents}
        error={amountError}
      />

      <Field label="Cai todo mês?">
        <SegmentedControl
          options={RECURRING_OPTIONS}
          value={recurring ? 'sim' : 'nao'}
          onChange={(key) => setRecurring(key === 'sim')}
        />
      </Field>

      <View style={styles.dayBlock}>
        <DayField
          label={recurring ? 'Cai todo dia' : 'Entrou no dia'}
          value={day}
          onChange={setDay}
          hint={
            recurring
              ? 'Dia 31 vira o último dia nos meses que não têm 31.'
              : day !== null
                ? `Entrou em ${formatDayMonth(dateInMonth(day, anchor))}.`
                : `Dentro de ${formatMonthLong(anchor)}.`
          }
        />
        {dayError ? (
          <AppText variant="small" tone="negative">
            {dayError}
          </AppText>
        ) : null}
      </View>

      <Button
        label={saving ? 'Salvando…' : 'Salvar'}
        onPress={submit}
        disabled={saving}
        size="lg"
        full
      />
    </>
  );
}

function EntrouTab(): ReactNode {
  const incomes = useArrego((s) => s.incomes);
  const month = useArrego((s) => s.month);
  const addIncome = useArrego((s) => s.addIncome);
  const updateIncome = useArrego((s) => s.updateIncome);
  const archiveIncome = useArrego((s) => s.archiveIncome);
  const removeIncome = useArrego((s) => s.removeIncome);
  const snapshot = useSnapshot();
  const sheet = useSheet<Income>();

  const active = incomes.filter((income) => income.archivedAt === null);
  const archived = incomes.filter((income) => income.archivedAt !== null);

  const save = (input: IncomeInput): Promise<boolean> =>
    didSave(
      sheet.target !== null ? updateIncome(sheet.target.id, input) : addIncome(input),
    );

  function confirm(income: Income): void {
    if (income.archivedAt !== null) {
      Alert.alert(
        income.label,
        'Reativar traz ela de volta para as contas do mês. Apagar some com ela de vez, inclusive dos meses passados.',
        [
          { text: 'Voltar', style: 'cancel' },
          { text: 'Reativar', onPress: () => void updateIncome(income.id, { archivedAt: null }) },
          { text: 'Apagar', style: 'destructive', onPress: () => void removeIncome(income.id) },
        ],
      );
      return;
    }

    if (income.recurring) {
      Alert.alert(
        income.label,
        'Arquivar para de contar daqui pra frente e mantém os meses passados certos. Apagar some com ela de tudo, inclusive do histórico.',
        [
          { text: 'Voltar', style: 'cancel' },
          { text: 'Arquivar', onPress: () => void archiveIncome(income.id) },
          { text: 'Apagar', style: 'destructive', onPress: () => void removeIncome(income.id) },
        ],
      );
      return;
    }

    Alert.alert(income.label, 'Isso apaga a entrada de vez. Sem histórico, sem volta.', [
      { text: 'Voltar', style: 'cancel' },
      { text: 'Apagar', style: 'destructive', onPress: () => void removeIncome(income.id) },
    ]);
  }

  return (
    <>
      <TotalHeader
        label={`Entrou em ${formatMonthLong(month)}`}
        cents={snapshot.incomeTotalCents}
        tone="auto"
        caption={`Todo mês: ${formatCents(snapshot.incomeFixedCents)} · Só neste mês: ${formatCents(snapshot.incomeVariableCents)}`}
      />

      <Button label="Nova entrada" icon="+" onPress={sheet.openNew} full />

      {active.length > 0 ? (
        <Card padded={false} style={styles.list}>
          {active.map((income) => (
            <ListRow
              key={income.id}
              title={income.label}
              subtitle={incomeSubtitle(income)}
              leading={<AppText variant="heading">{INCOME_META[income.kind].emoji}</AppText>}
              trailing={<MoneyText cents={income.amountCents} signed />}
              onPress={() => sheet.openEdit(income)}
              onLongPress={() => confirm(income)}
            />
          ))}
        </Card>
      ) : (
        <EmptyState
          emoji="🪙"
          title="Nada entrando por aqui"
          body="Sem saber o que entra, qualquer conta que eu fizer dá zero. Cadastra o que cai na sua mão: salário, mesada, bico, pix da vó. Vale tudo, e pouco também é número."
        />
      )}

      {archived.length > 0 ? (
        <ArchivedSection title="Arquivadas">
          {archived.map((income) => (
            <ListRow
              key={income.id}
              title={income.label}
              subtitle={incomeSubtitle(income)}
              leading={<AppText variant="heading">{INCOME_META[income.kind].emoji}</AppText>}
              trailing={<MoneyText cents={income.amountCents} tone="neutral" />}
              onPress={() => sheet.openEdit(income)}
              onLongPress={() => confirm(income)}
            />
          ))}
        </ArchivedSection>
      ) : null}

      <Sheet
        visible={sheet.visible}
        onClose={sheet.close}
        title={sheet.target !== null ? 'Editar entrada' : 'Nova entrada'}
      >
        <IncomeForm
          key={sheet.session}
          initial={sheet.target}
          month={month}
          onSave={save}
          onClose={sheet.close}
        />
      </Sheet>
    </>
  );
}

/* ─────────────────────────────── Contas ───────────────────────────────── */

function expenseSubtitle(expense: Expense): string {
  const category = EXPENSE_META[expense.category].label;
  const when = expense.recurring
    ? expense.dayOfMonth !== null
      ? `vence todo dia ${expense.dayOfMonth}`
      : 'todo mês'
    : expense.spentOn !== null
      ? formatDayMonth(expense.spentOn)
      : 'sem data';
  const base = `${category} · ${when}`;
  return expense.archivedAt !== null ? `${base} · arquivada` : base;
}

type ExpenseFormProps = {
  initial: Expense | null;
  month: MonthKey;
  onSave: (input: ExpenseInput) => Promise<boolean>;
  onClose: () => void;
};

function ExpenseForm({ initial, month, onSave, onClose }: ExpenseFormProps) {
  const anchor =
    initial !== null && !initial.recurring && initial.spentOn !== null
      ? monthKeyFromISO(initial.spentOn)
      : month;

  const [label, setLabel] = useState(initial?.label ?? '');
  const [category, setCategory] = useState<ExpenseCategory>(initial?.category ?? 'contas');
  const [cents, setCents] = useState<Cents>(initial?.amountCents ?? 0);
  const [recurring, setRecurring] = useState(initial?.recurring ?? true);
  const [day, setDay] = useState<number | null>(() => {
    if (initial === null) return defaultDay(anchor);
    if (initial.recurring) return initial.dayOfMonth;
    return initial.spentOn !== null ? dayOfISO(initial.spentOn) : defaultDay(anchor);
  });
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const labelError = submitted && label.trim() === '' ? LABEL_REQUIRED : undefined;
  const amountError = submitted && cents <= 0 ? AMOUNT_REQUIRED : undefined;
  const dayError = submitted && day === null ? DAY_REQUIRED : undefined;

  async function submit(): Promise<void> {
    setSubmitted(true);
    if (label.trim() === '' || cents <= 0 || day === null) return;

    setSaving(true);
    const saved = await onSave({
      label: label.trim(),
      category,
      amountCents: cents,
      recurring,
      dayOfMonth: recurring ? day : null,
      spentOn: recurring ? null : dateInMonth(day, anchor),
    });
    if (saved) onClose();
    else setSaving(false);
  }

  return (
    <>
      <TextField
        label="Que conta é essa?"
        value={label}
        onChangeText={setLabel}
        placeholder="Luz"
        error={labelError}
        maxLength={60}
        autoFocus={initial === null}
      />

      <Field label="Categoria">
        <View style={styles.chips}>
          {EXPENSE_CATEGORIES.map((option) => (
            <Chip
              key={option}
              label={EXPENSE_META[option].label}
              icon={EXPENSE_META[option].emoji}
              selected={category === option}
              onPress={() => setCategory(option)}
            />
          ))}
        </View>
      </Field>

      <CurrencyField
        label="Quanto custa?"
        cents={cents}
        onChangeCents={setCents}
        error={amountError}
      />

      <Field label="Chega todo mês?">
        <SegmentedControl
          options={RECURRING_OPTIONS}
          value={recurring ? 'sim' : 'nao'}
          onChange={(key) => setRecurring(key === 'sim')}
        />
      </Field>

      <View style={styles.dayBlock}>
        <DayField
          label={recurring ? 'Vence todo dia' : 'Gastei no dia'}
          value={day}
          onChange={setDay}
          hint={
            recurring
              ? 'Dia 31 vira o último dia nos meses que não têm 31.'
              : day !== null
                ? `Foi em ${formatDayMonth(dateInMonth(day, anchor))}.`
                : `Dentro de ${formatMonthLong(anchor)}.`
          }
        />
        {dayError ? (
          <AppText variant="small" tone="negative">
            {dayError}
          </AppText>
        ) : null}
      </View>

      <Button
        label={saving ? 'Salvando…' : 'Salvar'}
        onPress={submit}
        disabled={saving}
        size="lg"
        full
      />
    </>
  );
}

function ContasTab(): ReactNode {
  const expenses = useArrego((s) => s.expenses);
  const month = useArrego((s) => s.month);
  const addExpense = useArrego((s) => s.addExpense);
  const updateExpense = useArrego((s) => s.updateExpense);
  const archiveExpense = useArrego((s) => s.archiveExpense);
  const removeExpense = useArrego((s) => s.removeExpense);
  const snapshot = useSnapshot();
  const sheet = useSheet<Expense>();

  const active = expenses.filter((expense) => expense.archivedAt === null);
  const archived = expenses.filter((expense) => expense.archivedAt !== null);

  // Só a tabela `expenses`: assinatura e parcela têm aba e tela próprias, e
  // somá-las aqui faria este total brigar com o do cabeçalho de lá.
  const totalCents = snapshot.expensesFixedCents + snapshot.expensesVariableCents;

  const save = (input: ExpenseInput): Promise<boolean> =>
    didSave(
      sheet.target !== null ? updateExpense(sheet.target.id, input) : addExpense(input),
    );

  function confirm(expense: Expense): void {
    if (expense.archivedAt !== null) {
      Alert.alert(
        expense.label,
        'Reativar traz ela de volta para as contas do mês. Apagar some com ela de vez, inclusive dos meses passados.',
        [
          { text: 'Voltar', style: 'cancel' },
          { text: 'Reativar', onPress: () => void updateExpense(expense.id, { archivedAt: null }) },
          { text: 'Apagar', style: 'destructive', onPress: () => void removeExpense(expense.id) },
        ],
      );
      return;
    }

    if (expense.recurring) {
      Alert.alert(
        expense.label,
        'Arquivar para de contar daqui pra frente e mantém os meses passados certos. Apagar some com ela de tudo, inclusive do histórico.',
        [
          { text: 'Voltar', style: 'cancel' },
          { text: 'Arquivar', onPress: () => void archiveExpense(expense.id) },
          { text: 'Apagar', style: 'destructive', onPress: () => void removeExpense(expense.id) },
        ],
      );
      return;
    }

    Alert.alert(expense.label, 'Isso apaga o gasto de vez. Sem histórico, sem volta.', [
      { text: 'Voltar', style: 'cancel' },
      { text: 'Apagar', style: 'destructive', onPress: () => void removeExpense(expense.id) },
    ]);
  }

  return (
    <>
      <TotalHeader
        label={`Contas de ${formatMonthLong(month)}`}
        cents={totalCents}
        caption={`Todo mês: ${formatCents(snapshot.expensesFixedCents)} · Só neste mês: ${formatCents(snapshot.expensesVariableCents)}`}
      />

      <Button label="Nova conta" icon="+" onPress={sheet.openNew} full />

      {active.length > 0 ? (
        <Card padded={false} style={styles.list}>
          {active.map((expense) => (
            <ListRow
              key={expense.id}
              title={expense.label}
              subtitle={expenseSubtitle(expense)}
              leading={<AppText variant="heading">{EXPENSE_META[expense.category].emoji}</AppText>}
              trailing={<MoneyText cents={expense.amountCents} tone="neutral" />}
              onPress={() => sheet.openEdit(expense)}
              onLongPress={() => confirm(expense)}
            />
          ))}
        </Card>
      ) : (
        <EmptyState
          emoji="🧾"
          title="Nenhuma conta aqui"
          body="Ninguém acorda animado para cadastrar boleto, eu entendo. Mas enquanto elas não estiverem aqui, eu não consigo te dizer quanto sobra. Começa pela maior — aluguel, luz, internet."
        />
      )}

      {archived.length > 0 ? (
        <ArchivedSection title="Arquivadas">
          {archived.map((expense) => (
            <ListRow
              key={expense.id}
              title={expense.label}
              subtitle={expenseSubtitle(expense)}
              leading={<AppText variant="heading">{EXPENSE_META[expense.category].emoji}</AppText>}
              trailing={<MoneyText cents={expense.amountCents} tone="neutral" />}
              onPress={() => sheet.openEdit(expense)}
              onLongPress={() => confirm(expense)}
            />
          ))}
        </ArchivedSection>
      ) : null}

      <Sheet
        visible={sheet.visible}
        onClose={sheet.close}
        title={sheet.target !== null ? 'Editar conta' : 'Nova conta'}
      >
        <ExpenseForm
          key={sheet.session}
          initial={sheet.target}
          month={month}
          onSave={save}
          onClose={sheet.close}
        />
      </Sheet>
    </>
  );
}

/* ───────────────────────────── Assinaturas ────────────────────────────── */

const CYCLE_OPTIONS: SegmentedOption[] = [
  { key: 'monthly', label: 'Mensal' },
  { key: 'yearly', label: 'Anual' },
];

/**
 * `shareCount` é o TOTAL de gente rachando, incluindo você — é por isso que o
 * motor faz `mensal / shareCount`. Ler o campo como "com quantas OUTRAS pessoas"
 * faria 2 pessoas virarem "pago um terço", e o erro sairia calado dentro do
 * total do mês. `null` e `1` significam a mesma coisa: paga tudo sozinha.
 */
const SHARE_OPTIONS: readonly { key: string; value: number | null; label: string }[] = [
  { key: 'so-eu', value: null, label: 'Só eu' },
  { key: '2', value: 2, label: '2 pessoas' },
  { key: '3', value: 3, label: '3 pessoas' },
  { key: '4', value: 4, label: '4 pessoas' },
  { key: '5', value: 5, label: '5 pessoas' },
  { key: '6', value: 6, label: '6 pessoas' },
];

function subscriptionSubtitle(subscription: Subscription): string {
  const category = SUBSCRIPTION_META[subscription.category].label;
  const cycle = subscription.cycle === 'yearly' ? 'anual' : 'mensal';
  const parts = [category, `${cycle} · dia ${subscription.billingDay}`];
  if (subscription.shareCount !== null && subscription.shareCount > 1) {
    parts.push(`rachada entre ${subscription.shareCount}`);
  }
  if (subscription.cancelledAt !== null) parts.push('cancelada');
  return parts.join(' · ');
}

type SubscriptionFormProps = {
  initial: Subscription | null;
  onSave: (input: SubscriptionInput) => Promise<boolean>;
  onClose: () => void;
};

function SubscriptionForm({ initial, onSave, onClose }: SubscriptionFormProps) {
  const [label, setLabel] = useState(initial?.label ?? '');
  const [category, setCategory] = useState<SubscriptionCategory>(initial?.category ?? 'streaming');
  const [cents, setCents] = useState<Cents>(initial?.amountCents ?? 0);
  const [day, setDay] = useState<number | null>(() => initial?.billingDay ?? todayDay());
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>(initial?.cycle ?? 'monthly');
  const [share, setShare] = useState<number | null>(initial?.shareCount ?? null);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const labelError = submitted && label.trim() === '' ? LABEL_REQUIRED : undefined;
  const amountError = submitted && cents <= 0 ? AMOUNT_REQUIRED : undefined;
  const dayError = submitted && day === null ? DAY_REQUIRED : undefined;

  /**
   * A prévia passa pelo MOTOR em vez de repetir a conta aqui: anual vira mensal
   * arredondado e rachar divide de novo. Duas implementações da mesma regra
   * divergem no centavo, e o número da folha desmentiria o do cabeçalho.
   */
  const monthlyCents = subscriptionMonthlyCents({
    id: '',
    label: '',
    category,
    amountCents: cents,
    billingDay: day ?? 1,
    cycle,
    shareCount: share,
    createdAt: '',
    cancelledAt: null,
  });
  // Anual e rachada fazem a cobrança ser diferente do peso mensal. Quando os
  // dois números batem, dizer isso de novo é só ruído.
  const showsPreview = cents > 0 && monthlyCents !== cents;

  async function submit(): Promise<void> {
    setSubmitted(true);
    if (label.trim() === '' || cents <= 0 || day === null) return;

    setSaving(true);
    const saved = await onSave({
      label: label.trim(),
      category,
      amountCents: cents,
      billingDay: day,
      cycle,
      shareCount: share,
    });
    if (saved) onClose();
    else setSaving(false);
  }

  return (
    <>
      <TextField
        label="Assinatura de quê?"
        value={label}
        onChangeText={setLabel}
        placeholder="Streaming da série que você não termina"
        error={labelError}
        maxLength={60}
        autoFocus={initial === null}
      />

      <Field label="Categoria">
        <View style={styles.chips}>
          {SUBSCRIPTION_CATEGORIES.map((option) => (
            <Chip
              key={option}
              label={SUBSCRIPTION_META[option].label}
              icon={SUBSCRIPTION_META[option].emoji}
              selected={category === option}
              onPress={() => setCategory(option)}
            />
          ))}
        </View>
      </Field>

      <CurrencyField
        label="Quanto vem na cobrança?"
        cents={cents}
        onChangeCents={setCents}
        error={amountError}
        hint={
          cycle === 'yearly' ? 'O valor cheio da cobrança anual, não o mês dividido.' : undefined
        }
      />

      <Field label="Com que frequência cobra?">
        <SegmentedControl
          options={CYCLE_OPTIONS}
          value={cycle}
          onChange={(key) => setCycle(key === 'yearly' ? 'yearly' : 'monthly')}
        />
      </Field>

      <View style={styles.dayBlock}>
        <DayField
          label="Cobra todo dia"
          value={day}
          onChange={setDay}
          hint="Dia 31 vira o último dia nos meses que não têm 31."
        />
        {dayError ? (
          <AppText variant="small" tone="negative">
            {dayError}
          </AppText>
        ) : null}
      </View>

      <Field
        label="Rachada entre quantas pessoas?"
        hint='Contando você. Deixa em "Só eu" se você paga tudo.'
      >
        <View style={styles.chips}>
          {SHARE_OPTIONS.map((option) => (
            <Chip
              key={option.key}
              label={option.label}
              selected={share === option.value}
              onPress={() => setShare(option.value)}
            />
          ))}
        </View>
      </Field>

      {showsPreview ? (
        <AppText variant="small" tone="secondary">
          {`No seu mês isso pesa ${formatCents(monthlyCents)} — é esse número que entra na conta, não o da cobrança.`}
        </AppText>
      ) : null}

      <Button
        label={saving ? 'Salvando…' : 'Salvar'}
        onPress={submit}
        disabled={saving}
        size="lg"
        full
      />
    </>
  );
}

function AssinaturasTab(): ReactNode {
  const subscriptions = useArrego((s) => s.subscriptions);
  const addSubscription = useArrego((s) => s.addSubscription);
  const updateSubscription = useArrego((s) => s.updateSubscription);
  const cancelSubscription = useArrego((s) => s.cancelSubscription);
  const removeSubscription = useArrego((s) => s.removeSubscription);
  const snapshot = useSnapshot();
  const sheet = useSheet<Subscription>();

  const active = subscriptions.filter((sub) => sub.cancelledAt === null);
  const cancelled = subscriptions.filter((sub) => sub.cancelledAt !== null);

  const hasIncome = snapshot.incomeTotalCents > 0;
  const share = ratio(snapshot.subscriptionsCents, snapshot.incomeTotalCents);
  const heavy = hasIncome && share > SUBSCRIPTION_SHARE_LIMIT;

  const save = (input: SubscriptionInput): Promise<boolean> =>
    didSave(
      sheet.target !== null ? updateSubscription(sheet.target.id, input) : addSubscription(input),
    );

  function confirm(subscription: Subscription): void {
    if (subscription.cancelledAt !== null) {
      Alert.alert(
        subscription.label,
        'Reativar volta a contar ela no seu mês. Apagar some com ela de vez, e some junto a prova de que você cortou esse gasto.',
        [
          { text: 'Voltar', style: 'cancel' },
          {
            text: 'Reativar',
            onPress: () => void updateSubscription(subscription.id, { cancelledAt: null }),
          },
          {
            text: 'Apagar',
            style: 'destructive',
            onPress: () => void removeSubscription(subscription.id),
          },
        ],
      );
      return;
    }

    Alert.alert(
      subscription.label,
      'Cancelei para de contar daqui pra frente e guarda no histórico que você cortou. Apagar some com ela de tudo, como se nunca tivesse existido.',
      [
        { text: 'Voltar', style: 'cancel' },
        { text: 'Cancelei', onPress: () => void cancelSubscription(subscription.id) },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: () => void removeSubscription(subscription.id),
        },
      ],
    );
  }

  return (
    <>
      <TotalHeader
        label="Assinaturas, por mês"
        cents={snapshot.subscriptionsCents}
        caption={
          hasIncome
            ? `${formatPercent(share)} da sua renda · o saudável é ficar abaixo de 10%`
            : 'Cadastra sua renda em "Entrou" e eu te digo o quanto isso pesa.'
        }
      >
        {heavy ? (
          <View style={styles.badge}>
            <Badge severity="warning" label="Cancela uma. Só uma." />
          </View>
        ) : null}
      </TotalHeader>

      <Button label="Nova assinatura" icon="+" onPress={sheet.openNew} full />

      {active.length > 0 ? (
        <Card padded={false} style={styles.list}>
          {active.map((subscription) => (
            <ListRow
              key={subscription.id}
              title={subscription.label}
              subtitle={subscriptionSubtitle(subscription)}
              leading={
                <AppText variant="heading">{SUBSCRIPTION_META[subscription.category].emoji}</AppText>
              }
              // O valor da linha é o que a assinatura pesa NO MÊS, não o que
              // aparece na cobrança: anual e rachada mentiriam contra o total
              // do cabeçalho, que soma exatamente isto.
              trailing={
                <MoneyText cents={subscriptionMonthlyCents(subscription)} tone="neutral" />
              }
              onPress={() => sheet.openEdit(subscription)}
              onLongPress={() => confirm(subscription)}
            />
          ))}
        </Card>
      ) : (
        <EmptyState
          emoji="📺"
          title="Nenhuma assinatura"
          body="Ou você não assina nada, ou esqueceu de alguma. Estatisticamente, é a segunda. Abre a fatura do mês passado e cadastra o que aparecer — é o gasto que mais some do radar."
        />
      )}

      {cancelled.length > 0 ? (
        <ArchivedSection title="Canceladas">
          {cancelled.map((subscription) => (
            <ListRow
              key={subscription.id}
              title={subscription.label}
              subtitle={subscriptionSubtitle(subscription)}
              leading={
                <AppText variant="heading">{SUBSCRIPTION_META[subscription.category].emoji}</AppText>
              }
              // Aqui é a cobrança crua, não o peso mensal: `subscriptionMonthlyCents`
              // devolve 0 para cancelada (e está certo — ela não pesa mais no mês).
              // Uma lista de "R$ 0,00" não contaria nada sobre o que foi cortado.
              trailing={<MoneyText cents={subscription.amountCents} tone="neutral" />}
              onPress={() => sheet.openEdit(subscription)}
              onLongPress={() => confirm(subscription)}
            />
          ))}
        </ArchivedSection>
      ) : null}

      <Sheet
        visible={sheet.visible}
        onClose={sheet.close}
        title={sheet.target !== null ? 'Editar assinatura' : 'Nova assinatura'}
      >
        <SubscriptionForm
          key={sheet.session}
          initial={sheet.target}
          onSave={save}
          onClose={sheet.close}
        />
      </Sheet>
    </>
  );
}

/* ──────────────────────────────── Tela ────────────────────────────────── */

type Tab = 'entrou' | 'contas' | 'assinaturas';

const TABS: SegmentedOption[] = [
  { key: 'entrou', label: 'Entrou' },
  { key: 'contas', label: 'Contas' },
  { key: 'assinaturas', label: 'Assinaturas' },
];

function toTab(key: string): Tab {
  return key === 'contas' ? 'contas' : key === 'assinaturas' ? 'assinaturas' : 'entrou';
}

export default function GranaScreen(): ReactNode {
  const [tab, setTab] = useState<Tab>('entrou');
  const error = useArrego((s) => s.error);

  return (
    <Screen scroll>
      <View style={styles.screen}>
        <AppText variant="title">Grana</AppText>

        <SegmentedControl options={TABS} value={tab} onChange={(key) => setTab(toTab(key))} />

        {/* A store engole a exceção da escrita e a transforma em `error`. Sem
            este bloco, um item que não gravou vira uma folha que fecha e uma
            lista que não muda — a pessoa acha que salvou. */}
        {error !== null ? (
          <Card tone="sunken" style={styles.error}>
            <Badge severity="critical" label="Não deu para salvar" />
            <AppText variant="small" tone="secondary">
              {error}
            </AppText>
          </Card>
        ) : null}

        {/* Cada aba é desmontada ao sair, e isso é de propósito: a folha aberta e
            o rascunho pela metade não sobrevivem à troca de assunto. */}
        {tab === 'entrou' ? <EntrouTab /> : tab === 'contas' ? <ContasTab /> : <AssinaturasTab />}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.lg },
  header: { gap: spacing.xs },
  badge: { marginTop: spacing.sm },
  list: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, gap: spacing.xs },
  section: { gap: spacing.xs },
  sectionNote: { marginBottom: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  dayBlock: { gap: spacing.xs },
  error: { gap: spacing.sm },
});
