/**
 * Tela "Cartão" — cartões e parcelas.
 *
 * SEM DADO DE CARTÃO. Aqui um cartão é apelido + dias do ciclo + um limite
 * opcional. Número, CVV, validade, titular e senha não são pedidos, não são
 * guardados e não têm campo — nem escondido, nem "só pra facilitar depois".
 *
 * O AVISO ANTIGOLPE VIROU UMA LINHA, e essa é a piada da tela: ele era três
 * parágrafos dentro de um card amarelo, no topo, gritando. Um bloco de texto
 * jurando que não é golpe é exatamente o que um golpe faz — era o pedaço da
 * interface que mais fazia a tela parecer aquilo que ela avisava contra. Agora
 * é uma ListRow com cadeado e a regra em cinco palavras; o resto (a lista dos
 * dados que não existem aqui, e o "se pedir, é golpe") está inteiro atrás do
 * <Reveal>. A informação não saiu, parou de gritar.
 *
 * Continua no TOPO, e isso não é escolha estética: quem precisa desse aviso é
 * quem caiu numa tela falsa que imita esta, e essa pessoa não rola a tela.
 *
 * O AMARELO DESTA TELA É UM SÓ: o botão "Nova compra". O card do aviso era
 * amarelo, o preview da parcela era amarelo, o medidor era amarelo — três
 * superfícies de marca disputando a mesma tela é a receita visual de pirâmide
 * financeira. Aqui o amarelo aponta pra ação e mais nada. (O preenchimento do
 * Meter é marca de dado, não superfície: ele segue o kit.)
 */

import { installmentsForMonth } from '@/engine/analysis';
import { useArrego } from '@/store/useArrego';
import { radius, seriesColor, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import type { Card as CardModel, Cents, ExpenseCategory, MonthKey } from '@/types/models';
import {
  AppText,
  Button,
  Card,
  Chip,
  CurrencyField,
  DayField,
  Field,
  HeroFigure,
  Icon,
  ListRow,
  Meter,
  MoneyText,
  Reveal,
  Screen,
  SectionHeader,
  Sheet,
  TextField,
} from '@/ui';
import { addMonths, formatMonthLong, formatMonthShort } from '@/utils/date';
import { formatCents, ratio, splitInstallments } from '@/utils/money';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

const TIMELINE_MONTHS = 6;
const MAX_INSTALLMENTS = 24;
/** Acima disso as parcelas do mês já comeram o limite e o medidor fica vermelho. */
const LIMIT_ALERT = 0.8;

const INSTALLMENT_OPTIONS = Array.from({ length: MAX_INSTALLMENTS }, (_, index) => index + 1);

/**
 * Rótulos espelham os de `engine/analysis` — a mesma compra não pode ter dois
 * nomes. Sem emoji: o ícone da categoria era enfeite de interface (ninguém
 * escolheu aquele carrinho), e emoji de enfeite é o que faz um app de dinheiro
 * parecer conversa de grupo. O rótulo já identifica a categoria sozinho.
 */
const CATEGORIES: ReadonlyArray<{ key: ExpenseCategory; label: string }> = [
  { key: 'moradia', label: 'Moradia' },
  { key: 'contas', label: 'Contas' },
  { key: 'mercado', label: 'Mercado' },
  { key: 'transporte', label: 'Transporte' },
  { key: 'saude', label: 'Saúde' },
  { key: 'educacao', label: 'Educação' },
  { key: 'lazer', label: 'Lazer' },
  { key: 'outros', label: 'Outros' },
];

/**
 * A regra inteira em uma linha. O texto é curto porque `ListRow` corta o título
 * em uma linha só — e um aviso de golpe truncado com "…" é pior que nenhum.
 * A lista dos dados que este app nunca pede fica no subtítulo e no Reveal.
 */
const AVISO_TITULO = 'O Arrego nunca pede dados do cartão';
const AVISO_SUBTITULO = 'Número, CVV, senha: não existe campo.';

export default function CartaoScreen() {
  const { scheme, colors } = useTheme();

  const cards = useArrego((state) => state.cards);
  const purchases = useArrego((state) => state.purchases);
  const month = useArrego((state) => state.month);
  const addCard = useArrego((state) => state.addCard);
  const addPurchase = useArrego((state) => state.addPurchase);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [cardSheet, setCardSheet] = useState(false);
  const [nickname, setNickname] = useState('');
  const [closingDay, setClosingDay] = useState<number | null>(null);
  const [dueDay, setDueDay] = useState<number | null>(null);
  const [limitCents, setLimitCents] = useState<Cents>(0);

  const [purchaseSheet, setPurchaseSheet] = useState(false);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('outros');
  const [totalCents, setTotalCents] = useState<Cents>(0);
  const [installments, setInstallments] = useState(1);
  const [firstMonth, setFirstMonth] = useState<MonthKey>(month);

  /**
   * Cartão arquivado sai da lista mas NÃO some da vida: as parcelas dele seguem
   * caindo e continuam somando no retrato do mês (ver `installmentsForMonth`).
   * Esta tela não arquiva nada — só evita oferecer como destino de compra um
   * cartão que alguém aposentou em outro lugar.
   */
  const activeCards = useMemo(() => cards.filter((card) => card.archivedAt === null), [cards]);

  /**
   * O cartão em foco é DERIVADO, não sincronizado por efeito: um `selectedId`
   * que aponta para cartão apagado cai sozinho no primeiro da lista, em vez de
   * deixar a tela mostrando fatura de um cartão que não existe mais.
   */
  const selected: CardModel | null =
    activeCards.find((card) => card.id === selectedId) ?? activeCards[0] ?? null;

  const cardPurchases = useMemo(
    () => (selected === null ? [] : purchases.filter((purchase) => purchase.cardId === selected.id)),
    [purchases, selected],
  );

  const monthInstallments = useMemo(
    () => installmentsForMonth(cardPurchases, month),
    [cardPurchases, month],
  );

  const faturaCents = useMemo(
    () => monthInstallments.reduce((total, item) => total + item.amountCents, 0),
    [monthInstallments],
  );

  /** Uma varredura só para a lista inteira — não uma por cartão a cada render. */
  const monthTotalByCard = useMemo(() => {
    const totals = new Map<string, Cents>();
    for (const item of installmentsForMonth(purchases, month)) {
      totals.set(item.purchase.cardId, (totals.get(item.purchase.cardId) ?? 0) + item.amountCents);
    }
    return totals;
  }, [purchases, month]);

  const timeline = useMemo(
    () =>
      Array.from({ length: TIMELINE_MONTHS }, (_, index) => {
        const key = addMonths(month, index);
        return {
          key,
          cents: installmentsForMonth(cardPurchases, key).reduce(
            (total, item) => total + item.amountCents,
            0,
          ),
        };
      }),
    [cardPurchases, month],
  );

  const timelineMax = useMemo(() => Math.max(0, ...timeline.map((item) => item.cents)), [timeline]);

  const monthOptions = useMemo(
    // Janela em volta do mês em foco: aceita parcelamento que já começou (mês
    // passado) e compra cujo 1º vencimento só cai lá na frente.
    () => Array.from({ length: 6 }, (_, index) => addMonths(month, index - 3)),
    [month],
  );

  const selectedLimitCents = selected?.limitCents ?? null;
  const limitUsage = selectedLimitCents === null ? 0 : ratio(faturaCents, selectedLimitCents);

  const parcels = useMemo(
    () => splitInstallments(totalCents, installments),
    [totalCents, installments],
  );
  const firstParcel = parcels[0] ?? 0;
  const otherParcel = parcels[1];
  const lastMonth = addMonths(firstMonth, installments - 1);

  const cardValid = nickname.trim() !== '' && closingDay !== null && dueDay !== null;
  const purchaseValid = description.trim() !== '' && totalCents > 0;

  /**
   * Magnitude, não identidade: os seis meses da timeline dividem UMA cor. Um
   * slot de série por mês faria o olho ler cada barra como uma categoria
   * diferente — são o mesmo dado, medido seis vezes.
   */
  const timelineColor = seriesColor(scheme, 0);

  const openCardSheet = () => {
    setNickname('');
    setClosingDay(null);
    setDueDay(null);
    setLimitCents(0);
    setSaveError(null);
    setCardSheet(true);
  };

  const openPurchaseSheet = () => {
    setDescription('');
    setCategory('outros');
    setTotalCents(0);
    setInstallments(1);
    setFirstMonth(month);
    setSaveError(null);
    setPurchaseSheet(true);
  };

  /**
   * A store engole a exceção e devolve a mensagem em `error` (ela limpa o campo
   * quando a escrita dá certo). Fechar a folha sem ler esse campo faria o app
   * comemorar um save que não aconteceu e perder o que a pessoa digitou.
   */
  const closeIfSaved = (close: () => void): void => {
    const failure = useArrego.getState().error;
    setSaveError(failure);
    if (failure === null) close();
  };

  const saveCard = async () => {
    const label = nickname.trim();
    if (label === '' || closingDay === null || dueDay === null) return;

    await addCard({
      nickname: label,
      closingDay,
      dueDay,
      // Limite zerado é "não quis informar". Gravar 0 faria o medidor tratar
      // qualquer compra como estouro.
      limitCents: limitCents > 0 ? limitCents : null,
      // Um slot por cartão, na ordem de criação; `seriesColor` satura no 8º.
      colorIndex: cards.length,
    });

    closeIfSaved(() => setCardSheet(false));
  };

  const savePurchase = async () => {
    const label = description.trim();
    if (selected === null || label === '' || totalCents <= 0) return;

    await addPurchase({
      cardId: selected.id,
      description: label,
      category,
      // Valor CHEIO da compra. A divisão é derivada no cálculo, para a soma das
      // parcelas fechar no total ao centavo.
      totalCents,
      installments,
      firstInstallmentMonth: firstMonth,
    });

    closeIfSaved(() => setPurchaseSheet(false));
  };

  return (
    <Screen scroll>
      {/*
        O vão entre assuntos é `spacing.section` e vem TODO daqui: por isso todo
        SectionHeader é `first` (o `marginTop` dele somaria ao gap e abriria 56px
        no meio da tela). Espaço separa; borda não.
      */}
      <View style={styles.page}>
        <View style={styles.head}>
          <AppText variant="title">Cartão</AppText>

          <View>
            <ListRow
              leading={<Icon name="lock" />}
              title={AVISO_TITULO}
              subtitle={AVISO_SUBTITULO}
            />
            <Reveal label="Por quê?">
              <AppText variant="small" tone="secondary">
                Aqui um cartão é apelido, dia de fechamento e dia de vencimento — é só isso que me
                diz em que mês a parcela cai. Número, CVV, validade, nome do titular e senha não são
                pedidos e não são guardados: não existe campo pra isso.
              </AppText>
              <AppText variant="small" tone="secondary">
                Então anota a regra: se QUALQUER tela dentro do Arrego pedir o número do cartão, o
                CVV ou a sua senha, não sou eu. É golpe. Não digita nada e fecha o app.
              </AppText>
            </Reveal>
          </View>
        </View>

        {activeCards.length === 0 ? (
          // Sem cartão não existe fatura nem "Nova compra": aqui o botão é a
          // ação principal da tela, e é ele que fica com o amarelo.
          <View style={styles.empty}>
            <AppText variant="heading">Nenhum cartão por aqui</AppText>
            <AppText variant="small" tone="secondary">
              Parcelar em 12x não faz o problema sumir. Faz virar 12.
            </AppText>
            <Button label="Novo cartão" icon="add" onPress={openCardSheet} size="lg" full />
          </View>
        ) : (
          <>
            <View>
              <SectionHeader
                title="Seus cartões"
                actionLabel="Novo cartão"
                onAction={openCardSheet}
                first
              />

              <View style={styles.list}>
                {activeCards.map((card) => {
                  const color = seriesColor(scheme, card.colorIndex);
                  const isSelected = selected !== null && selected.id === card.id;
                  const cardMonthCents = monthTotalByCard.get(card.id) ?? 0;

                  return (
                    <Pressable
                      key={card.id}
                      onPress={() => setSelectedId(card.id)}
                      accessible
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={`${card.nickname}, fecha dia ${card.closingDay}, vence dia ${card.dueDay}, ${formatCents(cardMonthCents)} neste mês`}
                      style={({ pressed }) => [pressed && styles.pressed]}
                    >
                      {/*
                        O anel do cartão em foco usa a COR DE IDENTIDADE dele
                        (o slot de série que ele ganhou ao nascer), nunca o
                        amarelo: amarelo nesta tela é do botão. Cor de identidade
                        também não é status — ela não diz que algo está bom ou
                        ruim, só qual cartão é qual.
                      */}
                      <Card style={isSelected ? { borderColor: color, borderWidth: 2 } : undefined}>
                        <View style={styles.cardRow}>
                          <Icon name="card" tone={isSelected ? 'primary' : 'muted'} />

                          <View style={styles.cardBody}>
                            <AppText variant="subheading" numberOfLines={1}>
                              {card.nickname}
                            </AppText>
                            <AppText variant="caption" tone="muted" numberOfLines={1}>
                              {`fecha ${card.closingDay} · vence ${card.dueDay}`}
                            </AppText>
                          </View>

                          <View style={styles.cardTrailing}>
                            <MoneyText
                              cents={cardMonthCents}
                              variant="bodyStrong"
                              tone="neutral"
                              tabular
                            />
                            <AppText variant="caption" tone="muted">
                              neste mês
                            </AppText>
                          </View>
                        </View>
                      </Card>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {selected !== null ? (
              <>
                {/* O número que a pessoa abriu esta aba pra ver. Um por tela. */}
                <View style={styles.fatura}>
                  <HeroFigure
                    cents={faturaCents}
                    label={`Fatura de ${formatMonthLong(month)}`}
                    caption={`${selected.nickname} · vence dia ${selected.dueDay}`}
                    // Fatura é dinheiro saindo. `auto` pintaria de verde por ser
                    // positivo — o verde comemoraria a conta.
                    tone="neutral"
                  />

                  {selectedLimitCents !== null ? (
                    <View>
                      <Meter
                        progress={limitUsage}
                        label="Parcelas do mês x limite"
                        tone={limitUsage > LIMIT_ALERT ? 'critical' : 'brand'}
                        caption={`${formatCents(faturaCents)} de ${formatCents(selectedLimitCents)}`}
                      />
                      <Reveal label="O que entra nessa conta?">
                        <AppText variant="small" tone="secondary">
                          Isto é só o que as parcelas DESTE mês ocupam do limite — não é o seu limite
                          disponível de verdade. Eu não falo com o seu banco: compra à vista,
                          anuidade e tudo que você ainda não cadastrou aqui não entram nesta conta.
                          Quem sabe o número real é o app do banco.
                        </AppText>
                      </Reveal>
                    </View>
                  ) : null}

                  {/* O único amarelo da tela. */}
                  <Button label="Nova compra" icon="add" onPress={openPurchaseSheet} size="lg" full />
                </View>

                <View>
                  <SectionHeader title="Parcelas" first />

                  {monthInstallments.length === 0 ? (
                    <AppText variant="small" tone="secondary">
                      {`Nenhuma parcela em ${formatMonthLong(month)}.`}
                    </AppText>
                  ) : (
                    <View>
                      {monthInstallments.map(({ purchase, installmentNumber, amountCents }) => (
                        <ListRow
                          key={purchase.id}
                          title={purchase.description}
                          subtitle={
                            purchase.installments === 1
                              ? 'à vista'
                              : `${installmentNumber} de ${purchase.installments}`
                          }
                          trailing={<MoneyText cents={amountCents} tone="neutral" tabular />}
                        />
                      ))}
                    </View>
                  )}
                </View>

                {timelineMax > 0 ? (
                  <View>
                    <SectionHeader title="Próximos 6 meses" first />

                    <View style={styles.timeline}>
                      {timeline.map(({ key, cents }) => (
                        <View
                          key={key}
                          accessible
                          accessibilityLabel={`${formatMonthLong(key)}: ${formatCents(cents)}`}
                          style={styles.timelineRow}
                        >
                          <AppText variant="caption" tone="muted" style={styles.timelineLabel}>
                            {formatMonthShort(key)}
                          </AppText>

                          <View
                            style={[styles.timelineTrack, { backgroundColor: colors.surfaceSunken }]}
                          >
                            {/* A largura mínima existe porque parcela pequena com
                                0,4% de barra some da tela — e "sumiu" lê-se como
                                zero, que é outro fato. */}
                            <View
                              style={[
                                styles.timelineFill,
                                cents > 0 && styles.timelineFillVisible,
                                {
                                  width: `${Math.round(ratio(cents, timelineMax) * 1000) / 10}%`,
                                  backgroundColor: timelineColor,
                                },
                              ]}
                            />
                          </View>

                          <View style={styles.timelineValue}>
                            <MoneyText cents={cents} variant="caption" tone="neutral" tabular />
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}
              </>
            ) : null}
          </>
        )}
      </View>

      <Sheet visible={cardSheet} onClose={() => setCardSheet(false)} title="Novo cartão">
        <TextField
          label="Apelido do cartão"
          value={nickname}
          onChangeText={setNickname}
          placeholder="Nubank roxo"
          maxLength={40}
          hint="Um apelido que você reconheça. Nada de número."
          autoFocus
        />

        <DayField
          label="Fecha dia"
          value={closingDay}
          onChange={setClosingDay}
          hint="Compra depois desse dia cai na fatura seguinte."
        />

        <DayField label="Vence dia" value={dueDay} onChange={setDueDay} hint="O dia de pagar." />

        <CurrencyField
          label="Limite (opcional)"
          cents={limitCents}
          onChangeCents={setLimitCents}
          hint="Só pra eu avisar quando as parcelas encostarem nele."
        />

        {saveError !== null ? (
          <AppText variant="small" tone="negative">
            {saveError}
          </AppText>
        ) : null}

        <Button label="Salvar cartão" onPress={saveCard} disabled={!cardValid} size="lg" full />
      </Sheet>

      <Sheet visible={purchaseSheet} onClose={() => setPurchaseSheet(false)} title="Nova compra">
        <TextField
          label="O que você comprou"
          value={description}
          onChangeText={setDescription}
          placeholder="Tênis, notebook, aquele rolê"
          maxLength={60}
          autoFocus
        />

        <Field label="Categoria">
          <View style={styles.chips}>
            {CATEGORIES.map((item) => (
              <Chip
                key={item.key}
                label={item.label}
                selected={category === item.key}
                onPress={() => setCategory(item.key)}
              />
            ))}
          </View>
        </Field>

        <CurrencyField
          label="Valor total da compra"
          cents={totalCents}
          onChangeCents={setTotalCents}
          hint="O preço cheio da etiqueta, não o valor da parcela."
        />

        <Field label="Em quantas vezes">
          <View style={styles.chips}>
            {INSTALLMENT_OPTIONS.map((count) => (
              <Chip
                key={count}
                label={`${count}x`}
                selected={installments === count}
                onPress={() => setInstallments(count)}
              />
            ))}
          </View>
        </Field>

        <Field label="A 1ª parcela cai em">
          <View style={styles.chips}>
            {monthOptions.map((key) => (
              <Chip
                key={key}
                label={formatMonthShort(key)}
                selected={firstMonth === key}
                onPress={() => setFirstMonth(key)}
              />
            ))}
          </View>
        </Field>

        {/*
          O melhor momento do app: a conta na cara da pessoa enquanto ela ainda
          pode dizer não. O número faz esse trabalho sozinho — o sermão que vinha
          embaixo dele ("não estou dizendo pra não comprar, mas...") só dava à
          pessoa alguém pra discutir. Sem card amarelo aqui: o amarelo já está no
          botão que salva.
        */}
        <View style={styles.preview}>
          {totalCents <= 0 ? (
            <AppText variant="small" tone="muted">
              Digita o valor que eu faço a conta.
            </AppText>
          ) : installments === 1 ? (
            <>
              <AppText variant="title">{`${formatCents(totalCents)} à vista`}</AppText>
              <AppText variant="small" tone="muted">
                {`Cai na fatura de ${formatMonthLong(firstMonth)}.`}
              </AppText>
            </>
          ) : (
            <>
              <AppText variant="title">{`${installments}x de ${formatCents(firstParcel)}`}</AppText>
              <AppText variant="small" tone="muted">
                {`Compromete até ${formatMonthLong(lastMonth)}.`}
              </AppText>

              {otherParcel !== undefined && otherParcel !== firstParcel ? (
                <Reveal label="Por que a 1ª é diferente?">
                  <AppText variant="small" tone="secondary">
                    {`A 1ª sai por ${formatCents(firstParcel)} porque absorve o arredondamento; as outras ${installments - 1} ficam em ${formatCents(otherParcel)}. Somadas, dão exatamente ${formatCents(totalCents)}.`}
                  </AppText>
                </Reveal>
              ) : null}
            </>
          )}
        </View>

        {saveError !== null ? (
          <AppText variant="small" tone="negative">
            {saveError}
          </AppText>
        ) : null}

        <Button
          label="Salvar compra"
          onPress={savePurchase}
          disabled={!purchaseValid}
          size="lg"
          full
        />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { gap: spacing.section },
  head: { gap: spacing.md },
  list: { gap: spacing.md },
  fatura: { gap: spacing.lg },
  empty: { gap: spacing.md, paddingTop: spacing.xl },

  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardBody: { flex: 1, gap: spacing.xs / 2 },
  cardTrailing: { alignItems: 'flex-end' },

  timeline: { gap: spacing.sm },
  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  timelineLabel: { width: 40 },
  timelineTrack: {
    flex: 1,
    height: 6,
    borderRadius: radius.dataEnd,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  timelineFill: { borderRadius: radius.dataEnd },
  timelineFillVisible: { minWidth: 3 },
  timelineValue: { width: 88, alignItems: 'flex-end' },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  preview: { gap: spacing.xs },
  pressed: { opacity: 0.65 },
});
