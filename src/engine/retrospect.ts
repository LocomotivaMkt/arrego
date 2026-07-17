/**
 * A RETROSPECTIVA DO MÊS — o que os NOMES dos gastos dizem.
 *
 * O resto do motor olha categorias e valores. Este arquivo olha o que a pessoa
 * ESCREVEU: "iFood", "padaria", "uber", "cerveja". É de propósito, e é a única
 * parte do app que faz isso.
 *
 * Por que o nome importa mais que a categoria: ninguém cadastra "Lazer, R$ 40".
 * A pessoa escreve "iFood" doze vezes e nunca soma. A categoria diz que foram
 * R$ 480 em lazer; o nome diz que foram DOZE PEDIDOS DE DELIVERY, e é o segundo
 * número que muda comportamento. Somar coisas com o mesmo nome é uma conta que
 * a pessoa nunca faz sozinha, e é justamente por isso que ela surpreende.
 *
 * ┌──────────────────────── OS LIMITES DESTE ARQUIVO ─────────────────────────┐
 * │ 1. ISTO NÃO É CATEGORIZAÇÃO AUTOMÁTICA. Um padrão que casa não muda a     │
 * │    categoria escolhida pela pessoa nem toca no dado dela. Só agrupa para  │
 * │    contar uma história no fim do mês.                                     │
 * │ 2. NA DÚVIDA, NÃO CASA. É melhor perder um gasto de delivery do que       │
 * │    afirmar que "Pão de Açúcar" (mercado) é padaria. Um agrupamento errado │
 * │    faz o app dizer um número falso com toda a confiança, e número falso   │
 * │    dito com confiança é como se perde um usuário.                         │
 * │ 3. NENHUM PADRÃO JULGA. "Delivery" é uma constatação; "gastança" não é.   │
 * │    Quem tempera é a persona, e ela tempera o NÚMERO, nunca a pessoa.      │
 * │ 4. O gasto é do mês fechado, não do futuro: quem chama passa o mês.       │
 * └───────────────────────────────────────────────────────────────────────────┘
 */

import type { Cents, Expense, ISODate, MonthKey } from '@/types/models';
import type { IconName } from '@/ui/Icon';
import { daysInMonth, monthKeyFromISO, parseISODate, todayISO } from '@/utils/date';
import { ratio } from '@/utils/money';
import type { FinancialData } from './analysis';
import { subscriptionMonthlyCents } from './analysis';

/**
 * A partir de que dia do mês a retrospectiva do mês CORRENTE aparece.
 *
 * Antes disso ela mentiria por omissão: "você gastou R$ 200 em delivery" no dia
 * 8 sugere um veredito sobre um mês que mal começou. Mês passado aparece sempre.
 */
export const REVIEW_FROM_DAY = 25;

export type SpendPattern = {
  key: string;
  /** Como o app chama isso na tela. Neutro, factual, sem julgamento. */
  label: string;
  icon: IconName;
  /**
   * Termos, já normalizados (minúsculo, sem acento). Casam por PALAVRA INTEIRA
   * ou como prefixo de palavra, nunca como substring solta: "pao" não pode
   * casar dentro de "paozinho"? pode; mas não pode casar dentro de "japao".
   */
  terms: readonly string[];
};

/**
 * Os padrões.
 *
 * Escritos para o Brasil e para quem tem 20 anos: os nomes que aparecem de
 * verdade num extrato dessa idade. A lista é curta de propósito. Cada padrão a
 * mais é uma chance a mais de casar errado, e o custo de casar errado (o app
 * afirmando um número falso) é muito maior que o de deixar um gasto de fora.
 */
export const PATTERNS: readonly SpendPattern[] = [
  {
    key: 'delivery',
    label: 'Delivery',
    icon: 'food',
    terms: ['ifood', 'rappi', 'delivery', 'ze delivery', 'zedelivery', 'lanche', 'pizza', 'hamburguer', 'hamburger', 'burger', 'mcdonalds', 'mc donalds', 'bk', 'burguer', 'sushi', 'marmita'],
  },
  {
    key: 'app-transporte',
    label: 'Corrida de app',
    icon: 'transport',
    terms: ['uber', '99', '99pop', 'indriver', 'cabify', 'taxi', 'corrida'],
  },
  {
    key: 'rolê',
    label: 'Rolê',
    icon: 'leisure',
    terms: ['bar', 'cerveja', 'breja', 'balada', 'role', 'festa', 'boteco', 'pub', 'chopp', 'drink', 'aniversario'],
  },
  {
    key: 'padaria',
    label: 'Padaria e mercadinho',
    icon: 'coffee',
    terms: ['padaria', 'pao', 'paozinho', 'cafe', 'cafezinho', 'mercadinho', 'conveniencia', 'salgado', 'coxinha', 'lanchonete'],
  },
  {
    key: 'assinatura-avulsa',
    label: 'Assinatura solta',
    icon: 'tv',
    terms: ['netflix', 'spotify', 'prime', 'disney', 'hbo', 'max', 'globoplay', 'deezer', 'youtube', 'crunchyroll', 'icloud', 'drive', 'chatgpt'],
  },
  {
    key: 'jogo',
    label: 'Jogo',
    icon: 'games',
    terms: ['steam', 'psn', 'xbox', 'game pass', 'gamepass', 'nintendo', 'riot', 'skin', 'battle pass', 'robux', 'valorant', 'lol'],
  },
  {
    key: 'compra-online',
    label: 'Compra online',
    icon: 'box',
    terms: ['shopee', 'mercado livre', 'mercadolivre', 'amazon', 'aliexpress', 'shein', 'magalu', 'americanas'],
  },
];

export type PatternHit = {
  pattern: SpendPattern;
  count: number;
  totalCents: Cents;
  /** Os nomes que caíram aqui, sem repetir. Prova de que o agrupamento faz sentido. */
  labels: string[];
  /** Fatia do total gasto no mês. 0–1. */
  share: number;
};

export type ReviewTip = {
  id: string;
  /** Fato, sem ironia. A persona veste depois. */
  headline: string;
  /** O número que sustenta o fato. */
  evidence: string;
  icon: IconName;
  /** Quanto isso pesa. Maior aparece primeiro. */
  weight: number;
};

export type MonthlyReview = {
  month: MonthKey;
  /** O mês acabou (ou está nos últimos dias)? Se false, não mostre veredito. */
  ready: boolean;
  /** Tudo que saiu no mês: contas, gastos avulsos e assinaturas. */
  totalSpentCents: Cents;
  /** Quantos lançamentos de gasto avulso o mês teve. */
  entryCount: number;
  hits: PatternHit[];
  /** O maior gasto avulso do mês, se houver. */
  biggest: { label: string; amountCents: Cents } | null;
  /**
   * Muitos gastos pequenos com o MESMO nome. É o vazamento clássico e o achado
   * mais útil desta tela: ninguém sente R$ 22, mas todo mundo sente R$ 264.
   */
  leaks: PatternHit[];
  tips: ReviewTip[];
};

/** Minúsculo, sem acento, sem pontuação. Nome de gasto é digitado com pressa. */
export function normalize(text: string): string {
  return text
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * O termo aparece como PALAVRA no nome?
 *
 * Substring solta casaria "99" dentro de "R$ 99 de gasolina" e "bar" dentro de
 * "barbeiro". Casar por palavra inteira erra menos, e errar menos é o ponto:
 * limite 2 deste arquivo.
 */
function matchesTerm(normalizedLabel: string, term: string): boolean {
  if (term.includes(' ')) return normalizedLabel.includes(term);
  return normalizedLabel.split(' ').includes(term);
}

export function patternOf(label: string): SpendPattern | null {
  const normalized = normalize(label);
  if (!normalized) return null;
  for (const pattern of PATTERNS) {
    if (pattern.terms.some((term) => matchesTerm(normalized, term))) return pattern;
  }
  return null;
}

/** Gastos avulsos do mês. Conta fixa não entra: ela não é escolha do dia a dia. */
function oneOffExpensesIn(expenses: Expense[], month: MonthKey): Expense[] {
  return expenses.filter(
    (expense) =>
      !expense.recurring && expense.spentOn !== null && monthKeyFromISO(expense.spentOn) === month,
  );
}

function totalSpentIn(data: FinancialData, month: MonthKey): Cents {
  const fixed = data.expenses
    .filter((expense) => expense.recurring && expense.archivedAt === null)
    .reduce((total, expense) => total + expense.amountCents, 0);
  const oneOff = oneOffExpensesIn(data.expenses, month).reduce(
    (total, expense) => total + expense.amountCents,
    0,
  );
  const subs = data.subscriptions.reduce(
    (total, sub) => total + subscriptionMonthlyCents(sub),
    0,
  );
  return fixed + oneOff + subs;
}

/**
 * A retrospectiva já pode ser mostrada?
 *
 * Mês passado: sempre. Mês corrente: só nos últimos dias, senão o app dá
 * veredito sobre um mês que ainda está acontecendo. Mês futuro: nunca.
 */
export function reviewReady(month: MonthKey, today: ISODate = todayISO()): boolean {
  const current = monthKeyFromISO(today);
  if (month > current) return false;
  if (month < current) return true;
  const day = parseISODate(today).getDate();
  return day >= Math.min(REVIEW_FROM_DAY, daysInMonth(month));
}

export function buildMonthlyReview(
  data: FinancialData,
  month: MonthKey,
  today: ISODate = todayISO(),
): MonthlyReview {
  const oneOff = oneOffExpensesIn(data.expenses, month);
  const totalSpentCents = totalSpentIn(data, month);

  const grouped = new Map<string, { pattern: SpendPattern; items: Expense[] }>();
  for (const expense of oneOff) {
    const pattern = patternOf(expense.label);
    if (!pattern) continue;
    const bucket = grouped.get(pattern.key);
    if (bucket) bucket.items.push(expense);
    else grouped.set(pattern.key, { pattern, items: [expense] });
  }

  const hits: PatternHit[] = [...grouped.values()]
    .map(({ pattern, items }) => {
      const totalCents = items.reduce((total, item) => total + item.amountCents, 0);
      return {
        pattern,
        count: items.length,
        totalCents,
        labels: [...new Set(items.map((item) => item.label))],
        share: ratio(totalCents, totalSpentCents),
      };
    })
    .sort((a, b) => b.totalCents - a.totalCents);

  const biggest = oneOff.reduce<{ label: string; amountCents: Cents } | null>((max, expense) => {
    if (max === null || expense.amountCents > max.amountCents) {
      return { label: expense.label, amountCents: expense.amountCents };
    }
    return max;
  }, null);

  // Vazamento: repetiu MUITO e cada um foi pequeno. Os dois ao mesmo tempo —
  // três compras de R$ 300 não são vazamento, são três decisões conscientes.
  const leaks = hits.filter(
    (hit) => hit.count >= 4 && hit.totalCents / hit.count <= 5_000,
  );

  return {
    month,
    ready: reviewReady(month, today),
    totalSpentCents,
    entryCount: oneOff.length,
    hits,
    biggest,
    leaks,
    tips: buildTips({ hits, leaks, biggest, totalSpentCents, entryCount: oneOff.length }),
  };
}

function buildTips(input: {
  hits: PatternHit[];
  leaks: PatternHit[];
  biggest: { label: string; amountCents: Cents } | null;
  totalSpentCents: Cents;
  entryCount: number;
}): ReviewTip[] {
  const tips: ReviewTip[] = [];
  const { hits, leaks, biggest, totalSpentCents, entryCount } = input;

  if (entryCount === 0) {
    return [
      {
        id: 'sem-gastos',
        headline: 'Nenhum gasto avulso anotado neste mês',
        evidence: 'Sem lançamento, não há o que revisar.',
        icon: 'info',
        weight: 100,
      },
    ];
  }

  for (const leak of leaks) {
    const average = Math.round(leak.totalCents / leak.count);
    tips.push({
      id: `vazamento:${leak.pattern.key}`,
      headline: `${leak.pattern.label} apareceu ${leak.count} vezes`,
      // A média é o dado que faz a diferença: o total assusta, a média explica.
      evidence: `${leak.count} lançamentos de mais ou menos ${formatMoney(average)}.`,
      icon: leak.pattern.icon,
      weight: 90 + Math.min(9, leak.count),
    });
  }

  const top = hits[0];
  if (top && !leaks.includes(top) && top.share >= 0.1) {
    tips.push({
      id: `campeao:${top.pattern.key}`,
      headline: `${top.pattern.label} foi seu maior padrão de gasto`,
      evidence: `${formatMoney(top.totalCents)} em ${top.count} ${top.count === 1 ? 'vez' : 'vezes'}.`,
      icon: top.pattern.icon,
      weight: 70,
    });
  }

  if (biggest !== null && biggest.amountCents >= 10_000) {
    tips.push({
      id: 'maior-gasto',
      headline: `Seu maior gasto avulso foi "${biggest.label}"`,
      evidence: formatMoney(biggest.amountCents),
      icon: 'trendDown',
      weight: 50,
    });
  }

  if (tips.length === 0) {
    tips.push({
      id: 'sem-padrao',
      headline: 'Nenhum padrão se repetiu o suficiente pra virar assunto',
      evidence: `${entryCount} ${entryCount === 1 ? 'lançamento' : 'lançamentos'} no mês.`,
      icon: 'ok',
      weight: 10,
    });
  }

  return tips.sort((a, b) => b.weight - a.weight);
}

/**
 * Formatação local para não importar a da UI dentro do motor puro. Os centavos
 * somem: aqui o número é retórico ("R$ 264"), e o centavo só faria ruído.
 */
function formatMoney(cents: Cents): string {
  return `R$ ${Math.round(cents / 100).toLocaleString('pt-BR')}`;
}
