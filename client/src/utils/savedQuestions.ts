type SavedQuestions = Record<string, boolean>;
type BookmarkStorage = Pick<Storage, 'getItem' | 'setItem'>;

/** Refuse to overwrite an unreadable bookmark list with an apparently empty one. */
export function parseSavedQuestions(raw: string | null): SavedQuestions {
  const value: unknown = raw === null ? {} : JSON.parse(raw);
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.values(value).some(saved => typeof saved !== 'boolean')) throw Error('Không đọc được danh sách câu đã lưu. Bản cũ được giữ nguyên.');
  const values: SavedQuestions = Object.create(null);
  for (const [id, saved] of Object.entries(value)) if (saved === true) values[id] = true;
  return values;
}

export function toggleSavedQuestion(storage: BookmarkStorage, key: string, id: string): SavedQuestions {
  const values = parseSavedQuestions(storage.getItem(key));
  if (values[id]) delete values[id];
  else values[id] = true;
  storage.setItem(key, JSON.stringify(values));
  return values;
}
