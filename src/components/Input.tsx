import { useState, useRef } from 'react';
import {
  TextInput,
  View,
  TouchableOpacity,
  StyleSheet,
  type TextInputProps,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Text } from './Text';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface InputProps extends TextInputProps {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: IoniconName;
  rightIcon?: IoniconName;
  onRightIconPress?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
}

export function Input({
  label,
  hint,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  style,
  ...rest
}: InputProps) {
  const { colors, radii, spacing } = useTheme();
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const hasError = error != null && error.length > 0;
  const borderColor = hasError
    ? colors.danger
    : focused
      ? colors.inputBorderFocus
      : colors.inputBorder;

  return (
    <View style={[styles.container, containerStyle]}>
      {label != null && (
        <Text variant="labelLarge" style={{ marginBottom: spacing[1], color: colors.textPrimary }}>
          {label}
        </Text>
      )}

      <TouchableOpacity
        activeOpacity={1}
        onPress={() => inputRef.current?.focus()}
        accessibilityRole="none"
        style={[
          styles.inputRow,
          {
            backgroundColor: colors.inputBackground,
            borderColor,
            borderRadius: radii.lg,
            paddingHorizontal: spacing[3],
            minHeight: 48,
          },
        ]}
      >
        {leftIcon != null && (
          <Ionicons
            name={leftIcon}
            size={18}
            color={focused ? colors.brandPrimary : colors.textTertiary}
            style={{ marginRight: spacing[2] }}
          />
        )}

        <TextInput
          ref={inputRef}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholderTextColor={colors.textPlaceholder}
          style={[styles.input, { color: colors.inputText }, style]}
          accessibilityLabel={label}
          {...rest}
        />

        {rightIcon != null && (
          <TouchableOpacity
            onPress={onRightIconPress}
            disabled={onRightIconPress == null}
            accessibilityRole={onRightIconPress != null ? 'button' : 'none'}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ marginLeft: spacing[2] }}
          >
            <Ionicons name={rightIcon} size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {(hint != null || hasError) && (
        <Text
          variant="caption"
          color={hasError ? colors.danger : colors.textSecondary}
          style={{ marginTop: spacing[1] }}
        >
          {hasError ? error : hint}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 10,
  },
});
