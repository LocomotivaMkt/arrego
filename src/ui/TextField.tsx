import { StyleSheet, TextInput } from 'react-native';
import { MIN_TOUCH, radius, spacing, typography } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { Field } from './Field';

export type TextFieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  /** Saiu do campo. É onde salvar: gravar a cada tecla escreve no disco à toa. */
  onBlur?: () => void;
  placeholder?: string;
  hint?: string;
  error?: string;
  autoFocus?: boolean;
  maxLength?: number;
};

export function TextField({
  label,
  value,
  onChangeText,
  onBlur,
  placeholder,
  hint,
  error,
  autoFocus,
  maxLength,
}: TextFieldProps) {
  const { colors } = useTheme();

  return (
    <Field label={label} hint={hint} error={error}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        placeholder={placeholder}
        placeholderTextColor={colors.ink.muted}
        autoFocus={autoFocus}
        maxLength={maxLength}
        accessibilityLabel={label}
        style={[
          styles.input,
          typography.body,
          {
            backgroundColor: colors.surfaceSunken,
            // A borda vermelha reforça o erro, mas quem informa é o texto do
            // Field logo abaixo — cor sozinha não conta nada a ninguém.
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
    minHeight: MIN_TOUCH,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
