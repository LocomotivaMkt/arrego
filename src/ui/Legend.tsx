import { StyleSheet, View } from 'react-native';
import { radius, seriesColor, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import type { CategorySlice } from '@/types/models';
import { formatCents, formatPercent } from '@/utils/money';
import { AppText } from './AppText';
import { MoneyText } from './MoneyText';

export type LegendProps = {
  slices: CategorySlice[];
};

/**
 * Obrigatória sempre que houver StackedBar.
 *
 * A paleta de série foi validada para daltonismo, mas alguns slots ficam
 * abaixo de 3:1 contra o fundo claro. Logo, a cor NUNCA é a identidade da
 * fatia: quem identifica é este rótulo. O marcador é só o índice visual que
 * amarra a linha ao pedaço da barra.
 */
export function Legend({ slices }: LegendProps) {
  const { scheme } = useTheme();

  return (
    <View style={styles.root}>
      {slices.map((slice, index) => (
        <View
          key={slice.key}
          accessible
          accessibilityLabel={`${slice.label}: ${formatCents(slice.amountCents)}, ${formatPercent(slice.share)}`}
          style={styles.row}
        >
          <View style={[styles.mark, { backgroundColor: seriesColor(scheme, index) }]} />
          <AppText variant="small" tone="secondary" numberOfLines={1} style={styles.label}>
            {slice.label}
          </AppText>
          <MoneyText cents={slice.amountCents} variant="small" tone="neutral" tabular />
          <AppText variant="caption" tone="muted" style={styles.percent}>
            {formatPercent(slice.share)}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  mark: { width: 12, height: 12, borderRadius: radius.dataEnd },
  label: { flex: 1 },
  percent: { minWidth: 38, textAlign: 'right' },
});
