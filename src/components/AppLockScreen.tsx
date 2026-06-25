import { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { useTranslation } from 'react-i18next';
import { Text } from './Text';
import { Button } from './Button';
import { useTheme } from '@/theme';
import { useAppLockStore } from '@/store/app-lock-store';

interface AppLockScreenProps {
  visible: boolean;
}

export function AppLockScreen({ visible }: AppLockScreenProps) {
  const { colors, spacing, radii } = useTheme();
  const { t } = useTranslation();
  const unlock = useAppLockStore((s) => s.unlock);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function authenticate(): Promise<void> {
    if (loading) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t('appLock.promptMessage'),
        fallbackLabel: t('appLock.fallbackLabel'),
        cancelLabel: t('appLock.cancelLabel'),
        disableDeviceFallback: false,
      });
      if (result.success) {
        unlock();
      } else if (result.error !== 'user_cancel' && result.error !== 'system_cancel') {
        setErrorMessage(t('appLock.failedMessage'));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (visible) {
      void authenticate();
    }
    // Intentionally omit authenticate from deps — runs only when visible flips to true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!visible) return null;

  return (
    <View
      style={[styles.overlay, { backgroundColor: colors.background }]}
      accessible
      accessibilityViewIsModal
      accessibilityLabel={t('appLock.screenA11y')}
    >
      <View style={[styles.content, { paddingHorizontal: spacing[6] }]}>
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: colors.brandPrimaryLight, borderRadius: radii.full },
          ]}
          accessibilityElementsHidden
        >
          <Ionicons name="lock-closed-outline" size={52} color={colors.brandPrimary} />
        </View>

        <Text variant="headingLarge" align="center" style={{ marginBottom: spacing[2] }}>
          {t('appLock.screenTitle')}
        </Text>
        <Text
          variant="bodyMedium"
          color={colors.textSecondary}
          align="center"
          style={{ marginBottom: spacing[6] }}
        >
          {t('appLock.screenSubtitle')}
        </Text>

        {errorMessage != null && (
          <Text
            variant="bodySmall"
            color={colors.danger}
            align="center"
            style={{ marginBottom: spacing[4] }}
          >
            {errorMessage}
          </Text>
        )}

        <Button
          label={errorMessage != null ? t('appLock.retryButton') : t('appLock.unlockButton')}
          variant="primary"
          fullWidth
          size="lg"
          loading={loading}
          onPress={() => void authenticate()}
          accessibilityLabel={t('appLock.unlockButton')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { width: '100%', alignItems: 'center' },
  iconCircle: {
    width: 112,
    height: 112,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
});
