const palette = {
  // Brand
  indigo50: '#EEF2FF',
  indigo100: '#E0E7FF',
  indigo200: '#C7D2FE',
  indigo300: '#A5B4FC',
  indigo400: '#818CF8',
  indigo500: '#6366F1',
  indigo600: '#4F46E5',
  indigo700: '#4338CA',
  indigo800: '#3730A3',
  indigo900: '#312E81',

  // Success
  green50: '#F0FDF4',
  green100: '#DCFCE7',
  green400: '#4ADE80',
  green500: '#22C55E',
  green600: '#16A34A',
  green700: '#15803D',

  // Warning
  amber50: '#FFFBEB',
  amber100: '#FEF3C7',
  amber400: '#FBBF24',
  amber500: '#F59E0B',
  amber600: '#D97706',

  // Danger
  red50: '#FFF1F2',
  red100: '#FFE4E6',
  red400: '#F87171',
  red500: '#EF4444',
  red600: '#DC2626',

  // Neutral
  white: '#FFFFFF',
  black: '#000000',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
  gray950: '#030712',

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
} as const;

// Widen string literal types so darkColors can satisfy the same shape
type Widened<T> = { [K in keyof T]: T[K] extends string ? string : T[K] };
export type ColorScheme = Widened<typeof lightColors>;

export const lightColors = {
  // Backgrounds
  background: palette.white,
  backgroundSecondary: palette.gray50,
  backgroundTertiary: palette.gray100,
  backgroundInverse: palette.gray900,

  // Surfaces (cards, modals)
  surface: palette.white,
  surfaceSecondary: palette.gray50,
  surfaceRaised: palette.white,

  // Text
  textPrimary: palette.gray900,
  textSecondary: palette.gray600,
  textTertiary: palette.gray400,
  textInverse: palette.white,
  textPlaceholder: palette.gray400,

  // Brand
  brandPrimary: palette.indigo600,
  brandPrimaryLight: palette.indigo50,
  brandPrimaryDark: palette.indigo700,
  brandSecondary: palette.indigo500,

  // Borders
  border: palette.gray200,
  borderStrong: palette.gray300,
  borderFocus: palette.indigo500,

  // Semantic states
  success: palette.green500,
  successLight: palette.green50,
  successDark: palette.green700,

  warning: palette.amber500,
  warningLight: palette.amber50,
  warningDark: palette.amber600,

  danger: palette.red500,
  dangerLight: palette.red50,
  dangerDark: palette.red600,

  // Dose status
  doseTaken: palette.green500,
  doseTakenBg: palette.green50,
  doseMissed: palette.red500,
  doseMissedBg: palette.red50,
  dosePending: palette.gray400,
  dosePendingBg: palette.gray100,
  doseSnoozed: palette.amber500,
  doseSnoozedBg: palette.amber50,

  // Tab bar
  tabBarBackground: palette.white,
  tabBarActive: palette.indigo600,
  tabBarInactive: palette.gray400,
  tabBarBorder: palette.gray200,

  // Input
  inputBackground: palette.gray50,
  inputBorder: palette.gray300,
  inputBorderFocus: palette.indigo500,
  inputText: palette.gray900,

  // Misc
  shadow: palette.black,
  overlay: 'rgba(0,0,0,0.5)',
  skeleton: palette.gray200,
  chip: palette.chip,
} as const;

export const darkColors: ColorScheme = {
  // Backgrounds
  background: palette.gray950,
  backgroundSecondary: palette.gray900,
  backgroundTertiary: palette.gray800,
  backgroundInverse: palette.gray50,

  // Surfaces
  surface: palette.gray900,
  surfaceSecondary: palette.gray800,
  surfaceRaised: palette.gray800,

  // Text
  textPrimary: palette.gray50,
  textSecondary: palette.gray400,
  textTertiary: palette.gray600,
  textInverse: palette.gray900,
  textPlaceholder: palette.gray600,

  // Brand
  brandPrimary: palette.indigo400,
  brandPrimaryLight: palette.indigo900,
  brandPrimaryDark: palette.indigo300,
  brandSecondary: palette.indigo300,

  // Borders
  border: palette.gray800,
  borderStrong: palette.gray700,
  borderFocus: palette.indigo400,

  // Semantic states
  success: palette.green400,
  successLight: palette.green700,
  successDark: palette.green500,

  warning: palette.amber400,
  warningLight: palette.amber600,
  warningDark: palette.amber500,

  danger: palette.red400,
  dangerLight: palette.red600,
  dangerDark: palette.red500,

  // Dose status
  doseTaken: palette.green400,
  doseTakenBg: palette.green700,
  doseMissed: palette.red400,
  doseMissedBg: palette.red600,
  dosePending: palette.gray500,
  dosePendingBg: palette.gray800,
  doseSnoozed: palette.amber400,
  doseSnoozedBg: palette.amber600,

  // Tab bar
  tabBarBackground: palette.gray900,
  tabBarActive: palette.indigo400,
  tabBarInactive: palette.gray600,
  tabBarBorder: palette.gray800,

  // Input
  inputBackground: palette.gray800,
  inputBorder: palette.gray700,
  inputBorderFocus: palette.indigo400,
  inputText: palette.gray50,

  // Misc
  shadow: palette.black,
  overlay: 'rgba(0,0,0,0.7)',
  skeleton: palette.gray800,
  chip: palette.chip,
} as const;
