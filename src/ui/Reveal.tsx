import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { MIN_TOUCH, spacing } from '@/theme/tokens';
import { AppText, useOnBrand } from './AppText';
import { Icon } from './Icon';

export type RevealProps = {
  /** Curto e literal: "Por quê?", "Ver a conta", "Como isso é calculado". */
  label: string;
  children: ReactNode;
};

/**
 * O mecanismo do orçamento de texto.
 *
 * A regra é que fora de /aprender e /conversa não existe parágrafo aberto por
 * padrão. Isto é onde o parágrafo vai morar: fechado, atrás de um toque, pra
 * quem quiser. A informação não some — ela para de gritar. Quem quer o número
 * vê o número; quem quer a explicação pede a explicação.
 *
 * Animação com o `Animated` do RN e nada mais: sem lib, sem LayoutAnimation
 * (que o React Native já está aposentando na arquitetura nova).
 */
export function Reveal({ label, children }: RevealProps) {
  const [expanded, setExpanded] = useState(false);
  const onBrand = useOnBrand();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: expanded ? 1 : 0,
      duration: 160,
      easing: Easing.out(Easing.quad),
      // Só opacidade e transform: roda na thread de UI e não trava com a lista.
      useNativeDriver: true,
    }).start();
  }, [expanded, progress]);

  const rotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-4, 0],
  });

  return (
    <View>
      <Pressable
        onPress={() => setExpanded((open) => !open)}
        accessible
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ expanded }}
        style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}
      >
        <AppText variant="small" tone="secondary">
          {label}
        </AppText>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Icon name="down" size={16} tone={onBrand ? 'onBrand' : 'muted'} />
        </Animated.View>
      </Pressable>

      {expanded ? (
        <Animated.View style={[styles.body, { opacity: progress, transform: [{ translateY }] }]}>
          {children}
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: MIN_TOUCH,
    alignSelf: 'flex-start',
  },
  body: { paddingTop: spacing.sm, gap: spacing.sm },
  pressed: { opacity: 0.65 },
});
