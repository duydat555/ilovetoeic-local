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

export const SYSTEM_TOPICS: VocabularyTopic[] = [
  { id: 'system-office', name: 'Office & Workplace', icon: 'briefcase', description: 'Công sở, lịch họp và giao tiếp nội bộ.', system: true, createdAt: '' },
  { id: 'system-business', name: 'Business & Management', icon: 'chart', description: 'Kinh doanh, quản trị và vận hành doanh nghiệp.', system: true, createdAt: '' },
];

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
    if (topicId === 'all') return words;
    const ids = new Set(this.getWordIds(userId, topicId));
    return words.filter((word) => ids.has(word.id));
  },
};
