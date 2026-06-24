import { useCallback } from 'react';
import { useDoseStore } from '@/store/dose-store';
import { useToast } from '@/store/ui-store';
import {
  cancelNotificationsForDoseLog,
  scheduleNotificationsForDoseLog,
} from '@/services/notification-service';
import { getDoseLogWithParams, getMedicineIdForDoseLog } from '@/db/queries/dose-logs';
import { decrementStockCount } from '@/db/queries/medicines';

export function useDoseConfirmation() {
  const markTaken = useDoseStore((s) => s.markTaken);
  const markMissed = useDoseStore((s) => s.markMissed);
  const skip = useDoseStore((s) => s.skip);
  const revertToPending = useDoseStore((s) => s.revertToPending);
  const toast = useToast();

  const confirmTaken = useCallback(
    (doseLogId: string): void => {
      markTaken(doseLogId);
      void cancelNotificationsForDoseLog(doseLogId);
      const medicineId = getMedicineIdForDoseLog(doseLogId);
      if (medicineId) decrementStockCount(medicineId);

      toast.show({
        message: 'Marked as taken',
        type: 'success',
        duration: 5000,
        undoAction: () => {
          revertToPending(doseLogId);
          // Best-effort reschedule: skips any times already in the past
          const p = getDoseLogWithParams(doseLogId);
          if (p) {
            void scheduleNotificationsForDoseLog({ doseLogId, ...p }).catch(() => undefined);
          }
        },
      });
    },
    [markTaken, revertToPending, toast],
  );

  const confirmMissed = useCallback(
    (doseLogId: string): void => {
      markMissed(doseLogId);
    },
    [markMissed],
  );

  const confirmSkip = useCallback(
    (doseLogId: string): void => {
      void cancelNotificationsForDoseLog(doseLogId);
      skip(doseLogId);
    },
    [skip],
  );

  return { confirmTaken, confirmMissed, confirmSkip };
}
