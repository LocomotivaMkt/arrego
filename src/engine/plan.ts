/**
 * O PLANO DO MÊS — como dividir o que sobra.
 *
 * Puro: sem I/O, sem React. Recebe o retrato do mês e devolve para onde vai
 * cada real, com o porquê de cada decisão.
 *
 * A conta é uma CASCATA, nesta ordem:
 *   1. Lazer sai primeiro, não por último.
 *   2. Reserva de emergência tem prioridade sobre qualquer objetivo.
 *   3. Os objetivos disputam o que restou, por ordem de prioridade.
 *
 * Os dois primeiros passos precisam de justificativa, porque contrariam o
 * senso comum de planilha:
 *
 * LAZER PRIMEIRO. A intuição diz "guarde tudo que sobrar e se divirta com o
 * resto". Na prática isso produz um plano que a pessoa quebra no primeiro fim
 * de semana e, ao quebrar, abandona o app inteiro. Reservar uma fatia de lazer
 * é o que faz o resto do plano sobreviver ao mês. Um plano que não é seguido
 * rende exatamente zero.
 *
 * RESERVA NÃO LEVA 100%. A ordem matemática ótima é encher a reserva primeiro e
 * só então olhar para os objetivos. Mas alguém que ganha pouco passaria dois
 * anos vendo "R$ 0,00" na meta do carro, e ninguém aguenta dois anos de zero.
 * A reserva leva a maior parte e os objetivos ficam com o suficiente para se
 * mexerem. O app diz isso em voz alta em vez de esconder a régua.
 */

import type {
  Cents,
  Goal,
  GoalDeposit,
  GoalProjection,
  MonthKey,
  MonthlySnapshot,
} from '@/types/models';
import { monthKeyFromISO, monthsBetween } from '@/utils/date';
import { ratio } from '@/utils/money';
import {
  emergencyFundTarget,
  goalSavedCents,
  projectAllGoals,
  type FinancialData,
} from './analysis';

/** Fatia do que sobra que fica com o lazer. Ver o comentário do topo. */
const LAZER_SHARE = 0.2;

/** Fatia do poupável que vai para a reserva enquanto ela não estiver cheia. */
const RESERVA_SHARE = 0.7;

export type GoalAllocation = {
  goalId: string;
  label: string;
  emoji: string;
  /** 1 = o mais importante. É a resposta para "qual é a prioridade?". */
  rank: number;
  priority: number;
  isEmergency: boolean;
  /** Quanto pôr nesta meta NESTE mês. */
  suggestedCents: Cents;
  /** Quanto precisaria por mês para bater o prazo. Null = meta sem prazo. */
  requiredMonthlyCents: Cents | null;
  savedCents: Cents;
  targetCents: Cents;
  remainingCents: Cents;
  /** 0–1 */
  progress: number;
  /** Meses até o fim NO RITMO SUGERIDO. Null = sugestão zero (não chega). */
  monthsAtSuggested: number | null;
  /** A sugestão cobre o prazo? Null = meta sem prazo para comparar. */
  meetsDeadline: boolean | null;
  /** Quanto falta por mês entre o sugerido e o necessário. 0 = está de pé. */
  shortfallCents: Cents;
  /** Por que esta meta está nesta posição. Texto pronto para a tela. */
  rankReason: string;
};

export type MonthlyPlan = {
  month: MonthKey;
  incomeTotalCents: Cents;
  committedCents: Cents;
  freeCents: Cents;
  /** false = não sobra nada para dividir, e o plano vira "corte alguma coisa". */
  viable: boolean;

  /** Os três baldes. Somados dão exatamente freeCents quando viável. */
  reservaCents: Cents;
  objetivosCents: Cents;
  lazerCents: Cents;

  emergency: {
    exists: boolean;
    funded: boolean;
    targetCents: Cents;
    savedCents: Cents;
    remainingCents: Cents;
    /** Meses para encher no ritmo sugerido. Null = sugestão zero. */
    monthsToFund: number | null;
    /**
     * De onde veio `targetCents`:
     *   'usuario'  — a meta existe e a pessoa escolheu o alvo. Só ela manda nele.
     *   'sugestao' — a meta ainda não existe; o alvo é a nossa sugestão do mês.
     *
     * Sem isto a tela afirma coisa sobre o número errado: `usedFloor` descreve a
     * SUGESTÃO, mas assim que a meta existe `targetCents` passa a ser o alvo que
     * a PESSOA congelou. Os dois divergem no primeiro gasto cadastrado, e aí a
     * legenda diz "6 meses do seu custo de viver" em cima de um R$ 1.000 que é
     * um doze avos disso. A legenda precisa descrever o número que está na tela.
     */
    targetSource: 'usuario' | 'sugestao';
    /** Só quer dizer alguma coisa quando `targetSource === 'sugestao'`. */
    usedFloor: boolean;
    /** A sugestão de hoje, para a tela poder oferecer o reajuste do alvo. */
    suggestedTargetCents: Cents;
  };

  /** Todas as metas, já ordenadas por rank. Inclui as que ficaram com R$ 0. */
  allocations: GoalAllocation[];

  /** Metas que não couberam no mês (sugestão zero). Subconjunto de allocations. */
  unfunded: GoalAllocation[];

  /** Observações factuais sobre o plano. Sem ironia — a persona veste isso depois. */
  notes: string[];
};

/**
 * Ordena as metas e explica a ordem.
 *
 * A régua, em ordem de desempate:
 *   1. Reserva de emergência sempre primeiro — é a única que protege as outras.
 *   2. Prioridade que a pessoa escolheu (1 Agora < 50 Em breve < 100 Algum dia).
 *   3. Prazo mais próximo. Meta com data vence meta sem data: a sem data não
 *      perde nada esperando mais um mês.
 *   4. Falta menos. Empate real vira vitória rápida, porque terminar uma meta é
 *      o que convence alguém a continuar.
 */
type RankEntry = { goal: Goal; projection: GoalProjection };

const SHIELD_REASON =
  'Vem antes de todas: é a única meta que protege as outras. Sem ela, o primeiro imprevisto vira parcela no cartão e come o resto.';

function priorityLabel(priority: number): string {
  return priority <= 1 ? 'Agora' : priority <= 50 ? 'Em breve' : 'Algum dia';
}

function deadlineMonthsOf(goal: Goal, month: MonthKey): number {
  return goal.targetDate === null
    ? Number.POSITIVE_INFINITY
    : Math.max(0, monthsBetween(month, monthKeyFromISO(goal.targetDate)));
}

/**
 * Por que `winner` ficou na frente de `loser` — o critério que DE FATO decidiu,
 * na mesma ordem dos desempates de `rankGoals`.
 *
 * A tentação é escrever "é a sua meta mais importante, foi você que escolheu".
 * Mas quando duas metas têm a mesma prioridade quem decidiu a ordem foi o
 * desempate, não a pessoa — e devolver a ela uma decisão que ela não tomou é a
 * forma mais rápida de o app perder credibilidade: ela olha as duas metas
 * "Em breve", não lembra de ter escolhido, e conclui que o app inventa.
 */
function beatReason(winner: RankEntry, loser: RankEntry, month: MonthKey): string {
  if (winner.goal.priority !== loser.goal.priority) {
    return `você marcou "${winner.goal.label}" como "${priorityLabel(winner.goal.priority)}" e "${loser.goal.label}" como "${priorityLabel(loser.goal.priority)}". A ordem é sua, não minha.`;
  }

  const winnerDeadline = deadlineMonthsOf(winner.goal, month);
  const loserDeadline = deadlineMonthsOf(loser.goal, month);

  if (winnerDeadline !== loserDeadline) {
    if (loserDeadline === Number.POSITIVE_INFINITY) {
      return `as duas estão em "${priorityLabel(winner.goal.priority)}", mas "${winner.goal.label}" tem data marcada e "${loser.goal.label}" não. Quem tem prazo não pode esperar; quem não tem, não perde nada esperando mais um mês.`;
    }
    return `as duas estão em "${priorityLabel(winner.goal.priority)}" e o prazo de "${winner.goal.label}" é mais perto.`;
  }

  return `empataram em tudo — prioridade e prazo. Desempatei pela que falta menos: fechar uma meta é o que dá gás pra próxima.`;
}

function explainRank(
  entry: RankEntry,
  previous: RankEntry | null,
  next: RankEntry | null,
  isEmergency: boolean,
  month: MonthKey,
): string {
  if (isEmergency) return SHIELD_REASON;
  if (previous === null && next === null) {
    return 'É a sua única meta na fila. Depois da reserva, o que sobrar é todo dela.';
  }
  if (previous === null && next !== null) {
    return `Está no topo da fila porque ${beatReason(entry, next, month)}`;
  }
  if (previous !== null) {
    return `Está atrás de "${previous.goal.label}" porque ${beatReason(previous, entry, month)}`;
  }
  return '';
}

function rankGoals(
  goals: Goal[],
  projections: GoalProjection[],
  month: MonthKey,
  emergencyGoalId: string | null,
): Array<{ goal: Goal; projection: GoalProjection; reason: string }> {
  const byId = new Map(projections.map((p) => [p.goalId, p]));

  const pending = goals
    .filter((goal) => goal.achievedAt === null)
    .map((goal) => {
      const projection = byId.get(goal.id);
      return projection ? { goal, projection } : null;
    })
    .filter((entry): entry is RankEntry => entry !== null)
    .filter((entry) => entry.projection.remainingCents > 0);

  pending.sort((a, b) => {
    const aEmergency = a.goal.id === emergencyGoalId ? 0 : 1;
    const bEmergency = b.goal.id === emergencyGoalId ? 0 : 1;
    if (aEmergency !== bEmergency) return aEmergency - bEmergency;

    if (a.goal.priority !== b.goal.priority) return a.goal.priority - b.goal.priority;

    const aDeadline = deadlineMonthsOf(a.goal, month);
    const bDeadline = deadlineMonthsOf(b.goal, month);
    if (aDeadline !== bDeadline) return aDeadline - bDeadline;

    return a.projection.remainingCents - b.projection.remainingCents;
  });

  // A reserva sai da comparação: ela ganha por decreto, e explicar que ela
  // "venceu a #2 por prioridade" seria falso — ela nem disputou.
  const contenders = pending.filter((entry) => entry.goal.id !== emergencyGoalId);

  return pending.map((entry) => {
    const isEmergency = entry.goal.id === emergencyGoalId;
    if (isEmergency) return { ...entry, reason: SHIELD_REASON };

    const index = contenders.indexOf(entry);
    const previous = index > 0 ? (contenders[index - 1] ?? null) : null;
    const next = contenders[index + 1] ?? null;
    return { ...entry, reason: explainRank(entry, previous, next, false, month) };
  });
}

/** Quanto esta meta "pede" por mês. Sem prazo, divide o que sobrou por igual. */
function askFor(projection: GoalProjection, remainingGoalsWithoutDeadline: number, pot: Cents): Cents {
  if (projection.requiredMonthlyCents !== null) {
    return Math.min(projection.requiredMonthlyCents, projection.remainingCents);
  }
  const share = remainingGoalsWithoutDeadline > 0 ? Math.floor(pot / remainingGoalsWithoutDeadline) : pot;
  return Math.min(share, projection.remainingCents);
}

export function buildMonthlyPlan(
  data: FinancialData,
  snapshot: MonthlySnapshot,
  month: MonthKey,
): MonthlyPlan {
  const free = snapshot.freeCents;
  const projections = projectAllGoals(data, month);
  const emergencyGoal = data.goals.find((goal) => goal.kind === 'emergency') ?? null;
  const emergencyTarget = emergencyFundTarget(snapshot);
  const emergencySaved = emergencyGoal ? goalSavedCents(emergencyGoal.id, data.deposits) : 0;
  const emergencyTargetCents = emergencyGoal ? emergencyGoal.targetCents : emergencyTarget.targetCents;
  const emergencyRemaining = Math.max(0, emergencyTargetCents - emergencySaved);
  const emergencyFunded = emergencyGoal !== null && emergencyRemaining === 0;

  const notes: string[] = [];

  // Sem sobra não existe plano, só uma conta que não fecha. Devolver baldes
  // zerados é mais honesto do que distribuir dinheiro que não existe.
  if (free <= 0) {
    return {
      month,
      incomeTotalCents: snapshot.incomeTotalCents,
      committedCents: snapshot.committedCents,
      freeCents: free,
      viable: false,
      reservaCents: 0,
      objetivosCents: 0,
      lazerCents: 0,
      emergency: {
        exists: emergencyGoal !== null,
        funded: emergencyFunded,
        targetCents: emergencyTargetCents,
        savedCents: emergencySaved,
        remainingCents: emergencyRemaining,
        monthsToFund: null,
        targetSource: emergencyGoal !== null ? 'usuario' : 'sugestao',
        usedFloor: emergencyTarget.usedFloor,
        suggestedTargetCents: emergencyTarget.targetCents,
      },
      allocations: [],
      unfunded: [],
      notes:
        snapshot.incomeTotalCents === 0
          ? ['Sem nenhuma entrada cadastrada, não dá para montar plano nenhum.']
          : ['Seus gastos já passaram do que entra. Antes de dividir, precisa sobrar.'],
    };
  }

  const lazerCents = Math.round(free * LAZER_SHARE);
  const poupavel = free - lazerCents;

  // A reserva leva a maior fatia enquanto está incompleta, mas nunca mais do que
  // falta para completá-la: passar disso seria empatar dinheiro numa meta pronta
  // enquanto o resto espera.
  const reservaWanted = emergencyFunded ? 0 : Math.round(poupavel * RESERVA_SHARE);
  const reservaCents = Math.min(reservaWanted, emergencyRemaining);
  const objetivosCents = poupavel - reservaCents;

  const ranked = rankGoals(data.goals, projections, month, emergencyGoal?.id ?? null);

  // A reserva já foi servida no balde próprio: ela sai da disputa dos objetivos.
  const contenders = ranked.filter((entry) => entry.goal.id !== emergencyGoal?.id);

  let pot = objetivosCents;
  const allocations: GoalAllocation[] = [];

  if (emergencyGoal) {
    const projection = projections.find((p) => p.goalId === emergencyGoal.id);
    const emergencyEntry = ranked.find((entry) => entry.goal.id === emergencyGoal.id);
    if (projection && emergencyEntry) {
      allocations.push(
        toAllocation(emergencyGoal, projection, reservaCents, 1, emergencyEntry.reason, true),
      );
    }
  }

  const withoutDeadlineTotal = contenders.filter(
    (entry) => entry.projection.requiredMonthlyCents === null,
  ).length;
  let withoutDeadlineLeft = withoutDeadlineTotal;

  contenders.forEach((entry, index) => {
    const ask = askFor(entry.projection, withoutDeadlineLeft, pot);
    const given = Math.max(0, Math.min(ask, pot));
    pot -= given;
    if (entry.projection.requiredMonthlyCents === null) withoutDeadlineLeft--;

    const rank = allocations.length + 1;
    allocations.push(toAllocation(entry.goal, entry.projection, given, rank, entry.reason, false));
  });

  // Sobrou dinheiro no balde de objetivos (todas as metas já estão cobertas):
  // vira lazer em vez de ficar num limbo que não soma com nada.
  const leftover = pot;
  const finalObjetivos = objetivosCents - leftover;
  const finalLazer = lazerCents + leftover;

  const unfunded = allocations.filter((a) => a.suggestedCents === 0);
  const behind = allocations.filter((a) => a.shortfallCents > 0);

  if (!emergencyGoal) {
    notes.push(
      'Você ainda não tem reserva de emergência. Enquanto ela não existir, qualquer imprevisto vira dívida.',
    );
  } else if (!emergencyFunded) {
    notes.push(
      'Enquanto a reserva não fecha, ela leva a maior parte do que você guarda. Não tudo: suas outras metas também precisam andar.',
    );
  }
  if (unfunded.length > 0) {
    notes.push(
      `${unfunded.length === 1 ? 'Uma meta ficou' : `${unfunded.length} metas ficaram`} sem nada este mês: o que sobra não alcança todas.`,
    );
  }
  if (behind.length > 0) {
    notes.push(
      `${behind.length === 1 ? 'Uma meta não bate' : `${behind.length} metas não batem`} o prazo no valor sugerido. Dá pra subir o valor ou empurrar a data — as duas saídas são honestas.`,
    );
  }
  if (leftover > 0 && allocations.length > 0) {
    notes.push('Suas metas já estão todas cobertas. O que sobrou foi pro lazer, sem culpa.');
  }

  const monthsToFund =
    reservaCents > 0 ? Math.ceil(emergencyRemaining / reservaCents) : emergencyFunded ? 0 : null;

  return {
    month,
    incomeTotalCents: snapshot.incomeTotalCents,
    committedCents: snapshot.committedCents,
    freeCents: free,
    viable: true,
    reservaCents,
    objetivosCents: finalObjetivos,
    lazerCents: finalLazer,
    emergency: {
      exists: emergencyGoal !== null,
      funded: emergencyFunded,
      targetCents: emergencyTargetCents,
      savedCents: emergencySaved,
      remainingCents: emergencyRemaining,
      monthsToFund,
      targetSource: emergencyGoal !== null ? 'usuario' : 'sugestao',
      usedFloor: emergencyTarget.usedFloor,
      suggestedTargetCents: emergencyTarget.targetCents,
    },
    allocations,
    unfunded,
    notes,
  };
}

function toAllocation(
  goal: Goal,
  projection: GoalProjection,
  suggestedCents: Cents,
  rank: number,
  rankReason: string,
  isEmergency: boolean,
): GoalAllocation {
  const required = projection.requiredMonthlyCents;
  const shortfall = required === null ? 0 : Math.max(0, required - suggestedCents);
  return {
    goalId: goal.id,
    label: goal.label,
    emoji: goal.emoji,
    rank,
    priority: goal.priority,
    isEmergency,
    suggestedCents,
    requiredMonthlyCents: required,
    savedCents: projection.savedCents,
    targetCents: projection.targetCents,
    remainingCents: projection.remainingCents,
    progress: projection.progress,
    monthsAtSuggested:
      suggestedCents > 0 ? Math.ceil(projection.remainingCents / suggestedCents) : null,
    meetsDeadline: required === null ? null : suggestedCents >= required,
    shortfallCents: shortfall,
    rankReason,
  };
}

/* ─────────────────── Aplicar o plano (registrar, não mover) ─────────────── */

/**
 * A NOTA QUE MARCA UM DEPÓSITO FEITO PELO PLANO.
 *
 * É o que permite saber, no mês seguinte, que o plano já foi aplicado — e o que
 * distingue "a Arrego registrou isso por mim" de "eu registrei na mão".
 * Mudar este texto quebra a detecção de repetição em meses já gravados.
 */
export const PLAN_NOTE_PREFIX = 'Plano de';

export function planNote(month: MonthKey): string {
  return `${PLAN_NOTE_PREFIX} ${month}`;
}

export type PlannedDeposit = {
  goalId: string;
  label: string;
  emoji: string;
  amountCents: Cents;
};

/**
 * O que a Arrego vai REGISTRAR nas metas se a pessoa mandar.
 *
 * ┌────────────────────────────────────────────────────────────────────────┐
 * │ ISTO NÃO MOVE DINHEIRO NENHUM. O Arrego não fala com banco: ele é um   │
 * │ caderno. Aplicar o plano ANOTA que a pessoa separou o dinheiro — quem  │
 * │ separa de verdade é ela, no app do banco dela. Toda cópia de tela que  │
 * │ falar disso precisa deixar isso explícito, porque a alternativa é a    │
 * │ pessoa achar que o app transferiu e ficar meses com uma reserva que só │
 * │ existe no gráfico.                                                     │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * Só entram metas com sugestão > 0: registrar depósito de R$ 0 seria sujar o
 * extrato com linhas que não dizem nada.
 */
export function plannedDeposits(plan: MonthlyPlan): PlannedDeposit[] {
  if (!plan.viable) return [];
  return plan.allocations
    .filter((allocation) => allocation.suggestedCents > 0)
    .map((allocation) => ({
      goalId: allocation.goalId,
      label: allocation.label,
      emoji: allocation.emoji,
      amountCents: allocation.suggestedCents,
    }));
}

export function plannedDepositsTotal(plan: MonthlyPlan): Cents {
  return plannedDeposits(plan).reduce((total, item) => total + item.amountCents, 0);
}

/**
 * O plano deste mês já foi aplicado?
 *
 * Sem esta checagem, tocar duas vezes no botão registra tudo duas vezes e a
 * pessoa vê uma reserva que dobrou sozinha — o tipo de erro que faz alguém
 * desinstalar um app de dinheiro e nunca mais voltar.
 */
export function planAlreadyApplied(deposits: GoalDeposit[], month: MonthKey): boolean {
  const note = planNote(month);
  return deposits.some(
    (deposit) => deposit.note === note && monthKeyFromISO(deposit.depositedOn) === month,
  );
}

/** Quanto já foi registrado pelo plano neste mês. Para ela dizer o número certo. */
export function appliedPlanTotal(deposits: GoalDeposit[], month: MonthKey): Cents {
  const note = planNote(month);
  return deposits
    .filter((deposit) => deposit.note === note && monthKeyFromISO(deposit.depositedOn) === month)
    .reduce((total, deposit) => total + deposit.amountCents, 0);
}

/** Quanto do que entra vira lazer. Para a tela dizer "X% da sua renda". */
export function lazerShareOfIncome(plan: MonthlyPlan): number {
  return ratio(plan.lazerCents, plan.incomeTotalCents);
}

/** Quanto do que entra vira poupança (reserva + objetivos). */
export function savingShareOfIncome(plan: MonthlyPlan): number {
  return ratio(plan.reservaCents + plan.objetivosCents, plan.incomeTotalCents);
}
