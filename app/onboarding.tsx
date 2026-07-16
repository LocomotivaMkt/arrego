import { useArrego } from '@/store/useArrego';
import { spacing } from '@/theme/tokens';
import type { Cents } from '@/types/models';
import {
  AppText,
  Avatar,
  Button,
  Card,
  Chip,
  CurrencyField,
  DayField,
  Meter,
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
 * O emoji vem com nome porque o `Chip` usa o rótulo como `accessibilityLabel`:
 * um chip cujo rótulo é só "🦊" faz o leitor de tela anunciar o nome Unicode do
 * caractere. O nome também é a piada — o emoji sozinho não conta nada.
 */
const EMOJIS: ReadonlyArray<{ glyph: string; name: string }> = [
  { glyph: '🙂', name: 'De boa' },
  { glyph: '😎', name: 'Estiloso' },
  { glyph: '🤑', name: 'Ambicioso' },
  { glyph: '🐢', name: 'Sem pressa' },
  { glyph: '🦊', name: 'Esperto' },
  { glyph: '🐙', name: 'Polvo' },
  { glyph: '👽', name: 'ET' },
  { glyph: '🔥', name: 'Fogo' },
];

export default function Onboarding() {
  const router = useRouter();
  const saveProfile = useArrego((state) => state.saveProfile);
  const addIncome = useArrego((state) => state.addIncome);
  const finishOnboarding = useArrego((state) => state.finishOnboarding);
  const error = useArrego((state) => state.error);

  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoNote, setPhotoNote] = useState<string | null>(null);
  const [emoji, setEmoji] = useState('🙂');
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

  async function pickPhoto() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setPhotoNote(
          permission.canAskAgain
            ? 'Você não deu acesso à galeria — e tudo bem, o celular é seu. Escolhe uma carinha aí embaixo, funciona igual.'
            : 'O acesso à galeria está bloqueado nos ajustes do celular. Dá para liberar por lá, mas não precisa: escolhe uma carinha aí embaixo.',
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
      setPhotoNote('A galeria não abriu. Não faço ideia do porquê. Escolhe uma carinha aí embaixo e a gente segue.');
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

    await saveProfile({
      name: trimmedName,
      photoUri,
      avatarEmoji: emoji,
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
          <Meter progress={step / TOTAL_STEPS} label={`Passo ${step} de ${TOTAL_STEPS}`} />

          {step === 1 ? (
            <>
              <Card tone="brand">
                <View style={styles.block}>
                  <AppText variant="title">Oi. Eu sou a Arrego.</AppText>
                  <AppText variant="body">
                    Eu organizo o seu dinheiro e comento o que vejo. Aviso desde já: eu sou
                    sincera e um pouco insuportável. Não vou fingir que R$ 340 por mês em
                    assinatura é "só um cafezinho".
                  </AppText>
                  <AppText variant="body">
                    Mas o alvo é sempre o número, nunca você. Se eu apontar alguma coisa, venho
                    junto com a saída.
                  </AppText>
                </View>
              </Card>

              <Card>
                <View style={styles.block}>
                  <AppText variant="subheading">Seus dados ficam aqui. Só aqui.</AppText>
                  <AppText variant="body">
                    Não tem servidor, não tem login, não tem nuvem, não tem propaganda. Seu nome,
                    sua foto e cada número que você digitar moram nesse aparelho e não vão para
                    lugar nenhum.
                  </AppText>
                  <AppText variant="body" tone="secondary">
                    A conta é honesta nos dois lados: trocou de celular sem exportar, perdeu tudo.
                    É o preço de ninguém mais ter acesso — inclusive eu.
                  </AppText>
                </View>
              </Card>
            </>
          ) : null}

          {step === 2 ? (
            <View style={styles.block}>
              <AppText variant="title">Como você quer ser chamado?</AppText>
              <AppText variant="body" tone="secondary">
                Só para eu não te chamar de "usuário" pelos próximos meses.
              </AppText>
              <TextField
                label="Seu nome"
                value={name}
                onChangeText={setName}
                placeholder="Nome ou apelido"
                hint="Pode ser apelido. Isso não sai do aparelho, então ninguém além de você vai ler."
                autoFocus
                maxLength={24}
              />
            </View>
          ) : null}

          {step === 3 ? (
            <View style={styles.block}>
              <AppText variant="title">Bota uma cara nisso aqui.</AppText>
              <AppText variant="body" tone="secondary">
                Opcional de verdade. A foto fica salva no aparelho, igual todo o resto.
              </AppText>

              <View style={styles.avatarRow}>
                <Avatar name={trimmedName || 'Você'} photoUri={photoUri} emoji={emoji} size={96} />
              </View>

              <View style={styles.buttonRow}>
                <Button
                  label={photoUri ? 'Trocar foto' : 'Escolher foto'}
                  variant="secondary"
                  icon="🖼️"
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
                <AppText variant="small" tone="secondary">
                  {photoNote}
                </AppText>
              ) : null}

              <View style={styles.block}>
                <AppText variant="caption" tone="secondary">
                  {photoUri ? 'CARINHA — APARECE SE VOCÊ REMOVER A FOTO' : 'OU ESCOLHE UMA CARINHA'}
                </AppText>
                <View style={styles.chipRow}>
                  {EMOJIS.map((option) => (
                    <Chip
                      key={option.glyph}
                      label={option.name}
                      icon={option.glyph}
                      selected={emoji === option.glyph}
                      onPress={() => {
                        setEmoji(option.glyph);
                      }}
                    />
                  ))}
                </View>
              </View>
            </View>
          ) : null}

          {step === 4 ? (
            <View style={styles.block}>
              <AppText variant="title">Quanto entra por mês?</AppText>
              <AppText variant="body" tone="secondary">
                O dinheiro que cai certo, todo mês. Se varia, chuta o mínimo que sempre entra — dá
                para ajustar depois.
              </AppText>

              <CurrencyField
                label="Quanto entra"
                cents={amountCents}
                onChangeCents={setAmountCents}
                hint="Só dígitos. O valor vai se montando da direita para a esquerda."
                autoFocus
              />

              <DayField
                label="Dia que cai"
                value={payday}
                onChange={setPayday}
                hint={
                  amountCents > 0 && payday === null
                    ? 'Escolhe o dia. É o que separa "tenho R$ 2.000" de "tenho R$ 2.000 no dia 5".'
                    : 'Toca de novo no dia para desmarcar.'
                }
              />

              <Card tone="sunken">
                <View style={styles.block}>
                  <AppText variant="bodyStrong">Não tem renda fixa?</AppText>
                  <AppText variant="small" tone="secondary">
                    Freela, bico, mesada que varia, mês sem nada. É mais comum do que parece e não
                    é problema — pula essa e cadastra o que entrar, quando entrar.
                  </AppText>
                  <Button label="Não tenho renda fixa" variant="ghost" onPress={skipIncome} />
                </View>
              </Card>
            </View>
          ) : null}

          {step === 5 ? (
            <View style={styles.block}>
              <AppText variant="title">Pronto. É isso.</AppText>

              <Card tone="sunken">
                <View style={styles.recap}>
                  <Avatar name={trimmedName || 'Você'} photoUri={photoUri} emoji={emoji} size={56} />
                  <View style={styles.grow}>
                    <AppText variant="subheading" numberOfLines={1}>
                      {trimmedName}
                    </AppText>
                    <AppText variant="small" tone="secondary">
                      {hasIncome
                        ? `${formatCents(amountCents)} todo dia ${payday}`
                        : 'Sem renda fixa cadastrada'}
                    </AppText>
                  </View>
                </View>
              </Card>

              <AppText variant="body">
                {hasIncome
                  ? 'Agora me conta o resto: contas, assinaturas e aquele parcelado em 12x que você finge que não existe. Eu faço as contas e digo o que elas significam. Você decide o que fazer.'
                  : 'Quando entrar algum dinheiro, me conta. Enquanto isso, cadastra o que sai — dá para enxergar muita coisa só olhando o que já tem dono.'}
              </AppText>

              <AppText variant="small" tone="secondary">
                Dá para mudar tudo isso depois em "Sua conta". Inclusive apagar tudo, de uma vez,
                sem me pedir licença.
              </AppText>

              {attempted && error ? (
                <AppText variant="small" tone="negative">
                  {error}
                </AppText>
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
  content: { gap: spacing.xl },
  block: { gap: spacing.md },
  avatarRow: { alignItems: 'center', paddingVertical: spacing.sm },
  buttonRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  recap: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
