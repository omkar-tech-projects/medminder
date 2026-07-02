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

const HEIGHT: Record<Size, number> = { sm: 40, md: 46, lg: 54 };
const ICON_SIZE: Record<Size, number> = { sm: 15, md: 17, lg: 19 };
const H_PAD: Record<Size, number> = { sm: 14, md: 18, lg: 22 };
const RADIUS: Record<Size, number> = { sm: 10, md: 13, lg: 16 };

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
  const { colors } = useTheme();
  const isDisabled = disabled || loading;

  const variantStyles: Record<
    Variant,
    { bg: string; border: string; text: string; shadow?: object }
  > = {
    primary: {
      bg: isDisabled ? colors.brandPrimaryLight : colors.brandPrimary,
      border: 'transparent',
      text: isDisabled ? colors.brandPrimary : colors.textInverse,
      shadow: isDisabled
        ? {}
        : {
            shadowColor: 'rgba(33,86,218,1)',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.32,
            shadowRadius: 20,
            elevation: 8,
          },
    },
    secondary: {
      bg: colors.surface,
      border: colors.border,
      text: isDisabled ? colors.textTertiary : colors.textPrimary,
    },
    ghost: {
      bg: 'transparent',
      border: 'transparent',
      text: isDisabled ? colors.textTertiary : colors.brandPrimary,
    },
    destructive: {
      bg: isDisabled ? colors.dangerLight : colors.dangerLight,
      border: 'transparent',
      text: isDisabled ? colors.textTertiary : colors.danger,
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
      activeOpacity={0.78}
      style={[
        styles.base,
        {
          height: HEIGHT[size],
          paddingHorizontal: H_PAD[size],
          backgroundColor: vs.bg,
          borderColor: vs.border,
          borderRadius: RADIUS[size],
          borderWidth: variant === 'secondary' ? 1.5 : 0,
          opacity: isDisabled && !loading ? 0.55 : 1,
        },
        vs.shadow,
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
            variant={size === 'sm' ? 'labelMedium' : size === 'lg' ? 'bodyLarge' : 'labelLarge'}
            color={vs.text}
            style={styles.label}
            numberOfLines={1}
            adjustsFontSizeToFit
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
  base: { alignItems: 'center', justifyContent: 'center' },
  full: { width: '100%' },
  row: { flexDirection: 'row', alignItems: 'center' },
  label: { flexShrink: 1 },
  leftIcon: { marginRight: 7 },
  rightIcon: { marginLeft: 7 },
});
