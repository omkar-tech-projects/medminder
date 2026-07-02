import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { useTheme } from '@/theme';
import { textPresets } from '@/theme/typography';

type Variant = keyof typeof textPresets;

interface TextProps extends RNTextProps {
  variant?: Variant;
  color?: string;
  align?: 'left' | 'center' | 'right';
}

const MAX_SCALE: Record<Variant, number> = {
  displayLarge: 1.2,
  displaySmall: 1.2,
  headingLarge: 1.3,
  headingMedium: 1.3,
  headingSmall: 1.4,
  bodyLarge: 2.0,
  bodyMedium: 2.0,
  bodySmall: 2.0,
  labelLarge: 1.5,
  labelMedium: 1.5,
  labelSmall: 1.3,
  caption: 1.5,
  overline: 1.2,
};

export function Text({ variant = 'bodyMedium', color, align, style, ...rest }: TextProps) {
  const { colors } = useTheme();
  const preset = textPresets[variant];

  return (
    <RNText
      maxFontSizeMultiplier={MAX_SCALE[variant]}
      style={[
        preset,
        { color: color ?? colors.textPrimary },
        align != null && { textAlign: align },
        style,
      ]}
      {...rest}
    />
  );
}
