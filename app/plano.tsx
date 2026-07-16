/**
 * O PLANO DO MÊS — a resposta para "o que eu faço com meu dinheiro?".
 *
 * Esta tela NÃO faz conta. Todo número vem de `usePlan()`, que já dividiu a
 * sobra em três baldes, ordenou as metas e escreveu o porquê de cada posição.
 * O que mora aqui é composição, hierarquia e a voz da Arrego vestindo o que o
 * motor apurou.
 *
 * As duas decisões que essa composição específica exige:
 *
 * A CONTA PRECISA SER CONFERÍVEL. Um app que diz "reserva R$ 350, metas R$ 150,
 * lazer R$ 125" sem mostrar que os três somam a sobra parece ter errado a
 * divisão. Por isso a soma aparece escrita, com os três valores e o total — é
 * barato de renderizar e é o que faz a pessoa confiar no resto da tela.
 *
 * A RESERVA APARECE DUAS VEZES, DE PROPÓSITO. Ela tem card próprio (progresso e
 * ETA) e também ocupa a posição #1 da fila de metas. Não é duplicação: a fila
 * responde "qual é a prioridade?" e começar em #2 leria como bug. Os dois cards
 * têm trabalhos diferentes — o de cima diz quando enche, o da fila diz por que
 * vem antes.
 */

import { router, type Href } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { fill, firstName, hashSeed, LINES, pickLine } from '@/engine/persona';
import { lazerShareOfIncome, savingShareOfIncome, type GoalAllocation } from '@/engine/plan';
import { useArrego, usePlan } from '@/store/useArrego';
import { HIT_SLOP, MIN_TOUCH, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import type { CategorySlice } from '@/types/models';
import { addMonths, formatMonthLong, humanizeMonths } from '@/utils/date';
import { formatCents, formatPercent, ratio } from '@/utils/money';
import {
  AppText,
  Badge,
  Button,
  Card,
  EmptyState,
  HeroFigure,
  InkSurface,
  Legend,
  Meter,
  MoneyText,
  Screen,
  SectionHeader,
  StackedBar,
  StatTile,
} from '@/ui';

const ROTA_GRANA = '/(tabs)/grana';
const ROTA_OBJETIVOS = '/(tabs)/objetivos';

/**
 * `typedRoutes` espera `Href` e as constantes acima são literais que eu
 * controlo. O cast fica preso aqui, num lugar só — mesma disciplina do Início.
 */
function abrir(href: string): void {
  router.push(href as Href);
}

/* ────────────────────────────── Peças ─────────────────────────────── */

function SeletorDeMes() {
  const month = useArrego((state) => state.month);
  const setMonth = useArrego((state) => state.setMonth);

  return (
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
  );
}

/**
 * A posição na fila. O #1 ganha o amarelo da marca porque é a única meta que a
 * pessoa precisa enxergar de longe — e amarelo é SUPERFÍCIE: o `InkSurface`
 * colapsa a tinta em `ink.onBrand`, senão o tema escuro pintaria "#1" de branco
 * (1.58:1) em cima dele.
 */
function MarcaDeRank({ rank }: { rank: number }) {
  const { colors } = useTheme();
  const primeiro = rank === 1;

  return (
    <InkSurface onBrand={primeiro}>
      <View
        accessible
        accessibilityLabel={`Prioridade número ${rank}`}
        style={[
          styles.rank,
          { backgroundColor: primeiro ? colors.brand.amber : colors.surfaceSunken },
        ]}
      >
        <AppText variant="bodyStrong">{`#${rank}`}</AppText>
      </View>
    </InkSurface>
  );
}

/** "nesse ritmo: 8 meses". Sugestão zero não anda, e dizer isso é o honesto. */
function legendaDoRitmo(allocation: GoalAllocation): string {
  if (allocation.monthsAtSuggested === null) return 'Não anda este mês.';
  return `Nesse ritmo: ${humanizeMonths(allocation.monthsAtSuggested)} até o fim.`;
}

function CardDaMeta({
  allocation,
  nome,
  month,
}: {
  allocation: GoalAllocation;
  nome: string;
  month: string;
}) {
  const semVerba = allocation.suggestedCents === 0;

  // Meta financiada e sem prazo não tem badge nenhum. A linha precisa sumir
  // INTEIRA nesse caso: uma View vazia não tem altura, mas continua consumindo
  // um `gap` do card e abrindo um buraco de 12px que ninguém sabe de onde veio.
  const temBadge = semVerba || allocation.meetsDeadline !== null;

  const falaSemVerba = semVerba
    ? fill(pickLine(LINES.planGoalStarved, hashSeed(month, 'planGoalStarved', allocation.goalId)), {
        nome,
        meta: allocation.label,
      })
    : null;

  return (
    <Card>
      <View style={styles.goalCard}>
        <View style={styles.goalHead}>
          <MarcaDeRank rank={allocation.rank} />
          <AppText variant="subheading" numberOfLines={2} style={styles.goalTitle}>
            {`${allocation.emoji} ${allocation.label}`}
          </AppText>
        </View>

        {temBadge ? (
          <View style={styles.badgeRow}>
            {semVerba ? <Badge label="Sem verba este mês" severity="warning" /> : null}
            {/*
              As condições são independentes de propósito: uma meta com prazo
              pode ficar sem verba E não bater o prazo ao mesmo tempo. São dois
              fatos diferentes, e esconder um deles pra tela ficar limpa seria
              escolher a estética em cima da verdade.
            */}
            {/*
              "O plano" e não "você": aqui o ritmo julgado é o SUGERIDO, não o
              real. A tela de Metas usa "No ritmo" para o ritmo de depósito de
              verdade. Sem essa palavra, a mesma meta sai verde aqui e vermelha
              lá no mesmo mês — quem nunca depositou nada ganharia um "No ritmo"
              só porque o plano é generoso no papel.
            */}
            {allocation.meetsDeadline === false ? (
              <Badge label="O plano não bate o prazo" severity="warning" />
            ) : null}
            {allocation.meetsDeadline === true ? (
              <Badge label="O plano bate o prazo" severity="good" />
            ) : null}
          </View>
        ) : null}

        <View style={styles.goalAmount}>
          <AppText variant="caption" tone="muted">
            Guardar este mês
          </AppText>
          {/* Neutro: isto é destino de dinheiro, não ganho. Verde aqui mentiria. */}
          <MoneyText cents={allocation.suggestedCents} variant="title" tone="neutral" />
        </View>

        <Meter
          progress={allocation.progress}
          label={`${formatCents(allocation.savedCents)} de ${formatCents(allocation.targetCents)}`}
          caption={legendaDoRitmo(allocation)}
          // Meta atrasada não é `critical`: vermelho aqui gritaria mais alto que
          // a Arrego, e por um motivo menor. Mesma régua do Início.
          tone={allocation.progress >= 1 ? 'good' : 'brand'}
        />

        {allocation.meetsDeadline === false && allocation.requiredMonthlyCents !== null ? (
          <View style={styles.shortfall}>
            <AppText variant="small" tone="secondary">
              {`Precisaria de ${formatCents(allocation.requiredMonthlyCents)}/mês pra bater o prazo. ` +
                `O plano dá ${formatCents(allocation.suggestedCents)}/mês.`}
            </AppText>
            <AppText variant="small" tone="secondary">
              {`Faltam ${formatCents(allocation.shortfallCents)} por mês. Dá pra subir o valor ou ` +
                `empurrar a data — as duas saídas são honestas.`}
            </AppText>
          </View>
        ) : null}

        {falaSemVerba ? <AppText variant="body">{falaSemVerba}</AppText> : null}

        {/* O texto do motor entra como veio: ele já é a explicação da posição. */}
        <AppText variant="small" tone="muted">
          {allocation.rankReason}
        </AppText>
      </View>
    </Card>
  );
}

/* ────────────────────────────── A tela ────────────────────────────── */

export default function Plano() {
  const { colors } = useTheme();

  const month = useArrego((state) => state.month);
  const profile = useArrego((state) => state.profile);
  const plan = usePlan();

  const nome = firstName(profile?.name);

  // Os três baldes na ordem FIXA reserva → objetivos → lazer. A cor sai de
  // `seriesColor(scheme, índice)` dentro do StackedBar e da Legend, então a
  // ordem desta lista é a amarração entre a barra e a legenda: reordenar aqui
  // troca as duas juntas, e nunca só uma.
  const fatias = useMemo<CategorySlice[]>(
    () => [
      {
        key: 'reserva',
        label: 'Reserva de emergência',
        amountCents: plan.reservaCents,
        share: ratio(plan.reservaCents, plan.freeCents),
      },
      {
        key: 'objetivos',
        label: 'Objetivos',
        amountCents: plan.objetivosCents,
        share: ratio(plan.objetivosCents, plan.freeCents),
      },
      {
        key: 'lazer',
        label: 'Lazer',
        amountCents: plan.lazerCents,
        share: ratio(plan.lazerCents, plan.freeCents),
      },
    ],
    [plan],
  );

  /* ── Não tem o que dividir ── */

  if (!plan.viable) {
    const semRenda = plan.incomeTotalCents === 0;

    // {valor} é o TAMANHO DO BURACO, positivo — mesma convenção de
    // `negativeFlow`, pra fala e número não se contradizerem na mesma tela.
    const fala = semRenda
      ? fill(pickLine(LINES.noIncome, hashSeed(month, 'noIncome')), { nome })
      : fill(pickLine(LINES.planImpossible, hashSeed(month, 'planImpossible')), {
          nome,
          valor: formatCents(Math.abs(plan.freeCents)),
        });

    return (
      <Screen scroll>
        <View style={styles.stack}>
          <SeletorDeMes />

          {/*
            `CardTone` não tem 'serious' — status é cor de estado, não de
            superfície. O card sério ganha BORDA de status e um Badge que diz o
            estado por escrito: fundo colorido numa tela de finanças de jovem é
            pânico, não informação. Mesma regra do card crítico do Início.
          */}
          <Card style={[styles.seriousEdge, { borderColor: colors.status.serious }]}>
            <View style={styles.seriousCard}>
              <Badge label={semRenda ? 'Falta a renda' : 'Sem plano este mês'} severity="serious" />

              {semRenda ? (
                // Sem renda cadastrada, `freeCents` é só `-comprometido`.
                // Chamar isso de "buraco" seria alarme falso: não há régua pra
                // dizer que a pessoa estourou nada. Some o número do buraco.
                plan.committedCents > 0 ? (
                  <HeroFigure
                    cents={plan.committedCents}
                    label="Suas contas deste mês somam"
                    caption="Sem renda cadastrada, isso aqui é só a soma das suas contas — não é um estouro."
                    tone="neutral"
                  />
                ) : null
              ) : (
                <HeroFigure
                  cents={plan.freeCents}
                  label="O tamanho do buraco deste mês"
                  caption="É quanto os seus compromissos passaram da sua renda."
                />
              )}

              <AppText variant="body">{fala}</AppText>

              <Button
                label={semRenda ? 'Cadastrar minha entrada' : 'Ver meus gastos'}
                onPress={() => abrir(ROTA_GRANA)}
                size="lg"
                full
              />
            </View>
          </Card>

          {/*
            Sem "A real" aqui de propósito. Neste estado o motor emite uma nota
            só, e ela repete a fala que está logo acima ("precisa sobrar antes de
            dividir"). Dizer a mesma coisa duas vezes, uma sem ironia e outra
            com, faria a tela parecer que não sabe o que quer. A nota volta
            assim que existe plano e ela passa a informar algo novo.
          */}
        </View>
      </Screen>
    );
  }

  /* ── O plano existe ── */

  const temRenda = plan.incomeTotalCents > 0;

  const falaLazer = fill(pickLine(LINES.planLeisureDefense, hashSeed(month, 'planLeisureDefense')), {
    nome,
    valor: formatCents(plan.lazerCents),
    pct: formatPercent(lazerShareOfIncome(plan)),
  });

  const falaSemReserva = fill(pickLine(LINES.planNoEmergency, hashSeed(month, 'planNoEmergency')), {
    nome,
    valor: formatCents(plan.emergency.targetCents),
  });

  // {valor} neste banco é o bolo que as METAS repartem — e elas repartem o balde
  // de objetivos, não a sobra inteira. O lazer e a reserva já saíram antes da
  // fila. Usar `freeCents` aqui faria o card dizer "R$ 1.000 é tudo que existe
  // pra repartir" a poucos pixels do tile "Objetivos: R$ 240".
  const falaMetasDemais = fill(
    pickLine(LINES.planTooManyGoals, hashSeed(month, 'planTooManyGoals')),
    { nome, valor: formatCents(plan.objetivosCents) },
  );

  return (
    <Screen scroll>
      <View style={styles.stack}>
        <SeletorDeMes />

        <HeroFigure
          cents={plan.freeCents}
          label="Sobra pra dividir este mês"
          caption={
            temRenda
              ? `${formatPercent(savingShareOfIncome(plan))} da sua renda vira poupança e ` +
                `${formatPercent(lazerShareOfIncome(plan))} vira lazer.`
              : undefined
          }
        />

        {/* ── Os três baldes ── */}

        <View>
          <SectionHeader title="Os três baldes" />

          <Card>
            <View style={styles.chart}>
              <StackedBar slices={fatias} />
              {/* Obrigatória: identidade de fatia nunca é só a cor. */}
              <Legend slices={fatias} />

              <View style={[styles.soma, { borderTopColor: colors.border }]}>
                <AppText variant="small" tone="secondary">
                  {`${formatCents(plan.reservaCents)} + ${formatCents(plan.objetivosCents)} + ` +
                    `${formatCents(plan.lazerCents)} = ${formatCents(plan.freeCents)}`}
                </AppText>
                <AppText variant="caption" tone="muted">
                  Os três somam exatamente a sua sobra. Nada fica escondido no caminho — confere aí.
                </AppText>
              </View>
            </View>
          </Card>

          {/*
            Três lado a lado não cabem: "R$ 2.000,00" no tamanho `heading` mede
            uns 106px e um terço da tela deixa ~90px. Com base de 150px o grid
            embrulha sozinho e todo número continua inteiro.
          */}
          <View style={styles.kpiRow}>
            <View style={styles.kpiCell}>
              <StatTile
                label="Reserva"
                cents={plan.reservaCents}
                icon="🛟"
                tone="neutral"
                hint={
                  temRenda
                    ? `${formatPercent(ratio(plan.reservaCents, plan.incomeTotalCents))} da sua renda`
                    : undefined
                }
              />
            </View>
            <View style={styles.kpiCell}>
              <StatTile
                label="Objetivos"
                cents={plan.objetivosCents}
                icon="🎯"
                tone="neutral"
                hint={
                  temRenda
                    ? `${formatPercent(ratio(plan.objetivosCents, plan.incomeTotalCents))} da sua renda`
                    : undefined
                }
              />
            </View>
            <View style={styles.kpiCell}>
              <StatTile
                label="Lazer"
                cents={plan.lazerCents}
                icon="🎉"
                tone="neutral"
                hint={temRenda ? `${formatPercent(lazerShareOfIncome(plan))} da sua renda` : undefined}
              />
            </View>
          </View>
        </View>

        {/* ── A defesa do lazer ── */}

        <Card>
          <View style={styles.block}>
            <AppText variant="subheading">Por que sobrou dinheiro pro lazer?</AppText>
            <AppText variant="body">{falaLazer}</AppText>
          </View>
        </Card>

        {/* ── A reserva ── */}

        <View>
          <SectionHeader title="Sua reserva de emergência" />

          {plan.emergency.exists ? (
            <Card>
              <View style={styles.block}>
                {plan.emergency.funded ? <Badge label="Reserva completa" severity="good" /> : null}

                <Meter
                  progress={ratio(plan.emergency.savedCents, plan.emergency.targetCents)}
                  label={`${formatCents(plan.emergency.savedCents)} de ${formatCents(plan.emergency.targetCents)}`}
                  caption={
                    plan.emergency.funded
                      ? 'Cheia. Você pode parar de depositar aqui.'
                      : `Faltam ${formatCents(plan.emergency.remainingCents)}.`
                  }
                  tone={plan.emergency.funded ? 'good' : 'brand'}
                />

                {/*
                  A legenda descreve o número que está NA TELA, não a sugestão do
                  mês. Assim que a meta existe, o alvo é o que a PESSOA congelou —
                  e ele não se atualiza sozinho quando ela cadastra gastos. Dizer
                  "é 6 meses do seu custo de viver" em cima de um alvo que ela
                  mesma digitou é o app afirmando sobre um número que não é dele.
                */}
                <AppText variant="caption" tone="muted">
                  {plan.emergency.targetSource === 'usuario'
                    ? `Este é o alvo que você definiu. Pelos seus gastos de hoje, 6 meses de custo de viver dariam ${formatCents(plan.emergency.suggestedTargetCents)} — dá pra ajustar em Metas se quiser.`
                    : plan.emergency.usedFloor
                      ? 'Este alvo é o mínimo inicial do app, não o seu custo de viver: você ainda não tem gasto cadastrado suficiente pra eu calcular 6 meses do seu mês. Quando tiver, eu recalculo.'
                      : 'O alvo é 6 meses do seu custo de viver — não da sua renda. A reserva cobre o que o mês exige quando o dinheiro para de entrar.'}
                </AppText>

                {/*
                  Reserva cheia é meta batida, e meta batida tem banco próprio: o
                  ETA aqui diria "fica cheia em menos de um mês" sobre uma
                  reserva que JÁ está cheia. Quando a pessoa acerta, o sarcasmo
                  sai de cena e a vitória é dela, limpa.
                */}
                {plan.emergency.funded ? (
                  <AppText variant="body">
                    {fill(pickLine(LINES.goalAchieved, hashSeed(month, 'reservaCheia')), {
                      nome,
                      meta: 'sua reserva de emergência',
                      valor: formatCents(plan.emergency.targetCents),
                    })}
                  </AppText>
                ) : plan.emergency.monthsToFund !== null ? (
                  <AppText variant="body">
                    {fill(pickLine(LINES.planEmergencyEta, hashSeed(month, 'planEmergencyEta')), {
                      nome,
                      valor: formatCents(plan.reservaCents),
                      tempo: humanizeMonths(plan.emergency.monthsToFund),
                    })}
                  </AppText>
                ) : null}
              </View>
            </Card>
          ) : (
            <Card>
              <View style={styles.block}>
                <Badge label="Você ainda não tem uma" severity="warning" />
                <AppText variant="body">{falaSemReserva}</AppText>
                <Button label="Criar reserva" onPress={() => abrir(ROTA_OBJETIVOS)} full />
              </View>
            </Card>
          )}
        </View>

        {/* ── A fila ── */}

        <View>
          <SectionHeader
            title="Suas metas, em ordem"
            actionLabel="Novo objetivo"
            onAction={() => abrir(ROTA_OBJETIVOS)}
          />

          {plan.allocations.length > 0 ? (
            <View style={styles.goalList}>
              {plan.allocations.map((allocation) => (
                <CardDaMeta
                  key={allocation.goalId}
                  allocation={allocation}
                  nome={nome}
                  month={month}
                />
              ))}
            </View>
          ) : (
            <EmptyState
              emoji="🎯"
              title="Nenhuma meta na fila"
              body="Ou você não criou nenhuma, ou já bateu todas. Nos dois casos o próximo passo é o mesmo: dá um nome pro que você quer, senão o dinheiro escolhe sozinho."
              actionLabel="Criar um objetivo"
              onAction={() => abrir(ROTA_OBJETIVOS)}
            />
          )}
        </View>

        {/* ── A real ── */}

        {plan.notes.length > 0 ? (
          <View>
            <SectionHeader title="A real" />
            <Card tone="sunken">
              <View style={styles.notes}>
                {/* Factuais e sem ironia. Vêm do motor e entram como vieram. */}
                {plan.notes.map((note) => (
                  <View key={note} style={styles.noteRow}>
                    <AppText variant="body" tone="secondary">
                      •
                    </AppText>
                    <AppText variant="body" tone="secondary" style={styles.noteText}>
                      {note}
                    </AppText>
                  </View>
                ))}
              </View>
            </Card>
          </View>
        ) : null}

        {/* ── Metas demais pra mesma sobra ── */}

        {plan.unfunded.length >= 2 ? (
          <Card>
            <View style={styles.block}>
              <Badge label="Fila grande demais" severity="warning" />
              <AppText variant="body">{falaMetasDemais}</AppText>
              <Button label="Reorganizar minhas metas" onPress={() => abrir(ROTA_OBJETIVOS)} full />
            </View>
          </Card>
        ) : null}

        {/* ── O fechamento ── */}

        <View style={styles.block}>
          <Card tone="sunken">
            <AppText variant="body" tone="secondary">
              Isso aqui é sugestão, não ordem judicial. Você conhece seu mês melhor do que eu
              conheço: se um número não serve, muda a prioridade das metas ou o prazo e eu refaço a
              conta na hora.
            </AppText>
          </Card>

          <Button
            label="Guardar essa grana"
            icon="🏦"
            onPress={() => abrir(ROTA_OBJETIVOS)}
            size="lg"
            full
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // `Screen scroll` cuida do padding; o vão entre as seções mora aqui.
  stack: { gap: spacing.xl },

  monthRow: { flexDirection: 'row', alignItems: 'center' },
  monthArrow: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: { flex: 1, textAlign: 'center' },
  pressed: { opacity: 0.65 },

  block: { gap: spacing.md },

  seriousEdge: { borderWidth: 2 },
  seriousCard: { gap: spacing.lg },

  chart: { gap: spacing.md },
  soma: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.sm, gap: spacing.xs },

  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  kpiCell: { flexGrow: 1, flexBasis: 150 },

  goalList: { gap: spacing.md },
  goalCard: { gap: spacing.md },
  goalHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  // O rótulo embrulha em duas linhas: sem `flex`, uma meta de nome longo
  // empurraria a marca de rank pra fora da tela em vez de quebrar.
  goalTitle: { flex: 1 },
  goalAmount: { gap: spacing.xs },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  shortfall: { gap: spacing.xs },

  rank: {
    minWidth: 36,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
  },

  notes: { gap: spacing.sm },
  noteRow: { flexDirection: 'row', gap: spacing.sm },
  noteText: { flex: 1 },
});
