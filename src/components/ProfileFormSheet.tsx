import { useEffect, useState } from 'react';
import { View, Switch, Alert, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { BottomSheet } from './BottomSheet';
import { Input } from './Input';
import { Button } from './Button';
import { Text } from './Text';
import { useTheme } from '@/theme';
import { useProfileStore } from '@/store/profile-store';
import { MEDICATION_COLORS } from '@/lib/constants';
import type { Profile } from '@/db/schema';

interface ProfileFormSheetProps {
  target: Profile | 'new';
  visible: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function ProfileFormSheet({ target, visible, onClose, onSaved }: ProfileFormSheetProps) {
  const { colors, spacing, radii } = useTheme();
  const store = useProfileStore();

  const isNew = target === 'new';
  const [name, setName] = useState('');
  const [avatarColor, setAvatarColor] = useState<string>(MEDICATION_COLORS[0] ?? '#3B82F6');
  const [caregiverName, setCaregiverName] = useState('');
  const [caregiverContact, setCaregiverContact] = useState('');
  const [caregiverEnabled, setCaregiverEnabled] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (target === 'new') {
      setName('');
      setAvatarColor(MEDICATION_COLORS[0] ?? '#3B82F6');
      setCaregiverName('');
      setCaregiverContact('');
      setCaregiverEnabled(false);
    } else {
      setName(target.name);
      setAvatarColor(target.avatarColor);
      setCaregiverName(target.caregiverName ?? '');
      setCaregiverContact(target.caregiverContact ?? '');
      setCaregiverEnabled(target.caregiverAlertEnabled === 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  function handleSave(): void {
    const trimmed = name.trim();
    if (!trimmed) return;
    const caregiverData = {
      caregiverName: caregiverName.trim() || null,
      caregiverContact: caregiverContact.trim() || null,
      caregiverAlertEnabled: caregiverEnabled ? 1 : 0,
    };
    if (isNew) {
      store.createProfile(trimmed, avatarColor);
    } else {
      store.updateProfile((target as Profile).id, { name: trimmed, avatarColor, ...caregiverData });
    }
    onSaved?.();
    onClose();
  }

  function handleDelete(): void {
    if (isNew) return;
    const prof = target as Profile;
    Alert.alert(
      'Delete profile?',
      `This permanently deletes "${prof.name}" and all their medications and history.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            store.deleteProfile(prof.id);
            onSaved?.();
            onClose();
          },
        },
      ],
    );
  }

  const canDelete = !isNew && store.profiles.length > 1;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={isNew ? 'Add person' : 'Edit profile'}
      height={560}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Input
          label="Name"
          placeholder="e.g. Dad, Sarah"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          maxLength={40}
          accessibilityLabel="Profile name"
        />

        <Text variant="caption" color={colors.textTertiary} style={{ marginTop: spacing[3] }}>
          Colour
        </Text>
        <View style={[styles.colorRow, { marginTop: spacing[1] }]}>
          {MEDICATION_COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => setAvatarColor(c)}
              accessibilityRole="radio"
              accessibilityLabel={`Select colour ${c}`}
              style={[
                styles.colorDot,
                { backgroundColor: c },
                avatarColor === c && {
                  borderWidth: 3,
                  borderColor: colors.textPrimary,
                },
              ]}
            />
          ))}
        </View>

        <View style={[styles.toggleRow, { marginTop: spacing[4] }]}>
          <View style={styles.toggleLabel}>
            <Text variant="bodyMedium">Caregiver alerts</Text>
            <Text variant="caption" color={colors.textTertiary} style={{ marginTop: 2 }}>
              Send an SMS or email when a dose is missed.
            </Text>
          </View>
          <Switch
            value={caregiverEnabled}
            onValueChange={setCaregiverEnabled}
            accessibilityLabel="Enable caregiver alerts"
          />
        </View>

        {caregiverEnabled && (
          <View
            style={[
              {
                marginTop: spacing[3],
                borderRadius: radii.lg,
                padding: spacing[3],
                backgroundColor: colors.backgroundSecondary,
                borderWidth: 1,
                borderColor: colors.border,
              },
            ]}
          >
            <Input
              label="Caregiver name"
              placeholder="e.g. Dr. Smith"
              value={caregiverName}
              onChangeText={setCaregiverName}
              autoCapitalize="words"
              maxLength={60}
              accessibilityLabel="Caregiver name"
            />
            <Input
              label="Contact (phone or email)"
              placeholder="e.g. +1 555 0100 or care@example.com"
              value={caregiverContact}
              onChangeText={setCaregiverContact}
              keyboardType="email-address"
              maxLength={120}
              containerStyle={{ marginTop: spacing[3] }}
              accessibilityLabel="Caregiver contact"
            />
          </View>
        )}

        <Button
          label="Save"
          variant="primary"
          fullWidth
          onPress={handleSave}
          style={{ marginTop: spacing[5] }}
          accessibilityLabel="Save profile"
        />
        {canDelete && (
          <Button
            label="Delete profile"
            variant="destructive"
            fullWidth
            onPress={handleDelete}
            style={{ marginTop: spacing[2] }}
            accessibilityLabel="Delete this profile"
          />
        )}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 16 },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  toggleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  toggleLabel: { flex: 1, marginRight: 12 },
});
