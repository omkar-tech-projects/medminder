import {
  TouchableOpacity,
  ActivityIndicator,
  View,
  StyleSheet,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type Size = 'sm' | 'md' | 'lg';
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: IoniconName;
  rightIcon?: IoniconName;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

const HEIGHT: Record<Size, number> = { sm: 44, md: 48, lg: 56 };
const ICON_SIZE: Record<Size, number> = { sm: 16, md: 18, lg: 20 };
const H_PAD: Record<Size, number> = { sm: 16, md: 20, lg: 24 };

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  style,
  accessibilityLabel,
}: ButtonProps) {
  const { colors, radii } = useTheme();
  const isDisabled = disabled || loading;

  const variantStyles: Record<Variant, { bg: string; border: string; text: string }> = {
    primary: {
      bg: isDisabled ? colors.brandPrimaryLight : colors.brandPrimary,
      border: 'transparent',
      text: isDisabled ? colors.brandPrimary : colors.textInverse,
    },
    secondary: {
      bg: 'transparent',
      border: colors.brandPrimary,
      text: isDisabled ? colors.textTertiary : colors.brandPrimary,
    },
    ghost: {
      bg: 'transparent',
      border: 'transparent',
      text: isDisabled ? colors.textTertiary : colors.brandPrimary,
    },
    destructive: {
      bg: isDisabled ? colors.dangerLight : colors.danger,
      border: 'transparent',
      text: isDisabled ? colors.danger : colors.textInverse,
    },
  };

  const vs = variantStyles[variant];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      activeOpacity={0.75}
      style={[
        styles.base,
        {
          height: HEIGHT[size],
          paddingHorizontal: H_PAD[size],
          backgroundColor: vs.bg,
          borderColor: vs.border,
          borderRadius: radii.lg,
          borderWidth: variant === 'secondary' ? 1.5 : 0,
          opacity: isDisabled && !loading ? 0.5 : 1,
        },
        fullWidth && styles.full,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={vs.text} />
      ) : (
        <View style={styles.row}>
          {leftIcon != null && (
            <Ionicons
              name={leftIcon}
              size={ICON_SIZE[size]}
              color={vs.text}
              style={styles.leftIcon}
            />
          )}
          <Text
            variant={size === 'sm' ? 'labelSmall' : 'labelLarge'}
            color={vs.text}
            style={styles.label}
          >
            {label}
          </Text>
          {rightIcon != null && (
            <Ionicons
              name={rightIcon}
              size={ICON_SIZE[size]}
              color={vs.text}
              style={styles.rightIcon}
            />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  full: { width: '100%' },
  row: { flexDirection: 'row', alignItems: 'center' },
  label: { flexShrink: 1 },
  leftIcon: { marginRight: 6 },
  rightIcon: { marginLeft: 6 },
});
