import { Pressable, StyleSheet, View } from 'react-native';
import { HIT_SLOP, MIN_TOUCH, spacing } from '@/theme/tokens';
import { AppText, useOnBrand } from './AppText';
import { Icon } from './Icon';

export type SectionHeaderProps = {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  /**
   * A primeira seção da tela não ganha respiro em cima — ela já está colada no
   * topo. Da segunda em diante, `spacing.section` é o que diz "mudou de assunto"
   * sem precisar de linha divisória.
   */
  first?: boolean;
};

export function SectionHeader({ title, actionLabel, onAction, first = false }: SectionHeaderProps) {
  const onBrand = useOnBrand();

  return (
    <View style={[styles.root, !first && styles.spaced]}>
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
          <AppText variant="small" tone="secondary" numberOfLines={1}>
            {actionLabel}
          </AppText>
          <Icon name="next" size={16} tone={onBrand ? 'onBrand' : 'muted'} />
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
    marginBottom: spacing.md,
  },
  spaced: { marginTop: spacing.section },
  title: { flexShrink: 1 },
  // O hitSlop sozinho não alcança o mínimo: o texto tem 18px de altura e o slop
  // soma 16, dando 34. O alvo precisa nascer com 44 — o slop é folga, não muleta.
  action: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: MIN_TOUCH },
  pressed: { opacity: 0.65 },
});
