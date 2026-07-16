import { StyleSheet, View } from 'react-native';
import { spacing } from '@/theme/tokens';
import type { Cents } from '@/types/models';
import { formatCents } from '@/utils/money';
import { AppText, useOnBrand } from './AppText';
import { Icon, ICONS, type IconName } from './Icon';
import { MoneyText, type MoneyTone } from './MoneyText';

export type StatTileProps = {
  label: string;
  cents: Cents;
  hint?: string;
  tone?: MoneyTone;
  /**
   * Nome do catálogo de ícones. Continua aceitando string solta porque as telas
   * antigas passam emoji — mas emoji aqui é enfeite de interface, e enfeite de
   * interface é o que fazia isto parecer adesivo de vitrine. Passe um `IconName`.
   */
  icon?: IconName | (string & {});
};

function isIconName(value: string): value is IconName {
  return Object.prototype.hasOwnProperty.call(ICONS, value);
}

/**
 * Um número e o que ele é. Nada mais.
 *
 * Sem fundo e sem borda: três destes numa `Row` viram a fila de KPI. A caixinha
 * em volta de cada um era o que transformava três números em três anúncios
 * disputando atenção — o alinhamento já diz que eles são irmãos.
 */
export function StatTile({ label, cents, hint, tone = 'auto', icon }: StatTileProps) {
  const onBrand = useOnBrand();

  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${formatCents(cents)}${hint ? `. ${hint}` : ''}`}
      style={styles.root}
    >
      <View style={styles.head}>
        {icon ? (
          isIconName(icon) ? (
            <Icon name={icon} size={14} tone={onBrand ? 'onBrand' : 'muted'} />
          ) : (
            <AppText variant="caption" tone="muted">
              {icon}
            </AppText>
          )
        ) : null}
        <AppText variant="caption" tone="muted" numberOfLines={1} style={styles.label}>
          {label}
        </AppText>
      </View>
      <MoneyText cents={cents} variant="title" tone={tone} />
      {hint ? (
        <AppText variant="caption" tone="muted" numberOfLines={2}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  /** Ocupa o vão: feito pra viver dentro de uma `Row`. */
  root: { flex: 1, gap: spacing.xs },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  label: { flexShrink: 1 },
});
