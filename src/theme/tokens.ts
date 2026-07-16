/**
 * Design tokens do Arrego.
 *
 * REGRA DE OURO DO AMARELO — não negocie com ela:
 * O amarelo da marca (#FFC53D) tem luminância relativa 0.6147. Isso significa:
 *   - texto PRETO sobre o amarelo  -> contraste 13.3:1  (ótimo)
 *   - texto BRANCO sobre o amarelo -> contraste  1.58:1 (ilegível)
 * Portanto o amarelo é sempre SUPERFÍCIE, nunca tinta. Nada de texto amarelo
 * sobre fundo claro, e nada de texto branco sobre amarelo. Use `ink.onBrand`.
 *
 * CORES DE DADOS (gráficos) != CORES DE MARCA.
 * As cores de série abaixo vêm da paleta de referência já validada (pior ΔE
 * adjacente sob daltonismo = 24.2 no modo claro, bem acima do alvo de 12).
 * Não invente slots novos e não use o amarelo da marca como cor de série —
 * ele impersonaria a identidade visual dentro do gráfico.
 */

export const palette = {
  /** Marca — só superfície/acento. Nunca como tinta de texto. */
  brand: {
    amber: '#FFC53D',
    amberDeep: '#E0A200',
    amberSoft: '#FFF3D1',
    amberSofter: '#FFFBEF',
  },

  light: {
    /** Plano da página (fundo do app) */
    plane: '#FBFAF7',
    /** Superfície de card */
    surface: '#FFFFFF',
    /** Superfície levemente recuada (linhas alternadas, inputs) */
    surfaceSunken: '#F4F2EC',
    ink: {
      primary: '#17150F',
      secondary: '#56524A',
      muted: '#8B8577',
      /** Tinta usada EM CIMA do amarelo da marca */
      onBrand: '#17150F',
      inverse: '#FFFFFF',
    },
    hairline: '#E6E3DA',
    border: 'rgba(23,21,15,0.10)',
  },

  dark: {
    plane: '#100F0C',
    surface: '#1A1815',
    surfaceSunken: '#232019',
    ink: {
      primary: '#FFFFFF',
      secondary: '#C7C2B4',
      muted: '#8B8577',
      onBrand: '#17150F',
      inverse: '#17150F',
    },
    hairline: '#2E2B24',
    border: 'rgba(255,255,255,0.10)',
  },

  /**
   * Status — fixo, nunca tematizado, nunca reaproveitado como "série 5".
   * Sempre acompanhado de ícone + rótulo: a cor nunca carrega o significado
   * sozinha (warning e serious ficam abaixo de 3:1 no fundo claro de propósito).
   */
  status: {
    good: '#0CA30C',
    warning: '#FAB219',
    serious: '#EC835A',
    critical: '#D03B3B',
  },

  /**
   * Dinheiro. Marca (fill) e tinta (texto) são steps DIFERENTES de propósito:
   * o step de marca não alcança 4.5:1 para texto no fundo claro.
   */
  money: {
    positiveMark: '#0CA30C',
    positiveText: '#006300',
    positiveTextDark: '#0CA30C',
    negativeMark: '#D03B3B',
    negativeText: '#B02525',
    negativeTextDark: '#E86A6A',
  },

  /**
   * Slots categóricos — ordem FIXA, nunca cicle.
   * A ordem é o mecanismo de segurança para daltonismo, não enfeite.
   * Teto de 8. Uma 9ª categoria vira "Outros", jamais uma cor nova.
   */
  series: {
    light: [
      '#2A78D6', // 1 azul
      '#1BAF7A', // 2 água
      '#EDA100', // 3 amarelo
      '#008300', // 4 verde
      '#4A3AA7', // 5 violeta
      '#E34948', // 6 vermelho
      '#E87BA4', // 7 magenta
      '#EB6834', // 8 laranja
    ],
    dark: [
      '#3987E5',
      '#199E70',
      '#C98500',
      '#008300',
      '#9085E9',
      '#E66767',
      '#D55181',
      '#D95926',
    ],
  },

  /** Cinza de "des-ênfase" — o resto quando uma série é o assunto. */
  deemphasis: {
    light: '#D6D2C7',
    dark: '#3A362C',
  },
} as const;

/** Escala de espaçamento em passos de 4. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
  /** Ponta arredondada de marca de dado (barra/medidor) */
  dataEnd: 4,
} as const;

/**
 * Tipografia. Uma única família sans do sistema — sem display, sem serifada.
 * `tabular` só onde números precisam alinhar verticalmente (colunas, extrato).
 * Números grandes soltos (figura-herói) usam algarismos proporcionais.
 */
export const typography = {
  hero: { fontSize: 44, lineHeight: 48, fontWeight: '800' },
  title: { fontSize: 26, lineHeight: 32, fontWeight: '800' },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
  subheading: { fontSize: 17, lineHeight: 24, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontWeight: '600' },
  small: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
} as const;

/** Sombras discretas — o app é claro e limpo, não dramático. */
export const elevation = {
  card: {
    shadowColor: '#17150F',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  raised: {
    shadowColor: '#17150F',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
} as const;

/** Alvo mínimo de toque — acessibilidade, não sugestão. */
export const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 } as const;
export const MIN_TOUCH = 44;

export type Scheme = 'light' | 'dark';

export type ThemeColors = {
  plane: string;
  surface: string;
  surfaceSunken: string;
  ink: {
    primary: string;
    secondary: string;
    muted: string;
    onBrand: string;
    inverse: string;
  };
  hairline: string;
  border: string;
  brand: typeof palette.brand;
  status: typeof palette.status;
  series: readonly string[];
  deemphasis: string;
  money: {
    positiveMark: string;
    positiveText: string;
    negativeMark: string;
    negativeText: string;
  };
};

export function getColors(scheme: Scheme): ThemeColors {
  const base = scheme === 'dark' ? palette.dark : palette.light;
  return {
    plane: base.plane,
    surface: base.surface,
    surfaceSunken: base.surfaceSunken,
    ink: base.ink,
    hairline: base.hairline,
    border: base.border,
    brand: palette.brand,
    status: palette.status,
    series: scheme === 'dark' ? palette.series.dark : palette.series.light,
    deemphasis: scheme === 'dark' ? palette.deemphasis.dark : palette.deemphasis.light,
    money: {
      positiveMark: palette.money.positiveMark,
      positiveText:
        scheme === 'dark' ? palette.money.positiveTextDark : palette.money.positiveText,
      negativeMark: palette.money.negativeMark,
      negativeText:
        scheme === 'dark' ? palette.money.negativeTextDark : palette.money.negativeText,
    },
  };
}

/** Cor de série por índice. Estoura no "Outros" em vez de gerar uma 9ª cor. */
export function seriesColor(scheme: Scheme, index: number): string {
  const slots = scheme === 'dark' ? palette.series.dark : palette.series.light;
  return slots[Math.min(index, slots.length - 1)] ?? slots[0]!;
}
