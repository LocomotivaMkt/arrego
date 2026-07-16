import type { Cents } from '@/types/models';

/**
 * Tudo aqui opera em CENTAVOS INTEIROS. Ponto flutuante com dinheiro erra:
 * 0.1 + 0.2 === 0.30000000000000004. Em um app que projeta metas de anos,
 * esse erro acumula e a pessoa vê um centavo fantasma. Centavo inteiro não erra.
 */

/** 'R$ 1.234,56' */
export function formatCents(cents: Cents): string {
  const negative = cents < 0;
  const abs = Math.abs(Math.round(cents));
  const reais = Math.floor(abs / 100);
  const rest = abs % 100;
  const grouped = reais.toLocaleString('pt-BR');
  const decimals = rest.toString().padStart(2, '0');
  return `${negative ? '-' : ''}R$ ${grouped},${decimals}`;
}

/** 'R$ 1.234' — some os centavos. Para números grandes onde o centavo é ruído. */
export function formatCentsRounded(cents: Cents): string {
  const negative = cents < 0;
  const reais = Math.round(Math.abs(cents) / 100);
  return `${negative ? '-' : ''}R$ ${reais.toLocaleString('pt-BR')}`;
}

/** 'R$ 45 mil' — para eixos e rótulos apertados. */
export function formatCentsCompact(cents: Cents): string {
  const negative = cents < 0;
  const reais = Math.abs(cents) / 100;
  const sign = negative ? '-' : '';
  if (reais >= 1_000_000) {
    return `${sign}R$ ${trimZero(reais / 1_000_000)} mi`;
  }
  if (reais >= 1_000) {
    return `${sign}R$ ${trimZero(reais / 1_000)} mil`;
  }
  return `${sign}R$ ${Math.round(reais)}`;
}

function trimZero(value: number): string {
  const fixed = value.toFixed(1);
  return (fixed.endsWith('.0') ? fixed.slice(0, -2) : fixed).replace('.', ',');
}

/**
 * Converte o que a pessoa digitou em centavos.
 * Aceita '1.234,56', '1234,56', '1234.56', 'R$ 50', '50'.
 * Retorna null quando não dá para entender — o chamador decide o que fazer.
 */
export function parseCurrency(input: string): Cents | null {
  const cleaned = input.replace(/[^\d.,-]/g, '').trim();
  if (!cleaned) return null;

  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  // O separador decimal é o ÚLTIMO que aparece. '1.234,56' -> vírgula;
  // '1,234.56' -> ponto. Assim funciona com quem digita nos dois formatos.
  const decimalSep = lastComma > lastDot ? ',' : lastDot > lastComma ? '.' : null;

  let integerPart: string;
  let decimalPart: string;

  if (decimalSep) {
    const index = decimalSep === ',' ? lastComma : lastDot;
    integerPart = cleaned.slice(0, index).replace(/[.,]/g, '');
    decimalPart = cleaned.slice(index + 1).replace(/[.,]/g, '');
    // '1.234' com 3 casas depois do ponto é separador de milhar, não decimal.
    if (decimalPart.length === 3) {
      integerPart = `${integerPart}${decimalPart}`;
      decimalPart = '';
    }
  } else {
    integerPart = cleaned.replace(/[.,]/g, '');
    decimalPart = '';
  }

  const negative = integerPart.startsWith('-');
  const digits = integerPart.replace(/-/g, '');
  if (!digits && !decimalPart) return null;

  const reais = digits ? Number.parseInt(digits, 10) : 0;
  const centavos = Number.parseInt(decimalPart.padEnd(2, '0').slice(0, 2) || '0', 10);
  if (Number.isNaN(reais) || Number.isNaN(centavos)) return null;

  const total = reais * 100 + centavos;
  return negative ? -total : total;
}

/**
 * Máscara de digitação: a pessoa digita só números e o valor cresce da direita
 * para a esquerda, como maquininha. '5' -> 'R$ 0,05', '512' -> 'R$ 5,12'.
 * É o único jeito de digitar dinheiro no celular sem brigar com o cursor.
 */
export function maskCurrencyTyping(raw: string): { masked: string; cents: Cents } {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  const cents = digits ? Number.parseInt(digits, 10) : 0;
  return { masked: formatCents(cents), cents };
}

/**
 * Divide uma compra em N parcelas SEM perder nem inventar centavo:
 * a soma do resultado é sempre exatamente `totalCents`.
 * O resto vai na PRIMEIRA parcela, como fazem as operadoras
 * (R$ 100 em 3x = 33,34 + 33,33 + 33,33).
 */
export function splitInstallments(totalCents: Cents, installments: number): Cents[] {
  const count = Math.max(1, Math.floor(installments));
  const base = Math.floor(totalCents / count);
  const remainder = totalCents - base * count;
  return Array.from({ length: count }, (_, index) => (index === 0 ? base + remainder : base));
}

/** Porcentagem segura: divisor zero vira 0, não NaN nem Infinity. */
export function ratio(part: number, whole: number): number {
  if (!whole) return 0;
  return part / whole;
}

/** '17%' */
export function formatPercent(value: number, decimals = 0): string {
  return `${(value * 100).toFixed(decimals).replace('.', ',')}%`;
}
