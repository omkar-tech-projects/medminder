import { useCallback, useEffect } from 'react';
import { View, Animated, StyleSheet, ActivityIndicator, useAnimatedValue } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Button } from '@/components';
import { useTheme } from '@/theme';
import { useCaptureStore } from '@/store/capture-store';
import { useAnalysisStore } from '@/store/analysis-store';
import { analyseImages } from '@/services/analysis-service';

export default function AnalyseScreen() {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const pages = useCaptureStore((s) => s.pages);
  const { status, error, setLoading, setResult, setError } = useAnalysisStore();
  const scaleAnim = useAnimatedValue(1);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.2, duration: 900, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1.0, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [scaleAnim]);

  const runAnalysis = useCallback(() => {
    if (pages.length === 0) {
      setError('No images captured. Please go back and take a photo first.');
      return;
    }
    setLoading();
    analyseImages(pages.map((p) => p.uri))
      .then((result) => {
        setResult(result);
        router.replace('/review');
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Analysis failed. Please try again.');
      });
  }, [pages, setError, setLoading, setResult]);

  useEffect(() => {
    runAnalysis();
  }, [runAnalysis]);

  if (status === 'error') {
    return (
      <View
        style={[
          styles.root,
          styles.spaced,
          { backgroundColor: colors.background, paddingBottom: insets.bottom + spacing[6] },
        ]}
      >
        <View style={styles.center}>
          <View style={[styles.iconCircle, { backgroundColor: colors.warningLight }]}>
            <Ionicons name="warning-outline" size={48} color={colors.warning} />
          </View>

          <Text variant="headingMedium" align="center" style={{ marginTop: spacing[5] }}>
            Analysis failed
          </Text>
          <Text
            variant="bodyMedium"
            color={colors.textSecondary}
            align="center"
            style={{ marginTop: spacing[2], maxWidth: 300 }}
          >
            {error ?? 'Something went wrong. Check your connection and try again.'}
          </Text>
        </View>

        <View style={{ paddingHorizontal: spacing[5] }}>
          <Button
            label="Try again"
            onPress={runAnalysis}
            variant="primary"
            fullWidth
            size="lg"
            leftIcon="refresh-outline"
            accessibilityLabel="Retry prescription analysis"
          />
          <Button
            label="Go back"
            onPress={() => router.back()}
            variant="ghost"
            fullWidth
            style={{ marginTop: spacing[2] }}
            accessibilityLabel="Go back to prescription review"
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.center}>
        <Animated.View
          style={[
            styles.iconCircle,
            {
              backgroundColor: colors.brandPrimaryLight,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Ionicons name="sparkles" size={48} color={colors.brandPrimary} />
        </Animated.View>

        <Text variant="headingMedium" align="center" style={{ marginTop: spacing[5] }}>
          Analysing prescription...
        </Text>
        <Text
          variant="bodyMedium"
          color={colors.textSecondary}
          align="center"
          style={{ marginTop: spacing[2] }}
        >
          Reading {pages.length} page{pages.length !== 1 ? 's' : ''} with AI
        </Text>

        <ActivityIndicator
          size="small"
          color={colors.brandPrimary}
          style={{ marginTop: spacing[5] }}
          accessibilityLabel="Analysing prescription"
        />

        <Text
          variant="caption"
          color={colors.textTertiary}
          align="center"
          style={{ marginTop: spacing[3] }}
        >
          This may take up to 30 seconds
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  spaced: { justifyContent: 'space-between' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
