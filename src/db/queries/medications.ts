import { eq } from 'drizzle-orm';
import { db } from '../index';
import { medications, type NewMedication } from '../schema';

export function getAllMedications() {
  return db.select().from(medications).all();
}

export function getMedicationById(id: string) {
  return db.select().from(medications).where(eq(medications.id, id)).get();
}

export function insertMedication(data: NewMedication) {
  return db.insert(medications).values(data).run();
}

export function updateMedication(id: string, data: Partial<NewMedication>) {
  return db.update(medications).set(data).where(eq(medications.id, id)).run();
}

export function deleteMedication(id: string) {
  return db.delete(medications).where(eq(medications.id, id)).run();
}
