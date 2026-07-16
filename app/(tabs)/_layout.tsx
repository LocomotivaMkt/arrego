import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { AppText } from '@/ui';
import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';

/**
 * A aba ativa é marcada por SUPERFÍCIE, não por tinta: o amarelo da marca (e o
 * `amberSoft`) não alcança contraste como texto no fundo claro, então o rótulo
 * ativo usa `ink.primary` e quem carrega a marca é a pastilha atrás do ícone.
 *
 * O glifo é emoji — bitmap colorido pelo sistema. Ele ignora `color`, então a
 * pastilha clara funciona nos dois temas sem brigar com o desenho do emoji.
 */
function TabIcon({ glyph, focused }: { glyph: string; focused: boolean }) {
  const { colors } = useTheme();

  return (
    <View style={[styles.pill, focused && { backgroundColor: colors.brand.amberSoft }]}>
      <AppText style={styles.glyph}>{glyph}</AppText>
    </View>
  );
}

export default function TabsLayout() {
  const { colors } = useTheme();

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
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ focused }) => <TabIcon glyph="🏠" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="grana"
        options={{
          title: 'Grana',
          tabBarIcon: ({ focused }) => <TabIcon glyph="💸" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="cartao"
        options={{
          title: 'Cartão',
          tabBarIcon: ({ focused }) => <TabIcon glyph="💳" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="objetivos"
        options={{
          title: 'Metas',
          tabBarIcon: ({ focused }) => <TabIcon glyph="🎯" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="aprender"
        options={{
          title: 'Aprender',
          tabBarIcon: ({ focused }) => <TabIcon glyph="📚" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  pill: {
    height: 26,
    minWidth: 46,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  glyph: { fontSize: 16, lineHeight: 20 },
  label: { fontSize: 11, fontWeight: '600' },
});
