/**
 * O PLANO DO MÊS — a resposta para "o que eu faço com meu dinheiro?".
 *
 * Esta tela NÃO faz conta. Todo número vem de `usePlan()`, que já dividiu a
 * sobra em três baldes, ordenou as metas e escreveu o porquê de cada posição.
 * O que mora aqui é composição, hierarquia e a voz da Arrego vestindo o que o
 * motor apurou — em UMA linha por vez (`shortLine`), porque tela de dinheiro
 * com três parágrafos de personagem não lê como app sério, lê como vendedor.
 *
 * As decisões que essa composição específica exige:
 *
 * O AMARELO É DO CARD DOS BALDES, E DE MAIS NADA. A pergunta desta tela é "pra
 * onde vai o que sobra?", e a divisão em três é a resposta. Por isso todo botão
 * daqui é secundário: com um card de destaque na tela, um botão amarelo embaixo
 * dele não seria ênfase, seria concorrência — e três amarelos disputando é
 * exatamente a estética de pirâmide financeira que o app precisa não ter.
 *
 * A BARRA NÃO LEVA `Legend` — as três linhas SÃO a legenda. Não é atalho: o
 * card é amarelo (#FFC53D, luminância 0.61) e o marcador da terceira fatia sai
 * no slot 3 da paleta de série (#EDA100, luminância 0.43). Um contra o outro dá
 * 1.37:1 — o quadradinho do lazer simplesmente não existiria pra quem olha.
 * Dentro de superfície de marca, quem amarra a linha ao segmento é o ícone, o
 * rótulo e a ORDEM FIXA (reserva → objetivos → lazer), todos em `ink.onBrand`
 * (13.3:1). O que a regra proíbe é fatia identificada só pela cor; aqui ela não
 * é identificada por cor nenhuma.
 *
 * A CONTA CONTINUA CONFERÍVEL, sem a linha de soma escrita: o número grande é a
 * sobra, as três linhas embaixo dele são as parcelas dela, e a barra mostra que
 * as três ocupam a sobra inteira. A equação "350 + 150 + 125 = 625" era o app
 * repetindo em texto o que a barra já desenha.
 *
 * A RESERVA APARECE DUAS VEZES, DE PROPÓSITO. Ela tem bloco próprio (progresso
 * e ETA) e também ocupa a posição #1 da fila de metas. Não é duplicação: a fila
 * responde "qual é a prioridade?" e começar em #2 leria como bug. Os dois têm
 * trabalhos diferentes — o de cima diz quando enche, o da fila diz por que vem
 * antes.
 *
 * O QUE SUMIU DA TELA NÃO SUMIU DO APP. rankReason, prazo, ritmo, o alvo da
 * reserva e as notas do motor estão todos atrás de um <Reveal>, fechados por
 * padrão. Detalhe fica atrás de um toque; a tela mostra o número e cala a boca.
 */

import { router, type Href } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { firstName, hashSeed, shortLine } from '@/engine/persona';
import {
  appliedPlanTotal,
  lazerShareOfIncome,
  planAlreadyApplied,
  plannedDeposits,
  plannedDepositsTotal,
  savingShareOfIncome,
  type GoalAllocation,
} from '@/engine/plan';
import { useArrego, usePlan, type ApplyPlanResult } from '@/store/useArrego';
import { HIT_SLOP, MIN_TOUCH, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import type { CategorySlice, Cents, MonthKey } from '@/types/models';
import { addMonths, formatMonthLong, humanizeMonths } from '@/utils/date';
import { formatCents, formatPercent, ratio } from '@/utils/money';
import {
  AppText,
  Badge,
  Button,
  Card,
  HeroFigure,
  Icon,
  ListRow,
  Meter,
  MoneyText,
  Reveal,
  Screen,
  SectionHeader,
  Sheet,
  StackedBar,
  type IconName,
} from '@/ui';
import { GoalIcon } from '@/ui/GoalIcon';

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
        <Icon name="back" />
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
        <Icon name="next" />
      </Pressable>
    </View>
  );
}

/**
 * A posição na fila.
 *
 * O #1 já foi amarelo. Não é mais: o amarelo desta tela é do card dos baldes, e
 * uma pastilha de marca aqui embaixo brigaria com ele por atenção. Quem diz que
 * esta é a primeira meta é o topo da lista — a fila já está em ordem, e ordem
 * não precisa de cor pra ser lida.
 */
function MarcaDeRank({ rank }: { rank: number }) {
  const { colors } = useTheme();

  return (
    <View
      accessible
      accessibilityLabel={`Prioridade número ${rank}`}
      style={[styles.rank, { backgroundColor: colors.surfaceSunken }]}
    >
      <AppText variant="caption" tone="secondary">{`#${rank}`}</AppText>
    </View>
  );
}

/** "nesse ritmo: 8 meses". Sugestão zero não anda, e dizer isso é o honesto. */
function legendaDoRitmo(allocation: GoalAllocation): string {
  if (allocation.monthsAtSuggested === null) return 'Não anda este mês.';
  return `Nesse ritmo: ${humanizeMonths(allocation.monthsAtSuggested)} até o fim.`;
}

/**
 * Uma meta é uma linha: posição, nome, valor do mês. Era um card com medidor,
 * dois selos, dois parágrafos de conta e a explicação da ordem aberta — cinco
 * metas assim eram uma tela inteira de texto pra dizer cinco números.
 *
 * Nada disso saiu: o subtítulo carrega o fato mais urgente (parada ou ritmo) e
 * o resto — a ordem, o progresso, o prazo, a conta que falta — está no Reveal,
 * a um toque. Ele começa pela resposta do rótulo (`rankReason`) e segue com o
 * que a pessoa vai querer logo depois de perguntar "por que essa vem antes?".
 */
function LinhaDaMeta({
  allocation,
  nome,
  month,
}: {
  allocation: GoalAllocation;
  nome: string;
  month: string;
}) {
  const semVerba = allocation.suggestedCents === 0;

  const falaSemVerba = semVerba
    ? shortLine('planGoalStarved', hashSeed(month, allocation.goalId), {
        nome,
        meta: allocation.label,
      })
    : null;

  return (
    <View>
      <ListRow
        leading={<MarcaDeRank rank={allocation.rank} />}
        // O `leading` aqui é a POSIÇÃO na fila, que é o assunto desta tela, e o
        // título é uma string: quem identifica a meta é o nome. O ícone que a
        // pessoa escolheu aparece nas telas onde ele é o assunto (Metas, Início).
        title={allocation.label}
        subtitle={semVerba ? 'Sem verba este mês' : legendaDoRitmo(allocation)}
        // Neutro: isto é destino de dinheiro, não ganho. Verde aqui mentiria.
        trailing={<MoneyText cents={allocation.suggestedCents} tone="neutral" tabular />}
      />

      <Reveal label="Por que nessa ordem?">
        {/* O texto do motor entra como veio: ele já é a explicação da posição. */}
        <AppText variant="small" tone="secondary">
          {allocation.rankReason}
        </AppText>

        <Meter
          progress={allocation.progress}
          label={`${formatCents(allocation.savedCents)} de ${formatCents(allocation.targetCents)}`}
          // Meta atrasada não é `critical`: vermelho aqui gritaria mais alto que
          // a Arrego, e por um motivo menor. Mesma régua do Início.
          tone={allocation.progress >= 1 ? 'good' : 'brand'}
        />

        {/*
          "O plano" e não "você": aqui o prazo julgado é o do ritmo SUGERIDO, não
          o real. A tela de Metas usa "No prazo" (sem o "O plano") para o ritmo de
          depósito de verdade. Sem esse "O plano", a mesma meta sairia verde aqui
          e vermelha lá no mesmo mês.
        */}
        {allocation.meetsDeadline === true ? (
          <Badge label="O plano chega no prazo" severity="good" />
        ) : null}
        {allocation.meetsDeadline === false ? (
          <Badge label="O plano não chega no prazo" severity="warning" />
        ) : null}

        {allocation.meetsDeadline === false && allocation.requiredMonthlyCents !== null ? (
          <AppText variant="small" tone="secondary">
            {`Precisaria de ${formatCents(allocation.requiredMonthlyCents)}/mês pra chegar no prazo e o plano dá ${formatCents(allocation.suggestedCents)}/mês: faltam ${formatCents(allocation.shortfallCents)} por mês. Dá pra subir o valor ou empurrar a data. As duas saídas são honestas.`}
          </AppText>
        ) : null}

        {falaSemVerba !== null ? (
          <AppText variant="small" tone="secondary">
            {falaSemVerba}
          </AppText>
        ) : null}
      </Reveal>
    </View>
  );
}

/* ───────────────── Anotar a divisão (registrar, não mover) ──────────────── */

/**
 * "3 metas" / "1 meta". O banco `applyDone` recebe {qtd} COM o substantivo
 * embutido — é o que impede a fala de sair como "1 metas".
 */
function contarMetas(count: number): string {
  return count === 1 ? '1 meta' : `${count} metas`;
}

/**
 * A resposta da Arrego a `applyPlan()`. Um banco por `reason`, e o número sai
 * SEMPRE do que voltou do store — não do que a tela tinha calculado antes.
 *
 * O caso 'ja-aplicado' é a exceção que confirma a regra: o store devolve
 * `totalCents: 0` porque não gravou nada agora, e {valor} ali significa "o que
 * já consta deste mês". Por isso ele vem de `appliedPlanTotal`, e não do
 * retorno — usar o retorno faria a Arrego dizer "já anotei R$ 0,00".
 */
function falaDoResultado(
  resultado: ApplyPlanResult,
  nome: string,
  month: MonthKey,
  jaAnotadoCents: Cents,
): string {
  const seed = hashSeed(month);

  switch (resultado.reason) {
    case 'ok':
      return shortLine('applyDone', seed, {
        nome,
        valor: formatCents(resultado.totalCents),
        qtd: contarMetas(resultado.count),
      });
    case 'ja-aplicado':
      return shortLine('applyAlready', seed, { nome, valor: formatCents(jaAnotadoCents) });
    case 'nada-a-aplicar':
      return shortLine('applyNothing', seed, { nome });
    case 'mes-futuro':
      return shortLine('applyFuture', seed, { nome });
    case 'erro':
      return shortLine('applyError', seed, { nome });
    case 'erro-parcial':
      // Banco separado de propósito: as falas de `applyError` prometem que
      // "nada foi registrado", e aqui sobrou registro. Mentir sobre dinheiro
      // logo depois de falhar com dinheiro é como se perde alguém pra sempre.
      return shortLine('applyPartialError', seed, { nome });
  }
}

/* ────────────────────────────── A tela ────────────────────────────── */

export default function Plano() {
  const { colors } = useTheme();

  const month = useArrego((state) => state.month);
  const profile = useArrego((state) => state.profile);
  const deposits = useArrego((state) => state.deposits);
  const applyPlan = useArrego((state) => state.applyPlan);
  const plan = usePlan();

  const nome = firstName(profile?.name);

  /**
   * Os três baldes na ordem FIXA reserva → objetivos → lazer. A cor de cada
   * segmento sai do ÍNDICE desta lista (dentro do StackedBar), e as linhas
   * abaixo da barra saem da mesma lista, na mesma ordem: é essa amarração que
   * faz a barra e as linhas contarem a mesma história. Reordenar aqui troca as
   * duas juntas, e nunca só uma.
   */
  const baldes = useMemo<
    ReadonlyArray<{ key: string; label: string; icon: IconName; cents: Cents }>
  >(
    () => [
      { key: 'reserva', label: 'Reserva', icon: 'shield', cents: plan.reservaCents },
      { key: 'objetivos', label: 'Objetivos', icon: 'target', cents: plan.objetivosCents },
      { key: 'lazer', label: 'Lazer', icon: 'money', cents: plan.lazerCents },
    ],
    [plan.reservaCents, plan.objetivosCents, plan.lazerCents],
  );

  const fatias = useMemo<CategorySlice[]>(
    () =>
      baldes.map((balde) => ({
        key: balde.key,
        label: balde.label,
        amountCents: balde.cents,
        share: ratio(balde.cents, plan.freeCents),
      })),
    [baldes, plan.freeCents],
  );

  /* ── Anotar a divisão ── */

  const depositos = useMemo(() => plannedDeposits(plan), [plan]);
  const totalPlanejado = useMemo(() => plannedDepositsTotal(plan), [plan]);
  const jaAnotado = useMemo(() => planAlreadyApplied(deposits, month), [deposits, month]);
  const totalAnotado = useMemo(() => appliedPlanTotal(deposits, month), [deposits, month]);

  /**
   * Sem plano viável ou sem meta pra receber, não há o que anotar e o botão não
   * aparece — oferecer a ação e responder "nada a aplicar" seria o app fingindo
   * uma porta. (`plannedDeposits` já devolve [] quando o plano não fecha; o
   * `plan.viable` fica explícito porque é o contrato, não uma consequência.)
   */
  const podeAnotar = plan.viable && depositos.length > 0;

  const [confirmando, setConfirmando] = useState(false);
  const [gravando, setGravando] = useState(false);

  /**
   * A resposta carrega o mês em que nasceu. Sem isso, quem anota o plano de
   * julho e toca na seta do seletor lê "Anotei R$ 400" em cima dos números de
   * agosto — uma fala verdadeira no lugar errado, que é como se inventa um
   * número. Guardar o mês junto resolve na renderização, sem efeito e sem
   * piscada.
   */
  const [resposta, setResposta] = useState<{ month: MonthKey; texto: string } | null>(null);
  const respostaDoMes = resposta !== null && resposta.month === month ? resposta.texto : null;

  /**
   * `applyPlan` lê o estado no início e só grava no fim: dois toques antes do
   * primeiro `set` passam os dois pela checagem de "já aplicado" e registram
   * tudo duas vezes. `disabled` sozinho não fecha essa janela — ele só vale
   * depois do re-render. O ref fecha, porque muda no mesmo tique do toque.
   */
  const gravandoRef = useRef(false);

  async function anotar(): Promise<void> {
    if (gravandoRef.current) return;
    gravandoRef.current = true;
    setGravando(true);
    try {
      const resultado = await applyPlan();
      setResposta({ month, texto: falaDoResultado(resultado, nome, month, totalAnotado) });
      setConfirmando(false);
    } catch {
      // `applyPlan` trata os próprios erros e devolve um `reason` — mas o
      // caminho em que o rollback dele também falha pode rejeitar de verdade.
      // Sem este catch, `void anotar()` viraria unhandled rejection, a folha
      // ficaria aberta e a pessoa tocaria em "Pode anotar" olhando um botão
      // morto: sem erro, sem fala, e possivelmente com registro pela metade no
      // banco. Falhar calado é a pior forma de falhar com dinheiro.
      setResposta({
        month,
        texto: shortLine('applyPartialError', hashSeed(month, 'crash'), { nome }),
      });
      setConfirmando(false);
    } finally {
      gravandoRef.current = false;
      setGravando(false);
    }
  }

  /* ── Não tem o que dividir ── */

  if (!plan.viable) {
    const semRenda = plan.incomeTotalCents === 0;

    // {valor} é o TAMANHO DO BURACO, positivo — mesma convenção de
    // `negativeFlow`, pra fala e número não se contradizerem na mesma tela.
    const fala = semRenda
      ? shortLine('noIncome', hashSeed(month), { nome })
      : shortLine('planImpossible', hashSeed(month), {
          nome,
          valor: formatCents(Math.abs(plan.freeCents)),
        });

    return (
      <Screen scroll>
        <View style={styles.page}>
          <SeletorDeMes />

          {/*
            `CardTone` não tem 'serious' — status é cor de estado, não de
            superfície. O card sério ganha BORDA de status e um Badge que diz o
            estado por escrito: fundo colorido numa tela de finanças de jovem é
            pânico, não informação. Mesma regra do card crítico do Início.

            Aqui o botão FICA amarelo: não existe card de destaque nesta tela, e
            a precedência manda o amarelo cair na ação principal.
          */}
          {/*
            Sem borda de status: o Badge logo abaixo já diz o estado com ponto,
            ícone e rótulo. A borda seria a terceira cópia da mesma informação —
            e a única que grita. Borda divide; espaço organiza.
          */}
          <Card>
            <View style={styles.block}>
              <Badge label={semRenda ? 'Falta a renda' : 'Sem plano este mês'} severity="serious" />

              {semRenda ? (
                // Sem renda cadastrada, `freeCents` é só `-comprometido`.
                // Chamar isso de "buraco" seria alarme falso: não há régua pra
                // dizer que a pessoa estourou nada. Some o número do buraco.
                plan.committedCents > 0 ? (
                  <HeroFigure
                    cents={plan.committedCents}
                    label="Suas contas deste mês somam"
                    caption="Sem renda cadastrada, isto é só a soma das contas."
                    tone="neutral"
                  />
                ) : null
              ) : (
                <HeroFigure
                  cents={plan.freeCents}
                  label="O tamanho do buraco deste mês"
                  caption="É quanto os compromissos passaram da sua renda."
                />
              )}

              <AppText variant="small">{fala}</AppText>

              <Button
                label={semRenda ? 'Cadastrar minha entrada' : 'Ver meus gastos'}
                onPress={() => abrir(ROTA_GRANA)}
                size="lg"
                full
              />
            </View>
          </Card>
        </View>
      </Screen>
    );
  }

  /* ── O plano existe ── */

  const temRenda = plan.incomeTotalCents > 0;

  const falaLazer = shortLine('planLeisureDefense', hashSeed(month), {
    nome,
    valor: formatCents(plan.lazerCents),
    pct: formatPercent(lazerShareOfIncome(plan)),
  });

  const falaSemReserva = shortLine('planNoEmergency', hashSeed(month), {
    nome,
    valor: formatCents(plan.emergency.targetCents),
  });

  // {valor} neste banco é o bolo que as METAS repartem — e elas repartem o balde
  // de objetivos, não a sobra inteira. O lazer e a reserva já saíram antes da
  // fila. Usar `freeCents` aqui faria a fala dizer "R$ 1.000 é tudo que existe
  // pra repartir" a poucos pixels da linha "Objetivos: R$ 240,00".
  const falaMetasDemais = shortLine('planTooManyGoals', hashSeed(month), {
    nome,
    valor: formatCents(plan.objetivosCents),
  });

  return (
    <Screen scroll>
      {/*
        Todo o vão entre assuntos vem do gap desta coluna, por isso os
        SectionHeader são `first`: o `marginTop` deles somaria ao gap e abriria
        56px de buraco no meio da tela.
      */}
      <View style={styles.page}>
        <SeletorDeMes />

        <HeroFigure
          cents={plan.freeCents}
          label="O que sobra pra você este mês"
          caption={
            temRenda
              ? `${formatPercent(savingShareOfIncome(plan))} vira poupança, ${formatPercent(lazerShareOfIncome(plan))} vira lazer.`
              : undefined
          }
        />

        {/* ── Os três baldes: o assunto da tela, e o único amarelo dela ── */}

        <Card tone="brand">
          <View style={styles.baldes}>
            <StackedBar slices={fatias} />

            <View>
              {baldes.map((balde) => (
                <ListRow
                  key={balde.key}
                  // `Icon` não olha o contexto de tinta sozinho: sem `onBrand`
                  // ele cairia em `ink.secondary`, que sobre o amarelo dá 2.33:1.
                  leading={<Icon name={balde.icon} tone="onBrand" />}
                  title={balde.label}
                  subtitle={
                    temRenda
                      ? `${formatPercent(ratio(balde.cents, plan.incomeTotalCents))} da renda`
                      : undefined
                  }
                  trailing={<MoneyText cents={balde.cents} tone="neutral" tabular />}
                />
              ))}
            </View>

            <Reveal label="Por que sobra pro lazer?">
              <AppText variant="small">{falaLazer}</AppText>
            </Reveal>
          </View>
        </Card>

        {/* ── A reserva ── */}

        <View>
          <SectionHeader title="Sua reserva" first />

          {plan.emergency.exists ? (
            <Card>
              <View style={styles.block}>
                {plan.emergency.funded ? <Badge label="Reserva completa" severity="good" /> : null}

                <View style={styles.numero}>
                  <AppText variant="caption" tone="muted">
                    Guardado até agora
                  </AppText>
                  <MoneyText cents={plan.emergency.savedCents} variant="title" tone="neutral" />
                </View>

                <Meter
                  progress={ratio(plan.emergency.savedCents, plan.emergency.targetCents)}
                  label={`Alvo: ${formatCents(plan.emergency.targetCents)}`}
                  caption={
                    plan.emergency.funded
                      ? 'Cheia. Você pode parar de depositar aqui.'
                      : `Faltam ${formatCents(plan.emergency.remainingCents)}.`
                  }
                  tone={plan.emergency.funded ? 'good' : 'brand'}
                />

                {/*
                  Reserva cheia é meta batida, e meta batida tem banco próprio: o
                  ETA aqui diria "fica cheia em menos de um mês" sobre uma
                  reserva que JÁ está cheia. Quando a pessoa acerta, o sarcasmo
                  sai de cena e a vitória é dela, limpa.
                */}
                {plan.emergency.funded ? (
                  <AppText variant="small">
                    {shortLine('goalAchieved', hashSeed(month, 'reservaCheia'), {
                      nome,
                      meta: 'sua reserva',
                      valor: formatCents(plan.emergency.targetCents),
                    })}
                  </AppText>
                ) : plan.emergency.monthsToFund !== null ? (
                  <AppText variant="small">
                    {shortLine('planEmergencyEta', hashSeed(month), {
                      nome,
                      valor: formatCents(plan.reservaCents),
                      tempo: humanizeMonths(plan.emergency.monthsToFund),
                    })}
                  </AppText>
                ) : null}

                {/*
                  A legenda descreve o número que está NA TELA, não a sugestão do
                  mês. Assim que a meta existe, o alvo é o que a PESSOA congelou —
                  e ele não se atualiza sozinho quando ela cadastra gastos. Dizer
                  "é 6 meses do seu custo de viver" em cima de um alvo que ela
                  mesma digitou é o app afirmando sobre um número que não é dele.
                */}
                <Reveal label="De onde vem esse alvo?">
                  <AppText variant="small" tone="secondary">
                    {plan.emergency.targetSource === 'usuario'
                      ? `Este é o alvo que você definiu. Pelos seus gastos de hoje, 6 meses de custo de viver dariam ${formatCents(plan.emergency.suggestedTargetCents)}. Dá pra ajustar em Metas se quiser.`
                      : plan.emergency.usedFloor
                        ? 'Este alvo é o mínimo inicial do app, não o seu custo de viver: você ainda não tem gasto cadastrado suficiente pra eu calcular 6 meses do seu mês. Quando tiver, eu recalculo.'
                        : 'O alvo é 6 meses do seu custo de viver, não da sua renda. A reserva cobre o que o mês exige quando o dinheiro para de entrar.'}
                  </AppText>
                </Reveal>
              </View>
            </Card>
          ) : (
            <Card>
              <View style={styles.block}>
                <Badge label="Você ainda não tem uma" severity="warning" />
                <AppText variant="small">{falaSemReserva}</AppText>
                <Button
                  label="Criar reserva"
                  variant="secondary"
                  onPress={() => abrir(ROTA_OBJETIVOS)}
                  full
                />
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
            first
          />

          {plan.allocations.length > 0 ? (
            // O vão é ENTRE metas: dentro de uma, a linha e o "por quê?" ficam
            // colados de propósito — é a proximidade que diz de quem é a
            // explicação, agora que nenhuma das duas tem card em volta.
            <View style={styles.metas}>
              {plan.allocations.map((allocation) => (
                <LinhaDaMeta
                  key={allocation.goalId}
                  allocation={allocation}
                  nome={nome}
                  month={month}
                />
              ))}
            </View>
          ) : (
            <View style={styles.block}>
              <AppText variant="small" tone="secondary">
                Nenhuma meta na fila. Sem alvo, o dinheiro escolhe sozinho.
              </AppText>
              <Button
                label="Criar um objetivo"
                variant="secondary"
                onPress={() => abrir(ROTA_OBJETIVOS)}
                full
              />
            </View>
          )}

          {/*
            A ação da fila, colada nela: o que o botão anota é exatamente a
            coluna de valores acima dele.

            `secondary`, nunca `primary`: o amarelo desta tela já é do card dos
            baldes, e um botão de marca aqui embaixo seria o segundo — a regra do
            amarelo vale pra ação principal SÓ quando não há card de destaque.

            Aplicado, o botão SOME em vez de virar um botão apagado: botão
            desabilitado ainda promete que existe um jeito de fazer de novo, e
            aqui não existe — o registro do mês é um só. Quem já anotou lê um
            fato, não uma promessa quebrada.

            A linha vive enquanto der pra anotar OU enquanto já estiver anotado.
            Amarrar ela só a `podeAnotar` faria o comprovante evaporar no caso em
            que o plano fecha a última meta: sem meta com sugestão > 0, não sobra
            depósito planejado e a pessoa perderia de vista o que acabou de
            registrar.
          */}
          {jaAnotado || podeAnotar ? (
            <View style={styles.acao}>
              {jaAnotado ? (
                <ListRow
                  // `ok` na tinta do texto, e não em verde de status: verde aqui
                  // comemoraria uma transferência que não aconteceu. O que está
                  // pronto é a anotação — e anotação é fato, não vitória.
                  leading={<Icon name="ok" />}
                  title="Plano deste mês já anotado"
                  trailing={<MoneyText cents={totalAnotado} tone="neutral" tabular />}
                />
              ) : (
                <Button
                  label="Guardar isso tudo"
                  icon="money"
                  variant="secondary"
                  onPress={() => setConfirmando(true)}
                  size="lg"
                  full
                />
              )}

              {/*
                A resposta dela ao toque. Estado da tela, não Alert: Alert
                sequestra a tela inteira e exige um "OK" pra sumir — pancada pra
                dizer "anotei".

                A região viva fica no View e não no AppText porque `AppText` tem
                superfície de props fechada de propósito (variant/tone/style), e
                abrir ela pra um caso desta tela é o tipo de vazamento que
                transforma componente em saco de props. `polite` porque quem usa
                leitor de tela também precisa saber que gravou: o texto nasce
                longe do foco, que ficou no botão da folha.
              */}
              {respostaDoMes !== null ? (
                <View accessibilityLiveRegion="polite">
                  <AppText variant="small">{respostaDoMes}</AppText>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        {/* ── Metas demais pra mesma sobra ── */}

        {plan.unfunded.length >= 2 ? (
          <Card>
            <View style={styles.block}>
              <Badge label="Fila grande demais" severity="warning" />
              <AppText variant="small">{falaMetasDemais}</AppText>
              <Button
                label="Reorganizar minhas metas"
                variant="secondary"
                onPress={() => abrir(ROTA_OBJETIVOS)}
                full
              />
            </View>
          </Card>
        ) : null}

        {/* ── A real, agora atrás de um toque ── */}

        <View style={styles.block}>
          <Reveal label="Detalhes do plano">
            {/* Factuais e sem ironia. Vêm do motor e entram como vieram. */}
            {plan.notes.map((note) => (
              <View key={note} style={styles.noteRow}>
                <AppText variant="small" tone="secondary">
                  •
                </AppText>
                <AppText variant="small" tone="secondary" style={styles.noteText}>
                  {note}
                </AppText>
              </View>
            ))}

            <AppText variant="small" tone="secondary">
              Isso aqui é sugestão, não ordem judicial. Você conhece seu mês melhor do que eu: se um
              número não serve, muda a prioridade das metas ou o prazo e eu refaço a conta na hora.
            </AppText>
          </Reveal>

          <Button
            label="Guardar essa grana"
            icon="money"
            variant="secondary"
            onPress={() => abrir(ROTA_OBJETIVOS)}
            size="lg"
            full
          />
        </View>
      </View>

      {/*
        A confirmação. Não é cerimônia: o toque grava registro de DINHEIRO nas
        metas, e a pessoa tem direito de ver linha por linha o que vai ficar
        escrito no nome dela antes de virar histórico.
      */}
      <Sheet
        visible={confirmando}
        onClose={() => setConfirmando(false)}
        title="Anotar a divisão do mês"
      >
        <View>
          {depositos.map((deposito) => (
            <ListRow
              key={deposito.goalId}
              // O ícone é o que a PESSOA escolheu pra meta: aqui ele ajuda ela a
              // reconhecer, linha por linha, o que está prestes a assinar.
              leading={<GoalIcon value={deposito.emoji} />}
              title={deposito.label}
              trailing={<MoneyText cents={deposito.amountCents} tone="neutral" tabular />}
            />
          ))}

          {/*
            Aqui o fio ganha o direito de existir: ele não está dividindo dois
            assuntos, está dizendo "as linhas de cima somam a de baixo". É a
            única marca que transforma uma pilha de valores numa conta.
          */}
          <View style={[styles.total, { borderTopColor: colors.hairline }]}>
            <AppText variant="bodyStrong">Total</AppText>
            <MoneyText cents={totalPlanejado} variant="heading" tone="neutral" tabular />
          </View>
        </View>

        {/*
          O AVISO. Não é rodapé, não vai atrás de Reveal, não é opcional.

          O Arrego não fala com banco nenhum: ele anota. Se a pessoa sair daqui
          achando que o app separou o dinheiro, ela passa meses com uma reserva
          que só existe no gráfico — e descobre no dia do imprevisto, que é o
          pior dia possível. Nenhuma piada desta tela vale esse risco.

          A superfície é `surfaceSunken` e não a marca: dentro da folha não há
          card de destaque, então o amarelo é do "Pode anotar" logo abaixo. Um
          bloco amarelo aqui roubaria o único amarelo da folha do botão que a
          pessoa precisa achar. Recuo também destaca — só não grita.
        */}
        <View style={[styles.aviso, { backgroundColor: colors.surfaceSunken }]}>
          <Icon name="info" />
          <AppText variant="small" style={styles.avisoTexto}>
            Eu só anoto aqui. Quem transfere o dinheiro de verdade é você, no seu banco.
          </AppText>
        </View>

        <View style={styles.acoesDaFolha}>
          {/*
            `primary` — e é o único amarelo da folha. Ver a precedência do
            tokens.ts: sem card de destaque, a marca é da ação principal.
          */}
          <Button
            label="Pode anotar"
            onPress={() => {
              void anotar();
            }}
            size="lg"
            disabled={gravando}
            full
          />
          <Button label="Deixa quieto" variant="ghost" onPress={() => setConfirmando(false)} full />
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { gap: spacing.section },
  block: { gap: spacing.md },

  monthRow: { flexDirection: 'row', alignItems: 'center' },
  monthArrow: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: { flex: 1, textAlign: 'center' },
  pressed: { opacity: 0.65 },

  seriousEdge: { borderWidth: 2 },

  baldes: { gap: spacing.md },
  numero: { gap: spacing.xs },
  metas: { gap: spacing.md },

  // A ação respira longe da última meta: ela fala da fila inteira, não da linha
  // que ficou por último.
  acao: { gap: spacing.md, marginTop: spacing.lg },

  total: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },

  aviso: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.md,
  },
  avisoTexto: { flex: 1 },

  acoesDaFolha: { gap: spacing.sm },

  rank: {
    minWidth: 32,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    borderRadius: radius.pill,
  },

  noteRow: { flexDirection: 'row', gap: spacing.sm },
  noteText: { flex: 1 },
});
