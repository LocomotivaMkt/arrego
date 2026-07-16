/**
 * Modelo de domínio do Arrego.
 *
 * ┌───────────────────────────────────────────────────────────────────────┐
 * │ REGRA INEGOCIÁVEL: o app NUNCA armazena dado de cartão.                │
 * │ Nada de número, CVV, validade, bandeira vinculada a número, nome do    │
 * │ titular ou senha. Um "cartão" aqui é só um APELIDO + dias de           │
 * │ fechamento/vencimento, para o app saber em que mês a parcela cai.      │
 * │ Se algum campo novo parecer com dado de cartão, ele não entra.         │
 * └───────────────────────────────────────────────────────────────────────┘
 *
 * DINHEIRO É SEMPRE `number` INTEIRO EM CENTAVOS.
 * Float com dinheiro erra (0.1 + 0.2 !== 0.3). Todo valor monetário no app
 * trafega como centavos e só vira string formatada na borda da UI.
 */

/** 'YYYY-MM-DD' */
export type ISODate = string;
/** 'YYYY-MM' */
export type MonthKey = string;
/** ISO 8601 completo */
export type Timestamp = string;
/** Valor monetário em centavos. Sempre inteiro. */
export type Cents = number;

/* ────────────────────────────── Perfil ────────────────────────────── */

/**
 * Conta local. Não existe servidor, não existe senha, não existe e-mail.
 * O "cadastro" é só como a pessoa quer ser chamada e reconhecida no app.
 */
export type Profile = {
  /** Singleton — sempre 1. */
  id: 1;
  name: string;
  /** URI de arquivo local da foto escolhida na galeria. Nunca sai do aparelho. */
  photoUri: string | null;
  /** Fallback quando não há foto: emoji + cor derivada do nome. */
  avatarEmoji: string;
  /** Dia do mês em que o dinheiro principal cai (1–31). Guia o "mês financeiro". */
  payday: number | null;
  createdAt: Timestamp;
  onboardedAt: Timestamp | null;
};

/* ────────────────────────────── Entradas ──────────────────────────── */

export type IncomeKind =
  | 'salary' // salário
  | 'allowance' // mesada
  | 'commission' // comissão
  | 'freelance' // bico / freela
  | 'gift' // presente, pix da vó
  | 'other';

export type Income = {
  id: string;
  label: string;
  kind: IncomeKind;
  amountCents: Cents;
  /** true = cai todo mês (salário, mesada). false = entrou uma vez (freela, presente). */
  recurring: boolean;
  /** Dia do mês em que cai (1–31). Só quando `recurring`. */
  dayOfMonth: number | null;
  /** Data em que entrou. Só quando NÃO é `recurring`. */
  receivedOn: ISODate | null;
  createdAt: Timestamp;
  /** Parou de receber (ex.: saiu do emprego). Preserva histórico em vez de apagar. */
  archivedAt: Timestamp | null;
};

/* ────────────────────────────── Despesas ──────────────────────────── */

export type ExpenseCategory =
  | 'moradia' // aluguel, condomínio
  | 'contas' // luz, água, internet, gás
  | 'mercado' // comida de casa
  | 'transporte' // ônibus, gasolina, app
  | 'saude' // plano, farmácia
  | 'educacao' // faculdade, curso
  | 'lazer' // rolê, delivery, cinema
  | 'outros';

export type Expense = {
  id: string;
  label: string;
  category: ExpenseCategory;
  amountCents: Cents;
  /** true = conta que chega todo mês (luz, aluguel). */
  recurring: boolean;
  /** Dia do vencimento (1–31). Só quando `recurring`. */
  dayOfMonth: number | null;
  /** Data do gasto. Só quando NÃO é `recurring`. */
  spentOn: ISODate | null;
  createdAt: Timestamp;
  archivedAt: Timestamp | null;
};

/* ──────────────────────────── Assinaturas ─────────────────────────── */

export type SubscriptionCategory =
  | 'streaming' // Netflix, Prime
  | 'musica' // Spotify, Deezer
  | 'games' // Game Pass, PS Plus
  | 'academia'
  | 'apps' // iCloud, ChatGPT, etc.
  | 'outros';

/**
 * Assinatura é tecnicamente uma despesa recorrente, mas fica separada de
 * propósito: é o gasto que mais escapa do radar de quem tem 20 anos, e o app
 * precisa conseguir somar "quanto do seu salário vira streaming" sem
 * garimpar dentro de `Expense`.
 */
export type Subscription = {
  id: string;
  label: string;
  category: SubscriptionCategory;
  amountCents: Cents;
  /** Dia da cobrança (1–31). */
  billingDay: number;
  /** Anual vira mensal equivalente na análise, mas guardamos o ciclo real. */
  cycle: 'monthly' | 'yearly';
  /** Se está dividindo com alguém, quanto sobra pra você. Null = paga tudo. */
  shareCount: number | null;
  createdAt: Timestamp;
  cancelledAt: Timestamp | null;
};

/* ────────────────────────────── Cartão ────────────────────────────── */

/**
 * SEM DADO DE CARTÃO. Só apelido e datas do ciclo.
 * `colorIndex` é só identificação visual na lista.
 */
export type Card = {
  id: string;
  nickname: string;
  /** Dia em que a fatura fecha (1–31). */
  closingDay: number;
  /** Dia em que a fatura vence (1–31). */
  dueDay: number;
  /** Opcional — só para o app avisar quando está encostando no limite. */
  limitCents: Cents | null;
  colorIndex: number;
  createdAt: Timestamp;
  archivedAt: Timestamp | null;
};

export type CardPurchase = {
  id: string;
  cardId: string;
  description: string;
  category: ExpenseCategory;
  /** Valor TOTAL da compra, não o da parcela. */
  totalCents: Cents;
  /** 1 = à vista. N = parcelado em N vezes. */
  installments: number;
  /** Mês em que a 1ª parcela cai na fatura. */
  firstInstallmentMonth: MonthKey;
  createdAt: Timestamp;
};

/* ───────────────────────────── Objetivos ──────────────────────────── */

export type GoalKind =
  /** Reserva de emergência — o app trata como prioridade zero. */
  | 'emergency'
  | 'custom';

export type Goal = {
  id: string;
  label: string;
  kind: GoalKind;
  emoji: string;
  targetCents: Cents;
  /** Prazo desejado. Null = "algum dia", e o app projeta sem cobrar data. */
  targetDate: ISODate | null;
  /** Menor = mais importante. Usado quando a sobra não cobre tudo. */
  priority: number;
  createdAt: Timestamp;
  achievedAt: Timestamp | null;
};

/** O guardado é derivado dos depósitos, nunca um campo solto que dessincroniza. */
export type GoalDeposit = {
  id: string;
  goalId: string;
  amountCents: Cents;
  /** Negativo = tirou dinheiro da meta. Registrar saque é honestidade, não punição. */
  depositedOn: ISODate;
  note: string | null;
  createdAt: Timestamp;
};

/* ──────────────────── Estado derivado (não persiste) ──────────────── */

/** Retrato financeiro de um mês. Calculado, nunca gravado. */
export type MonthlySnapshot = {
  month: MonthKey;
  incomeFixedCents: Cents;
  incomeVariableCents: Cents;
  incomeTotalCents: Cents;
  expensesFixedCents: Cents;
  expensesVariableCents: Cents;
  subscriptionsCents: Cents;
  cardInstallmentsCents: Cents;
  /** Tudo que já tem dono antes de a pessoa gastar qualquer coisa. */
  committedCents: Cents;
  /** incomeTotal − committed. Pode ser negativo, e aí o app grita. */
  freeCents: Cents;
  /** freeCents / incomeTotalCents. 0 quando não há renda. */
  savingsRate: number;
  /** Quanto as metas com prazo exigem por mês. */
  goalsMonthlyNeedCents: Cents;
  /** freeCents − goalsMonthlyNeed. */
  afterGoalsCents: Cents;
};

export type CategorySlice = {
  key: string;
  label: string;
  amountCents: Cents;
  /** 0–1 */
  share: number;
};

/** Projeção de uma meta no ritmo atual. */
export type GoalProjection = {
  goalId: string;
  savedCents: Cents;
  targetCents: Cents;
  /** 0–1, limitado a 1. */
  progress: number;
  remainingCents: Cents;
  /** Ritmo observado dos últimos meses. */
  monthlyPaceCents: Cents;
  /** Meses no ritmo atual. null = ritmo zero ou negativo (nunca chega). */
  monthsAtCurrentPace: number | null;
  /** Quanto precisaria por mês para bater o prazo. null = sem prazo. */
  requiredMonthlyCents: Cents | null;
  /** O prazo cabe no ritmo atual? null = sem prazo para comparar. */
  onTrack: boolean | null;
};

export type InsightSeverity = 'critical' | 'serious' | 'warning' | 'good' | 'neutral';

/** Uma observação da Arrego sobre a vida financeira da pessoa. */
export type Insight = {
  id: string;
  severity: InsightSeverity;
  /** Título curto e factual. A ironia mora no `body`. */
  title: string;
  /** A fala da Arrego — passivo-agressiva, mas sempre com saída prática. */
  body: string;
  /** O número que sustenta a fala. A piada só existe se o dado existir. */
  evidence: string | null;
  /** Ação concreta. Toda fala termina com uma saída — sem exceção. */
  action: { label: string; href: string } | null;
  /** Ordenação: maior aparece primeiro. */
  weight: number;
};
