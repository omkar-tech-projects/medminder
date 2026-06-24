import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Text } from './Text';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface ListItemProps {
  title: string;
  subtitle?: string;
  leftIcon?: IoniconName;
  leftContent?: React.ReactNode;
  right?: React.ReactNode;
  showChevron?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  destructive?: boolean;
  accessibilityLabel?: string;
}

export function ListItem({
  title,
  subtitle,
  leftIcon,
  leftContent,
  right,
  showChevron = false,
  onPress,
  disabled = false,
  destructive = false,
  accessibilityLabel,
}: ListItemProps) {
  const { colors, spacing, radii } = useTheme();

  const titleColor = destructive
    ? colors.danger
    : disabled
      ? colors.textDisabled
      : colors.textPrimary;

  const content = (
    <View
      style={[
        styles.row,
        {
          minHeight: 52,
          paddingHorizontal: spacing[4],
          paddingVertical: spacing[3],
          backgroundColor: colors.surface,
          borderRadius: radii.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
        },
      ]}
    >
      {(leftIcon != null || leftContent != null) && (
        <View style={[styles.leftSlot, { marginRight: spacing[3] }]}>
          {leftContent != null
            ? leftContent
            : leftIcon != null && (
                <View style={[styles.iconCircle, { backgroundColor: colors.brandPrimaryLight }]}>
                  <Ionicons name={leftIcon} size={18} color={colors.brandPrimary} />
                </View>
              )}
        </View>
      )}

      <View style={styles.textBlock}>
        <Text variant="bodyMedium" color={titleColor} numberOfLines={1}>
          {title}
        </Text>
        {subtitle != null && (
          <Text
            variant="bodySmall"
            color={disabled ? colors.textDisabled : colors.textSecondary}
            numberOfLines={2}
            style={styles.subtitle}
          >
            {subtitle}
          </Text>
        )}
      </View>

      {right != null && <View style={styles.rightSlot}>{right}</View>}

      {showChevron && (
        <Ionicons
          name="chevron-forward"
          size={16}
          color={colors.textTertiary}
          style={{ marginLeft: spacing[2] }}
        />
      )}
    </View>
  );

  if (onPress != null) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
        accessibilityLabel={accessibilityLabel ?? title}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  leftSlot: { alignItems: 'center', justifyContent: 'center' },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: { flex: 1 },
  subtitle: { marginTop: 2 },
  rightSlot: { marginLeft: 8, alignItems: 'flex-end' },
});
