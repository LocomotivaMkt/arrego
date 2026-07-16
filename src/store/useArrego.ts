/**
 * Estado global do Arrego: a ponte entre os repositórios (disco) e o motor
 * (análise + falas da persona).
 *
 * Duas decisões estruturais moram aqui:
 *
 * 1. QUEM ATUALIZA A MEMÓRIA. O tipo de retorno de cada repo diz o que fazer.
 *    Repo que DEVOLVE a entidade (`create`) já normalizou tudo: a entidade entra
 *    no array em memória e o banco não é lido de novo. Repo que devolve VOID
 *    (`update`, `archive`, `cancel`, `markOnboarded`) normalizou campos acoplados
 *    pelo CHECK do schema e carimbou timestamps que só ele conhece — adivinhar
 *    isso aqui faria a memória divergir do disco em silêncio. Esses recarregam
 *    SÓ a tabela mexida: um SELECT numa tabela local, nunca a re-hidratação do
 *    app inteiro (que é lenta e faz a lista piscar).
 *
 * 2. OS DERIVADOS SÃO CAROS. `buildSnapshot`/`generateInsights` varrem tudo.
 *    Cada seletor é memoizado por IDENTIDADE dos arrays de origem, num cache
 *    compartilhado por todas as telas — trocar `error` ou digitar num input não
 *    recalcula nada, e dois componentes lendo o mesmo derivado calculam uma vez só.
 */

import { getDb, resetDatabase } from '@/db/client';
import {
  cardsRepo,
  expensesRepo,
  goalsRepo,
  incomesRepo,
  profileRepo,
  subscriptionsRepo,
  type CardInput,
  type CardPatch,
  type CardPurchaseInput,
  type ExpenseInput,
  type ExpensePatch,
  type GoalDepositInput,
  type GoalInput,
  type GoalPatch,
  type IncomeInput,
  type IncomePatch,
  type ProfileInput,
  type SubscriptionInput,
  type SubscriptionPatch,
} from '@/db/repositories';
import { buildSnapshot, projectAllGoals, type FinancialData } from '@/engine/analysis';
import { generateInsights, topInsight } from '@/engine/insights';
import type {
  Card,
  CardPurchase,
  Expense,
  Goal,
  GoalDeposit,
  GoalProjection,
  Income,
  Insight,
  MonthKey,
  MonthlySnapshot,
  Profile,
  Subscription,
} from '@/types/models';
import { currentMonthKey } from '@/utils/date';
import { create } from 'zustand';

export type ArregoState = {
  hydrated: boolean;
  loading: boolean;
  error: string | null;

  profile: Profile | null;
  incomes: Income[];
  expenses: Expense[];
  subscriptions: Subscription[];
  cards: Card[];
  purchases: CardPurchase[];
  goals: Goal[];
  deposits: GoalDeposit[];

  month: MonthKey;

  hydrate: () => Promise<void>;
  setMonth: (m: MonthKey) => void;

  saveProfile: (input: ProfileInput) => Promise<void>;
  finishOnboarding: () => Promise<void>;

  addIncome: (input: IncomeInput) => Promise<void>;
  updateIncome: (id: string, patch: IncomePatch) => Promise<void>;
  archiveIncome: (id: string) => Promise<void>;
  removeIncome: (id: string) => Promise<void>;

  addExpense: (input: ExpenseInput) => Promise<void>;
  updateExpense: (id: string, patch: ExpensePatch) => Promise<void>;
  archiveExpense: (id: string) => Promise<void>;
  removeExpense: (id: string) => Promise<void>;

  addSubscription: (input: SubscriptionInput) => Promise<void>;
  updateSubscription: (id: string, patch: SubscriptionPatch) => Promise<void>;
  cancelSubscription: (id: string) => Promise<void>;
  removeSubscription: (id: string) => Promise<void>;

  addCard: (input: CardInput) => Promise<void>;
  updateCard: (id: string, patch: CardPatch) => Promise<void>;
  archiveCard: (id: string) => Promise<void>;
  removeCard: (id: string) => Promise<void>;

  addPurchase: (input: CardPurchaseInput) => Promise<void>;
  removePurchase: (id: string) => Promise<void>;

  addGoal: (input: GoalInput) => Promise<void>;
  updateGoal: (id: string, patch: GoalPatch) => Promise<void>;
  removeGoal: (id: string) => Promise<void>;

  addDeposit: (input: GoalDepositInput) => Promise<void>;
  removeDeposit: (id: string) => Promise<void>;

  wipeEverything: () => Promise<void>;
};

/* ─────────────────────────── Leitura do disco ─────────────────────────── */

/**
 * Arquivado e cancelado ENTRAM na memória, e isso é deliberado: o motor conta
 * com eles. `buildSnapshot` não filtra `archivedAt` na renda pontual (o freela
 * de março entrou em março, arquivar depois não desfaz), `generateInsights`
 * deriva `hasIncome` de `archivedAt === null`, e a assinatura cancelada é a
 * prova de que a pessoa cortou o gasto. Carregar só o que está ativo mataria
 * essas três regras em silêncio — nenhuma delas quebraria, todas mentiriam.
 */
const listIncomes = (): Promise<Income[]> => incomesRepo.list({ includeArchived: true });
const listExpenses = (): Promise<Expense[]> => expensesRepo.list({ includeArchived: true });
const listSubscriptions = (): Promise<Subscription[]> =>
  subscriptionsRepo.list({ includeCancelled: true });
const listCards = (): Promise<Card[]> => cardsRepo.list({ includeArchived: true });

/* ──────────────────────── Ordenação em memória ────────────────────────── */

/**
 * Espelham o ORDER BY de cada repo. Sem isso, um item recém-criado aparece no
 * fim da lista e PULA para o lugar certo na próxima abertura do app — o mesmo
 * "pisca" que a re-hidratação causaria, só que adiado.
 */

/** `x IS NOT NULL` do SQL: nulo primeiro (0), preenchido depois (1). */
const flagLast = (value: string | null): number => (value === null ? 0 : 1);
const asc = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
const desc = (a: string, b: string): number => asc(b, a);

const byIncome = (a: Income, b: Income): number =>
  flagLast(a.archivedAt) - flagLast(b.archivedAt) ||
  b.amountCents - a.amountCents ||
  desc(a.createdAt, b.createdAt);

const byExpense = (a: Expense, b: Expense): number =>
  flagLast(a.archivedAt) - flagLast(b.archivedAt) ||
  b.amountCents - a.amountCents ||
  desc(a.createdAt, b.createdAt);

const bySubscription = (a: Subscription, b: Subscription): number =>
  flagLast(a.cancelledAt) - flagLast(b.cancelledAt) ||
  b.amountCents - a.amountCents ||
  desc(a.createdAt, b.createdAt);

const byCard = (a: Card, b: Card): number =>
  flagLast(a.archivedAt) - flagLast(b.archivedAt) || asc(a.createdAt, b.createdAt);

const byGoal = (a: Goal, b: Goal): number =>
  flagLast(a.achievedAt) - flagLast(b.achievedAt) ||
  a.priority - b.priority ||
  asc(a.createdAt, b.createdAt);

const byPurchase = (a: CardPurchase, b: CardPurchase): number =>
  desc(a.firstInstallmentMonth, b.firstInstallmentMonth) || desc(a.createdAt, b.createdAt);

const byDeposit = (a: GoalDeposit, b: GoalDeposit): number =>
  desc(a.depositedOn, b.depositedOn) || desc(a.createdAt, b.createdAt);

function insertSorted<T>(items: readonly T[], item: T, compare: (a: T, b: T) => number): T[] {
  // Novo array sempre: mutar o atual não trocaria a identidade e a tela não
  // re-renderizaria. `sort` é estável (ES2019+), então empates preservam a ordem.
  return [...items, item].sort(compare);
}

/* ────────────────────────────── Memoização ────────────────────────────── */

/**
 * Cache de um slot só, por identidade dos argumentos. Um slot basta porque o
 * estado é único e global: toda tela chama com exatamente os mesmos arrays, e
 * quem chamar depois acerta o cache em vez de varrer tudo de novo.
 *
 * O resultado estável também é o que segura o `useSyncExternalStore` do zustand:
 * seletor que devolve objeto novo a cada chamada re-renderiza para sempre.
 */
function memoize<A extends readonly unknown[], R>(compute: (...args: A) => R): (...args: A) => R {
  let cache: { args: A; result: R } | null = null;
  return (...args: A): R => {
    if (cache !== null && sameArgs(cache.args, args)) return cache.result;
    const result = compute(...args);
    cache = { args, result };
    return result;
  };
}

function sameArgs(a: readonly unknown[], b: readonly unknown[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((value, index) => Object.is(value, b[index]));
}

/* ──────────────────────────────── Erros ───────────────────────────────── */

/**
 * A mensagem vaza para a tela, então fala português de gente. Erro do repo já
 * vem redigido assim ("Meta precisa de um valor alvo maior que zero"); o
 * genérico é para o que sobra — nada de "[object Object]" na cara da pessoa.
 */
function messageOf(err: unknown): string {
  if (err instanceof Error && err.message.trim() !== '') return err.message;
  return 'Deu ruim aqui do meu lado e o dado não foi salvo. Tenta de novo?';
}

/* ─────────────────────────────── A store ──────────────────────────────── */

const EMPTY: Pick<
  ArregoState,
  | 'profile'
  | 'incomes'
  | 'expenses'
  | 'subscriptions'
  | 'cards'
  | 'purchases'
  | 'goals'
  | 'deposits'
> = {
  profile: null,
  incomes: [],
  expenses: [],
  subscriptions: [],
  cards: [],
  purchases: [],
  goals: [],
  deposits: [],
};

/**
 * `hydrate` em voo. O layout raiz chama na montagem e o React pode montar duas
 * vezes; sem isto, duas leituras completas concorrentes disputam o `set`.
 */
let hydration: Promise<void> | null = null;

export const useArrego = create<ArregoState>()((set, get) => {
  /** Toda escrita passa por aqui: erro vira estado, nunca derruba o app. */
  async function write(run: () => Promise<void>): Promise<void> {
    try {
      await run();
      // Só apaga o erro se houver erro: `set` incondicional acordaria todo
      // subscriber da store à toa.
      if (get().error !== null) set({ error: null });
    } catch (err) {
      set({ error: messageOf(err) });
    }
  }

  async function runHydrate(): Promise<void> {
    set({ loading: true, error: null });
    try {
      const [profile, incomes, expenses, subscriptions, cards, purchases, goals, deposits] =
        await Promise.all([
          profileRepo.get(),
          listIncomes(),
          listExpenses(),
          listSubscriptions(),
          listCards(),
          cardsRepo.listPurchases(),
          goalsRepo.list(),
          goalsRepo.listDeposits(),
        ]);

      set({
        profile,
        incomes,
        expenses,
        subscriptions,
        cards,
        purchases,
        goals,
        deposits,
        hydrated: true,
        loading: false,
        error: null,
      });
    } catch (err) {
      // `hydrated: true` mesmo na falha: a flag significa "a tentativa terminou",
      // não "deu certo". Quem gateia o splash em `!hydrated` travaria para sempre
      // num spinner sem nunca mostrar o `error` que explica o que houve.
      //
      // Os arrays ficam como estão de propósito. Na primeira carga já estão
      // vazios; numa recarga que falhe, zerá-los apagaria da tela um dado bom
      // que continua no disco — a leitura é que falhou, não o dinheiro que sumiu.
      set({ hydrated: true, loading: false, error: messageOf(err) });
    }
  }

  return {
    ...EMPTY,
    hydrated: false,
    loading: false,
    error: null,
    month: currentMonthKey(),

    hydrate: () => {
      if (hydration !== null) return hydration;
      const running = runHydrate().finally(() => {
        hydration = null;
      });
      hydration = running;
      return running;
    },

    setMonth: (m) => set({ month: m }),

    /* ── Perfil ── */

    saveProfile: (input) =>
      write(async () => {
        set({ profile: await profileRepo.upsert(input) });
      }),

    finishOnboarding: () =>
      write(async () => {
        await profileRepo.markOnboarded();
        // `markOnboarded` carimba a data lá dentro e devolve void; reler a única
        // linha é mais barato que replicar o carimbo aqui e errar.
        set({ profile: await profileRepo.get() });
      }),

    /* ── Entradas ── */

    addIncome: (input) =>
      write(async () => {
        const income = await incomesRepo.create(input);
        set((s) => ({ incomes: insertSorted(s.incomes, income, byIncome) }));
      }),

    updateIncome: (id, patch) =>
      write(async () => {
        await incomesRepo.update(id, patch);
        set({ incomes: await listIncomes() });
      }),

    archiveIncome: (id) =>
      write(async () => {
        await incomesRepo.archive(id);
        set({ incomes: await listIncomes() });
      }),

    removeIncome: (id) =>
      write(async () => {
        await incomesRepo.remove(id);
        set((s) => ({ incomes: s.incomes.filter((income) => income.id !== id) }));
      }),

    /* ── Despesas ── */

    addExpense: (input) =>
      write(async () => {
        const expense = await expensesRepo.create(input);
        set((s) => ({ expenses: insertSorted(s.expenses, expense, byExpense) }));
      }),

    updateExpense: (id, patch) =>
      write(async () => {
        await expensesRepo.update(id, patch);
        set({ expenses: await listExpenses() });
      }),

    archiveExpense: (id) =>
      write(async () => {
        await expensesRepo.archive(id);
        set({ expenses: await listExpenses() });
      }),

    removeExpense: (id) =>
      write(async () => {
        await expensesRepo.remove(id);
        set((s) => ({ expenses: s.expenses.filter((expense) => expense.id !== id) }));
      }),

    /* ── Assinaturas ── */

    addSubscription: (input) =>
      write(async () => {
        const subscription = await subscriptionsRepo.create(input);
        set((s) => ({
          subscriptions: insertSorted(s.subscriptions, subscription, bySubscription),
        }));
      }),

    updateSubscription: (id, patch) =>
      write(async () => {
        await subscriptionsRepo.update(id, patch);
        set({ subscriptions: await listSubscriptions() });
      }),

    cancelSubscription: (id) =>
      write(async () => {
        await subscriptionsRepo.cancel(id);
        set({ subscriptions: await listSubscriptions() });
      }),

    removeSubscription: (id) =>
      write(async () => {
        await subscriptionsRepo.remove(id);
        set((s) => ({ subscriptions: s.subscriptions.filter((sub) => sub.id !== id) }));
      }),

    /* ── Cartões ── */

    addCard: (input) =>
      write(async () => {
        const card = await cardsRepo.create(input);
        set((s) => ({ cards: insertSorted(s.cards, card, byCard) }));
      }),

    updateCard: (id, patch) =>
      write(async () => {
        await cardsRepo.update(id, patch);
        set({ cards: await listCards() });
      }),

    archiveCard: (id) =>
      write(async () => {
        await cardsRepo.archive(id);
        // As compras FICAM: arquivar o cartão não quita a dívida, e as parcelas
        // restantes continuam caindo na fatura de cada mês.
        set({ cards: await listCards() });
      }),

    removeCard: (id) =>
      write(async () => {
        await cardsRepo.remove(id);
        set((s) => ({
          cards: s.cards.filter((card) => card.id !== id),
          // ON DELETE CASCADE apagou as compras no banco; a memória segue junto,
          // senão sobra parcela órfã inflando o mês de um cartão que não existe.
          purchases: s.purchases.filter((purchase) => purchase.cardId !== id),
        }));
      }),

    addPurchase: (input) =>
      write(async () => {
        const purchase = await cardsRepo.createPurchase(input);
        set((s) => ({ purchases: insertSorted(s.purchases, purchase, byPurchase) }));
      }),

    removePurchase: (id) =>
      write(async () => {
        await cardsRepo.removePurchase(id);
        set((s) => ({ purchases: s.purchases.filter((purchase) => purchase.id !== id) }));
      }),

    /* ── Objetivos ── */

    addGoal: (input) =>
      write(async () => {
        const goal = await goalsRepo.create(input);
        set((s) => ({ goals: insertSorted(s.goals, goal, byGoal) }));
      }),

    updateGoal: (id, patch) =>
      write(async () => {
        await goalsRepo.update(id, patch);
        set({ goals: await goalsRepo.list() });
      }),

    removeGoal: (id) =>
      write(async () => {
        await goalsRepo.remove(id);
        set((s) => ({
          goals: s.goals.filter((goal) => goal.id !== id),
          // ON DELETE CASCADE de novo: depósito sem meta viraria dinheiro
          // guardado que não aparece em lugar nenhum.
          deposits: s.deposits.filter((deposit) => deposit.goalId !== id),
        }));
      }),

    addDeposit: (input) =>
      write(async () => {
        const deposit = await goalsRepo.createDeposit(input);
        set((s) => ({ deposits: insertSorted(s.deposits, deposit, byDeposit) }));
      }),

    removeDeposit: (id) =>
      write(async () => {
        await goalsRepo.removeDeposit(id);
        set((s) => ({ deposits: s.deposits.filter((deposit) => deposit.id !== id) }));
      }),

    /* ── Apagar tudo ── */

    /**
     * O botão "apagar meus dados". Isto é dado financeiro: a pessoa tem direito
     * de sumir com ele, então some de verdade — `resetDatabase` fecha a conexão
     * e DELETA o arquivo do banco, não é um DELETE tabela por tabela que deixa
     * rastro. O próximo `getDb()` reabre um banco novo e migra do zero.
     */
    wipeEverything: () =>
      write(async () => {
        await resetDatabase();
        // Recria o arquivo já migrado antes de devolver o controle: sem isto, a
        // primeira tela a montar depois do wipe dispara a migração dentro de um
        // render e a falha aparece como tela branca, não como erro.
        await getDb();
        set({
          ...EMPTY,
          month: currentMonthKey(),
          hydrated: true,
          loading: false,
          error: null,
        });
      }),
  };
});

/* ───────────────────────── Seletores derivados ────────────────────────── */

/**
 * Cada nível memoiza em cima do anterior, então a cadeia inteira
 * (dados → snapshot → projeções → falas) custa uma varredura por mudança real
 * de dado. Mexer em `month` só recalcula o que depende de `month`; mexer em
 * `error` ou `loading` não recalcula nada.
 */

const financialDataOf = memoize(
  (
    incomes: Income[],
    expenses: Expense[],
    subscriptions: Subscription[],
    cards: Card[],
    purchases: CardPurchase[],
    goals: Goal[],
    deposits: GoalDeposit[],
  ): FinancialData => ({ incomes, expenses, subscriptions, cards, purchases, goals, deposits }),
);

const selectFinancialData = (state: ArregoState): FinancialData =>
  financialDataOf(
    state.incomes,
    state.expenses,
    state.subscriptions,
    state.cards,
    state.purchases,
    state.goals,
    state.deposits,
  );

const snapshotOf = memoize(
  (data: FinancialData, month: MonthKey): MonthlySnapshot => buildSnapshot(data, month),
);

const selectSnapshot = (state: ArregoState): MonthlySnapshot =>
  snapshotOf(selectFinancialData(state), state.month);

const projectionsOf = memoize(
  (data: FinancialData, month: MonthKey): GoalProjection[] => projectAllGoals(data, month),
);

const selectProjections = (state: ArregoState): GoalProjection[] =>
  projectionsOf(selectFinancialData(state), state.month);

const insightsOf = memoize(
  (
    data: FinancialData,
    snapshot: MonthlySnapshot,
    projections: GoalProjection[],
    profile: Profile | null,
    month: MonthKey,
  ): Insight[] => generateInsights({ data, snapshot, projections, profile, month }),
);

const selectInsights = (state: ArregoState): Insight[] =>
  insightsOf(
    selectFinancialData(state),
    selectSnapshot(state),
    selectProjections(state),
    state.profile,
    state.month,
  );

const topInsightOf = memoize((insights: Insight[]): Insight | null => topInsight(insights));

const selectTopInsight = (state: ArregoState): Insight | null => topInsightOf(selectInsights(state));

export function useFinancialData(): FinancialData {
  return useArrego(selectFinancialData);
}

export function useSnapshot(): MonthlySnapshot {
  return useArrego(selectSnapshot);
}

export function useInsights(): Insight[] {
  return useArrego(selectInsights);
}

export function useProjections(): GoalProjection[] {
  return useArrego(selectProjections);
}

export function useTopInsight(): Insight | null {
  return useArrego(selectTopInsight);
}
