import { useRef, useEffect } from 'react';
import { View, Animated, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useUIStore, type Toast, type ToastType } from '@/store/ui-store';
import { useTheme } from '@/theme';
import { Text } from './Text';

const ICON: Record<ToastType, React.ComponentProps<typeof Ionicons>['name']> = {
  success: 'checkmark-circle',
  error: 'alert-circle',
  warning: 'warning',
  info: 'information-circle',
};

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-16)).current;

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: -12, duration: 200, useNativeDriver: true }),
    ]).start(() => onDismiss(toast.id));
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, damping: 15, stiffness: 220, useNativeDriver: true }),
    ]).start();

    const t = setTimeout(dismiss, toast.duration);
    return () => clearTimeout(t);
  }, []);

  const palette: Record<ToastType, { bg: string; icon: string; text: string }> = {
    success: { bg: colors.successDark, icon: colors.textInverse, text: colors.textInverse },
    error:   { bg: colors.dangerDark,  icon: colors.textInverse, text: colors.textInverse },
    warning: { bg: colors.warningDark, icon: colors.textInverse, text: colors.textInverse },
    info:    { bg: colors.infoDark,    icon: colors.textInverse, text: colors.textInverse },
  };

  const { bg, icon: iconColor, text } = palette[toast.type];

  return (
    <Animated.View
      style={[styles.toast, { backgroundColor: bg, opacity, transform: [{ translateY }] }]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <Ionicons name={ICON[toast.type]} size={18} color={iconColor} style={styles.icon} />
      <Text variant="bodySmall" color={text} style={styles.message} numberOfLines={2}>
        {toast.message}
      </Text>
      <TouchableOpacity
        onPress={dismiss}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityLabel="Dismiss notification"
        accessibilityRole="button"
      >
        <Ionicons name="close" size={16} color={iconColor} />
      </TouchableOpacity>
    </Animated.View>
  );
}

export function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts);
  const removeToast = useUIStore((s) => s.removeToast);
  const insets = useSafeAreaInsets();

  if (toasts.length === 0) return null;

  return (
    <View
      style={[styles.container, { top: insets.top + 8 }]}
      pointerEvents="box-none"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={removeToast} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    gap: 8,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  icon: { marginRight: 10 },
  message: { flex: 1, fontWeight: '500', marginRight: 8 },
});
