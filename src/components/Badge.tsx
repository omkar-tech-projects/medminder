import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { Text } from './Text';

export type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'neutral' | 'primary';
type Size = 'sm' | 'md';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: Size;
}

export function Badge({ label, variant = 'neutral', size = 'md' }: BadgeProps) {
  const { colors } = useTheme();

  const palette: Record<BadgeVariant, { bg: string; text: string; border?: string }> = {
    success: { bg: colors.successLight, text: colors.success },
    danger: { bg: colors.dangerLight, text: colors.danger },
    warning: { bg: colors.warningLight, text: colors.warning, border: colors.warningBorder },
    info: { bg: colors.infoLight, text: colors.info },
    neutral: { bg: colors.backgroundSecondary, text: colors.textSecondary },
    primary: { bg: colors.brandPrimaryLight, text: colors.brandPrimary },
  };

  const { bg, text, border } = palette[variant];

  return (
    <View
      style={[
        styles.base,
        size === 'sm' ? styles.sm : styles.md,
        {
          backgroundColor: bg,
          borderRadius: 6,
          borderWidth: border != null ? 1 : 0,
          borderColor: border ?? 'transparent',
        },
      ]}
      accessibilityRole="text"
    >
      <Text variant={size === 'sm' ? 'labelSmall' : 'caption'} color={text} style={styles.label}>
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
  sm: { paddingHorizontal: 7, paddingVertical: 3 },
  md: { paddingHorizontal: 10, paddingVertical: 5 },
  label: { fontWeight: '800' },
});
