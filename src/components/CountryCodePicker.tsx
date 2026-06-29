import { useState, useMemo } from 'react';
import {
  View,
  Modal,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Text } from './Text';
import { useTheme } from '@/theme';
import { COUNTRY_CODES, type CountryCode } from '@/lib/country-codes';

interface CountryCodePickerProps {
  value: CountryCode;
  onChange: (country: CountryCode) => void;
}

export function CountryCodePicker({ value, onChange }: CountryCodePickerProps) {
  const { colors, spacing, radii } = useTheme();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRY_CODES;
    return COUNTRY_CODES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dialCode.includes(q) ||
        c.isoCode.toLowerCase().includes(q),
    );
  }, [query]);

  function handleSelect(country: CountryCode): void {
    onChange(country);
    setQuery('');
    setOpen(false);
  }

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={t('familyForm.countryCodeA11y')}
        style={[
          styles.trigger,
          {
            backgroundColor: colors.backgroundSecondary,
            borderColor: colors.border,
            borderRadius: radii.md,
            paddingHorizontal: spacing[3],
            height: 48,
          },
        ]}
      >
        <Text variant="bodyMedium" color={colors.textPrimary}>
          {value.dialCode}
        </Text>
        <Ionicons
          name="chevron-down"
          size={14}
          color={colors.textTertiary}
          style={{ marginLeft: 4 }}
        />
      </TouchableOpacity>

      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setOpen(false)}
      >
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View
            style={[
              styles.modalHeader,
              { borderBottomColor: colors.border, paddingHorizontal: spacing[4] },
            ]}
          >
            <Text variant="headingMedium">{t('onboardingPhone.countryPickerTitle')}</Text>
            <TouchableOpacity
              onPress={() => setOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View
            style={[
              styles.searchRow,
              { paddingHorizontal: spacing[4], paddingVertical: spacing[2] },
            ]}
          >
            <Ionicons
              name="search-outline"
              size={18}
              color={colors.textTertiary}
              style={{ marginRight: spacing[2] }}
            />
            <TextInput
              style={[
                styles.searchInput,
                {
                  color: colors.textPrimary,
                  flex: 1,
                  includeFontPadding: false,
                },
              ]}
              placeholder={t('onboardingPhone.countrySearchPlaceholder')}
              placeholderTextColor={colors.textTertiary}
              value={query}
              onChangeText={setQuery}
              autoFocus
              autoCorrect={false}
              underlineColorAndroid="transparent"
              allowFontScaling={false}
              accessibilityLabel={t('onboardingPhone.countrySearchPlaceholder')}
            />
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.isoCode}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => handleSelect(item)}
                accessibilityRole="button"
                accessibilityLabel={`${item.name} ${item.dialCode}`}
                style={[
                  styles.row,
                  {
                    paddingHorizontal: spacing[4],
                    paddingVertical: spacing[3],
                    borderBottomColor: colors.border,
                    backgroundColor:
                      item.isoCode === value.isoCode ? colors.brandPrimaryLight : undefined,
                  },
                ]}
              >
                <Text variant="bodyMedium" style={styles.rowName} color={colors.textPrimary}>
                  {item.name}
                </Text>
                <Text variant="bodyMedium" color={colors.textTertiary}>
                  {item.dialCode}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: { flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  modal: { flex: 1, paddingTop: Platform.OS === 'android' ? 0 : 0 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchRow: { flexDirection: 'row', alignItems: 'center' },
  searchInput: { fontSize: 16, height: 40 },
  row: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth },
  rowName: { flex: 1 },
});
