import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Text } from './Text';
import { Button } from './Button';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface EmptyStateProps {
  icon: IoniconName;
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
}

export function EmptyState({ icon, title, subtitle, action }: EmptyStateProps) {
  const { colors, spacing } = useTheme();

  return (
    <View style={styles.container} accessibilityRole="text">
      <View style={[styles.iconWrapper, { backgroundColor: colors.brandPrimaryLight }]}>
        <Ionicons name={icon} size={32} color={colors.brandPrimary} />
      </View>

      <Text
        variant="headingSmall"
        align="center"
        style={{ marginTop: spacing[4], color: colors.textPrimary }}
      >
        {title}
      </Text>

      {subtitle != null && (
        <Text
          variant="bodyMedium"
          align="center"
          color={colors.textSecondary}
          style={{ marginTop: spacing[2], maxWidth: 280 }}
        >
          {subtitle}
        </Text>
      )}

      {action != null && (
        <Button
          label={action.label}
          onPress={action.onPress}
          variant="primary"
          size="md"
          style={{ marginTop: spacing[6] }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  iconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
