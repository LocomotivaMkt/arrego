/**
 * Sua conta — avatar, quatro linhas e a versão. É isso.
 *
 * A tela era uma pilha de cards com 832 caracteres de texto aberto: um
 * parágrafo triplo de privacidade, outro explicando o que "apagar tudo" apaga,
 * e um recado da Arrego no rodapé. Nada disso sumiu — mudou de lugar:
 *
 *   - a explicação de privacidade INTEIRA está no `Reveal` "Seus dados",
 *     fechada por padrão (é o único jeito honesto de manter a parte ruim: não
 *     existe backup, trocou de celular perdeu tudo — quem quiser ler, lê);
 *   - o que "apagar tudo" apaga está no Alert de confirmação, que é onde o
 *     texto vira proteção em vez de ruído — ali ele é lido, aqui era ignorado;
 *   - o recado do rodapé era tempero, não informação. Esse saiu.
 *
 * Sem amarelo nesta tela. O único ponto de cor é o avatar, que é a pessoa.
 * O `DayField` (dia selecionado em amarelo) mora dentro de uma folha, atrás de
 * um toque, e não na tela.
 *
 * O título "Sua conta" vem do header do Stack (app/_layout.tsx). A versão
 * anterior o repetia no corpo, então a tela dizia "Sua conta" duas vezes.
 */

import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Linking, StyleSheet, View } from 'react-native';
import { useArrego } from '@/store/useArrego';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import {
  AppText,
  Avatar,
  Button,
  Card,
  DayField,
  Icon,
  ListRow,
  Reveal,
  Screen,
  Sheet,
  TextField,
} from '@/ui';

/**
 * A galeria pode ser negada de dois jeitos diferentes e cada um tem uma saída
 * diferente: dá pra perguntar de novo, ou só os ajustes do aparelho resolvem.
 * Nos dois casos as iniciais seguem valendo como avatar, então negar acesso não
 * vira beco sem saída.
 *
 * Aqui o texto continua explícito de propósito: um Alert é lido, e ele precisa
 * dizer o que aconteceu e qual é a saída. O orçamento de texto corta o que está
 * ABERTO na tela, não o que a pessoa parou para ler.
 */
function explainDeniedGallery(canAskAgain: boolean): void {
  if (canAskAgain) {
    Alert.alert(
      'Sem galeria, sem foto',
      'Pra escolher uma foto eu preciso de acesso à galeria. Pode liberar e tentar de novo, ou seguir com suas iniciais. Elas funcionam igual e continuam sendo você.',
      [{ text: 'Entendi' }],
    );
    return;
  }

  Alert.alert(
    'O acesso está bloqueado',
    'A galeria está bloqueada pro Arrego, e só dá pra liberar nos ajustes do aparelho. Se você preferir não mexer nisso, tudo bem: suas iniciais resolvem.',
    [
      { text: 'Fico com as iniciais', style: 'cancel' },
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
  const [nameOpen, setNameOpen] = useState(false);
  const [paydayOpen, setPaydayOpen] = useState(false);
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

  /**
   * Fechar a folha grava, igual sair do campo gravava antes. São os dois jeitos
   * de "terminar de digitar", e nenhum deles é um botão Salvar: o campo já
   * salvava sozinho no onBlur e continuar assim mantém o comportamento — e
   * mantém a folha sem um botão amarelo que esta tela não pode ter.
   */
  const closeName = useCallback(() => {
    void commitName();
    setNameOpen(false);
  }, [commitName]);

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
        'Não consegui abrir suas fotos agora. Tenta de novo. Se ela insistir em não abrir, suas iniciais resolvem.',
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

  /**
   * O parágrafo que ficava aberto na tela mora aqui. É a única lista completa do
   * que some, e ela aparece no exato momento em que a pessoa pode desistir —
   * que é o único momento em que ela vai ler.
   */
  const confirmWipe = useCallback(() => {
    Alert.alert(
      'Apagar tudo mesmo?',
      'Some com o arquivo inteiro: perfil, renda, contas, assinaturas, cartões, parcelas e metas. O app volta a ser uma tela em branco, como no primeiro dia. Não tem desfazer.',
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
        <View style={styles.empty}>
          <Icon name="profile" size={32} tone="muted" />
          <AppText variant="title" style={styles.centered}>
            Não tem conta aqui ainda
          </AppText>
          <AppText variant="body" tone="secondary" style={styles.centered}>
            Leva um minuto. Sem e-mail, sem senha, sem nuvem.
          </AppText>
          <Button label="Criar minha conta" onPress={() => router.replace('/onboarding')} />
        </View>
      </Screen>
    );
  }

  const version = Constants.expoConfig?.version;

  return (
    <Screen scroll>
      <View style={styles.page}>
        {error !== null ? (
          <Card>
            <View style={styles.errorRow}>
              {/* Ícone + texto: a cor sozinha não conta nada a quem não a distingue. */}
              <Icon name="alert" size={18} color={colors.status.critical} />
              <AppText variant="small" tone="negative" style={styles.grow}>
                {error}
              </AppText>
            </View>
          </Card>
        ) : null}

        <View style={styles.identity}>
          <Avatar
            name={shownName}
            photoUri={profile.photoUri}
            size={96}
          />
          <AppText variant="heading" numberOfLines={1}>
            {shownName}
          </AppText>
          <View style={styles.identityActions}>
            <Button
              label="Trocar foto"
              icon="camera"
              variant="secondary"
              disabled={busy}
              onPress={() => {
                void pickPhoto();
              }}
            />
          </View>
          {profile.photoUri !== null ? (
            <Button
              label="Remover foto"
              variant="ghost"
              disabled={busy}
              onPress={() => {
                void removePhoto();
              }}
            />
          ) : null}
        </View>

        {/*
          Os dois campos viraram linha + valor à direita. O `DayField` é uma
          grade de 31 alvos de toque: aberto na tela ele É a tela, então ele vai
          pra folha. O valor na direita já responde "que dia mesmo?" sem abrir
          nada.
        */}
        <Card>
          <ListRow
            title="Seu nome"
            leading={<Icon name="profile" />}
            trailing={
              <AppText variant="small" tone="muted" numberOfLines={1}>
                {shownName}
              </AppText>
            }
            onPress={() => setNameOpen(true)}
            divider
          />
          <ListRow
            title="Dia que o dinheiro cai"
            leading={<Icon name="calendar" />}
            trailing={
              <AppText variant="small" tone="muted" numberOfLines={1}>
                {profile.payday !== null ? `Dia ${profile.payday}` : 'Não definido'}
              </AppText>
            }
            onPress={() => setPaydayOpen(true)}
          />
        </Card>

        {/*
          Aprender saiu da barra de abas; esta é a segunda porta pra ele (a
          outra é o Início). Fica na conta porque é onde a pessoa procura o que
          o app tem além das telas do dia a dia.
        */}
        <Card>
          <ListRow
            title="Aprender sobre dinheiro"
            leading={<Icon name="learn" />}
            onPress={() => router.push('/(tabs)/aprender')}
          />
        </Card>

        <Card>
          <Reveal label="Seus dados">
            <AppText variant="small" tone="secondary">
              Tudo que você digita aqui fica salvo dentro deste aparelho, num arquivo que só o
              Arrego abre. Não existe servidor, não existe conta na nuvem, não existe login e não
              existe e-mail. Sua renda, suas dívidas, suas metas e sua foto não são enviadas pra
              lugar nenhum, porque não tem pra onde enviar: o app não sabe conversar com a internet.
            </AppText>
            <AppText variant="small" tone="secondary">
              Ninguém da Locomotiva vê isso. Nenhum anunciante vê isso. Eu não vendo, não
              compartilho e não analiso seus dados em lugar nenhum, não por bondade, mas porque
              eles nunca saem daí de dentro.
            </AppText>
            <AppText variant="small">
              E agora a parte ruim, que eu não vou esconder de você: como não existe cópia em lugar
              nenhum, também não existe recuperação. Trocou de celular, perdeu. Perdeu o celular,
              perdeu. Desinstalou o app, perdeu. Formatou, perdeu. Não tem "esqueci minha senha" pra
              clicar e não tem suporte pra chamar. É o preço exato de ninguém além de você ter
              esses dados. Prefiro te contar isso hoje do que no dia em que acontecer.
            </AppText>
          </Reveal>
        </Card>

        <Card>
          <ListRow
            title="Apagar tudo"
            tone="critical"
            leading={<Icon name="trash" color={colors.money.negativeText} />}
            onPress={confirmWipe}
          />
        </Card>

        <AppText variant="caption" tone="muted" style={styles.centered}>
          {`Arrego${version ? ` ${version}` : ''} · roda offline, no seu aparelho`}
        </AppText>
      </View>

      <Sheet visible={nameOpen} onClose={closeName} title="Seu nome">
        <TextField
          label="Como eu te chamo?"
          value={shownName}
          onChangeText={setDraftName}
          onBlur={() => {
            void commitName();
          }}
          placeholder="Seu nome"
          hint="É assim que eu falo com você."
          maxLength={40}
          autoFocus
        />
      </Sheet>

      <Sheet
        visible={paydayOpen}
        onClose={() => setPaydayOpen(false)}
        title="Dia que o dinheiro cai"
      >
        <DayField
          label="Dia do mês"
          value={profile.payday}
          onChange={(day) => {
            void savePayday(day);
          }}
          hint="Toca de novo no dia pra deixar em branco."
        />
      </Sheet>

    </Screen>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  // Um assunto por bloco, separados por espaço. Nenhuma borda faz esse trabalho.
  page: { gap: spacing.section },
  centered: { textAlign: 'center' },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxl,
  },
  errorRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
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
  pressed: { opacity: 0.65 },
});
