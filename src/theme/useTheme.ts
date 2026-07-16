import { useColorScheme } from 'react-native';
import { getColors, type Scheme, type ThemeColors } from './tokens';

export type Theme = {
  scheme: Scheme;
  colors: ThemeColors;
  isDark: boolean;
};

/**
 * Tema derivado do sistema operacional. O modo escuro tem passos PRÓPRIOS
 * (ver tokens.ts) — não é a inversão automática do claro.
 */
export function useTheme(): Theme {
  const system = useColorScheme();
  const scheme: Scheme = system === 'dark' ? 'dark' : 'light';
  return { scheme, colors: getColors(scheme), isDark: scheme === 'dark' };
}
