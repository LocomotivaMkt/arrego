import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { spacing } from '@/theme/tokens';

export type RowProps = {
  gap?: number;
  align?: ViewStyle['alignItems'];
  justify?: ViewStyle['justifyContent'];
  wrap?: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

/**
 * Duas coisas lado a lado. Existe pra ninguém mais escrever
 * `<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>` —
 * que foi como o app acabou com onze espaçamentos diferentes inventados na hora.
 */
export function Row({
  gap = spacing.md,
  align = 'center',
  justify,
  wrap = false,
  style,
  children,
}: RowProps) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: align,
          justifyContent: justify,
          gap,
          flexWrap: wrap ? 'wrap' : 'nowrap',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
