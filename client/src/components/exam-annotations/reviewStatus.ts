export const REVIEW_BATCH_SIZE = 200;
export interface ReviewStatus { group: string; review: boolean; revision: number }

/** Match the bounded API contract even when a Level contains thousands of groups. */
export async function loadReviewStatus(groups: string[], read: (batch: string[]) => Promise<{ groups: ReviewStatus[] }>): Promise<ReviewStatus[]> {
  const unique = [...new Set(groups)];
  const records: ReviewStatus[] = [];
  for (let offset = 0; offset < unique.length; offset += REVIEW_BATCH_SIZE) {
    const batch = unique.slice(offset, offset + REVIEW_BATCH_SIZE);
    // Sequential reads cap connection use; a failed batch never looks like an empty successful result.
    const result = await read(batch);
    const expected = new Set(batch);
    for (const record of result.groups) {
      if (!expected.delete(record.group) || typeof record.review !== 'boolean' || !Number.isSafeInteger(record.revision) || record.revision < 0) {
        throw Error('Danh sách dấu xem lại trả về không hợp lệ.');
      }
      records.push(record);
    }
    if (expected.size) throw Error('Chưa tải đủ danh sách dấu xem lại.');
  }
  return records;
}
