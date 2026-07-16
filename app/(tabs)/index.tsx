/**
 * Início — o retrato do mês em uma tela.
 *
 * A tela não faz conta: `useSnapshot`, `useTopInsight` e `useProjections` já
 * entregam tudo mastigado pelo motor, memoizado por identidade dos dados. O que
 * mora aqui é composição e hierarquia — e as armadilhas de cor e de largura que
 * essa composição específica cria, comentadas onde acontecem.
 */

import { router, type Href } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { expenseBreakdown } from '@/engine/analysis';
import { fill, firstName, greeting, hashSeed, LINES, pickLine } from '@/engine/persona';
import type { MonthlyPlan } from '@/engine/plan';
import {
  useArrego,
  useFinancialData,
  usePlan,
  useProjections,
  useSnapshot,
  useTopInsight,
} from '@/store/useArrego';
import { HIT_SLOP, MIN_TOUCH, palette, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import type { CategorySlice, Cents, Goal, GoalProjection, InsightSeverity } from '@/types/models';
import { addMonths, formatMonthLong, humanizeMonths, monthKeyFromISO, todayISO } from '@/utils/date';
import { formatCents, formatPercent, ratio } from '@/utils/money';
import {
  AppText,
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  HeroFigure,
  Legend,
  Meter,
  Screen,
  SectionHeader,
  StackedBar,
  StatTile,
  type CardTone,
} from '@/ui';

const ROTA_PERFIL = '/perfil';
const ROTA_CONVERSA = '/conversa';
const ROTA_GRANA = '/(tabs)/grana';
const ROTA_OBJETIVOS = '/(tabs)/objetivos';
const ROTA_PLANO = '/plano';

/** Quantas metas cabem no Início antes de a tela virar lista de metas. */
const METAS_NO_INICIO = 3;

/**
 * O motor entrega `href` como string — ele não conhece o expo-router — e
 * `typedRoutes` espera `Href`. O cast fica preso aqui, num lugar só: as rotas
 * saem da tabela `ROUTES` de insights.ts, nunca de texto digitado por alguém.
 */
function abrir(href: string): void {
  router.push(href as Href);
}

/** O rótulo do Badge: a cor nunca carrega o significado sozinha. */
function rotuloDeSeveridade(severity: InsightSeverity): string {
  switch (severity) {
    case 'critical':
      return 'Urgente';
    case 'serious':
      return 'Importante';
    case 'warning':
      return 'De olho';
    case 'good':
      return 'Boa notícia';
    case 'neutral':
      return 'Recado';
  }
}

function legendaDaMeta(projection: GoalProjection): string {
  const guardado = `${formatCents(projection.savedCents)} de ${formatCents(projection.targetCents)}`;
  if (projection.progress >= 1) return `${guardado} · meta batida`;
  // `monthsAtCurrentPace === null` cobre ritmo zero E negativo (quem sacou da
  // meta). "Sem depósito ainda" mentiria no segundo caso.
  if (projection.monthsAtCurrentPace === null) {
    return `${guardado} · sem previsão no ritmo de hoje`;
  }
  return `${guardado} · ${humanizeMonths(projection.monthsAtCurrentPace)} no ritmo de hoje`;
}

/**
 * O plano em uma frase. Os dois casos-limite não são preciosismo:
 *
 * - GUARDA ZERO acontece com a reserva cheia e nenhuma meta pendente — aí o
 *   motor manda a sobra inteira para o lazer de propósito. "Guarda R$ 0,00"
 *   soaria como falha num plano que está certo, então a frase vira convite.
 * - LAZER ZERO acontece quando a sobra é tão pequena que 20% dela arredonda
 *   para nada. Prometer "gasta R$ 0,00 sem culpa" seria deboche.
 */
function resumoDoPlano(plano: MonthlyPlan): string {
  const guardaCents = plano.reservaCents + plano.objetivosCents;

  if (guardaCents === 0) {
    return `Sem meta pendente, os ${formatCents(plano.lazerCents)} são todos seus. Cria um objetivo e parte disso vira futuro.`;
  }
  if (plano.lazerCents === 0) {
    return `Guarda ${formatCents(guardaCents)}. O que sobra é pequeno demais pra separar lazer sem mentir.`;
  }
  return `Guarda ${formatCents(guardaCents)}, gasta ${formatCents(plano.lazerCents)} sem culpa.`;
}

export default function Inicio() {
  const { colors } = useTheme();

  const month = useArrego((state) => state.month);
  const setMonth = useArrego((state) => state.setMonth);
  const hydrate = useArrego((state) => state.hydrate);
  const profile = useArrego((state) => state.profile);

  const data = useFinancialData();
  const snapshot = useSnapshot();
  const projections = useProjections();
  const insight = useTopInsight();
  const plano = usePlan();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await hydrate();
    } finally {
      // `hydrate` transforma falha em `error` na store e não rejeita — mas o
      // spinner não pode depender disso para parar de girar.
      setRefreshing(false);
    }
  }, [hydrate]);

  const nome = firstName(profile?.name);

  // `greeting` lê o relógio a cada chamada. O memo prende a frase à sessão para
  // ela não trocar de "bom dia" para "boa tarde" embaixo do olho de quem está
  // lendo; a seed do dia mantém a saudação variando de um dia para o outro.
  const saudacao = useMemo(
    () => greeting(profile?.name ?? '', hashSeed(todayISO())),
    [profile?.name],
  );

  const fatias = useMemo(() => expenseBreakdown(data, month), [data, month]);

  // Os três baldes viram fatias de gráfico. Os centavos saem prontos do motor —
  // aqui só se calcula `share`, e contra `freeCents` porque é exatamente isso
  // que os três somam quando o plano é viável: a barra desenha a sobra inteira,
  // não uma fração dela.
  //
  // O balde zerado FICA na lista (a reserva cheia vale R$ 0). A StackedBar não
  // desenha fatia sem área, mas colore pelo índice na lista ORIGINAL — tirar o
  // zero daqui deslocaria a cor de todo mundo depois dele e a Legend passaria a
  // apontar para o segmento errado.
  const baldes = useMemo<CategorySlice[]>(
    () => [
      {
        key: 'reserva',
        label: 'Reserva',
        amountCents: plano.reservaCents,
        share: ratio(plano.reservaCents, plano.freeCents),
      },
      {
        key: 'objetivos',
        label: 'Objetivos',
        amountCents: plano.objetivosCents,
        share: ratio(plano.objetivosCents, plano.freeCents),
      },
      {
        key: 'lazer',
        label: 'Lazer',
        amountCents: plano.lazerCents,
        share: ratio(plano.lazerCents, plano.freeCents),
      },
    ],
    [plano],
  );

  // Não existe seletor para isto: `goalSavedCents` é acumulado de todos os
  // tempos e o snapshot não fala de depósito. Filtrar um mês e somar não é
  // conta do motor — é leitura.
  const guardadoNoMesCents: Cents = useMemo(
    () =>
      data.deposits
        .filter((deposit) => monthKeyFromISO(deposit.depositedOn) === month)
        .reduce((total, deposit) => total + deposit.amountCents, 0),
    [data.deposits, month],
  );

  // `projectAllGoals` mapeia `data.goals` 1 para 1, e a store entrega essa lista
  // na ordem do repositório: batidas por último, depois prioridade. Reordenar
  // aqui criaria uma segunda fonte de verdade para a mesma regra.
  const metasEmDestaque = useMemo(() => {
    const porId = new Map(data.goals.map((goal): [string, Goal] => [goal.id, goal]));
    return projections
      .flatMap((projection) => {
        const goal = porId.get(projection.goalId);
        // Projeção órfã não tem rótulo — sem rótulo não há o que mostrar.
        return goal ? [{ goal, projection }] : [];
      })
      .slice(0, METAS_NO_INICIO);
  }, [data.goals, projections]);

  // Espelha o `nothingRegistered` de insights.ts: a fala da Arrego e o layout da
  // tela têm que concordar sobre o que é "não há nada aqui".
  const nadaCadastrado =
    data.incomes.length === 0 &&
    data.expenses.length === 0 &&
    data.subscriptions.length === 0 &&
    data.cards.length === 0 &&
    data.purchases.length === 0 &&
    data.goals.length === 0;

  const puxarParaAtualizar = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={colors.ink.muted}
      colors={[colors.ink.muted]}
      progressBackgroundColor={colors.surface}
    />
  );

  if (nadaCadastrado) {
    return (
      <Screen>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.content, styles.contentCentered]}
          showsVerticalScrollIndicator={false}
          refreshControl={puxarParaAtualizar}
        >
          <EmptyState
            emoji="👋"
            // Com nada cadastrado, `generateInsights` curto-circuita e devolve
            // exatamente a fala de LINES.emptyState. Ler o insight em vez de
            // sortear de novo evita duas frases diferentes do mesmo banco na
            // mesma tela; o fallback existe só porque o seletor é nulável.
            title={insight?.title ?? 'Tudo vazio por aqui'}
            body={
              insight?.body ??
              fill(pickLine(LINES.emptyState, hashSeed(month, 'emptyState')), { nome })
            }
            actionLabel="Cadastrar minha grana"
            onAction={() => abrir(ROTA_GRANA)}
          />
        </ScrollView>
      </Screen>
    );
  }

  const rendaCents = snapshot.incomeTotalCents;
  const sobraCents = snapshot.freeCents;

  const tituloDaSobra = sobraCents >= 0 ? 'Sobra deste mês' : 'Você estourou o mês';
  // Sem renda no mês, `freeCents` é só `-comprometido`: chamar isso de estouro
  // seria o alarme falso que insights.ts se recusa a dar. O rótulo segue o sinal
  // do número (é o que a pessoa vê), e a legenda diz o que o número de fato é.
  const legendaDaSobra =
    rendaCents <= 0
      ? 'Sem renda cadastrada, isso aqui é só a soma das suas contas.'
      : sobraCents >= 0
        ? `${formatPercent(snapshot.savingsRate)} de tudo que entrou neste mês`
        : 'É quanto falta para as contas deste mês fecharem.';

  const acaoDoInsight = insight?.action ?? null;
  const tomDoCard: CardTone = insight?.severity === 'good' ? 'brand' : 'surface';
  const critico = insight?.severity === 'critical';

  // O card de marca é amarelo nos dois temas, então a régua também tem que ser
  // fixa: `colors.border` viraria branco a 10% sobre o amarelo no tema escuro e
  // sumiria.
  const reguaDaEvidencia = tomDoCard === 'brand' ? palette.light.border : colors.border;

  return (
    <Screen>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={puxarParaAtualizar}
      >
        <View style={styles.header}>
          <AppText variant="body" tone="secondary" style={styles.greeting}>
            {saudacao}
          </AppText>
          <Pressable
            onPress={() => abrir(ROTA_PERFIL)}
            hitSlop={HIT_SLOP}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Abrir meu perfil"
            style={({ pressed }) => (pressed ? styles.pressed : null)}
          >
            <Avatar
              name={nome}
              photoUri={profile?.photoUri}
              emoji={profile?.avatarEmoji}
              size={44}
            />
          </Pressable>
        </View>

        <View style={styles.monthRow}>
          <Pressable
            onPress={() => setMonth(addMonths(month, -1))}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Mês anterior"
            style={({ pressed }) => [styles.monthArrow, pressed && styles.pressed]}
          >
            <AppText variant="heading" tone="secondary">
              ‹
            </AppText>
          </Pressable>

          <AppText variant="subheading" numberOfLines={1} style={styles.monthLabel}>
            {formatMonthLong(month)}
          </AppText>

          <Pressable
            onPress={() => setMonth(addMonths(month, 1))}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Próximo mês"
            style={({ pressed }) => [styles.monthArrow, pressed && styles.pressed]}
          >
            <AppText variant="heading" tone="secondary">
              ›
            </AppText>
          </Pressable>
        </View>

        <HeroFigure cents={sobraCents} label={tituloDaSobra} caption={legendaDaSobra} />

        {insight ? (
          <View style={styles.insightBlock}>
            <Card
              tone={tomDoCard}
              // Crítico ganha borda, nunca preenchimento: fundo vermelho numa
              // tela de finanças de jovem é pânico, não informação.
              style={
                critico ? [styles.criticalEdge, { borderColor: colors.status.critical }] : undefined
              }
            >
              <View style={styles.insightContent}>
                <Badge label={rotuloDeSeveridade(insight.severity)} severity={insight.severity} />

                <AppText variant="subheading">{insight.title}</AppText>
                <AppText variant="body">{insight.body}</AppText>

                {insight.evidence ? (
                  <View style={[styles.evidence, { borderTopColor: reguaDaEvidencia }]}>
                    <AppText variant="caption">{insight.evidence}</AppText>
                  </View>
                ) : null}

                {acaoDoInsight ? (
                  <Button
                    label={acaoDoInsight.label}
                    onPress={() => abrir(acaoDoInsight.href)}
                    // Botão de marca dentro de card de marca some (amarelo no
                    // amarelo), e `ghost` seria pior: ele pinta o texto com
                    // `ink.primary`, que no tema escuro é branco — 1.58:1 sobre
                    // o amarelo. `secondary` desenha superfície própria e é o
                    // único que sobrevive aos dois temas em cima da marca.
                    variant={tomDoCard === 'brand' ? 'secondary' : 'primary'}
                    full
                  />
                ) : null}
              </View>
            </Card>

            {/* Fora do card pelo mesmo motivo: no plano, `ghost` é seguro nos dois temas. */}
            <Button
              label="Falar com a Arrego"
              icon="💬"
              onPress={() => abrir(ROTA_CONVERSA)}
              variant="ghost"
              full
            />
          </View>
        ) : null}

        {/*
          Vem logo depois da fala da Arrego de propósito: a pessoa acabou de ler
          quanto sobra e a próxima pergunta na cabeça dela é "e agora, o que eu
          faço?". Fica ANTES da KPI row porque KPI é retrospecto ("entrou",
          "comprometido") e o plano é o que fazer a seguir.

          Tom `surface`, não `brand`: o amarelo já é do card da Arrego quando a
          notícia é boa, e dois amarelos empilhados não teriam hierarquia nenhuma.
        */}
        <Card>
          <View style={styles.planoContent}>
            <AppText variant="subheading">O plano deste mês</AppText>

            {plano.viable ? (
              <>
                <View style={styles.chart}>
                  <StackedBar slices={baldes} height={10} />
                  {/* Obrigatória: sem ela os baldes viram três cores sem nome. */}
                  <Legend slices={baldes} />
                </View>

                <AppText variant="body">{resumoDoPlano(plano)}</AppText>

                {/*
                  `ghost` e não `primary`: o amarelo desta tela é do botão da
                  Arrego, logo acima. Dois botões de marca a 100px um do outro
                  competem e nenhum vira "a próxima coisa a fazer".
                */}
                <Button
                  label="Ver o plano completo"
                  onPress={() => abrir(ROTA_PLANO)}
                  variant="ghost"
                  full
                />
              </>
            ) : (
              <>
                {/*
                  Sem sobra não existem baldes, e desenhar três zeros seria fingir
                  um plano. A nota do motor já distingue os dois motivos (nada
                  cadastrado x gasto maior que a renda) — repetir a regra aqui
                  criaria uma segunda fonte de verdade para a mesma frase.
                */}
                <AppText variant="body">
                  {plano.notes[0] ?? 'Ainda não dá pra dividir o que não sobrou.'}
                </AppText>

                <Button
                  label="Entender por que"
                  onPress={() => abrir(ROTA_PLANO)}
                  variant="ghost"
                  full
                />
              </>
            )}
          </View>
        </Card>

        {/*
          Três lado a lado não cabem: "R$ 2.000,00" no tamanho `heading` mede uns
          106px e um terço da tela deixa ~90px de conteúdo — o número quebraria no
          meio ("2.000,0" / "0"). Com base de 150px o grid embrulha sozinho (2 + 1
          no celular, 3 no tablet) e todo número continua inteiro.
        */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiCell}>
            <StatTile label="Entrou" cents={rendaCents} icon="📥" tone="neutral" />
          </View>
          <View style={styles.kpiCell}>
            <StatTile
              label="Comprometido"
              cents={snapshot.committedCents}
              icon="🔒"
              tone="neutral"
              hint={
                rendaCents > 0
                  ? `${formatPercent(ratio(snapshot.committedCents, rendaCents))} da renda`
                  : undefined
              }
            />
          </View>
          <View style={styles.kpiCell}>
            {/*
              Neutro de propósito nos três: a cor de dinheiro é do herói, que já
              diz se o mês fecha. E saque de meta ("Guardado" negativo) em
              vermelho seria punir quem foi honesto ao registrar.
            */}
            <StatTile label="Guardado no mês" cents={guardadoNoMesCents} icon="🏦" tone="neutral" />
          </View>
        </View>

        <View>
          <SectionHeader
            title="Pra onde vai seu dinheiro"
            actionLabel="Ver gastos"
            onAction={() => abrir(ROTA_GRANA)}
          />
          {fatias.length > 0 ? (
            <Card>
              <View style={styles.chart}>
                <StackedBar slices={fatias} />
                {/* A Legend é obrigatória: identidade de fatia nunca é só a cor. */}
                <Legend slices={fatias} />
              </View>
            </Card>
          ) : (
            <EmptyState
              emoji="🧾"
              title="Nenhum gasto neste mês"
              body="Ou você não gastou nada, ou não me contou. Uma das duas eu consigo resolver."
              actionLabel="Cadastrar um gasto"
              onAction={() => abrir(ROTA_GRANA)}
            />
          )}
        </View>

        <View>
          <SectionHeader
            title="Suas metas"
            actionLabel="Ver todas"
            onAction={() => abrir(ROTA_OBJETIVOS)}
          />
          {metasEmDestaque.length > 0 ? (
            <Card>
              <View style={styles.goals}>
                {metasEmDestaque.map(({ goal, projection }) => (
                  <Pressable
                    key={goal.id}
                    onPress={() => abrir(ROTA_OBJETIVOS)}
                    accessible
                    accessibilityRole="button"
                    // O leitor de tela agrupa o Pressable e engole o progressbar
                    // do Meter, então o número tem que estar aqui.
                    accessibilityLabel={
                      `${goal.label}: ${formatCents(projection.savedCents)} ` +
                      `de ${formatCents(projection.targetCents)}. Toque para ver seus objetivos.`
                    }
                    style={({ pressed }) => (pressed ? styles.pressed : null)}
                  >
                    <Meter
                      progress={projection.progress}
                      label={`${goal.emoji} ${goal.label}`}
                      caption={legendaDaMeta(projection)}
                      // Meta atrasada não é `critical`: o próprio motor classifica
                      // isso como 'warning'. Vermelho aqui gritaria mais alto que
                      // a Arrego, e por um motivo menor.
                      tone={projection.progress >= 1 ? 'good' : 'brand'}
                    />
                  </Pressable>
                ))}
              </View>
            </Card>
          ) : (
            <EmptyState
              emoji="🎯"
              title="Nenhuma meta ainda"
              body="Um alvo com nome é o que separa guardar dinheiro de ver o dinheiro sumir. Cria o primeiro — pode ser barato."
              actionLabel="Criar um objetivo"
              onAction={() => abrir(ROTA_OBJETIVOS)}
            />
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    padding: spacing.lg,
    // Folga para a tab bar e o gesto do iOS não comerem a última linha.
    paddingBottom: spacing.xxxl * 2,
    gap: spacing.xl,
  },
  contentCentered: { flexGrow: 1, justifyContent: 'center' },

  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  // A saudação é longa e quebra em várias linhas: sem `flex`, ela empurraria o
  // avatar para fora da tela em vez de embrulhar.
  greeting: { flex: 1 },
  pressed: { opacity: 0.65 },

  monthRow: { flexDirection: 'row', alignItems: 'center' },
  monthArrow: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: { flex: 1, textAlign: 'center' },

  insightBlock: { gap: spacing.md },
  insightContent: { gap: spacing.md },
  planoContent: { gap: spacing.md },
  criticalEdge: { borderWidth: 2 },
  evidence: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.sm },

  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  kpiCell: { flexGrow: 1, flexBasis: 150 },

  chart: { gap: spacing.md },
  goals: { gap: spacing.lg },
});
