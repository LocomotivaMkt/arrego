import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { useTheme } from '@/theme/useTheme';
import type { ThemeColors } from '@/theme/tokens';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

/**
 * Ícones de linha, uma família só, traço e grade únicos.
 *
 * POR QUE NÃO EMOJI: emoji é ilustração colorida que cada sistema desenha do
 * seu jeito, ignora a cor do tema e não tem peso visual consistente. Uma tela
 * cheia deles lê como conversa de aplicativo de mensagem, não como app de
 * dinheiro. Não sobrou nenhum na interface: nem no seletor de meta, nem no
 * avatar, nem na cara da Arrego.
 *
 * POR QUE IONICONS E NÃO FEATHER: o Feather é mais bonito e não tem carro,
 * nem pet, nem avião, nem escola. Um app de metas sem ícone de carro obriga a
 * "emprestar" um glifo torto ou a importar um segundo pacote, e dois pacotes
 * significam dois traços e duas grades na mesma tela. Uma família completa e
 * correta ganha de uma família bonita e incompleta.
 *
 * O CATÁLOGO É FECHADO de propósito. Tela não escolhe nome da biblioteca
 * inteira (são 1357): escolhe um PAPEL daqui. É o que impede o app de ter três
 * ícones diferentes para "dinheiro" e, quando esta família for trocada de novo,
 * é o que faz a troca custar um arquivo em vez de sessenta.
 */
export const ICONS = {
  // Navegação
  home: 'home-outline',
  money: 'wallet-outline',
  card: 'card-outline',
  target: 'flag-outline',
  learn: 'book-outline',
  profile: 'person-outline',
  chat: 'chatbubble-ellipses-outline',
  plan: 'pie-chart-outline',

  // Ações
  add: 'add',
  close: 'close',
  back: 'chevron-back',
  next: 'chevron-forward',
  up: 'chevron-up',
  down: 'chevron-down',
  edit: 'create-outline',
  trash: 'trash-outline',
  camera: 'camera-outline',
  check: 'checkmark',
  refresh: 'refresh',
  minus: 'remove',

  // Estado / significado
  shield: 'shield-outline',
  shieldOk: 'shield-checkmark-outline',
  alert: 'warning-outline',
  info: 'information-circle-outline',
  ok: 'checkmark-circle-outline',
  danger: 'alert-circle-outline',
  trendUp: 'trending-up',
  trendDown: 'trending-down',
  calendar: 'calendar-outline',
  lock: 'lock-closed-outline',
  eye: 'eye-outline',
  eyeOff: 'eye-off-outline',
  cash: 'cash-outline',

  // Categorias de gasto e de entrada
  work: 'briefcase-outline',
  tool: 'construct-outline',
  gift: 'gift-outline',
  bill: 'flash-outline',
  market: 'cart-outline',
  transport: 'bus-outline',
  health: 'medkit-outline',
  leisure: 'film-outline',
  box: 'cube-outline',
  tv: 'tv-outline',
  music: 'headset-outline',
  games: 'game-controller-outline',
  gym: 'barbell-outline',
  phone: 'phone-portrait-outline',
  food: 'fast-food-outline',
  coffee: 'cafe-outline',

  /**
   * Ícones de META — os que a PESSOA escolhe.
   *
   * Estes eram emoji e são o motivo real da troca de família: um seletor de
   * meta sem carro nem pet não serve. `Goal.emoji` guarda a chave daqui; o
   * nome da coluna ficou por herança, e trocá-lo custaria uma migração para
   * não mudar nada de comportamento.
   */
  goalCar: 'car-outline',
  goalHome: 'home',
  goalStudy: 'school-outline',
  goalTrip: 'airplane-outline',
  goalLaptop: 'laptop-outline',
  goalPhone: 'phone-portrait-outline',
  goalMusic: 'musical-notes-outline',
  goalPet: 'paw-outline',
  goalWedding: 'diamond-outline',
  goalShield: 'shield-outline',
  goalTarget: 'flag-outline',
} as const;

export type IconName = keyof typeof ICONS;

/** Serve para decidir se um valor guardado no banco é ícone ou emoji antigo. */
export function isIconName(value: string): value is IconName {
  return Object.prototype.hasOwnProperty.call(ICONS, value);
}

export type IconProps = {
  name: IconName;
  /** Tamanho em px. Padrão 20, o do corpo de texto. */
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
    <Ionicons
      name={ICONS[name] as IoniconName}
      size={size}
      color={color ?? toneColor(colors, tone)}
      // O ícone é decorativo: quem carrega o significado é o rótulo ao lado.
      // Sem isto, o leitor de tela anuncia "wallet-outline" antes de cada valor.
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}
