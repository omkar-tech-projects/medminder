import { useState, useCallback, useEffect } from 'react';
import { format, differenceInDays, parseISO, addDays } from 'date-fns';
import { getAllMedicines, getEndedCourses } from '@/db/queries/medicines';
import { scheduleRefillReminderNotification } from '@/services/notification-service';
import { useSettingsStore } from '@/store/settings-store';
import { useProfileStore } from '@/store/profile-store';
import type { Medicine } from '@/db/schema';

export interface RefillWarning {
  medicineId: string;
  medicineName: string;
  medicineColor: string;
  type: 'ending-soon' | 'low-stock';
  endDate?: string;
  daysLeft?: number;
  stockDaysLeft?: number;
}

export function useRefillWarnings(): {
  warnings: RefillWarning[];
  endedCourses: Medicine[];
  dismissedKeys: Set<string>;
  dismiss: (key: string) => void;
  setRefillReminder: (
    medicineId: string,
    medicineName: string,
    daysFromNow: number,
  ) => Promise<void>;
  load: () => void;
} {
  const [warnings, setWarnings] = useState<RefillWarning[]>([]);
  const [endedCourses, setEndedCourses] = useState<Medicine[]>([]);
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(new Set());

  const refillWarningDays = useSettingsStore((s) => s.refillWarningDays);
  const lowStockWarningDays = useSettingsStore((s) => s.lowStockWarningDays);
  const activeProfileId = useProfileStore((s) => s.activeProfileId);

  const load = useCallback((): void => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const active = getAllMedicines(activeProfileId).filter(
      (m) => m.active === 1 && (m.endDate == null || m.endDate >= today),
    );

    const ws: RefillWarning[] = [];
    for (const m of active) {
      if (m.endDate) {
        const daysLeft = differenceInDays(parseISO(`${m.endDate}T00:00:00`), new Date());
        if (daysLeft <= refillWarningDays && !dismissedKeys.has(`${m.id}:ending-soon`)) {
          ws.push({
            medicineId: m.id,
            medicineName: m.name,
            medicineColor: m.color,
            type: 'ending-soon',
            endDate: m.endDate,
            daysLeft,
          });
        }
      }
      if (m.stockCount != null && m.stockCount >= 0) {
        const stockDaysLeft = m.timesPerDay > 0 ? Math.floor(m.stockCount / m.timesPerDay) : 0;
        if (stockDaysLeft <= lowStockWarningDays && !dismissedKeys.has(`${m.id}:low-stock`)) {
          ws.push({
            medicineId: m.id,
            medicineName: m.name,
            medicineColor: m.color,
            type: 'low-stock',
            stockDaysLeft,
          });
        }
      }
    }

    setWarnings(ws);
    setEndedCourses(
      getEndedCourses(activeProfileId).filter((m) => !dismissedKeys.has(`${m.id}:ended`)),
    );
  }, [refillWarningDays, lowStockWarningDays, dismissedKeys, activeProfileId]);

  useEffect(() => {
    load();
  }, [load]);

  const dismiss = useCallback((key: string): void => {
    setDismissedKeys((prev) => new Set([...prev, key]));
  }, []);

  const setRefillReminder = useCallback(
    async (medicineId: string, medicineName: string, daysFromNow: number): Promise<void> => {
      const remindAt = addDays(new Date(), daysFromNow);
      remindAt.setHours(9, 0, 0, 0);
      await scheduleRefillReminderNotification({ medicineId, medicineName, remindAt });
    },
    [],
  );

  return { warnings, endedCourses, dismissedKeys, dismiss, setRefillReminder, load };
}
