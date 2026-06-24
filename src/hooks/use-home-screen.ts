import { useEffect } from 'react';
import { format } from 'date-fns';
import { useProfileStore } from '@/store/profile-store';
import { useDoseStore } from '@/store/dose-store';
import { useMedicationStore } from '@/store/medication-store';

function greeting(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function useHomeScreen() {
  const name = useProfileStore((s) => s.name);
  const isLoaded = useProfileStore((s) => s.isLoaded);
  const loadProfile = useProfileStore((s) => s.load);
  const activeProfileId = useProfileStore((s) => s.activeProfileId);

  const doses = useDoseStore((s) => s.dosesForDate);
  const summary = useDoseStore((s) => s.summary);
  const loadForDate = useDoseStore((s) => s.loadForDate);

  const hasMedications = useMedicationStore((s) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return s.medications.some((m) => m.active === 1 && (m.endDate == null || m.endDate >= today));
  });
  const loadMedications = useMedicationStore((s) => s.load);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    loadMedications();
    loadForDate(format(new Date(), 'yyyy-MM-dd'));
    // Re-run whenever the active profile changes so data always matches the current profile.
  }, [loadMedications, loadForDate, activeProfileId]);

  const now = new Date();
  return {
    greeting: greeting(now.getHours()),
    name,
    isLoaded,
    dateLabel: format(now, 'EEEE, MMMM d'),
    doses,
    summary,
    hasMedications,
  };
}
