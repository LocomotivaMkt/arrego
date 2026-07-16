import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { elevation, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { InkSurface } from './AppText';

export type CardTone = 'surface' | 'brand' | 'sunken';

export type CardProps = {
  padded?: boolean;
  tone?: CardTone;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

export function Card({ padded = true, tone = 'surface', style, children }: CardProps) {
  const { colors } = useTheme();

  const background =
    tone === 'brand'
      ? colors.brand.amber
      : tone === 'sunken'
        ? colors.surfaceSunken
        : colors.surface;

  return (
    // Sempre reabre o contexto de tinta: um card `surface` dentro de um card
    // `brand` desenha superfície própria e precisa voltar à tinta do tema.
    <InkSurface onBrand={tone === 'brand'}>
      <View
        style={[
          styles.root,
          { backgroundColor: background },
          tone === 'surface' && styles.raised,
          tone === 'surface' && { borderColor: colors.border },
          padded && styles.padded,
          style,
        ]}
      >
        {children}
      </View>
    </InkSurface>
  );
}

const styles = StyleSheet.create({
  root: {
    borderRadius: radius.lg,
    // Não troque para 'hidden': no iOS, overflow recortado mata a sombra.
    overflow: 'visible',
  },
  raised: {
    ...elevation.card,
    borderWidth: StyleSheet.hairlineWidth,
  },
  padded: {
    padding: spacing.lg,
  },
});
