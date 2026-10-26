import type { VocabularyWord } from '../types';
import { createClientId } from '../utils/id';
import { backendService } from './backend';

export interface VocabularyTopic {
  id: string;
  name: string;
  icon: string;
  description: string;
  system: boolean;
  createdAt: string;
}

export interface TopicMemberships {
  [topicId: string]: string[];
}

const TOPICS_PREFIX = 'toeic_vocabulary_topics';
const MEMBERSHIPS_PREFIX = 'toeic_vocabulary_topic_memberships';
const DELETED_TOPICS_PREFIX = 'toeic_vocabulary_topics_deleted';

import {
  CURATED_STARTER_WORDS,
  STARTER_UNIT1_TOPIC_ID,
  STARTER_UNIT1_TOPIC_NAME,
} from './curatedStarterVocabulary';

export const SYSTEM_TOPICS: VocabularyTopic[] = [
  {
    id: STARTER_UNIT1_TOPIC_ID,
    name: STARTER_UNIT1_TOPIC_NAME,
    icon: 'compass',
    description: '30 từ vựng cốt lõi TOEIC xuất hiện tần suất cao nhất trong đề thi thực tế.',
    system: true,
    createdAt: '',
  },
  { id: 'system-office', name: 'Office & Workplace', icon: 'briefcase', description: 'Công sở, lịch họp và giao tiếp nội bộ.', system: true, createdAt: '' },
  { id: 'system-business', name: 'Business & Management', icon: 'chart', description: 'Kinh doanh, quản trị và vận hành doanh nghiệp.', system: true, createdAt: '' },
];

export const MY_WORDS_TOPIC_ID = 'my-words';
export const MY_WORDS_TOPIC: VocabularyTopic = {
  id: MY_WORDS_TOPIC_ID,
  name: 'Sổ tay từ vựng của tôi',
  icon: 'bookmark',
  description: 'Toàn bộ từ vựng cá nhân bạn đã lưu từ tra cứu AI, làm đề thi và bài đọc.',
  system: false,
  createdAt: '',
};

const RESERVED_TOPIC_IDS = new Set([
  'ai',
  'my-words',
  'saved',
  'notebook',
  'all',
  STARTER_UNIT1_TOPIC_ID,
  'system-office',
  'system-business',
]);

const isCustomTopicId = (topicId?: string) => {
  if (!topicId) return false;
  if (RESERVED_TOPIC_IDS.has(topicId)) return false;
  if (topicId.startsWith('system-')) return false;
  return true;
};

const topicKey = (userId: string) => `${TOPICS_PREFIX}:${userId}`;
const membershipKey = (userId: string) => `${MEMBERSHIPS_PREFIX}:${userId}`;
const deletedTopicsKey = (userId: string) => `${DELETED_TOPICS_PREFIX}:${userId}`;

const read = <T,>(key: string, fallback: T): T => {
  try {
    return JSON.parse(localStorage.getItem(key) || '') as T;
  } catch {
    return fallback;
  }
};

const write = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Cloud sync can still proceed if local storage is full or disabled
  }
};

export const vocabularyTopicService = {
  getTopics(userId: string) {
    return [...SYSTEM_TOPICS, ...read<VocabularyTopic[]>(topicKey(userId), [])];
  },

  getMemberships(userId: string): TopicMemberships {
    return read<TopicMemberships>(membershipKey(userId), {});
  },

  getWordIds(userId: string, topicId: string) {
    return this.getMemberships(userId)[topicId] || [];
  },

  async syncTopics(
    userId: string,
    words: VocabularyWord[] = [],
    overrides: Record<string, { topicId: string; topicName: string }> = {},
  ): Promise<VocabularyTopic[]> {
    const localTopics = read<VocabularyTopic[]>(topicKey(userId), []);
    const localMemberships = this.getMemberships(userId);
    const deletedIds = new Set(read<string[]>(deletedTopicsKey(userId), []));

    const remoteRows = await backendService.getVocabularyTopics(userId);

    // Build unified map of personal topics
    const topicMap = new Map<string, VocabularyTopic>();
    const mergedMemberships: TopicMemberships = { ...localMemberships };

    // 1. Seed from remote topics (authoritative across devices)
    if (remoteRows) {
      for (const row of remoteRows) {
        if (!isCustomTopicId(row.id) || deletedIds.has(row.id)) continue;
        topicMap.set(row.id, {
          id: row.id,
          name: row.name || 'Chủ đề cá nhân',
          icon: row.icon || 'briefcase',
          description: row.description || '',
          system: false,
          createdAt: row.createdAt || new Date().toISOString(),
        });
        const existingLocalIds = mergedMemberships[row.id] || [];
        const remoteWordIds = Array.isArray(row.wordIds) ? row.wordIds : [];
        mergedMemberships[row.id] = Array.from(new Set([...remoteWordIds, ...existingLocalIds]));
      }
    }

    // 2. Merge local topics & push any unsynced local topics to server
    const remoteIds = new Set((remoteRows || []).map((r) => r.id));
    for (const localTopic of localTopics) {
      if (!isCustomTopicId(localTopic.id) || deletedIds.has(localTopic.id)) continue;
      if (!topicMap.has(localTopic.id)) {
        topicMap.set(localTopic.id, localTopic);
      }
      if (remoteRows !== null && !remoteIds.has(localTopic.id)) {
        void backendService.saveVocabularyTopic(userId, {
          id: localTopic.id,
          name: localTopic.name,
          icon: localTopic.icon || 'briefcase',
          description: localTopic.description || '',
          wordIds: mergedMemberships[localTopic.id] || [],
          createdAt: localTopic.createdAt,
        });
      }
    }

    // 3. Reconstruct any custom topic referenced by words or topic overrides (e.g. created on tablet before topic table existed)
    for (const word of words) {
      const override = overrides[word.word.trim().toLocaleLowerCase('en')];
      const effectiveTopicId = override?.topicId || word.topicId;
      const effectiveTopicName = override?.topicName || word.topicName;

      if (isCustomTopicId(effectiveTopicId) && !deletedIds.has(effectiveTopicId!)) {
        const tid = effectiveTopicId!;
        if (!topicMap.has(tid)) {
          const recoveredTopic: VocabularyTopic = {
            id: tid,
            name: effectiveTopicName || 'Bộ từ vựng cá nhân',
            icon: 'briefcase',
            description: '',
            system: false,
            createdAt: word.createdAt || new Date().toISOString(),
          };
          topicMap.set(tid, recoveredTopic);
          if (remoteRows !== null) {
            void backendService.saveVocabularyTopic(userId, {
              id: recoveredTopic.id,
              name: recoveredTopic.name,
              icon: recoveredTopic.icon,
              description: recoveredTopic.description,
              wordIds: [word.id],
              createdAt: recoveredTopic.createdAt,
            });
          }
        }
        const currentIds = mergedMemberships[tid] || [];
        if (!currentIds.includes(word.id)) {
          mergedMemberships[tid] = [...currentIds, word.id];
        }
      }
    }

    // 4. Process any pending deletions if online
    if (remoteRows !== null && deletedIds.size > 0) {
      for (const delId of Array.from(deletedIds)) {
        const ok = await backendService.deleteVocabularyTopic(userId, delId);
        if (ok) deletedIds.delete(delId);
      }
      write(deletedTopicsKey(userId), Array.from(deletedIds));
    }

    const finalPersonalTopics = Array.from(topicMap.values()).sort((a, b) =>
      (b.createdAt || '').localeCompare(a.createdAt || '')
    );

    write(topicKey(userId), finalPersonalTopics);
    write(membershipKey(userId), mergedMemberships);

    return [...SYSTEM_TOPICS, ...finalPersonalTopics];
  },

  create(userId: string, input: Pick<VocabularyTopic, 'name' | 'icon' | 'description'>) {
    const topic: VocabularyTopic = {
      ...input,
      id: createClientId(),
      system: false,
      createdAt: new Date().toISOString(),
    };
    const personal = read<VocabularyTopic[]>(topicKey(userId), []);
    write(topicKey(userId), [topic, ...personal]);
    void backendService.saveVocabularyTopic(userId, {
      id: topic.id,
      name: topic.name,
      icon: topic.icon,
      description: topic.description,
      wordIds: [],
      createdAt: topic.createdAt,
    });
    return topic;
  },

  update(userId: string, topicId: string, changes: Partial<Pick<VocabularyTopic, 'name' | 'icon' | 'description'>>) {
    const personal = read<VocabularyTopic[]>(topicKey(userId), []);
    const updatedList = personal.map((topic) => (topic.id === topicId ? { ...topic, ...changes } : topic));
    write(topicKey(userId), updatedList);
    const target = updatedList.find((t) => t.id === topicId);
    if (target) {
      void backendService.saveVocabularyTopic(userId, {
        id: target.id,
        name: target.name,
        icon: target.icon,
        description: target.description,
        wordIds: this.getWordIds(userId, topicId),
        createdAt: target.createdAt,
      });
    }
  },

  remove(userId: string, topicId: string) {
    const personal = read<VocabularyTopic[]>(topicKey(userId), []);
    write(topicKey(userId), personal.filter((topic) => topic.id !== topicId));
    const memberships = this.getMemberships(userId);
    delete memberships[topicId];
    write(membershipKey(userId), memberships);

    const deleted = new Set(read<string[]>(deletedTopicsKey(userId), []));
    deleted.add(topicId);
    write(deletedTopicsKey(userId), Array.from(deleted));

    void backendService.deleteVocabularyTopic(userId, topicId).then((ok) => {
      if (ok) {
        const remainingDeleted = read<string[]>(deletedTopicsKey(userId), []).filter((id) => id !== topicId);
        write(deletedTopicsKey(userId), remainingDeleted);
      }
    });
  },

  setWords(userId: string, topicId: string, wordIds: string[]) {
    const uniqueWordIds = Array.from(new Set(wordIds));
    const memberships = this.getMemberships(userId);
    memberships[topicId] = uniqueWordIds;
    write(membershipKey(userId), memberships);

    const personal = read<VocabularyTopic[]>(topicKey(userId), []);
    const target = personal.find((t) => t.id === topicId);
    if (target) {
      void backendService.saveVocabularyTopic(userId, {
        id: target.id,
        name: target.name,
        icon: target.icon,
        description: target.description,
        wordIds: uniqueWordIds,
        createdAt: target.createdAt,
      });
    }
  },

  addWords(userId: string, topicId: string, wordIds: string[]) {
    this.setWords(userId, topicId, [...this.getWordIds(userId, topicId), ...wordIds]);
  },

  merge(userId: string, sourceId: string, targetId: string) {
    this.addWords(userId, targetId, this.getWordIds(userId, sourceId));
    this.remove(userId, sourceId);
  },

  wordsForTopic(userId: string, topicId: string, words: VocabularyWord[]) {
    // Sổ tay từ vựng của tôi: trả về toàn bộ các từ học sinh đã lưu/tra cứu
    if (topicId === 'my-words' || topicId === 'saved' || topicId === 'ai' || topicId === 'notebook') {
      return words;
    }
    if (topicId === STARTER_UNIT1_TOPIC_ID) {
      const userWordMap = new Map(words.map((w) => [w.id, w]));
      return CURATED_STARTER_WORDS.map((starter) => userWordMap.get(starter.id) || starter);
    }
    if (topicId === 'all') {
      const seen = new Set<string>();
      const combined: VocabularyWord[] = [];
      for (const w of [...words, ...CURATED_STARTER_WORDS]) {
        const key = w.word.trim().toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          combined.push(w);
        }
      }
      return combined;
    }
    const ids = new Set(this.getWordIds(userId, topicId));
    const overrides = (() => {
      try {
        return JSON.parse(localStorage.getItem(`toeic_vocabulary_topic_overrides:${userId}`) || '{}') as Record<
          string,
          { topicId: string; topicName: string }
        >;
      } catch {
        return {};
      }
    })();
    return words.filter((word) => {
      const wordKey = word.word.trim().toLocaleLowerCase('en');
      const overriddenTopicId = overrides[wordKey]?.topicId;
      return ids.has(word.id) || word.topicId === topicId || overriddenTopicId === topicId;
    });
  },
};
