import { Pressable, StyleSheet } from 'react-native';
import { MIN_TOUCH, palette, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { AppText, type TextVariant } from './AppText';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'lg';

export type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  icon?: string;
  full?: boolean;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  icon,
  full = false,
}: ButtonProps) {
  const { colors } = useTheme();

  const background =
    variant === 'primary'
      ? colors.brand.amber
      : variant === 'danger'
        ? colors.status.critical
        : variant === 'secondary'
          ? colors.surface
          : undefined;

  const ink =
    variant === 'primary'
      ? colors.ink.onBrand
      : variant === 'danger'
        ? // O preenchimento `status.critical` é fixo nos dois temas, então a
          // tinta também tem que ser: branco dá 4.8:1 sobre ele. `ink.inverse`
          // viraria tinta escura no tema escuro e cairia para 3.8:1.
          palette.light.ink.inverse
        : colors.ink.primary;

  const textVariant: TextVariant = size === 'lg' ? 'subheading' : 'bodyStrong';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.root,
        {
          minHeight: size === 'lg' ? MIN_TOUCH + spacing.md : MIN_TOUCH,
          paddingHorizontal: size === 'lg' ? spacing.xl : spacing.lg,
          backgroundColor: background,
          borderWidth: variant === 'secondary' ? StyleSheet.hairlineWidth : 0,
          borderColor: colors.border,
          alignSelf: full ? 'stretch' : 'flex-start',
        },
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      {/*
        O ícone leva a MESMA tinta do rótulo. Sem isso ele cai no default do
        AppText (ink.primary), que no tema escuro é branco — e branco sobre o
        amarelo da marca dá 1.58:1. Emoji ignora `color` e mascara o problema;
        um glifo de texto como "+" o acende na hora.
      */}
      {icon ? (
        <AppText variant={textVariant} style={{ color: ink }}>
          {icon}
        </AppText>
      ) : null}
      <AppText variant={textVariant} numberOfLines={1} style={{ color: ink }}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.pill,
  },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.65 },
});
