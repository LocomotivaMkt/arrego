/**
 * Motor de análise do Arrego.
 *
 * Puro: sem I/O, sem banco, sem React, sem relógio — exceto por
 * `goalMonthlyPaceCents`, cuja janela é ancorada no mês corrente (ver lá).
 * Recebe os dados já carregados e devolve o retrato do mês.
 *
 * Tudo em centavos inteiros. Toda divisão termina em Math.round/Math.ceil:
 * um número quebrado aqui vira centavo fantasma na tela três telas depois.
 */

import type {
  Card,
  CardPurchase,
  CategorySlice,
  Cents,
  Expense,
  ExpenseCategory,
  Goal,
  GoalDeposit,
  GoalProjection,
  Income,
  MonthKey,
  MonthlySnapshot,
  Subscription,
} from '@/types/models';
import { currentMonthKey, monthKeyFromISO, monthsBetween } from '@/utils/date';
import { ratio, splitInstallments } from '@/utils/money';

/** Tudo que o motor precisa saber. Quem carrega isso é o repositório, não ele. */
export type FinancialData = {
  incomes: Income[];
  expenses: Expense[];
  subscriptions: Subscription[];
  cards: Card[];
  purchases: CardPurchase[];
  goals: Goal[];
  deposits: GoalDeposit[];
};

/** Teto de fatias do gráfico — casado com os 8 slots de `colors.series`. */
const MAX_SLICES = 8;
const OTHERS_KEY: ExpenseCategory = 'outros';
const EMERGENCY_MONTHS = 6;
const EMERGENCY_FLOOR_CENTS: Cents = 100_000;
const DEFAULT_PACE_WINDOW = 3;

/** Assinatura vira categoria própria: é o gasto que mais escapa do radar. */
const CATEGORY_LABELS = {
  moradia: 'Moradia',
  contas: 'Contas',
  mercado: 'Mercado',
  transporte: 'Transporte',
  saude: 'Saúde',
  educacao: 'Educação',
  lazer: 'Lazer',
  outros: 'Outros',
  assinaturas: 'Assinaturas',
} as const satisfies Record<ExpenseCategory | 'assinaturas', string>;

type BreakdownKey = keyof typeof CATEGORY_LABELS;

function sumBy<T>(items: readonly T[], pick: (item: T) => Cents): Cents {
  return items.reduce((total, item) => total + pick(item), 0);
}

function activeSubscriptions(subscriptions: readonly Subscription[]): Subscription[] {
  return subscriptions.filter((sub) => sub.cancelledAt === null);
}

/** Despesa recorrente viva, ou despesa pontual que caiu neste mês. */
function expenseCountsIn(expense: Expense, month: MonthKey): boolean {
  if (expense.recurring) return expense.archivedAt === null;
  return expense.spentOn !== null && monthKeyFromISO(expense.spentOn) === month;
}

/* ──────────────────────────── Assinaturas ─────────────────────────── */

/**
 * Custo MENSAL efetivo de uma assinatura.
 *
 * Cancelada vale 0 em qualquer conta: o registro fica no histórico, mas nenhum
 * total do app pode ser inflado por algo que a pessoa já cortou — nem se quem
 * chamar esquecer de filtrar.
 */
export function subscriptionMonthlyCents(sub: Subscription): Cents {
  if (sub.cancelledAt !== null) return 0;
  const monthly = sub.cycle === 'yearly' ? Math.round(sub.amountCents / 12) : sub.amountCents;
  const share = sub.shareCount ?? 1;
  // Dividindo com alguém, a pessoa só paga a parte dela.
  return share > 1 ? Math.round(monthly / share) : monthly;
}

/**
 * Custo ANUAL efetivo de uma assinatura.
 *
 * NÃO é `subscriptionMonthlyCents(sub) * 12`. O mensal de uma assinatura anual
 * já passou por um arredondamento, e multiplicá-lo de volta devolve um número
 * que a pessoa nunca pagou: R$ 100,00/ano vira 833 por mês, que vira R$ 99,96
 * por ano. O anual precisa nascer do valor real, com um único arredondamento
 * no fim — senão o app apresenta como "seu gasto anual" um número que não é.
 */
export function subscriptionYearlyCents(sub: Subscription): Cents {
  if (sub.cancelledAt !== null) return 0;
  const yearly = sub.cycle === 'yearly' ? sub.amountCents : sub.amountCents * 12;
  const share = sub.shareCount ?? 1;
  return share > 1 ? Math.round(yearly / share) : yearly;
}

/** Total anual das assinaturas ativas, somado sem passar pelo mensal arredondado. */
export function subscriptionsYearlyTotalCents(subscriptions: readonly Subscription[]): Cents {
  return sumBy(activeSubscriptions(subscriptions), subscriptionYearlyCents);
}

/* ───────────────────────────── Parcelas ───────────────────────────── */

/**
 * Parcelas que caem na fatura deste mês.
 *
 * Não filtra cartão arquivado de propósito: arquivar o cartão não apaga a
 * dívida — as parcelas restantes continuam chegando.
 */
export function installmentsForMonth(
  purchases: CardPurchase[],
  month: MonthKey,
): Array<{ purchase: CardPurchase; installmentNumber: number; amountCents: Cents }> {
  const result: Array<{ purchase: CardPurchase; installmentNumber: number; amountCents: Cents }> =
    [];

  for (const purchase of purchases) {
    const offset = monthsBetween(purchase.firstInstallmentMonth, month);
    if (offset < 0 || offset > purchase.installments - 1) continue;

    // `splitInstallments` fecha exatamente no total: o resto vai na 1ª parcela.
    // Somar `total / n` arredondado n vezes não fecha, e a diferença aparece.
    const amountCents = splitInstallments(purchase.totalCents, purchase.installments)[offset];
    if (amountCents === undefined) continue;

    result.push({ purchase, installmentNumber: offset + 1, amountCents });
  }

  return result;
}

/* ──────────────────────── Retrato do mês ──────────────────────────── */

export function buildSnapshot(data: FinancialData, month: MonthKey): MonthlySnapshot {
  const incomeFixedCents = sumBy(
    data.incomes.filter((income) => income.recurring && income.archivedAt === null),
    (income) => income.amountCents,
  );
  // Entrada pontual não olha `archivedAt`: o freela de março entrou em março,
  // e arquivar depois não desfaz o que já caiu na conta.
  const incomeVariableCents = sumBy(
    data.incomes.filter(
      (income) =>
        !income.recurring &&
        income.receivedOn !== null &&
        monthKeyFromISO(income.receivedOn) === month,
    ),
    (income) => income.amountCents,
  );
  const incomeTotalCents = incomeFixedCents + incomeVariableCents;

  const expensesFixedCents = sumBy(
    data.expenses.filter((expense) => expense.recurring && expense.archivedAt === null),
    (expense) => expense.amountCents,
  );
  const expensesVariableCents = sumBy(
    data.expenses.filter(
      (expense) =>
        !expense.recurring &&
        expense.spentOn !== null &&
        monthKeyFromISO(expense.spentOn) === month,
    ),
    (expense) => expense.amountCents,
  );

  const subscriptionsCents = sumBy(
    activeSubscriptions(data.subscriptions),
    subscriptionMonthlyCents,
  );
  const cardInstallmentsCents = sumBy(
    installmentsForMonth(data.purchases, month),
    (installment) => installment.amountCents,
  );

  const committedCents =
    expensesFixedCents + expensesVariableCents + subscriptionsCents + cardInstallmentsCents;

  // Pode ser negativo, e tem que poder: travar em 0 esconderia justamente o mês
  // em que a pessoa mais precisa ver o número.
  const freeCents = incomeTotalCents - committedCents;

  // Meta com prazo vencido entra como 0 (requiredMonthly null). Somar o valor
  // cheio de um prazo estourado explodiria a necessidade mensal e faria o app
  // cobrar um número que não existe.
  const goalsMonthlyNeedCents = sumBy(
    data.goals.filter((goal) => goal.targetDate !== null && goal.achievedAt === null),
    (goal) => projectGoal(goal, data.deposits, month).requiredMonthlyCents ?? 0,
  );

  return {
    month,
    incomeFixedCents,
    incomeVariableCents,
    incomeTotalCents,
    expensesFixedCents,
    expensesVariableCents,
    subscriptionsCents,
    cardInstallmentsCents,
    committedCents,
    freeCents,
    savingsRate: ratio(freeCents, incomeTotalCents),
    goalsMonthlyNeedCents,
    afterGoalsCents: freeCents - goalsMonthlyNeedCents,
  };
}

/* ───────────────────────── Quebra por categoria ───────────────────── */

function toSlice(key: BreakdownKey, amountCents: Cents, totalCents: Cents): CategorySlice {
  return {
    key,
    label: CATEGORY_LABELS[key],
    amountCents,
    share: ratio(amountCents, totalCents),
  };
}

/**
 * Onde o dinheiro comprometido do mês foi parar, pronto para o gráfico:
 * despesas + assinaturas + parcelas, agrupadas e ordenadas do maior ao menor.
 * O total bate com `committedCents` do snapshot.
 */
export function expenseBreakdown(data: FinancialData, month: MonthKey): CategorySlice[] {
  const totals = new Map<BreakdownKey, Cents>();
  const add = (key: BreakdownKey, cents: Cents): void => {
    totals.set(key, (totals.get(key) ?? 0) + cents);
  };

  for (const expense of data.expenses) {
    if (expenseCountsIn(expense, month)) add(expense.category, expense.amountCents);
  }

  for (const sub of activeSubscriptions(data.subscriptions)) {
    add('assinaturas', subscriptionMonthlyCents(sub));
  }

  for (const installment of installmentsForMonth(data.purchases, month)) {
    add(installment.purchase.category, installment.amountCents);
  }

  // Fatia de valor zero não é fatia: não tem área no gráfico e ainda roubaria um
  // dos 8 slots de cor de uma categoria que existe de verdade.
  const sorted = [...totals.entries()]
    .filter(([, cents]) => cents > 0)
    .map(([key, cents]) => ({ key, amountCents: cents }))
    // Desempate pela chave: sem ele, dois valores iguais trocam de cor e de
    // posição a cada render, e o gráfico "pisca" sem nada ter mudado.
    .sort((a, b) => b.amountCents - a.amountCents || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));

  const totalCents = sumBy(sorted, (slice) => slice.amountCents);

  if (sorted.length <= MAX_SLICES) {
    return sorted.map((slice) => toSlice(slice.key, slice.amountCents, totalCents));
  }

  // Existem 9 chaves possíveis (8 categorias + 'assinaturas'), então estourar o
  // teto significa que TODAS apareceram — e 'outros' é necessariamente uma
  // delas. Por isso o excedente ABSORVE a categoria 'outros' em vez de criar uma
  // segunda fatia com a mesma chave: chave repetida quebra lista e legenda.
  const kept = sorted.filter((slice) => slice.key !== OTHERS_KEY).slice(0, MAX_SLICES - 1);
  const keptKeys = new Set(kept.map((slice) => slice.key));
  const pooledCents = sumBy(
    sorted.filter((slice) => !keptKeys.has(slice.key)),
    (slice) => slice.amountCents,
  );

  return [
    ...kept.map((slice) => toSlice(slice.key, slice.amountCents, totalCents)),
    toSlice(OTHERS_KEY, pooledCents, totalCents),
  ];
}

/* ────────────────────────────── Metas ─────────────────────────────── */

/** Guardado = soma dos depósitos. Saque é negativo e conta como negativo. */
export function goalSavedCents(goalId: string, deposits: GoalDeposit[]): Cents {
  return sumBy(
    deposits.filter((deposit) => deposit.goalId === goalId),
    (deposit) => deposit.amountCents,
  );
}

/**
 * Ritmo mensal observado na janela dos últimos `monthsWindow` meses, incluindo o
 * mês corrente.
 *
 * Divide pelo número de MESES DA JANELA, não pelo número de meses em que houve
 * depósito. Dividir só pelos meses com depósito faz o ritmo mentir pra cima:
 * quem guardou R$ 300 uma única vez em três meses tem ritmo de R$ 100/mês, não
 * de R$ 300/mês — e é sobre esse número que a projeção promete uma data.
 *
 * A janela é ancorada no mês corrente (não em um mês passado como argumento):
 * "ritmo" só faz sentido em relação a agora.
 */
export function goalMonthlyPaceCents(
  goalId: string,
  deposits: GoalDeposit[],
  monthsWindow = DEFAULT_PACE_WINDOW,
): Cents {
  const window = Math.max(1, Math.floor(monthsWindow));
  const anchor = currentMonthKey();

  const total = sumBy(
    deposits.filter((deposit) => {
      if (deposit.goalId !== goalId) return false;
      const monthsAgo = monthsBetween(monthKeyFromISO(deposit.depositedOn), anchor);
      return monthsAgo >= 0 && monthsAgo < window;
    }),
    (deposit) => deposit.amountCents,
  );

  return Math.round(total / window);
}

export function projectGoal(goal: Goal, deposits: GoalDeposit[], month: MonthKey): GoalProjection {
  const savedCents = goalSavedCents(goal.id, deposits);
  const targetCents = goal.targetCents;
  const remainingCents = Math.max(0, targetCents - savedCents);
  const monthlyPaceCents = goalMonthlyPaceCents(goal.id, deposits);

  // Meta batida é 0 mês, mesmo com ritmo parado — não há o que esperar.
  // Ritmo zero ou negativo com dinheiro faltando é null: no ritmo atual, nunca.
  const monthsAtCurrentPace =
    remainingCents === 0
      ? 0
      : monthlyPaceCents <= 0
        ? null
        : Math.ceil(remainingCents / monthlyPaceCents);

  let requiredMonthlyCents: Cents | null = null;
  if (goal.targetDate !== null) {
    const monthsLeft = monthsBetween(month, monthKeyFromISO(goal.targetDate));
    // Prazo estourado não vira uma cobrança infinita. Sem número, o app fala
    // sobre remarcar a data em vez de exigir o impossível.
    requiredMonthlyCents = monthsLeft <= 0 ? null : Math.ceil(remainingCents / monthsLeft);
  }

  return {
    goalId: goal.id,
    savedCents,
    targetCents,
    // Teto em 1, sem piso em 0: saque líquido deixa o progresso negativo, e é
    // exatamente isso que aconteceu. Quem renderiza barra que trate a largura.
    progress: Math.min(1, ratio(savedCents, targetCents)),
    remainingCents,
    monthlyPaceCents,
    monthsAtCurrentPace,
    requiredMonthlyCents,
    onTrack: requiredMonthlyCents === null ? null : monthlyPaceCents >= requiredMonthlyCents,
  };
}

export function projectAllGoals(data: FinancialData, month: MonthKey): GoalProjection[] {
  return data.goals.map((goal) => projectGoal(goal, data.deposits, month));
}

/**
 * Reserva de emergência = 6x o CUSTO DE VIVER, não 6x a renda.
 * Quem ganha bem e gasta pouco não precisa de reserva gigante; a reserva existe
 * para cobrir o que o mês exige quando a renda para.
 * Piso de R$ 1.000 para quem ainda não cadastrou gasto nenhum — alvo zero não
 * é meta, é convite a não começar.
 */
export function emergencyFundTargetCents(snapshot: MonthlySnapshot): Cents {
  return emergencyFundTarget(snapshot).targetCents;
}

export type EmergencyFundTarget = {
  targetCents: Cents;
  /**
   * true = o piso venceu a conta dos 6 meses, ou seja, o alvo NÃO representa
   * o custo de viver da pessoa. Quem exibe o número precisa saber disso: uma
   * legenda dizendo "6 meses do seu mês" em cima de um valor que veio do piso
   * contradiz o próprio campo.
   */
  usedFloor: boolean;
};

export function emergencyFundTarget(snapshot: MonthlySnapshot): EmergencyFundTarget {
  const sixMonths = snapshot.committedCents * EMERGENCY_MONTHS;
  return sixMonths < EMERGENCY_FLOOR_CENTS
    ? { targetCents: EMERGENCY_FLOOR_CENTS, usedFloor: true }
    : { targetCents: sixMonths, usedFloor: false };
}
