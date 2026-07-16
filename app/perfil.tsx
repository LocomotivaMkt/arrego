/**
 * Sua conta — perfil e a promessa de privacidade escrita com todas as letras,
 * incluindo a parte ruim.
 *
 * O card "Seus dados" não é texto de marketing: é a descrição literal de como o
 * app funciona. Não existe servidor, então não existe backup, então trocar de
 * celular perde tudo. Um app que só conta a metade boa dessa escolha está
 * mentindo por omissão, e a pessoa só descobre no dia em que já era tarde.
 */

import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, View } from 'react-native';
import { useArrego } from '@/store/useArrego';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import {
  AppText,
  Avatar,
  Button,
  Card,
  DayField,
  EmptyState,
  Screen,
  Sheet,
  TextField,
} from '@/ui';

const AVATAR_EMOJIS = [
  '🙂', '😎', '🤨', '🫠', '🥲', '🤑', '🧠', '🔥',
  '🐢', '🦆', '🐈', '🦖', '🌵', '🍀', '🍕', '🧃',
  '🎧', '🎮', '🎸', '📚', '⚽', '🏀', '🚀', '🌊',
  '👑', '💀', '🫶', '🪐',
];

/**
 * A galeria pode ser negada de dois jeitos diferentes e cada um tem uma saída
 * diferente: dá pra perguntar de novo, ou só os ajustes do aparelho resolvem.
 * Nos dois casos o emoji continua sendo um caminho inteiro — negar acesso não
 * pode virar beco sem saída.
 */
function explainDeniedGallery(canAskAgain: boolean): void {
  if (canAskAgain) {
    Alert.alert(
      'Sem galeria, sem foto',
      'Pra escolher uma foto eu preciso de acesso à galeria. Pode liberar e tentar de novo, ou ficar no emoji — ele funciona igual e continua sendo você.',
      [{ text: 'Entendi' }],
    );
    return;
  }

  Alert.alert(
    'O acesso está bloqueado',
    'A galeria está bloqueada pro Arrego, e só dá pra liberar nos ajustes do aparelho. Se você preferir não mexer nisso, tudo bem: o emoji resolve.',
    [
      { text: 'Fico no emoji', style: 'cancel' },
      {
        text: 'Abrir ajustes',
        onPress: () => {
          Linking.openSettings().catch(() => undefined);
        },
      },
    ],
  );
}

export default function PerfilScreen() {
  const { colors } = useTheme();
  const profile = useArrego((state) => state.profile);
  const error = useArrego((state) => state.error);
  const saveProfile = useArrego((state) => state.saveProfile);
  const wipeEverything = useArrego((state) => state.wipeEverything);

  // `null` = a pessoa não mexeu no campo e o valor mostrado vem do disco. Um
  // `useState(profile.name)` cru congelaria o nome do primeiro render e ficaria
  // desatualizado quando a hidratação terminasse.
  const [draftName, setDraftName] = useState<string | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const name = profile?.name ?? '';
  const shownName = draftName ?? name;

  const commitName = useCallback(async () => {
    if (draftName === null) return;
    const trimmed = draftName.trim();
    // Nome vazio não vai pro banco: a coluna é NOT NULL e "" não é um nome.
    // Voltar pro valor guardado é o jeito honesto de dizer "não colou".
    if (trimmed === '' || trimmed === name) {
      setDraftName(null);
      return;
    }
    await saveProfile({ name: trimmed });
    setDraftName(null);
  }, [draftName, name, saveProfile]);

  const pickPhoto = useCallback(async () => {
    if (name === '') return;
    setBusy(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        explainDeniedGallery(permission.canAskAgain);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (result.canceled) return;

      const asset = result.assets[0];
      if (asset === undefined) return;
      await saveProfile({ name, photoUri: asset.uri });
    } catch {
      Alert.alert(
        'A galeria não abriu',
        'Não consegui abrir suas fotos agora. Tenta de novo — e, se ela insistir em não abrir, o emoji resolve.',
      );
    } finally {
      setBusy(false);
    }
  }, [name, saveProfile]);

  // `null` apaga o campo, `undefined` preservaria a foto atual (ver `pick` no
  // repositório). Aqui a intenção é apagar mesmo.
  const removePhoto = useCallback(async () => {
    if (name === '') return;
    await saveProfile({ name, photoUri: null });
  }, [name, saveProfile]);

  const chooseEmoji = useCallback(
    async (emoji: string) => {
      setEmojiOpen(false);
      if (name === '') return;
      await saveProfile({ name, avatarEmoji: emoji });
    },
    [name, saveProfile],
  );

  const savePayday = useCallback(
    async (day: number | null) => {
      if (name === '') return;
      await saveProfile({ name, payday: day });
    },
    [name, saveProfile],
  );

  const runWipe = useCallback(async () => {
    await wipeEverything();
    // `wipeEverything` engole a falha na store em vez de estourar. Navegar sem
    // conferir mandaria a pessoa pro onboarding com os dados ainda no disco —
    // ela acharia que apagou tudo, e não apagou.
    if (useArrego.getState().error !== null) return;
    router.replace('/onboarding');
  }, [wipeEverything]);

  const confirmWipe = useCallback(() => {
    Alert.alert(
      'Apagar tudo mesmo?',
      'Isso apaga todas as suas contas, metas e parcelas. Não tem volta.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar tudo',
          style: 'destructive',
          onPress: () => {
            void runWipe();
          },
        },
      ],
    );
  }, [runWipe]);

  if (profile === null) {
    return (
      <Screen scroll>
        <EmptyState
          emoji="👻"
          title="Não tem conta aqui ainda"
          body="Nenhum perfil foi criado neste aparelho. Leva um minuto e é só um nome — sem e-mail, sem senha, sem nuvem."
          actionLabel="Criar minha conta"
          onAction={() => router.replace('/onboarding')}
        />
      </Screen>
    );
  }

  const version = Constants.expoConfig?.version;

  return (
    <Screen scroll>
      <View style={styles.page}>
        <AppText variant="title">Sua conta</AppText>

        {error !== null ? (
          <Card style={styles.stack}>
            <AppText variant="caption" tone="secondary">
              Deu ruim
            </AppText>
            <AppText variant="small" tone="negative">
              {error}
            </AppText>
          </Card>
        ) : null}

        <View style={styles.identity}>
          <Avatar
            name={shownName}
            photoUri={profile.photoUri}
            emoji={profile.avatarEmoji}
            size={96}
          />
          <AppText variant="heading" numberOfLines={1}>
            {shownName}
          </AppText>
          <View style={styles.identityActions}>
            <Button
              label="Trocar foto"
              icon="📷"
              variant="secondary"
              disabled={busy}
              onPress={() => {
                void pickPhoto();
              }}
            />
            <Button
              label="Trocar emoji"
              icon="🙃"
              variant="secondary"
              disabled={busy}
              onPress={() => setEmojiOpen(true)}
            />
          </View>
          {profile.photoUri !== null ? (
            <Button
              label="Remover foto e voltar pro emoji"
              variant="ghost"
              disabled={busy}
              onPress={() => {
                void removePhoto();
              }}
            />
          ) : null}
        </View>

        <Card style={styles.stack}>
          <TextField
            label="Como eu te chamo?"
            value={shownName}
            onChangeText={setDraftName}
            onBlur={() => {
              void commitName();
            }}
            placeholder="Seu nome"
            hint="Só o primeiro nome já serve. É assim que eu falo com você."
            maxLength={40}
          />
          <DayField
            label="Que dia o dinheiro cai?"
            value={profile.payday}
            onChange={(day) => {
              void savePayday(day);
            }}
            hint="É o dia em que o seu mês financeiro começa. Não sabe ou não tem dia fixo? Deixa em branco — dá pra viver sem."
          />
        </Card>

        <Card style={styles.stack}>
          <AppText variant="subheading">🔒 Seus dados</AppText>
          <AppText variant="small" tone="secondary">
            Tudo que você digita aqui fica salvo dentro deste aparelho, num arquivo que só o Arrego
            abre. Não existe servidor, não existe conta na nuvem, não existe login e não existe
            e-mail. Sua renda, suas dívidas, suas metas e sua foto não são enviadas pra lugar
            nenhum, porque não tem pra onde enviar: o app não sabe conversar com a internet.
          </AppText>
          <AppText variant="small" tone="secondary">
            Ninguém da Locomotiva vê isso. Nenhum anunciante vê isso. Eu não vendo, não compartilho
            e não analiso seus dados em lugar nenhum — não por bondade, mas porque eles nunca saem
            daí de dentro.
          </AppText>
          <AppText variant="small">
            E agora a parte ruim, que eu não vou esconder de você: como não existe cópia em lugar
            nenhum, também não existe recuperação. Trocou de celular, perdeu. Perdeu o celular,
            perdeu. Desinstalou o app, perdeu. Formatou, perdeu. Não tem "esqueci minha senha" pra
            clicar e não tem suporte pra chamar — é o preço exato de ninguém além de você ter esses
            dados. Prefiro te contar isso hoje do que no dia em que acontecer.
          </AppText>
        </Card>

        <Card style={styles.stack}>
          <AppText variant="subheading">🧨 Apagar tudo</AppText>
          <AppText variant="small" tone="secondary">
            Some com o arquivo inteiro: perfil, renda, contas, assinaturas, cartões, parcelas e
            metas. O app volta a ser uma tela em branco, como no primeiro dia. É seu direito e eu
            não vou tentar te convencer do contrário — só não tem desfazer.
          </AppText>
          <Button label="Apagar tudo" variant="danger" full onPress={confirmWipe} />
        </Card>

        <View style={styles.footer}>
          <AppText variant="caption" tone="muted">
            Arrego {version ?? '—'} · roda offline, no seu aparelho
          </AppText>
          <AppText variant="small" tone="secondary" style={styles.quote}>
            Eu não tenho servidor, não tenho login e não tenho nada pra te vender. Sobra tempo, e eu
            uso esse tempo reparando nas suas assinaturas. Se quiser me dar trabalho de verdade,
            atualiza o que mudou esse mês.
          </AppText>
        </View>
      </View>

      <Sheet visible={emojiOpen} onClose={() => setEmojiOpen(false)} title="Escolhe sua cara">
        <View style={styles.emojiGrid} accessibilityRole="radiogroup">
          {AVATAR_EMOJIS.map((emoji) => {
            const selected = emoji === profile.avatarEmoji;
            return (
              <Pressable
                key={emoji}
                onPress={() => {
                  void chooseEmoji(emoji);
                }}
                accessible
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`Emoji ${emoji}`}
                style={({ pressed }) => [
                  styles.emojiCell,
                  {
                    backgroundColor: selected ? colors.brand.amber : colors.surfaceSunken,
                    borderColor: selected ? colors.brand.amberDeep : colors.border,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <AppText style={styles.emojiGlyph}>{emoji}</AppText>
              </Pressable>
            );
          })}
        </View>
        {profile.photoUri !== null ? (
          <AppText variant="small" tone="muted">
            Você está usando uma foto, então o emoji fica guardado esperando a vez. Remove a foto lá
            em cima pra ele aparecer.
          </AppText>
        ) : null}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { gap: spacing.lg },
  stack: { gap: spacing.md },
  identity: {
    alignItems: 'center',
    gap: spacing.md,
  },
  identityActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  footer: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  quote: { textAlign: 'center' },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  emojiCell: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  emojiGlyph: { fontSize: 28, lineHeight: 34 },
  pressed: { opacity: 0.65 },
});
