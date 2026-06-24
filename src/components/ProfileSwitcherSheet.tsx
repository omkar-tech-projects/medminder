import { useState } from 'react';
import { View, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { Text } from './Text';
import { ProfileFormSheet } from './ProfileFormSheet';
import { useTheme } from '@/theme';
import { useProfileStore } from '@/store/profile-store';
import type { Profile } from '@/db/schema';

interface ProfileSwitcherSheetProps {
  visible: boolean;
  onClose: () => void;
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function ProfileSwitcherSheet({ visible, onClose }: ProfileSwitcherSheetProps) {
  const { colors, spacing, radii } = useTheme();
  const { profiles, activeProfileId, setActiveProfile } = useProfileStore();
  const [formTarget, setFormTarget] = useState<Profile | 'new' | null>(null);

  async function handleSwitch(id: string): Promise<void> {
    if (id !== activeProfileId) {
      await setActiveProfile(id);
    }
    onClose();
  }

  return (
    <>
      <BottomSheet visible={visible} onClose={onClose} title="Profiles" height={420}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {profiles.map((profile) => {
            const isActive = profile.id === activeProfileId;
            return (
              <TouchableOpacity
                key={profile.id}
                onPress={() => void handleSwitch(profile.id)}
                accessibilityRole="button"
                accessibilityLabel={`Switch to ${profile.name}`}
                style={[
                  styles.row,
                  {
                    backgroundColor: colors.surface,
                    borderColor: isActive ? colors.brandPrimary : colors.border,
                    borderRadius: radii.lg,
                    padding: spacing[3],
                    marginBottom: spacing[2],
                  },
                ]}
              >
                <View style={[styles.avatar, { backgroundColor: profile.avatarColor }]}>
                  <Text variant="labelLarge" color="#fff">
                    {initials(profile.name)}
                  </Text>
                </View>
                <View style={styles.rowText}>
                  <Text variant="bodyMedium">{profile.name}</Text>
                  {profile.caregiverAlertEnabled === 1 && profile.caregiverContact && (
                    <Text variant="caption" color={colors.textTertiary}>
                      {`Caregiver: ${profile.caregiverName ?? profile.caregiverContact}`}
                    </Text>
                  )}
                </View>
                {isActive && (
                  <Ionicons name="checkmark-circle" size={20} color={colors.brandPrimary} />
                )}
                <TouchableOpacity
                  onPress={() => setFormTarget(profile)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${profile.name}`}
                  style={{ marginLeft: spacing[3] }}
                >
                  <Ionicons name="pencil-outline" size={18} color={colors.textTertiary} />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}

          <Button
            label="Add person"
            variant="ghost"
            fullWidth
            leftIcon="person-add-outline"
            onPress={() => setFormTarget('new')}
            style={{ marginTop: spacing[2] }}
            accessibilityLabel="Add a new profile"
          />
        </ScrollView>
      </BottomSheet>

      {formTarget != null && (
        <ProfileFormSheet
          target={formTarget}
          visible={formTarget != null}
          onClose={() => setFormTarget(null)}
          onSaved={() => setFormTarget(null)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowText: { flex: 1 },
});
