import { Pressable, StyleSheet, View } from 'react-native';
import { HIT_SLOP, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { AppText } from './AppText';

export type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: string;
  color?: string;
  /**
   * Temporariamente inativo, mas ainda é um botão.
   *
   * Use isto em vez de anular `onPress`: sem `onPress` o chip vira um `View`
   * decorativo e SOME do leitor de tela. Quem enxerga vê um botão apagado
   * esperando; quem usa leitor vê a lista de opções desaparecer e voltar do
   * nada. `disabled` mantém o botão anunciado e só diz que ele está inativo.
   */
  disabled?: boolean;
};

/**
 * `color` é só um marcador (categoria, cartão). Ele nunca vira a tinta do
 * rótulo: slots de série podem ficar abaixo de 3:1 no fundo claro, e a
 * identidade do chip é o texto — a bolinha é reforço, não significado.
 */
export function Chip({
  label,
  selected = false,
  onPress,
  icon,
  color,
  disabled = false,
}: ChipProps) {
  const { colors } = useTheme();

  // SELEÇÃO NÃO É AMARELO — e este componente foi a origem do problema.
  //
  // O chip marcado era `brand.amber`. Como toda folha do app tem dois ou três
  // grupos de chips com um default sempre marcado, cada formulário nascia com
  // três pílulas amarelas + o botão amarelo: quatro superfícies de marca
  // apontando pra lados diferentes, que é literalmente a estética que fez o
  // dono dizer "parece um golpe". A REGRA DO AMARELO (tokens.ts) põe estado
  // ativo na ÚLTIMA precedência, atrás do botão da ação principal.
  //
  // Marcado agora é tinta cheia: fundo `ink.primary` com rótulo `ink.inverse`.
  const surface = [
    styles.root,
    {
      backgroundColor: selected ? colors.ink.primary : colors.surfaceSunken,
      borderColor: selected ? colors.ink.primary : colors.border,
    },
  ];

  // Ícone e rótulo compartilham a tinta: sem isso o ícone cai no default
  // (ink.primary) e some sobre o fundo escuro do chip selecionado.
  const ink = selected ? colors.ink.inverse : colors.ink.secondary;

  const content = (
    <>
      {color ? <View style={[styles.dot, { backgroundColor: color }]} /> : null}
      {icon ? (
        <AppText variant="small" style={{ color: ink }}>
          {icon}
        </AppText>
      ) : null}
      <AppText variant="small" numberOfLines={1} style={[styles.label, { color: ink }]}>
        {label}
      </AppText>
    </>
  );

  if (!onPress) {
    return <View style={surface}>{content}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={HIT_SLOP}
      accessible
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        surface,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 34,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dot: { width: 8, height: 8, borderRadius: radius.pill },
  label: { fontWeight: '600', flexShrink: 1 },
  pressed: { opacity: 0.65 },
  disabled: { opacity: 0.4 },
});
