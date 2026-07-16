import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { spacing } from '@/theme/tokens';
import { AppText } from './AppText';

export type FieldProps = {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
};

/** Erro substitui a dica: dois textos embaixo do campo brigam pela leitura. */
export function Field({ label, hint, error, children }: FieldProps) {
  return (
    <View style={styles.root}>
      <AppText variant="caption" tone="secondary">
        {label}
      </AppText>
      {children}
      {error ? (
        <AppText variant="small" tone="negative" style={styles.footnote}>
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="small" tone="muted" style={styles.footnote}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.xs },
  footnote: { marginTop: spacing.xs / 2 },
});
