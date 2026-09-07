import type { VocabularyWord } from '../types';
import { createClientId } from '../utils/id';

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

import {
  CURATED_STARTER_WORDS,
  STARTER_UNIT1_TOPIC_ID,
  STARTER_UNIT1_TOPIC_NAME,
} from './curatedStarterVocabulary';

export const SYSTEM_TOPICS: VocabularyTopic[] = [
  {
    id: STARTER_UNIT1_TOPIC_ID,
    name: STARTER_UNIT1_TOPIC_NAME,
    icon: 'sparkles',
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

const topicKey = (userId: string) => `${TOPICS_PREFIX}:${userId}`;
const membershipKey = (userId: string) => `${MEMBERSHIPS_PREFIX}:${userId}`;

const read = <T,>(key: string, fallback: T): T => {
  try {
    return JSON.parse(localStorage.getItem(key) || '') as T;
  } catch {
    return fallback;
  }
};

const write = (key: string, value: unknown) => localStorage.setItem(key, JSON.stringify(value));

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

  create(userId: string, input: Pick<VocabularyTopic, 'name' | 'icon' | 'description'>) {
    const topic: VocabularyTopic = {
      ...input,
      id: createClientId(),
      system: false,
      createdAt: new Date().toISOString(),
    };
    const personal = read<VocabularyTopic[]>(topicKey(userId), []);
    write(topicKey(userId), [topic, ...personal]);
    return topic;
  },

  update(userId: string, topicId: string, changes: Partial<Pick<VocabularyTopic, 'name' | 'icon' | 'description'>>) {
    const personal = read<VocabularyTopic[]>(topicKey(userId), []);
    write(topicKey(userId), personal.map((topic) => topic.id === topicId ? { ...topic, ...changes } : topic));
  },

  remove(userId: string, topicId: string) {
    const personal = read<VocabularyTopic[]>(topicKey(userId), []);
    write(topicKey(userId), personal.filter((topic) => topic.id !== topicId));
    const memberships = this.getMemberships(userId);
    delete memberships[topicId];
    write(membershipKey(userId), memberships);
  },

  setWords(userId: string, topicId: string, wordIds: string[]) {
    const memberships = this.getMemberships(userId);
    memberships[topicId] = Array.from(new Set(wordIds));
    write(membershipKey(userId), memberships);
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
    return words.filter((word) => ids.has(word.id) || word.topicId === topicId);
  },
};
