import { ScrollView, View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen, AppHeader, Text } from '@/components';
import { useTheme } from '@/theme';

function Section({ title, body }: { title: string; body: string }) {
  const { colors, spacing } = useTheme();
  return (
    <View style={{ marginBottom: spacing[5] }}>
      <Text
        variant="headingSmall"
        color={colors.textPrimary}
        style={{ marginBottom: spacing[2] }}
        accessibilityRole="header"
      >
        {title}
      </Text>
      <Text variant="bodyMedium" color={colors.textSecondary} style={styles.body}>
        {body}
      </Text>
    </View>
  );
}

export default function PrivacyScreen() {
  const { t } = useTranslation();
  const { colors, spacing, radii } = useTheme();

  return (
    <Screen edges={['top']}>
      <AppHeader
        title={t('privacy.title')}
        leftAction={{
          icon: 'arrow-back-outline',
          onPress: () => router.back(),
          accessibilityLabel: t('privacy.closeA11y'),
        }}
      />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingHorizontal: spacing[5], paddingBottom: spacing[10] },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text variant="caption" color={colors.textTertiary} style={{ marginBottom: spacing[5] }}>
          {t('privacy.lastUpdated')}
        </Text>

        {/* Summary callout */}
        <View
          style={[
            styles.callout,
            {
              backgroundColor: colors.brandPrimaryLight,
              borderRadius: radii.lg,
              padding: spacing[4],
              marginBottom: spacing[6],
            },
          ]}
          accessibilityRole="text"
        >
          <Text
            variant="labelLarge"
            color={colors.brandPrimary}
            style={{ marginBottom: spacing[2] }}
          >
            {t('privacy.summaryTitle')}
          </Text>
          <Text variant="bodyMedium" color={colors.textPrimary} style={styles.body}>
            {t('privacy.summaryBody')}
          </Text>
        </View>

        <Section title={t('privacy.section1Title')} body={t('privacy.section1Body')} />
        <Section title={t('privacy.section2Title')} body={t('privacy.section2Body')} />
        <Section title={t('privacy.section3Title')} body={t('privacy.section3Body')} />
        <Section title={t('privacy.section4Title')} body={t('privacy.section4Body')} />
        <Section title={t('privacy.section5Title')} body={t('privacy.section5Body')} />
        <Section title={t('privacy.section6Title')} body={t('privacy.section6Body')} />
        <Section title={t('privacy.section7Title')} body={t('privacy.section7Body')} />
        <Section title={t('privacy.section8Title')} body={t('privacy.section8Body')} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 8 },
  callout: {},
  body: { lineHeight: 22 },
});
