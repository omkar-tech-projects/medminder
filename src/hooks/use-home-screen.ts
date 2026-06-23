import { useEffect } from 'react';
import { format } from 'date-fns';
import { useProfileStore } from '@/store/profile-store';
import { mockDoseRepository } from '@/repositories/mock-dose-repository';

function greeting(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function useHomeScreen() {
  const name = useProfileStore((s) => s.name);
  const isLoaded = useProfileStore((s) => s.isLoaded);
  const load = useProfileStore((s) => s.load);

  useEffect(() => {
    void load();
  }, [load]);

  const now = new Date();
  const doses = mockDoseRepository.getTodayDoses();
  const summary = mockDoseRepository.getAdheranceSummary();

  return {
    greeting: greeting(now.getHours()),
    name,
    isLoaded,
    dateLabel: format(now, 'EEEE, MMMM d'),
    doses,
    summary,
    hasMedications: doses.length > 0,
  };
}
