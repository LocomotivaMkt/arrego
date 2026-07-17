/**
 * A retrospectiva do mês — o retrato do fechamento pelos NOMES dos gastos.
 *
 * A tela não faz conta: `useReview` entrega tudo mastigado pelo motor
 * (`@/engine/retrospect`), memoizado por identidade dos dados. O que mora aqui é
 * composição e hierarquia.
 *
 * O assunto são as DICAS: o que fazer no mês que vem. O número grande é só o
 * contexto (quanto saiu), e os padrões são a prova de onde o dinheiro repetiu.
 * Mês que ainda não fechou não recebe veredito — a régua é do motor, não daqui.
 */

import { router, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { REVIEW_FROM_DAY } from '@/engine/retrospect';
import { useArrego, useReview } from '@/store/useArrego';
import { spacing } from '@/theme/tokens';
import type { CategorySlice } from '@/types/models';
import { formatMonthLong } from '@/utils/date';
import { formatCents } from '@/utils/money';
import {
  AppText,
  Button,
  Card,
  HeroFigure,
  Icon,
  Legend,
  ListRow,
  Reveal,
  Screen,
  SectionHeader,
  StackedBar,
  type IconName,
} from '@/ui';

const ROTA_GRANA = '/(tabs)/grana';

/**
 * O motor não conhece o expo-router; o cast fica preso aqui, num lugar só, e a
 * rota é uma constante deste arquivo, nunca texto vindo de fora.
 */
function abrir(href: string): void {
  router.push(href as Href);
}

/** Só o nome do mês, sem o ano: "julho" a partir de "julho de 2026". */
function monthName(mesLongo: string): string {
  return mesLongo.split(' de ')[0] ?? mesLongo;
}

/**
 * Estado calmo e centrado: ícone de linha em cinza, título curto, uma frase e
 * uma ação opcional. Mesmo formato do vazio do Início — sem emoji, sem enfeite.
 */
function Aviso({
  icon,
  title,
  line,
  actionLabel,
  onAction,
}: {
  icon: IconName;
  title: string;
  line: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.aviso}>
      <Icon name={icon} size={32} tone="muted" />
      <AppText variant="subheading" style={styles.centrado}>
        {title}
      </AppText>
      <AppText variant="small" tone="muted" style={styles.centrado}>
        {line}
      </AppText>
      {actionLabel && onAction ? (
        <View style={styles.avisoAcao}>
          {/* Único amarelo possível aqui: não há card de destaque, então a
              precedência cai no botão da ação principal. */}
          <Button label={actionLabel} onPress={onAction} variant="primary" />
        </View>
      ) : null}
    </View>
  );
}

export default function Retrospectiva() {
  const review = useReview();
  const month = useArrego((state) => state.month);

  const mesLongo = formatMonthLong(month);
  const mes = monthName(mesLongo);

  // Mês que não fechou não recebe veredito: dizer "você gastou X" no dia 8
  // sugere um julgamento sobre um mês que mal começou. A régua é do motor.
  if (!review.ready) {
    return (
      <Screen scroll>
        <Aviso
          icon="calendar"
          title="O mês ainda não fechou"
          line={`A retrospectiva sai nos últimos dias, a partir do dia ${REVIEW_FROM_DAY}. Até lá, o mês ainda está acontecendo.`}
        />
      </Screen>
    );
  }

  // Sem gasto avulso não há nome pra ler, e é o nome que faz esta tela existir.
  if (review.entryCount === 0) {
    return (
      <Screen scroll>
        <Aviso
          icon="cash"
          title="Nada pra revisar ainda"
          line="Esta tela lê o nome dos seus gastos avulsos: um lanche, o pão, a corrida de app. Anota alguns e eu monto o retrato do mês."
          actionLabel="Anotar um gasto"
          onAction={() => abrir(ROTA_GRANA)}
        />
      </Screen>
    );
  }

  // Os padrões viram fatias de gráfico. O índice de cor é a posição na lista, e
  // a Legend percorre a mesma lista — as duas ficam alinhadas.
  const patternSlices: CategorySlice[] = review.hits.map((hit) => ({
    key: hit.pattern.key,
    label: hit.pattern.label,
    amountCents: hit.totalCents,
    share: hit.share,
  }));

  // A dica de maior peso lidera a fala da Arrego. Nenhum banco de `persona.ts`
  // descreve um vazamento de gasto sem mentir (o de assinatura fala de outra
  // coisa), então o contrato manda usar a própria manchete da dica. A lista
  // logo abaixo a repete com ícone e evidência — a linha aqui é o resumo.
  const topTip = review.tips[0];

  return (
    <Screen scroll>
      <View style={styles.stack}>
        {/*
          O ÚNICO amarelo da tela. Aponta pro número que resume o mês. Dentro da
          superfície de marca o texto colapsa em `onBrand` por contrato do kit —
          por isso o total não fica vermelho: quem diz "isto saiu" é o rótulo.
        */}
        <Card tone="brand" style={styles.hero}>
          <HeroFigure cents={review.totalSpentCents} label={`Saiu da sua conta em ${mes}`} />
        </Card>

        {/* A linha da Arrego: o achado principal do mês, em uma frase. */}
        {topTip ? (
          <AppText variant="body" tone="secondary">
            {topTip.headline}
          </AppText>
        ) : null}

        {/* Onde a pessoa aprende a escrever nomes melhores. */}
        <AppText variant="small" tone="muted">
          Eu agrupo pelo nome que você escreve em cada gasto. Nome claro, retrato mais certeiro.
        </AppText>

        {/* AS DICAS — o assunto da tela. Já vêm ordenadas por peso pelo motor. */}
        <View>
          <SectionHeader title="Como seguir mês que vem" first />
          {review.tips.map((tip) => (
            <ListRow
              key={tip.id}
              leading={<Icon name={tip.icon} />}
              title={tip.headline}
              subtitle={tip.evidence}
            />
          ))}
        </View>

        {/*
          OS PADRÕES. Só desenha quando há hit: gráfico vazio não informa nada,
          só ocupa espaço. Cada padrão abre nos nomes que caíram nele — a prova
          de que o agrupamento faz sentido.
        */}
        {review.hits.length > 0 ? (
          <View>
            <SectionHeader title="O que se repetiu" first />
            <View style={styles.grafico}>
              <StackedBar slices={patternSlices} />
              <Legend slices={patternSlices} />
              {review.hits.map((hit) => (
                <Reveal key={hit.pattern.key} label={`${hit.pattern.label}: quais foram?`}>
                  <AppText variant="small" tone="secondary">
                    {hit.labels.join(', ')}
                  </AppText>
                </Reveal>
              ))}
            </View>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // O que separa dois assuntos é o espaço. Borda divide; espaço organiza.
  stack: { gap: spacing.section },

  // Respiro maior que o do card padrão: é o número principal da tela.
  hero: { padding: spacing.xl },

  grafico: { gap: spacing.md },

  aviso: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  avisoAcao: { marginTop: spacing.sm },
  centrado: { textAlign: 'center' },
});
