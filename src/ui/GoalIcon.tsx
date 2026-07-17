import { AppText, useOnBrand } from './AppText';
import { Icon, isIconName, type IconProps } from './Icon';

export type GoalIconProps = {
  /**
   * O que está guardado em `Goal.emoji`. Depois da migração para o catálogo de
   * ícones, isso é a CHAVE de um ícone (`goalCar`, `goalTrip`...). Em aparelhos
   * que testaram o app antes, ainda pode ser um emoji de verdade gravado no
   * banco: por isso a decisão mora aqui, num lugar só.
   */
  value: string;
  /** Padrão 20, o do corpo de texto. */
  size?: number;
  /** Igual ao do `Icon`. Sem valor, segue a marca da superfície (onBrand). */
  tone?: IconProps['tone'];
  color?: string;
};

/**
 * O ícone da meta que a PESSOA escolheu. Uma peça só, para que a mesma regra
 * valha em toda tela que lê `goal.emoji`: se for chave do catálogo, vira `Icon`
 * de linha; se for um emoji antigo, segue como glifo para não sumir da meta de
 * quem já usava o app.
 */
export function GoalIcon({ value, size = 20, tone, color }: GoalIconProps) {
  const onBrand = useOnBrand();

  if (isIconName(value)) {
    return (
      <Icon name={value} size={size} tone={tone ?? (onBrand ? 'onBrand' : 'primary')} color={color} />
    );
  }

  // Valor legado: um emoji real, gravado antes de `GOAL_ICONS` virar catálogo de
  // chaves. O glifo colorido ignora a cor do tema, então aqui não há tinta a
  // aplicar: ele é a própria ilustração.
  return <AppText style={{ fontSize: size, lineHeight: Math.round(size * 1.2) }}>{value}</AppText>;
}
