import { Pressable, StyleSheet, View } from 'react-native';
import { HIT_SLOP, MIN_TOUCH, spacing } from '@/theme/tokens';
import { AppText } from './AppText';

export type SectionHeaderProps = {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  return (
    <View style={styles.root}>
      <AppText variant="heading" numberOfLines={1} style={styles.title}>
        {title}
      </AppText>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          hitSlop={HIT_SLOP}
          accessible
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <AppText variant="small" style={styles.actionLabel}>
            {actionLabel}
          </AppText>
          <AppText variant="small" tone="muted">
            ›
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  title: { flexShrink: 1 },
  // O hitSlop sozinho não alcança o mínimo: o texto tem 20px de altura e o slop
  // soma 16, dando 36. O alvo precisa nascer com 44 — o slop é folga, não muleta.
  action: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: MIN_TOUCH },
  actionLabel: { fontWeight: '700' },
  pressed: { opacity: 0.65 },
});
