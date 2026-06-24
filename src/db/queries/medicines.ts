import { and, eq, gte, isNotNull, lt, lte, sql } from 'drizzle-orm';
import { format, addDays } from 'date-fns';
import { db } from '../index';
import { medicines, type Medicine, type NewMedicine } from '../schema';

export function getAllMedicines(profileId?: string | null): Medicine[] {
  const all = db.select().from(medicines).all();
  return profileId != null ? all.filter((m) => m.profileId === profileId) : all;
}

export function getActiveMedicineCount(profileId: string): number {
  return getActiveMedicines(profileId).length;
}

export function getActiveMedicines(profileId?: string | null): Medicine[] {
  const today = format(new Date(), 'yyyy-MM-dd');
  return db
    .select()
    .from(medicines)
    .where(and(eq(medicines.active, 1)))
    .all()
    .filter(
      (m) =>
        (m.endDate == null || m.endDate >= today) &&
        (profileId == null || m.profileId === profileId),
    );
}

export function getMedicineById(id: string): Medicine | undefined {
  return db.select().from(medicines).where(eq(medicines.id, id)).get();
}

export function insertMedicine(data: NewMedicine): void {
  db.insert(medicines).values(data).run();
}

export function updateMedicine(id: string, data: Partial<NewMedicine>): void {
  db.update(medicines)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(eq(medicines.id, id))
    .run();
}

export function deleteMedicine(id: string): void {
  db.delete(medicines).where(eq(medicines.id, id)).run();
}

export function pauseMedicine(id: string): void {
  db.update(medicines)
    .set({ active: 0, updatedAt: new Date().toISOString() })
    .where(eq(medicines.id, id))
    .run();
}

export function resumeMedicine(id: string): void {
  db.update(medicines)
    .set({ active: 1, updatedAt: new Date().toISOString() })
    .where(eq(medicines.id, id))
    .run();
}

export function setMedicineCalendarSync(id: string, enabled: boolean): void {
  db.update(medicines)
    .set({ calendarSync: enabled ? 1 : 0, updatedAt: new Date().toISOString() })
    .where(eq(medicines.id, id))
    .run();
}

export function decrementStockCount(id: string): void {
  db.run(
    sql`UPDATE medicines SET stock_count = MAX(0, stock_count - 1) WHERE id = ${id} AND stock_count IS NOT NULL AND stock_count > 0`,
  );
}

export function getEndedCourses(profileId?: string | null): Medicine[] {
  const today = format(new Date(), 'yyyy-MM-dd');
  return db
    .select()
    .from(medicines)
    .where(and(eq(medicines.active, 1), isNotNull(medicines.endDate), lt(medicines.endDate, today)))
    .all()
    .filter((m) => profileId == null || m.profileId === profileId);
}

export function getCoursesEndingSoon(
  thresholdDays: number = 3,
  profileId?: string | null,
): Medicine[] {
  const today = format(new Date(), 'yyyy-MM-dd');
  const threshold = format(addDays(new Date(), thresholdDays), 'yyyy-MM-dd');
  return db
    .select()
    .from(medicines)
    .where(
      and(
        eq(medicines.active, 1),
        isNotNull(medicines.endDate),
        gte(medicines.endDate, today),
        lte(medicines.endDate, threshold),
      ),
    )
    .all()
    .filter((m) => profileId == null || m.profileId === profileId);
}
