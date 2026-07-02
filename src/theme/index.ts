import { useColorScheme } from 'react-native';
import { lightColors, darkColors, type ColorScheme } from './colors';
import { spacing, type SpacingKey, type SpacingValue } from './spacing';
import { radii, type RadiusKey } from './radii';
import { typography, textPresets } from './typography';
import { useSettingsStore } from '@/store/settings-store';

export const shadows = {
  card: {
    shadowColor: 'rgba(15,27,45,1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  elevated: {
    shadowColor: 'rgba(15,27,45,1)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  button: {
    shadowColor: 'rgba(33,86,218,1)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  tabBar: {
    shadowColor: 'rgba(15,27,45,1)',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
} as const;

export type Theme = {
  colors: ColorScheme;
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typography;
  textPresets: typeof textPresets;
  shadows: typeof shadows;
  isDark: boolean;
};

const lightTheme: Theme = {
  colors: lightColors,
  spacing,
  radii,
  typography,
  textPresets,
  shadows,
  isDark: false,
};

const darkTheme: Theme = {
  colors: darkColors,
  spacing,
  radii,
  typography,
  textPresets,
  shadows,
  isDark: true,
};

export function useTheme(): Theme {
  const systemScheme = useColorScheme();
  const themePref = useSettingsStore((s) => s.theme);
  const effective = themePref === 'system' ? systemScheme : themePref;
  return effective === 'dark' ? darkTheme : lightTheme;
}

export { lightColors, darkColors, spacing, radii, typography, textPresets };
export type { ColorScheme, SpacingKey, SpacingValue, RadiusKey };
