import { StyleSheet, View } from 'react-native';
import { spacing } from '@/theme/tokens';
import { AppText } from './AppText';
import { Button } from './Button';

export type EmptyStateProps = {
  emoji: string;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ emoji, title, body, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.root}>
      <AppText style={styles.emoji}>{emoji}</AppText>
      <AppText variant="heading" style={styles.centered}>
        {title}
      </AppText>
      <AppText variant="body" tone="secondary" style={styles.centered}>
        {body}
      </AppText>
      {actionLabel && onAction ? (
        <View style={styles.action}>
          <Button label={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  emoji: { fontSize: 44, lineHeight: 52 },
  centered: { textAlign: 'center' },
  action: { marginTop: spacing.sm, alignItems: 'center' },
});
