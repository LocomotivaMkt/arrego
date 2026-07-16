import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { elevation, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { InkSurface } from './AppText';

export type CardTone = 'surface' | 'brand' | 'sunken';

export type CardProps = {
  padded?: boolean;
  tone?: CardTone;
  style?: StyleProp<ViewStyle>;
  /**
   * Card inteiro tocável — vira uma linha de lista grande. Sem isto, o padrão
   * é um bloco de leitura: nada de `Pressable` decorativo que anuncia "botão"
   * ao leitor de tela e não faz nada.
   */
  onPress?: () => void;
  /**
   * Só quando o conteúdo não se explica sozinho. Sem isto o leitor de tela
   * concatena os textos filhos, que costuma ser exatamente o certo.
   */
  accessibilityLabel?: string;
  children: ReactNode;
};

export function Card({
  padded = true,
  tone = 'surface',
  style,
  onPress,
  accessibilityLabel,
  children,
}: CardProps) {
  const { colors } = useTheme();

  const background =
    tone === 'brand'
      ? colors.brand.amber
      : tone === 'sunken'
        ? colors.surfaceSunken
        : colors.surface;

  // Sem borda no `surface`: o card branco pousando no plano cinza já se separa
  // sozinho. Borda em cima disso é a moldura que fazia tudo parecer formulário.
  const base: StyleProp<ViewStyle> = [
    styles.root,
    { backgroundColor: background },
    tone === 'surface' && styles.raised,
    padded && styles.padded,
    style,
  ];

  const body = onPress ? (
    <Pressable
      onPress={onPress}
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [base, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  ) : (
    <View style={base}>{children}</View>
  );

  // Sempre reabre o contexto de tinta: um card `surface` dentro de um card
  // `brand` desenha superfície própria e precisa voltar à tinta do tema.
  return <InkSurface onBrand={tone === 'brand'}>{body}</InkSurface>;
}

const styles = StyleSheet.create({
  root: {
    borderRadius: radius.card,
    // Não troque para 'hidden': no iOS, overflow recortado mata a sombra.
    overflow: 'visible',
  },
  raised: { ...elevation.card },
  padded: {
    padding: spacing.card,
  },
  pressed: { opacity: 0.65 },
});
