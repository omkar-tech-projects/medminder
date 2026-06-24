import { TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from './Text';
import { useTheme } from '@/theme';
import { useProfileStore } from '@/store/profile-store';

export function ViewingAsBanner() {
  const { colors, spacing } = useTheme();
  const { t } = useTranslation();
  const activeProfileId = useProfileStore((s) => s.activeProfileId);
  const primaryProfileId = useProfileStore((s) => s.primaryProfileId);
  const profiles = useProfileStore((s) => s.profiles);
  const setActiveProfile = useProfileStore((s) => s.setActiveProfile);

  if (activeProfileId === primaryProfileId) return null;

  const activeName = profiles.find((p) => p.id === activeProfileId)?.name ?? '';

  return (
    <TouchableOpacity
      onPress={() => void setActiveProfile(primaryProfileId)}
      accessibilityRole="button"
      accessibilityLabel={t('viewingAs.bannerA11y', { name: activeName })}
      style={[
        styles.banner,
        {
          backgroundColor: colors.brandPrimary,
          paddingHorizontal: spacing[5],
          paddingVertical: spacing[2],
        },
      ]}
    >
      <Text variant="labelSmall" color="#fff" numberOfLines={1} style={styles.bannerText}>
        {t('viewingAs.banner', { name: activeName })}
        {'  ·  '}
        <Text variant="labelSmall" color="#fff" style={styles.back}>
          {t('viewingAs.backButton')}
        </Text>
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center' },
  bannerText: { flex: 1 },
  back: { textDecorationLine: 'underline' },
});
