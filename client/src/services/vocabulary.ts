import { VocabularyWord, WordTranslation } from '../types';
import { createClientId } from '../utils/id';
import { backendService } from './backend';

const STORAGE_PREFIX = 'toeic_ai_vocabulary';
const TOPIC_OVERRIDE_PREFIX = 'toeic_vocabulary_topic_overrides';
export const VOCABULARY_CHANGED_EVENT = 'toeic:vocabulary-changed';

const storageKey = (userId: string) => `${STORAGE_PREFIX}:${userId}`;
const overrideStorageKey = (userId: string) => `${TOPIC_OVERRIDE_PREFIX}:${userId}`;

export interface VocabularyTopicOverride {
  topicId: string;
  topicName: string;
}

export interface VocabularyTopicSelection {
  id: string;
  name: string;
}

const DEFAULT_TOPIC: VocabularyTopicSelection = {
  id: 'ai',
  name: 'Từ đã tra bằng AI',
};

const readLocal = (userId: string): VocabularyWord[] => {
  try {
    return JSON.parse(localStorage.getItem(storageKey(userId)) || '[]');
  } catch {
    return [];
  }
};

const writeLocal = (userId: string, words: VocabularyWord[], notify = true) => {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(words));
  } catch {
    // Cloud sync can still succeed when browser storage is unavailable.
  }
  if (notify && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(VOCABULARY_CHANGED_EVENT));
  }
};

const readTopicOverrides = (userId: string): Record<string, VocabularyTopicOverride> => {
  try {
    return JSON.parse(localStorage.getItem(overrideStorageKey(userId)) || '{}');
  } catch {
    return {};
  }
};

const writeTopicOverrides = (
  userId: string,
  overrides: Record<string, VocabularyTopicOverride>,
  notify = true,
) => {
  try {
    localStorage.setItem(overrideStorageKey(userId), JSON.stringify(overrides));
  } catch {
    // Keep the current interaction usable and retry through the API below.
  }
  if (notify && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(VOCABULARY_CHANGED_EVENT));
  }
};

const inferDifficulty = (word: string): VocabularyWord['difficulty'] => {
  if (word.length <= 7) return 'easy';
  if (word.length <= 11) return 'medium';
  return 'hard';
};

const fromTranslation = (
  translation: WordTranslation,
  personalNote = '',
  topic: VocabularyTopicSelection = DEFAULT_TOPIC,
): VocabularyWord => ({
  id: createClientId(),
  topicId: topic.id,
  topicName: topic.name,
  word: translation.sourceText.trim(),
  phonetic: translation.phonetic,
  partOfSpeech: translation.partOfSpeech,
  meaningVi: translation.translatedText,
  definitionEn: translation.definitionEn,
  exampleEn: translation.examples[0]?.en || '',
  exampleVi: translation.examples[0]?.vi || '',
  synonyms: translation.synonyms,
  personalNote: personalNote.trim(),
  aiSource: translation.aiSource,
  difficulty: inferDifficulty(translation.sourceText.trim()),
  bookmarked: true,
  remembered: false,
  source: 'gemini',
  createdAt: new Date().toISOString(),
});

const deduplicate = (words: VocabularyWord[]) => {
  const seen = new Set<string>();
  return words.filter((word) => {
    const key = word.word.trim().toLocaleLowerCase('en');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const vocabularyService = {
  getLocal(userId: string) {
    return readLocal(userId);
  },

  async getAll(userId: string) {
    const localWords = readLocal(userId);
    const remoteWords = await backendService.getVocabularyWords(userId);
    if (!remoteWords) return localWords;

    const mapped = remoteWords.map((row: any): VocabularyWord => ({
      id: row.id,
      topicId: row.topic_id || 'ai',
      topicName: row.topic_name || 'Từ đã tra bằng AI',
      word: row.word,
      phonetic: row.phonetic || '',
      partOfSpeech: row.part_of_speech || '',
      meaningVi: row.meaning_vi,
      definitionEn: row.definition_en || '',
      exampleEn: row.example_en || '',
      exampleVi: row.example_vi || '',
      synonyms: row.synonyms || [],
      personalNote: row.personal_note || '',
      aiSource: row.ai_source === 'local' ? 'local' : 'gemini',
      difficulty: ['easy', 'medium', 'hard'].includes(row.difficulty)
        ? row.difficulty
        : inferDifficulty(row.word),
      remembered: row.remembered,
      bookmarked: true,
      source: 'gemini',
      createdAt: row.created_at,
    }));

    // Recover words that were saved locally during an earlier cloud failure.
    // Sync sequentially so schema-compatibility detection only runs once.
    const remoteKeys = new Set(mapped.map((word) => word.word.trim().toLocaleLowerCase('en')));
    for (const localWord of localWords) {
      if (!remoteKeys.has(localWord.word.trim().toLocaleLowerCase('en'))) {
        const synced = await backendService.addVocabularyWord(userId, localWord);
        if (synced) remoteKeys.add(localWord.word.trim().toLocaleLowerCase('en'));
      }
    }

    const merged = deduplicate([...localWords, ...mapped]);
    writeLocal(userId, merged, false);
    return merged;
  },

  getTopicOverrides(userId: string) {
    return readTopicOverrides(userId);
  },

  async getAllTopicOverrides(userId: string) {
    const localOverrides = readTopicOverrides(userId);
    const remoteOverrides = await backendService.getVocabularyTopicOverrides(userId);
    if (!remoteOverrides) return localOverrides;

    const merged = { ...localOverrides };
    remoteOverrides.forEach((row: any) => {
      const key = String(row.word_key || '').trim().toLocaleLowerCase('en');
      if (key && !merged[key]) {
        merged[key] = {
          topicId: row.topic_id,
          topicName: row.topic_name,
        };
      }
    });
    writeTopicOverrides(userId, merged, false);
    return merged;
  },

  async add(
    userId: string,
    translation: WordTranslation,
    personalNote = '',
    topic: VocabularyTopicSelection = DEFAULT_TOPIC,
  ) {
    const existing = readLocal(userId);
    const duplicate = existing.find(
      (item) => item.word.trim().toLocaleLowerCase('en') === translation.sourceText.trim().toLocaleLowerCase('en'),
    );
    if (duplicate) {
      const note = personalNote.trim();
      const wordToSync: VocabularyWord = {
        ...duplicate,
        ...(note ? { personalNote: note } : {}),
        topicId: topic.id,
        topicName: topic.name,
      };
      writeLocal(userId, existing.map((item) => item.id === duplicate.id ? wordToSync : item));

      // Always retry cloud sync for duplicates. A previous attempt may have
      // succeeded locally but failed while the MySQL API was unavailable.
      const cloudSynced = await backendService.addVocabularyWord(userId, wordToSync);
      const key = wordToSync.word.trim().toLocaleLowerCase('en');
      const currentOverrides = readTopicOverrides(userId);
      writeTopicOverrides(userId, {
        ...currentOverrides,
        [key]: { topicId: topic.id, topicName: topic.name },
      }, false);
      await backendService.saveVocabularyTopicOverride(userId, key, topic.id, topic.name);
      return { word: wordToSync, isDuplicate: true, cloudSynced };
    }

    const word = fromTranslation(translation, personalNote, topic);
    writeLocal(userId, [word, ...existing]);
    const cloudSynced = await backendService.addVocabularyWord(userId, word);
    if (topic.id !== DEFAULT_TOPIC.id) {
      const key = word.word.trim().toLocaleLowerCase('en');
      writeTopicOverrides(userId, {
        ...readTopicOverrides(userId),
        [key]: { topicId: topic.id, topicName: topic.name },
      }, false);
      await backendService.saveVocabularyTopicOverride(userId, key, topic.id, topic.name);
    }
    return { word, isDuplicate: false, cloudSynced };
  },

  async addMany(
    userId: string,
    translations: WordTranslation[],
    personalNote = '',
    topic: VocabularyTopicSelection = DEFAULT_TOPIC,
  ) {
    const existing = readLocal(userId);
    const existingByKey = new Map(
      existing.map((word) => [word.word.trim().toLocaleLowerCase('en'), word]),
    );
    const seenInput = new Set<string>();
    const wordsToSync: VocabularyWord[] = [];
    let added = 0;
    let duplicates = 0;

    for (const translation of translations) {
      const key = translation.sourceText.trim().toLocaleLowerCase('en');
      if (!key || seenInput.has(key)) continue;
      seenInput.add(key);

      const duplicate = existingByKey.get(key);
      if (duplicate) {
        duplicates += 1;
        const updated: VocabularyWord = {
          ...duplicate,
          phonetic: translation.phonetic || duplicate.phonetic,
          partOfSpeech: translation.partOfSpeech || duplicate.partOfSpeech,
          meaningVi: translation.translatedText || duplicate.meaningVi,
          definitionEn: translation.definitionEn || duplicate.definitionEn,
          exampleEn: translation.examples[0]?.en || duplicate.exampleEn,
          exampleVi: translation.examples[0]?.vi || duplicate.exampleVi,
          synonyms: translation.synonyms.length ? translation.synonyms : duplicate.synonyms,
          ...(personalNote.trim() ? { personalNote: personalNote.trim() } : {}),
          topicId: topic.id,
          topicName: topic.name,
        };
        existingByKey.set(key, updated);
        wordsToSync.push(updated);
      } else {
        added += 1;
        const word = fromTranslation(translation, personalNote, topic);
        existingByKey.set(key, word);
        wordsToSync.push(word);
      }
    }

    const touchedIds = new Set(wordsToSync.map((word) => word.id));
    const untouched = existing.filter((word) => !touchedIds.has(word.id));
    writeLocal(userId, [...wordsToSync.slice().reverse(), ...untouched]);

    if (topic.id !== DEFAULT_TOPIC.id) {
      const overrides = { ...readTopicOverrides(userId) };
      wordsToSync.forEach((word) => {
        overrides[word.word.trim().toLocaleLowerCase('en')] = {
          topicId: topic.id,
          topicName: topic.name,
        };
      });
      writeTopicOverrides(userId, overrides, false);
    }

    const response = await backendService.addVocabularyWords(userId, wordsToSync);
    const cloudSynced = Boolean(response?.success && response.syncedCount === wordsToSync.length);
    return {
      words: wordsToSync,
      added,
      duplicates,
      cloudSynced,
      failed: cloudSynced ? 0 : wordsToSync.length,
    };
  },

  async update(userId: string, id: string, changes: Partial<VocabularyWord>) {
    const updated = readLocal(userId).map((word) => word.id === id ? { ...word, ...changes } : word);
    writeLocal(userId, updated);
    const target = updated.find((word) => word.id === id);
    return target ? backendService.addVocabularyWord(userId, target) : false;
  },

  async saveOrUpdate(userId: string, word: VocabularyWord) {
    const current = readLocal(userId);
    const idx = current.findIndex((w) => w.id === word.id || w.word.trim().toLowerCase() === word.word.trim().toLowerCase());
    let next: VocabularyWord[];
    if (idx >= 0) {
      next = current.map((w, i) => (i === idx ? { ...w, ...word } : w));
    } else {
      next = [word, ...current];
    }
    writeLocal(userId, next);
    return backendService.addVocabularyWord(userId, word);
  },

  async remove(userId: string, id: string) {
    const remaining = readLocal(userId).filter((word) => word.id !== id);
    writeLocal(userId, remaining);
    return backendService.deleteVocabularyWord(userId, id);
  },

  async removeMany(userId: string, ids: string[]) {
    if (ids.length === 0) return true;
    await backendService.deleteVocabularyWords(userId, ids);
    const idSet = new Set(ids);
    const remaining = readLocal(userId).filter((word) => !idSet.has(word.id));
    writeLocal(userId, remaining);
    return true;
  },

  async setTopic(
    userId: string,
    word: VocabularyWord,
    topicId: string,
    topicName: string,
  ) {
    if (word.source === 'gemini') {
      const updatedWords = readLocal(userId).map((item) =>
        item.id === word.id ? { ...item, topicId, topicName } : item
      );
      writeLocal(userId, updatedWords, false);
      const updatedWord = updatedWords.find((item) => item.id === word.id);
      if (updatedWord) await backendService.addVocabularyWord(userId, updatedWord);
    }

    const wordKey = word.word.trim().toLocaleLowerCase('en');
    const overrides = {
      ...readTopicOverrides(userId),
      [wordKey]: { topicId, topicName },
    };
    writeTopicOverrides(userId, overrides);
    await backendService.saveVocabularyTopicOverride(userId, wordKey, topicId, topicName);
  },
};
