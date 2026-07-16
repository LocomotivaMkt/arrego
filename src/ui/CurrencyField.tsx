import { StyleSheet, TextInput } from 'react-native';
import { MIN_TOUCH, radius, spacing, typography } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import type { Cents } from '@/types/models';
import { formatCents, maskCurrencyTyping } from '@/utils/money';
import { Field } from './Field';

export type CurrencyFieldProps = {
  label: string;
  cents: Cents;
  onChangeCents: (cents: Cents) => void;
  hint?: string;
  error?: string;
  autoFocus?: boolean;
};

/**
 * O input mais usado do app.
 *
 * Não existe "digitar vírgula": a pessoa só aperta dígitos e o valor cresce da
 * direita para a esquerda, como maquininha. '5' → R$ 0,05, '512' → R$ 5,12,
 * apagar → R$ 0,51. É o único jeito de digitar dinheiro no celular sem brigar
 * com o cursor no meio da máscara.
 *
 * O `value` sai SEMPRE de `cents`, sem estado local espelhado. Se o pai não
 * aceitar o novo valor (validação), o campo volta sozinho ao que o pai manda —
 * é o RN que reconcilia o texto nativo com o `value` a cada evento. Um estado
 * local aqui só criaria duas verdades para o mesmo número.
 */
export function CurrencyField({
  label,
  cents,
  onChangeCents,
  hint,
  error,
  autoFocus,
}: CurrencyFieldProps) {
  const { colors } = useTheme();

  const handleChangeText = (raw: string) => {
    const { cents: next } = maskCurrencyTyping(raw);
    if (next !== cents) onChangeCents(next);
  };

  return (
    <Field label={label} hint={hint} error={error}>
      <TextInput
        value={formatCents(cents)}
        onChangeText={handleChangeText}
        keyboardType="number-pad"
        autoFocus={autoFocus}
        accessibilityLabel={label}
        style={[
          styles.input,
          typography.title,
          {
            backgroundColor: colors.surfaceSunken,
            borderColor: error ? colors.status.critical : colors.border,
            color: colors.ink.primary,
          },
        ]}
      />
    </Field>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: MIN_TOUCH + spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
