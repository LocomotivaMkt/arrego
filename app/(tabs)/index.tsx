/**
 * Início — o retrato do mês em uma tela.
 *
 * A tela não faz conta: `useSnapshot`, `useTopInsight`, `usePlan` e
 * `useProjections` já entregam tudo mastigado pelo motor, memoizado por
 * identidade dos dados. O que mora aqui é composição e hierarquia.
 *
 * O QUE MUDOU, E POR QUÊ. Esta tela levou o veredito "parece um golpe" com
 * ~2.100 caracteres de texto corrido. Nada de informação saiu — o volume saiu:
 *
 *   - A saudação de três linhas virou "Oi, {nome}".
 *   - O card da Arrego (badge + título + corpo + evidência + botão) virou UMA
 *     linha de lista com o título; o corpo, a evidência e a ação foram para
 *     dentro de um `Reveal`, fechados por padrão.
 *   - A KPI row (entrou / comprometido / guardado) foi para trás de
 *     "Ver a conta" — é a aritmética do número-herói, não o assunto da tela.
 *   - Os parágrafos do plano foram para /plano, que é a casa deles.
 *
 * Um app sério mostra o número e cala a boca. Quem se explica em três
 * parágrafos é quem está vendendo alguma coisa.
 */

import { router, type Href } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { expenseBreakdown } from '@/engine/analysis';
import { firstName, hashSeed, shortLine } from '@/engine/persona';
import { reviewReady } from '@/engine/retrospect';
import {
  useArrego,
  useFinancialData,
  usePlan,
  useProjections,
  useSnapshot,
  useTopInsight,
} from '@/store/useArrego';
import { HIT_SLOP, MIN_TOUCH, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import type { CategorySlice, Cents, Goal, GoalProjection } from '@/types/models';
import { addMonths, formatMonthLong, monthKeyFromISO } from '@/utils/date';
import { formatCents, formatPercent, ratio } from '@/utils/money';
import {
  AppText,
  Avatar,
  Button,
  Card,
  HeroFigure,
  Icon,
  Legend,
  ListRow,
  Meter,
  MoneyText,
  Reveal,
  Screen,
  SectionHeader,
  StackedBar,
  type ButtonVariant,
  type IconName,
} from '@/ui';
import { GoalIcon } from '@/ui/GoalIcon';

const ROTA_PERFIL = '/perfil';
const ROTA_CONVERSA = '/(tabs)/conversa';
const ROTA_GRANA = '/(tabs)/grana';
const ROTA_OBJETIVOS = '/(tabs)/objetivos';
const ROTA_APRENDER = '/(tabs)/aprender';
const ROTA_PLANO = '/plano';
const ROTA_RETRO = '/retrospectiva';

/** Quantas metas cabem no Início antes de a tela virar lista de metas. */
const METAS_NO_INICIO = 3;

/** Quantas categorias de gasto ganham nome próprio aqui. O resto vira "Outros". */
const CATEGORIAS_NO_INICIO = 4;

/**
 * A barra dos três baldes é um FIO, não um gráfico: ela existe pra dar o
 * formato do mês num relance. Quem quiser o número lê a linha embaixo dela.
 */
const BARRA_FINA = 6;

/** Espelha o vão fixo do `leading` do ListRow — a coluna de ícones alinha. */
const LEADING_SIZE = 40;
/** Espelha a altura mínima do ListRow: linha de banco respira. */
const ROW_MIN_HEIGHT = 60;

/**
 * O motor entrega `href` como string — ele não conhece o expo-router — e
 * `typedRoutes` espera `Href`. O cast fica preso aqui, num lugar só: as rotas
 * saem da tabela `ROUTES` de insights.ts, nunca de texto digitado por alguém.
 */
function abrir(href: string): void {
  router.push(href as Href);
}

/** Um balde do plano já com o papel do ícone resolvido no tipo. */
type Balde = CategorySlice & { icon: IconName };

/**
 * Estado vazio: ícone de LINHA em cinza, título curto, uma frase, um botão.
 *
 * O emoji gigante saiu junto com o parágrafo de 180 caracteres. Emoji de
 * enfeite é ilustração que cada sistema desenha do seu jeito e ignora a cor do
 * tema — e foi metade da razão de a tela parecer amadora.
 */
function Vazio({
  icon,
  title,
  line,
  actionLabel,
  onAction,
  variant = 'ghost',
}: {
  icon: IconName;
  title: string;
  line: string;
  actionLabel: string;
  onAction: () => void;
  /**
   * `ghost` por padrão: o amarelo desta tela já é do card da sobra, e um botão
   * de marca aqui embaixo seria o segundo amarelo. Só o vazio de tela inteira
   * — onde não existe card nenhum — promove o botão a `primary`.
   */
  variant?: ButtonVariant;
}) {
  return (
    <View style={styles.vazio}>
      <Icon name={icon} size={32} tone="muted" />
      <AppText variant="subheading" style={styles.centrado}>
        {title}
      </AppText>
      <AppText variant="small" tone="muted" numberOfLines={2} style={styles.centrado}>
        {line}
      </AppText>
      <View style={styles.vazioAcao}>
        <Button label={actionLabel} onPress={onAction} variant={variant} />
      </View>
    </View>
  );
}

/**
 * A linha de uma meta. Não é `ListRow` porque o `subtitle` dele é string e aqui
 * o lugar da legenda é ocupado pelo medidor — a barra diz "quanto falta" mais
 * rápido do que qualquer frase diria. A geometria é a mesma do ListRow de
 * propósito: as duas listas da tela têm que alinhar na mesma coluna.
 *
 * O emoji FICA: quem escolheu foi a pessoa, então ele é conteúdo, não enfeite.
 */
function LinhaDaMeta({
  goal,
  projection,
  onPress,
}: {
  goal: Goal;
  projection: GoalProjection;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessible
      accessibilityRole="button"
      // O leitor de tela agrupa o Pressable e engole o progressbar do Meter,
      // então o número inteiro tem que estar aqui.
      accessibilityLabel={
        `${goal.label}: ${formatCents(projection.savedCents)} ` +
        `de ${formatCents(projection.targetCents)}. Toque para ver seus objetivos.`
      }
      style={({ pressed }) => [styles.metaRow, pressed && styles.pressed]}
    >
      <View style={styles.metaLeading}>
        <GoalIcon value={goal.emoji} size={22} />
      </View>

      <View style={styles.metaBody}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {goal.label}
        </AppText>
        {/*
          Sem `label` e sem `caption`: o Meter aqui é só o trilho. Meta atrasada
          não é `critical` — o próprio motor classifica isso como 'warning', e
          vermelho gritaria mais alto que a Arrego por um motivo menor.
        */}
        <Meter progress={projection.progress} tone={projection.progress >= 1 ? 'good' : 'brand'} />
      </View>

      <MoneyText cents={projection.savedCents} variant="small" tone="neutral" tabular />
      <Icon name="next" tone="muted" />
    </Pressable>
  );
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

  const fatias = useMemo(() => expenseBreakdown(data, month), [data, month]);

  /**
   * Só as maiores ganham nome; o resto vira "Outros" — a convenção dos tokens
   * ("uma 9ª categoria vira Outros, jamais uma cor nova").
   *
   * O balde não é preciosismo: sem ele a barra desenha só uma parte de si e o
   * vão que sobra lê como dinheiro não gasto. E o corte só acontece quando há
   * pelo menos DUAS categorias pra agrupar — colapsar uma só apagaria o nome
   * dela pra não mostrar nada em troca.
   */
  const fatiasVisiveis = useMemo<CategorySlice[]>(() => {
    if (fatias.length <= CATEGORIAS_NO_INICIO + 1) return fatias;
    const resto = fatias.slice(CATEGORIAS_NO_INICIO);
    return [
      ...fatias.slice(0, CATEGORIAS_NO_INICIO),
      {
        key: 'outros',
        label: 'Outros',
        amountCents: resto.reduce((total, fatia) => total + fatia.amountCents, 0),
        share: resto.reduce((total, fatia) => total + fatia.share, 0),
      },
    ];
  }, [fatias]);

  // Os três baldes viram fatias de gráfico. Os centavos saem prontos do motor —
  // aqui só se calcula `share`, e contra `freeCents` porque é exatamente isso
  // que os três somam quando o plano é viável: a barra desenha a sobra inteira,
  // não uma fração dela.
  //
  // O balde zerado FICA na lista (a reserva cheia vale R$ 0). A StackedBar não
  // desenha fatia sem área, mas colore pelo índice na lista ORIGINAL — tirar o
  // zero daqui deslocaria a cor de todo mundo depois dele.
  const baldes = useMemo<Balde[]>(
    () => [
      {
        key: 'reserva',
        label: 'Reserva',
        icon: 'shield',
        amountCents: plano.reservaCents,
        share: ratio(plano.reservaCents, plano.freeCents),
      },
      {
        key: 'objetivos',
        label: 'Objetivos',
        icon: 'target',
        amountCents: plano.objetivosCents,
        share: ratio(plano.objetivosCents, plano.freeCents),
      },
      {
        key: 'lazer',
        label: 'Lazer',
        icon: 'money',
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
          <Vazio
            icon="money"
            // Com nada cadastrado, `generateInsights` curto-circuita e devolve a
            // fala de `emptyState`. Ler o título do insight em vez de escrever
            // outro evita duas versões da mesma frase; o fallback existe só
            // porque o seletor é nulável.
            title={insight?.title ?? 'Tudo vazio por aqui'}
            // A fala CURTA, não `insight.body`: o corpo vem de `LINES`, que é a
            // boca inteira da Arrego e mora em /conversa.
            line={shortLine('emptyState', hashSeed(month), { nome })}
            actionLabel="Cadastrar minha grana"
            onAction={() => abrir(ROTA_GRANA)}
            // Único amarelo possível aqui: não existe card de destaque nesta
            // tela, então a precedência cai no botão da ação principal.
            variant="primary"
          />
        </ScrollView>
      </Screen>
    );
  }

  const rendaCents = snapshot.incomeTotalCents;
  const temRenda = rendaCents > 0;

  // Sem renda no mês, `freeCents` é só `-comprometido`: chamar isso de estouro
  // seria o alarme falso que insights.ts se recusa a dar. Por isso o card sem
  // renda não mostra número nenhum — mostra o convite.
  const tituloDaSobra = plano.freeCents >= 0 ? 'Sobra deste mês' : 'Você estourou o mês';

  /**
   * O tempero, não o prato: UMA linha, no orçamento de 90 caracteres.
   *
   * O estado vem de `plano.viable`, um campo do motor — nada de reproduzir aqui
   * o limiar de "mês apertado" que vive em insights.ts. Duas cópias da mesma
   * régua divergem no primeiro ajuste, e aí esta linha e a dica logo abaixo
   * passam a discordar sobre o mesmo mês na mesma tela.
   */
  const falaDoMes = !temRenda
    ? shortLine('noIncome', hashSeed(month), { nome })
    : !plano.viable
      ? shortLine('planImpossible', hashSeed(month), {
          nome,
          // Mesma convenção de `negativeFlow`: {valor} é o tamanho do buraco.
          valor: formatCents(Math.abs(plano.freeCents)),
        })
      : shortLine('planReady', hashSeed(month), {
          nome,
          reserva: formatCents(plano.reservaCents),
          objetivos: formatCents(plano.objetivosCents),
          lazer: formatCents(plano.lazerCents),
        });

  const acaoDoInsight = insight?.action ?? null;

  return (
    <Screen>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={puxarParaAtualizar}
      >
        <View style={styles.header}>
          <AppText variant="heading" numberOfLines={1} style={styles.saudacao}>
            Oi, {nome}
          </AppText>
          <Pressable
            onPress={() => abrir(ROTA_PERFIL)}
            hitSlop={HIT_SLOP}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Abrir meu perfil"
            style={({ pressed }) => (pressed ? styles.pressed : null)}
          >
            <Avatar name={nome} photoUri={profile?.photoUri} emoji={profile?.avatarEmoji} size={40} />
          </Pressable>
        </View>

        {/* Sem card e sem borda: o mês é uma legenda, não um controle de formulário. */}
        <View style={styles.monthRow}>
          <Pressable
            onPress={() => setMonth(addMonths(month, -1))}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Mês anterior"
            style={({ pressed }) => [styles.monthArrow, pressed && styles.pressed]}
          >
            <Icon name="back" size={18} tone="muted" />
          </Pressable>

          <AppText variant="small" tone="muted" numberOfLines={1}>
            {formatMonthLong(month)}
          </AppText>

          <Pressable
            onPress={() => setMonth(addMonths(month, 1))}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Próximo mês"
            style={({ pressed }) => [styles.monthArrow, pressed && styles.pressed]}
          >
            <Icon name="next" size={18} tone="muted" />
          </Pressable>
        </View>

        {/*
          O ÚNICO amarelo da tela. Ele aponta pro assunto: quanto sobra. Qualquer
          outro amarelo aqui (botão, chip, segundo card) faria os dois deixarem
          de apontar pra coisa nenhuma.

          Dentro de uma superfície de marca o `tone` do texto colapsa em
          `onBrand` por contrato do kit — inclusive o do número. É por isso que o
          herói não fica vermelho no mês estourado: quem carrega essa informação
          é o rótulo ("Você estourou o mês") e o sinal do número, não a cor, que
          sobre o amarelo daria 1.58:1.
        */}
        <Card tone="brand" style={styles.cardHeroi}>
          {temRenda ? (
            <HeroFigure cents={plano.freeCents} label={tituloDaSobra} caption={falaDoMes} />
          ) : (
            <View style={styles.convite}>
              <AppText variant="caption">Sem renda cadastrada</AppText>
              <AppText variant="body">{falaDoMes}</AppText>
              {/*
                `secondary` é o único que sobrevive em cima da marca: `primary`
                seria amarelo no amarelo e `ghost` pinta o texto com
                `ink.primary`, que no tema escuro é branco.
              */}
              <Button
                label="Cadastrar minha renda"
                onPress={() => abrir(ROTA_GRANA)}
                variant="secondary"
              />
            </View>
          )}
        </Card>

        {/*
          A retrospectiva só aparece quando o mês fechou (últimos dias em diante).
          Antes disso ela daria veredito sobre um mês que ainda está acontecendo,
          então some. A seta é do próprio ListRow.
        */}
        {reviewReady(month) ? (
          <ListRow
            leading={<Icon name="calendar" />}
            title="Como foi seu mês"
            onPress={() => abrir(ROTA_RETRO)}
            accessibilityLabel="Como foi seu mês. Toque para ver a retrospectiva."
          />
        ) : null}

        {/*
          Atalho para anotar um gasto na hora (o pão na padaria do enunciado).
          Leva direto à aba "Saiu" da Grana via `?aba=saiu`, cortando os dois
          toques de navegação que faziam "anotar um gasto" custar cinco toques
          da abertura fria. É o caminho que a pessoa mais repete no app.
        */}
        <ListRow
          leading={<Icon name="minus" />}
          title="Anotar um gasto"
          subtitle="Um lanche, o pão, a corrida de app"
          onPress={() => abrir(`${ROTA_GRANA}?aba=saiu`)}
          accessibilityLabel="Anotar um gasto agora. Abre a aba Saiu."
        />

        {/*
          A antiga KPI row. Estes três números são a aritmética do herói, não o
          assunto da tela — abertos por padrão, eles competiam com o número que a
          pessoa abriu o app pra ver. Nada some: fica a um toque.
        */}
        <Reveal label="Ver a conta">
          <ListRow
            leading={<Icon name="trendUp" />}
            title="Entrou"
            trailing={<MoneyText cents={rendaCents} tone="neutral" tabular />}
          />
          {/*
            O percentual da renda é o que dá TAMANHO ao número: "R$ 1.480" não
            diz nada sozinho; "59% da renda" diz tudo. Condicionado a ter renda
            porque sem divisor a conta seria 0% para qualquer valor — pior que
            omitir.
          */}
          <ListRow
            leading={<Icon name="lock" />}
            title="Contas do mês"
            subtitle={
              rendaCents > 0
                ? `${formatPercent(ratio(snapshot.committedCents, rendaCents))} da renda`
                : undefined
            }
            trailing={<MoneyText cents={snapshot.committedCents} tone="neutral" tabular />}
          />
          {/*
            Neutro de propósito: saque de meta ("Guardado" negativo) em vermelho
            seria punir quem foi honesto ao registrar.
          */}
          <ListRow
            leading={<Icon name="shield" />}
            title="Guardado no mês"
            trailing={<MoneyText cents={guardadoNoMesCents} tone="neutral" tabular />}
          />
        </Reveal>

        {plano.viable ? (
          <View style={styles.bloco}>
            {/*
              As três linhas abaixo SÃO a legenda desta barra, na mesma ordem das
              fatias: rótulo e valor, nunca a cor sozinha. Repetir a informação
              num `Legend` em cima delas seria escrever os mesmos três números
              duas vezes — exatamente o ruído que esta tela veio cortar.

              O "por quê" do plano não mora aqui: mora em /plano, a um toque.
            */}
            <StackedBar slices={baldes} height={BARRA_FINA} />

            {baldes.map((balde) => (
              <ListRow
                key={balde.key}
                leading={<Icon name={balde.icon} />}
                title={balde.label}
                trailing={<MoneyText cents={balde.amountCents} tone="neutral" tabular />}
                onPress={() => abrir(ROTA_PLANO)}
                accessibilityLabel={`${balde.label}: ${formatCents(balde.amountCents)}. Toque para ver o plano do mês.`}
              />
            ))}
          </View>
        ) : (
          /*
            Sem sobra não existem baldes, e desenhar três zeros seria fingir um
            plano. O motivo (a nota do motor) é parágrafo — e parágrafo é da tela
            do plano, não desta.
          */
          <ListRow
            leading={<Icon name="plan" />}
            title="O plano deste mês"
            subtitle="Ainda não sobra nada pra dividir"
            onPress={() => abrir(ROTA_PLANO)}
          />
        )}

        <View>
          <SectionHeader
            title="Pra onde vai"
            actionLabel="Ver tudo"
            onAction={() => abrir(ROTA_GRANA)}
            // O respiro entre blocos é do container. Sem isto, some com o gap.
            first
          />
          {fatiasVisiveis.length > 0 ? (
            <View style={styles.grafico}>
              <StackedBar slices={fatiasVisiveis} />
              {/* Obrigatória: identidade de fatia nunca é só a cor. */}
              <Legend slices={fatiasVisiveis} />
              {/*
                O corte em 4 é da BARRA, não do dado: o balde "Outros" torna o
                desenho legível, mas quem tem 7 categorias tem direito de saber
                quais são as 3 que sumiram dentro dele. Esconder atrás de um
                toque é o contrato; apagar não é.
              */}
              {fatias.length > fatiasVisiveis.length ? (
                <Reveal label="Ver todas as categorias">
                  <Legend slices={fatias} />
                </Reveal>
              ) : null}
            </View>
          ) : (
            <Vazio
              icon="money"
              title="Nenhum gasto neste mês"
              line="Ou você não gastou nada, ou não me contou."
              actionLabel="Cadastrar um gasto"
              onAction={() => abrir(ROTA_GRANA)}
            />
          )}
        </View>

        <View>
          <SectionHeader
            title="Metas"
            actionLabel="Ver todas"
            onAction={() => abrir(ROTA_OBJETIVOS)}
            first
          />
          {metasEmDestaque.length > 0 ? (
            <View>
              {metasEmDestaque.map(({ goal, projection }) => (
                <LinhaDaMeta
                  key={goal.id}
                  goal={goal}
                  projection={projection}
                  onPress={() => abrir(ROTA_OBJETIVOS)}
                />
              ))}
            </View>
          ) : (
            <Vazio
              icon="target"
              title="Nenhuma meta ainda"
              line={shortLine('noGoals', hashSeed(month), { nome })}
              actionLabel="Criar um objetivo"
              onAction={() => abrir(ROTA_OBJETIVOS)}
            />
          )}
        </View>

        {insight ? (
          <View>
            {/*
              O card da Arrego virou uma linha. O badge de severidade saiu junto:
              o título já diz o que aconteceu ("Seu mês fecha no vermelho"), e um
              selo vermelho em cima disso é urgência decorativa.
            */}
            <ListRow
              leading={<Icon name="chat" />}
              title={insight.title}
              onPress={() => abrir(ROTA_CONVERSA)}
              accessibilityLabel={`${insight.title}. Toque para falar com a Arrego.`}
            />

            {/*
              O parágrafo da Arrego não foi deletado — foi fechado. É o mecanismo
              do orçamento de texto: quem quer o número vê o número, quem quer a
              explicação pede a explicação. A ação vem junto, porque ela é a saída
              prática da fala e some se ficar sem casa.
            */}
            <Reveal label="Por quê?">
              <AppText variant="body" tone="secondary">
                {insight.body}
              </AppText>
              {insight.evidence ? (
                <AppText variant="caption" tone="muted">
                  {insight.evidence}
                </AppText>
              ) : null}
              {acaoDoInsight ? (
                <Button
                  label={acaoDoInsight.label}
                  onPress={() => abrir(acaoDoInsight.href)}
                  variant="ghost"
                />
              ) : null}
            </Reveal>
          </View>
        ) : null}

        {/*
          Aprender saiu da barra de abas, mas não fica órfão: esta linha é uma
          das duas portas pra ele (a outra é a conta). Discreta de propósito —
          é material de referência, não o assunto da tela.
        */}
        <ListRow
          leading={<Icon name="learn" />}
          title="Aprender sobre dinheiro"
          onPress={() => abrir(ROTA_APRENDER)}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.lg,
    // Folga para a tab bar e o gesto do iOS não comerem a última linha.
    paddingBottom: spacing.xxxl * 2,
    // O que separa dois assuntos é o espaço. Borda divide; espaço organiza.
    gap: spacing.section,
  },
  contentCentered: { flexGrow: 1, justifyContent: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  saudacao: { flexShrink: 1 },
  pressed: { opacity: 0.65 },

  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  monthArrow: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Respiro maior que o do card padrão: é o número principal da tela.
  cardHeroi: { padding: spacing.xl },
  convite: { gap: spacing.md, alignItems: 'flex-start' },

  bloco: { gap: spacing.md },
  grafico: { gap: spacing.md },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: ROW_MIN_HEIGHT,
    paddingVertical: spacing.sm,
  },
  metaLeading: { width: LEADING_SIZE, alignItems: 'center', justifyContent: 'center' },
  metaBody: { flex: 1, gap: spacing.xs },

  vazio: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  vazioAcao: { marginTop: spacing.sm },
  centrado: { textAlign: 'center' },
});
