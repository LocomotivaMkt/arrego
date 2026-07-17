/**
 * Onboarding — cinco passos, um assunto por passo.
 *
 * A regra que desenha esta tela: TÍTULO CURTO + UMA linha de apoio + o campo +
 * o botão. Nada mais. A versão anterior abria com dois cards e um parágrafo se
 * apresentando antes de pedir qualquer coisa — e app que se explica em três
 * parágrafos antes de você digitar o primeiro caractere é exatamente o que
 * parece golpe. A Arrego continua sarcástica; ela só fala uma linha por vez.
 *
 * O amarelo aparece em UMA superfície: o botão da ação principal, no rodapé.
 * O passo 1 chegou a ser um card de marca e não é mais — o rodapé do `Screen` é
 * branco, então um botão `secondary` em cima dele sumiria, e a escolha "fundo
 * amarelo OU botão amarelo" só tem um lado que mantém a ação visível.
 */

import { useArrego } from '@/store/useArrego';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import type { Cents } from '@/types/models';
import {
  AppText,
  Avatar,
  Button,
  CurrencyField,
  DayField,
  Icon,
  ListRow,
  Meter,
  Reveal,
  Screen,
  TextField,
} from '@/ui';
import { formatCents } from '@/utils/money';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

const TOTAL_STEPS = 5;

type Step = 1 | 2 | 3 | 4 | 5;

/**
 * A grade de oito carinhas saiu daqui. Ela era uma escolha a mais num passo que
 * já era opcional, e escolher entre um polvo e um ET não diz nada sobre dinheiro
 * — sem foto, o avatar são as iniciais do nome que a pessoa acabou de digitar no
 * passo 2 (ver `ui/Avatar.tsx`). Um passo com um botão só é um passo que se
 * atravessa sem pensar, que é o ponto de um cadastro.
 */

export default function Onboarding() {
  const router = useRouter();
  const { colors } = useTheme();
  const saveProfile = useArrego((state) => state.saveProfile);
  const addIncome = useArrego((state) => state.addIncome);
  const finishOnboarding = useArrego((state) => state.finishOnboarding);
  const error = useArrego((state) => state.error);

  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoNote, setPhotoNote] = useState<string | null>(null);
  const [amountCents, setAmountCents] = useState<Cents>(0);
  const [payday, setPayday] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const trimmedName = name.trim();
  // Renda só existe com valor E dia: o repositório recusa entrada recorrente sem
  // dia do mês, e "pular" (abaixo) zera os dois justamente para cair aqui.
  const hasIncome = amountCents > 0 && payday !== null;

  function goTo(next: Step) {
    setStep(next);
  }

  function back() {
    if (step > 1) goTo((step - 1) as Step);
  }

  /**
   * Negar a galeria não pode virar beco sem saída, e desde que a carinha saiu o
   * caminho de fuga é o próprio passo: foto é opcional, as iniciais já estão
   * desenhadas na tela e o botão do rodapé continua dizendo "Seguir sem foto".
   * O recado só precisa contar o que aconteceu.
   */
  async function pickPhoto() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setPhotoNote(
          permission.canAskAgain
            ? 'Sem acesso à galeria. Dá pra seguir sem foto.'
            : 'Galeria bloqueada nos ajustes. Dá pra seguir sem foto.',
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
      });
      if (result.canceled) return;

      const asset = result.assets[0];
      if (!asset) return;

      setPhotoUri(asset.uri);
      setPhotoNote(null);
    } catch {
      setPhotoNote('A galeria não abriu. Pode seguir sem foto e tentar depois.');
    }
  }

  /** Único caminho para o passo 5 sem renda. Zera para `hasIncome` ficar falso. */
  function skipIncome() {
    setAmountCents(0);
    setPayday(null);
    goTo(5);
  }

  /**
   * Tudo é gravado aqui, no fim — nunca no passo em que foi digitado. Se o
   * `addIncome` rodasse ao sair do passo 4, voltar e corrigir o valor criaria
   * uma SEGUNDA renda em vez de trocar a primeira.
   *
   * A ordem importa: `finishOnboarding` faz `UPDATE ... WHERE id = 1`, então sem
   * o perfil gravado antes ele não acha linha nenhuma e o onboarding nunca é
   * marcado como concluído — a pessoa voltaria para cá na próxima abertura.
   *
   * A store engole exceções e as transforma em `error`, então cada passo é
   * conferido: seguir depois de uma falha marcaria como pronto um cadastro que
   * não existe no disco.
   */
  async function finish() {
    if (saving) return;
    setSaving(true);
    setAttempted(true);

    // Sem `avatarEmoji`: o campo não existe mais na tela. Omitir preserva o que
    // estiver no banco (ver `pick` no repositório) em vez de gravar vazio — e num
    // cadastro novo não há o que preservar.
    await saveProfile({
      name: trimmedName,
      photoUri,
      payday: hasIncome ? payday : null,
    });
    if (useArrego.getState().error !== null) {
      setSaving(false);
      return;
    }

    if (hasIncome && payday !== null) {
      await addIncome({
        label: 'Salário',
        kind: 'salary',
        amountCents,
        recurring: true,
        dayOfMonth: payday,
        receivedOn: null,
      });
      if (useArrego.getState().error !== null) {
        setSaving(false);
        return;
      }
    }

    await finishOnboarding();
    if (useArrego.getState().profile?.onboardedAt == null) {
      setSaving(false);
      return;
    }

    router.replace('/(tabs)');
  }

  const primary: { label: string; disabled: boolean; onPress: () => void } =
    step === 1
      ? { label: 'Bora', disabled: false, onPress: () => goTo(2) }
      : step === 2
        ? { label: 'Continuar', disabled: trimmedName === '', onPress: () => goTo(3) }
        : step === 3
          ? {
              label: photoUri ? 'Continuar' : 'Seguir sem foto',
              disabled: false,
              onPress: () => goTo(4),
            }
          : step === 4
            ? { label: 'Continuar', disabled: !hasIncome, onPress: () => goTo(5) }
            : {
                label: attempted && error ? 'Tentar de novo' : 'Começar',
                disabled: saving,
                onPress: () => {
                  void finish();
                },
              };

  const footer = (
    <View style={styles.footer}>
      {step > 1 ? <Button label="Voltar" variant="ghost" onPress={back} /> : null}
      <View style={styles.grow}>
        <Button
          label={primary.label}
          onPress={primary.onPress}
          disabled={primary.disabled}
          size="lg"
          full
        />
      </View>
    </View>
  );

  return (
    // Sem isto, o teclado cobre o campo de nome e o de valor. O `Screen` inteiro
    // (incluindo o rodapé com o botão) sobe junto, então o "Continuar" continua
    // alcançável com o teclado aberto.
    <KeyboardAvoidingView
      style={styles.grow}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen scroll footer={footer}>
        <View style={styles.content}>
          {/*
            Fio de 3px, sem rótulo. "Passo 3 de 5" escrito na tela é texto que a
            própria barra já diz — mas continua sendo anunciado no leitor de
            tela, que não enxerga a barra.
          */}
          <Meter
            progress={step / TOTAL_STEPS}
            height={3}
            accessibilityLabel={`Passo ${step} de ${TOTAL_STEPS}`}
          />

          {step === 1 ? (
            <>
              <View style={styles.block}>
                <AppText variant="title">Oi. Eu sou a Arrego.</AppText>
                <AppText variant="body" tone="secondary">
                  Vou te ajudar com seu dinheiro. E ser sincera demais.
                </AppText>
              </View>

              <View style={styles.block}>
                <AppText variant="small" tone="muted">
                  Tudo fica neste aparelho. Sem servidor, sem login.
                </AppText>
                {/*
                  A promessa de privacidade não pode encolher para uma linha e
                  sumir: a parte ruim (não existe backup, trocou de celular
                  perdeu tudo) é a metade que um app desonesto omitiria, e
                  omitir aqui é pior do que em qualquer outra tela — é agora que
                  a pessoa decide entregar os dados. Então ela não sai, ela
                  senta atrás de um toque, fechada, do jeito que o orçamento de
                  texto manda.
                */}
                <Reveal label="Como assim?">
                  <AppText variant="small" tone="secondary">
                    Não tem servidor, não tem login, não tem nuvem, não tem propaganda. Seu nome,
                    sua foto e cada número que você digitar moram nesse aparelho e não vão para
                    lugar nenhum.
                  </AppText>
                  <AppText variant="small" tone="secondary">
                    A conta é honesta nos dois lados: trocou de celular sem exportar, perdeu tudo.
                    É o preço de ninguém mais ter acesso, inclusive eu.
                  </AppText>
                </Reveal>
              </View>
            </>
          ) : null}

          {step === 2 ? (
            <View style={styles.block}>
              <AppText variant="title">Como te chamo?</AppText>
              <AppText variant="body" tone="secondary">
                Nome ou apelido. Só pra eu não te chamar de "usuário".
              </AppText>
              <TextField
                label="Seu nome"
                value={name}
                onChangeText={setName}
                placeholder="Nome ou apelido"
                autoFocus
                maxLength={24}
              />
            </View>
          ) : null}

          {step === 3 ? (
            <View style={styles.block}>
              <AppText variant="title">Quer botar uma foto?</AppText>
              <AppText variant="body" tone="secondary">
                Opcional. Dá pra trocar depois.
              </AppText>

              <View style={styles.avatarRow}>
                <Avatar name={trimmedName || 'Você'} photoUri={photoUri} size={96} />
              </View>

              <View style={styles.buttonRow}>
                <Button
                  label={photoUri ? 'Trocar foto' : 'Escolher foto'}
                  variant="secondary"
                  icon="camera"
                  onPress={() => {
                    void pickPhoto();
                  }}
                />
                {photoUri ? (
                  <Button
                    label="Remover"
                    variant="ghost"
                    onPress={() => {
                      setPhotoUri(null);
                    }}
                  />
                ) : null}
              </View>

              {photoNote ? (
                <AppText variant="small" tone="muted">
                  {photoNote}
                </AppText>
              ) : null}

              {/*
                A legenda responde a pergunta que o círculo com duas letras
                levanta ("por que tem um AS aí?") e some quando a foto responde
                sozinha. Sem ela, as iniciais parecem um erro de carregamento.
              */}
              {photoUri === null ? (
                <AppText variant="caption" tone="muted">
                  Sem foto, ficam as suas iniciais.
                </AppText>
              ) : null}
            </View>
          ) : null}

          {step === 4 ? (
            <View style={styles.block}>
              <AppText variant="title">Quanto entra por mês?</AppText>
              <AppText variant="body" tone="secondary">
                O que cai certo, todo mês. Se varia, chuta o mínimo.
              </AppText>

              <CurrencyField
                label="Quanto entra"
                cents={amountCents}
                onChangeCents={setAmountCents}
                autoFocus
              />

              {/*
                A dica só aparece quando é acionável. Sem o dia, o "Continuar"
                fica desligado — e botão desligado sem motivo escrito é beco sem
                saída. Com o dia escolhido, não há o que dizer, então nada é dito.
              */}
              <DayField
                label="Dia que cai"
                value={payday}
                onChange={setPayday}
                hint={
                  amountCents > 0 && payday === null ? 'Falta escolher o dia.' : undefined
                }
              />

              {/*
                Era um card com título, parágrafo de consolo e botão. O rótulo do
                botão já diz tudo o que o parágrafo dizia, e a saída continua no
                mesmo lugar.
              */}
              <Button label="Não tenho renda fixa" variant="ghost" onPress={skipIncome} />
            </View>
          ) : null}

          {step === 5 ? (
            <View style={styles.block}>
              <AppText variant="title">Pronto. É isso.</AppText>

              <ListRow
                leading={<Avatar name={trimmedName || 'Você'} photoUri={photoUri} size={40} />}
                title={trimmedName || 'Você'}
                subtitle={
                  hasIncome ? `${formatCents(amountCents)} todo dia ${payday}` : 'Sem renda fixa'
                }
              />

              <AppText variant="body" tone="secondary">
                {hasIncome
                  ? 'Agora me conta o resto: contas, assinaturas, parcelas.'
                  : 'Quando entrar dinheiro, me conta.'}
              </AppText>

              {attempted && error ? (
                <View style={styles.errorRow}>
                  {/*
                    Ícone + texto. O vermelho sozinho não conta nada a quem não
                    o distingue — e `status.critical` aqui é preenchimento de
                    glifo (3:1 basta), não tinta de texto.
                  */}
                  <Icon name="alert" size={16} color={colors.status.critical} />
                  <AppText variant="small" tone="negative" style={styles.grow}>
                    {error}
                  </AppText>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  // Distância entre dois assuntos diferentes: a barra de progresso, o passo, o
  // rodapé de privacidade. É o espaço que separa — não borda, não card.
  content: { gap: spacing.section },
  block: { gap: spacing.md },
  avatarRow: { alignItems: 'center', paddingVertical: spacing.sm },
  buttonRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  errorRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
