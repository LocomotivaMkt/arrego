/**
 * A barra de abas.
 *
 * O EMOJI DUPLICADO ("🏠 🏠 Início"): não era um `tabBarIcon` renderizado duas
 * vezes por engano aqui — era o React Navigation fazendo o que ele sempre faz.
 * O `TabBarIcon` dele chama o `tabBarIcon` DUAS vezes, uma com `focused: true`
 * e outra com `focused: false`, empilha as duas cópias no mesmo ponto
 * (position: absolute) e faz cross-fade entre elas por opacidade. É assim que a
 * aba acende quando você toca nela.
 *
 * Visualmente isso nunca apareceu: uma das cópias está sempre em opacidade 0.
 * O problema é que a cópia invisível continua sendo um NÓ DE TEXTO. O `TabIcon`
 * antigo desenhava o emoji dentro de um `<AppText>`, então as duas cópias caíam
 * na árvore de texto — que é o que o DOM e o leitor de tela leem. Daí o
 * "🏠 🏠 Início": ícone ativo, ícone inativo, rótulo.
 *
 * O `<Icon />` resolve porque ele é `accessibilityElementsHidden` +
 * `importantForAccessibility="no"`: o glifo é decorativo, quem carrega o
 * significado é o rótulo. As duas cópias continuam existindo (é o mecanismo do
 * cross-fade, não um bug), mas somem do texto e do leitor de tela. A aba passa
 * a se anunciar só como "Início".
 *
 * De quebra, o `TabIcon` antigo IGNORAVA o `color` que o navegador passa —
 * usava `focused` para trocar uma pastilha amarela atrás do emoji, e emoji
 * ignora `color` de qualquer jeito. Então `tabBarActiveTintColor` estava
 * configurado e não chegava ao ícone. Agora chega, e o cross-fade tem o que
 * fundir: tinta primária quando ativa, tinta muted quando não.
 *
 * O amarelo NÃO vira tinta de rótulo aqui — #FFC53D como texto no fundo claro
 * é ilegível (regra do amarelo, tokens.ts). Ele entra como um ponto de 4px sob
 * o ícone: marca a aba ativa com FORMA além de cor, que é o que um app não deve
 * confiar só à cor.
 */

import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { Icon, type IconName } from '@/ui';
import { Tabs } from 'expo-router';
import { StyleSheet, View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Altura da barra sem o inset. Confortável: ícone + ponto + rótulo respiram. */
const BAR_HEIGHT = 60;
/**
 * 20 + 4 de vão + 4 do ponto = 28, que é EXATAMENTE a altura da caixa de ícone
 * do React Navigation na variante `uikit` (`wrapperUikit`, 31x28 — a variante
 * padrão da barra). Um ícone de 24 estouraria a caixa e empurraria o ponto pra
 * cima do rótulo. A conta fecha de propósito; se mexer num, mexa nos outros.
 */
const ICON_SIZE = 20;
const DOT_SIZE = 4;

/**
 * O ponto é renderizado SEMPRE, transparente quando a aba não está ativa. Se
 * ele só existisse na cópia focada, as duas cópias do cross-fade teriam alturas
 * diferentes e o ícone daria um pulo de 8px no meio da transição.
 */
function TabIcon({
  name,
  color,
  focused,
}: {
  name: IconName;
  /**
   * A tinta que o navegador já escolheu entre `tabBarActiveTintColor` e
   * `tabBarInactiveTintColor`. Vem como `ColorValue` porque o RN aceita cor
   * opaca de plataforma (PlatformColor) aqui — as nossas são sempre hex do
   * tema. O `typeof` fecha o tipo sem cast: se um dia não for string, o Icon
   * cai na tinta padrão dele em vez de o app quebrar.
   */
  color: ColorValue;
  focused: boolean;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.icon}>
      <Icon name={name} size={ICON_SIZE} color={typeof color === 'string' ? color : undefined} />
      <View style={[styles.dot, focused && { backgroundColor: colors.brand.amber }]} />
    </View>
  );
}

export default function TabsLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        // Cada tela usa o `Screen` do UI kit, que já cuida do topo seguro. Um
        // header aqui empilharia dois cabeçalhos.
        headerShown: false,
        tabBarActiveTintColor: colors.ink.primary,
        tabBarInactiveTintColor: colors.ink.muted,
        tabBarLabelStyle: styles.label,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.hairline,
          borderTopWidth: StyleSheet.hairlineWidth,
          // `height` sobrescreve o cálculo do navegador, inclusive a parte que
          // ele reserva para o gesto do iOS. Então o inset volta aqui na mão —
          // sem isso, a última linha da barra fica embaixo do risquinho do
          // iPhone.
          height: BAR_HEIGHT + insets.bottom,
          paddingTop: spacing.sm,
          paddingBottom: insets.bottom,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="home" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="grana"
        options={{
          title: 'Grana',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="money" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="cartao"
        options={{
          title: 'Cartão',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="card" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="objetivos"
        options={{
          title: 'Metas',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="target" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="conversa"
        options={{
          title: 'Arrego',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="chat" color={color} focused={focused} />
          ),
        }}
      />
      {/*
        Aprender continua existindo e navegável (/(tabs)/aprender), mas sai da
        barra: `href: null` esconde o botão sem apagar a rota. Conteúdo de
        referência, que se lê uma vez, não disputa espaço com uma conversa de
        uso semanal, e seis abas não respiram numa tela de 375px. A porta pra
        ele fica no Início e na conta, numa linha discreta.
      */}
      <Tabs.Screen name="aprender" options={{ href: null, title: 'Aprender' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
  label: { fontSize: 11, fontWeight: '600' },
});
