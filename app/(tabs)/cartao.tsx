/**
 * Tela "Cartão" — cartões e parcelas.
 *
 * SEM DADO DE CARTÃO. Aqui um cartão é apelido + dias do ciclo + um limite
 * opcional. Número, CVV, validade, titular e senha não são pedidos, não são
 * guardados e não têm campo — nem escondido, nem "só pra facilitar depois".
 * O aviso no topo da tela não é decoração: é a única defesa que a pessoa tem
 * contra uma tela falsa que imite esta aqui.
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
  EmptyState,
  Field,
  ListRow,
  Meter,
  MoneyText,
  Screen,
  SectionHeader,
  Sheet,
  TextField,
} from '@/ui';
import { addMonths, formatMonthLong, formatMonthShort, humanizeMonths } from '@/utils/date';
import { formatCents, ratio, splitInstallments } from '@/utils/money';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

const TIMELINE_MONTHS = 6;
const MAX_INSTALLMENTS = 24;
/** Acima disso as parcelas do mês já comeram o limite e o medidor fica vermelho. */
const LIMIT_ALERT = 0.8;

const INSTALLMENT_OPTIONS = Array.from({ length: MAX_INSTALLMENTS }, (_, index) => index + 1);

/** Rótulos espelham os de `engine/analysis` — a mesma compra não pode ter dois nomes. */
const CATEGORIES: ReadonlyArray<{ key: ExpenseCategory; label: string; icon: string }> = [
  { key: 'moradia', label: 'Moradia', icon: '🏠' },
  { key: 'contas', label: 'Contas', icon: '💡' },
  { key: 'mercado', label: 'Mercado', icon: '🛒' },
  { key: 'transporte', label: 'Transporte', icon: '🚌' },
  { key: 'saude', label: 'Saúde', icon: '💊' },
  { key: 'educacao', label: 'Educação', icon: '📚' },
  { key: 'lazer', label: 'Lazer', icon: '🎉' },
  { key: 'outros', label: 'Outros', icon: '📦' },
];

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
      totals.set(
        item.purchase.cardId,
        (totals.get(item.purchase.cardId) ?? 0) + item.amountCents,
      );
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

  const timelineMax = useMemo(
    () => Math.max(0, ...timeline.map((item) => item.cents)),
    [timeline],
  );

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
      <View style={styles.page}>
        <AppText variant="title">Cartão</AppText>

        {/* Aviso de topo, nunca de rodapé: quem precisa dele não rola a tela. */}
        <Card tone="brand">
          <View style={styles.notice}>
            <AppText variant="subheading">🔒 Eu não quero o seu cartão</AppText>
            <AppText variant="body">
              Número, CVV, validade, nome do titular, senha: nada disso é pedido aqui e nada disso
              é guardado aqui. Não existe campo pra isso. Eu preciso do apelido e dos dias de
              fechamento e vencimento — é só isso que me diz em que mês a parcela cai.
            </AppText>
            <AppText variant="bodyStrong">
              Então anota a regra: se QUALQUER tela dentro do Arrego pedir o número do cartão, o
              CVV ou a sua senha, não sou eu. É golpe. Não digita nada e fecha o app.
            </AppText>
          </View>
        </Card>

        {activeCards.length === 0 ? (
          <EmptyState
            emoji="💳"
            title="Nenhum cartão por aqui"
            body="Parcelar é o truque mais fácil do mundo: em 3 segundos você divide em 12x e o problema some. O problema não some — vira 12 problemas menores, um por mês, e você esquece de todos até a fatura chegar. Cadastra o cartão que eu te mostro o tamanho real da conta ANTES de você dizer sim."
            actionLabel="Novo cartão"
            onAction={openCardSheet}
          />
        ) : (
          <>
            <View style={styles.section}>
              <SectionHeader title="Seus cartões" />

              <View style={styles.cardList}>
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
                      <Card style={isSelected ? { borderColor: color, borderWidth: 2 } : undefined}>
                        <View style={styles.cardRow}>
                          <View style={[styles.swatch, { backgroundColor: color }]} />

                          <View style={styles.cardBody}>
                            <AppText variant="subheading" numberOfLines={1}>
                              {card.nickname}
                            </AppText>
                            <AppText variant="small" tone="secondary" numberOfLines={1}>
                              fecha dia {card.closingDay}, vence dia {card.dueDay}
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

              <Button
                label="Novo cartão"
                icon="+"
                variant="secondary"
                onPress={openCardSheet}
                full
              />
            </View>

            {selected !== null ? (
              <>
                <View style={styles.section}>
                  <SectionHeader title={`Fatura de ${formatMonthLong(month)}`} />

                  <Card style={styles.stack}>
                    <View style={styles.faturaHead}>
                      <View style={styles.faturaLabel}>
                        <AppText variant="small" tone="secondary" numberOfLines={1}>
                          {selected.nickname}
                        </AppText>
                        <AppText variant="caption" tone="muted">
                          vence dia {selected.dueDay}
                        </AppText>
                      </View>
                      <MoneyText cents={faturaCents} variant="title" tone="neutral" />
                    </View>

                    {selectedLimitCents !== null ? (
                      <View style={styles.meterBlock}>
                        <Meter
                          progress={limitUsage}
                          label="Parcelas do mês x limite"
                          tone={limitUsage > LIMIT_ALERT ? 'critical' : 'brand'}
                          caption={`${formatCents(faturaCents)} de ${formatCents(selectedLimitCents)}.`}
                        />
                        <AppText variant="small" tone="secondary">
                          Isto é só o que as parcelas DESTE mês ocupam do limite — não é o seu
                          limite disponível de verdade. Eu não falo com o seu banco: compra à
                          vista, anuidade e tudo que você ainda não cadastrou aqui não entram nesta
                          conta. Quem sabe o número real é o app do banco.
                        </AppText>
                      </View>
                    ) : null}

                    <View style={[styles.divider, { backgroundColor: colors.hairline }]} />

                    {monthInstallments.length === 0 ? (
                      <AppText variant="small" tone="secondary">
                        Nenhuma parcela caindo em {formatMonthLong(month)}. Fatura limpa. Aproveita
                        a sensação — e, se for parcelar alguma coisa, passa aqui antes de assinar.
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
                                : `parcela ${installmentNumber} de ${purchase.installments}`
                            }
                            trailing={<MoneyText cents={amountCents} tone="neutral" tabular />}
                          />
                        ))}
                      </View>
                    )}

                    <Button label="Nova compra" icon="+" onPress={openPurchaseSheet} full />
                  </Card>
                </View>

                {timelineMax > 0 ? (
                  <View style={styles.section}>
                    <SectionHeader title="Próximos 6 meses" />

                    <Card style={styles.stack}>
                      <AppText variant="small" tone="secondary">
                        As parcelas do {selected.nickname} que já estão contratadas. Cada barra é um
                        mês que já tem dono antes de você acordar.
                      </AppText>

                      <View style={styles.timeline}>
                        {timeline.map(({ key, cents }) => (
                          <View
                            key={key}
                            accessible
                            accessibilityLabel={`${formatMonthLong(key)}: ${formatCents(cents)}`}
                            style={styles.timelineRow}
                          >
                            <AppText variant="caption" tone="secondary" style={styles.timelineLabel}>
                              {formatMonthShort(key)}
                            </AppText>

                            <View
                              style={[styles.timelineTrack, { backgroundColor: colors.surfaceSunken }]}
                            >
                              {/* Magnitude, não identidade: uma cor só para os seis meses. Slot
                                  de série aqui faria o olho ler cada mês como uma categoria
                                  diferente. A largura mínima existe porque parcela pequena com
                                  0,4% de barra some da tela e "sumiu" lê-se como zero. */}
                              <View
                                style={[
                                  styles.timelineFill,
                                  cents > 0 && styles.timelineFillVisible,
                                  {
                                    width: `${Math.round(ratio(cents, timelineMax) * 1000) / 10}%`,
                                    backgroundColor: colors.brand.amber,
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
                    </Card>
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
          hint="Um apelido que VOCÊ reconheça. Nada de número: apelido mesmo."
          autoFocus
        />

        <DayField
          label="Fecha dia"
          value={closingDay}
          onChange={setClosingDay}
          hint="O dia em que a fatura fecha. Compra feita depois disso já cai na fatura do mês seguinte."
        />

        <DayField
          label="Vence dia"
          value={dueDay}
          onChange={setDueDay}
          hint="O dia de pagar."
        />

        <CurrencyField
          label="Limite (opcional)"
          cents={limitCents}
          onChangeCents={setLimitCents}
          hint="Só serve pra eu avisar quando as parcelas do mês estiverem encostando nele. Pode deixar zerado."
        />

        {saveError !== null ? (
          <AppText variant="small" tone="negative">
            {saveError}
          </AppText>
        ) : null}

        <Button
          label="Salvar cartão"
          onPress={saveCard}
          disabled={!cardValid}
          size="lg"
          full
        />
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
                icon={item.icon}
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

        {/* O momento em que esta tela mais serve pra alguma coisa: a conta na cara
            da pessoa enquanto ela ainda pode dizer não. */}
        <Card tone="brand">
          <View style={styles.preview}>
            {totalCents <= 0 ? (
              <AppText variant="body">
                Digita o valor que eu faço a conta. É de graça, e agora dói bem menos do que na
                fatura.
              </AppText>
            ) : installments === 1 ? (
              <>
                <AppText variant="title">{formatCents(totalCents)} à vista</AppText>
                <AppText variant="body">
                  Cai inteiro na fatura de {formatMonthLong(firstMonth)} e acabou. Nenhum rastro
                  nos meses seguintes.
                </AppText>
              </>
            ) : (
              <>
                <AppText variant="title">
                  {installments}x de {formatCents(firstParcel)}
                </AppText>

                {otherParcel !== undefined && otherParcel !== firstParcel ? (
                  <AppText variant="small">
                    A 1ª sai por {formatCents(firstParcel)} porque absorve o arredondamento; as
                    outras {installments - 1} ficam em {formatCents(otherParcel)}. Somadas, dão
                    exatamente {formatCents(totalCents)}.
                  </AppText>
                ) : null}

                <AppText variant="bodyStrong">
                  Isso te acompanha por {humanizeMonths(installments)}: a última parcela cai em{' '}
                  {formatMonthLong(lastMonth)}.
                </AppText>

                <AppText variant="small">
                  Não estou dizendo pra não comprar. Estou dizendo pra olhar{' '}
                  {formatMonthLong(lastMonth)} e ter certeza de que você quer esse boleto lá.
                </AppText>
              </>
            )}
          </View>
        </Card>

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
  page: { gap: spacing.xl },
  section: { gap: spacing.md },
  stack: { gap: spacing.md },

  notice: { gap: spacing.sm },

  cardList: { gap: spacing.md },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardBody: { flex: 1, gap: spacing.xs / 2 },
  cardTrailing: { alignItems: 'flex-end' },
  swatch: { width: 6, height: 40, borderRadius: radius.dataEnd },

  faturaHead: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  faturaLabel: { flexShrink: 1, gap: spacing.xs / 2 },
  meterBlock: { gap: spacing.sm },
  divider: { height: StyleSheet.hairlineWidth },

  timeline: { gap: spacing.sm },
  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  timelineLabel: { width: 40 },
  timelineTrack: {
    flex: 1,
    height: 10,
    borderRadius: radius.dataEnd,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  timelineFill: { borderRadius: radius.dataEnd },
  timelineFillVisible: { minWidth: 3 },
  timelineValue: { width: 96, alignItems: 'flex-end' },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  preview: { gap: spacing.sm },
  pressed: { opacity: 0.65 },
});
