import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HIT_SLOP, palette, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { AppText, InkSurface } from './AppText';
import { Icon } from './Icon';

export type SheetProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

export function Sheet({ visible, onClose, title, children }: SheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* O véu é sempre a tinta escura, nos dois temas: ele escurece o app que
          ficou atrás. `colors.ink.primary` viraria branco no tema escuro e
          clarearia a tela em vez de apagá-la. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Fechar"
        onPress={onClose}
        style={[
          StyleSheet.absoluteFill,
          styles.scrim,
          { backgroundColor: palette.light.ink.primary },
        ]}
      />

      <KeyboardAvoidingView
        pointerEvents="box-none"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.dock}
      >
        {/* A folha é portal: sai da árvore nativa, mas não da árvore React.
            Sem reabrir o contexto, uma Sheet dentro de um card de marca
            herdaria tinta onBrand sobre a superfície do tema. */}
        <InkSurface onBrand={false}>
          <View
            style={[
              styles.sheet,
              { backgroundColor: colors.surface, paddingBottom: insets.bottom + spacing.md },
            ]}
          >
            <View style={[styles.grip, { backgroundColor: colors.hairline }]} />

            <View style={styles.header}>
              <AppText variant="heading" numberOfLines={1} style={styles.title}>
                {title}
              </AppText>
              <Pressable
                onPress={onClose}
                hitSlop={HIT_SLOP}
                accessible
                accessibilityRole="button"
                accessibilityLabel="Fechar"
                style={({ pressed }) => [
                  styles.close,
                  { backgroundColor: colors.surfaceSunken },
                  pressed && styles.pressed,
                ]}
              >
                {/*
                  Ícone, não o caractere ✕ solto num nó de texto: o glifo de
                  texto ignora a tinta do tema, desalinha em cada sistema e o
                  leitor de tela o anuncia junto do conteúdo. É a mesma classe
                  de erro que duplicou o emoji nas abas.
                */}
                <Icon name="close" tone="secondary" />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          </View>
        </InkSurface>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { opacity: 0.45 },
  dock: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '90%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
  },
  grip: {
    width: 40,
    height: 4,
    borderRadius: radius.dataEnd,
    alignSelf: 'center',
    marginTop: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  title: { flexShrink: 1 },
  close: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  content: { paddingBottom: spacing.lg, gap: spacing.lg },
  pressed: { opacity: 0.65 },
});
