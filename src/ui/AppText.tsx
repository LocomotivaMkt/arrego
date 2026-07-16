import { createContext, useContext, type ReactNode } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';
import { typography, type ThemeColors } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export type TextVariant = keyof typeof typography;

export type TextTone =
  | 'primary'
  | 'secondary'
  | 'muted'
  | 'onBrand'
  | 'inverse'
  | 'positive'
  | 'negative';

/**
 * Marca "estou em cima do amarelo da marca".
 *
 * O #FFC53D aceita exatamente UMA tinta: `ink.onBrand`. Todas as outras caem
 * abaixo de 4.5:1 sobre ele — `ink.muted` dá 2.33:1, e `ink.secondary` no tema
 * escuro dá 1.13:1, ou seja, some. Por isso, dentro de uma superfície de marca
 * o `tone` é ignorado e a tinta colapsa em `onBrand`: é a regra do amarelo
 * virando estrutura em vez de convenção que alguém esquece.
 *
 * Quem desenha a PRÓPRIA superfície dentro de um card de marca (Card, Badge,
 * Sheet) reabre o contexto com `onBrand={false}` — senão herdaria tinta escura
 * sobre fundo escuro no tema escuro.
 */
const OnBrandContext = createContext(false);

export function InkSurface({ onBrand, children }: { onBrand: boolean; children: ReactNode }) {
  return <OnBrandContext.Provider value={onBrand}>{children}</OnBrandContext.Provider>;
}

export function useOnBrand(): boolean {
  return useContext(OnBrandContext);
}

export function toneColor(colors: ThemeColors, tone: TextTone): string {
  switch (tone) {
    case 'secondary':
      return colors.ink.secondary;
    case 'muted':
      return colors.ink.muted;
    case 'onBrand':
      return colors.ink.onBrand;
    case 'inverse':
      return colors.ink.inverse;
    case 'positive':
      return colors.money.positiveText;
    case 'negative':
      return colors.money.negativeText;
    case 'primary':
      return colors.ink.primary;
  }
}

export type AppTextProps = {
  variant?: TextVariant;
  tone?: TextTone;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  children: ReactNode;
};

export function AppText({
  variant = 'body',
  tone,
  style,
  numberOfLines,
  children,
}: AppTextProps) {
  const { colors } = useTheme();
  const onBrand = useOnBrand();
  const resolved: TextTone = onBrand ? 'onBrand' : (tone ?? 'primary');

  return (
    <Text
      numberOfLines={numberOfLines}
      style={[typography[variant], { color: toneColor(colors, resolved) }, style]}
    >
      {children}
    </Text>
  );
}
