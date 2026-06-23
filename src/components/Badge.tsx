import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { Text } from './Text';

type Variant = 'success' | 'danger' | 'warning' | 'info' | 'neutral' | 'primary';
type Size = 'sm' | 'md';

interface BadgeProps {
  label: string;
  variant?: Variant;
  size?: Size;
}

export function Badge({ label, variant = 'neutral', size = 'md' }: BadgeProps) {
  const { colors, radii } = useTheme();

  const palette: Record<Variant, { bg: string; text: string }> = {
    success: { bg: colors.successLight, text: colors.successDark },
    danger: { bg: colors.dangerLight, text: colors.dangerDark },
    warning: { bg: colors.warningLight, text: colors.warningDark },
    info: { bg: colors.infoLight, text: colors.infoDark },
    neutral: { bg: colors.backgroundTertiary, text: colors.textSecondary },
    primary: { bg: colors.brandPrimaryLight, text: colors.brandPrimaryDark },
  };

  const { bg, text } = palette[variant];

  return (
    <View
      style={[
        styles.base,
        size === 'sm' ? styles.sm : styles.md,
        { backgroundColor: bg, borderRadius: radii.full },
      ]}
      accessibilityRole="text"
    >
      <Text
        variant={size === 'sm' ? 'labelSmall' : 'caption'}
        color={text}
        style={styles.label}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
  },
  sm: { paddingHorizontal: 6, paddingVertical: 2 },
  md: { paddingHorizontal: 10, paddingVertical: 4 },
  label: { fontWeight: '600' },
});
