import { StyleSheet, View } from 'react-native';
import { spacing } from '@/theme/tokens';
import type { Cents } from '@/types/models';
import { formatCents } from '@/utils/money';
import { AppText } from './AppText';
import { MoneyText, type MoneyTone } from './MoneyText';

export type HeroFigureProps = {
  cents: Cents;
  label: string;
  caption?: string;
  tone?: MoneyTone;
};

/**
 * O número que a pessoa abre o app pra ver. Um por tela.
 *
 * O rótulo vem ACIMA porque é essa a ordem da leitura: primeiro a pergunta
 * ("sobra pra dividir"), depois a resposta. Rótulo embaixo obriga a ler o
 * número duas vezes — uma pra ver, outra pra entender do que era.
 *
 * Sem borda e sem card próprio de propósito: quem embrulha é o chamador. Assim
 * a mesma figura serve solta no plano ou dentro do card amarelo do mês, sem
 * virar card dentro de card.
 */
export function HeroFigure({ cents, label, caption, tone = 'auto' }: HeroFigureProps) {
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${formatCents(cents)}${caption ? `. ${caption}` : ''}`}
      style={styles.root}
    >
      <AppText variant="caption" tone="muted" numberOfLines={1}>
        {label}
      </AppText>
      {/* `hero` usa algarismo proporcional: tabular abriria vãos no meio do número. */}
      <MoneyText cents={cents} variant="hero" tone={tone} />
      {caption ? (
        <AppText variant="small" tone="secondary" numberOfLines={2}>
          {caption}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.xs },
});
