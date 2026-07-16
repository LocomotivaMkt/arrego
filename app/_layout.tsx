import { useArrego } from '@/store/useArrego';
import { useTheme } from '@/theme/useTheme';
import { AppText, InkSurface } from '@/ui';
import { Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

/**
 * Splash de hidratação. Fica POR CIMA do Stack (absoluteFill), não no lugar
 * dele — ver RootLayout.
 *
 * O fundo é o amarelo da marca, então a tinta é `ink.onBrand` — branco sobre
 * #FFC53D dá 1.58:1 e simplesmente some. `InkSurface` faz isso virar estrutura:
 * qualquer AppText aqui dentro já nasce com a tinta certa, sem depender de
 * alguém lembrar de passar `tone`.
 */
function Splash() {
  const { colors } = useTheme();

  return (
    <View style={[styles.splash, { backgroundColor: colors.brand.amber }]}>
      <InkSurface onBrand>
        <AppText variant="hero">Arrego</AppText>
        <AppText variant="body">Contando seu dinheiro. Sem julgar. Muito.</AppText>
      </InkSurface>
    </View>
  );
}

/**
 * Porta do onboarding.
 *
 * Comparar com o local ATUAL antes de navegar é o que evita o loop: um
 * `replace` incondicional muda a rota, o efeito roda de novo por causa da
 * mudança e dispara outro `replace` para o mesmo lugar — para sempre.
 *
 * `hydrated` não significa "deu certo", significa "a tentativa terminou" (ver
 * store). Se a leitura falhou, `profile` é null e a pessoa cai no onboarding:
 * é o comportamento certo para o primeiro uso e o menos pior para uma falha de
 * disco — a tela de onboarding mostra o erro em vez de um spinner eterno.
 */
function useOnboardingGate(hydrated: boolean, onboarded: boolean): boolean {
  const segments = useSegments();
  const router = useRouter();
  const rootState = useRootNavigationState();

  // `typedRoutes` faz os segmentos virarem união de literais. Alargar para
  // string antes de comparar evita o erro de "sem sobreposição" quando a rota
  // ainda não foi gerada em `.expo/types`.
  const first: string | undefined = segments[0];
  const inOnboarding = first === 'onboarding';

  useEffect(() => {
    // `key` só existe depois que o navegador raiz montou. Navegar antes disso
    // é erro de runtime do expo-router, não aviso ignorável.
    if (!hydrated || !rootState?.key) return;

    if (!onboarded && !inOnboarding) {
      router.replace('/onboarding');
    } else if (onboarded && inOnboarding) {
      router.replace('/(tabs)');
    }
  }, [hydrated, onboarded, inOnboarding, rootState?.key, router]);

  // "A rota montada embaixo ainda é a errada." Quem chama usa isso para cobrir
  // a tela: o Stack precisa estar montado para `rootState.key` existir, mas a
  // rota inicial é o dashboard — sem a cobertura, ele pinta por um frame antes
  // de o replace levar a pessoa para o onboarding.
  return hydrated && !onboarded && !inOnboarding;
}

export default function RootLayout() {
  const { colors, isDark } = useTheme();
  const hydrate = useArrego((state) => state.hydrate);
  const hydrated = useArrego((state) => state.hydrated);
  const profile = useArrego((state) => state.profile);

  // A store deduplica chamadas concorrentes, então o duplo-monte do StrictMode
  // não vira duas leituras do banco disputando o mesmo `set`.
  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const onboarded = profile?.onboardedAt != null;
  const redirecting = useOnboardingGate(hydrated, onboarded);

  // O Stack fica montado SEMPRE, e o splash cobre por cima. Trocar um pelo
  // outro parece mais limpo e é o bug: o gate só pode navegar depois que o
  // navegador raiz monta, então montar o Stack só ao hidratar obriga a rota
  // inicial (o dashboard) a pintar antes de o replace acontecer. Com o Stack
  // montado desde o frame 1, `rootState.key` existe cedo e o replace sai antes
  // de a cobertura sair. Só funciona porque o dashboard aguenta banco vazio.
  const covered = !hydrated || redirecting;

  return (
    // O provider fica montado nos dois estados: trocá-lo junto com o splash
    // remontaria a árvore inteira e os insets voltariam a zero por um frame.
    <SafeAreaProvider>
      {/* Coberto = fundo amarelo, e aí quem manda na barra é o amarelo, não o tema. */}
      <StatusBar style={covered || !isDark ? 'dark' : 'light'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.ink.primary,
          headerTitleStyle: { color: colors.ink.primary, fontWeight: '700' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.plane },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="perfil" options={{ title: 'Sua conta' }} />
        <Stack.Screen name="conversa" options={{ title: 'Falar com a Arrego' }} />
      </Stack>
      {covered ? <Splash /> : null}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    // RN 0.86 removeu `absoluteFillObject`: agora `absoluteFill` já É o objeto
    // puro (era ele que precisava do sufixo por ser um estilo registrado).
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
