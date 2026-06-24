import { useColorScheme } from 'react-native';
import { lightColors, darkColors, type ColorScheme } from './colors';
import { spacing, type SpacingKey, type SpacingValue } from './spacing';
import { radii, type RadiusKey } from './radii';
import { typography, textPresets } from './typography';
import { useSettingsStore } from '@/store/settings-store';

export type Theme = {
  colors: ColorScheme;
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typography;
  textPresets: typeof textPresets;
  isDark: boolean;
};

const lightTheme: Theme = {
  colors: lightColors,
  spacing,
  radii,
  typography,
  textPresets,
  isDark: false,
};

const darkTheme: Theme = {
  colors: darkColors,
  spacing,
  radii,
  typography,
  textPresets,
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
