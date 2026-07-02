import { View, FlatList, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Button, Badge } from '@/components';
import { useTheme } from '@/theme';
import { useCaptureStore, type CapturedPage } from '@/store/capture-store';
import { deletePage, clearAllPages } from '@/lib/image-pipeline';

const { width: SCREEN_W } = Dimensions.get('window');
const GRID_GAP = 12;
const GRID_PADDING = 20;
const THUMB_SIZE = (SCREEN_W - GRID_PADDING * 2 - GRID_GAP) / 2;

export default function CaptureReviewScreen() {
  const { colors, spacing, radii } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const pages = useCaptureStore((s) => s.pages);
  const removePage = useCaptureStore((s) => s.removePage);
  const clear = useCaptureStore((s) => s.clear);

  const handleRemove = (page: CapturedPage) => {
    deletePage(page.uri);
    removePage(page.id);
    if (pages.length === 1) {
      router.back();
    }
  };

  const handleCancel = () => {
    clearAllPages(pages.map((p) => p.uri));
    clear();
    router.navigate('/');
  };

  const handleAddMore = () => {
    router.push('/capture');
  };

  const handleAnalyse = () => {
    if (pages.length === 0) return;
    router.push('/analyse');
  };

  const renderItem = ({ item, index }: { item: CapturedPage; index: number }) => (
    <View style={[styles.thumbWrapper, { borderRadius: radii.lg }]}>
      <Image
        source={{ uri: item.uri }}
        style={[styles.thumb, { borderRadius: radii.lg }]}
        resizeMode="cover"
        accessibilityLabel={t('capture.pageImageA11y', { n: index + 1 })}
      />

      {/* Page number badge */}
      <View
        style={[styles.pageNum, { backgroundColor: colors.brandPrimary, borderRadius: radii.full }]}
      >
        <Text variant="labelSmall" color="#fff">
          {index + 1}
        </Text>
      </View>

      {/* Remove button */}
      <TouchableOpacity
        onPress={() => handleRemove(item)}
        accessibilityLabel={t('capture.removePage', { n: index + 1 })}
        accessibilityRole="button"
        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        style={[styles.removeBtn, { backgroundColor: colors.danger, borderRadius: radii.full }]}
      >
        <Ionicons name="close" size={14} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + spacing[2],
        },
      ]}
    >
      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: spacing[5] }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityLabel={t('capture.goBackToCameraA11y')}
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text variant="headingSmall">{t('capture.reviewTitle')}</Text>
          <Badge
            label={t('capture.pageCount', { count: pages.length })}
            variant="primary"
            size="sm"
          />
        </View>

        <TouchableOpacity
          onPress={() => handleCancel()}
          accessibilityLabel={t('capture.discardA11y')}
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text variant="labelSmall" color={colors.danger}>
            {t('capture.discard')}
          </Text>
        </TouchableOpacity>
      </View>

      <Text
        variant="caption"
        color={colors.textTertiary}
        style={[styles.hint, { paddingHorizontal: spacing[5] }]}
      >
        {t('capture.reviewHint')}
      </Text>

      {/* Thumbnail grid */}
      <FlatList
        data={pages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ gap: GRID_GAP }}
        contentContainerStyle={[
          styles.grid,
          { padding: GRID_PADDING, gap: GRID_GAP, paddingBottom: spacing[6] },
        ]}
        showsVerticalScrollIndicator={false}
      />

      {/* Bottom action bar */}
      <View
        style={[
          styles.actions,
          {
            paddingHorizontal: spacing[5],
            paddingBottom: insets.bottom + spacing[4],
            paddingTop: spacing[4],
            borderTopColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <Button
          label={t('capture.addMorePages')}
          onPress={handleAddMore}
          variant="secondary"
          fullWidth
          leftIcon="add"
          style={{ marginBottom: spacing[3] }}
        />
        <Button
          label={t('capture.analysePrescription')}
          onPress={handleAnalyse}
          variant="primary"
          fullWidth
          size="lg"
          leftIcon="sparkles-outline"
          disabled={pages.length === 0}
          accessibilityLabel={t('capture.analyseA11y', { count: pages.length })}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hint: { marginBottom: 4 },
  grid: {},
  thumbWrapper: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    overflow: 'hidden',
  },
  thumb: { width: '100%', height: '100%' },
  pageNum: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  removeBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
