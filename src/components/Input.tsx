import { useState, useRef } from 'react';
import {
  TextInput,
  View,
  Pressable,
  TouchableOpacity,
  StyleSheet,
  Platform,
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
  const { colors, spacing } = useTheme();
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const hasError = error != null && error.length > 0;

  const borderColor = hasError
    ? colors.danger
    : focused
      ? colors.inputBorderFocus
      : colors.inputBorder;
  const borderWidth = focused && !hasError ? 2 : 1.5;

  return (
    <View style={[styles.container, containerStyle]}>
      {label != null && (
        <Text variant="labelSmall" style={{ marginBottom: 7, color: colors.textTertiary }}>
          {label}
        </Text>
      )}

      <Pressable
        onPress={() => inputRef.current?.focus()}
        importantForAccessibility="no"
        style={[
          styles.inputRow,
          {
            backgroundColor: colors.inputBackground,
            borderColor,
            borderWidth,
            borderRadius: 16,
            paddingHorizontal: 16,
            minHeight: 52,
            ...(focused &&
              !hasError && {
                shadowColor: colors.brandPrimary,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.18,
                shadowRadius: 6,
              }),
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
          selectionColor={colors.brandPrimary}
          underlineColorAndroid="transparent"
          allowFontScaling={false}
          autoComplete="off"
          importantForAutofill="no"
          style={[
            styles.input,
            {
              color: colors.inputText,
              fontFamily: Platform.OS === 'android' ? 'Nunito_400Regular' : undefined,
              includeFontPadding: false,
            },
            style,
          ]}
          accessibilityLabel={label ?? undefined}
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
      </Pressable>

      {(hint != null || hasError) && (
        <View style={styles.hintRow}>
          {!hasError && (
            <Ionicons
              name="information-circle-outline"
              size={13}
              color={colors.textTertiary}
              style={{ marginRight: 4, marginTop: 1 }}
            />
          )}
          <Text
            variant="caption"
            color={hasError ? colors.danger : colors.textTertiary}
            style={{ marginTop: spacing[1], flex: 1 }}
          >
            {hasError ? error : hint}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 5,
  },
});
