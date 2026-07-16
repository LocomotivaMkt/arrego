import { Pressable, StyleSheet, View } from 'react-native';
import { MIN_TOUCH, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { AppText } from './AppText';
import { Field } from './Field';

export type DayFieldProps = {
  label: string;
  value: number | null;
  onChange: (day: number | null) => void;
  hint?: string;
};

const DAYS = Array.from({ length: 31 }, (_, index) => index + 1);

/**
 * Dia do mês em grade, não em date picker: o picker nativo pede uma DATA
 * completa e aqui só existe o dia — a pessoa escolheria "5 de julho de 2026"
 * para dizer "todo dia 5". Tocar no dia já escolhido limpa a escolha; é o
 * único caminho de volta para `null`.
 */
export function DayField({ label, value, onChange, hint }: DayFieldProps) {
  const { colors } = useTheme();

  return (
    <Field label={label} hint={hint}>
      <View style={styles.grid} accessibilityRole="radiogroup">
        {DAYS.map((day) => {
          const selected = value === day;
          return (
            <Pressable
              key={day}
              onPress={() => onChange(selected ? null : day)}
              accessible
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`Dia ${day}`}
              style={({ pressed }) => [
                styles.day,
                {
                  backgroundColor: selected ? colors.brand.amber : colors.surfaceSunken,
                  borderColor: selected ? colors.brand.amberDeep : colors.border,
                },
                pressed && styles.pressed,
              ]}
            >
              <AppText
                variant="small"
                style={[styles.number, { color: selected ? colors.ink.onBrand : colors.ink.secondary }]}
              >
                {day}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </Field>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  day: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  number: { fontWeight: '700' },
  pressed: { opacity: 0.65 },
});
