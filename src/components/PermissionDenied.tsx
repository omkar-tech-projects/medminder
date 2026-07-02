import { View, Linking, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './Text';
import { Button } from './Button';
import { useTheme } from '@/theme';

interface PermissionDeniedProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  message: string;
  onBack: () => void;
  canRequest?: boolean;
  onRequest?: () => void;
}

export function PermissionDenied({
  icon,
  title,
  message,
  onBack,
  canRequest = false,
  onRequest,
}: PermissionDeniedProps) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  const openSettings = () => {
    void Linking.openSettings();
  };

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.backgroundScreen,
          paddingTop: insets.top + spacing[4],
          paddingBottom: insets.bottom + spacing[5],
          paddingHorizontal: spacing[6],
        },
      ]}
    >
      <View
        style={[styles.iconCircle, { backgroundColor: colors.warningLight, borderRadius: 9999 }]}
        accessibilityElementsHidden
      >
        <Ionicons name={icon} size={40} color={colors.warning} />
      </View>

      <Text variant="headingMedium" align="center" style={{ marginBottom: spacing[3] }}>
        {title}
      </Text>

      <Text
        variant="bodyMedium"
        color={colors.textSecondary}
        align="center"
        style={{ marginBottom: spacing[8] }}
      >
        {message}
      </Text>

      {canRequest && onRequest != null ? (
        <Button
          label="Allow access"
          onPress={onRequest}
          variant="primary"
          fullWidth
          size="lg"
          style={{ marginBottom: spacing[3] }}
        />
      ) : (
        <Button
          label="Open Settings"
          onPress={openSettings}
          variant="primary"
          fullWidth
          size="lg"
          leftIcon="settings-outline"
          style={{ marginBottom: spacing[3] }}
          accessibilityLabel="Open device settings to grant permission"
        />
      )}

      <Button
        label="Go back"
        onPress={onBack}
        variant="ghost"
        fullWidth
        accessibilityLabel="Go back without granting permission"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconCircle: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
});
