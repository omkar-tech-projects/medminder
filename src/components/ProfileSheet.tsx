import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { BottomSheet } from './BottomSheet';
import { Input } from './Input';
import { Button } from './Button';
import { Text } from './Text';
import { useTheme } from '@/theme';
import { useProfileStore } from '@/store/profile-store';

interface ProfileSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function ProfileSheet({ visible, onClose }: ProfileSheetProps) {
  const { spacing, colors } = useTheme();
  const { name, setName } = useProfileStore();
  const [nameText, setNameText] = useState(name);

  useEffect(() => {
    if (visible) setNameText(name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  async function handleSave(): Promise<void> {
    await setName(nameText.trim());
    onClose();
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Profile" height={220}>
      <View style={styles.form}>
        <Text variant="caption" color={colors.textTertiary} style={{ marginBottom: spacing[1] }}>
          Your name appears in the greeting on the home screen.
        </Text>
        <Input
          label="Your name"
          placeholder="e.g. Alex"
          value={nameText}
          onChangeText={setNameText}
          autoCapitalize="words"
          maxLength={40}
          returnKeyType="done"
          onSubmitEditing={() => void handleSave()}
          accessibilityLabel="Your display name"
        />
        <Button
          label="Save"
          variant="primary"
          fullWidth
          onPress={() => void handleSave()}
          style={{ marginTop: spacing[4] }}
          accessibilityLabel="Save profile name"
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  form: { flex: 1 },
});
