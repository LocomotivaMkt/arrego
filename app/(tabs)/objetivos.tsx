/**
 * Metas (objetivos).
 *
 * A tela inteira é derivada: `goals` e `deposits` são a verdade, e todo número
 * projetado vem de `GoalProjection`. Nada de "quanto falta" calculado aqui —
 * duas contas para o mesmo número divergem no dia em que uma delas muda.
 *
 * ┌─────────────────── O QUE ESTA TELA MOSTRA DE CARA ────────────────────┐
 * │ Por meta: emoji + rótulo + selo "#N"; medidor; "R$ 200 de R$ 4.000" e  │
 * │ o valor do mês. Só. Todo o resto — o porquê da posição, a projeção, o  │
 * │ "precisaria de X/mês", o extrato — mora em "Detalhes", fechado.        │
 * └───────────────────────────────────────────────────────────────────────┘
 *
 * Esta tela tinha 2.393 caracteres de texto corrido e o veredito do dono foi
 * "parece um golpe". Ele estava certo, e a causa era estrutural: cada card
 * explicava a própria existência em três frases antes de mostrar o número. App
 * sério mostra o número e cala a boca; quem se explica em três parágrafos é
 * quem está vendendo alguma coisa. Nada saiu daqui — o texto desceu um nível,
 * para trás de um toque (`Reveal`), que é o mecanismo que `textBudget` prevê.
 *
 * As falas vêm de `SHORT` (via `shortLine`), não de `LINES`: `LINES` é a boca
 * inteira da Arrego e o lugar dela é /conversa, onde texto É o conteúdo. Aqui
 * ela fala uma linha, e a saída prática é o botão ao lado.
 *
 * O AMARELO: uma superfície por tela, e nesta tela ela é disputada por dois
 * candidatos — o card de vitória e o botão "Nova meta". `brandGoalId` é o juiz:
 * existindo vitória, ela leva o amarelo (é o assunto do momento) e o botão cai
 * para `secondary`. Sem vitória, o botão leva. Nunca os dois — card amarelo mais
 * botão amarelo na mesma tela é a estética de pirâmide financeira que nos
 * trouxe até aqui.
 *
 * Sobre o tom: esta é a única tela do app em que a pessoa está ganhando. Quando
 * `progress >= 1` o sarcasmo sai de cena e a vitória é limpa. E registrar SAQUE
 * não pode ter cara de punição — quem tem medo de registrar a verdade transforma
 * o app inteiro em ficção, e aí nenhuma projeção daqui vale nada.
 */

import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { emergencyFundTarget } from '@/engine/analysis';
import { fill, firstName, hashSeed, pickLine, shortLine } from '@/engine/persona';
import type { GoalAllocation } from '@/engine/plan';
import { useArrego, usePlan, useProjections, useSnapshot } from '@/store/useArrego';
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
  Field,
  Icon,
  InkSurface,
  ListRow,
  Meter,
  MoneyText,
  Reveal,
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
 * `persona.ts` — `SHORT.planTooManyGoals` parece servir e não serve: lá o
 * {valor} é "o que existe pra repartir", e aqui é o BURACO. Trocar um pelo
 * outro faria a personagem dizer que se disputa um dinheiro que na verdade
 * falta.
 *
 * Mesmo contrato de tom de `SHORT`: uma linha dentro de `textBudget.personaLine`,
 * a ironia é sobre a agenda (nunca sobre a pessoa) e a saída prática é o BOTÃO
 * — por isso nenhuma linha carrega {meta}: quem nomeia a meta a sacrificar é o
 * rótulo do botão, que tem alvo de toque e desfaz o problema num toque.
 */
const GOALS_OVERFLOW_SHORT: readonly string[] = [
  'Seus prazos somados pedem {valor} a mais por mês do que sobra.',
  '{nome}, faltam {valor} por mês pra todos os prazos que você prometeu.',
  'A matemática das suas metas estourou em {valor} por mês.',
  'Meta demais no mesmo mês vira meta nenhuma. Faltam {valor}.',
  '{valor} por mês é o tamanho do exagero dos seus prazos.',
  'Não é falta de vontade, é falta de mês: faltam {valor} por mês.',
];

/* ─────────────────────────────── Navegação ──────────────────────────────── */

/**
 * O plano completo — a tela que mostra a divisão inteira do mês.
 *
 * O parâmetro `string` (em vez do literal `'/plano'`) é o que deixa o cast
 * passar, e é o mesmo cast de app/(tabs)/index.tsx, preso num lugar só:
 * `typedRoutes` monta a união de rotas a partir dos arquivos que existem em
 * `app/`, então um literal que ainda não virou arquivo não "sobrepõe" a união e
 * o compilador recusa a conversão. Com `string` na porta, a checagem volta a ser
 * a do expo-router em runtime.
 */
function abrirPlano(): void {
  const rota: string = '/plano';
  router.push(rota as Href);
}

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
  // Dentro do orçamento (<= 90 chars): a saída prática é o botão "Guardar
  // dinheiro" na superfície do card, não o fim da frase.
  if (projection.monthlyPaceCents < 0) {
    return 'Saiu mais daqui do que entrou. Acontece — o próximo depósito reverte.';
  }
  return 'Você ainda não guardou nada pra essa. Qualquer valor já tira o zero.';
}

/**
 * Tudo o que sai daqui (menos `meter`) vive dentro de "Detalhes". O medidor é a
 * única parte do status que fica na superfície, e ele carrega o estado por COR,
 * sem gastar uma linha de texto pra isso.
 */
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
                {/*
                  `Icon` não consulta o contexto de marca — a tinta dele sai do
                  `tone` e pronto. É exatamente o que este botão precisa: ele
                  desenha superfície PRÓPRIA (surfaceSunken) dentro de um card
                  que pode ser tone="brand" (o da meta batida), e herdar `onBrand`
                  daria #191713 sobre #252219 no tema escuro — 1.12:1, some. E é
                  justamente o botão que conserta um depósito digitado errado.
                */}
                <Icon name="close" size={14} tone="secondary" />
              </Pressable>
            </View>
          }
        />
      ))}
    </View>
  );
}

/* ────────────────────────────── Selo de posição ─────────────────────────── */

/**
 * "#1", "#2" — a resposta para "qual é a prioridade?", no canto da linha do
 * título.
 *
 * Era amarelo (amberSoft com borda amberDeep) e não é mais: numa tela com uma
 * meta por card, um selo amarelo por card é amarelo em toda parte, e amarelo em
 * toda parte não aponta pra nada. Agora ele é `surfaceSunken` com tinta normal —
 * um selo discreto, que é o que um número de posição precisa ser. O amarelo
 * desta tela tem dono, e o dono é a vitória ou o botão de criar meta.
 *
 * `InkSurface` porque o selo desenha superfície própria: se um dia ele aparecer
 * dentro de um card de marca, a tinta precisa voltar à do tema em vez de herdar
 * `onBrand` e sumir no escuro. Estrutura em vez de convenção que alguém esquece.
 *
 * Vira pílula sozinho quando o número passa de um dígito: com largura fixa, "#10"
 * seria cortado.
 */
function RankBadge({ rank }: { rank: number }) {
  const { colors } = useTheme();

  return (
    <InkSurface onBrand={false}>
      <View
        accessible
        accessibilityLabel={`Prioridade número ${rank}`}
        style={[styles.rankBadge, { backgroundColor: colors.surfaceSunken }]}
      >
        <AppText variant="caption" tone="primary">{`#${rank}`}</AppText>
      </View>
    </InkSurface>
  );
}

/* ────────────────────────────── Card da meta ────────────────────────────── */

type GoalCardProps = {
  goal: Goal;
  projection: GoalProjection;
  /** O que o plano do mês reservou pra ela. Null = o motor não a ranqueia. */
  allocation: GoalAllocation | null;
  deposits: GoalDeposit[];
  /**
   * Este card é o dono do amarelo da tela. Só o PRIMEIRO card de vitória recebe
   * true — duas metas batidas no mesmo mês seriam dois cards amarelos, e a regra
   * é uma superfície de marca por tela, não uma por vitória.
   */
  brand: boolean;
  nome: string;
  month: MonthKey;
  onDeposit: () => void;
  onEdit: () => void;
  onComplete: () => void;
  onRemoveDeposit: (deposit: GoalDeposit) => void;
};

function GoalCard({
  goal,
  projection,
  allocation,
  deposits,
  brand,
  nome,
  month,
  onDeposit,
  onEdit,
  onComplete,
  onRemoveDeposit,
}: GoalCardProps) {
  const progressLabel = `${formatCents(projection.savedCents)} de ${formatCents(projection.targetCents)}`;
  const won = projection.progress >= 1 && goal.achievedAt === null;

  // Vitória: nada de selo, de projeção, de cobrança, de ironia. A pessoa
  // acertou — a tela sai da frente e deixa ela comemorar.
  // O extrato continua alcançável de propósito: um depósito digitado errado
  // (R$ 3.000 no lugar de R$ 300) dispara essa tela sozinho, e sem o extrato
  // aqui não haveria como desfazer uma vitória que nunca aconteceu.
  if (won) {
    return (
      <Card tone={brand ? 'brand' : 'surface'}>
        <View style={styles.cardStack}>
          <View style={styles.cardHead}>
            <AppText style={styles.cardEmoji}>{goal.emoji}</AppText>
            <AppText variant="subheading" numberOfLines={2} style={styles.cardLabel}>
              {goal.label}
            </AppText>
          </View>

          {/* A seed carrega o id: duas metas batidas no mesmo mês receberiam a
              mesma frase lado a lado e a personagem desmontaria na hora. */}
          <AppText variant="small" tone="secondary">
            {shortLine('goalAchieved', hashSeed(month, goal.id), {
              nome,
              meta: goal.label,
              valor: formatCents(projection.savedCents),
            })}
          </AppText>

          <Meter progress={projection.progress} tone="good" />

          <AppText variant="small" tone="muted">
            {progressLabel}
          </AppText>

          {/* `secondary` e não `primary`: botão amarelo em card amarelo some. */}
          <Button label="Concluir meta" icon="check" variant="secondary" onPress={onComplete} full />

          <Reveal label="Detalhes">
            <AppText variant="caption" tone="muted">
              Últimos lançamentos
            </AppText>
            <DepositLog deposits={deposits.slice(0, EXTRATO_LIMIT)} onRemove={onRemoveDeposit} />
          </Reveal>
        </View>
      </Card>
    );
  }

  const status = describeGoal(goal, projection);
  const monthReading =
    allocation !== null ? `. Guardar este mês: ${formatCents(allocation.suggestedCents)}` : '';

  return (
    <Card>
      <View style={styles.cardStack}>
        {/* Linha 1 — de quem é a meta, e que lugar ela ocupa na fila. */}
        <View style={styles.cardHead}>
          <AppText style={styles.cardEmoji}>{goal.emoji}</AppText>
          <AppText variant="subheading" numberOfLines={2} style={styles.cardLabel}>
            {goal.label}
          </AppText>
          {allocation !== null ? <RankBadge rank={allocation.rank} /> : null}
        </View>

        {/* Linha 2 — o medidor sem rótulo: a linha 3 já é o rótulo dele, e o
            `Meter` com `label` imprimiria o mesmo número duas vezes. */}
        <Meter progress={projection.progress} tone={status.meter} />

        {/* Linha 3 — o quanto já foi, e o quanto vai este mês. O número da
            direita fica sem rótulo de propósito (é o desenho da tela); quem lê
            por leitor de tela recebe a frase inteira, e quem quiser o rótulo
            escrito abre "Detalhes". */}
        <View
          accessible
          accessibilityLabel={`${progressLabel}${monthReading}`}
          style={styles.progressRow}
        >
          <AppText variant="small" tone="muted" style={styles.progressLabel}>
            {progressLabel}
          </AppText>
          {allocation !== null ? (
            <MoneyText cents={allocation.suggestedCents} tone="neutral" tabular />
          ) : null}
        </View>

        {/*
          Tudo o que a versão anterior gritava na superfície. Nada foi apagado:
          desceu um nível. O `rankReason` sozinho é uma frase longa, e ele se
          repetia em cada card da lista — cinco metas eram cinco parágrafos
          empilhados antes de qualquer número aparecer.
        */}
        <Reveal label="Detalhes">
          <Badge label={status.badge} severity={status.severity} />

          {/* O porquê da posição sai inteiro do motor (`rankReason`). */}
          {allocation !== null ? (
            <AppText variant="small" tone="secondary">
              {allocation.rankReason}
            </AppText>
          ) : null}

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

          {/* O mesmo número da linha 3, agora com o rótulo escrito. O número é
              do plano, não daqui. */}
          {allocation !== null ? (
            <View style={styles.mathRow}>
              <AppText variant="small" tone="secondary">
                Guardar este mês
              </AppText>
              {allocation.suggestedCents === 0 ? (
                <Badge label="Sem verba este mês" severity="warning" />
              ) : (
                <MoneyText cents={allocation.suggestedCents} tabular />
              )}
            </View>
          ) : null}

          <AppText variant="caption" tone="muted">
            Últimos lançamentos
          </AppText>
          <DepositLog deposits={deposits.slice(0, EXTRATO_LIMIT)} onRemove={onRemoveDeposit} />
        </Reveal>

        {/*
          AÇÃO FICA NA SUPERFÍCIE, SEMPRE.
          Estes dois botões já estiveram dentro do <Reveal> acima, e isso era um
          bug e não uma economia de espaço: "Guardar dinheiro" é o ÚNICO caminho
          para depositar numa meta. Trancá-lo atrás de "Detalhes" transforma a
          tela em vitrine — a pessoa vê o quanto guardar e não tem como guardar.
          O orçamento de texto manda esconder EXPLICAÇÃO, nunca AÇÃO.
        */}
        <View style={styles.cardActions}>
          <Button label="Guardar dinheiro" icon="money" variant="secondary" onPress={onDeposit} />
          <Button label="Editar" variant="ghost" onPress={onEdit} />
        </View>
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
              {/*
                Este é o único emoji que a interface desenha por vontade própria,
                e ele passa porque é a ESCOLHA da pessoa virando o ícone da meta
                dela — conteúdo, não enfeite.

                A célula selecionada é amarela, então a tinta tem de ser onBrand.
                Hoje todos os GOAL_ICONS são emoji (glifo colorido ignora `color`)
                e nada aparece — mas o primeiro ícone de texto que entrar aqui
                acende branco sobre amarelo no tema escuro. Mesma armadilha que
                Chip.tsx e Button.tsx já fecharam.
              */}
              <AppText
                style={[
                  styles.iconEmoji,
                  { color: selected ? colors.ink.onBrand : colors.ink.primary },
                ]}
              >
                {icon.emoji}
              </AppText>
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
  const plan = usePlan();

  const [goalSheet, setGoalSheet] = useState<GoalSheetState | null>(null);
  const [form, setForm] = useState<GoalForm>(EMPTY_FORM);

  /** Meta recém-criada esperando o plano dizer em que posição ela caiu. */
  const [justCreatedGoalId, setJustCreatedGoalId] = useState<string | null>(null);

  const [depositGoalId, setDepositGoalId] = useState<string | null>(null);
  const [depositDirection, setDepositDirection] = useState<'in' | 'out'>('in');
  const [depositCents, setDepositCents] = useState<Cents>(0);
  const [depositMonth, setDepositMonth] = useState<MonthKey>(currentMonthKey);
  const [depositDay, setDepositDay] = useState<number>(() => new Date().getDate());
  const [depositNote, setDepositNote] = useState('');

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

  const allocationByGoal = useMemo(() => {
    const map = new Map<string, GoalAllocation>();
    for (const allocation of plan.allocations) map.set(allocation.goalId, allocation);
    return map;
  }, [plan.allocations]);

  /**
   * A lista na ordem do plano: rank 1 primeiro.
   *
   * O motor só ranqueia meta em aberto e com saldo a guardar, então meta
   * concluída e meta em 100% saem de `allocations` e caem aqui com `allocation`
   * null — sem número, e no fim da fila. É o lugar certo pra elas: a fila existe
   * pra dizer o que fazer com o dinheiro deste mês, e essas duas não pedem mais
   * dinheiro nenhum. Entre si, mantêm a ordem que a store já dava (`sort` é
   * estável desde ES2019).
   *
   * Plano inviável devolve `allocations` vazio: ninguém é numerado e a ordem fica
   * exatamente a de antes. A tela continua de pé sem plano.
   */
  const rows = useMemo(() => {
    const base = goals.flatMap((goal) => {
      const projection = projectionById.get(goal.id);
      if (projection === undefined) return [];
      return [{ goal, projection, allocation: allocationByGoal.get(goal.id) ?? null }];
    });

    return base.sort((a, b) => {
      if (a.allocation === null || b.allocation === null) {
        if (a.allocation === b.allocation) return 0;
        return a.allocation === null ? 1 : -1;
      }
      return a.allocation.rank - b.allocation.rank;
    });
  }, [goals, projectionById, allocationByGoal]);

  /**
   * Quem leva o amarelo da tela.
   *
   * A vitória ganha do botão "Nova meta" porque é o assunto do momento — a regra
   * de precedência manda o destaque apontar pro card do número principal antes
   * de apontar pra ação principal. `find` e não `some`: com duas metas batidas,
   * só a primeira da lista fica amarela. O amarelo é um dedo apontando; dois
   * dedos apontando pra lados diferentes não apontam pra nada.
   */
  const brandGoalId = useMemo(
    () =>
      rows.find(({ goal, projection }) => projection.progress >= 1 && goal.achievedAt === null)
        ?.goal.id ?? null,
    [rows],
  );

  const hasEmergencyGoal = goals.some((goal) => goal.kind === 'emergency');
  const suggestedEmergency = emergencyFundTarget(snapshot);
  const emergencyValue = emergencyCents ?? suggestedEmergency.targetCents;
  const hasPlan = plan.allocations.length > 0;

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
      // `addGoal` devolve void, então o id da meta nova sai da diferença entre o
      // antes e o depois. Procurar pelo rótulo acharia a meta errada no dia em
      // que existirem duas com o mesmo nome — e nada impede que existam.
      const before = new Set(useArrego.getState().goals.map((goal) => goal.id));
      void addGoal({
        label: form.label.trim(),
        kind: 'custom',
        emoji: form.emoji,
        targetCents: form.targetCents,
        targetDate,
        priority: form.priority,
      }).then(() => {
        // A store engole o erro de escrita em `state.error` em vez de rejeitar:
        // se a gravação falhou não existe meta nova, `created` vem undefined e
        // ninguém anuncia posição de uma meta que não foi salva.
        const created = useArrego.getState().goals.find((goal) => !before.has(goal.id));
        setJustCreatedGoalId(created?.id ?? null);
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

  /* ── A posição da meta recém-criada ── */

  /**
   * "Criei a meta — e aí, é prioridade de quê?". A resposta chega aqui.
   *
   * Precisa ser efeito, e não o `.then` do `addGoal`: o rank só existe depois
   * que o motor remonta o plano em cima da store nova, e o plano só chega nesta
   * tela pelo `usePlan()` do render. O `.then` guarda QUEM perguntou; o efeito
   * responde quando o número existe. A ordem é garantida — a store faz o `set`
   * antes de resolver a promise, então quando `justCreatedGoalId` acende, `goals`
   * e `plan` já contam com a meta nova.
   *
   * Alert e não card na tela: a pessoa acabou de tocar "Nova meta" no PÉ da
   * lista, e um card no topo nasceria fora da tela — a resposta que ela pediu
   * agora chegaria depois de um scroll que ninguém dá. O selo "#N" no card fica
   * de resposta permanente; o Alert é a resposta do momento. E o Alert é o único
   * lugar desta tela em que o `rankReason` aparece sem um toque antes: aqui ele
   * é a resposta a uma pergunta que a pessoa acabou de fazer, não moldura.
   */
  useEffect(() => {
    if (justCreatedGoalId === null) return;
    const goal = goals.find((item) => item.id === justCreatedGoalId);
    setJustCreatedGoalId(null);
    if (goal === undefined) return;

    const allocation = allocationByGoal.get(goal.id) ?? null;

    if (allocation === null) {
      // Sem sobra não existe fila. Prometer posição aqui seria inventar uma
      // ordem que o motor não calculou.
      Alert.alert(
        `${goal.label} entrou na lista`,
        'Posição eu não consigo dar: este mês não sobra nada pra dividir, então não existe fila pra ela entrar. Corta um gasto ou registra o que entrou, e eu monto a ordem na hora.',
        [
          { text: 'Ver o plano completo', onPress: abrirPlano },
          { text: 'Beleza', style: 'cancel' },
        ],
      );
      return;
    }

    Alert.alert(
      `${goal.label} é a sua #${allocation.rank}`,
      allocation.suggestedCents === 0
        ? `${allocation.rankReason}\n\nEste mês ela fica com R$ 0,00: quem está na frente levou a sobra inteira. Ela anda assim que a fila andar — ou você sobe a prioridade dela em "Editar".`
        : `${allocation.rankReason}\n\nGuardar este mês: ${formatCents(allocation.suggestedCents)}.`,
      [
        { text: 'Ver o plano completo', onPress: abrirPlano },
        { text: 'Beleza', style: 'cancel' },
      ],
    );
  }, [justCreatedGoalId, goals, allocationByGoal]);

  /* ── Render ── */

  return (
    <Screen scroll>
      <View style={styles.stack}>
        {/* "Ver o plano completo" era um botão de largura cheia dentro de um card
            explicativo. Vira a ação do cabeçalho: mesmo destino, um toque, zero
            moldura. Aparece só quando existe plano, como antes. */}
        <SectionHeader
          title="Metas"
          first
          actionLabel={hasPlan ? 'Ver o plano' : undefined}
          onAction={hasPlan ? abrirPlano : undefined}
        />

        {!hasEmergencyGoal ? (
          <Card>
            <View style={styles.cardStack}>
              <View style={styles.cardHead}>
                <Icon name="shield" size={24} tone="primary" />
                <AppText variant="subheading" style={styles.cardLabel}>
                  Crie sua reserva
                </AppText>
              </View>

              <AppText variant="small" tone="secondary">
                {shortLine('noEmergencyFund', hashSeed(month), {
                  nome,
                  valor: formatCents(suggestedEmergency.targetCents),
                })}
              </AppText>

              {/* O "porquê" não pode depender de qual fala foi sorteada — e
                  também não precisa estar aberto: quem já entendeu a reserva não
                  quer lê-lo de novo toda vez que passa por aqui. */}
              <Reveal label="Por que ela vem antes?">
                <AppText variant="small" tone="secondary">
                  Ela é a única meta que defende as outras: sem reserva, o primeiro imprevisto vira
                  parcela no cartão e come a viagem, o carro e o que mais estiver na fila.
                </AppText>
              </Reveal>

              <CurrencyField
                label="Alvo sugerido"
                cents={emergencyValue}
                onChangeCents={setEmergencyCents}
                // Quando o piso vence a conta dos 6 meses, o alvo não é "6 meses
                // do seu mês" — dizer que é contradiz o número no próprio campo.
                hint={
                  suggestedEmergency.usedFloor
                    ? 'Um mínimo pra começar. Refaço quando suas contas entrarem.'
                    : `6 meses de ${formatCents(snapshot.committedCents)} por mês. Dá pra ajustar.`
                }
              />

              {/* `secondary` e não `primary`: o amarelo desta tela já tem dono
                  (a vitória, ou o "Nova meta" no pé da lista). */}
              <Button
                label="Criar reserva"
                icon="shield"
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
              {/* Não existe Card 'serious': a severidade mora no Badge (ponto de
                  cor + glifo + rótulo), nunca na cor do fundo sozinha. */}
              <Badge label="As metas não cabem na sobra" severity="serious" />

              <AppText variant="small" tone="secondary">
                {fill(pickLine(GOALS_OVERFLOW_SHORT, hashSeed(month, 'objetivos:overflow')), {
                  nome,
                  valor: formatCents(overflow.gap),
                })}
              </AppText>

              <Reveal label="Ver a conta">
                {/* A conta inteira, na ordem em que ela acontece. O último número
                    é o `afterGoalsCents` cru: "Faltam −R$ 200" seria negativo em
                    cima de negativo, e a pessoa leria o sinal trocado. */}
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
              </Reveal>

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
          <View style={styles.empty}>
            <Icon name="target" size={32} tone="muted" />
            <AppText variant="heading" style={styles.centered}>
              Nenhuma meta ainda
            </AppText>
            <AppText variant="small" tone="secondary" style={styles.centered}>
              {shortLine('noGoals', hashSeed(month), { nome })}
            </AppText>
            {/* Sem meta não há vitória, então o amarelo está livre e é daqui. */}
            <View style={styles.emptyAction}>
              <Button label="Criar minha primeira meta" onPress={openNewGoal} />
            </View>
          </View>
        ) : (
          <>
            {/* Explica a numeração que vem logo abaixo, então aparece exatamente
                quando existe numeração: plano inviável não ranqueia ninguém, e
                aí isto estaria descrevendo uma ordem que não está na tela. */}
            {hasPlan ? (
              <Reveal label="Como a ordem é decidida?">
                <AppText variant="small" tone="secondary">
                  {'A ordem não é opinião minha, é a sua: reserva primeiro, depois o que você marcou como mais importante, e prazo ganha de "algum dia".'}
                </AppText>
              </Reveal>
            ) : null}

            {rows.map(({ goal, projection, allocation }) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                projection={projection}
                allocation={allocation}
                deposits={depositsByGoal.get(goal.id) ?? []}
                brand={brandGoalId === goal.id}
                nome={nome}
                month={month}
                onDeposit={() => openDeposit(goal.id)}
                onEdit={() => openEditGoal(goal)}
                onComplete={() => completeGoal(goal)}
                onRemoveDeposit={confirmRemoveDeposit}
              />
            ))}

            {/* O amarelo é dele só quando nenhuma vitória o reivindicou. */}
            <Button
              label="Nova meta"
              icon="add"
              variant={brandGoalId === null ? 'primary' : 'secondary'}
              onPress={openNewGoal}
              full
            />
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
          hint="Chuta o real. Alvo alto demais trava a meta."
        />

        <Field
          label="Prazo"
          hint={
            form.targetMonth !== null
              ? `Até o fim de ${formatMonthLong(form.targetMonth)}.`
              : 'Sem prazo a meta anda no seu tempo e não cobra valor mensal.'
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
          <Field label="Prioridade" hint="A reserva é sempre prioridade zero. É o ponto dela.">
            <Chip label="Prioridade zero" selected />
          </Field>
        ) : (
          <Field label="Prioridade" hint="Quando a sobra não cobre tudo, essa ordem decide quem anda.">
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
          // e aí a meta vira um número bonito que não existe. Em uma linha a
          // absolvição fica mais crível, aliás: quem se explica demais parece
          // estar pedindo desculpa pelo próprio botão.
          <AppText variant="small" tone="secondary">
            Tirou, tirou. Guardar não é prisão — registrar só mantém o número honesto.
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
  cardEmoji: { fontSize: 28, lineHeight: 34 },
  cardLabel: { flex: 1 },
  rankBadge: {
    // `minWidth` e não `width`: círculo em "#1", pílula em "#10".
    minWidth: 24,
    height: 24,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  progressLabel: { flexShrink: 1 },
  cardActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
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
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl },
  centered: { textAlign: 'center' },
  emptyAction: { marginTop: spacing.sm },
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
