import { StyleSheet, View } from 'react-native';
import { spacing } from '@/theme/tokens';
import type { Cents } from '@/types/models';
import { formatCents } from '@/utils/money';
import { AppText } from './AppText';
import { Card } from './Card';
import { MoneyText, type MoneyTone } from './MoneyText';

export type StatTileProps = {
  label: string;
  cents: Cents;
  hint?: string;
  tone?: MoneyTone;
  icon?: string;
};

/** Feito para viver em linha (`flexDirection: 'row'`) — por isso ocupa o vão. */
export function StatTile({ label, cents, hint, tone = 'auto', icon }: StatTileProps) {
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${formatCents(cents)}${hint ? `. ${hint}` : ''}`}
      style={styles.wrapper}
    >
      <Card style={styles.card}>
        <View style={styles.head}>
          {icon ? <AppText variant="small">{icon}</AppText> : null}
          <AppText variant="caption" tone="muted" numberOfLines={1} style={styles.label}>
            {label}
          </AppText>
        </View>
        <MoneyText cents={cents} variant="heading" tone={tone} />
        {hint ? (
          <AppText variant="caption" tone="muted" numberOfLines={2}>
            {hint}
          </AppText>
        ) : null}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  card: { flex: 1, padding: spacing.md, gap: spacing.xs },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  label: { flexShrink: 1 },
});
