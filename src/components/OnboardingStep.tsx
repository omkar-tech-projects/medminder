import { View, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Text } from './Text';
import { Button } from './Button';
import { useTheme } from '@/theme';

const TOTAL_STEPS = 6;

interface OnboardingStepProps {
  step: number;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor?: string;
  title: string;
  body: string;
  primaryLabel: string;
  onPrimary: () => void | Promise<void>;
  primaryLoading?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
  skipToEnd?: () => void;
  keyboardAware?: boolean;
  children?: React.ReactNode;
}

export function OnboardingStep({
  step,
  icon,
  iconColor,
  title,
  body,
  primaryLabel,
  onPrimary,
  primaryLoading = false,
  secondaryLabel,
  onSecondary,
  skipToEnd,
  keyboardAware = false,
  children,
}: OnboardingStepProps) {
  const { colors, spacing } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const accent = iconColor ?? colors.brandPrimary;

  const inner = (
    <View style={[styles.root, { backgroundColor: colors.backgroundScreen }]}>
      {/* Progress + skip row */}
      <View
        style={[
          styles.progressRow,
          { paddingHorizontal: spacing[5], paddingTop: insets.top + spacing[4] },
        ]}
      >
        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${(step / TOTAL_STEPS) * 100}%`,
                backgroundColor: colors.brandPrimary,
              },
            ]}
          />
        </View>
        {skipToEnd != null && (
          <Button
            label={t('onboarding.skipIntro')}
            variant="ghost"
            size="sm"
            onPress={skipToEnd}
            accessibilityLabel={t('onboarding.skipIntroA11y')}
          />
        )}
      </View>

      {/* Scrollable content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing[6] }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Icon */}
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: colors.brandPrimaryLight, borderRadius: 9999 },
          ]}
          accessibilityElementsHidden
        >
          <Ionicons name={icon} size={52} color={accent} />
        </View>

        {/* Title + body */}
        <Text variant="displaySmall" align="center" style={{ marginBottom: spacing[3] }}>
          {title}
        </Text>
        <Text variant="bodyLarge" color={colors.textSecondary} align="center">
          {body}
        </Text>

        {/* Optional children (e.g. input, disclaimer box) */}
        {children != null && (
          <View style={{ marginTop: spacing[6], alignSelf: 'stretch' }}>{children}</View>
        )}
      </ScrollView>

      {/* Fixed bottom actions */}
      <View
        style={[
          styles.actions,
          { paddingHorizontal: spacing[5], paddingBottom: insets.bottom + spacing[4] },
        ]}
      >
        <Button
          label={primaryLabel}
          onPress={onPrimary}
          variant="primary"
          fullWidth
          size="lg"
          loading={primaryLoading}
          accessibilityLabel={primaryLabel}
        />
        {secondaryLabel != null && onSecondary != null && (
          <Button
            label={secondaryLabel}
            onPress={onSecondary}
            variant="ghost"
            fullWidth
            style={{ marginTop: spacing[2] }}
            accessibilityLabel={secondaryLabel}
          />
        )}
      </View>
    </View>
  );

  if (keyboardAware) {
    return (
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {inner}
      </KeyboardAvoidingView>
    );
  }

  return inner;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  kav: { flex: 1 },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
  },
  progressBarTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E8EDF3',
    overflow: 'hidden',
  },
  progressBarFill: { height: 4, borderRadius: 2 },
  scroll: { flex: 1 },
  scrollContent: { alignItems: 'center', paddingTop: 32, paddingBottom: 24 },
  iconCircle: {
    width: 112,
    height: 112,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  actions: { paddingTop: 16, gap: 0 },
});
