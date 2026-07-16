import { Pressable, StyleSheet, View } from 'react-native';
import { MIN_TOUCH, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { AppText } from './AppText';

export type SegmentedOption = { key: string; label: string };

export type SegmentedControlProps = {
  options: SegmentedOption[];
  value: string;
  onChange: (key: string) => void;
};

export function SegmentedControl({ options, value, onChange }: SegmentedControlProps) {
  const { colors } = useTheme();

  return (
    <View
      accessibilityRole="radiogroup"
      style={[styles.root, { backgroundColor: colors.surfaceSunken }]}
    >
      {options.map((option) => {
        const selected = option.key === value;
        return (
          <Pressable
            key={option.key}
            onPress={() => onChange(option.key)}
            accessible
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            style={({ pressed }) => [
              styles.segment,
              // Amarelo é superfície: selecionado vira pastilha amarela com
              // tinta onBrand (13.3:1), nunca texto amarelo.
              selected && { backgroundColor: colors.brand.amber },
              pressed && styles.pressed,
            ]}
          >
            <AppText
              variant="small"
              numberOfLines={1}
              style={[
                styles.label,
                { color: selected ? colors.ink.onBrand : colors.ink.secondary },
              ]}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    padding: spacing.xs / 2,
    borderRadius: radius.pill,
    gap: spacing.xs / 2,
  },
  segment: {
    flex: 1,
    // Alvo cheio em vez de hitSlop: segmentos são vizinhos coladinhos e
    // hitSlop faria a área de um invadir a do outro.
    minHeight: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
  },
  label: { fontWeight: '700' },
  pressed: { opacity: 0.65 },
});
