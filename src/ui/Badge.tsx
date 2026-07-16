import { StyleSheet, View } from 'react-native';
import { radius, spacing, type ThemeColors } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import type { InsightSeverity } from '@/types/models';
import { AppText, InkSurface } from './AppText';

export type BadgeProps = {
  label: string;
  severity: InsightSeverity;
};

function severityEmoji(severity: InsightSeverity): string {
  switch (severity) {
    case 'critical':
      return '🚨';
    case 'serious':
      return '⚠️';
    case 'warning':
      return '👀';
    case 'good':
      return '✅';
    case 'neutral':
      return 'ℹ️';
  }
}

function severityMark(colors: ThemeColors, severity: InsightSeverity): string {
  switch (severity) {
    case 'critical':
      return colors.status.critical;
    case 'serious':
      return colors.status.serious;
    case 'warning':
      return colors.status.warning;
    case 'good':
      return colors.status.good;
    case 'neutral':
      return colors.ink.muted;
  }
}

/**
 * A cor fica na BORDA e o significado no emoji + rótulo. `warning` e `serious`
 * ficam abaixo de 3:1 no fundo claro de propósito — se a cor fosse o único
 * sinal, quem não distingue vermelho de laranja leria "tudo igual".
 */
export function Badge({ label, severity }: BadgeProps) {
  const { colors } = useTheme();

  return (
    // Desenha superfície própria: dentro de um card de marca a tinta precisa
    // voltar a ser a do tema.
    <InkSurface onBrand={false}>
      <View
        accessible
        accessibilityLabel={label}
        style={[
          styles.root,
          { backgroundColor: colors.surfaceSunken, borderColor: severityMark(colors, severity) },
        ]}
      >
        <AppText variant="caption">{severityEmoji(severity)}</AppText>
        <AppText variant="caption" numberOfLines={1} style={styles.label}>
          {label}
        </AppText>
      </View>
    </InkSurface>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  label: { flexShrink: 1 },
});
