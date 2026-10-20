import { deserialize, storageKeyFor } from './model.ts';
import { canonical } from './sync.ts';

export interface CachedReview { review: boolean; revision: number; dirty: boolean }

/** Read only the requested groups, including pending marks in groups not mounted after reload. */
export function readReviewCache(userId: string, scope: string, groups: string[], storage: Pick<Storage, 'getItem'>) {
  const records = new Map<string, CachedReview>();
  for (const group of new Set(groups)) {
    try {
      const key = storageKeyFor(userId, scope, group);
      const raw = storage.getItem(key);
      if (raw === null) continue;
      const doc = deserialize(raw);
      const meta = JSON.parse(storage.getItem(`${key}:sync`) || 'null');
      if (meta && (!Number.isSafeInteger(meta.revision) || meta.revision < 0
        || (meta.acknowledged !== null && typeof meta.acknowledged !== 'string'))) continue;
      const acknowledged = meta?.acknowledged == null ? null : canonical(deserialize(meta.acknowledged));
      const dirty = acknowledged === null ? !!(doc.review || doc.items.length || doc.note) : canonical(doc) !== acknowledged;
      records.set(group, { review: doc.review, revision: meta?.revision || 0, dirty });
    } catch { /* An unreadable cache cannot authorize a false review override. */ }
  }
  return records;
}
