import Feather from '@expo/vector-icons/Feather';
import type { ComponentProps } from 'react';
import { useTheme } from '@/theme/useTheme';
import type { ThemeColors } from '@/theme/tokens';

type FeatherName = ComponentProps<typeof Feather>['name'];

/**
 * Ícones de linha, monocromáticos, tamanho único de traço.
 *
 * Por que não emoji: emoji é ilustração colorida que cada sistema desenha do
 * seu jeito, ignora a cor do tema e não tem peso visual consistente. Uma tela
 * cheia deles lê como conversa de aplicativo de mensagem, não como app de
 * dinheiro — e foi metade da razão de a primeira versão parecer amadora.
 *
 * Emoji continua existindo em UM lugar: onde a PESSOA escolheu (o ícone da meta
 * dela, o avatar). Aí ele é conteúdo, não decoração de interface.
 *
 * O catálogo abaixo é fechado de propósito. Tela não escolhe nome de ícone da
 * biblioteca inteira — escolhe um papel daqui. É o que impede o app de ter três
 * ícones diferentes para "dinheiro".
 */
export const ICONS = {
  // Navegação
  home: 'home',
  money: 'dollar-sign',
  card: 'credit-card',
  target: 'target',
  learn: 'book-open',
  profile: 'user',
  chat: 'message-circle',
  plan: 'pie-chart',

  // Ações
  add: 'plus',
  close: 'x',
  back: 'chevron-left',
  next: 'chevron-right',
  up: 'chevron-up',
  down: 'chevron-down',
  edit: 'edit-2',
  trash: 'trash-2',
  camera: 'camera',
  check: 'check',
  refresh: 'refresh-cw',

  // Estado / significado
  shield: 'shield',
  alert: 'alert-triangle',
  info: 'info',
  ok: 'check-circle',
  danger: 'alert-octagon',
  trendUp: 'trending-up',
  trendDown: 'trending-down',
  calendar: 'calendar',
  lock: 'lock',
  eye: 'eye',
  eyeOff: 'eye-off',

  /**
   * Categorias — o papel de uma linha de lista (uma entrada, uma conta, uma
   * assinatura). Aqui o ícone é o RITMO da lista, não a identidade dela: quem
   * diz "Moradia" é o rótulo, então duas categorias vizinhas podem dividir o
   * mesmo glifo sem prejuízo nenhum.
   *
   * O Feather não tem carteira nem controle de videogame. Importar um segundo
   * pacote de ícones por causa disso traria outro traço e outra grade para a
   * mesma tela — sai muito mais caro que emprestar o glifo mais próximo.
   */
  work: 'briefcase',
  tool: 'tool',
  gift: 'gift',
  bill: 'zap',
  market: 'shopping-cart',
  transport: 'navigation',
  health: 'heart',
  leisure: 'film',
  box: 'package',
  tv: 'tv',
  music: 'headphones',
  games: 'monitor',
  gym: 'activity',
  phone: 'smartphone',
} as const;

export type IconName = keyof typeof ICONS;

export type IconProps = {
  name: IconName;
  /** Tamanho em px. Padrão 20 — o do corpo de texto. */
  size?: number;
  /**
   * Papel de tinta. Ícone segue as MESMAS tintas do texto: ele é um glifo, não
   * um enfeite. Cor de série (de gráfico) nunca entra aqui.
   */
  tone?: 'primary' | 'secondary' | 'muted' | 'onBrand' | 'inverse';
  /** Escape para status (good/warning/critical), que têm cor própria fixa. */
  color?: string;
};

function toneColor(colors: ThemeColors, tone: NonNullable<IconProps['tone']>): string {
  switch (tone) {
    case 'primary':
      return colors.ink.primary;
    case 'secondary':
      return colors.ink.secondary;
    case 'muted':
      return colors.ink.muted;
    case 'onBrand':
      return colors.ink.onBrand;
    case 'inverse':
      return colors.ink.inverse;
  }
}

export function Icon({ name, size = 20, tone = 'secondary', color }: IconProps) {
  const { colors } = useTheme();
  return (
    <Feather
      name={ICONS[name] as FeatherName}
      size={size}
      color={color ?? toneColor(colors, tone)}
      // O ícone é decorativo: quem carrega o significado é o rótulo ao lado.
      // Sem isto, o leitor de tela anuncia "dollar-sign" antes de cada valor.
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}
