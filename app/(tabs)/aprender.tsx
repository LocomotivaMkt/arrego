/**
 * Aprender — a tela em que o app ensina em vez de opinar.
 *
 * O DISCLAIMER abre a tela dentro de um card de marca, não some no rodapé em
 * fonte 10. É a peça mais importante daqui: a fronteira entre "explico como
 * funciona" e "faz isso com a sua grana" é a única coisa que impede um texto
 * bem-intencionado de virar conselho ruim na vida de alguém de 20 anos. Quem
 * ler esta tela decide sozinho — o app só entrega o mecanismo.
 */

import { useCallback, useState } from 'react';
import { LayoutAnimation, Pressable, StyleSheet, View } from 'react-native';
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
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import type { InsightSeverity } from '@/types/models';
import {
  AppText,
  Badge,
  Card,
  Chip,
  ListRow,
  Screen,
  SegmentedControl,
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
 * A cor do Badge sai da severidade; quem carrega o significado é o rótulo, que
 * separa "Muito seguro" de "Seguro" mesmo quando os dois pintam de verde.
 */
const SAFETY: Record<SafetyLevel, { label: string; severity: InsightSeverity }> = {
  'muito-seguro': { label: 'Muito seguro', severity: 'good' },
  seguro: { label: 'Seguro', severity: 'good' },
  depende: { label: 'Depende', severity: 'warning' },
  perigoso: { label: 'Perigoso', severity: 'critical' },
};

/**
 * `protectedBy` e `liquidity` são FRASES ("FGC até R$ 250 mil por CPF e por
 * instituição"), e chip é de uma linha só. Estes dois recortam a primeira
 * cláusula pro chip caber; o texto completo aparece ao expandir, em
 * "Quem garante:" e "Liquidez:" — nada de informação só no recorte.
 * Se alguém reescrever o conteúdo e o corte não for encontrado, cai de volta
 * na frase inteira: encolhe no chip, mas não mente.
 *
 * Nada de `\b` depois de "até": `\w` do JS é ASCII puro, então o "é" não conta
 * como letra e a borda de palavra nunca casaria — o recorte morreria calado.
 */
function guarantorTag(protectedBy: string | null): string {
  if (protectedBy === null) return 'Ninguém garante';
  const head = protectedBy.split(/\s+(?:até\s|\()/)[0]?.trim();
  return head === undefined || head === '' ? protectedBy : head;
}

function liquidityTag(liquidity: string): string {
  const head = liquidity.split(/[.,;]|\s—\s/)[0]?.trim();
  return head === undefined || head === '' ? liquidity : head;
}

function toggleIn(current: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(current);
  if (!next.delete(id)) next.add(id);
  return next;
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.block}>
      <AppText variant="caption" tone="secondary">
        {label}
      </AppText>
      <AppText variant="small">{value}</AppText>
    </View>
  );
}

function Bullets({
  label,
  marker,
  items,
}: {
  label: string;
  marker: string;
  items: readonly string[];
}) {
  return (
    <View style={styles.block}>
      <AppText variant="caption" tone="secondary">
        {label}
      </AppText>
      {items.map((item) => (
        <View key={item} style={styles.bullet}>
          <AppText variant="small">{marker}</AppText>
          <AppText variant="small" tone="secondary" style={styles.grow}>
            {item}
          </AppText>
        </View>
      ))}
    </View>
  );
}

function TopicCard({
  topic,
  expanded,
  onToggle,
}: {
  topic: Topic;
  expanded: boolean;
  onToggle: () => void;
}) {
  const safety = SAFETY[topic.safety];

  return (
    <Card style={styles.stack}>
      <Pressable
        onPress={onToggle}
        accessible
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${topic.title}. ${safety.label}. ${topic.oneLiner}`}
        accessibilityHint={expanded ? 'Toque para recolher' : 'Toque para ler a explicação'}
        style={({ pressed }) => [styles.head, pressed && styles.pressed]}
      >
        <AppText style={styles.emoji}>{topic.emoji}</AppText>
        <View style={styles.grow}>
          <AppText variant="subheading">{topic.title}</AppText>
          <AppText variant="small" tone="secondary">
            {topic.oneLiner}
          </AppText>
        </View>
        <AppText variant="body" tone="muted">
          {expanded ? '▴' : '▾'}
        </AppText>
      </Pressable>

      <View style={styles.tags}>
        <Badge label={safety.label} severity={safety.severity} />
        <Chip
          icon={topic.protectedBy === null ? '🚫' : '🛡️'}
          label={guarantorTag(topic.protectedBy)}
        />
        <Chip icon="⏱️" label={liquidityTag(topic.liquidity)} />
      </View>

      {expanded ? (
        <View style={styles.stack}>
          {topic.body.map((paragraph, index) => (
            <AppText key={`${topic.id}-${index}`} variant="body" tone="secondary">
              {paragraph}
            </AppText>
          ))}
          <Fact
            label="Quem garante:"
            value={
              topic.protectedBy ??
              'Ninguém. Não tem fundo, não tem governo, não tem a quem reclamar. Se sumir, sumiu.'
            }
          />
          <Fact label="Liquidez:" value={topic.liquidity} />
          <Bullets label="Faz sentido quando:" marker="•" items={topic.goodFor} />
          <Bullets label="Presta atenção em:" marker="⚠️" items={topic.watchOut} />
        </View>
      ) : null}
    </Card>
  );
}

function ScamCard({ scam }: { scam: Scam }) {
  return (
    <Card style={styles.stack}>
      <View style={styles.head}>
        <AppText style={styles.emoji}>{scam.emoji}</AppText>
        <View style={styles.grow}>
          <AppText variant="subheading">{scam.title}</AppText>
        </View>
      </View>
      <Fact label="O sinal:" value={scam.sign} />
      <Fact label="A real:" value={scam.truth} />
    </Card>
  );
}

function GlossaryRow({
  term,
  plain,
  expanded,
  onToggle,
}: {
  term: string;
  plain: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <View>
      {/* Recolhido, `plain` vira subtítulo de uma linha e o resto some nas
          reticências — por isso o toque abre a definição inteira embaixo.
          Aberto, o subtítulo sai: senão a primeira linha apareceria duas vezes. */}
      <ListRow
        title={term}
        subtitle={expanded ? undefined : plain}
        onPress={onToggle}
        trailing={
          <AppText variant="small" tone="muted">
            {expanded ? '▴' : '▾'}
          </AppText>
        }
      />
      {expanded ? (
        <AppText variant="small" tone="secondary" style={styles.definition}>
          {plain}
        </AppText>
      ) : null}
    </View>
  );
}

export default function AprenderScreen() {
  const { colors } = useTheme();
  const [tab, setTab] = useState<TabKey>('guardar');
  const [openTopics, setOpenTopics] = useState<ReadonlySet<string>>(new Set());
  const [openTerms, setOpenTerms] = useState<ReadonlySet<string>>(new Set());

  // Sem `setLayoutAnimationEnabledExperimental`: o app roda com a Nova
  // Arquitetura (newArchEnabled), onde LayoutAnimation já funciona no Android e
  // aquela chamada virou no-op que só polui o console com aviso.
  const toggleTopic = useCallback((id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenTopics((current) => toggleIn(current, id));
  }, []);

  const toggleTerm = useCallback((term: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenTerms((current) => toggleIn(current, term));
  }, []);

  return (
    <Screen scroll>
      <View style={styles.page}>
        <View>
          <AppText variant="title">Aprender</AppText>
          <AppText variant="small" tone="secondary">
            O mínimo pra você não ser enganado — e pra saber o que está perguntando.
          </AppText>
        </View>

        {/* Amarelo é superfície: o card de marca é o jeito de isto ser a
            primeira coisa que a pessoa lê, sem tinta amarela em lugar nenhum. */}
        <Card tone="brand" style={styles.stack}>
          <AppText variant="subheading">⚖️ Isto aqui é aula, não é dica</AppText>
          <AppText variant="small">{DISCLAIMER}</AppText>
        </Card>

        <Card style={styles.stack}>
          <AppText variant="subheading">Por que a ordem importa</AppText>
          <AppText variant="small" tone="secondary">
            {ORDER_MATTERS}
          </AppText>
        </Card>

        <SegmentedControl options={TABS} value={tab} onChange={(key) => setTab(toTabKey(key))} />

        {tab === 'guardar' ? (
          <View style={styles.list}>
            {TOPICS.map((topic) => (
              <TopicCard
                key={topic.id}
                topic={topic}
                expanded={openTopics.has(topic.id)}
                onToggle={() => toggleTopic(topic.id)}
              />
            ))}
          </View>
        ) : null}

        {tab === 'golpes' ? (
          <View style={styles.list}>
            {SCAMS.map((scam) => (
              <ScamCard key={scam.id} scam={scam} />
            ))}
          </View>
        ) : null}

        {tab === 'dicionario' ? (
          <Card>
            {GLOSSARY.map((entry, index) => (
              <View key={entry.term}>
                {index > 0 ? (
                  <View style={[styles.hairline, { backgroundColor: colors.hairline }]} />
                ) : null}
                <GlossaryRow
                  term={entry.term}
                  plain={entry.plain}
                  expanded={openTerms.has(entry.term)}
                  onToggle={() => toggleTerm(entry.term)}
                />
              </View>
            ))}
          </Card>
        ) : null}

        <AppText variant="caption" tone="muted" style={styles.footer}>
          De novo, porque importa: o Arrego explica, não recomenda. Taxas, regras e limites mudam —
          confirme na fonte oficial antes de decidir qualquer coisa.
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { gap: spacing.lg },
  stack: { gap: spacing.md },
  list: { gap: spacing.md },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  emoji: { fontSize: 28, lineHeight: 34 },
  grow: { flex: 1 },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  block: { gap: spacing.xs },
  bullet: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  definition: { paddingBottom: spacing.sm },
  hairline: { height: StyleSheet.hairlineWidth },
  footer: { textAlign: 'center' },
  pressed: { opacity: 0.65 },
});
