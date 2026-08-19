import { backendService, PracticeSessionData } from '../services/backend';
import { readLocalWrongQuestions } from './localWrongQuestions';

const MIGRATION_FLAG = 'toeic_legacy_data_migrated_v2';

/**
 * Automatically migrate and restore any historical data saved in the user's
 * browser localStorage (wrong questions, practice progress, vocabulary) to MySQL.
 */
export const migrateLegacyLocalStorageToDatabase = async (userId: string): Promise<void> => {
  if (!userId) return;

  const isMigrated = localStorage.getItem(`${MIGRATION_FLAG}:${userId}`);
  if (isMigrated === 'true') return;

  try {
    // 1. Migrate legacy local wrong questions
    const legacyWrongQuestions = readLocalWrongQuestions(userId);
    if (legacyWrongQuestions.length > 0) {
      const synced = await backendService.syncLegacyWrongQuestions(legacyWrongQuestions);
      if (synced) {
        window.dispatchEvent(new CustomEvent('wrong-questions-updated'));
      }
    }

    // 2. Migrate legacy local practice sessions
    const practiceKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('toeic-practice:')) {
        practiceKeys.push(key);
      }
    }

    for (const key of practiceKeys) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          // Parse source and scope from key: toeic-practice:{source}:{scope}
          const parts = key.split(':');
          const source = parts[1] || 'test';
          const scope = parts[2] || 'all';

          const sessionPayload: PracticeSessionData = {
            sessionKey: key,
            attemptId: parsed.attemptId || 'legacy-attempt',
            sourceType: source.startsWith('level') ? 'level' : 'test',
            testId: !source.startsWith('level') && !source.startsWith('wrong-level') ? source : undefined,
            level: source.startsWith('level-') ? Number(source.replace('level-', '')) : undefined,
            partScope: scope,
            currentGroupIndex: Number(parsed.currentGroupIndex) || 0,
            secondsSpent: Number(parsed.secondsSpent) || 0,
            answers: parsed.answers || {},
            checkedGroupIds: parsed.checkedGroupIds || [],
            notes: parsed.notes || {},
            annotations: parsed.annotations || {},
          };

          await backendService.savePracticeSession(sessionPayload);
        }
      } catch (err) {
        console.warn(`[!] Error migrating legacy practice session ${key}:`, err);
      }
    }

    // 3. Migrate legacy local vocabulary
    const vocabKey = `toeic_vocabulary_${userId}`;
    const rawVocab = localStorage.getItem(vocabKey);
    if (rawVocab) {
      try {
        const words = JSON.parse(rawVocab);
        if (Array.isArray(words) && words.length > 0) {
          for (const word of words) {
            if (word && word.id && word.word) {
              await backendService.addVocabularyWord(userId, word);
            }
          }
        }
      } catch (err) {
        console.warn('[!] Error migrating legacy vocabulary:', err);
      }
    }

    // 4. Migrate legacy vocabulary topic overrides
    const overridesKey = `toeic_vocabulary_topic_overrides_${userId}`;
    const rawOverrides = localStorage.getItem(overridesKey);
    if (rawOverrides) {
      try {
        const overrides = JSON.parse(rawOverrides);
        if (overrides && typeof overrides === 'object') {
          for (const [wordKey, overrideData] of Object.entries(overrides)) {
            const data = overrideData as { topicId?: string; topicName?: string };
            if (data?.topicId && data?.topicName) {
              await backendService.saveVocabularyTopicOverride(
                userId,
                wordKey,
                data.topicId,
                data.topicName,
              );
            }
          }
        }
      } catch (err) {
        console.warn('[!] Error migrating legacy vocabulary topic overrides:', err);
      }
    }

    // Mark migration complete for this user
    localStorage.setItem(`${MIGRATION_FLAG}:${userId}`, 'true');
    console.info('[✓] Đã tự động khôi phục và đồng bộ toàn bộ dữ liệu localStorage lên MySQL thành công.');
  } catch (error) {
    console.warn('[!] Không thể tự động chuyển dữ liệu localStorage lên MySQL:', error);
  }
};
