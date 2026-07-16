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

/**
 * REGRA DO AMARELO — a que mais mudou depois do veredito "parece um golpe".
 *
 * O amarelo aparece em UMA superfície por tela. Uma. A tela tem um assunto
 * principal, e o amarelo é quem aponta pra ele — se ele está em três lugares,
 * não aponta pra lugar nenhum e vira só barulho colorido. Card amarelo, botão
 * amarelo e chip amarelo na mesma tela é a receita de "site de pirâmide".
 *
 * Ordem de precedência quando houver dúvida sobre quem fica amarelo:
 *   1. O card do número principal (a sobra do mês).
 *   2. O botão da ação principal, se não houver card de destaque.
 *   3. O estado ativo de uma seleção.
 * O resto é branco, cinza e tinta.
 *
 * SELEÇÃO NÃO GASTA O AMARELO. A precedência 3 quase nunca ganha, porque quase
 * toda tela tem um botão principal. Por isso `Chip`, `SegmentedControl` e
 * `DayField` marcam o item escolhido com TINTA CHEIA (`ink.primary` de fundo,
 * `ink.inverse` de texto), não com a marca. Era o contrário, e o resultado é que
 * qualquer formulário com três seletores nascia com quatro superfícies amarelas
 * — três pílulas e o botão — cada uma apontando pra um lado. Amarelo em quatro
 * lugares não aponta pra nada: só grita.
 *
 * EXCEÇÃO ÚNICA — a bolha de conversa. Em /conversa, cada fala DA PESSOA é uma
 * bolha `brand.amber`, e uma thread tem várias. Isso não viola a regra: as
 * bolhas não competem por atenção, elas são uma coisa só (a voz da pessoa)
 * repetida ao longo do tempo, e é assim que todo aplicativo de mensagem do mundo
 * funciona. A regra existe para impedir três elementos DIFERENTES disputando o
 * olho — não para impedir uma lista homogênea.
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
    /** Plano da página. Cinza quase branco, para o card branco pousar em cima. */
    plane: '#F6F5F2',
    /** Superfície de card */
    surface: '#FFFFFF',
    /** Superfície levemente recuada (input, trilho de medidor) */
    surfaceSunken: '#EFEDE8',
    ink: {
      primary: '#191713',
      secondary: '#6B665C',
      muted: '#9C968A',
      /** Tinta usada EM CIMA do amarelo da marca */
      onBrand: '#191713',
      inverse: '#FFFFFF',
    },
    /** Fio quase invisível. Separar é trabalho do espaço, não da linha. */
    hairline: '#EAE8E2',
    border: 'rgba(25,23,19,0.06)',
  },

  dark: {
    plane: '#0E0D0B',
    surface: '#1A1815',
    surfaceSunken: '#252219',
    ink: {
      primary: '#F7F6F3',
      secondary: '#A9A497',
      muted: '#78736A',
      onBrand: '#191713',
      inverse: '#191713',
    },
    hairline: '#26231D',
    border: 'rgba(255,255,255,0.07)',
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

/**
 * Escala de espaçamento em passos de 4.
 *
 * O espaço é o principal material deste app. Quando estiver na dúvida entre
 * uma borda e um espaço, use o espaço: borda divide, espaço organiza. A versão
 * anterior desta tela parecia golpe justamente por isso — tudo encostado em
 * tudo, cada bloco gritando por atenção ao mesmo tempo.
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  /** Margem lateral padrão de qualquer tela. Não invente outra. */
  screen: 24,
  /** Respiro interno de um card. */
  card: 20,
  /** Distância entre dois assuntos diferentes na mesma tela. */
  section: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  /** Card padrão. Arredondamento generoso lê como "produto", não como formulário. */
  card: 20,
  /** Folha que sobe de baixo. */
  sheet: 28,
  pill: 999,
  /** Ponta arredondada de marca de dado (barra/medidor) */
  dataEnd: 4,
} as const;

/**
 * Tipografia. Uma única família sans do sistema — sem display, sem serifada.
 * `tabular` só onde números precisam alinhar verticalmente (colunas, extrato).
 * Números grandes soltos (figura-herói) usam algarismos proporcionais.
 *
 * A hierarquia se faz por TAMANHO e COR, quase nunca por peso. Peso 800 em tudo
 * é o que faz uma tela gritar — e tela que grita não é lida, é fechada.
 * O número é grande e leve; o rótulo é pequeno e cinza. Só isso.
 */
export const typography = {
  /** O número que responde a pergunta da tela. Um por tela, no máximo. */
  hero: { fontSize: 40, lineHeight: 46, fontWeight: '600' },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '600' },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  subheading: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
  small: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  /** Rótulo acima/abaixo de um número. Sempre em tinta `muted`. */
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
} as const;

/**
 * ORÇAMENTO DE TEXTO — regra dura, não sugestão.
 *
 * A primeira versão deste app tinha 2.393 caracteres de texto corrido na tela
 * de Metas e 2.124 na de Grana. O dono resumiu em uma frase: "parece um golpe".
 * Ele está certo, e o motivo é estrutural: aplicativo sério mostra o número e
 * cala a boca. Quem precisa se explicar em três parágrafos é quem está vendendo
 * alguma coisa. Excesso de texto não é generosidade — é ruído, e ruído destrói
 * confiança mais rápido que uma cor feia.
 *
 * A Arrego continua sarcástica. Só que sarcasmo é TEMPERO, e a versão anterior
 * serviu o tempero como prato principal. Nas telas ela fala UMA linha. Quem
 * quiser a boca inteira dela abre a conversa — lá texto é o conteúdo, e aí pode.
 */
export const textBudget = {
  /** Fala da persona numa tela que não é a conversa. Uma linha, e olhe lá. */
  personaLine: 90,
  /** Legenda de apoio embaixo de um número. */
  caption: 60,
  /** Título de seção. */
  sectionTitle: 24,
  /**
   * Parágrafo corrido só existe em /aprender e /conversa. Em qualquer outra
   * tela, explicação longa vai atrás de um toque ("Por quê?"), nunca aberta
   * por padrão. Se não couber num toque, provavelmente não precisa existir.
   */
  paragraphsAllowedOn: ['aprender', 'conversa'] as const,
} as const;

/**
 * Sombra é quase inexistente de propósito. Card branco sobre plano cinza já se
 * separa sozinho; sombra forte em cima disso é maquiagem, e maquiagem demais é
 * exatamente o que faz uma interface parecer suspeita.
 */
export const elevation = {
  card: {
    shadowColor: '#191713',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  raised: {
    shadowColor: '#191713',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
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
