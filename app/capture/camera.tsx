import { useRef, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, PermissionDenied } from '@/components';
import { useTheme } from '@/theme';
import { useCaptureStore } from '@/store/capture-store';
import { processAndStore } from '@/lib/image-pipeline';

export default function CaptureCamera() {
  const { colors, spacing, radii } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [capturing, setCapturing] = useState(false);
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const cameraRef = useRef<CameraView>(null);

  const pages = useCaptureStore((s) => s.pages);
  const addPage = useCaptureStore((s) => s.addPage);

  const flashCapture = () => {
    Animated.sequence([
      Animated.timing(flashOpacity, { toValue: 0.6, duration: 60, useNativeDriver: true }),
      Animated.timing(flashOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const takePicture = async () => {
    if (capturing || cameraRef.current == null) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9, exif: false });
      if (photo != null) {
        flashCapture();
        const stored = await processAndStore(photo.uri);
        addPage(stored);
      }
    } finally {
      setCapturing(false);
    }
  };

  const goToReview = () => {
    router.push('/capture/review');
  };

  const goBack = () => {
    if (pages.length > 0) {
      goToReview();
    } else {
      router.back();
    }
  };

  // Permission still loading — show spinner on black background instead of blank flash
  if (permission == null) {
    return (
      <View style={[styles.root, styles.loadingCenter]}>
        <ActivityIndicator
          color="#fff"
          size="large"
          accessibilityLabel={t('analyse.analysingA11y')}
        />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <PermissionDenied
        icon="camera-outline"
        title={t('capture.cameraPermissionTitle')}
        message={t('capture.cameraPermissionMessage')}
        canRequest={permission.canAskAgain}
        onRequest={requestPermission}
        onBack={() => router.back()}
      />
    );
  }

  const pageCount = pages.length;

  return (
    <View style={styles.root}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} />

      {/* White flash overlay */}
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.flash, { opacity: flashOpacity }]}
        pointerEvents="none"
      />

      {/* Top overlay */}
      <View
        style={[
          styles.topBar,
          { paddingTop: insets.top + spacing[2], paddingHorizontal: spacing[4] },
        ]}
      >
        <TouchableOpacity
          onPress={goBack}
          accessibilityLabel={
            pageCount > 0 ? t('capture.reviewCapturedA11y') : t('capture.goBackA11y')
          }
          accessibilityRole="button"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={[styles.overlayBtn, { borderRadius: radii.full }]}
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>

        {pageCount > 0 && (
          <View style={[styles.countPill, { borderRadius: radii.full }]}>
            <Text variant="labelSmall" color="#fff">
              {t('capture.pagesCapture', { count: pageCount })}
            </Text>
          </View>
        )}

        {pageCount > 0 ? (
          <TouchableOpacity
            onPress={goToReview}
            accessibilityLabel={t('capture.reviewPagesA11y', { count: pageCount })}
            accessibilityRole="button"
            style={[
              styles.doneBtn,
              { borderRadius: radii.full, backgroundColor: colors.brandPrimary },
            ]}
          >
            <Text variant="labelSmall" color="#fff">
              {t('capture.done')}
            </Text>
            <Ionicons name="arrow-forward" size={14} color="#fff" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 72 }} accessibilityElementsHidden />
        )}
      </View>

      {/* Bottom overlay */}
      <View
        style={[
          styles.bottomBar,
          { paddingBottom: insets.bottom + spacing[6], paddingHorizontal: spacing[8] },
        ]}
      >
        {/* Flip button */}
        <TouchableOpacity
          onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
          accessibilityLabel={t('capture.flipCamera')}
          accessibilityRole="button"
          style={[styles.overlayBtn, { borderRadius: radii.full }]}
        >
          <Ionicons name="camera-reverse-outline" size={26} color="#fff" />
        </TouchableOpacity>

        {/* Shutter */}
        <TouchableOpacity
          onPress={() => void takePicture()}
          disabled={capturing}
          accessibilityLabel={t('capture.takePhoto')}
          accessibilityRole="button"
          accessibilityState={{ busy: capturing }}
          activeOpacity={0.8}
          style={styles.shutter}
        >
          <View style={[styles.shutterInner, { opacity: capturing ? 0.5 : 1 }]} />
        </TouchableOpacity>

        <View style={{ width: 44 }} accessibilityElementsHidden />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  loadingCenter: { justifyContent: 'center', alignItems: 'center' },
  flash: { backgroundColor: '#fff' },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  overlayBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  countPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
  },
});
