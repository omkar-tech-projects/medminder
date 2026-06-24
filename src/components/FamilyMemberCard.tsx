import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Text } from './Text';
import { useTheme } from '@/theme';
import type { Profile } from '@/db/schema';
import type { AdherenceSummary } from '@/repositories/dose-repository';

interface FamilyMemberCardProps {
  profile: Profile;
  adherence: AdherenceSummary;
  activeMedicineCount: number;
  nextDoseTime: string | null;
  isActive: boolean;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function FamilyMemberCard({
  profile,
  adherence,
  activeMedicineCount,
  nextDoseTime,
  isActive,
  onPress,
  onEdit,
  onDelete,
}: FamilyMemberCardProps) {
  const { colors, spacing, radii } = useTheme();
  const { t } = useTranslation();

  const adherencePct =
    adherence.total > 0 ? Math.round((adherence.taken / adherence.total) * 100) : null;
  const adherenceColor =
    adherencePct == null
      ? colors.textTertiary
      : adherencePct >= 80
        ? colors.success
        : adherencePct >= 50
          ? colors.warning
          : colors.danger;

  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('family.viewProfile', { name: profile.name })}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderRadius: radii.lg,
          padding: spacing[4],
          borderWidth: 1.5,
          borderColor: isActive ? colors.brandPrimary : colors.border,
        },
      ]}
    >
      <View style={styles.top}>
        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: profile.avatarColor }]}>
          <Text variant="labelLarge" color="#fff">
            {initials(profile.name)}
          </Text>
        </View>

        {/* Name + phone + relationship */}
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text variant="bodyMedium" color={colors.textPrimary}>
              {profile.name}
            </Text>
            {isActive && (
              <View style={[styles.activePill, { backgroundColor: colors.brandPrimaryLight }]}>
                <Text variant="caption" color={colors.brandPrimary}>
                  Viewing
                </Text>
              </View>
            )}
          </View>
          {profile.relationship != null && (
            <Text variant="caption" color={colors.textTertiary} style={{ marginTop: 1 }}>
              {profile.relationship.charAt(0).toUpperCase() + profile.relationship.slice(1)}
              {profile.phoneNumber != null ? `  ·  ${profile.phoneNumber}` : ''}
            </Text>
          )}
          {profile.relationship == null && profile.phoneNumber != null && (
            <Text variant="caption" color={colors.textTertiary} style={{ marginTop: 1 }}>
              {profile.phoneNumber}
            </Text>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={onEdit}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={t('family.editMember')}
          >
            <Ionicons name="pencil-outline" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onDelete}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={t('family.deleteMember')}
            style={{ marginLeft: spacing[3] }}
          >
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats row */}
      <View style={[styles.stats, { marginTop: spacing[3], borderTopColor: colors.border }]}>
        <StatItem
          label={
            activeMedicineCount === 1
              ? t('family.activeMedicines_one', { count: activeMedicineCount })
              : t('family.activeMedicines_other', { count: activeMedicineCount })
          }
          color={colors.textSecondary}
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <StatItem
          label={
            adherence.total === 0
              ? t('family.noDosesToday')
              : t('family.adherence', { taken: adherence.taken, total: adherence.total })
          }
          color={adherenceColor}
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <StatItem
          label={
            nextDoseTime != null
              ? t('family.nextDose', { time: format(new Date(nextDoseTime), 'h:mm a') })
              : t('family.noDosesToday')
          }
          color={colors.textSecondary}
        />
      </View>
    </TouchableOpacity>
  );
}

function StatItem({ label, color }: { label: string; color: string }) {
  return (
    <Text variant="caption" color={color} style={styles.statItem} numberOfLines={1}>
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  top: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  activePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  actions: { flexDirection: 'row', alignItems: 'center', marginLeft: 8 },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  divider: { width: 1, height: 12, marginHorizontal: 8 },
  statItem: { flex: 1 },
});
