import { StyleSheet } from 'react-native';
import type { Cents } from '@/types/models';
import { formatCents, formatCentsCompact } from '@/utils/money';
import { AppText, type TextTone, type TextVariant } from './AppText';

export type MoneyTone = 'auto' | 'neutral';

export type MoneyTextProps = {
  cents: Cents;
  variant?: TextVariant;
  signed?: boolean;
  tone?: MoneyTone;
  compact?: boolean;
  tabular?: boolean;
};

export function MoneyText({
  cents,
  variant = 'bodyStrong',
  signed = false,
  tone = 'auto',
  compact = false,
  tabular = false,
}: MoneyTextProps) {
  const formatted = compact ? formatCentsCompact(cents) : formatCents(cents);
  // `formatCents` já traz o '-'. O '+' é opcional porque só faz sentido em
  // extrato, onde o sinal é a informação — em saldo ele vira poluição.
  const text = signed && cents > 0 ? `+${formatted}` : formatted;

  // Zero não é ganho nem perda: fica na tinta neutra em vez de fingir bom humor.
  const textTone: TextTone =
    tone === 'neutral' || cents === 0 ? 'primary' : cents > 0 ? 'positive' : 'negative';

  return (
    <AppText variant={variant} tone={textTone} style={tabular ? styles.tabular : undefined}>
      {text}
    </AppText>
  );
}

const styles = StyleSheet.create({
  // Algarismo de largura fixa só onde números empilham e precisam alinhar.
  // Em número grande solto ele deixa buracos entre os dígitos.
  tabular: { fontVariant: ['tabular-nums'] },
});
