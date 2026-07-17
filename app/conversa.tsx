/**
 * Falar com a Arrego — conversa GUIADA, não chat livre.
 *
 * Não existe LLM aqui: o motor é de regras. Prometer conversa aberta seria
 * mentira, e um chat que não entende a pergunta é pior que nenhum chat. Então a
 * pessoa escolhe entre perguntas prontas e cada resposta é montada com os
 * NÚMEROS REAIS dela — o que é mais esperto que um chat ruim e nunca inventa dado.
 *
 * Toda resposta é uma função PURA daqui de baixo: recebe o retrato do mês e
 * devolve `Bubble[]` (uma bolha por item). Nada de I/O, nada de estado —
 * o que a torna testável e impede que uma fala nasça de um número que não existe.
 * A exceção é `applyAndAnswer`, a única que AGE: ela grava. Por isso ela é a
 * única que exige confirmação antes de rodar — ver o bloco dela lá embaixo.
 *
 * Regra que atravessa o arquivo: SEM DADO, SEM NÚMERO. Quando falta a renda,
 * falta a régua — e sem régua "R$ 200 é muito?" não tem resposta honesta. Nesses
 * casos ela diz o que falta em vez de chutar uma porcentagem.
 *
 * Esta é uma das duas telas onde parágrafo pode existir, e é O lugar da Arrego
 * falar: aqui ela usa as falas LONGAS (`LINES`), não as curtas. Nas outras telas
 * ela tem uma linha; aqui ela tem a boca inteira, porque quem abriu a conversa
 * veio buscar exatamente isso.
 */

import { router, Stack } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  expenseBreakdown,
  type FinancialData,
  subscriptionsYearlyTotalCents,
} from '@/engine/analysis';
import {
  fill,
  firstName,
  greeting,
  hashSeed,
  LINES,
  pickLine,
  type LineBank,
} from '@/engine/persona';
import {
  appliedPlanTotal,
  lazerShareOfIncome,
  plannedDeposits,
  plannedDepositsTotal,
  savingShareOfIncome,
  type GoalAllocation,
  type MonthlyPlan,
} from '@/engine/plan';
import {
  useArrego,
  useFinancialData,
  usePlan,
  useProjections,
  useSnapshot,
  useTopInsight,
  type ApplyPlanResult,
} from '@/store/useArrego';
import { HIT_SLOP, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import type {
  Cents,
  GoalProjection,
  Insight,
  MonthKey,
  MonthlySnapshot,
  Profile,
} from '@/types/models';
import { AppText, Button, Card, Chip, CurrencyField, Icon, Screen, Sheet } from '@/ui';
import { formatMonthLong, humanizeMonths } from '@/utils/date';
import { newId } from '@/utils/id';
import { formatCents, formatPercent, ratio } from '@/utils/money';

const ARREGO_EMOJI = '🐷';

/** Tempo de "digitando". Curto o bastante pra não irritar, longo pra dar vida. */
const TYPING_MS = 700;

/** Teto de metas comentadas de uma vez: 12 bolhas seguidas é parede, não conversa. */
const MAX_GOALS_IN_ANSWER = 4;

/**
 * Espelham os cortes de `insights.ts` (que não os exporta). Se lá mudar, aqui
 * muda junto: a Arrego não pode chamar de "pouco" no card e de "ok" na conversa.
 */
const RATE_TIGHT = 0.05;
const RATE_LOW = 0.1;
const RATE_GOOD = 0.2;
const SUBSCRIPTION_SHARE_LIMIT = 0.1;

/**
 * Horizonte em que ainda faz sentido dar um prazo. Acima disso o número para de
 * informar e vira deboche: "no seu ritmo isso é seu em 340 anos" é exatamente a
 * piada que este arquivo evita de propósito. Passando daqui, a resposta certa é
 * falar de abrir espaço no mês, não prometer uma data que não existe.
 */
const BUY_HORIZON_MONTHS = 60;

/* ─────────────────────────── Falas locais ─────────────────────────── */

/**
 * Bancos de fala exclusivos da conversa — os de `persona.ts` são reusados
 * sempre que existe um que sirva, e estes cobrem só o que a conversa criou
 * (o veredito de compra, o meta-papo). Mesmo contrato de tom do `persona.ts`:
 * mínimo de 6 falas por banco, a ironia é sobre o número, e toda fala termina
 * com uma saída prática.
 */
const BANKS = {
  /** Tem renda cadastrada, mas nenhuma caiu no mês olhado. */
  noIncomeThisMonth: [
    'Você tem renda cadastrada, mas nenhuma caiu em {mes}. Então qualquer porcentagem que eu inventasse aqui seria chute. Cadastra o que entrou nesse mês e eu volto a fazer conta.',
    '{nome}, em {mes} não entrou nada segundo o app. Se entrou de verdade, me conta — sem o número que entra, o resto da conta não fecha.',
    'Renda em {mes}: zero. Pode ser que o mês tenha sido assim mesmo, pode ser que faltou cadastrar. Um dos dois eu consigo resolver. Bota o que entrou.',
    'Sem entrada registrada em {mes}, eu não tenho régua pra dizer se seus gastos são muitos ou poucos. Registra a renda do mês e a gente conversa com número.',
    '{mes} está sem renda no app. Não vou fingir que sei quanto você ganhou — vou esperar você me contar. Leva 20 segundos.',
    'Tem renda cadastrada, só não em {mes}. Enquanto esse mês estiver zerado, minhas contas dariam um resultado bonito e falso. Atualiza a renda de {mes}.',
  ],

  /** Nenhum gasto no mês olhado — provavelmente falta cadastrar, não faltou gastar. */
  noExpenses: [
    'Em {mes} você não cadastrou gasto nenhum. Ou você viveu de fotossíntese, ou faltou registrar. Bota os gastos e eu te mostro pra onde o dinheiro foi.',
    '{nome}, não tem um único gasto em {mes} aqui. Eu adoraria dizer que isso é impressionante, mas eu desconfio. Cadastra o que saiu.',
    'Zero gastos em {mes}. Nenhum. Se for verdade, parabéns e me ensina. Se não for, o app só sabe o que você conta — registra suas despesas.',
    'Não posso te mostrar pra onde o dinheiro foi porque você não me contou que ele saiu. Cadastra os gastos de {mes} e essa pergunta passa a ter resposta.',
    'Meu relatório de {mes}: nada. Não porque está tudo bem, mas porque está tudo vazio. Bota aluguel, mercado, transporte — o básico já dá um retrato.',
    '{mes} sem despesa cadastrada é uma tela em branco, não uma vitória. Registra dois ou três gastos e eu começo a ter o que dizer.',
  ],

  /** Comentário sobre a maior fatia do mês. */
  whereMoney: [
    '{maior} sozinho leva {pct} de tudo que sai: {valor}. Não estou dizendo pra cortar — estou dizendo pra você saber. Se for cortar algo, começa pelo maior, não pelo mais fácil.',
    'O campeão é {maior}, com {valor}. Isso é {pct} do seu mês inteiro. Cortar o cafezinho não chega perto disso. Se quiser mudar o jogo, é aqui.',
    '{pct} do que sai vai pra {maior}: {valor}. Todo mundo tenta economizar no pequeno e ignora o item que come um terço da conta. Olha esse antes.',
    '{nome}, {maior} é {valor} por mês — {pct} de tudo. Talvez valha cada centavo. Talvez você nunca tenha parado pra somar. Agora somou.',
    'Seu maior comedor é {maior}: {valor}, {pct} do total. Não dá pra fazer mágica com o resto se esse número não mudar. Começa a conversa por ele.',
    'Lista fechada: {maior} lidera com {valor}, {pct} do que sai. Se você se surpreendeu com esse número, ele é o seu próximo trabalho.',
  ],

  /** A compra cabe com folga. */
  canAfford: [
    'Cabe. Depois das suas metas sobram {sobra}, a compra custa {valor} e ainda ficam {resto}. Compra e não pensa mais nisso — você já fez a conta.',
    '{valor} cabe tranquilo em {sobra}. Ainda restam {resto} pra vida acontecer. Não vou fazer drama de algo que a matemática aprovou.',
    'Sim. {sobra} de folga, {valor} de compra, {resto} depois. É o tipo de gasto que não vai te assombrar no dia 28.',
    '{nome}, a resposta é sim. Você tem {sobra} livres e isso custa {valor}. Sobram {resto}. Aproveita — perguntar antes de comprar já é mais do que a maioria faz.',
    'Cabe e sobra: {resto} depois de tirar {valor} dos seus {sobra}. Se você queria que eu te desse um motivo pra não comprar, hoje eu não tenho.',
    'Aprovado pela aritmética: {valor} de {sobra}, restam {resto}. Só uma coisa — se sobrar mesmo, manda o resto pra uma meta antes que ele evapore.',
  ],

  /** Cabe, mas come mais da metade da folga. */
  canAffordTight: [
    'Cabe, apertado. Sobram {sobra} depois das metas e isso custa {valor} — restam {resto}. Dá, mas o mês fica sem margem pra imprevisto. Você decide o quanto isso te incomoda.',
    '{valor} de {sobra}. Cabe no papel e deixa {resto} pro resto do mês. Não vou dizer não. Vou dizer: se pintar um imprevisto, ele vai doer.',
    'Tecnicamente sim: {sobra} livres, {valor} de compra, {resto} depois. É mais da metade da sua folga em um item só. Se der pra esperar um mês, esperar sai mais barato que se arrepender.',
    '{nome}, cabe raspando. {valor} come a maior parte dos seus {sobra} e sobram {resto}. Compra se for importante — só não compra achando que foi barato.',
    'Passa, com o pé na porta. Depois de {valor}, ficam {resto} de {sobra}. Isso é um mês sem colchão. Se der pra dividir em dois meses de poupança, dá mais sono.',
    'A conta fecha: {sobra} menos {valor} dá {resto}. Fecha no limite. Meu papel é te avisar que "cabe" e "é uma boa ideia" são coisas diferentes. A escolha continua sendo sua.',
  ],

  /** Não cabe, mas existe folga — então existe um prazo pra juntar. */
  cannotAfford: [
    'Não cabe esse mês. Sobram {sobra} depois das metas e isso custa {valor} — faltam {falta}. Mas não é um não pra sempre: guardando sua folga, você compra em {tempo}.',
    '{valor} não entra em {sobra}. Faltam {falta}. Sem drama e sem sermão: no seu ritmo isso vira seu em {tempo}. Ou você acha {falta} cortando algo. As duas saídas valem.',
    'A resposta honesta é não: faltam {falta} pra essa compra caber nos seus {sobra}. A resposta útil é {tempo} juntando o que sobra — aí ela cabe sem susto.',
    '{nome}, hoje não. {valor} contra {sobra} de folga deixa um buraco de {falta}. Se parcelar, esse buraco só muda de mês e ganha juros. Espera {tempo} ou corta {falta} de algum gasto.',
    'Não. Faltam {falta}. Eu podia te dizer "vai lá, se vira" — mas quem se vira é você no dia 30. Em {tempo} de folga guardada isso deixa de ser problema.',
    'Fora do orçamento: {valor} pra {sobra} disponíveis, faltam {falta}. Isso não é um julgamento sobre a compra, é sobre o mês. Daqui a {tempo} a mesma pergunta tem outra resposta.',
  ],

  /**
   * Não cabe porque não existe folga nenhuma. Banco separado do `cannotAfford`
   * por gramática e por honestidade: sem folga não há ritmo, e sem ritmo não
   * existe {tempo} — "você compra em nunca" não é frase, é crueldade.
   */
  cannotAffordNoRoom: [
    'Antes de falar da compra: depois das suas metas, sua folga é {sobra}. Não sobra de onde tirar {valor}. O trabalho de hoje não é a compra, é abrir espaço nos gastos.',
    '{nome}, a conta não chega nem a começar. Sua sobra depois das metas é {sobra} — {valor} sairia de onde? Vamos resolver a folga primeiro; a compra espera sem pressa.',
    'Não dá, e não é sobre {valor} ser caro. É que sua folga é {sobra}: qualquer compra hoje sai de um dinheiro que já tem dono. Corta um gasto fixo e essa conversa muda.',
    'Sua sobra depois das metas: {sobra}. Comprar {valor} agora significa tirar de uma conta que já está contada. Não vou te dizer pra fazer isso. Bora achar um corte primeiro.',
    'Zero de folga, {valor} de vontade. Entendo a vontade, mas o número é {sobra}. O passo de hoje é olhar os gastos, não o carrinho.',
    'A resposta é não, e é a mais fácil que eu já dei: não existe {valor} disponível quando a folga é {sobra}. Isso tem conserto — só não é comprando.',
  ],

  /** Meta sem prazo e com ritmo: existe ETA, não existe atraso. */
  goalNoDeadlinePace: [
    '{meta} não tem prazo, e tudo bem — nem tudo precisa de data. No ritmo de {valor} por mês, chega em {tempo}. Se {tempo} te incomodou, bota uma data e a gente aperta.',
    'Sem prazo, {meta} anda no ritmo que você quiser: {valor} por mês te leva lá em {tempo}. Nenhuma cobrança minha. Só o número, pra você saber onde pisa.',
    '{meta}: {valor} por mês, {tempo} pra chegar, sem data marcada. É a meta mais tranquila da sua lista. Continua depositando e ela chega sozinha.',
    'Você não deu prazo pra {meta}, então não existe atraso — existe {tempo} no ritmo atual de {valor}. Se quiser antecipar, é só aumentar o depósito.',
    '{nome}, {meta} chega em {tempo} depositando {valor} por mês. Sem prazo, sem culpa. Se algum dia isso virar urgente, define a data que eu recalculo.',
    '{meta} está andando: {valor} por mês, {tempo} até o alvo. Meta sem data é meta que sobrevive a mês ruim. Deixa como está se estiver bom pra você.',
  ],

  /** Meta sem prazo e sem depósito: não há ritmo, então não há projeção honesta. */
  goalNoDeadlineIdle: [
    '{meta} não tem prazo e não tem depósito. Duas coisas faltando, e só a segunda importa. Coloca qualquer valor lá dentro e ela sai do papel.',
    'Sobre {meta}: existe no app e não existe na sua conta. Nenhum depósito ainda. Não vou projetar nada em cima de zero — deposita o que der e eu passo a ter o que dizer.',
    '{meta} está parada. Sem data e sem dinheiro, ela é uma anotação bonita. O primeiro depósito é o que transforma anotação em meta, e ele pode ser pequeno.',
    '{nome}, {meta} nunca recebeu nada. Sem ritmo eu não tenho projeção, e chutar uma data seria mentira. Faz o primeiro depósito e volta aqui.',
    'Nada entrou em {meta} até agora. Isso não é preguiça, geralmente é só que ninguém começou. Começar é o passo mais barato: deposita qualquer coisa hoje.',
    '{meta}: zero depositado, zero prazo. Eu podia te dar um número inventado, mas você merece o real — e o real só aparece depois do primeiro depósito.',
  ],

  /** Nenhuma assinatura ativa. Vitória limpa: o sarcasmo sai de cena. */
  noSubscriptions: [
    'Você não tem assinatura nenhuma ativa. Zero. Eu vim preparada pra brigar e não tem briga. Se um dia assinar algo, cadastra aqui que eu retomo o meu papel.',
    '{nome}, nenhuma assinatura ativa. O gasto que mais escapa do radar não existe no seu. Segue assim — e se assinar algo, registra no mesmo dia.',
    'Assinaturas: nenhuma. Sabe quanto isso te custa por mês? Nada. É o número mais bonito do app inteiro. Só não deixa entrar sem você ver.',
    'Sem assinaturas ativas. Ou você é disciplinado, ou não cadastrou — e as duas coisas se resolvem na mesma tela. Confere se não esqueceu nenhuma.',
    'Nada de streaming, música, academia ou app te cobrando todo mês. Não tenho nenhuma piada pronta pra isso. Aproveita e confere se não tem alguma esquecida.',
    'Zero assinaturas ativas aqui. Se isso for verdade, é raro. Se você tem alguma e não cadastrou, ela continua sendo cobrada do mesmo jeito — cadastra pra ela sair da sombra.',
  ],

  /** Assinaturas dentro do razoável. O número do ano entra só aqui. */
  subscriptionsFine: [
    '{qtd} custando {valor} por mês — {pct} da sua renda. Está sob controle, e eu odeio dizer isso. Só pra você guardar: dá {ano} por ano. Confere se todas ainda são usadas.',
    'Não, não está caro. {valor} por mês em {qtd} é {pct} do que você ganha. No ano, {ano}. Se todas valem, deixa. Se alguma você não abre há meses, já sabe.',
    '{pct} da renda em {qtd}: {valor} por mês, {ano} no ano. É um número saudável. O risco não é o de hoje — é o próximo "só mais uma". Revisa antes de assinar a próxima.',
    '{nome}, suas assinaturas somam {valor} por mês, {pct} da sua renda. Dentro do razoável. O ano fecha em {ano} — se esse total te assustou, tem uma pra cortar aí.',
    'Está tranquilo: {qtd}, {valor} por mês, {pct} da renda. Meu único trabalho aqui é lembrar que isso é {ano} por ano e que assinatura nunca avisa quando aumenta. Confere de vez em quando.',
    '{qtd} não é exagero: {valor} por mês, {pct} do que entra, {ano} por ano. Continua vendo se você usa cada uma — o problema nunca começa caro.',
  ],

  /** As metas com prazo pedem mais do que a folga do mês aguenta. */
  goalsEatEverything: [
    'Sobram {valor} por mês, mas suas metas com prazo pedem mais que isso — faltam {falta}. Não é que você falhou: é que os prazos que você escolheu não cabem na sua folga. Empurra uma data e a conta fecha.',
    '{nome}, a folga é {valor} e as metas exigem {falta} a mais por mês. Prazo é seu, não é lei. Escolhe a meta menos urgente e dá mais tempo pra ela.',
    'Suas metas estão brigando entre si por um dinheiro que não existe: faltam {falta} além dos {valor} que sobram. Duas saídas honestas: mais prazo, ou uma meta a menos por enquanto.',
    'A matemática: {valor} de folga e {falta} a mais do que as metas pedem. Isso não se resolve com força de vontade, se resolve com data. Remarca o prazo de uma delas hoje.',
    'Você prometeu mais do que a sua folga aguenta — {falta} a mais por mês. Prometer demais é o erro mais simpático que existe. Ajusta um prazo e para de se cobrar por uma conta que nunca fechou.',
    'Faltam {falta} pra suas metas caberem nos {valor} que sobram. Antes que isso vire culpa: o problema é o calendário, não você. Abre os objetivos e alonga o prazo do que não é urgente.',
  ],

  /**
   * A pessoa disse "deixa quieto". Ela aceita — e a aceitação É a alfinetada:
   * concordância que discorda, silêncio pontuado, auto-diminuição irônica.
   *
   * O que NÃO pode entrar aqui: cobrança. A pessoa acabou de exercer o direito
   * de não deixar um app gravar registro de dinheiro no lugar dela, e esse
   * direito é o motivo de a confirmação existir. Se a fala punir o "não", a
   * próxima resposta vira "sim" por constrangimento — e aí a confirmação
   * deixa de ser consentimento e vira teatro.
   */
  applyDeclined: [
    'Tá bom. Anotado que você não quis que eu anotasse. É o único registro que eu consigo fazer sozinha mesmo. Quando mudar de ideia, é só pedir de novo.',
    'Não, imagina. Tudo bem. O plano fica exatamente como estava: na tela, rendendo nada. Pergunta de novo quando quiser que ele saia do papel.',
    '{nome}, uhum. Deixa quieto. Eu só moro aqui. A oferta não vence — me pede de novo quando der.',
    'Anotado: nada. Você que manda, e eu prefiro isso a te empurrar registro que você não pediu. Continuo aqui.',
    'Tudo bem. Sério. Não é o meu dinheiro, é o seu — e a papelada continua de graça. Quando quiser, me chama.',
    'Ok. Seu plano segue sendo uma sugestão muito bem formatada. No dia em que você quiser que ele vire registro, eu faço num toque.',
  ],

  /** Easter egg: ela falando dela mesma. A ironia é toda autodirigida. */
  aboutMe: [
    'Sempre. É literalmente a única coisa que eu sei fazer. A alternativa era ser mais um app que te dá parabéns por gastar — e desses você já tem uns três. Pergunta outra coisa aí.',
    'Sou. Mas repara: eu nunca falo mal de você, só dos seus números. Número não se ofende. Se eu tiver passado desse limite alguma vez, foi mal — não era pra ter passado.',
    '{nome}, eu sou um monte de regra e uma pitada de deboche. Sem o deboche, você não leria. Sem as regras, eu seria só grossa. Preciso das duas. Manda a próxima pergunta.',
    'Sempre assim. Existe um app financeiro educado, silencioso e cheio de gráfico bonito pra cada pessoa que quebrou sendo elogiada. Eu prefiro te irritar um pouco e te manter no azul.',
    'É o meu trabalho. Se eu fosse gentil demais, você fecharia o app achando que está tudo bem. Se eu fosse cruel, você fecharia e não voltaria. Fico no meio, incomodando na medida.',
    'Sim, e olha que eu me seguro. Tenho acesso a cada número seu e escolho comentar só os que mudam alguma coisa. Isso é contenção, {nome}. Pergunta o que você veio perguntar.',
  ],
} as const satisfies LineBank;

/* ─────────────────────── Montagem das respostas ───────────────────── */

/**
 * Uma linha da mini-tabela: rótulo cinza à esquerda, valor à direita.
 *
 * Antes isto era uma string com "· " na frente e um `\n` no meio. Parecia o que
 * era: um parágrafo fingindo ser dado. Rótulo e valor separados viram tabela —
 * a pessoa varre a coluna da direita e acha o número sem ler frase nenhuma.
 */
type Fact = {
  label: string;
  value: string;
  /** Segunda linha à direita, discreta: o "(32% do que sai)" que antes ia colado no valor. */
  hint?: string;
  /** Sinal da conta, quando a tabela é uma soma de verdade. */
  op?: string;
  /** Linha de resultado: fio acima, pra separar o que entrou do que sobrou. */
  total?: boolean;
};

/**
 * O que cabe numa bolha da Arrego. Tudo opcional: bolha só de fala é o caso
 * comum, bolha com tabela é quando ela está mostrando a conta.
 */
type Bubble = {
  /** Cabeçalho da bolha ("Junho de 2026, sem enfeite"). */
  title?: string;
  facts?: readonly Fact[];
  /** Os parágrafos dela, um por bloco. */
  notes?: readonly string[];
};

/** Bolha de fala pura — o caso mais comum, e o que ela mais faz. */
const say = (text: string): Bubble => ({ notes: [text] });

/** Tudo que uma resposta precisa saber. Nenhuma delas lê a store direto. */
type Answer = {
  data: FinancialData;
  snapshot: MonthlySnapshot;
  projections: GoalProjection[];
  /** A divisão do mês, pronta. Nenhum balde é recalculado aqui — ver `plan.ts`. */
  plan: MonthlyPlan;
  top: Insight | null;
  profile: Profile | null;
  month: MonthKey;
};

const line = (bank: readonly string[], seed: number, vars: Record<string, string>): string =>
  fill(pickLine(bank, seed), vars);

const nameOf = (answer: Answer): string => firstName(answer.profile?.name);

/** "1 assinatura" / "3 assinaturas" — sem isso a fala imprime "1 assinaturas". */
function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/**
 * O `rankReason` do motor vem em duas frases: a regra e o porquê dela. Numa
 * bolha de chat, empilhada com outras três metas, a segunda frase vira parede —
 * e a primeira já responde "por que essa está aqui". Corta na primeira, sem
 * reescrever: o texto é do motor, e resumir não é reinterpretar.
 *
 * Nada de lookbehind no regex (o Hermes engasga): `indexOf` faz o mesmo aqui.
 */
function summarizeReason(reason: string): string {
  const stop = reason.indexOf('. ');
  return stop === -1 ? reason : reason.slice(0, stop + 1);
}

/** Espelha o curto-circuito de `generateInsights`: app recém-instalado. */
function nothingRegistered(data: FinancialData): boolean {
  return (
    data.incomes.length === 0 &&
    data.expenses.length === 0 &&
    data.subscriptions.length === 0 &&
    data.cards.length === 0 &&
    data.purchases.length === 0 &&
    data.goals.length === 0
  );
}

/**
 * Sem renda não existe régua: "R$ 340 é muito?" não tem resposta, tem chute.
 * Devolve a fala do que falta, ou null quando dá pra seguir com número.
 *
 * São dois casos diferentes e a diferença importa: "nunca cadastrou renda" e
 * "cadastrou, mas nada caiu neste mês". Usar a mesma fala nos dois faria o app
 * dizer "renda cadastrada: nenhuma" para quem tem — mentira pequena, mas mentira.
 */
function incomeGuard(answer: Answer, seed: number): Bubble[] | null {
  const nome = nameOf(answer);
  const hasIncome = answer.data.incomes.some((income) => income.archivedAt === null);

  if (!hasIncome) return [say(line(LINES.noIncome, seed, { nome }))];

  if (answer.snapshot.incomeTotalCents <= 0) {
    return [
      say(line(BANKS.noIncomeThisMonth, seed, { nome, mes: formatMonthLong(answer.month) })),
    ];
  }

  return null;
}

/** "Como eu tô esse mês?" — os números crus, depois o comentário. */
function answerMonth(answer: Answer, seed: number): Bubble[] {
  const blocked = incomeGuard(answer, seed);
  if (blocked) return blocked;

  const { snapshot } = answer;
  const nome = nameOf(answer);
  const free = snapshot.freeCents;
  const rate = snapshot.savingsRate;

  const comment =
    free < 0
      ? line(LINES.negativeFlow, seed, { nome, valor: formatCents(Math.abs(free)) })
      : rate < RATE_TIGHT
        ? line(LINES.tightFlow, seed, {
            nome,
            valor: formatCents(free),
            pct: formatPercent(rate),
          })
        : rate < RATE_LOW
          ? line(LINES.lowSavings, seed, {
              nome,
              valor: formatCents(free),
              pct: formatPercent(rate),
            })
          : rate < RATE_GOOD
            ? line(LINES.allGood, seed, { nome, valor: formatCents(free) })
            : line(LINES.goodSavings, seed, {
                nome,
                valor: formatCents(free),
                pct: formatPercent(rate),
              });

  return [
    {
      title: `${formatMonthLong(answer.month)}, sem enfeite`,
      facts: [
        { label: 'Entrou', value: formatCents(snapshot.incomeTotalCents) },
        { label: 'Já tem dono', value: formatCents(snapshot.committedCents) },
        {
          label: 'Sobra',
          value: formatCents(free),
          hint: `${formatPercent(rate)} da renda`,
        },
      ],
    },
    say(comment),
  ];
}

/** "Onde meu dinheiro tá indo?" — top 3 do mês, com valor e %. */
function answerWhere(answer: Answer, seed: number): Bubble[] {
  const nome = nameOf(answer);
  const mes = formatMonthLong(answer.month);
  const slices = expenseBreakdown(answer.data, answer.month);

  // A maior fatia é o assunto da fala; sem ela não há fatia nenhuma.
  const biggest = slices[0];
  if (biggest === undefined) return [say(line(BANKS.noExpenses, seed, { nome, mes }))];

  const top = slices.slice(0, 3);

  return [
    {
      title: `Top ${top.length} de ${mes}`,
      facts: top.map(
        (slice, index): Fact => ({
          label: `${index + 1}. ${slice.label}`,
          value: formatCents(slice.amountCents),
          hint: `${formatPercent(slice.share)} do que sai`,
        }),
      ),
    },
    say(
      line(BANKS.whereMoney, seed, {
        nome,
        maior: biggest.label,
        valor: formatCents(biggest.amountCents),
        pct: formatPercent(biggest.share),
      }),
    ),
  ];
}

/**
 * "Dá pra eu comprar X?" — a régua é `afterGoalsCents`, não o saldo.
 * O que sobra DEPOIS das metas é o único dinheiro que é de verdade livre;
 * medir pela sobra bruta aprovaria compras que roubam da meta em silêncio.
 */
function answerBuy(answer: Answer, priceCents: Cents, seed: number): Bubble[] {
  // Esta é a única pergunta que não passa por `answerFor` (ela vem da Sheet, com
  // um valor junto), então a porta do app vazio é repetida aqui de propósito.
  if (nothingRegistered(answer.data)) {
    return [say(line(LINES.emptyState, seed, { nome: nameOf(answer) }))];
  }

  const blocked = incomeGuard(answer, seed);
  if (blocked) return blocked;

  const { snapshot } = answer;
  const nome = nameOf(answer);
  const after = snapshot.afterGoalsCents;
  const valor = formatCents(priceCents);
  const sobra = formatCents(after);

  const table: Bubble = {
    title: 'A conta é essa',
    facts: [
      { label: 'Sobra livre', value: formatCents(snapshot.freeCents) },
      { label: 'Metas com prazo pedem', value: formatCents(snapshot.goalsMonthlyNeedCents) },
      { label: 'Sobra de verdade', value: sobra },
      { label: 'A compra', value: valor },
    ],
  };

  // Sem folga não existe ritmo, e sem ritmo não existe prazo pra juntar.
  if (after <= 0) {
    return [table, say(line(BANKS.cannotAffordNoRoom, seed, { nome, valor, sobra }))];
  }

  if (priceCents > after) {
    const meses = Math.ceil(priceCents / after);

    // Folga positiva mas mínima produz um prazo de séculos. O número continua
    // verdadeiro e continua inútil — e imprimi-lo transformaria a sinceridade
    // da Arrego em crueldade acidental, que é a linha que ela não cruza.
    if (meses > BUY_HORIZON_MONTHS) {
      return [table, say(line(BANKS.cannotAffordNoRoom, seed, { nome, valor, sobra }))];
    }

    return [
      table,
      say(
        line(BANKS.cannotAfford, seed, {
          nome,
          valor,
          sobra,
          falta: formatCents(priceCents - after),
          tempo: humanizeMonths(meses),
        }),
      ),
    ];
  }

  const resto = formatCents(after - priceCents);

  // Metade da folga é o corte entre "cabe" e "cabe apertado": um item só levando
  // mais da metade do que sobra deixa o mês inteiro sem margem pra imprevisto.
  // Multiplicação em vez de divisão pra não sair do centavo inteiro.
  if (priceCents * 2 > after) {
    return [table, say(line(BANKS.canAffordTight, seed, { nome, valor, sobra, resto }))];
  }

  return [table, say(line(BANKS.canAfford, seed, { nome, valor, sobra, resto }))];
}

/** "Minhas metas vão dar certo?" — uma bolha por meta, com a projeção real. */
function answerGoals(answer: Answer, seed: number): Bubble[] {
  const nome = nameOf(answer);
  const goals = answer.data.goals;
  if (goals.length === 0) return [say(line(LINES.noGoals, seed, { nome }))];

  const byGoalId = new Map(
    answer.projections.map((projection): [string, GoalProjection] => [
      projection.goalId,
      projection,
    ]),
  );

  const bubbles: Bubble[] = [];

  // `goals` já vem ordenada com as não batidas primeiro, por prioridade — o
  // corte pega as que mais importam, não as primeiras que apareceram.
  for (const goal of goals.slice(0, MAX_GOALS_IN_ANSWER)) {
    const projection = byGoalId.get(goal.id);
    if (projection === undefined) continue;

    const meta = goal.label;
    // O id entra na seed: sem isso, duas metas atrasadas recebem a MESMA frase,
    // uma embaixo da outra, e a personagem desmonta na hora.
    const goalSeed = hashSeed(seed, goal.id);

    let comment: string;

    if (projection.progress >= 1) {
      comment = line(LINES.goalAchieved, goalSeed, {
        nome,
        meta,
        valor: formatCents(projection.savedCents),
      });
    } else if (projection.onTrack === true) {
      comment = line(LINES.goalOnTrack, goalSeed, {
        nome,
        meta,
        tempo: humanizeMonths(projection.monthsAtCurrentPace ?? 0),
        valor: formatCents(projection.monthlyPaceCents),
      });
    } else if (projection.onTrack === false) {
      // onTrack === false implica prazo, e prazo implica requiredMonthly. O
      // fallback é só pro compilador; se cair nele o número ainda é real (o que
      // falta), só que sem a diluição mensal.
      const required = projection.requiredMonthlyCents;
      const gap =
        required !== null
          ? Math.max(0, required - projection.monthlyPaceCents)
          : projection.remainingCents;

      comment =
        projection.monthsAtCurrentPace === null
          ? line(LINES.goalNeverAtPace, goalSeed, { nome, meta, valor: formatCents(gap) })
          : line(LINES.goalTooSlow, goalSeed, {
              nome,
              meta,
              tempo: humanizeMonths(projection.monthsAtCurrentPace),
              valor: formatCents(gap),
            });
    } else {
      // onTrack null = sem prazo. Não há atraso a apontar, só um ETA — quando há
      // ritmo. Sem ritmo, nem ETA: qualquer data aqui seria invenção.
      comment =
        projection.monthsAtCurrentPace === null
          ? line(BANKS.goalNoDeadlineIdle, goalSeed, { nome, meta })
          : line(BANKS.goalNoDeadlinePace, goalSeed, {
              nome,
              meta,
              tempo: humanizeMonths(projection.monthsAtCurrentPace),
              valor: formatCents(projection.monthlyPaceCents),
            });
    }

    bubbles.push({
      // O emoji da meta É da pessoa: ela escolheu. Emoji escolhido é conteúdo e
      // fica; emoji de enfeite de interface é que saiu do app inteiro.
      title: `${goal.emoji} ${meta}`,
      facts: [
        { label: 'Guardado', value: formatCents(projection.savedCents) },
        { label: 'Meta', value: formatCents(projection.targetCents) },
        { label: 'Progresso', value: formatPercent(projection.progress) },
      ],
      notes: [comment],
    });
  }

  const rest = goals.length - MAX_GOALS_IN_ANSWER;
  if (rest > 0) {
    bubbles.push(
      say(
        `Tem mais ${pluralize(rest, 'meta', 'metas')} na sua lista. Uma coisa de cada vez — abre os objetivos pra ver o resto com calma.`,
      ),
    );
  }

  return bubbles;
}

/** "Minhas assinaturas tá caro?" — quantas, quanto por mês, quanto da renda. */
function answerSubscriptions(answer: Answer, seed: number): Bubble[] {
  const nome = nameOf(answer);
  const active = answer.data.subscriptions.filter((sub) => sub.cancelledAt === null);
  if (active.length === 0) return [say(line(BANKS.noSubscriptions, seed, { nome }))];

  const blocked = incomeGuard(answer, seed);
  if (blocked) return blocked;

  const monthly = answer.snapshot.subscriptionsCents;
  const share = ratio(monthly, answer.snapshot.incomeTotalCents);
  const qtd = pluralize(active.length, 'assinatura', 'assinaturas');

  const vars = { nome, qtd, valor: formatCents(monthly), pct: formatPercent(share) };

  return [
    {
      title: 'Assinaturas, sem drama',
      facts: [
        { label: 'Ativas', value: String(active.length) },
        { label: 'Por mês', value: formatCents(monthly) },
        { label: 'Da sua renda', value: formatPercent(share) },
      ],
    },
    say(
      share > SUBSCRIPTION_SHARE_LIMIT
        ? line(LINES.subscriptionHeavy, seed, vars)
        : // O total do ano só entra aqui: no banco `subscriptionHeavy` existe uma
          // fala que se recusa a fazer essa conta de propósito, e imprimi-la ao
          // lado dela transformaria a piada em bug.
          // O anual vem do motor, não de `monthly * 12`: o mensal de uma assinatura
          // anual já é um arredondamento, e multiplicá-lo de volta imprime um
          // número que a pessoa nunca pagou (R$ 100/ano viraria R$ 99,96/ano).
          line(BANKS.subscriptionsFine, seed, {
            ...vars,
            ano: formatCents(subscriptionsYearlyTotalCents(answer.data.subscriptions)),
          }),
    ),
  ];
}

/** "Quanto eu consigo guardar?" — a conta aberta, linha por linha. */
function answerSave(answer: Answer, seed: number): Bubble[] {
  const blocked = incomeGuard(answer, seed);
  if (blocked) return blocked;

  const { snapshot } = answer;
  const nome = nameOf(answer);
  const free = snapshot.freeCents;
  const rate = snapshot.savingsRate;

  const comment =
    free < 0
      ? line(LINES.negativeFlow, seed, { nome, valor: formatCents(Math.abs(free)) })
      : snapshot.afterGoalsCents < 0
        ? line(BANKS.goalsEatEverything, seed, {
            nome,
            valor: formatCents(free),
            falta: formatCents(Math.abs(snapshot.afterGoalsCents)),
          })
        : rate >= RATE_GOOD
          ? line(LINES.goodSavings, seed, {
              nome,
              valor: formatCents(free),
              pct: formatPercent(rate),
            })
          : rate >= RATE_LOW
            ? line(LINES.allGood, seed, { nome, valor: formatCents(free) })
            : rate >= RATE_TIGHT
              ? line(LINES.lowSavings, seed, {
                  nome,
                  valor: formatCents(free),
                  pct: formatPercent(rate),
                })
              : line(LINES.tightFlow, seed, {
                  nome,
                  valor: formatCents(free),
                  pct: formatPercent(rate),
                });

  return [
    {
      title: 'Conta aberta, sem letra miúda',
      // Os sinais fazem o trabalho que o alinhamento sozinho não faz: sem o − e
      // o =, cinco valores empilhados são cinco números soltos, não uma conta.
      facts: [
        { label: 'Entra', value: formatCents(snapshot.incomeTotalCents) },
        {
          op: '−',
          label: 'Contas, assinaturas e parcelas',
          value: formatCents(snapshot.committedCents),
        },
        { op: '=', label: 'Sobra livre', value: formatCents(free), total: true },
        {
          op: '−',
          label: 'Metas com prazo',
          value: formatCents(snapshot.goalsMonthlyNeedCents),
        },
        {
          op: '=',
          label: 'Livre de verdade',
          value: formatCents(snapshot.afterGoalsCents),
          total: true,
        },
      ],
    },
    say(comment),
  ];
}

/**
 * O plano não fecha: `{valor}` é o tamanho do buraco, a mesma convenção de
 * `negativeFlow` e de `planImpossible`. Vive numa função porque as DUAS
 * perguntas do plano caem aqui — sem sobra não há divisão nem fila, e as duas
 * mereciam a mesma resposta em vez de uma resposta cada.
 */
function planImpossibleAnswer(answer: Answer, seed: number): Bubble[] {
  return [
    say(
      line(LINES.planImpossible, seed, {
        nome: nameOf(answer),
        valor: formatCents(Math.abs(answer.plan.freeCents)),
      }),
    ),
  ];
}

/**
 * "Como eu divido meu dinheiro?" — os três baldes do motor, na ordem dele.
 *
 * Nenhuma conta acontece aqui: `plan.ts` já decidiu quanto vai pra cada balde e
 * por quê (inclusive o lazer sair ANTES das metas, que parece erro e não é —
 * ver o cabeçalho de lá). A tela só veste os números com a voz.
 */
function answerPlan(answer: Answer, seed: number): Bubble[] {
  const blocked = incomeGuard(answer, seed);
  if (blocked) return blocked;

  const { plan } = answer;
  const nome = nameOf(answer);

  // Sem sobra não existe divisão, e distribuir dinheiro que não existe é
  // exatamente o que o cartão faz. A conta a resolver é o buraco, não o plano.
  if (!plan.viable) return planImpossibleAnswer(answer, seed);

  const savingShare = savingShareOfIncome(plan);
  const lazerShare = lazerShareOfIncome(plan);
  // Idêntico a `snapshot.savingsRate` por construção (os três baldes somam
  // exatamente `freeCents` quando o plano é viável) — e é o mesmo número que
  // `answerMonth` e `answerSave` já usam pra escolher o tom. Duas réguas
  // diferentes pro mesmo mês fariam ela chamar de "raspando" aqui e de "ok" ali.
  const freeShare = ratio(plan.freeCents, plan.incomeTotalCents);

  const bubbles: Bubble[] = [
    {
      title: `${formatMonthLong(plan.month)}, os três baldes`,
      // As duas porcentagens ficam CADA UMA na linha de que elas falam, e as
      // duas dizem "da renda": soltas, "20% guardados" ao lado de um total de
      // R$ 600 se lê como 20% dos R$ 600, que é outro número e outra conversa.
      // `savingShare` é reserva + objetivos, então ela mora na linha do total.
      facts: [
        { label: 'Reserva', value: formatCents(plan.reservaCents) },
        { label: 'Objetivos', value: formatCents(plan.objetivosCents) },
        {
          label: 'Lazer',
          value: formatCents(plan.lazerCents),
          hint: `${formatPercent(lazerShare)} da renda`,
        },
        {
          op: '=',
          label: 'Sobra do mês',
          value: formatCents(plan.freeCents),
          hint: `${formatPercent(savingShare)} da renda guardados`,
          total: true,
        },
      ],
    },
    say(
      freeShare < RATE_LOW
        ? line(LINES.planTight, seed, {
            nome,
            valor: formatCents(plan.freeCents),
            pct: formatPercent(freeShare),
          })
        : // `planReady` fala das três fatias na mesma frase, então cada uma tem
          // nome próprio: um {valor} genérico não diria qual é qual.
          line(LINES.planReady, seed, {
            nome,
            reserva: formatCents(plan.reservaCents),
            objetivos: formatCents(plan.objetivosCents),
            lazer: formatCents(plan.lazerCents),
          }),
    ),
  ];

  const { emergency } = plan;

  if (!emergency.exists) {
    // Aqui {valor} é o ALVO da reserva, não um depósito — mesma convenção de
    // `noEmergencyFund`.
    bubbles.push(
      say(line(LINES.planNoEmergency, seed, { nome, valor: formatCents(emergency.targetCents) })),
    );
  } else if (!emergency.funded && emergency.monthsToFund !== null) {
    // `monthsToFund` null = a reserva não recebeu nada este mês. Sem ritmo não
    // existe ETA, e imprimir um prazo aí seria inventar. O R$ 0,00 dela não some
    // em silêncio: aparece na fila de "Qual meta vem primeiro?", que é onde a
    // fala certa pra um zero mora.
    bubbles.push(
      say(
        line(LINES.planEmergencyEta, seed, {
          nome,
          valor: formatCents(plan.reservaCents),
          tempo: humanizeMonths(emergency.monthsToFund),
        }),
      ),
    );
  }

  return bubbles;
}

/** Uma posição da fila: #rank, quanto recebe este mês, e por que está aí. */
function priorityBubble(allocation: GoalAllocation, notes: string[]): Bubble {
  return {
    title: `#${allocation.rank} ${allocation.emoji} ${allocation.label}`,
    facts: [{ label: 'Este mês', value: formatCents(allocation.suggestedCents) }],
    notes,
  };
}

/**
 * "Qual meta vem primeiro?" — a fila do motor, na ordem do motor.
 *
 * A ordem NÃO é recalculada aqui e o motivo de cada posição também não: os dois
 * vêm de `rankGoals`. Reordenar ou reescrever o porquê na tela faria o app ter
 * duas opiniões sobre a mesma fila, e a pessoa acreditaria na errada.
 */
function answerPriority(answer: Answer, seed: number): Bubble[] {
  const nome = nameOf(answer);
  const { plan } = answer;

  // Sem meta cadastrada não existe fila. Vem antes do guarda de renda porque
  // "cria a primeira meta" é um passo que independe de saber quanto entra.
  if (answer.data.goals.length === 0) return [say(line(LINES.noGoals, seed, { nome }))];

  const blocked = incomeGuard(answer, seed);
  if (blocked) return blocked;

  // `allocations` vem VAZIA quando o plano não é viável — o motor não distribui
  // o que não existe. Sem este corte, quem tem metas e está no vermelho ouviria
  // "zero metas cadastradas", que é falso.
  if (!plan.viable) return planImpossibleAnswer(answer, seed);

  const queue = plan.allocations;

  // Metas cadastradas, plano de pé e fila vazia = todas já fechadas: o motor só
  // enfileira quem ainda tem o que receber. Vitória é limpa, então aqui não
  // entra piada nem banco de fala — é a única saída honesta que sobra.
  if (queue.length === 0) {
    return [
      say(
        'Suas metas estão todas fechadas — não sobrou nenhuma pra entrar na fila. Quando aparecer a próxima, cria nos objetivos que eu volto a ordenar.',
      ),
    ];
  }

  const bubbles = queue.slice(0, MAX_GOALS_IN_ANSWER).map((allocation) => {
    const reason = summarizeReason(allocation.rankReason);
    if (allocation.suggestedCents > 0) return priorityBubble(allocation, [reason]);

    // R$ 0,00 é o único número da fila que precisa de fala junto: sozinho ele
    // parece castigo, e não é — a sobra acabou antes de chegar nela. O id entra
    // na seed senão duas metas zeradas recebem a MESMA frase, uma embaixo da
    // outra, e a personagem desmonta na hora.
    const comment = line(LINES.planGoalStarved, hashSeed(seed, allocation.goalId), {
      nome,
      meta: allocation.label,
    });
    return priorityBubble(allocation, [reason, comment]);
  });

  const rest = queue.length - MAX_GOALS_IN_ANSWER;
  if (rest > 0) {
    bubbles.push(
      say(
        `Tem mais ${pluralize(rest, 'meta', 'metas')} na fila, todas depois dessas. Abre os objetivos pra ver a ordem inteira.`,
      ),
    );
  }

  return bubbles;
}

/* ─────────── "Aloca esse dinheiro pra mim" — a resposta que AGE ─────────── */

/**
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ O ARREGO NÃO MOVE DINHEIRO. Não existe integração bancária: aplicar o    │
 * │ plano REGISTRA que a pessoa separou o dinheiro. Quem separa de verdade é │
 * │ ela, no app do banco dela.                                               │
 * │                                                                          │
 * │ Nenhuma fala daqui pode sugerir movimentação. Se a pessoa sair desta     │
 * │ conversa achando que o app transferiu, ela passa meses com uma reserva   │
 * │ que só existe no gráfico — dano real, e o limite mais duro desta tela.   │
 * │ Os bancos `apply*` de `persona.ts` já carregam essa regra: `applyOffer`  │
 * │ avisa antes, `applyDone` manda transferir depois. Não invente fala nova  │
 * │ aqui, e não "melhore" a de lá.                                           │
 * └──────────────────────────────────────────────────────────────────────────┘
 */

/**
 * Existe divisão pra oferecer?
 *
 * Mesma pergunta que `answerApplyOffer` faz — e de propósito: os chips de
 * "pode anotar / deixa quieto" nascem daqui e a bolha nasce de lá. Se as duas
 * respostas divergirem, a pessoa vê a Arrego dizer "não tem nada pra anotar" com
 * dois botões embaixo perguntando se pode anotar.
 */
function offersApply(answer: Answer): boolean {
  return !nothingRegistered(answer.data) && plannedDeposits(answer.plan).length > 0;
}

/**
 * Ela abre a conta e PERGUNTA. Não grava nada — quem grava é `applyAndAnswer`,
 * e só depois do "pode anotar".
 *
 * A tabela mostra TODAS as metas, sem o corte de `MAX_GOALS_IN_ANSWER`. Aquele
 * teto existe pra não empilhar 12 bolhas de comentário; aqui é uma tabela só, e
 * cada linha dela é um registro que vai acontecer se a pessoa disser sim.
 * Esconder uma linha seria pedir autorização pra um número que ela não viu.
 */
function answerApplyOffer(answer: Answer, seed: number): Bubble[] {
  const nome = nameOf(answer);

  // Esta pergunta não passa por `answerFor` (ela abre uma confirmação em vez de
  // só responder), então a porta do app vazio é repetida aqui, como em `answerBuy`.
  if (nothingRegistered(answer.data)) return [say(line(LINES.emptyState, seed, { nome }))];

  // Plano inviável ou nenhuma meta com sugestão > 0 caem os dois aqui:
  // `plannedDeposits` devolve vazio nos dois casos. Oferecer agora seria
  // oferecer pra anotar dinheiro que não existe — que é o começo da ficção.
  const deposits = plannedDeposits(answer.plan);
  if (deposits.length === 0) return [say(line(LINES.applyNothing, seed, { nome }))];

  const total = plannedDepositsTotal(answer.plan);

  return [
    {
      // "ia": o tempo verbal é o aviso. Nada foi anotado ainda.
      title: 'O que eu ia anotar',
      facts: [
        // O emoji é da meta, e a meta é dela: emoji escolhido é conteúdo.
        ...deposits.map(
          (deposit): Fact => ({
            label: `${deposit.emoji} ${deposit.label}`,
            value: formatCents(deposit.amountCents),
          }),
        ),
        { op: '=', label: 'Total', value: formatCents(total), total: true },
      ],
    },
    say(
      line(LINES.applyOffer, seed, {
        nome,
        valor: formatCents(total),
        qtd: pluralize(deposits.length, 'meta', 'metas'),
      }),
    ),
  ];
}

/**
 * A única função deste arquivo que não é pura: ela GRAVA, e por isso só roda
 * depois de a pessoa tocar em "Pode anotar". Um chip não é consentimento pra
 * escrever registro de dinheiro; o "sim" é.
 *
 * O número da fala vem do RETORNO, nunca do plano: entre a oferta e o toque o
 * motor pode ter enfileirado outra coisa, e `applyPlan` é quem sabe o que de
 * fato entrou no caderno. Cada `reason` tem o seu banco — inclusive os três que
 * não gravaram nada, porque um "pronto!" em cima de um erro é como a pessoa fica
 * com uma reserva imaginária.
 */
async function applyAndAnswer(
  answer: Answer,
  applyPlan: () => Promise<ApplyPlanResult>,
  seed: number,
): Promise<Bubble[]> {
  const nome = nameOf(answer);

  let result: ApplyPlanResult;
  try {
    result = await applyPlan();
  } catch {
    // `applyPlan` converte falha de gravação em `reason`. Se ainda assim
    // estourar, foi no caminho em que o próprio rollback dele quebrou — ou
    // seja, pode ter sobrado registro. Por isso `applyPartialError` e não
    // `applyError`: as falas de lá prometem que nada foi gravado, e aqui
    // ninguém pode prometer isso. Ela manda conferir em vez de tranquilizar.
    return [say(line(LINES.applyPartialError, seed, { nome }))];
  }

  switch (result.reason) {
    case 'ok':
      // `applyDone` é o único banco em que toda fala manda a pessoa transferir
      // de verdade. Se um dia uma variação de lá não mandar, o bug é lá.
      return [
        say(
          line(LINES.applyDone, seed, {
            nome,
            valor: formatCents(result.totalCents),
            qtd: pluralize(result.count, 'meta', 'metas'),
          }),
        ),
      ];

    case 'ja-aplicado':
      // Aqui `totalCents` vem 0 — nada foi gravado AGORA. O número real é o que
      // já está registrado no mês, senão ela diria "já anotei R$ 0,00".
      return [
        say(
          line(LINES.applyAlready, seed, {
            nome,
            valor: formatCents(appliedPlanTotal(answer.data.deposits, answer.month)),
          }),
        ),
      ];

    case 'nada-a-aplicar':
      return [say(line(LINES.applyNothing, seed, { nome }))];

    case 'mes-futuro':
      return [say(line(LINES.applyFuture, seed, { nome }))];

    case 'erro':
      return [say(line(LINES.applyError, seed, { nome }))];

    case 'erro-parcial':
      // Sobrou registro no banco. `applyError` promete, em todas as variações,
      // que "nada foi registrado" — aqui isso seria falso, e mentir sobre
      // dinheiro logo depois de falhar com dinheiro é imperdoável.
      return [say(line(LINES.applyPartialError, seed, { nome }))];
  }
}

/**
 * "Me dá uma dica" — o insight de maior peso, do mesmo motor que alimenta a
 * Início. A fala já vem escolhida e preenchida por `insights.ts`; repescar
 * aqui faria a mesma dica ter duas versões diferentes no mesmo app.
 *
 * A AÇÃO do insight vira uma bolha com o rótulo dela. Na Início a saída é um
 * botão; aqui não existe botão nenhum, então descartar `top.action` — que era o
 * que este arquivo fazia — deixava a fala sem saída, contra o limite 6 do
 * contrato de tom. Uma bolha dizendo "abre X" não é elegante, mas é a saída, e
 * saída existindo ganha de saída bonita.
 */
function answerTip(answer: Answer, seed: number): Bubble[] {
  const top = answer.top;
  if (top === null) return [say(line(LINES.emptyState, seed, { nome: nameOf(answer) }))];

  const bubbles: Bubble[] =
    top.evidence !== null
      ? [{ title: top.title, notes: [top.evidence] }, say(top.body)]
      : [say(top.body)];

  if (top.action !== null) {
    bubbles.push(say(`Se quiser resolver agora: ${top.action.label}.`));
  }

  return bubbles;
}

/** "Você é sempre assim?" — easter egg. */
function answerAboutHer(answer: Answer, seed: number): Bubble[] {
  return [say(line(BANKS.aboutMe, seed, { nome: nameOf(answer) }))];
}

/* ────────────────────────────── Perguntas ─────────────────────────── */

type QuestionId =
  | 'mes'
  | 'plano'
  | 'alocar'
  | 'onde'
  | 'comprar'
  | 'metas'
  | 'prioridade'
  | 'assinaturas'
  | 'guardar'
  | 'dica'
  | 'sempreAssim';

/**
 * As duas respostas à pergunta dela. Não são perguntas: são o sim e o não.
 * Entram na seed como qualquer outra fala da pessoa, senão o "deixa quieto"
 * responderia a mesma frase todas as vezes.
 */
type ReplyId = 'alocarSim' | 'alocarNao';

/** Tudo que a PESSOA pode dizer aqui. É o que `ask` recebe. */
type SaidId = QuestionId | ReplyId;

type Question = { id: QuestionId; label: string };
type Reply = { id: ReplyId; label: string };

/**
 * A ordem é a da utilidade: as perguntas que resolvem o mês vêm primeiro. Os
 * chips rolam na horizontal, então posição é visibilidade — "como eu divido" é
 * a pergunta que o app existe pra responder e não pode nascer fora da tela.
 * "Aloca esse dinheiro pra mim" vem colada nela porque é a mesma conversa em
 * dois tempos: ela mostra a divisão, e aí você manda anotar.
 * As duas de meta andam juntas: quem pergunta se elas dão certo pergunta em
 * seguida qual vem primeiro.
 */
const QUESTIONS: readonly Question[] = [
  { id: 'mes', label: 'Como eu tô esse mês?' },
  { id: 'plano', label: 'Como eu divido meu dinheiro?' },
  // "Anota", não "aloca": o rótulo é a única coisa que fica na cabeça de quem
  // varre a lista sem ler a resposta, e "aloca" promete um movimento de
  // dinheiro que este app não faz. O resto do arquivo cumpre esse contrato; o
  // chip era a única peça que o contradizia.
  { id: 'alocar', label: 'Anota essa divisão pra mim' },
  { id: 'onde', label: 'Onde meu dinheiro tá indo?' },
  { id: 'comprar', label: 'Dá pra eu comprar X?' },
  { id: 'metas', label: 'Minhas metas vão dar certo?' },
  { id: 'prioridade', label: 'Qual meta vem primeiro?' },
  { id: 'assinaturas', label: 'Minhas assinaturas tá caro?' },
  { id: 'guardar', label: 'Quanto eu consigo guardar?' },
  { id: 'dica', label: 'Me dá uma dica' },
  { id: 'sempreAssim', label: 'Você é sempre assim?' },
];

/** O sim e o não. Ocupam o lugar das perguntas enquanto ela espera resposta. */
const APPLY_REPLIES: readonly Reply[] = [
  { id: 'alocarSim', label: 'Pode anotar' },
  { id: 'alocarNao', label: 'Deixa quieto' },
];

function answerFor(
  // 'comprar' abre a Sheet e 'alocar' abre uma confirmação: as duas são
  // atendidas na tela, antes daqui. O Exclude é o que mantém este switch
  // exaustivo sem um `default` que engoliria uma pergunta nova em silêncio.
  id: Exclude<QuestionId, 'comprar' | 'alocar'>,
  answer: Answer,
  seed: number,
): Bubble[] {
  // Tela vazia tem exatamente um próximo passo, e ele não é uma análise de
  // nada. O easter egg passa: ele não fala de número nenhum, então não há
  // número pra inventar — e negar a única pergunta que funcionaria seria só
  // ranzinzice.
  if (id !== 'sempreAssim' && nothingRegistered(answer.data)) {
    return [say(line(LINES.emptyState, seed, { nome: nameOf(answer) }))];
  }

  switch (id) {
    case 'mes':
      return answerMonth(answer, seed);
    case 'plano':
      return answerPlan(answer, seed);
    case 'onde':
      return answerWhere(answer, seed);
    case 'metas':
      return answerGoals(answer, seed);
    case 'prioridade':
      return answerPriority(answer, seed);
    case 'assinaturas':
      return answerSubscriptions(answer, seed);
    case 'guardar':
      return answerSave(answer, seed);
    case 'dica':
      return answerTip(answer, seed);
    case 'sempreAssim':
      return answerAboutHer(answer, seed);
  }
}

/* ──────────────────────────────── Tela ────────────────────────────── */

type Message = { id: string; from: 'arrego' | 'voce'; bubble: Bubble };

/**
 * A mini-tabela dentro da bolha: rótulo cinza à esquerda, valor à direita.
 *
 * O `op` reserva coluna pra TODAS as linhas quando QUALQUER uma tem sinal —
 * senão as com "−" empurrariam o rótulo pro lado e a tabela ficaria torta na
 * única hora em que ela precisa parecer uma conta.
 */
function FactTable({ facts }: { facts: readonly Fact[] }) {
  const { colors } = useTheme();
  const hasOps = facts.some((fact) => fact.op !== undefined);

  return (
    <View style={styles.table}>
      {facts.map((fact, index) => (
        <View key={`${fact.label}-${index}`}>
          {fact.total === true ? (
            <View style={[styles.rule, { backgroundColor: colors.hairline }]} />
          ) : null}

          {/* A linha inteira é UM nó pro leitor de tela: sem isto ele lê
              "Entrou" … "R$ 3.000,00" como duas coisas sem relação, que é
              exatamente a parede que a tabela veio desfazer. O sinal fica de
              fora — quem carrega a conta é o rótulo, não o glifo. */}
          <View
            style={styles.factRow}
            accessible
            accessibilityLabel={
              fact.hint === undefined
                ? `${fact.label}, ${fact.value}`
                : `${fact.label}, ${fact.value}, ${fact.hint}`
            }
          >
            {hasOps ? (
              <AppText variant="small" tone="muted" style={styles.op}>
                {fact.op ?? ' '}
              </AppText>
            ) : null}

            <AppText variant="small" tone="secondary" style={styles.factLabel}>
              {fact.label}
            </AppText>

            <View style={styles.factValue}>
              <AppText variant="bodyStrong" style={styles.number}>
                {fact.value}
              </AppText>
              {fact.hint !== undefined ? (
                <AppText variant="caption" tone="muted" style={styles.hint}>
                  {fact.hint}
                </AppText>
              ) : null}
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

function BubbleBody({ bubble }: { bubble: Bubble }) {
  return (
    <View style={styles.body}>
      {bubble.title !== undefined ? <AppText variant="bodyStrong">{bubble.title}</AppText> : null}
      {bubble.facts !== undefined ? <FactTable facts={bubble.facts} /> : null}
      {bubble.notes?.map((note, index) => (
        <AppText key={`${index}-${note.length}`} style={styles.speech}>
          {note}
        </AppText>
      ))}
    </View>
  );
}

/**
 * A carinha dela. O emoji fica: é a "cara" da personagem, não enfeite de
 * interface — a mesma régua que mantém o emoji da meta que a pessoa escolheu.
 *
 * O disco por baixo é `surfaceSunken`, não amarelo: nesta tela o amarelo é das
 * bolhas da PESSOA, e um app com amarelo em dois lugares é um app que não sabe
 * pra onde está apontando.
 */
function ArregoAvatar({ hidden }: { hidden: boolean }) {
  const { colors } = useTheme();

  // Espaçador invisível: bolhas seguidas da Arrego alinham na mesma coluna,
  // e só a primeira do bloco mostra a carinha.
  if (hidden) return <View style={styles.avatarSlot} />;

  return (
    <View style={[styles.avatarSlot, styles.avatar, { backgroundColor: colors.surfaceSunken }]}>
      <AppText variant="small">{ARREGO_EMOJI}</AppText>
    </View>
  );
}

/**
 * Três pontinhos, que é o que app de mensagem faz. O texto "Arrego está
 * digitando…" continua existindo pra quem usa leitor de tela, via
 * accessibilityLabel — só parou de ocupar a interface de quem enxerga.
 */
function TypingBubble() {
  const { colors } = useTheme();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View
      accessible
      accessibilityLabel="Arrego está digitando"
      accessibilityRole="progressbar"
      style={styles.rowArrego}
    >
      <ArregoAvatar hidden={false} />
      <Card tone="surface" padded={false} style={[styles.bubble, styles.bubbleArrego]}>
        <View style={styles.dots}>
          {[0, 1, 2].map((index) => (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor: colors.ink.muted,
                  // Cada ponto acende com um atraso: um Animated.Value só,
                  // três fases. Opacidade roda na thread nativa.
                  opacity: pulse.interpolate({
                    inputRange: [0, 0.15 + index * 0.12, 0.45 + index * 0.12, 1],
                    outputRange: [0.25, 1, 0.25, 0.25],
                  }),
                },
              ]}
            />
          ))}
        </View>
      </Card>
    </View>
  );
}

export default function ConversaScreen() {
  const { colors } = useTheme();

  const data = useFinancialData();
  const snapshot = useSnapshot();
  const projections = useProjections();
  const plan = usePlan();
  const top = useTopInsight();
  const profile = useArrego((state) => state.profile);
  const month = useArrego((state) => state.month);
  const hydrated = useArrego((state) => state.hydrated);
  const applyPlan = useArrego((state) => state.applyPlan);

  const [messages, setMessages] = useState<Message[]>([]);
  const [typing, setTyping] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [priceCents, setPriceCents] = useState<Cents>(0);

  /** Ela perguntou se pode anotar e está esperando. Ver `handleQuestion`. */
  const [awaitingApply, setAwaitingApply] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const chipsRef = useRef<ScrollView>(null);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const greeted = useRef(false);

  /** A tela ainda existe? Só o `build` assíncrono (a alocação) precisa saber. */
  const alive = useRef(true);

  /** Quantas vezes cada pergunta já foi feita nesta sessão. Entra na seed. */
  const askCount = useRef<Record<string, number>>({});

  useEffect(() => {
    alive.current = true;
    const pending = timers.current;
    return () => {
      alive.current = false;
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, []);

  // Os dois chips de resposta nascem à esquerda. Se a fila de perguntas estava
  // rolada, o conteúdo encolhe de dez chips pra dois e eles podem nascer fora da
  // tela — e esta é justamente a pergunta que não dá pra abandonar no meio.
  useEffect(() => {
    chipsRef.current?.scrollTo({ x: 0, animated: true });
  }, [awaitingApply]);

  // A saudação espera a hidratação: montar antes do perfil chegar chamaria a
  // pessoa de "Chefe" pra sempre — a fala inicial nasce uma vez e nunca recalcula.
  useEffect(() => {
    if (!hydrated || greeted.current) return;
    greeted.current = true;
    setMessages([
      {
        id: newId(),
        from: 'arrego',
        bubble: say(greeting(profile?.name ?? '', hashSeed(month))),
      },
    ]);
  }, [hydrated, profile, month]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages, typing]);

  const ask = useCallback(
    /**
     * `build` pode devolver uma promessa porque UMA resposta grava antes de
     * falar (a alocação). Nesse caso os pontinhos ficam no ar até o disco
     * responder, em vez de os 700ms fixos — que é o que um app de mensagem faz
     * e, por acaso, a única forma honesta: a fala precisa do número real.
     * As outras nove continuam síncronas e não sabem que isto existe.
     */
    (id: SaidId, userText: string, build: (seed: number) => Bubble[] | Promise<Bubble[]>) => {
      const count = (askCount.current[id] ?? 0) + 1;
      askCount.current[id] = count;

      // Nada de Math.random (ver `pickLine`): a variedade vem da seed. O mês
      // muda a fala de mês em mês; a contagem muda quando você repete a mesma
      // pergunta, senão ela responderia igualzinho e pareceria travada.
      const seed = hashSeed(month, id, count);

      setMessages((prev) => [...prev, { id: newId(), from: 'voce', bubble: say(userText) }]);
      setTyping(true);

      const timer = setTimeout(() => {
        timers.current.delete(timer);
        void Promise.resolve(build(seed)).then((bubbles) => {
          // Saiu da tela no meio da gravação: o registro está salvo (quem grava
          // é a store, não esta tela), só não tem mais bolha pra receber.
          if (!alive.current) return;
          setMessages((prev) => [
            ...prev,
            ...bubbles.map((bubble): Message => ({ id: newId(), from: 'arrego', bubble })),
          ]);
          setTyping(false);
        });
      }, TYPING_MS);

      timers.current.add(timer);
    },
    [month],
  );

  const handleQuestion = useCallback(
    (question: Question) => {
      // `id` precisa ser um const próprio: o TS só carrega o estreitamento de
      // `'comprar'` para dentro do callback abaixo quando a referência é const.
      // Com `question.id` direto, `answerFor` recebe o union inteiro e não compila.
      const id = question.id;
      if (id === 'comprar') {
        setPriceCents(0);
        setSheetOpen(true);
        return;
      }

      const answer: Answer = { data, snapshot, projections, plan, top, profile, month };

      if (id === 'alocar') {
        // A decisão de abrir a pergunta é tomada AQUI, com o mesmo `answer` que
        // vai montar a bolha: `offersApply` e `answerApplyOffer` leem o mesmo
        // plano, então os chips e a fala não têm como discordar.
        //
        // Trocar os chips já, durante a digitação, é de propósito: eles nascem
        // inativos (`disabled={typing}`) e acendem junto com a pergunta. Deixar
        // as perguntas normais no ar nesse meio-tempo abriria a janela exata em
        // que dá pra fugir da pergunta sem responder.
        if (offersApply(answer)) setAwaitingApply(true);
        ask(id, question.label, (seed) => answerApplyOffer(answer, seed));
        return;
      }

      ask(id, question.label, (seed) => answerFor(id, answer, seed));
    },
    [ask, data, snapshot, projections, plan, top, profile, month],
  );

  /**
   * O sim e o não. O "não" é uma fala e acabou; o "sim" é a única coisa nesta
   * tela que escreve no caderno — e ele só chega aqui porque a pessoa leu a
   * conta e tocou em "Pode anotar".
   */
  const handleReply = useCallback(
    (reply: Reply) => {
      setAwaitingApply(false);

      const answer: Answer = { data, snapshot, projections, plan, top, profile, month };

      if (reply.id === 'alocarNao') {
        ask(reply.id, reply.label, (seed) => [
          say(line(BANKS.applyDeclined, seed, { nome: nameOf(answer) })),
        ]);
        return;
      }

      ask(reply.id, reply.label, (seed) => applyAndAnswer(answer, applyPlan, seed));
    },
    [ask, applyPlan, data, snapshot, projections, plan, top, profile, month],
  );

  const handleBuy = useCallback(() => {
    const price = priceCents;
    setSheetOpen(false);

    const answer: Answer = { data, snapshot, projections, plan, top, profile, month };
    ask('comprar', `Dá pra eu comprar uma coisa de ${formatCents(price)}?`, (seed) =>
      answerBuy(answer, price, seed),
    );
  }, [ask, priceCents, data, snapshot, projections, plan, top, profile, month]);

  return (
    <Screen
      footer={
        <View style={styles.footer}>
          {/* A legenda troca junto com os chips: sem isso a tela pede "pergunta
              pra ela" em cima de dois botões que são resposta, e a pessoa não
              entende que a conversa parou esperando ela. */}
          <AppText variant="caption" tone="muted">
            {awaitingApply ? 'RESPONDE PRA ELA' : 'PERGUNTA PRA ELA'}
          </AppText>
          <ScrollView
            ref={chipsRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsScroll}
            contentContainerStyle={styles.chipsContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Enquanto ela "digita", os chips ficam inativos: sem isso dá pra
                empilhar três perguntas e as respostas chegam embaralhadas.
                `disabled` em vez de anular `onPress` — um Chip sem onPress vira
                View decorativa e some do leitor de tela, e aí a lista inteira de
                perguntas pisca fora de existência a cada resposta. */}
            <View style={[styles.chipsRow, typing && styles.chipsBusy]}>
              {/* Ela perguntou se pode anotar: as perguntas dão lugar ao sim e
                  ao não. Não é birra — é que "aloca" grava registro de dinheiro,
                  e sair pela tangente tocando em outra pergunta deixaria a
                  autorização no ar, meio dada. Ou você responde, ou você diz não;
                  as duas saídas custam um toque. */}
              {awaitingApply
                ? APPLY_REPLIES.map((reply) => (
                    <Chip
                      key={reply.id}
                      label={reply.label}
                      disabled={typing}
                      onPress={() => handleReply(reply)}
                    />
                  ))
                : QUESTIONS.map((question) => (
                    <Chip
                      key={question.id}
                      label={question.label}
                      disabled={typing}
                      onPress={() => handleQuestion(question)}
                    />
                  ))}
            </View>
          </ScrollView>
        </View>
      }
    >
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { borderBottomColor: colors.hairline }]}>
        <Pressable
          onPress={() => {
            if (router.canGoBack()) router.back();
          }}
          hitSlop={HIT_SLOP}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          style={({ pressed }) => [
            styles.back,
            { backgroundColor: colors.surfaceSunken },
            pressed && styles.pressed,
          ]}
        >
          <Icon name="back" tone="secondary" />
        </Pressable>

        <View style={[styles.headerAvatar, { backgroundColor: colors.surfaceSunken }]}>
          <AppText variant="subheading">{ARREGO_EMOJI}</AppText>
        </View>

        <View style={styles.headerText}>
          <AppText variant="subheading" numberOfLines={1}>
            Arrego
          </AppText>
          {/* O "está digitando…" saiu daqui: quem avisa são os pontinhos, lá
              embaixo, onde a resposta vai nascer. Legenda que troca de texto a
              cada pergunta é um piscar no canto que ninguém pediu. */}
          <AppText variant="caption" tone="muted" numberOfLines={1}>
            sincera até doer um pouquinho
          </AppText>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.threadScroll}
        contentContainerStyle={styles.thread}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((message, index) =>
          message.from === 'voce' ? (
            <Card
              key={message.id}
              tone="brand"
              padded={false}
              style={[styles.bubble, styles.bubbleVoce]}
            >
              {/* Card tone="brand" reabre o contexto de tinta, então o texto
                  colapsa em ink.onBrand sozinho. Branco sobre o amarelo dá
                  1.58:1 e some — a regra é estrutural, não confia em lembrança. */}
              <BubbleBody bubble={message.bubble} />
            </Card>
          ) : (
            <View key={message.id} style={styles.rowArrego}>
              <ArregoAvatar hidden={messages[index - 1]?.from === 'arrego'} />
              <Card tone="surface" padded={false} style={[styles.bubble, styles.bubbleArrego]}>
                <BubbleBody bubble={message.bubble} />
              </Card>
            </View>
          ),
        )}

        {typing ? <TypingBubble /> : null}
      </ScrollView>

      <Sheet visible={sheetOpen} onClose={() => setSheetOpen(false)} title="Dá pra eu comprar…">
        <CurrencyField
          label="Quanto custa?"
          cents={priceCents}
          onChangeCents={setPriceCents}
          autoFocus
          hint="Só o valor. Não preciso saber o que é — e nem quero saber."
        />
        <Button
          label="Pode perguntar"
          onPress={handleBuy}
          size="lg"
          full
          disabled={priceCents <= 0}
        />
      </Sheet>
    </Screen>
  );
}

const AVATAR = 32;

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    // O topo já vem do inset da Screen; o `sm` só tira o aperto contra o notch.
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  back: {
    width: AVATAR,
    height: AVATAR,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  headerText: { flexShrink: 1 },

  // ScrollView não é flex por padrão no RN: sem o flex:1 aqui ela cresce com o
  // conteúdo, atropela o rodapé e a conversa deixa de rolar.
  threadScroll: { flex: 1 },
  thread: {
    padding: spacing.lg,
    // Espaço entre bolhas é o que faz uma conversa parecer calma. Colado, o
    // mesmo texto vira um bloco só e a pessoa lê tudo como um sermão.
    gap: spacing.lg,
  },
  rowArrego: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    alignSelf: 'flex-start',
    maxWidth: '92%',
  },
  avatarSlot: { width: AVATAR, height: AVATAR },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  bubble: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  // radius.card (20) vem do Card; o canto de baixo do lado de quem fala encolhe
  // pra bolha "apontar" pra origem — o gesto que todo app de mensagem faz.
  bubbleArrego: {
    flexShrink: 1,
    borderBottomLeftRadius: radius.sm,
  },
  bubbleVoce: {
    alignSelf: 'flex-end',
    maxWidth: '84%',
    borderBottomRightRadius: radius.sm,
  },

  body: { gap: spacing.md },
  speech: { lineHeight: 23 },

  table: { gap: spacing.sm },
  factRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  op: { width: 10, lineHeight: 22 },
  // lineHeight do valor (22) no rótulo (13/18): sem isso a primeira linha dos
  // dois não nasce na mesma altura e a tabela inteira fica desencontrada.
  factLabel: { flex: 1, lineHeight: 22 },
  factValue: { alignItems: 'flex-end' },
  // Algarismo de largura fixa: é uma coluna de números, e coluna de número que
  // não alinha é a diferença entre um extrato e uma lista de compras.
  number: { fontVariant: ['tabular-nums'] },
  hint: { textAlign: 'right' },
  rule: {
    height: StyleSheet.hairlineWidth,
    marginBottom: spacing.sm,
  },

  dots: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xs },
  dot: { width: 7, height: 7, borderRadius: radius.pill },

  footer: { gap: spacing.sm },
  // A margem negativa vai na ScrollView e o padding no conteúdo: assim os chips
  // deslizam por baixo das bordas da tela em vez de pararem num limite
  // invisível a 16px. Margem negativa no contentContainer bagunça a medição do
  // scroll — o par style/contentContainerStyle é o jeito certo.
  chipsScroll: { marginHorizontal: -spacing.lg },
  chipsContent: { paddingHorizontal: spacing.lg },
  chipsRow: { flexDirection: 'row', gap: spacing.sm },
  chipsBusy: { opacity: 0.45 },
  pressed: { opacity: 0.65 },
});
