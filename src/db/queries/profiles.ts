import { eq } from 'drizzle-orm';
import { db } from '../index';
import { profiles, type Profile, type NewProfile } from '../schema';

export const DEFAULT_PROFILE_ID = 'profile:default';

export function getAllProfiles(): Profile[] {
  return db.select().from(profiles).all();
}

export function getProfileById(id: string): Profile | undefined {
  return db.select().from(profiles).where(eq(profiles.id, id)).get();
}

export function insertProfile(data: NewProfile): void {
  db.insert(profiles).values(data).run();
}

export function updateProfile(id: string, data: Partial<NewProfile>): void {
  db.update(profiles)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(eq(profiles.id, id))
    .run();
}

export function deleteProfile(id: string): void {
  db.delete(profiles).where(eq(profiles.id, id)).run();
}
