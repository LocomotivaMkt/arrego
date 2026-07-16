import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { AppText, useOnBrand } from './AppText';
import { Icon } from './Icon';

/** Acima do mínimo de toque de propósito: linha de banco respira. */
const ROW_MIN_HEIGHT = 60;
/** Vão fixo do `leading`. Fixo é o ponto: avatar e ícone alinham em coluna. */
const LEADING_SIZE = 40;

export type ListRowProps = {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  /**
   * Fio embaixo, recuado até o texto. Padrão desligado: quem separa duas
   * linhas é o espaço. Ligue só quando a lista for longa e densa.
   */
  divider?: boolean;
  /**
   * `critical` é a linha destrutiva ("Apagar tudo") de qualquer app de banco:
   * vermelha como TEXTO, não como bloco. Um botão vermelho inteiro grita, e
   * aqui quem protege a pessoa é o Alert de confirmação, não a cor.
   */
  tone?: 'default' | 'critical';
  /** Sobrepõe o rótulo montado a partir de título+subtítulo. */
  accessibilityLabel?: string;
};

/**
 * A linha padrão do app. Ícone/avatar num vão fixo, título, valor à direita.
 * Sem card dentro de card, sem borda em volta: uma lista é uma coluna de texto
 * alinhado, e é o alinhamento que a faz parecer arrumada.
 */
export function ListRow({
  title,
  subtitle,
  leading,
  trailing,
  onPress,
  onLongPress,
  divider = false,
  tone = 'default',
  accessibilityLabel,
}: ListRowProps) {
  const { colors } = useTheme();
  const onBrand = useOnBrand();

  /*
    O vermelho de TEXTO é `money.negativeText`, não `status.critical`.
    `status.critical` é um step de MARCA (preenchimento de botão, borda de erro,
    trilho de medidor): sobre a superfície do tema escuro ele dá 3.69:1 e não
    alcança os 4.5:1 de texto. `money.negativeText` é o step de tinta e vira
    junto com o tema — 6.7:1 no claro, 5.65:1 no escuro. É a mesma distinção
    "marca ≠ tinta" que o tokens.ts faz no dinheiro, aplicada ao risco.

    Dentro de uma superfície de marca a tinta colapsa em onBrand: vermelho sobre
    o amarelo não sobrevive, e o contexto do AppText mandaria nele de qualquer
    jeito — melhor não fingir que a cor foi aplicada.
  */
  const critical = tone === 'critical' && !onBrand;

  const content = (
    <>
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <View style={styles.body}>
        <AppText
          variant="bodyStrong"
          numberOfLines={1}
          style={critical ? { color: colors.money.negativeText } : undefined}
        >
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="small" tone="muted" numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      {/*
        A afordância de que dá pra tocar. Automática porque "linha que abre algo"
        sem seta é uma linha que ninguém descobre — e seta em linha que não abre
        nada é uma promessa quebrada.
      */}
      {onPress ? <Icon name="next" tone={onBrand ? 'onBrand' : 'muted'} /> : null}
    </>
  );

  const row =
    !onPress && !onLongPress ? (
      <View style={styles.root}>{content}</View>
    ) : (
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        accessible
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? (subtitle ? `${title}, ${subtitle}` : title)}
        style={({ pressed }) => [styles.root, pressed && styles.pressed]}
      >
        {content}
      </Pressable>
    );

  if (!divider) {
    return row;
  }

  return (
    <View>
      {row}
      {/*
        Recuado até onde o texto começa, nunca de ponta a ponta: o fio que
        atravessa a tela inteira corta a lista em fatias; o recuado só encosta
        as linhas umas nas outras. É o que todo app de banco faz.
      */}
      <View
        style={[
          styles.divider,
          {
            backgroundColor: colors.hairline,
            marginLeft: leading ? LEADING_SIZE + spacing.md : 0,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: ROW_MIN_HEIGHT,
    paddingVertical: spacing.sm,
  },
  leading: {
    width: LEADING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: spacing.xs / 2 },
  trailing: { alignItems: 'flex-end' },
  divider: { height: StyleSheet.hairlineWidth },
  pressed: { opacity: 0.65 },
});
