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
 * A figura-herói: o número que a pessoa abre o app para ver. Variante `hero`
 * (44px) com algarismos proporcionais — tabular aqui abriria vãos no meio do
 * número e mataria o impacto.
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
      <MoneyText cents={cents} variant="hero" tone={tone} />
      {caption ? (
        <AppText variant="small" tone="secondary">
          {caption}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.xs },
});
