/**
 * Metas (objetivos).
 *
 * A tela inteira é derivada: `goals` e `deposits` são a verdade, e todo número
 * projetado vem de `GoalProjection`. Nada de "quanto falta" calculado aqui —
 * duas contas para o mesmo número divergem no dia em que uma delas muda.
 *
 * Sobre o tom: esta é a única tela do app em que a pessoa está ganhando. Quando
 * `progress >= 1` o sarcasmo sai de cena e a vitória é limpa. E registrar SAQUE
 * não pode ter cara de punição — quem tem medo de registrar a verdade transforma
 * o app inteiro em ficção, e aí nenhuma projeção daqui vale nada.
 */

import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { emergencyFundTarget } from '@/engine/analysis';
import { fill, firstName, hashSeed, LINES, pickLine } from '@/engine/persona';
import { useArrego, useProjections, useSnapshot } from '@/store/useArrego';
import { HIT_SLOP, MIN_TOUCH, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import type {
  Cents,
  Goal,
  GoalDeposit,
  GoalProjection,
  InsightSeverity,
  MonthKey,
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
  Meter,
  MoneyText,
  Screen,
  SectionHeader,
  SegmentedControl,
  Sheet,
  TextField,
  type MeterTone,
} from '@/ui';
import {
  addMonths,
  clampDayToMonth,
  currentMonthKey,
  dateInMonth,
  formatDayMonth,
  formatMonthLong,
  formatMonthShort,
  humanizeMonths,
  monthKeyFromISO,
} from '@/utils/date';
import { formatCents } from '@/utils/money';

/* ─────────────────────────────── Constantes ─────────────────────────────── */

const GOAL_ICONS = [
  { emoji: '🚗', name: 'Carro' },
  { emoji: '🏠', name: 'Casa' },
  { emoji: '🎓', name: 'Estudos' },
  { emoji: '✈️', name: 'Viagem' },
  { emoji: '💻', name: 'Computador' },
  { emoji: '📱', name: 'Celular' },
  { emoji: '🎸', name: 'Instrumento' },
  { emoji: '🐶', name: 'Pet' },
  { emoji: '💍', name: 'Casamento' },
  { emoji: '🛡️', name: 'Reserva' },
  { emoji: '🎯', name: 'Objetivo' },
] as const;

/** Menor = mais importante. A reserva de emergência é a única com 0. */
const PRIORITIES = [
  { label: 'Agora', value: 1 },
  { label: 'Em breve', value: 50 },
  { label: 'Algum dia', value: 100 },
] as const;

const EMERGENCY_PRIORITY = 0;
const EXTRATO_LIMIT = 5;
/** Prazo escolhível: do mês que vem até 2 anos. */
const DEADLINE_HORIZON = 24;
/** Quanto dá pra retroceder ao registrar um depósito antigo. */
const BACKDATE_MONTHS = 6;

/**
 * A soma dos prazos não cabe na sobra. Não existe banco para isso em
 * `persona.ts` — as falas de lá são sobre UMA meta, e aqui o problema é o
 * conjunto. Mesmo contrato de tom: a ironia é sobre a agenda, não sobre a
 * pessoa, e toda linha termina numa saída.
 */
const GOALS_OVERFLOW_LINES: readonly string[] = [
  'Suas metas com prazo pedem {valor} a mais por mês do que sobra. Não é falta de vontade, é falta de mês. Tira o prazo de {meta} e a conta volta a fechar.',
  '{nome}, somando os prazos que você prometeu a si mesmo, faltam {valor} todo mês. Alguém aqui está otimista demais, e não sou eu. Passa {meta} pra "algum dia" e o resto respira.',
  'A matemática das suas metas estourou em {valor} por mês. Meta demais no mesmo mês vira meta nenhuma — o dinheiro não se divide por vontade. Solta o prazo de {meta} e as outras andam.',
  'Faltam {valor} por mês pra todas as suas metas baterem no prazo. Dá pra insistir e não cumprir nenhuma, ou tirar o prazo de {meta} e cumprir as outras. Eu voto na segunda.',
  'Seus prazos somados pedem {valor} a mais do que você tem por mês. Isso não é fracasso, é agenda cheia. Escolhe: {meta} sai da fila do prazo, ou você refaz as datas.',
  '{valor} por mês é o tamanho do exagero dos seus prazos. Cada meta sozinha é razoável; juntas, não cabem. Tira o prazo de {meta} — ela continua existindo, só para de cobrar hora.',
];

/* ──────────────────────────────── Gramática ─────────────────────────────── */

/**
 * 'falta 1 mês' / 'faltam 3 meses'. `humanizeMonths` devolve tanto singular
 * ('1 mês', '1 ano') quanto composto ('1 ano e 2 meses', que pede plural).
 */
function missingTime(months: number): string {
  const total = Math.max(0, Math.round(months));
  const singular = total <= 1 || total === 12;
  return `${singular ? 'falta' : 'faltam'} ${humanizeMonths(total)}`;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/* ─────────────────────────── Leitura da projeção ────────────────────────── */

type GoalStatus = {
  severity: InsightSeverity;
  badge: string;
  meter: MeterTone;
  lines: string[];
  caption: string | null;
};

/**
 * Ritmo parado é `monthsAtCurrentPace === null` — e isso cobre DOIS casos
 * diferentes: nunca depositou (ritmo 0) e tirou mais do que pôs (ritmo < 0).
 * Dizer "você não guardou nada" para quem sacou é factualmente falso, e mentira
 * some com a confiança mais rápido que sarcasmo.
 */
function paceLine(projection: GoalProjection): string {
  if (projection.monthsAtCurrentPace !== null) {
    return `No seu ritmo: ${missingTime(projection.monthsAtCurrentPace)}.`;
  }
  if (projection.monthlyPaceCents < 0) {
    return 'Nos últimos meses saiu mais daqui do que entrou. Acontece — e o próximo depósito reverte isso.';
  }
  return 'Você não guardou nada ainda pra essa. Começa com qualquer valor: qualquer um já tira o zero da conta.';
}

function describeGoal(goal: Goal, projection: GoalProjection): GoalStatus {
  const deadline =
    goal.targetDate !== null ? formatMonthLong(monthKeyFromISO(goal.targetDate)) : null;

  if (goal.achievedAt !== null) {
    return {
      severity: 'good',
      badge: 'Concluída',
      meter: 'good',
      lines: [],
      caption: null,
    };
  }

  if (projection.onTrack === true) {
    return {
      severity: 'good',
      badge: 'No ritmo',
      meter: 'good',
      lines: [capitalize(missingTime(projection.monthsAtCurrentPace ?? 0)) + '.'],
      caption: deadline !== null ? `Prazo: ${deadline}` : null,
    };
  }

  if (projection.onTrack === false) {
    const lines = [paceLine(projection)];
    // onTrack === false implica prazo no futuro, e prazo no futuro implica
    // requiredMonthly. A checagem é para o compilador — e para o dia em que
    // alguém mexer em `projectGoal`.
    if (projection.requiredMonthlyCents !== null) {
      lines.push(`Pra bater o prazo: ${formatCents(projection.requiredMonthlyCents)}/mês.`);
    }
    return {
      severity: 'warning',
      badge: 'Atrasada',
      meter: 'brand',
      lines,
      caption: deadline !== null ? `Prazo: ${deadline}` : null,
    };
  }

  // Daqui pra baixo `onTrack` é null: ou não há prazo, ou o prazo já venceu
  // (`requiredMonthly` vira null em vez de virar uma cobrança impossível).
  if (goal.targetDate !== null) {
    return {
      severity: 'warning',
      badge: 'Prazo vencido',
      meter: 'brand',
      lines: [
        `O prazo era ${deadline ?? 'antes de hoje'} e passou.`,
        paceLine(projection),
        'Remarca a data ou tira o prazo em "Editar". Prazo é seu, não é lei.',
      ],
      caption: null,
    };
  }

  return {
    severity: 'neutral',
    badge: 'Sem prazo',
    meter: 'brand',
    lines: [paceLine(projection)],
    caption: 'Sem prazo — essa chega quando você quiser.',
  };
}

/* ──────────────────────────────── Extrato ───────────────────────────────── */

function DepositLog({
  deposits,
  onRemove,
}: {
  deposits: GoalDeposit[];
  onRemove: (deposit: GoalDeposit) => void;
}) {
  const { colors } = useTheme();

  if (deposits.length === 0) {
    return (
      <AppText variant="small" tone="muted">
        Nenhum lançamento ainda.
      </AppText>
    );
  }

  return (
    <View>
      {deposits.map((deposit) => (
        <ListRow
          key={deposit.id}
          title={formatDayMonth(deposit.depositedOn)}
          subtitle={deposit.note ?? undefined}
          trailing={
            <View style={styles.logTrailing}>
              <MoneyText cents={deposit.amountCents} signed tabular />
              <Pressable
                onPress={() => onRemove(deposit)}
                hitSlop={HIT_SLOP}
                accessible
                accessibilityRole="button"
                accessibilityLabel={`Apagar lançamento de ${formatDayMonth(deposit.depositedOn)}`}
                style={({ pressed }) => [
                  styles.logDelete,
                  { backgroundColor: colors.surfaceSunken },
                  pressed && styles.pressed,
                ]}
              >
                <AppText variant="caption" tone="secondary">
                  ✕
                </AppText>
              </Pressable>
            </View>
          }
        />
      ))}
    </View>
  );
}

/* ────────────────────────────── Card da meta ────────────────────────────── */

type GoalCardProps = {
  goal: Goal;
  projection: GoalProjection;
  deposits: GoalDeposit[];
  expanded: boolean;
  onToggleLog: () => void;
  onDeposit: () => void;
  onEdit: () => void;
  onComplete: () => void;
  onRemoveDeposit: (deposit: GoalDeposit) => void;
};

function GoalCard({
  goal,
  projection,
  deposits,
  expanded,
  onToggleLog,
  onDeposit,
  onEdit,
  onComplete,
  onRemoveDeposit,
}: GoalCardProps) {
  const progressLabel = `${formatCents(projection.savedCents)} de ${formatCents(projection.targetCents)}`;
  const won = projection.progress >= 1 && goal.achievedAt === null;

  // Vitória: nada de badge, de projeção, de cobrança, de ironia. A pessoa
  // acertou — a tela sai da frente e deixa ela comemorar.
  // O extrato continua alcançável de propósito: um depósito digitado errado
  // (R$ 3.000 no lugar de R$ 300) dispara essa tela sozinho, e sem o extrato
  // aqui não haveria como desfazer uma vitória que nunca aconteceu.
  if (won) {
    return (
      <Card tone="brand">
        <View style={styles.cardStack}>
          <View style={styles.cardHead}>
            <AppText style={styles.cardEmoji}>🎉</AppText>
            <View style={styles.cardTitle}>
              <AppText variant="heading" numberOfLines={2}>
                {goal.label}
              </AppText>
              <AppText variant="small">Você bateu essa meta.</AppText>
            </View>
          </View>

          <Meter progress={projection.progress} label={progressLabel} tone="good" />

          {/* `secondary` e não `primary`: botão amarelo em card amarelo some. */}
          <Button label="Concluir meta" icon="🏁" variant="secondary" onPress={onComplete} full />

          <Pressable
            onPress={onToggleLog}
            hitSlop={HIT_SLOP}
            accessible
            accessibilityRole="button"
            accessibilityState={{ expanded }}
            accessibilityLabel={`Extrato de ${goal.label}`}
            style={({ pressed }) => [styles.logToggle, pressed && styles.pressed]}
          >
            <AppText variant="small">{expanded ? 'Esconder extrato' : 'Ver extrato'}</AppText>
            <AppText variant="small">{expanded ? '▴' : '▾'}</AppText>
          </Pressable>

          {expanded ? (
            <DepositLog deposits={deposits.slice(0, EXTRATO_LIMIT)} onRemove={onRemoveDeposit} />
          ) : null}
        </View>
      </Card>
    );
  }

  const status = describeGoal(goal, projection);

  return (
    <Card>
      <View style={styles.cardStack}>
        <View style={styles.cardHead}>
          <AppText style={styles.cardEmoji}>{goal.emoji}</AppText>
          <View style={styles.cardTitle}>
            <AppText variant="subheading" numberOfLines={2}>
              {goal.label}
            </AppText>
            <Badge label={status.badge} severity={status.severity} />
          </View>
        </View>

        <Meter progress={projection.progress} label={progressLabel} tone={status.meter} />

        {status.lines.length > 0 ? (
          <View style={styles.lines}>
            {status.lines.map((line, index) => (
              // Índice como key: a lista é estática, montada aqui mesmo e nunca
              // reordenada — não há item para o React perder de vista.
              <AppText key={index} variant="small" tone="secondary">
                {line}
              </AppText>
            ))}
            {status.caption !== null ? (
              <AppText variant="caption" tone="muted">
                {status.caption}
              </AppText>
            ) : null}
          </View>
        ) : null}

        <View style={styles.cardActions}>
          <Button label="Guardar dinheiro" icon="💰" variant="secondary" onPress={onDeposit} />
          <Button label="Editar" variant="ghost" onPress={onEdit} />
        </View>

        <Pressable
          onPress={onToggleLog}
          hitSlop={HIT_SLOP}
          accessible
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={`Extrato de ${goal.label}`}
          style={({ pressed }) => [styles.logToggle, pressed && styles.pressed]}
        >
          <AppText variant="small" tone="secondary">
            {expanded ? 'Esconder extrato' : 'Ver extrato'}
          </AppText>
          <AppText variant="small" tone="muted">
            {expanded ? '▴' : '▾'}
          </AppText>
        </Pressable>

        {expanded ? (
          <DepositLog deposits={deposits.slice(0, EXTRATO_LIMIT)} onRemove={onRemoveDeposit} />
        ) : null}
      </View>
    </Card>
  );
}

/* ─────────────────────────────── Ícone da meta ──────────────────────────── */

function IconPicker({ value, onChange }: { value: string; onChange: (emoji: string) => void }) {
  const { colors } = useTheme();

  return (
    <Field label="Ícone">
      <View style={styles.iconGrid} accessibilityRole="radiogroup">
        {GOAL_ICONS.map((icon) => {
          const selected = icon.emoji === value;
          return (
            <Pressable
              key={icon.emoji}
              onPress={() => onChange(icon.emoji)}
              accessible
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={icon.name}
              style={({ pressed }) => [
                styles.iconCell,
                {
                  backgroundColor: selected ? colors.brand.amber : colors.surfaceSunken,
                  borderColor: selected ? colors.brand.amberDeep : colors.border,
                },
                pressed && styles.pressed,
              ]}
            >
              <AppText style={styles.iconEmoji}>{icon.emoji}</AppText>
            </Pressable>
          );
        })}
      </View>
    </Field>
  );
}

/* ──────────────────────────────── A tela ────────────────────────────────── */

type GoalForm = {
  emoji: string;
  label: string;
  targetCents: Cents;
  targetMonth: MonthKey | null;
  priority: number;
};

const EMPTY_FORM: GoalForm = {
  emoji: '🎯',
  label: '',
  targetCents: 0,
  targetMonth: null,
  priority: 50,
};

type GoalSheetState = { mode: 'new' } | { mode: 'edit'; goalId: string };

export default function ObjetivosScreen() {
  const goals = useArrego((state) => state.goals);
  const deposits = useArrego((state) => state.deposits);
  const profileName = useArrego((state) => state.profile?.name ?? null);
  const month = useArrego((state) => state.month);
  const addGoal = useArrego((state) => state.addGoal);
  const updateGoal = useArrego((state) => state.updateGoal);
  const removeGoal = useArrego((state) => state.removeGoal);
  const addDeposit = useArrego((state) => state.addDeposit);
  const removeDeposit = useArrego((state) => state.removeDeposit);

  const snapshot = useSnapshot();
  const projections = useProjections();

  const [goalSheet, setGoalSheet] = useState<GoalSheetState | null>(null);
  const [form, setForm] = useState<GoalForm>(EMPTY_FORM);

  const [depositGoalId, setDepositGoalId] = useState<string | null>(null);
  const [depositDirection, setDepositDirection] = useState<'in' | 'out'>('in');
  const [depositCents, setDepositCents] = useState<Cents>(0);
  const [depositMonth, setDepositMonth] = useState<MonthKey>(currentMonthKey);
  const [depositDay, setDepositDay] = useState<number>(() => new Date().getDate());
  const [depositNote, setDepositNote] = useState('');

  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);

  /** `null` = ninguém tocou no campo, então ele segue a sugestão do snapshot.
   *  Fixar no primeiro render deixaria o valor velho depois de cadastrar contas. */
  const [emergencyCents, setEmergencyCents] = useState<Cents | null>(null);

  const nome = firstName(profileName);

  const projectionById = useMemo(() => {
    const map = new Map<string, GoalProjection>();
    for (const projection of projections) map.set(projection.goalId, projection);
    return map;
  }, [projections]);

  const depositsByGoal = useMemo(() => {
    // `deposits` já vem ordenado por data desc, então cada balde herda a ordem
    // e o "últimos 5" é um slice, não um novo sort.
    const map = new Map<string, GoalDeposit[]>();
    for (const deposit of deposits) {
      const bucket = map.get(deposit.goalId);
      if (bucket) bucket.push(deposit);
      else map.set(deposit.goalId, [deposit]);
    }
    return map;
  }, [deposits]);

  const rows = useMemo(
    () =>
      goals.flatMap((goal) => {
        const projection = projectionById.get(goal.id);
        return projection ? [{ goal, projection }] : [];
      }),
    [goals, projectionById],
  );

  const hasEmergencyGoal = goals.some((goal) => goal.kind === 'emergency');
  const suggestedEmergency = emergencyFundTarget(snapshot);
  const emergencyValue = emergencyCents ?? suggestedEmergency.targetCents;

  /**
   * As metas com prazo pedem mais do que sobra. O alvo da sugestão é a meta de
   * MENOR prioridade — que, no modelo, é a de MAIOR número (`priority`: menor =
   * mais importante). Só entram metas que realmente pesam: tirar o prazo de uma
   * meta que exige R$ 0 não liberaria nada.
   */
  const overflow = useMemo(() => {
    if (snapshot.goalsMonthlyNeedCents <= 0 || snapshot.afterGoalsCents >= 0) return null;

    let pick: { goal: Goal; required: Cents } | null = null;
    for (const goal of goals) {
      if (goal.targetDate === null || goal.achievedAt !== null) continue;
      const required = projectionById.get(goal.id)?.requiredMonthlyCents ?? 0;
      if (required <= 0) continue;
      if (
        pick === null ||
        goal.priority > pick.goal.priority ||
        (goal.priority === pick.goal.priority && required > pick.required)
      ) {
        pick = { goal, required };
      }
    }
    if (pick === null) return null;

    return { goal: pick.goal, required: pick.required, gap: Math.abs(snapshot.afterGoalsCents) };
  }, [goals, projectionById, snapshot]);

  const deadlineMonths = useMemo(() => {
    const anchor = currentMonthKey();
    // Começa no mês QUE VEM: prazo no mês corrente nasce com `requiredMonthly`
    // null (monthsLeft <= 0) e a meta apareceria como "sem prazo" no mesmo dia.
    const base = Array.from({ length: DEADLINE_HORIZON }, (_, index) => addMonths(anchor, index + 1));
    const current = form.targetMonth;
    // Editando uma meta de prazo vencido (ou distante), o chip dela precisa
    // existir — senão nada fica marcado e a tela mente sobre o estado.
    if (current !== null && !base.includes(current)) return [current, ...base].sort();
    return base;
  }, [form.targetMonth]);

  const backdateMonths = useMemo(() => {
    const anchor = currentMonthKey();
    return Array.from({ length: BACKDATE_MONTHS + 1 }, (_, index) =>
      addMonths(anchor, index - BACKDATE_MONTHS),
    );
  }, []);

  const editingGoal =
    goalSheet?.mode === 'edit' ? (goals.find((goal) => goal.id === goalSheet.goalId) ?? null) : null;
  const editingEmergency = editingGoal?.kind === 'emergency';

  const depositGoal = goals.find((goal) => goal.id === depositGoalId) ?? null;
  const depositDate = dateInMonth(depositDay, depositMonth);
  const canSaveGoal = form.label.trim().length > 0 && form.targetCents > 0;

  /* ── Ações ── */

  const openNewGoal = () => {
    setForm(EMPTY_FORM);
    setGoalSheet({ mode: 'new' });
  };

  const openEditGoal = (goal: Goal) => {
    setForm({
      emoji: goal.emoji,
      label: goal.label,
      targetCents: goal.targetCents,
      targetMonth: goal.targetDate !== null ? monthKeyFromISO(goal.targetDate) : null,
      priority: goal.priority,
    });
    setGoalSheet({ mode: 'edit', goalId: goal.id });
  };

  const saveGoal = () => {
    if (goalSheet === null || !canSaveGoal) return;
    // Último dia do mês escolhido: o prazo é "até o fim de", não "até o dia 1".
    // `dateInMonth` encaixa o 31 no tamanho real do mês.
    const targetDate = form.targetMonth !== null ? dateInMonth(31, form.targetMonth) : null;

    if (goalSheet.mode === 'new') {
      void addGoal({
        label: form.label.trim(),
        kind: 'custom',
        emoji: form.emoji,
        targetCents: form.targetCents,
        targetDate,
        priority: form.priority,
      });
    } else {
      // `kind` fica de fora do patch de propósito: editar a reserva de
      // emergência não pode transformá-la numa meta comum.
      void updateGoal(goalSheet.goalId, {
        label: form.label.trim(),
        emoji: form.emoji,
        targetCents: form.targetCents,
        targetDate,
        priority: form.priority,
      });
    }
    setGoalSheet(null);
  };

  const createEmergencyGoal = () => {
    void addGoal({
      label: 'Reserva de emergência',
      kind: 'emergency',
      emoji: '🛡️',
      targetCents: emergencyValue,
      // Reserva não tem prazo: ela é a meta que não pode virar cobrança mensal.
      targetDate: null,
      priority: EMERGENCY_PRIORITY,
    });
    setEmergencyCents(null);
  };

  const confirmRemoveGoal = (goal: Goal) => {
    Alert.alert(
      `Apagar ${goal.label}?`,
      'Os depósitos dessa meta vão junto. Isso não dá pra desfazer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: () => {
            void removeGoal(goal.id);
            setGoalSheet(null);
          },
        },
      ],
    );
  };

  const completeGoal = (goal: Goal) => {
    // A store não expõe `goalsRepo.markAchieved`, e chamar o repo direto daqui
    // gravaria no disco sem atualizar a memória — a tela não re-renderizaria.
    // O carimbo pelo patch tem o mesmo efeito, e o botão só existe enquanto
    // `achievedAt` é null, então a data da vitória nunca é reescrita.
    void updateGoal(goal.id, { achievedAt: new Date().toISOString() });
  };

  const dropDeadline = (goal: Goal) => {
    void updateGoal(goal.id, { targetDate: null });
  };

  const openDeposit = (goalId: string) => {
    setDepositDirection('in');
    setDepositCents(0);
    setDepositMonth(currentMonthKey());
    setDepositDay(new Date().getDate());
    setDepositNote('');
    setDepositGoalId(goalId);
  };

  const changeDepositMonth = (key: MonthKey) => {
    setDepositMonth(key);
    setDepositDay((day) => clampDayToMonth(day, key));
  };

  const saveDeposit = () => {
    if (depositGoalId === null || depositCents <= 0) return;
    const note = depositNote.trim();
    void addDeposit({
      goalId: depositGoalId,
      // Saque é o mesmo lançamento com sinal invertido — é o negativo que faz
      // `goalSavedCents` bater com a realidade.
      amountCents: depositDirection === 'out' ? -depositCents : depositCents,
      depositedOn: depositDate,
      note: note === '' ? null : note,
    });
    setDepositGoalId(null);
  };

  const confirmRemoveDeposit = (deposit: GoalDeposit) => {
    Alert.alert(
      'Apagar esse lançamento?',
      `${formatCents(deposit.amountCents)} em ${formatDayMonth(deposit.depositedOn)}. O total da meta muda junto — apaga só se estiver errado mesmo.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: () => {
            void removeDeposit(deposit.id);
          },
        },
      ],
    );
  };

  /* ── Render ── */

  return (
    <Screen scroll>
      <View style={styles.stack}>
        <SectionHeader title="Metas" />

        {!hasEmergencyGoal ? (
          <Card tone="brand">
            <View style={styles.cardStack}>
              <View style={styles.cardHead}>
                <AppText style={styles.cardEmoji}>🛡️</AppText>
                <View style={styles.cardTitle}>
                  <AppText variant="heading">Reserva de emergência</AppText>
                  <AppText variant="caption">A meta que protege as outras metas</AppText>
                </View>
              </View>

              <AppText variant="body">
                {fill(pickLine(LINES.noEmergencyFund, hashSeed(month, 'objetivos:noEmergencyFund')), {
                  nome,
                  valor: formatCents(suggestedEmergency.targetCents),
                })}
              </AppText>

              {/* O "porquê" não pode depender de qual fala foi sorteada. */}
              <AppText variant="small">
                Ela vem antes de qualquer outra meta porque é a única que defende as outras: sem
                reserva, o primeiro imprevisto vira parcela no cartão e come a viagem, o carro e o
                que mais estiver na fila.
              </AppText>

              <CurrencyField
                label="Alvo sugerido"
                cents={emergencyValue}
                onChangeCents={setEmergencyCents}
                // Quando o piso vence a conta dos 6 meses, o alvo não é "6 meses
                // do seu mês" — dizer que é contradiz o número no próprio campo.
                hint={
                  suggestedEmergency.usedFloor
                    ? 'Um mínimo pra você começar por algum lugar. Assim que suas contas estiverem cadastradas, eu refaço essa conta em cima de 6 meses do que seu mês exige. Dá pra ajustar.'
                    : `6 meses do que seu mês exige (${formatCents(snapshot.committedCents)}/mês). Dá pra ajustar.`
                }
              />

              <Button
                label="Criar reserva"
                icon="🛡️"
                variant="secondary"
                onPress={createEmergencyGoal}
                disabled={emergencyValue <= 0}
                full
              />
            </View>
          </Card>
        ) : null}

        {overflow !== null ? (
          <Card>
            <View style={styles.cardStack}>
              {/* Não existe Card 'serious': a severidade mora no Badge (cor na
                  borda + emoji + rótulo), nunca na cor do fundo sozinha. */}
              <Badge label="As metas não cabem na sobra" severity="serious" />

              <AppText variant="body">
                {fill(pickLine(GOALS_OVERFLOW_LINES, hashSeed(month, 'objetivos:overflow')), {
                  nome,
                  valor: formatCents(overflow.gap),
                  meta: overflow.goal.label,
                })}
              </AppText>

              {/* A conta inteira, na ordem em que ela acontece. O último número é
                  o `afterGoalsCents` cru: "Faltam −R$ 200" seria negativo em cima
                  de negativo, e a pessoa leria o sinal trocado. */}
              <View style={styles.math}>
                <View style={styles.mathRow}>
                  <AppText variant="small" tone="secondary">
                    Sobra por mês
                  </AppText>
                  <MoneyText cents={snapshot.freeCents} tabular />
                </View>
                <View style={styles.mathRow}>
                  <AppText variant="small" tone="secondary">
                    As metas com prazo pedem
                  </AppText>
                  <MoneyText cents={-snapshot.goalsMonthlyNeedCents} tabular />
                </View>
                <View style={styles.mathRow}>
                  <AppText variant="bodyStrong">Sobra depois das metas</AppText>
                  <MoneyText cents={snapshot.afterGoalsCents} variant="bodyStrong" tabular />
                </View>
              </View>

              <AppText variant="small" tone="secondary">
                {`Tirar o prazo de ${overflow.goal.label} libera ${formatCents(overflow.required)} por mês. Ela continua na lista, só para de exigir data.`}
              </AppText>

              <Button
                label={`Tirar o prazo de ${overflow.goal.label}`}
                variant="secondary"
                onPress={() => dropDeadline(overflow.goal)}
                full
              />
            </View>
          </Card>
        ) : null}

        {rows.length === 0 ? (
          <EmptyState
            emoji="🎯"
            title="Nenhuma meta ainda"
            body={fill(pickLine(LINES.noGoals, hashSeed(month, 'objetivos:noGoals')), { nome })}
            actionLabel="Criar minha primeira meta"
            onAction={openNewGoal}
          />
        ) : (
          <>
            {rows.map(({ goal, projection }) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                projection={projection}
                deposits={depositsByGoal.get(goal.id) ?? []}
                expanded={expandedGoalId === goal.id}
                onToggleLog={() => setExpandedGoalId(expandedGoalId === goal.id ? null : goal.id)}
                onDeposit={() => openDeposit(goal.id)}
                onEdit={() => openEditGoal(goal)}
                onComplete={() => completeGoal(goal)}
                onRemoveDeposit={confirmRemoveDeposit}
              />
            ))}

            <Button label="Nova meta" icon="+" onPress={openNewGoal} full />
          </>
        )}
      </View>

      {/* ── Folha: nova meta / editar meta ── */}

      <Sheet
        visible={goalSheet !== null}
        onClose={() => setGoalSheet(null)}
        title={goalSheet?.mode === 'edit' ? 'Editar meta' : 'Nova meta'}
      >
        <IconPicker value={form.emoji} onChange={(emoji) => setForm({ ...form, emoji })} />

        <TextField
          label="O que você quer"
          value={form.label}
          onChangeText={(label) => setForm({ ...form, label })}
          placeholder="Viagem pro Chile"
          maxLength={40}
        />

        <CurrencyField
          label="Quanto custa"
          cents={form.targetCents}
          onChangeCents={(targetCents) => setForm({ ...form, targetCents })}
          hint="Chute alto demais trava a meta antes de ela começar. Chuta o real."
        />

        <Field
          label="Prazo"
          hint={
            form.targetMonth !== null
              ? `Até o fim de ${formatMonthLong(form.targetMonth)}.`
              : 'Sem prazo é uma escolha legítima: a meta anda no seu tempo e não cobra valor mensal.'
          }
        >
          <View style={styles.chips}>
            <Chip
              label="Sem prazo"
              selected={form.targetMonth === null}
              onPress={() => setForm({ ...form, targetMonth: null })}
            />
            {deadlineMonths.map((key) => (
              <Chip
                key={key}
                label={formatMonthShort(key)}
                selected={form.targetMonth === key}
                onPress={() => setForm({ ...form, targetMonth: key })}
              />
            ))}
          </View>
        </Field>

        {editingEmergency ? (
          <Field label="Prioridade" hint="A reserva de emergência é sempre a prioridade zero. É o ponto dela.">
            <Chip label="Prioridade zero" icon="🛡️" selected />
          </Field>
        ) : (
          <Field label="Prioridade" hint="Quando a sobra não cobre tudo, é essa ordem que decide quem anda primeiro.">
            <View style={styles.chips}>
              {PRIORITIES.map((priority) => (
                <Chip
                  key={priority.value}
                  label={priority.label}
                  selected={form.priority === priority.value}
                  onPress={() => setForm({ ...form, priority: priority.value })}
                />
              ))}
            </View>
          </Field>
        )}

        <Button
          label={goalSheet?.mode === 'edit' ? 'Salvar meta' : 'Criar meta'}
          onPress={saveGoal}
          disabled={!canSaveGoal}
          size="lg"
          full
        />

        {editingGoal !== null ? (
          <Button label="Apagar meta" variant="danger" onPress={() => confirmRemoveGoal(editingGoal)} full />
        ) : null}
      </Sheet>

      {/* ── Folha: guardar / tirar dinheiro ── */}

      <Sheet
        visible={depositGoal !== null}
        onClose={() => setDepositGoalId(null)}
        title={
          depositGoal === null
            ? ''
            : depositDirection === 'out'
              ? `Tirar de ${depositGoal.label}`
              : `Guardar em ${depositGoal.label}`
        }
      >
        <SegmentedControl
          options={[
            { key: 'in', label: 'Guardei' },
            { key: 'out', label: 'Tirei daqui' },
          ]}
          value={depositDirection}
          onChange={(key) => setDepositDirection(key === 'out' ? 'out' : 'in')}
        />

        {depositDirection === 'out' ? (
          // Registrar saque sem julgamento é o que mantém o resto dos números
          // reais. Uma frase de culpa aqui e a pessoa simplesmente não registra —
          // e aí a meta vira um número bonito que não existe.
          <AppText variant="small" tone="secondary">
            Tirou, tirou. O dinheiro é seu e guardar não é prisão. Registrar aqui não piora nada:
            só mantém o número honesto, que é a única coisa que faz o resto do app valer alguma
            coisa.
          </AppText>
        ) : null}

        <CurrencyField
          label={depositDirection === 'out' ? 'Quanto você tirou' : 'Quanto você guardou'}
          cents={depositCents}
          onChangeCents={setDepositCents}
          autoFocus
        />

        <Field label="Mês" hint={`Lançamento em ${formatDayMonth(depositDate)}.`}>
          <View style={styles.chips}>
            {backdateMonths.map((key) => (
              <Chip
                key={key}
                label={formatMonthShort(key)}
                selected={depositMonth === key}
                onPress={() => changeDepositMonth(key)}
              />
            ))}
          </View>
        </Field>

        <DayField
          label="Dia"
          value={depositDay}
          // O DayField deixa desmarcar (volta null), mas lançamento sem data não
          // existe: ignorar o null mantém o dia que já estava.
          onChange={(day) => {
            if (day !== null) setDepositDay(clampDayToMonth(day, depositMonth));
          }}
        />

        <TextField
          label="Nota (opcional)"
          value={depositNote}
          onChangeText={setDepositNote}
          placeholder={depositDirection === 'out' ? 'Consertei a geladeira' : 'Sobrou do freela'}
          maxLength={60}
        />

        <Button
          label={
            depositDirection === 'out'
              ? `Tirar ${formatCents(depositCents)}`
              : `Guardar ${formatCents(depositCents)}`
          }
          onPress={saveDeposit}
          disabled={depositCents <= 0}
          size="lg"
          full
        />
      </Sheet>
    </Screen>
  );
}

/* ──────────────────────────────── Estilos ───────────────────────────────── */

const styles = StyleSheet.create({
  stack: { gap: spacing.lg },
  cardStack: { gap: spacing.md },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardEmoji: { fontSize: 34, lineHeight: 40 },
  cardTitle: { flex: 1, gap: spacing.xs, alignItems: 'flex-start' },
  lines: { gap: spacing.xs },
  cardActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  logToggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: MIN_TOUCH },
  logTrailing: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  logDelete: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  math: { gap: spacing.xs },
  mathRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  iconCell: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconEmoji: { fontSize: 22, lineHeight: 26 },
  pressed: { opacity: 0.65 },
});
