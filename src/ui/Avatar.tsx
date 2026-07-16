import { Image, StyleSheet, View } from 'react-native';
import { palette } from '@/theme/tokens';
import { AppText } from './AppText';

export type AvatarProps = {
  name: string;
  photoUri?: string | null;
  emoji?: string;
  size?: number;
};

const SERIES = palette.series.light;

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
 * Sem foto, o fundo sai do hash do nome — mas SEMPRE lavado com branco e
 * SEMPRE com tinta escura, nos dois temas. A cor de série cheia não sustenta
 * 4.5:1 com tinta escura, e um fundo que muda de claridade com o tema obrigaria
 * a tinta a virar junto. Aqui a claridade é fixa: só o matiz varia.
 */
export function Avatar({ name, photoUri, emoji = '🙂', size = 40 }: AvatarProps) {
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
  const glyph = emoji.trim();
  const initial = name.trim().charAt(0).toUpperCase() || '?';

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
        style={{
          fontSize: Math.round(size * (glyph ? 0.46 : 0.4)),
          lineHeight: Math.round(size * 0.58),
          // 600, não 700: num avatar de 96px isto vira um glifo de ~44px, e a
          // escala manda o hero (40px) em 600. Peso maior que o do número
          // principal da tela inverteria a hierarquia por acidente.
          fontWeight: '600',
          color: palette.light.ink.primary,
        }}
      >
        {glyph || initial}
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
