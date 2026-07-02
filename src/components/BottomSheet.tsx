import { useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Animated,
  PanResponder,
  TouchableWithoutFeedback,
  StyleSheet,
  Dimensions,
  useAnimatedValue,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { Text } from './Text';

const { height: SCREEN_H } = Dimensions.get('window');

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  height?: number;
}

export function BottomSheet({
  visible,
  onClose,
  title,
  children,
  height = Math.round(SCREEN_H * 0.45),
}: BottomSheetProps) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  const translateY = useAnimatedValue(height);
  const backdropOpacity = useAnimatedValue(0);

  const close = () => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: height, duration: 280, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(onClose);
  };

  useEffect(() => {
    if (visible) {
      translateY.setValue(height);
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          damping: 20,
          stiffness: 200,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, [backdropOpacity, height, translateY, visible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, { dy }) => dy > 4,
      onPanResponderMove: (_, { dy }) => {
        if (dy > 0) translateY.setValue(dy);
      },
      onPanResponderRelease: (_, { dy, vy }) => {
        if (dy > height * 0.3 || vy > 0.6) {
          close();
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    }),
  ).current;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={close}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <TouchableWithoutFeedback
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel="Close sheet"
        >
          <Animated.View
            style={[styles.backdrop, { opacity: backdropOpacity, backgroundColor: colors.overlay }]}
          />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.sheet,
            {
              height,
              paddingBottom: insets.bottom + spacing[2],
              backgroundColor: colors.surface,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              transform: [{ translateY }],
            },
          ]}
        >
          <View {...panResponder.panHandlers} style={styles.handleArea}>
            <View style={[styles.handle, { backgroundColor: colors.borderStrong }]} />
          </View>

          {title != null && (
            <Text
              variant="headingSmall"
              style={{ paddingHorizontal: spacing[5], paddingBottom: spacing[3] }}
            >
              {title}
            </Text>
          )}

          <View style={[styles.content, { paddingHorizontal: spacing[5] }]}>{children}</View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill },
  sheet: { width: '100%' },
  handleArea: { alignItems: 'center', paddingVertical: 12 },
  handle: { width: 36, height: 4, borderRadius: 2 },
  content: { flex: 1 },
});
