import { StyleSheet, View } from 'react-native';
import { radius, spacing, type ThemeColors } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import type { InsightSeverity } from '@/types/models';
import { AppText, useOnBrand } from './AppText';
import { Icon, type IconName } from './Icon';

export type BadgeProps = {
  label: string;
  severity: InsightSeverity;
};

/** A forma do estado. A cor sozinha nunca carrega o significado. */
function severityIcon(severity: InsightSeverity): IconName {
  switch (severity) {
    case 'critical':
      return 'danger';
    case 'serious':
      return 'alert';
    case 'warning':
      return 'eye';
    case 'good':
      return 'ok';
    case 'neutral':
      return 'info';
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
 * Um ponto, um glifo, três palavras.
 *
 * A versão anterior era uma pílula com fundo e borda colorida — e uma tela com
 * seis dessas é uma tela gritando seis vezes. Aqui a cor vira um ponto de 6px,
 * o significado fica na forma e no rótulo, e o resto é tinta de texto normal.
 *
 * Sem superfície própria de propósito: dentro de um card de marca o rótulo
 * herda `onBrand` sozinho, via contexto, em vez de fingir um fundo que não tem.
 */
export function Badge({ label, severity }: BadgeProps) {
  const { colors } = useTheme();
  const onBrand = useOnBrand();

  return (
    <View accessible accessibilityLabel={label} style={styles.root}>
      <View style={[styles.dot, { backgroundColor: severityMark(colors, severity) }]} />
      {/*
        `warning` e `serious` ficam abaixo de 3:1 no fundo claro de propósito.
        Se a cor fosse o único sinal, quem não distingue vermelho de laranja
        leria "tudo igual" — por isso a forma vem junto, sempre.
      */}
      <Icon name={severityIcon(severity)} size={12} tone={onBrand ? 'onBrand' : 'muted'} />
      <AppText variant="caption" numberOfLines={1} style={styles.label}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
  },
  dot: { width: 6, height: 6, borderRadius: radius.pill },
  label: { flexShrink: 1 },
});
