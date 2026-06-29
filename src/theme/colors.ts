// MedMinder brand palette
const palette = {
  // Brand blues
  brand50: '#EAF0FD',
  brand100: '#D5E1FB',
  brand200: '#AABBF7',
  brand500: '#2156DA',
  brand600: '#1A45B5',
  brand700: '#133290',

  // Neutrals
  navy900: '#14223A',
  navy800: '#1E2F47',
  navy700: '#2A3F5C',
  navy600: '#364F73',
  navy400: '#4E617A',
  navy300: '#7B8FA8',
  navy200: '#98A6BC',
  navy100: '#B0BDCB',
  navy50: '#D9E1EB',
  cool50: '#EEF2F7',
  cool25: '#F4F7FB',

  // Success
  green900: '#0D6648',
  green700: '#138A5E',
  green400: '#2DC87A',
  green50: '#E4F4EC',

  // Warning
  amber900: '#A56000',
  amber700: '#C77700',
  amber400: '#E49C30',
  amber100: '#FBEFD9',
  amberBorder: '#F2DDB0',

  // Danger
  red900: '#B03030',
  red700: '#D64545',
  red400: '#F06060',
  red50: '#FBE9E9',

  // Info (same as brand)
  info700: '#1640B0',

  // Medication colour chips
  chip: {
    blue: '#3B82F6',
    teal: '#14B8A6',
    purple: '#A855F7',
    pink: '#EC4899',
    orange: '#F97316',
    yellow: '#EAB308',
    lime: '#84CC16',
    cyan: '#06B6D4',
  },

  white: '#FFFFFF',
  black: '#000000',
} as const;

type Widened<T> = { [K in keyof T]: T[K] extends string ? string : T[K] };
export type ColorScheme = Widened<typeof lightColors>;

export const lightColors = {
  // App backgrounds
  background: palette.cool25,
  backgroundScreen: palette.white,
  backgroundSecondary: palette.cool50,
  backgroundTertiary: '#E8EDF3',
  backgroundInverse: palette.navy900,

  // Surfaces
  surface: palette.white,
  surfaceSecondary: palette.cool25,
  surfaceRaised: palette.white,
  surfaceElevated: palette.white,

  // Text
  textPrimary: palette.navy900,
  textSecondary: palette.navy400,
  textTertiary: palette.navy300,
  textDisabled: palette.navy100,
  textInverse: palette.white,
  textOnBrand: palette.white,
  textPlaceholder: palette.navy200,

  // Brand
  brandPrimary: palette.brand500,
  brandPrimaryLight: palette.brand50,
  brandPrimarySubtle: '#E5EDFC',
  brandPrimaryDark: palette.brand600,
  brandSecondary: palette.brand600,

  // Borders
  border: palette.cool50,
  borderStrong: palette.navy50,
  borderFocus: palette.brand500,

  // Input
  inputBackground: palette.white,
  inputBorder: '#E7ECF3',
  inputBorderFocus: palette.brand500,
  inputFocusRing: 'rgba(33,86,218,0.12)',
  inputText: palette.navy900,

  // Semantic states
  success: palette.green700,
  successLight: palette.green50,
  successDark: palette.green900,

  warning: palette.amber700,
  warningLight: palette.amber100,
  warningBorder: palette.amberBorder,
  warningDark: palette.amber900,

  danger: palette.red700,
  dangerLight: palette.red50,
  dangerDark: palette.red900,

  info: palette.brand500,
  infoLight: palette.brand50,
  infoDark: palette.info700,

  // Dose status
  doseTaken: palette.green700,
  doseTakenBg: palette.green50,
  doseMissed: palette.red700,
  doseMissedBg: palette.red50,
  dosePending: palette.brand500,
  dosePendingBg: palette.brand50,
  doseSnoozed: palette.amber700,
  doseSnoozedBg: palette.amber100,

  // Tab bar
  tabBarBackground: palette.white,
  tabBarActive: palette.brand500,
  tabBarInactive: palette.navy200,
  tabBarBorder: palette.cool50,
  tabBarPill: palette.brand50,

  // Misc
  shadow: 'rgba(15,27,45,0.10)',
  overlay: 'rgba(14,22,38,0.52)',
  skeleton: palette.cool50,
  chip: palette.chip,
} as const;

export const darkColors: ColorScheme = {
  // App backgrounds
  background: '#0C1525',
  backgroundScreen: '#131F35',
  backgroundSecondary: '#0F1A2E',
  backgroundTertiary: '#182337',
  backgroundInverse: '#E2ECF9',

  // Surfaces
  surface: '#1A2840',
  surfaceSecondary: '#142034',
  surfaceRaised: '#1F3050',
  surfaceElevated: '#213458',

  // Text
  textPrimary: '#E2ECF9',
  textSecondary: '#8CA0BA',
  textTertiary: '#5A7290',
  textDisabled: '#3D5270',
  textInverse: palette.navy900,
  textOnBrand: palette.white,
  textPlaceholder: '#7A90AB',

  // Brand
  brandPrimary: '#4A7EFF',
  brandPrimaryLight: 'rgba(74,126,255,0.15)',
  brandPrimarySubtle: 'rgba(74,126,255,0.10)',
  brandPrimaryDark: '#3366DD',
  brandSecondary: '#6699FF',

  // Borders
  border: '#1E2F47',
  borderStrong: '#2A3F5C',
  borderFocus: '#4A7EFF',

  // Input
  inputBackground: '#1A2840',
  inputBorder: '#2A3F5C',
  inputBorderFocus: '#4A7EFF',
  inputFocusRing: 'rgba(74,126,255,0.15)',
  inputText: '#E2ECF9',

  // Semantic states
  success: '#2DC87A',
  successLight: 'rgba(45,200,122,0.15)',
  successDark: '#1EA05E',

  warning: '#E49C30',
  warningLight: 'rgba(228,156,48,0.15)',
  warningBorder: 'rgba(228,156,48,0.30)',
  warningDark: '#C07B10',

  danger: '#F06060',
  dangerLight: 'rgba(240,96,96,0.15)',
  dangerDark: '#D04040',

  info: '#4A7EFF',
  infoLight: 'rgba(74,126,255,0.15)',
  infoDark: '#3366DD',

  // Dose status
  doseTaken: '#2DC87A',
  doseTakenBg: 'rgba(45,200,122,0.15)',
  doseMissed: '#F06060',
  doseMissedBg: 'rgba(240,96,96,0.15)',
  dosePending: '#4A7EFF',
  dosePendingBg: 'rgba(74,126,255,0.15)',
  doseSnoozed: '#E49C30',
  doseSnoozedBg: 'rgba(228,156,48,0.15)',

  // Tab bar
  tabBarBackground: '#131F35',
  tabBarActive: '#4A7EFF',
  tabBarInactive: '#5A7290',
  tabBarBorder: '#1E2F47',
  tabBarPill: 'rgba(74,126,255,0.15)',

  // Misc
  shadow: 'rgba(0,0,0,0.45)',
  overlay: 'rgba(0,0,0,0.65)',
  skeleton: '#1E2F47',
  chip: palette.chip,
} as const;
