/**
 * Aprender — a tela em que o app ensina em vez de opinar.
 *
 * Uma das duas telas onde parágrafo corrido pode existir (a outra é a conversa).
 * Só que "pode ter texto" não é "pode ser uma parede": a LISTA é o índice e a
 * LEITURA acontece na Sheet. Quem procura "o que é LCI" varre sete linhas em dois
 * segundos; quem quer entender abre uma e lê com espaço. A versão anterior
 * espremia os dois usos na mesma tela e não servia nenhum dos dois.
 *
 * O DISCLAIMER é o limite duro do projeto e continua no topo, visível, sempre —
 * a fronteira entre "explico como funciona" e "faz isso com a sua grana" é a
 * única coisa que impede um texto bem-intencionado de virar conselho ruim na vida
 * de alguém de 20 anos. Só que agora ele INFORMA em vez de assustar: faixa cinza,
 * ícone de linha, tinta discreta. Alarme em cima de um aviso permanente vira
 * ruído em uma semana — e este aviso precisa ser lido no mês que vem também.
 */

import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  DISCLAIMER,
  GLOSSARY,
  ORDER_MATTERS,
  SCAMS,
  TOPICS,
  type SafetyLevel,
  type Scam,
  type Topic,
} from '@/content/investments';
import { radius, spacing, type ThemeColors } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import type { InsightSeverity } from '@/types/models';
import {
  AppText,
  Badge,
  Card,
  Icon,
  ListRow,
  Reveal,
  Screen,
  SegmentedControl,
  Sheet,
  type IconName,
  type SegmentedOption,
} from '@/ui';

type TabKey = 'guardar' | 'golpes' | 'dicionario';

const TABS: SegmentedOption[] = [
  { key: 'guardar', label: 'Onde guardar' },
  { key: 'golpes', label: 'Golpes' },
  { key: 'dicionario', label: 'Dicionário' },
];

/** O SegmentedControl fala `string`; as chaves acima são o contrato real. */
function toTabKey(key: string): TabKey {
  return key === 'golpes' || key === 'dicionario' ? key : 'guardar';
}

/**
 * A segurança do tópico em três codificações redundantes: FORMA (o ícone muda de
 * desenho), COR (o status) e RÓTULO. Na lista aparecem forma e cor; o rótulo vem
 * junto no leitor de tela e no Badge de dentro da Sheet.
 *
 * A forma é o que faz o trabalho pesado: quem não distingue vermelho de laranja
 * continua vendo um escudo, um certo, um olho e um octógono. Cor sozinha nunca
 * carrega significado neste app — é a mesma regra do Badge, aplicada aqui.
 */
const SAFETY: Record<
  SafetyLevel,
  { label: string; severity: InsightSeverity; icon: IconName; mark: keyof ThemeColors['status'] }
> = {
  'muito-seguro': { label: 'Muito seguro', severity: 'good', icon: 'shield', mark: 'good' },
  seguro: { label: 'Seguro', severity: 'good', icon: 'ok', mark: 'good' },
  depende: { label: 'Depende', severity: 'warning', icon: 'eye', mark: 'warning' },
  perigoso: { label: 'Perigoso', severity: 'critical', icon: 'danger', mark: 'critical' },
};

/** O que a Sheet está mostrando. Uma folha só serve as três abas. */
type Reading =
  | { kind: 'topic'; topic: Topic }
  | { kind: 'scam'; scam: Scam }
  | { kind: 'term'; term: string; plain: string };

function readingTitle(reading: Reading): string {
  switch (reading.kind) {
    case 'topic':
      return reading.topic.title;
    case 'scam':
      return reading.scam.title;
    case 'term':
      return reading.term;
  }
}

/* ─────────────────────────── Peças de leitura ─────────────────────────── */

/** Parágrafo de leitura: lineHeight generoso, largura confortável. */
function Paragraph({ children }: { children: string }) {
  return (
    <AppText variant="body" tone="secondary" style={styles.paragraph}>
      {children}
    </AppText>
  );
}

/** Rótulo cinza em cima, frase inteira embaixo. Sem recorte: aqui tem espaço. */
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <AppText variant="caption" tone="muted">
        {label}
      </AppText>
      <Paragraph>{value}</Paragraph>
    </View>
  );
}

function Bullets({
  label,
  marker,
  items,
}: {
  label: string;
  marker: 'dot' | 'alert';
  items: readonly string[];
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.fact}>
      <AppText variant="caption" tone="muted">
        {label}
      </AppText>
      {items.map((item) => (
        <View key={item} style={styles.bullet}>
          {/* Nada de '⚠️': emoji é ilustração que cada sistema desenha do seu
              jeito e ignora a tinta do tema. O glifo de linha, em tinta discreta,
              avisa sem gritar — a lista inteira já é sobre o que dá errado. */}
          <View style={[styles.marker, marker === 'alert' ? styles.markerIcon : styles.markerDot]}>
            {marker === 'alert' ? (
              <Icon name="alert" size={14} tone="muted" />
            ) : (
              <View style={[styles.dot, { backgroundColor: colors.ink.muted }]} />
            )}
          </View>
          <AppText variant="body" tone="secondary" style={styles.bulletText}>
            {item}
          </AppText>
        </View>
      ))}
    </View>
  );
}

function TopicBody({ topic }: { topic: Topic }) {
  const safety = SAFETY[topic.safety];

  return (
    <View style={styles.reading}>
      <Badge label={safety.label} severity={safety.severity} />

      {topic.body.map((paragraph, index) => (
        <Paragraph key={`${topic.id}-${index}`}>{paragraph}</Paragraph>
      ))}

      <Fact
        label="Quem garante"
        value={
          topic.protectedBy ??
          'Ninguém. Não tem fundo, não tem governo, não tem a quem reclamar. Se sumir, sumiu.'
        }
      />
      <Fact label="Liquidez" value={topic.liquidity} />
      <Bullets label="Faz sentido quando" marker="dot" items={topic.goodFor} />
      <Bullets label="Presta atenção em" marker="alert" items={topic.watchOut} />
    </View>
  );
}

function ScamBody({ scam }: { scam: Scam }) {
  return (
    <View style={styles.reading}>
      <Fact label="O sinal" value={scam.sign} />
      <Fact label="A real" value={scam.truth} />
    </View>
  );
}

/* ────────────────────────────────  Tela  ─────────────────────────────── */

export default function AprenderScreen() {
  const { colors } = useTheme();
  const [tab, setTab] = useState<TabKey>('guardar');

  /**
   * `reading` NÃO é limpo ao fechar: a folha desliza pra fora durante uns 300ms
   * e, sem o conteúdo, ela desceria vazia na frente da pessoa. O `open` separado
   * mantém o texto no lugar até a animação acabar; o `reading` velho fica
   * invisível e é trocado no próximo toque.
   */
  const [reading, setReading] = useState<Reading | null>(null);
  const [open, setOpen] = useState(false);

  const read = useCallback((next: Reading) => {
    setReading(next);
    setOpen(true);
  }, []);

  return (
    <Screen scroll>
      <View style={styles.page}>
        <View style={styles.head}>
          <AppText variant="title">Aprender</AppText>
          <AppText variant="small" tone="secondary">
            O mínimo pra você não ser enganado.
          </AppText>
        </View>

        {/*
          Sem amarelo e sem alarme, de propósito. O card de marca fazia deste
          aviso a coisa mais barulhenta da tela — e aviso que grita todo dia é
          aviso que ninguém lê no segundo dia. Ele é o limite duro do projeto:
          precisa estar sempre visível, não precisa estar sempre berrando.
        */}
        <Card tone="sunken" padded={false} style={styles.band}>
          <View style={styles.bandIcon}>
            <Icon name="info" size={16} tone="muted" />
          </View>
          <AppText variant="small" tone="muted" style={styles.bandText}>
            {DISCLAIMER}
          </AppText>
        </Card>

        <SegmentedControl options={TABS} value={tab} onChange={(key) => setTab(toTabKey(key))} />

        {tab === 'guardar' ? (
          <View style={styles.section}>
            {/* A ordem da lista É conteúdo, mas é conteúdo de quem já parou pra
                perguntar "por que nessa ordem?". Fica atrás de um toque em vez de
                empurrar a lista pra baixo da dobra. */}
            <Reveal label="Por que a ordem importa">
              <Paragraph>{ORDER_MATTERS}</Paragraph>
            </Reveal>

            <Card>
              {TOPICS.map((topic, index) => {
                const safety = SAFETY[topic.safety];
                return (
                  <ListRow
                    key={topic.id}
                    title={topic.title}
                    subtitle={topic.oneLiner}
                    leading={<Icon name={safety.icon} color={colors.status[safety.mark]} />}
                    onPress={() => read({ kind: 'topic', topic })}
                    divider={index < TOPICS.length - 1}
                    accessibilityLabel={`${topic.title}. ${safety.label}. ${topic.oneLiner}`}
                  />
                );
              })}
            </Card>
          </View>
        ) : null}

        {tab === 'golpes' ? (
          <Card>
            {/* Sem ícone no `leading`: seis linhas com o mesmo glifo de perigo não
                informam nada — a aba já se chama Golpes. Ícone que não distingue
                uma linha da outra é enfeite, e enfeite aqui é ruído. */}
            {SCAMS.map((scam, index) => (
              <ListRow
                key={scam.id}
                title={scam.title}
                subtitle={scam.sign}
                onPress={() => read({ kind: 'scam', scam })}
                divider={index < SCAMS.length - 1}
                accessibilityLabel={`${scam.title}. ${scam.sign}`}
              />
            ))}
          </Card>
        ) : null}

        {tab === 'dicionario' ? (
          <Card>
            {GLOSSARY.map((entry, index) => (
              <ListRow
                key={entry.term}
                title={entry.term}
                subtitle={entry.plain}
                onPress={() => read({ kind: 'term', term: entry.term, plain: entry.plain })}
                divider={index < GLOSSARY.length - 1}
              />
            ))}
          </Card>
        ) : null}
      </View>

      <Sheet
        visible={open}
        onClose={() => setOpen(false)}
        title={reading === null ? '' : readingTitle(reading)}
      >
        {reading === null ? null : reading.kind === 'topic' ? (
          <TopicBody topic={reading.topic} />
        ) : reading.kind === 'scam' ? (
          <ScamBody scam={reading.scam} />
        ) : (
          <View style={styles.reading}>
            <Paragraph>{reading.plain}</Paragraph>
          </View>
        )}
      </Sheet>
    </Screen>
  );
}

/** Coluna de leitura. No celular não muda nada; no tablet impede a linha
 *  quilométrica que ninguém consegue seguir de uma ponta à outra. */
const READING_WIDTH = 640;

const styles = StyleSheet.create({
  page: { gap: spacing.xl },
  head: { gap: spacing.xs },
  section: { gap: spacing.md },

  band: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
  },
  // O ícone nasce no topo do bloco; o `1` acerta ele com a primeira linha do
  // texto, que tem lineHeight maior que o glifo.
  bandIcon: { paddingTop: 1 },
  bandText: { flex: 1, lineHeight: 20 },

  reading: {
    gap: spacing.lg,
    maxWidth: READING_WIDTH,
    width: '100%',
    alignSelf: 'center',
  },
  // 15/25 em vez de 15/22: esta é a tela de LER, e o vão entre linhas é o que
  // separa um texto que se acompanha de um bloco que se pula.
  paragraph: { lineHeight: 25 },

  fact: { gap: spacing.xs },
  bullet: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  // Vão fixo: os marcadores alinham em coluna e o texto começa no mesmo x. O
  // recuo de topo muda com o marcador porque os dois têm alturas diferentes e
  // precisam cair no meio da PRIMEIRA linha (lineHeight 25), não no topo dela.
  marker: { width: 14, alignItems: 'center' },
  markerIcon: { paddingTop: 5 },
  markerDot: { paddingTop: 11 },
  dot: { width: 4, height: 4, borderRadius: radius.pill },
  bulletText: { flex: 1, lineHeight: 25 },
});
