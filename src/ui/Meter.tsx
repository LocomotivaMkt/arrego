import { StyleSheet, View } from 'react-native';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { formatPercent } from '@/utils/money';
import { AppText } from './AppText';

export type MeterTone = 'brand' | 'good' | 'critical';

export type MeterProps = {
  progress: number;
  label?: string;
  caption?: string;
  tone?: MeterTone;
  /**
   * Espessura do trilho. O padrão (10) é a barra que É o assunto — "quanto de X
   * cabe em Y" no meio da tela. Um valor baixo (3) é a barra que só marca
   * andamento no topo de um fluxo: informa sem pedir atenção.
   */
  height?: number;
  /**
   * Rótulo só para leitor de tela. Existe para a barra sem `label` visível:
   * "Passo 3 de 5" continua sendo anunciado sem virar texto na tela. Sem isto,
   * a barra muda no ar e quem não a enxerga só ouve "Progresso, 60%".
   */
  accessibilityLabel?: string;
};

/**
 * Uma razão contra um limite — quanto de X cabe em Y. Barra, não pizza: pizza
 * de duas fatias faz o olho comparar ângulo, e ângulo se compara mal. Aqui a
 * comparação é comprimento, que o olho acerta.
 */
export function Meter({
  progress,
  label,
  caption,
  tone = 'brand',
  height = 10,
  accessibilityLabel,
}: MeterProps) {
  const { colors } = useTheme();

  // NaN e Infinity chegam de divisão por renda zero. Ambos viram 0 aqui em vez
  // de virar uma barra com largura 'NaN%' que o RN silenciosamente ignora.
  const clamped = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0;
  const percent = Math.round(clamped * 1000) / 10;

  const fill =
    tone === 'good'
      ? colors.status.good
      : tone === 'critical'
        ? colors.status.critical
        : colors.brand.amber;

  return (
    <View style={styles.root}>
      {label ? (
        <View style={styles.head}>
          <AppText variant="small" tone="secondary" numberOfLines={1} style={styles.label}>
            {label}
          </AppText>
          <AppText variant="caption" tone="secondary">
            {formatPercent(clamped)}
          </AppText>
        </View>
      ) : null}

      <View
        accessibilityRole="progressbar"
        accessibilityLabel={accessibilityLabel ?? label ?? 'Progresso'}
        accessibilityValue={{ min: 0, max: 100, now: Math.round(percent) }}
        style={[styles.track, { height, backgroundColor: colors.surfaceSunken }]}
      >
        <View style={[styles.fill, { width: `${percent}%`, backgroundColor: fill }]} />
      </View>

      {caption ? (
        <AppText variant="caption" tone="muted">
          {caption}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.xs },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  label: { flexShrink: 1 },
  // A altura sai da prop (padrão 10) para não haver duas fontes da verdade.
  track: {
    borderRadius: radius.dataEnd,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  fill: {
    borderRadius: radius.dataEnd,
  },
});
