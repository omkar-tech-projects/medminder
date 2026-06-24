import { format, addDays, subDays } from 'date-fns';
import { db } from './index';
import { medicines, schedules, doseLogs } from './schema';
import { DOSE_STATUS, MEDICATION_COLORS } from '@/lib/constants';

export function seedDevData(): void {
  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  const in29Days = format(addDays(new Date(), 29), 'yyyy-MM-dd');
  const in89Days = format(addDays(new Date(), 89), 'yyyy-MM-dd');

  db.delete(doseLogs).run();
  db.delete(schedules).run();
  db.delete(medicines).run();

  db.insert(medicines)
    .values([
      {
        id: 'med_seed_1',
        name: 'Metformin',
        strength: '500mg',
        form: 'tablet',
        instructions: 'Take with meals to reduce stomach upset',
        timing: 'after_food',
        durationDays: 30,
        startDate: yesterday,
        endDate: in29Days,
        stockCount: null,
        active: 1,
        dosage: 1,
        dosageUnit: 'tablet',
        timesPerDay: 2,
        color: MEDICATION_COLORS[0] ?? '#3B82F6',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'med_seed_2',
        name: 'Lisinopril',
        strength: '10mg',
        form: 'tablet',
        instructions: null,
        timing: 'any',
        durationDays: 90,
        startDate: yesterday,
        endDate: in89Days,
        stockCount: null,
        active: 1,
        dosage: 1,
        dosageUnit: 'tablet',
        timesPerDay: 1,
        color: MEDICATION_COLORS[1] ?? '#14B8A6',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'med_seed_3',
        name: 'Atorvastatin',
        strength: '20mg',
        form: 'tablet',
        instructions: null,
        timing: 'after_food',
        durationDays: null,
        startDate: yesterday,
        endDate: null,
        stockCount: null,
        active: 1,
        dosage: 1,
        dosageUnit: 'tablet',
        timesPerDay: 1,
        color: MEDICATION_COLORS[2] ?? '#A855F7',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ])
    .run();

  db.insert(schedules)
    .values([
      {
        id: 'sch_1a',
        medicineId: 'med_seed_1',
        timeOfDay: '08:00',
        dayPattern: null,
        leadMinutes: 5,
        nagIntervalMinutes: 5,
        maxNags: 24,
      },
      {
        id: 'sch_1b',
        medicineId: 'med_seed_1',
        timeOfDay: '20:00',
        dayPattern: null,
        leadMinutes: 5,
        nagIntervalMinutes: 5,
        maxNags: 24,
      },
      {
        id: 'sch_2',
        medicineId: 'med_seed_2',
        timeOfDay: '09:00',
        dayPattern: null,
        leadMinutes: 5,
        nagIntervalMinutes: 5,
        maxNags: 24,
      },
      {
        id: 'sch_3',
        medicineId: 'med_seed_3',
        timeOfDay: '21:00',
        dayPattern: null,
        leadMinutes: 5,
        nagIntervalMinutes: 5,
        maxNags: 24,
      },
    ])
    .run();

  // Yesterday — all historical
  db.insert(doseLogs)
    .values([
      {
        id: 'dl_y1',
        medicineId: 'med_seed_1',
        scheduleId: 'sch_1a',
        scheduledAt: `${yesterday}T08:00:00`,
        status: DOSE_STATUS.TAKEN,
        respondedAt: `${yesterday}T08:04:00`,
        source: 'app',
      },
      {
        id: 'dl_y2',
        medicineId: 'med_seed_1',
        scheduleId: 'sch_1b',
        scheduledAt: `${yesterday}T20:00:00`,
        status: DOSE_STATUS.MISSED,
        respondedAt: null,
        source: null,
      },
      {
        id: 'dl_y3',
        medicineId: 'med_seed_2',
        scheduleId: 'sch_2',
        scheduledAt: `${yesterday}T09:00:00`,
        status: DOSE_STATUS.TAKEN,
        respondedAt: `${yesterday}T09:11:00`,
        source: 'app',
      },
      {
        id: 'dl_y4',
        medicineId: 'med_seed_3',
        scheduleId: 'sch_3',
        scheduledAt: `${yesterday}T21:00:00`,
        status: DOSE_STATUS.SKIPPED,
        respondedAt: `${yesterday}T21:00:00`,
        source: 'app',
      },
    ])
    .run();

  // Today — mixed states for home screen demo
  db.insert(doseLogs)
    .values([
      {
        id: 'dl_t1',
        medicineId: 'med_seed_1',
        scheduleId: 'sch_1a',
        scheduledAt: `${today}T08:00:00`,
        status: DOSE_STATUS.TAKEN,
        respondedAt: `${today}T08:03:00`,
        source: 'app',
      },
      {
        id: 'dl_t2',
        medicineId: 'med_seed_2',
        scheduleId: 'sch_2',
        scheduledAt: `${today}T09:00:00`,
        status: DOSE_STATUS.MISSED,
        respondedAt: null,
        source: null,
      },
      {
        id: 'dl_t3',
        medicineId: 'med_seed_1',
        scheduleId: 'sch_1b',
        scheduledAt: `${today}T20:00:00`,
        status: DOSE_STATUS.PENDING,
        respondedAt: null,
        source: null,
      },
      {
        id: 'dl_t4',
        medicineId: 'med_seed_3',
        scheduleId: 'sch_3',
        scheduledAt: `${today}T21:00:00`,
        status: DOSE_STATUS.PENDING,
        respondedAt: null,
        source: null,
      },
    ])
    .run();
}
