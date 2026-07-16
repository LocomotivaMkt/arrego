/**
 * Traduz os números do mês nas falas da Arrego.
 *
 * `analysis.ts` responde "qual é o número". Este arquivo responde "vale a pena
 * falar sobre ele, e com que cara". Toda regra aqui precisa de duas coisas:
 * uma EVIDÊNCIA (o número real — a piada só existe se o dado existir) e uma
 * AÇÃO (a saída prática; sarcasmo sem saída é só maldade). Se uma regra nova
 * não tiver as duas, ela não entra.
 */

import { emergencyFundTargetCents, type FinancialData } from '@/engine/analysis';
import { fill, firstName, hashSeed, LINES, pickLine } from '@/engine/persona';
import type {
  Cents,
  Goal,
  GoalProjection,
  Insight,
  InsightSeverity,
  MonthKey,
  MonthlySnapshot,
  Profile,
} from '@/types/models';
import { humanizeMonths } from '@/utils/date';
import { formatCents, formatPercent, ratio } from '@/utils/money';

/** Rotas reais do app. O `href` de uma ação nunca é string solta. */
const ROUTES = {
  grana: '/(tabs)/grana',
  cartao: '/(tabs)/cartao',
  objetivos: '/(tabs)/objetivos',
  aprender: '/(tabs)/aprender',
  perfil: '/perfil',
} as const;

const SUBSCRIPTION_SHARE_LIMIT = 0.1;
const CARD_SHARE_LIMIT = 0.3;
const RATE_TIGHT = 0.05;
const RATE_LOW = 0.1;
const RATE_GOOD = 0.2;

type BuildParams = {
  id: string;
  month: MonthKey;
  severity: InsightSeverity;
  title: string;
  bank: readonly string[];
  vars: Record<string, string>;
  evidence: string | null;
  action: { label: string; href: string } | null;
  weight: number;
};

/**
 * A seed é `mês + id da regra`: a fala varia de mês em mês (o app não fica
 * repetindo a mesma frase pra sempre) mas é idêntica em toda abertura dentro
 * do mesmo mês. Metas entram com o id no sufixo, senão duas metas atrasadas
 * receberiam exatamente a mesma frase lado a lado.
 */
function build(params: BuildParams): Insight {
  return {
    id: params.id,
    severity: params.severity,
    title: params.title,
    body: fill(pickLine(params.bank, hashSeed(params.month, params.id)), params.vars),
    evidence: params.evidence,
    action: params.action,
    weight: params.weight,
  };
}

/** "1 assinatura" / "3 assinaturas" — sem isso a fala imprime "1 assinaturas". */
function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function generateInsights(input: {
  data: FinancialData;
  snapshot: MonthlySnapshot;
  projections: GoalProjection[];
  profile: Profile | null;
  month: MonthKey;
}): Insight[] {
  const { data, snapshot, projections, profile, month } = input;

  const nome = firstName(profile?.name);
  const insights: Insight[] = [];

  const nothingRegistered =
    data.incomes.length === 0 &&
    data.expenses.length === 0 &&
    data.subscriptions.length === 0 &&
    data.cards.length === 0 &&
    data.purchases.length === 0 &&
    data.goals.length === 0;

  // App recém-instalado tem exatamente um próximo passo. Empilhar "sem renda",
  // "sem meta" e "sem reserva" numa tela vazia é uma parede de cobrança para
  // quem ainda não fez nada de errado — e é o jeito mais rápido de perder a
  // pessoa. Curto-circuito de propósito: uma tela, uma saída.
  if (nothingRegistered) {
    return [
      build({
        id: 'emptyState',
        month,
        severity: 'neutral',
        title: 'Tudo vazio por aqui',
        bank: LINES.emptyState,
        vars: { nome },
        // Único insight sem evidência: não existe número quando não existe dado.
        // Inventar um aqui seria exatamente o que o contrato proíbe.
        evidence: null,
        action: { label: 'Cadastrar minha renda', href: ROUTES.grana },
        weight: 100,
      }),
    ];
  }

  const income = snapshot.incomeTotalCents;
  const free = snapshot.freeCents;
  const rate = snapshot.savingsRate;
  const hasIncome = data.incomes.some((entry) => entry.archivedAt === null);

  if (!hasIncome) {
    insights.push(
      build({
        id: 'noIncome',
        month,
        severity: 'neutral',
        title: 'Nenhuma renda cadastrada',
        bank: LINES.noIncome,
        vars: { nome },
        evidence: `${formatCents(income)} de renda cadastrada`,
        action: { label: 'Cadastrar renda', href: ROUTES.grana },
        weight: 100,
      }),
    );
  }

  // `free < 0` sem renda cadastrada não é um mês no vermelho: é a soma das
  // despesas sem a régua da renda. Gritar "crítico" em cima de um dado que
  // falta é alarme falso, e alarme falso queima a credibilidade dos alarmes
  // reais. A saída honesta (cadastrar a renda) já foi dita acima, com peso maior.
  if (hasIncome && free < 0) {
    const gap = Math.abs(free);
    insights.push(
      build({
        id: 'negativeFlow',
        month,
        severity: 'critical',
        title: 'Seu mês fecha no vermelho',
        bank: LINES.negativeFlow,
        vars: { nome, valor: formatCents(gap) },
        evidence: `Faltam ${formatCents(gap)} · ${formatCents(snapshot.committedCents)} de contas para ${formatCents(income)} de renda`,
        action: { label: 'Ver meus gastos', href: ROUTES.grana },
        weight: 95,
      }),
    );
  }

  if (free >= 0 && rate < RATE_TIGHT && income > 0) {
    insights.push(
      build({
        id: 'tightFlow',
        month,
        severity: 'serious',
        title: 'Sua folga é quase zero',
        bank: LINES.tightFlow,
        vars: { nome, valor: formatCents(free), pct: formatPercent(rate) },
        evidence: `Sobram ${formatCents(free)} de ${formatCents(income)} · ${formatPercent(rate)} da renda`,
        action: { label: 'Revisar meus gastos', href: ROUTES.grana },
        weight: 80,
      }),
    );
  }

  const subscriptionShare = ratio(snapshot.subscriptionsCents, income);
  if (subscriptionShare > SUBSCRIPTION_SHARE_LIMIT) {
    const activeCount = data.subscriptions.filter((sub) => sub.cancelledAt === null).length;
    const qtd = pluralize(activeCount, 'assinatura', 'assinaturas');
    insights.push(
      build({
        id: 'subscriptionHeavy',
        month,
        severity: 'warning',
        title: 'Assinaturas pesando na renda',
        bank: LINES.subscriptionHeavy,
        vars: {
          nome,
          qtd,
          valor: formatCents(snapshot.subscriptionsCents),
          pct: formatPercent(subscriptionShare),
        },
        evidence: `${qtd} · ${formatCents(snapshot.subscriptionsCents)} por mês · ${formatPercent(subscriptionShare)} da renda`,
        action: { label: 'Ver minhas assinaturas', href: ROUTES.grana },
        weight: 70,
      }),
    );
  }

  const cardShare = ratio(snapshot.cardInstallmentsCents, income);
  if (cardShare > CARD_SHARE_LIMIT) {
    insights.push(
      build({
        id: 'cardHeavy',
        month,
        severity: 'serious',
        title: 'Parcelas dominam sua renda',
        bank: LINES.cardHeavy,
        vars: {
          nome,
          valor: formatCents(snapshot.cardInstallmentsCents),
          pct: formatPercent(cardShare),
        },
        evidence: `${formatCents(snapshot.cardInstallmentsCents)} por mês em parcelas · ${formatPercent(cardShare)} da renda`,
        action: { label: 'Ver minhas parcelas', href: ROUTES.cartao },
        weight: 85,
      }),
    );
  }

  if (rate >= RATE_GOOD) {
    insights.push(
      build({
        id: 'goodSavings',
        month,
        severity: 'good',
        title: 'Você está guardando bem',
        bank: LINES.goodSavings,
        vars: { nome, valor: formatCents(free), pct: formatPercent(rate) },
        evidence: `${formatCents(free)} sobrando · ${formatPercent(rate)} da renda`,
        action: { label: 'Destinar para uma meta', href: ROUTES.objetivos },
        weight: 30,
      }),
    );
  }

  if (rate >= RATE_TIGHT && rate < RATE_LOW) {
    insights.push(
      build({
        id: 'lowSavings',
        month,
        severity: 'warning',
        title: 'Você guarda pouco',
        bank: LINES.lowSavings,
        vars: { nome, valor: formatCents(free), pct: formatPercent(rate) },
        evidence: `${formatCents(free)} por mês · ${formatPercent(rate)} da renda`,
        action: { label: 'Achar um corte', href: ROUTES.grana },
        weight: 50,
      }),
    );
  }

  const hasEmergencyGoal = data.goals.some((goal) => goal.kind === 'emergency');
  if (!hasEmergencyGoal) {
    const target = emergencyFundTargetCents(snapshot);
    insights.push(
      build({
        id: 'noEmergencyFund',
        month,
        severity: 'warning',
        title: 'Sem reserva de emergência',
        bank: LINES.noEmergencyFund,
        vars: { nome, valor: formatCents(target) },
        evidence: `Reserva ideal: ${formatCents(target)} · guardado hoje: R$ 0,00`,
        action: { label: 'Criar reserva de emergência', href: ROUTES.objetivos },
        weight: 75,
      }),
    );
  }

  if (data.goals.length === 0) {
    insights.push(
      build({
        id: 'noGoals',
        month,
        severity: 'neutral',
        title: 'Nenhum objetivo cadastrado',
        bank: LINES.noGoals,
        vars: { nome },
        evidence:
          free > 0
            ? `0 metas · ${formatCents(free)} por mês sem destino`
            : '0 metas cadastradas',
        action: { label: 'Criar meu primeiro objetivo', href: ROUTES.objetivos },
        weight: 60,
      }),
    );
  }

  // A anotação `: [string, Goal]` é necessária: sem ela o literal é inferido
  // como `(string | Goal)[]` e o construtor do Map rejeita.
  const goalsById = new Map(data.goals.map((goal): [string, Goal] => [goal.id, goal]));

  for (const projection of projections) {
    const goal = goalsById.get(projection.goalId);
    // Projeção órfã: sem o rótulo não há fala honesta a fazer sobre a meta.
    if (!goal) continue;
    const meta = goal.label;

    if (projection.progress >= 1) {
      insights.push(
        build({
          id: `goalAchieved:${goal.id}`,
          month,
          severity: 'good',
          title: `${meta}: meta batida!`,
          bank: LINES.goalAchieved,
          vars: { nome, meta, valor: formatCents(projection.savedCents) },
          evidence: `${formatCents(projection.savedCents)} de ${formatCents(projection.targetCents)} · 100%`,
          action: { label: 'Ver meus objetivos', href: ROUTES.objetivos },
          weight: 90,
        }),
      );
      // Meta batida não recebe também "chega em 3 meses". Ela chegou.
      continue;
    }

    // `onTrack` só é boolean quando existe prazo; sem prazo não há atraso a
    // apontar e a Arrego fica quieta.
    if (projection.onTrack === false) {
      const required = projection.requiredMonthlyCents;
      // onTrack === false implica prazo, e prazo implica requiredMonthly. O
      // fallback é só para o compilador; se cair nele, o número ainda é real
      // (o que falta), só que sem a diluição mensal.
      const monthlyGap: Cents =
        required !== null
          ? Math.max(0, required - projection.monthlyPaceCents)
          : projection.remainingCents;
      const months = projection.monthsAtCurrentPace;

      if (months === null) {
        insights.push(
          build({
            id: `goalNeverAtPace:${goal.id}`,
            month,
            severity: 'warning',
            title: `${meta}: sem depósitos`,
            bank: LINES.goalNeverAtPace,
            vars: { nome, meta, valor: formatCents(monthlyGap) },
            // `monthsAtCurrentPace === null` cobre ritmo zero E negativo (quem
            // sacou da meta). Imprimir "R$ 0,00" fixo mentiria no caso negativo.
            evidence: `Ritmo atual: ${formatCents(projection.monthlyPaceCents)} por mês · faltam ${formatCents(projection.remainingCents)}`,
            action: { label: 'Depositar na meta', href: ROUTES.objetivos },
            weight: 55,
          }),
        );
      } else {
        insights.push(
          build({
            id: `goalTooSlow:${goal.id}`,
            month,
            severity: 'warning',
            title: `${meta}: fora do prazo`,
            bank: LINES.goalTooSlow,
            vars: { nome, meta, tempo: humanizeMonths(months), valor: formatCents(monthlyGap) },
            evidence: `No ritmo atual: ${humanizeMonths(months)} · faltam ${formatCents(monthlyGap)} por mês para o prazo`,
            action: { label: 'Ajustar a meta', href: ROUTES.objetivos },
            weight: 55,
          }),
        );
      }
      continue;
    }

    if (projection.onTrack === true) {
      const months = projection.monthsAtCurrentPace ?? 0;
      insights.push(
        build({
          id: `goalOnTrack:${goal.id}`,
          month,
          severity: 'good',
          title: `${meta}: no prazo`,
          bank: LINES.goalOnTrack,
          vars: {
            nome,
            meta,
            tempo: humanizeMonths(months),
            valor: formatCents(projection.monthlyPaceCents),
          },
          evidence: `${formatCents(projection.monthlyPaceCents)} por mês · ${humanizeMonths(months)} para chegar`,
          action: { label: 'Ver meta', href: ROUTES.objetivos },
          weight: 25,
        }),
      );
    }
  }

  if (insights.length === 0) {
    insights.push(
      build({
        id: 'allGood',
        month,
        severity: 'good',
        title: 'Está tudo em ordem',
        bank: LINES.allGood,
        vars: { nome, valor: formatCents(free) },
        evidence: `${formatCents(free)} de folga · ${formatPercent(rate)} da renda`,
        action: { label: 'Reforçar uma meta', href: ROUTES.objetivos },
        weight: 10,
      }),
    );
  }

  // Sort estável (ES2019+): empates mantêm a ordem de inserção, então duas
  // metas atrasadas saem na mesma ordem em toda abertura do app.
  return [...insights].sort((a, b) => b.weight - a.weight);
}

/**
 * A fala de destaque. Recalcula o máximo em vez de confiar em `[0]`: nada
 * garante que quem chamou passou a lista já ordenada.
 */
export function topInsight(insights: Insight[]): Insight | null {
  let top: Insight | null = null;
  for (const insight of insights) {
    if (top === null || insight.weight > top.weight) top = insight;
  }
  return top;
}
