import { useEffect, useState } from 'react';
import { View, Alert, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BottomSheet } from './BottomSheet';
import { Input } from './Input';
import { Button } from './Button';
import { Text } from './Text';
import { CountryCodePicker } from './CountryCodePicker';
import { useTheme } from '@/theme';
import { useProfileStore } from '@/store/profile-store';
import { MEDICATION_COLORS } from '@/lib/constants';
import { COUNTRY_CODES, DEFAULT_COUNTRY, type CountryCode } from '@/lib/country-codes';
import type { Profile } from '@/db/schema';

type Relationship = 'self' | 'spouse' | 'parent' | 'child' | 'other';
const RELATIONSHIPS: Relationship[] = ['self', 'spouse', 'parent', 'child', 'other'];

interface FamilyMemberFormSheetProps {
  target: Profile | 'new';
  visible: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function FamilyMemberFormSheet({
  target,
  visible,
  onClose,
  onSaved,
}: FamilyMemberFormSheetProps) {
  const { colors, spacing, radii } = useTheme();
  const store = useProfileStore();
  const { t } = useTranslation();

  const isNew = target === 'new';
  const [name, setName] = useState('');
  const [avatarColor, setAvatarColor] = useState<string>(MEDICATION_COLORS[0] ?? '#3B82F6');
  const [country, setCountry] = useState<CountryCode>(DEFAULT_COUNTRY);
  const [nationalNumber, setNationalNumber] = useState('');
  const [relationship, setRelationship] = useState<Relationship>('other');
  const [dob, setDob] = useState('');

  useEffect(() => {
    if (!visible) return;
    if (isNew) {
      setName('');
      setAvatarColor(MEDICATION_COLORS[0] ?? '#3B82F6');
      setCountry(DEFAULT_COUNTRY);
      setNationalNumber('');
      setRelationship('other');
      setDob('');
    } else {
      const p = target as Profile;
      setName(p.name);
      setAvatarColor(p.avatarColor);
      if (p.phoneNumber != null) {
        const found = COUNTRY_CODES.find((c) => p.phoneNumber!.startsWith(c.dialCode));
        setCountry(found ?? DEFAULT_COUNTRY);
        setNationalNumber(
          found != null ? p.phoneNumber.slice(found.dialCode.length).trim() : p.phoneNumber,
        );
      } else {
        setCountry(DEFAULT_COUNTRY);
        setNationalNumber('');
      }
      setRelationship((p.relationship as Relationship | null) ?? 'other');
      setDob(p.dateOfBirth ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  function handleSave(): void {
    const trimmed = name.trim();
    if (!trimmed) return;
    const phoneNumber = nationalNumber.trim()
      ? `${country.dialCode}${nationalNumber.trim()}`
      : null;
    const extra = { phoneNumber, relationship, dateOfBirth: dob.trim() || null };
    if (isNew) {
      store.createProfile(trimmed, avatarColor, extra);
    } else {
      store.updateProfile((target as Profile).id, { name: trimmed, avatarColor, ...extra });
    }
    onSaved?.();
    onClose();
  }

  function handleDelete(): void {
    if (isNew) return;
    const prof = target as Profile;
    Alert.alert(
      t('family.deleteConfirmTitle', { name: prof.name }),
      t('family.deleteConfirmMessage', { name: prof.name }),
      [
        { text: t('family.deleteConfirmCancel'), style: 'cancel' },
        {
          text: t('family.deleteConfirmButton'),
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

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={isNew ? t('familyForm.addTitle') : t('familyForm.editTitle')}
      height={620}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Input
          label={t('familyForm.nameLabel')}
          placeholder={t('familyForm.namePlaceholder')}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          maxLength={40}
          accessibilityLabel={t('familyForm.nameA11y')}
        />

        {/* Phone number row */}
        <Text
          variant="caption"
          color={colors.textTertiary}
          style={{ marginTop: spacing[3], marginBottom: spacing[1] }}
        >
          {t('familyForm.phoneLabel')}
        </Text>
        <View style={styles.phoneRow}>
          <CountryCodePicker value={country} onChange={setCountry} />
          <View style={{ flex: 1, marginLeft: spacing[2] }}>
            <Input
              placeholder={t('familyForm.phonePlaceholder')}
              value={nationalNumber}
              onChangeText={setNationalNumber}
              keyboardType="phone-pad"
              accessibilityLabel={t('familyForm.phoneA11y')}
            />
          </View>
        </View>
        <Text variant="caption" color={colors.textTertiary} style={{ marginTop: spacing[1] }}>
          {t('familyForm.phoneHint')}
        </Text>

        {/* Relationship */}
        <Text
          variant="caption"
          color={colors.textTertiary}
          style={{ marginTop: spacing[3], marginBottom: spacing[1] }}
        >
          {t('familyForm.relationshipLabel')}
        </Text>
        <View style={styles.chips}>
          {RELATIONSHIPS.map((rel) => (
            <TouchableOpacity
              key={rel}
              onPress={() => setRelationship(rel)}
              accessibilityRole="radio"
              accessibilityLabel={t(`familyForm.relationships.${rel}`)}
              style={[
                styles.chip,
                {
                  backgroundColor:
                    relationship === rel ? colors.brandPrimary : colors.backgroundSecondary,
                  borderColor: relationship === rel ? colors.brandPrimary : colors.border,
                  borderRadius: radii.full,
                  paddingHorizontal: spacing[3],
                  paddingVertical: spacing[1],
                },
              ]}
            >
              <Text
                variant="labelSmall"
                color={relationship === rel ? '#fff' : colors.textSecondary}
              >
                {t(`familyForm.relationships.${rel}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Date of birth */}
        <Input
          label={t('familyForm.dobLabel')}
          placeholder={t('familyForm.dobPlaceholder')}
          value={dob}
          onChangeText={setDob}
          keyboardType="numbers-and-punctuation"
          maxLength={10}
          containerStyle={{ marginTop: spacing[3] }}
          accessibilityLabel={t('familyForm.dobA11y')}
        />

        {/* Avatar colour */}
        <Text variant="caption" color={colors.textTertiary} style={{ marginTop: spacing[3] }}>
          {t('familyForm.colourLabel')}
        </Text>
        <View style={[styles.colorRow, { marginTop: spacing[1] }]}>
          {MEDICATION_COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => setAvatarColor(c)}
              accessibilityRole="radio"
              accessibilityLabel={t('familyForm.colourA11y', { colour: c })}
              style={[
                styles.colorDot,
                { backgroundColor: c },
                avatarColor === c && { borderWidth: 3, borderColor: colors.textPrimary },
              ]}
            />
          ))}
        </View>

        <Button
          label={t('familyForm.save')}
          variant="primary"
          fullWidth
          onPress={handleSave}
          style={{ marginTop: spacing[5] }}
          accessibilityLabel={t('familyForm.saveA11y')}
        />
        {!isNew && store.profiles.length > 1 && (
          <Button
            label={t('family.deleteMember')}
            variant="destructive"
            fullWidth
            onPress={handleDelete}
            style={{ marginTop: spacing[2] }}
            accessibilityLabel={t('family.deleteMember')}
          />
        )}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 16 },
  phoneRow: { flexDirection: 'row', alignItems: 'flex-end' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1 },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
});
