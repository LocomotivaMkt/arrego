/**
 * Tela "Grana": o que entra, o que sai todo mês e o que sai sem ninguém ver.
 *
 * As três abas são a mesma mecânica com três tabelas. O que muda de verdade
 * entre elas é a REGRA DE ESCRITA de cada uma — e é aí que mora o cuidado deste
 * arquivo:
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
 *
 * 3. A CATEGORIA SAIU DA LINHA. "Moradia · vence todo dia 10" embaixo de
 *    "Aluguel" é a definição de ruído: ninguém precisa que a gente explique o
 *    que é aluguel. Na linha ficou o dia; a categoria virou o ícone (que é
 *    ritmo, não identidade) e continua inteira em dois lugares onde não custa
 *    nada — no `accessibilityLabel`, que o leitor de tela anuncia, e no chip
 *    marcado quando a folha abre para editar.
 */

import type { ExpenseInput, IncomeInput, SubscriptionInput } from '@/db/repositories';
import { subscriptionMonthlyCents } from '@/engine/analysis';
import { useArrego, useSnapshot } from '@/store/useArrego';
import { HIT_SLOP, MIN_TOUCH, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
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
  CurrencyField,
  DayField,
  Field,
  Icon,
  ListRow,
  MoneyText,
  Reveal,
  Row,
  Screen,
  Sheet,
  TextField,
  type IconName,
  type MoneyTone,
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
import { useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

/* ────────────────────────────── Catálogos ─────────────────────────────── */

type Meta = { icon: IconName; label: string };

const INCOME_META = {
  salary: { icon: 'work', label: 'Salário' },
  allowance: { icon: 'profile', label: 'Mesada' },
  commission: { icon: 'trendUp', label: 'Comissão' },
  freelance: { icon: 'tool', label: 'Freela' },
  gift: { icon: 'gift', label: 'Presente' },
  other: { icon: 'money', label: 'Outro' },
} as const satisfies Record<IncomeKind, Meta>;

const EXPENSE_META = {
  moradia: { icon: 'home', label: 'Moradia' },
  contas: { icon: 'bill', label: 'Contas' },
  mercado: { icon: 'market', label: 'Mercado' },
  transporte: { icon: 'transport', label: 'Transporte' },
  saude: { icon: 'health', label: 'Saúde' },
  educacao: { icon: 'learn', label: 'Educação' },
  lazer: { icon: 'leisure', label: 'Lazer' },
  outros: { icon: 'box', label: 'Outros' },
} as const satisfies Record<ExpenseCategory, Meta>;

const SUBSCRIPTION_META = {
  streaming: { icon: 'tv', label: 'Streaming' },
  musica: { icon: 'music', label: 'Música' },
  games: { icon: 'games', label: 'Games' },
  academia: { icon: 'gym', label: 'Academia' },
  apps: { icon: 'phone', label: 'Apps' },
  outros: { icon: 'box', label: 'Outros' },
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

const LABEL_REQUIRED = 'Dá um nome.';
const AMOUNT_REQUIRED = 'Precisa de um valor.';
const DAY_REQUIRED = 'Escolhe um dia.';

/* ─────────────────────── Peças locais (e por quê) ─────────────────────── */

/**
 * ORÇAMENTO DE AMARELO DESTA TELA (a regra do amarelo, em tokens.ts): o único
 * amarelo é o botão "+ Nova ...", a ação principal. É por isso que a seleção
 * daqui — abas e chips — é local em vez de vir do kit: `SegmentedControl` e
 * `Chip` pintam o estado ativo com `brand.amber`, e com eles esta tela teria
 * quatro superfícies de marca disputando a mesma atenção. Estado ativo é a
 * ÚLTIMA precedência do amarelo; o botão ganha dele.
 *
 * O `DayField` continua sendo o do kit, amarelo e tudo: o contrato dele (tocar
 * no dia já escolhido é o único caminho de volta para `null`) é sutil demais
 * para ser reescrito aqui só por causa de cor. Fica como dívida do kit.
 */

type SwitchOption = { key: string; label: string };

/**
 * Seleção marcada por TINTA, não por marca: pastilha `ink.primary` com texto
 * `ink.inverse`. Os dois invertem juntos no tema escuro (pastilha clara, texto
 * escuro) e nenhum dos dois lados fica abaixo de 4.5:1.
 *
 * Não se chama `Switch` porque esse nome já é do React Native, e lá ele é o
 * liga/desliga — importar um sem querer no lugar do outro é fácil demais.
 */
function Segmented({
  options,
  value,
  onChange,
}: {
  options: readonly SwitchOption[];
  value: string;
  onChange: (key: string) => void;
}) {
  const { colors } = useTheme();

  return (
    <View
      accessibilityRole="radiogroup"
      style={[styles.switch, { backgroundColor: colors.surfaceSunken }]}
    >
      {options.map((option) => {
        const selected = option.key === value;
        return (
          <Pressable
            key={option.key}
            onPress={() => onChange(option.key)}
            accessible
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            // Alvo cheio em vez de hitSlop: segmentos são vizinhos coladinhos e
            // o slop de um invadiria a área do outro.
            style={({ pressed }) => [
              styles.segment,
              selected && { backgroundColor: colors.ink.primary },
              pressed && styles.pressed,
            ]}
          >
            <AppText
              variant="small"
              numberOfLines={1}
              style={[
                styles.segmentLabel,
                { color: selected ? colors.ink.inverse : colors.ink.secondary },
              ]}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Chip de escolha. Marcado = mesma superfície, tinta primária e um anel: a cor
 * sozinha (secondary → primary) é diferença fraca demais para carregar "está
 * selecionado" sem ajuda.
 */
function PickerChip({
  label,
  icon,
  selected,
  onPress,
}: {
  label: string;
  icon?: IconName;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const ink = selected ? colors.ink.primary : colors.ink.secondary;

  return (
    <Pressable
      onPress={onPress}
      hitSlop={HIT_SLOP}
      accessible
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: colors.surfaceSunken,
          borderColor: selected ? colors.ink.primary : 'transparent',
        },
        pressed && styles.pressed,
      ]}
    >
      {/* Mesma tinta do rótulo: sem `color`, o glifo cai em `ink.primary` e o
          chip não marcado teria ícone forte com texto apagado. */}
      {icon ? <Icon name={icon} size={14} color={ink} /> : null}
      <AppText variant="small" numberOfLines={1} style={[styles.chipLabel, { color: ink }]}>
        {label}
      </AppText>
    </Pressable>
  );
}

/**
 * Vazio: um glifo apagado, um título, uma linha e a ação. Um segundo botão só
 * aparece quando a aba tem dois jeitos de começar, como "Saiu": anotar o gasto
 * do dia ou cadastrar uma conta que cai todo mês.
 */
function Empty({
  icon,
  title,
  line,
  actionLabel,
  actionIcon = 'add',
  onAction,
  secondaryLabel,
  onSecondary,
}: {
  icon: IconName;
  title: string;
  line: string;
  actionLabel: string;
  actionIcon?: IconName;
  onAction: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}) {
  return (
    <View style={styles.empty}>
      <Icon name={icon} size={24} tone="muted" />
      <AppText variant="subheading">{title}</AppText>
      <AppText variant="small" tone="muted" style={styles.centered}>
        {line}
      </AppText>
      <View style={styles.emptyActions}>
        <Button label={actionLabel} icon={actionIcon} onPress={onAction} />
        {secondaryLabel !== undefined && onSecondary !== undefined ? (
          <Button label={secondaryLabel} variant="secondary" onPress={onSecondary} />
        ) : null}
      </View>
    </View>
  );
}

/**
 * O cabeçalho da aba: o rótulo cinza, o número, e o que o número precisar de
 * apoio. Sem card — card branco em cima do plano cinza para segurar duas linhas
 * de texto é moldura, e moldura foi metade do problema.
 */
function TotalHeader({
  label,
  cents,
  tone = 'neutral',
  children,
}: {
  label: string;
  cents: Cents;
  tone?: MoneyTone;
  children?: ReactNode;
}) {
  return (
    // Sem `accessible` no grupo: ele engoliria o Reveal, que é um botão.
    <View style={styles.head}>
      <AppText variant="caption" tone="muted">
        {label}
      </AppText>
      <MoneyText cents={cents} variant="title" tone={tone} />
      {children}
    </View>
  );
}

/** Rótulo à esquerda, valor à direita. A conta que estava no cabeçalho. */
function SplitLine({ label, cents }: { label: string; cents: Cents }) {
  return (
    <Row justify="space-between">
      <AppText variant="small" tone="secondary">
        {label}
      </AppText>
      <MoneyText cents={cents} variant="small" tone="neutral" tabular />
    </Row>
  );
}

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

const RECURRING_OPTIONS: readonly SwitchOption[] = [
  { key: 'sim', label: 'Todo mês' },
  { key: 'nao', label: 'Uma vez só' },
];

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

/**
 * A dica do dia só aparece quando ela informa alguma coisa.
 *
 * Item pontual mostra a data cheia porque o mês dele pode não ser o da tela (o
 * freela de março continua em março). Item recorrente só fala quando o dia
 * escolhido não existe em todo mês — nos outros 28 dias a dica seria uma regra
 * de borda contada para quem nunca vai esbarrar nela.
 */
function dayHint(day: number | null, recurring: boolean, anchor: MonthKey): string | undefined {
  if (!recurring) {
    if (day === null) return `Dentro de ${formatMonthLong(anchor)}.`;
    // A data já sai encaixada no mês: escolher 31 em fevereiro mostra "28 de
    // fevereiro" aqui, que é o encaixe se explicando sozinho.
    return formatDayMonth(dateInMonth(day, anchor));
  }
  return day !== null && day > 28 ? 'Nos meses curtos, cai no último dia.' : undefined;
}

/**
 * A diferença entre arquivar e apagar, fechada por padrão. É uma explicação de
 * três linhas — o lugar dela é atrás de um toque, não aberta em cima do
 * formulário toda vez que alguém quer corrigir um valor.
 *
 * Serve de brinde: a ação mora num toque longo na linha, que é um gesto que
 * ninguém descobre sozinho. Aqui ela está escrita.
 */
function DeleteHelp({ text }: { text: string }) {
  return (
    <Reveal label="Arquivar ou apagar?">
      <AppText variant="small" tone="secondary">
        {text}
      </AppText>
    </Reveal>
  );
}

const HELP_ITEM =
  'Segure a linha na lista. Arquivar para de contar daqui pra frente e mantém os meses passados certos; apagar some com ela de tudo, inclusive do histórico. Item de uma vez só não arquiva, ele já pertence ao mês em que entrou.';

const HELP_SUBSCRIPTION =
  'Segure a linha na lista. "Cancelei" para de contar daqui pra frente e guarda a prova de que você cortou; apagar some com ela de tudo, como se nunca tivesse existido.';

/* ─────────────────────────────── Entradas ─────────────────────────────── */

function incomeWhen(income: Income): string {
  return income.recurring
    ? income.dayOfMonth !== null
      ? `todo dia ${income.dayOfMonth}`
      : 'todo mês'
    : income.receivedOn !== null
      ? formatDayMonth(income.receivedOn)
      : 'sem data';
}

function incomeSubtitle(income: Income): string {
  const when = incomeWhen(income);
  return income.archivedAt !== null ? `${when} · arquivada` : when;
}

/** A categoria saiu da linha, mas não do app: quem lê por áudio continua ouvindo. */
function incomeLabel(income: Income): string {
  return `${income.label}, ${INCOME_META[income.kind].label}, ${incomeSubtitle(income)}, ${formatCents(income.amountCents)}`;
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
        label="Nome"
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
            <PickerChip
              key={option}
              label={INCOME_META[option].label}
              icon={INCOME_META[option].icon}
              selected={kind === option}
              onPress={() => setKind(option)}
            />
          ))}
        </View>
      </Field>

      <CurrencyField label="Valor" cents={cents} onChangeCents={setCents} error={amountError} />

      {/* Sem rótulo: "Cai todo mês?" em cima de "Todo mês / Uma vez só" é a
          pergunta e a resposta na mesma tela. */}
      <Segmented
        options={RECURRING_OPTIONS}
        value={recurring ? 'sim' : 'nao'}
        onChange={(key) => setRecurring(key === 'sim')}
      />

      <View style={styles.dayBlock}>
        <DayField
          label={recurring ? 'Cai todo dia' : 'Entrou no dia'}
          value={day}
          onChange={setDay}
          hint={dayHint(day, recurring, anchor)}
        />
        {dayError ? (
          <AppText variant="small" tone="negative">
            {dayError}
          </AppText>
        ) : null}
      </View>

      {initial !== null ? <DeleteHelp text={HELP_ITEM} /> : null}

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
    didSave(sheet.target !== null ? updateIncome(sheet.target.id, input) : addIncome(input));

  function confirm(income: Income): void {
    if (income.archivedAt !== null) {
      Alert.alert(income.label, 'Reativar volta a contar. Apagar some com o histórico.', [
        { text: 'Voltar', style: 'cancel' },
        { text: 'Reativar', onPress: () => void updateIncome(income.id, { archivedAt: null }) },
        { text: 'Apagar', style: 'destructive', onPress: () => void removeIncome(income.id) },
      ]);
      return;
    }

    if (income.recurring) {
      Alert.alert(income.label, 'Arquivar mantém o histórico. Apagar não.', [
        { text: 'Voltar', style: 'cancel' },
        { text: 'Arquivar', onPress: () => void archiveIncome(income.id) },
        { text: 'Apagar', style: 'destructive', onPress: () => void removeIncome(income.id) },
      ]);
      return;
    }

    Alert.alert(income.label, 'Apaga de vez, sem histórico.', [
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
      >
        <Reveal label="Ver a conta">
          <SplitLine label="Todo mês" cents={snapshot.incomeFixedCents} />
          <SplitLine label="Só neste mês" cents={snapshot.incomeVariableCents} />
        </Reveal>
      </TotalHeader>

      {active.length > 0 ? (
        <>
          <Button label="Nova entrada" icon="add" onPress={sheet.openNew} full />

          <View>
            {active.map((income) => (
              <ListRow
                key={income.id}
                title={income.label}
                subtitle={incomeSubtitle(income)}
                leading={<Icon name={INCOME_META[income.kind].icon} />}
                trailing={<MoneyText cents={income.amountCents} signed />}
                accessibilityLabel={incomeLabel(income)}
                onPress={() => sheet.openEdit(income)}
                onLongPress={() => confirm(income)}
              />
            ))}
          </View>
        </>
      ) : (
        <Empty
          icon="money"
          title="Nada entrando"
          line="Salário, mesada, bico, pix da vó, vale tudo."
          actionLabel="Nova entrada"
          onAction={sheet.openNew}
        />
      )}

      {archived.length > 0 ? (
        <View style={styles.section}>
          <AppText variant="caption" tone="muted">
            Arquivadas
          </AppText>
          <View>
            {archived.map((income) => (
              <ListRow
                key={income.id}
                title={income.label}
                subtitle={incomeSubtitle(income)}
                leading={<Icon name={INCOME_META[income.kind].icon} tone="muted" />}
                trailing={<MoneyText cents={income.amountCents} tone="neutral" />}
                accessibilityLabel={incomeLabel(income)}
                onPress={() => sheet.openEdit(income)}
                onLongPress={() => confirm(income)}
              />
            ))}
          </View>
        </View>
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

/* ─────────────────── Saiu (conta fixa + gasto avulso) ──────────────────── */

function expenseWhen(expense: Expense): string {
  return expense.recurring
    ? expense.dayOfMonth !== null
      ? `todo dia ${expense.dayOfMonth}`
      : 'todo mês'
    : expense.spentOn !== null
      ? formatDayMonth(expense.spentOn)
      : 'sem data';
}

function expenseSubtitle(expense: Expense): string {
  const when = expenseWhen(expense);
  return expense.archivedAt !== null ? `${when} · arquivada` : when;
}

function expenseLabel(expense: Expense): string {
  return `${expense.label}, ${EXPENSE_META[expense.category].label}, ${expenseSubtitle(expense)}, ${formatCents(expense.amountCents)}`;
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
        label="Nome"
        value={label}
        onChangeText={setLabel}
        placeholder="Aluguel"
        error={labelError}
        maxLength={60}
        autoFocus={initial === null}
      />

      <Field label="Categoria">
        <View style={styles.chips}>
          {EXPENSE_CATEGORIES.map((option) => (
            <PickerChip
              key={option}
              label={EXPENSE_META[option].label}
              icon={EXPENSE_META[option].icon}
              selected={category === option}
              onPress={() => setCategory(option)}
            />
          ))}
        </View>
      </Field>

      <CurrencyField label="Valor" cents={cents} onChangeCents={setCents} error={amountError} />

      <Segmented
        options={RECURRING_OPTIONS}
        value={recurring ? 'sim' : 'nao'}
        onChange={(key) => setRecurring(key === 'sim')}
      />

      <View style={styles.dayBlock}>
        <DayField
          label={recurring ? 'Vence todo dia' : 'Gastei no dia'}
          value={day}
          onChange={setDay}
          hint={dayHint(day, recurring, anchor)}
        />
        {dayError ? (
          <AppText variant="small" tone="negative">
            {dayError}
          </AppText>
        ) : null}
      </View>

      {initial !== null ? <DeleteHelp text={HELP_ITEM} /> : null}

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

/* ── Filtro e ordem da lista de "Saiu" ── */

type ExpenseFilter = 'tudo' | 'fixas' | 'avulsas';

const EXPENSE_FILTERS: readonly SwitchOption[] = [
  { key: 'tudo', label: 'Tudo' },
  { key: 'fixas', label: 'Fixas' },
  { key: 'avulsas', label: 'Avulsas' },
];

function toExpenseFilter(key: string): ExpenseFilter {
  return key === 'fixas' ? 'fixas' : key === 'avulsas' ? 'avulsas' : 'tudo';
}

function matchesFilter(expense: Expense, filter: ExpenseFilter): boolean {
  if (filter === 'fixas') return expense.recurring;
  if (filter === 'avulsas') return !expense.recurring;
  return true;
}

/**
 * Dia do mês em que o item pesa: a conta fixa cai no `dayOfMonth`, o gasto
 * avulso no dia do `spentOn`. É a chave comum que põe os dois tipos na mesma
 * ordem, como um calendário do mês. Sem dia (não deveria ocorrer) vai pro fim.
 */
function expenseDay(expense: Expense): number {
  if (expense.recurring) return expense.dayOfMonth ?? 99;
  return expense.spentOn !== null ? dayOfISO(expense.spentOn) : 99;
}

function byDayAsc(a: Expense, b: Expense): number {
  return expenseDay(a) - expenseDay(b);
}

/**
 * O nome é o que a retrospectiva do fim do mês lê (ver `engine/retrospect.ts`):
 * "iFood" seis vezes vira a dica "delivery apareceu 6 vezes". Por isso a dica do
 * campo pede um nome claro, não um "gasto 1".
 */
const QUICK_NAME_HINT = 'Vira a dica do fim do mês. Escreve claro: iFood, Uber, padaria.';

/**
 * GASTO RÁPIDO. O caso "pão na padaria" em três toques, não oito: sem toggle de
 * recorrência (é sempre pontual) e sem perguntar a data (é hoje). Quem quer a
 * conta que cai todo mês usa o formulário completo pelo botão "Nova conta fixa".
 */
type QuickExpenseFormProps = {
  month: MonthKey;
  onSave: (input: ExpenseInput) => Promise<boolean>;
  onClose: () => void;
};

function QuickExpenseForm({ month, onSave, onClose }: QuickExpenseFormProps) {
  const [cents, setCents] = useState<Cents>(0);
  const [label, setLabel] = useState('');
  // Gasto do dia a dia quase sempre é comida ou compra: começa em Mercado, que é
  // o palpite que a pessoa menos vai precisar trocar.
  const [category, setCategory] = useState<ExpenseCategory>('mercado');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const amountError = submitted && cents <= 0 ? AMOUNT_REQUIRED : undefined;
  const labelError = submitted && label.trim() === '' ? LABEL_REQUIRED : undefined;

  async function submit(): Promise<void> {
    setSubmitted(true);
    if (cents <= 0 || label.trim() === '') return;

    setSaving(true);
    // Pontual e no dia de hoje: o CHECK do schema exige a data e proíbe o
    // `dayOfMonth` quando não é recorrente. `defaultDay` devolve hoje no mês
    // corrente e o dia 1 num mês que a pessoa esteja só olhando.
    const saved = await onSave({
      label: label.trim(),
      category,
      amountCents: cents,
      recurring: false,
      dayOfMonth: null,
      spentOn: dateInMonth(defaultDay(month), month),
    });
    if (saved) onClose();
    else setSaving(false);
  }

  return (
    <>
      <CurrencyField
        label="Quanto foi"
        cents={cents}
        onChangeCents={setCents}
        error={amountError}
        autoFocus
      />

      <TextField
        label="No que gastou"
        value={label}
        onChangeText={setLabel}
        placeholder="Pão na padaria"
        hint={QUICK_NAME_HINT}
        error={labelError}
        maxLength={60}
      />

      <Field label="Categoria">
        <View style={styles.chips}>
          {EXPENSE_CATEGORIES.map((option) => (
            <PickerChip
              key={option}
              label={EXPENSE_META[option].label}
              icon={EXPENSE_META[option].icon}
              selected={category === option}
              onPress={() => setCategory(option)}
            />
          ))}
        </View>
      </Field>

      <Button
        label={saving ? 'Salvando…' : 'Anotar gasto'}
        onPress={submit}
        disabled={saving}
        size="lg"
        full
      />
    </>
  );
}

function SaiuTab(): ReactNode {
  const expenses = useArrego((s) => s.expenses);
  const month = useArrego((s) => s.month);
  const addExpense = useArrego((s) => s.addExpense);
  const updateExpense = useArrego((s) => s.updateExpense);
  const archiveExpense = useArrego((s) => s.archiveExpense);
  const removeExpense = useArrego((s) => s.removeExpense);
  const snapshot = useSnapshot();

  // Dois caminhos de escrita, duas folhas: o gasto rápido (sempre pontual, só
  // "novo") e o formulário completo (conta fixa nova + edição de qualquer item,
  // fixa ou avulsa). Editar uma linha abre SEMPRE o completo, senão não daria
  // pra mudar recorrência nem dia de um gasto já salvo.
  const quick = useSheet<Expense>();
  const full = useSheet<Expense>();

  const [filter, setFilter] = useState<ExpenseFilter>('tudo');

  const active = expenses.filter((expense) => expense.archivedAt === null);
  const archived = expenses.filter((expense) => expense.archivedAt !== null);

  const visible = active.filter((expense) => matchesFilter(expense, filter)).sort(byDayAsc);
  // Arquivar só é oferecido a item fixo, então "Arquivadas" some sozinho no
  // filtro "Avulsas" em vez de mostrar contas fixas fora do assunto.
  const visibleArchived = archived.filter((expense) => matchesFilter(expense, filter));

  // Só a tabela `expenses`: assinatura e parcela têm aba e tela próprias, e
  // somá-las aqui faria este total brigar com o do cabeçalho de lá.
  const totalCents = snapshot.expensesFixedCents + snapshot.expensesVariableCents;

  const saveQuick = (input: ExpenseInput): Promise<boolean> => didSave(addExpense(input));
  const saveFull = (input: ExpenseInput): Promise<boolean> =>
    didSave(full.target !== null ? updateExpense(full.target.id, input) : addExpense(input));

  function confirm(expense: Expense): void {
    if (expense.archivedAt !== null) {
      Alert.alert(expense.label, 'Reativar volta a contar. Apagar some com o histórico.', [
        { text: 'Voltar', style: 'cancel' },
        { text: 'Reativar', onPress: () => void updateExpense(expense.id, { archivedAt: null }) },
        { text: 'Apagar', style: 'destructive', onPress: () => void removeExpense(expense.id) },
      ]);
      return;
    }

    if (expense.recurring) {
      Alert.alert(expense.label, 'Arquivar mantém o histórico. Apagar não.', [
        { text: 'Voltar', style: 'cancel' },
        { text: 'Arquivar', onPress: () => void archiveExpense(expense.id) },
        { text: 'Apagar', style: 'destructive', onPress: () => void removeExpense(expense.id) },
      ]);
      return;
    }

    Alert.alert(expense.label, 'Apaga de vez, sem histórico.', [
      { text: 'Voltar', style: 'cancel' },
      { text: 'Apagar', style: 'destructive', onPress: () => void removeExpense(expense.id) },
    ]);
  }

  return (
    <>
      <TotalHeader label={`Saiu em ${formatMonthLong(month)}`} cents={totalCents}>
        <Reveal label="Ver a conta">
          <SplitLine label="Todo mês" cents={snapshot.expensesFixedCents} />
          <SplitLine label="Só neste mês" cents={snapshot.expensesVariableCents} />
        </Reveal>
      </TotalHeader>

      {active.length > 0 ? (
        <>
          {/* Amarelo só em "Gastei", a ação principal desta aba. "Nova conta
              fixa" é secondary: cresce só o quanto o texto pede, e o "Gastei"
              estica pra ocupar o resto e continuar sendo o maior alvo. */}
          <Row gap={spacing.sm}>
            <View style={styles.grow}>
              <Button label="Gastei" icon="minus" onPress={quick.openNew} full />
            </View>
            <Button label="Nova conta fixa" variant="secondary" onPress={full.openNew} />
          </Row>

          <Segmented
            options={EXPENSE_FILTERS}
            value={filter}
            onChange={(key) => setFilter(toExpenseFilter(key))}
          />

          {visible.length > 0 ? (
            <View>
              {visible.map((expense) => (
                <ListRow
                  key={expense.id}
                  title={expense.label}
                  subtitle={expenseSubtitle(expense)}
                  leading={<Icon name={EXPENSE_META[expense.category].icon} />}
                  trailing={<MoneyText cents={expense.amountCents} tone="neutral" />}
                  accessibilityLabel={expenseLabel(expense)}
                  onPress={() => full.openEdit(expense)}
                  onLongPress={() => confirm(expense)}
                />
              ))}
            </View>
          ) : (
            <AppText variant="small" tone="muted" style={styles.centered}>
              {filter === 'fixas'
                ? 'Nenhuma conta fixa por aqui.'
                : 'Nenhum gasto avulso por aqui.'}
            </AppText>
          )}
        </>
      ) : (
        <Empty
          icon="cash"
          title="Nada saiu ainda"
          line="Um lanche, o busão, a conta de luz: anota tudo aqui."
          actionLabel="Gastei"
          actionIcon="minus"
          onAction={quick.openNew}
          secondaryLabel="Nova conta fixa"
          onSecondary={full.openNew}
        />
      )}

      {visibleArchived.length > 0 ? (
        <View style={styles.section}>
          <AppText variant="caption" tone="muted">
            Arquivadas
          </AppText>
          <View>
            {visibleArchived.map((expense) => (
              <ListRow
                key={expense.id}
                title={expense.label}
                subtitle={expenseSubtitle(expense)}
                leading={<Icon name={EXPENSE_META[expense.category].icon} tone="muted" />}
                trailing={<MoneyText cents={expense.amountCents} tone="neutral" />}
                accessibilityLabel={expenseLabel(expense)}
                onPress={() => full.openEdit(expense)}
                onLongPress={() => confirm(expense)}
              />
            ))}
          </View>
        </View>
      ) : null}

      <Sheet visible={quick.visible} onClose={quick.close} title="Novo gasto">
        <QuickExpenseForm
          key={quick.session}
          month={month}
          onSave={saveQuick}
          onClose={quick.close}
        />
      </Sheet>

      <Sheet
        visible={full.visible}
        onClose={full.close}
        title={full.target !== null ? 'Editar gasto' : 'Nova conta fixa'}
      >
        <ExpenseForm
          key={full.session}
          initial={full.target}
          month={month}
          onSave={saveFull}
          onClose={full.close}
        />
      </Sheet>
    </>
  );
}

/* ───────────────────────────── Assinaturas ────────────────────────────── */

const CYCLE_OPTIONS: readonly SwitchOption[] = [
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
  const parts = [
    subscription.cycle === 'yearly'
      ? `anual · dia ${subscription.billingDay}`
      : `todo dia ${subscription.billingDay}`,
  ];
  if (subscription.shareCount !== null && subscription.shareCount > 1) {
    parts.push(`rachada entre ${subscription.shareCount}`);
  }
  if (subscription.cancelledAt !== null) parts.push('cancelada');
  return parts.join(' · ');
}

function subscriptionLabel(subscription: Subscription, cents: Cents): string {
  return `${subscription.label}, ${SUBSCRIPTION_META[subscription.category].label}, ${subscriptionSubtitle(subscription)}, ${formatCents(cents)}`;
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
        label="Nome"
        value={label}
        onChangeText={setLabel}
        placeholder="Netflix"
        error={labelError}
        maxLength={60}
        autoFocus={initial === null}
      />

      <Field label="Categoria">
        <View style={styles.chips}>
          {SUBSCRIPTION_CATEGORIES.map((option) => (
            <PickerChip
              key={option}
              label={SUBSCRIPTION_META[option].label}
              icon={SUBSCRIPTION_META[option].icon}
              selected={category === option}
              onPress={() => setCategory(option)}
            />
          ))}
        </View>
      </Field>

      <CurrencyField
        label="Valor da cobrança"
        cents={cents}
        onChangeCents={setCents}
        error={amountError}
        hint={cycle === 'yearly' ? 'O valor cheio do ano.' : undefined}
      />

      <Segmented
        options={CYCLE_OPTIONS}
        value={cycle}
        onChange={(key) => setCycle(key === 'yearly' ? 'yearly' : 'monthly')}
      />

      <View style={styles.dayBlock}>
        <DayField
          label="Cobra todo dia"
          value={day}
          onChange={setDay}
          hint={dayHint(day, true, currentMonthKey())}
        />
        {dayError ? (
          <AppText variant="small" tone="negative">
            {dayError}
          </AppText>
        ) : null}
      </View>

      <Field label="Quem paga" hint="Contando você.">
        <View style={styles.chips}>
          {SHARE_OPTIONS.map((option) => (
            <PickerChip
              key={option.key}
              label={option.label}
              selected={share === option.value}
              onPress={() => setShare(option.value)}
            />
          ))}
        </View>
      </Field>

      {/* O que entra na conta do mês é este número, não o da cobrança. Como
          rótulo e valor, isso é uma linha; como frase, eram duas. */}
      {showsPreview ? (
        <Row justify="space-between">
          <AppText variant="small" tone="muted">
            Pesa no seu mês
          </AppText>
          <MoneyText cents={monthlyCents} tone="neutral" />
        </Row>
      ) : null}

      {initial !== null ? <DeleteHelp text={HELP_SUBSCRIPTION} /> : null}

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
      Alert.alert(subscription.label, 'Reativar volta a contar. Apagar some com o histórico.', [
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
      ]);
      return;
    }

    Alert.alert(subscription.label, '"Cancelei" mantém o histórico. Apagar não.', [
      { text: 'Voltar', style: 'cancel' },
      { text: 'Cancelei', onPress: () => void cancelSubscription(subscription.id) },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: () => void removeSubscription(subscription.id),
      },
    ]);
  }

  return (
    <>
      <TotalHeader label="Assinaturas, por mês" cents={snapshot.subscriptionsCents}>
        {heavy ? (
          <View style={styles.alert}>
            <Badge severity="warning" label={`${formatPercent(share)} da renda`} />
            <AppText variant="small" tone="secondary">
              Acima de 10% já pesa. Cancela uma, só uma.
            </AppText>
          </View>
        ) : (
          <AppText variant="small" tone="muted">
            {hasIncome ? `${formatPercent(share)} da renda` : 'Cadastra sua renda em Entrou.'}
          </AppText>
        )}
      </TotalHeader>

      {active.length > 0 ? (
        <>
          <Button label="Nova assinatura" icon="add" onPress={sheet.openNew} full />

          <View>
            {active.map((subscription) => {
              // O valor da linha é o que a assinatura pesa NO MÊS, não o que
              // aparece na cobrança: anual e rachada mentiriam contra o total
              // do cabeçalho, que soma exatamente isto.
              const monthlyCents = subscriptionMonthlyCents(subscription);
              return (
                <ListRow
                  key={subscription.id}
                  title={subscription.label}
                  subtitle={subscriptionSubtitle(subscription)}
                  leading={<Icon name={SUBSCRIPTION_META[subscription.category].icon} />}
                  trailing={<MoneyText cents={monthlyCents} tone="neutral" />}
                  accessibilityLabel={subscriptionLabel(subscription, monthlyCents)}
                  onPress={() => sheet.openEdit(subscription)}
                  onLongPress={() => confirm(subscription)}
                />
              );
            })}
          </View>
        </>
      ) : (
        <Empty
          icon="tv"
          title="Nenhuma assinatura"
          line="Abre a fatura do mês passado e confere."
          actionLabel="Nova assinatura"
          onAction={sheet.openNew}
        />
      )}

      {cancelled.length > 0 ? (
        <View style={styles.section}>
          <AppText variant="caption" tone="muted">
            Canceladas
          </AppText>
          <View>
            {cancelled.map((subscription) => (
              <ListRow
                key={subscription.id}
                title={subscription.label}
                subtitle={subscriptionSubtitle(subscription)}
                leading={<Icon name={SUBSCRIPTION_META[subscription.category].icon} tone="muted" />}
                // Aqui é a cobrança crua, não o peso mensal: `subscriptionMonthlyCents`
                // devolve 0 para cancelada (e está certo — ela não pesa mais no mês).
                // Uma lista de "R$ 0,00" não contaria nada sobre o que foi cortado.
                trailing={<MoneyText cents={subscription.amountCents} tone="neutral" />}
                accessibilityLabel={subscriptionLabel(subscription, subscription.amountCents)}
                onPress={() => sheet.openEdit(subscription)}
                onLongPress={() => confirm(subscription)}
              />
            ))}
          </View>
        </View>
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

type Tab = 'entrou' | 'saiu' | 'assinaturas';

const TABS: readonly SwitchOption[] = [
  { key: 'entrou', label: 'Entrou' },
  { key: 'saiu', label: 'Saiu' },
  { key: 'assinaturas', label: 'Assinaturas' },
];

function toTab(key: string): Tab {
  return key === 'saiu' ? 'saiu' : key === 'assinaturas' ? 'assinaturas' : 'entrou';
}

/**
 * Sem título "Grana": a barra de abas embaixo já diz onde a pessoa está, e um
 * "Grana" em `title` do lado do total em `title` são dois títulos brigando pelo
 * mesmo posto. O número é o título desta tela.
 */
export default function GranaScreen(): ReactNode {
  // `?aba=saiu` vem do atalho "Gastei" do Início: quem quer anotar um gasto na
  // fila da padaria chega direto na aba certa, sem passar por "Entrou". É o que
  // tira dois toques do caminho mais comum do app.
  const params = useLocalSearchParams<{ aba?: string }>();
  const [tab, setTab] = useState<Tab>(toTab(params.aba ?? 'entrou'));
  const error = useArrego((s) => s.error);

  return (
    <Screen scroll>
      <View style={styles.screen}>
        <Segmented options={TABS} value={tab} onChange={(key) => setTab(toTab(key))} />

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
        {tab === 'entrou' ? <EntrouTab /> : tab === 'saiu' ? <SaiuTab /> : <AssinaturasTab />}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // `xl` e não `lg`: o que separa um assunto do outro nesta tela é o ar, já que
  // não sobrou borda nenhuma para fazer esse trabalho.
  screen: { gap: spacing.xl },
  head: { gap: spacing.xs },
  alert: { gap: spacing.xs, marginTop: spacing.xs },
  section: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  dayBlock: { gap: spacing.xs },
  error: { gap: spacing.sm },

  switch: {
    flexDirection: 'row',
    padding: spacing.xs / 2,
    borderRadius: radius.pill,
    gap: spacing.xs / 2,
  },
  segment: {
    flex: 1,
    minHeight: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
  },
  segmentLabel: { fontWeight: '600' },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 34,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  chipLabel: { fontWeight: '600', flexShrink: 1 },

  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
  },
  emptyActions: { marginTop: spacing.sm, gap: spacing.sm, alignItems: 'center' },
  centered: { textAlign: 'center' },

  // "Gastei" estica pra ocupar o espaço que "Nova conta fixa" não usa.
  grow: { flex: 1 },

  pressed: { opacity: 0.65 },
});
