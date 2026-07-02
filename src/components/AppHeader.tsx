import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Text } from './Text';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  leftAction?: {
    icon: IoniconName;
    onPress: () => void;
    accessibilityLabel: string;
  };
  rightAction?: {
    icon: IoniconName;
    onPress: () => void;
    accessibilityLabel: string;
  };
  rightContent?: React.ReactNode;
}

export function AppHeader({
  title,
  subtitle,
  leftAction,
  rightAction,
  rightContent,
}: AppHeaderProps) {
  const { colors, spacing } = useTheme();

  return (
    <View
      style={[
        styles.row,
        {
          paddingHorizontal: spacing[5],
          paddingTop: spacing[4],
          paddingBottom: spacing[3],
        },
      ]}
    >
      {leftAction != null && (
        <TouchableOpacity
          onPress={leftAction.onPress}
          accessibilityLabel={leftAction.accessibilityLabel}
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={[styles.iconBtn, { backgroundColor: colors.backgroundSecondary }]}
        >
          <Ionicons name={leftAction.icon} size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      )}
      <View style={styles.textBlock}>
        <Text variant="headingLarge" color={colors.textPrimary} numberOfLines={1}>
          {title}
        </Text>
        {subtitle != null && (
          <Text
            variant="bodySmall"
            color={colors.textTertiary}
            style={{ marginTop: 2 }}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        )}
      </View>

      {(rightAction != null || rightContent != null) && (
        <View style={styles.right}>
          {rightContent != null
            ? rightContent
            : rightAction != null && (
                <TouchableOpacity
                  onPress={rightAction.onPress}
                  accessibilityLabel={rightAction.accessibilityLabel}
                  accessibilityRole="button"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={[styles.iconBtn, { backgroundColor: colors.brandPrimaryLight }]}
                >
                  <Ionicons name={rightAction.icon} size={20} color={colors.brandPrimary} />
                </TouchableOpacity>
              )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textBlock: { flex: 1 },
  right: { marginLeft: 12 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
