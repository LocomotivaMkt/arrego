import { useMemo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { radius, seriesColor } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import type { CategorySlice } from '@/types/models';

export type StackedBarProps = {
  slices: CategorySlice[];
  height?: number;
};

/** Vão entre segmentos: o corte é o que separa as fatias, não a cor. */
const GAP = 2;
/** Piso de largura: fatia pequena é informação, não ruído. */
const MIN_SEGMENT = 3;

type Segment = { key: string; color: string; width: number };

export function StackedBar({ slices, height = 14 }: StackedBarProps) {
  const { scheme, colors } = useTheme();
  const [trackWidth, setTrackWidth] = useState(0);

  const segments = useMemo<Segment[]>(() => {
    // O índice de COR é o índice na lista original, não na filtrada. A Legend
    // percorre `slices` inteira: filtrar antes de colorir desalinharia as duas.
    const visible = slices
      .map((slice, index) => ({ slice, index }))
      .filter((item) => item.slice.share > 0);

    if (visible.length === 0 || trackWidth <= 0) return [];

    const available = Math.max(0, trackWidth - GAP * (visible.length - 1));
    const raw = visible.map((item) => Math.min(1, Math.max(0, item.slice.share)) * available);
    const lifted = raw.map((width) => Math.max(width, MIN_SEGMENT));

    // Levantar as fatias minúsculas para 3px estoura o total. O excedente sai
    // de quem tem folga, proporcionalmente à folga — assim o "R$ 12 em algo"
    // aparece sem que as fatias grandes mintam de forma perceptível.
    const overflow = lifted.reduce((sum, width) => sum + width, 0) - available;
    const slack = lifted.reduce((sum, width) => sum + Math.max(0, width - MIN_SEGMENT), 0);
    const widths =
      overflow > 0 && slack > 0
        ? lifted.map((width) => width - (Math.max(0, width - MIN_SEGMENT) / slack) * overflow)
        : lifted;

    return visible.map((item, position) => ({
      key: item.slice.key,
      color: seriesColor(scheme, item.index),
      width: widths[position] ?? 0,
    }));
  }, [slices, trackWidth, scheme]);

  const onLayout = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    setTrackWidth((current) => (Math.abs(current - width) < 0.5 ? current : width));
  };

  return (
    <View
      onLayout={onLayout}
      // A Legend é obrigatória ao lado desta barra e já narra tudo. Deixar a
      // barra acessível só faria o leitor de tela repetir a mesma lista.
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.track,
        {
          height,
          // Sem fatias, o trilho vazio é o próprio estado vazio.
          backgroundColor: segments.length > 0 ? colors.surface : colors.surfaceSunken,
        },
      ]}
    >
      {segments.map((segment, index) => (
        <View
          key={segment.key}
          style={{
            width: segment.width,
            backgroundColor: segment.color,
            marginRight: index < segments.length - 1 ? GAP : 0,
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    // Arredonda só as pontas externas: o recorte deixa os cortes internos retos.
    borderRadius: radius.dataEnd,
    overflow: 'hidden',
  },
});
