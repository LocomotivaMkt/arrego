import { Image, StyleSheet, View } from 'react-native';
import { palette } from '@/theme/tokens';
import { AppText } from './AppText';

export type AvatarProps = {
  name: string;
  photoUri?: string | null;
  /**
   * @deprecated IGNORADA. O avatar sem foto virou iniciais, que é o que todo app
   * de banco faz e o que sobra quando emoji não entra mais na interface.
   *
   * A prop continua na assinatura de propósito: a coluna `avatar_emoji` sobreviveu
   * (tirá-la exigiria migração para não mudar comportamento nenhum) e as telas
   * ainda passam o campo. Remover daqui quebraria as chamadas sem trocar um pixel.
   */
  emoji?: string;
  size?: number;
};

const SERIES = palette.series.light;

/**
 * "Ana de Souza" é AS, não AD: em português a partícula liga o nome, não o abre.
 * Só entra aqui o que aparece no MEIO de um nome composto.
 */
const PARTICLES = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);

/**
 * Primeira letra do primeiro nome e do último. Devolve os glifos separados
 * porque quem chama precisa CONTAR quantos são para escolher o corpo da fonte,
 * e `String.length` conta unidades UTF-16, não letras.
 */
function initialsOf(name: string): readonly string[] {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((word) => word !== '' && !PARTICLES.has(word.toLowerCase()));

  const first = words[0];
  if (first === undefined) return [];

  // `Array.from`, não `charAt`: um nome que comece fora do BMP devolveria meio
  // par substituto no `charAt(0)` — um losango, não uma letra.
  const head = Array.from(first)[0];
  if (head === undefined) return [];

  const last = words.length > 1 ? words[words.length - 1] : undefined;
  const tail = last !== undefined ? Array.from(last)[0] : undefined;

  return tail !== undefined ? [head.toUpperCase(), tail.toUpperCase()] : [head.toUpperCase()];
}

/** djb2. Mesma pessoa, mesma cor, sempre — sem guardar nada em lugar nenhum. */
function hashName(name: string): number {
  let hash = 5381;
  for (let index = 0; index < name.length; index++) {
    hash = ((hash << 5) + hash + name.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

/** Mistura a cor com branco. `whiteness` 0 = cor cheia, 1 = branco. */
function tint(hex: string, whiteness: number): string {
  const value = Number.parseInt(hex.slice(1), 16);
  const channels = [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  const mixed = channels.map((channel) =>
    Math.round(channel + (255 - channel) * whiteness)
      .toString(16)
      .padStart(2, '0'),
  );
  return `#${mixed.join('')}`;
}

/**
 * Sem foto, o avatar são as INICIAIS da pessoa. Era um emoji, e emoji de
 * interface saiu do app inteiro — mas aqui a troca não é só regra: iniciais
 * identificam quem é o dono da conta, uma carinha identifica um humor.
 *
 * O fundo continua saindo do hash do nome — mas SEMPRE lavado com branco e
 * SEMPRE com tinta escura, nos dois temas. A cor de série cheia não sustenta
 * 4.5:1 com tinta escura, e um fundo que muda de claridade com o tema obrigaria
 * a tinta a virar junto. Aqui a claridade é fixa: só o matiz varia.
 */
export function Avatar({ name, photoUri, size = 40 }: AvatarProps) {
  const dimension = { width: size, height: size, borderRadius: size / 2 };

  if (photoUri) {
    return (
      <Image
        source={{ uri: photoUri }}
        accessible
        accessibilityRole="image"
        accessibilityLabel={`Foto de ${name}`}
        style={[styles.root, dimension]}
      />
    );
  }

  const base = SERIES[hashName(name) % SERIES.length] ?? SERIES[0];
  const glyphs = initialsOf(name);
  // Nome só de partículas, ou vazio enquanto a pessoa ainda não digitou: o
  // círculo continua existindo, só não afirma uma letra que ninguém escreveu.
  const initials = glyphs.length > 0 ? glyphs.join('') : '?';

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Avatar de ${name}`}
      style={[
        styles.root,
        styles.fallback,
        dimension,
        { backgroundColor: tint(base, 0.86), borderColor: tint(base, 0.55) },
      ]}
    >
      <AppText
        // Duas letras pedem corpo menor que uma: no mesmo círculo, "AS" a 0.42
        // encosta nas bordas e "A" a 0.36 boia no meio de um vazio.
        style={{
          fontSize: Math.round(size * (glyphs.length > 1 ? 0.36 : 0.42)),
          lineHeight: Math.round(size * 0.58),
          // 600, não 700: num avatar de 96px isto vira um glifo de ~40px, e a
          // escala manda o hero (40px) em 600. Peso maior que o do número
          // principal da tela inverteria a hierarquia por acidente.
          fontWeight: '600',
          // Tracking: duas maiúsculas coladas leem como uma sigla apertada.
          letterSpacing: glyphs.length > 1 ? 0.5 : 0,
          color: palette.light.ink.primary,
        }}
      >
        {initials}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  // Só o círculo derivado ganha aro: no `Image`, `borderWidth` sem
  // `borderColor` desenharia um anel preto em volta da foto.
  fallback: {
    borderWidth: StyleSheet.hairlineWidth,
  },
});
