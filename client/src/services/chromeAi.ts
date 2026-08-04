import {
  DictionaryCollocation, DictionaryDetailResult, DictionaryDetailSection,
  DictionaryExample, DictionaryWordFamily, WordTranslation,
} from '../types';

export type ChromeAiAvailability =
  | 'available'
  | 'downloadable'
  | 'downloading'
  | 'insecure-context'
  | 'unavailable'
  | 'checking';

interface PromptSession {
  prompt(input: string, options?: {
    responseConstraint?: Record<string, unknown>;
    omitResponseConstraintInput?: boolean;
    signal?: AbortSignal;
  }): Promise<string>;
  clone?: (options?: { signal?: AbortSignal }) => Promise<PromptSession>;
  destroy?: () => void;
}

interface LanguageModelFactory {
  availability?: (...args: unknown[]) => Promise<unknown>;
  capabilities?: () => Promise<unknown>;
  create: (options?: unknown) => Promise<PromptSession>;
}

interface LanguageModelProvider {
  factory: LanguageModelFactory;
  api: 'modern' | 'legacy';
}

const SYSTEM_PROMPT = `You are a concise English-Vietnamese dictionary editor for TOEIC learners.
Return valid JSON only. Do not wrap JSON in markdown. Never add keys that were not requested.`;
const CACHE_LIMIT = 80;
const localResultCache = new Map<string, WordTranslation | DictionaryDetailResult>();
const pendingLocalResults = new Map<string, Promise<WordTranslation | DictionaryDetailResult>>();
let baseSessionPromise: Promise<PromptSession> | null = null;
let baseSessionApi: LanguageModelProvider['api'] | null = null;
let availabilityCache: { value: ChromeAiAvailability; expiresAt: number } | null = null;

const WORD_RESPONSE_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  properties: {
    sourceText: { type: 'string' },
    translatedText: { type: 'string' },
    phonetic: { type: 'string' },
    partOfSpeech: { type: 'string' },
    definitionEn: { type: 'string' },
    examples: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: { en: { type: 'string' }, vi: { type: 'string' } },
        required: ['en', 'vi'],
      },
    },
    synonyms: { type: 'array', items: { type: 'string' } },
  },
  required: [
    'sourceText', 'translatedText', 'phonetic', 'partOfSpeech',
    'definitionEn', 'examples', 'synonyms',
  ],
};

const DETAIL_RESPONSE_SCHEMAS: Record<DictionaryDetailSection, Record<string, unknown>> = {
  collocations: {
    type: 'object',
    additionalProperties: false,
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: { phrase: { type: 'string' }, meaningVi: { type: 'string' } },
          required: ['phrase', 'meaningVi'],
        },
      },
    },
    required: ['items'],
  },
  examples: {
    type: 'object',
    additionalProperties: false,
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            en: { type: 'string' },
            vi: { type: 'string' },
            level: { type: 'string' },
            context: { type: 'string' },
          },
          required: ['en', 'vi', 'level', 'context'],
        },
      },
    },
    required: ['items'],
  },
  synonyms: {
    type: 'object',
    additionalProperties: false,
    properties: { items: { type: 'array', items: { type: 'string' } } },
    required: ['items'],
  },
  wordFamily: {
    type: 'object',
    additionalProperties: false,
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            word: { type: 'string' },
            partOfSpeech: { type: 'string' },
            phonetic: { type: 'string' },
          },
          required: ['word', 'partOfSpeech', 'phonetic'],
        },
      },
    },
    required: ['items'],
  },
};
const getProvider = (): LanguageModelProvider | null => {
  const scope = globalThis as typeof globalThis & {
    LanguageModel?: LanguageModelFactory;
    ai?: { languageModel?: LanguageModelFactory };
  };
  if (scope.LanguageModel) return { factory: scope.LanguageModel, api: 'modern' };
  if (scope.ai?.languageModel) return { factory: scope.ai.languageModel, api: 'legacy' };
  return null;
};

const createSession = (provider: LanguageModelProvider) => (
  provider.api === 'modern'
    ? provider.factory.create({
      initialPrompts: [{ role: 'system', content: SYSTEM_PROMPT }],
    })
    : provider.factory.create({ systemPrompt: SYSTEM_PROMPT })
);

const getBaseSession = (provider: LanguageModelProvider) => {
  if (!baseSessionPromise || baseSessionApi !== provider.api) {
    baseSessionApi = provider.api;
    baseSessionPromise = createSession(provider).catch((error) => {
      baseSessionPromise = null;
      baseSessionApi = null;
      throw error;
    });
  }
  return baseSessionPromise;
};

const resetBaseSession = async () => {
  const sessionPromise = baseSessionPromise;
  baseSessionPromise = null;
  baseSessionApi = null;
  if (!sessionPromise) return;
  try {
    (await sessionPromise).destroy?.();
  } catch {
    // The failed session may already have been released by Chrome.
  }
};

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => {
    void resetBaseSession();
  }, { once: true });
}

const getCacheKey = (
  kind: 'word' | DictionaryDetailSection,
  word: string,
  context: string,
) => `${kind}:${word.trim().toLocaleLowerCase('en')}:${context.replace(/\s+/g, ' ').trim().slice(0, 180)}`;

const rememberLocalResult = (
  key: string,
  value: WordTranslation | DictionaryDetailResult,
) => {
  if (localResultCache.size >= CACHE_LIMIT) {
    const oldestKey = localResultCache.keys().next().value;
    if (oldestKey) localResultCache.delete(oldestKey);
  }
  localResultCache.set(key, value);
};

const normalizeAvailability = (value: unknown): ChromeAiAvailability => {
  if (value === true) return 'available';
  if (value === false || value == null) return 'unavailable';
  const raw = typeof value === 'string'
    ? value
    : typeof value === 'object' && value && 'available' in value
      ? String((value as { available: unknown }).available)
      : '';
  const status = raw.toLocaleLowerCase('en');
  if (['available', 'readily', 'yes'].includes(status)) return 'available';
  if (['downloadable', 'after-download', 'after_download'].includes(status)) return 'downloadable';
  if (['downloading', 'currently-downloading'].includes(status)) return 'downloading';
  return 'unavailable';
};

const parseJson = (raw: string): Record<string, unknown> => {
  const cleaned = raw.trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '');
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1) throw new Error('AI Local trả về dữ liệu không hợp lệ.');
  return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1)) as Record<string, unknown>;
};

const isAbortError = (error: unknown) => (
  error instanceof DOMException && error.name === 'AbortError'
);

const isUnsupportedConstraintError = (error: unknown) => (
  error instanceof DOMException
    ? error.name === 'NotSupportedError'
    : error instanceof TypeError
);

const promptLocal = async (
  prompt: string,
  responseConstraint: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<Record<string, unknown>> => {
  const provider = getProvider();
  if (!provider) throw new Error('Chrome AI không được hỗ trợ trên trình duyệt này.');

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (signal?.aborted) throw new DOMException('Yêu cầu đã bị hủy.', 'AbortError');
    let session: PromptSession | null = null;
    let destroyAfterPrompt = false;

    try {
      const baseSession = await getBaseSession(provider);
      session = baseSession.clone
        ? await baseSession.clone({ signal })
        : baseSession;
      destroyAfterPrompt = session !== baseSession;

      let raw: string;
      if (provider.api === 'modern') {
        try {
          raw = await session.prompt(prompt, {
            responseConstraint,
            omitResponseConstraintInput: true,
            signal,
          });
        } catch (error) {
          if (!isUnsupportedConstraintError(error)) throw error;
          raw = await session.prompt(prompt, { signal });
        }
      } else {
        raw = await session.prompt(prompt);
      }
      return parseJson(raw);
    } catch (error) {
      if (isAbortError(error) || signal?.aborted) throw error;
      lastError = error;
      await resetBaseSession();
    } finally {
      if (destroyAfterPrompt) session?.destroy?.();
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('AI Local không thể hoàn tất yêu cầu.');
};

const asString = (value: unknown) => typeof value === 'string' ? value : '';
const asArray = (value: unknown) => Array.isArray(value) ? value : [];

export const chromeAiService = {
  async getAvailability(forceRefresh = false): Promise<ChromeAiAvailability> {
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      return 'insecure-context';
    }

    if (!forceRefresh && availabilityCache && availabilityCache.expiresAt > Date.now()) {
      return availabilityCache.value;
    }

    const provider = getProvider();
    if (!provider) return 'unavailable';
    const { factory } = provider;
    try {
      let availability: ChromeAiAvailability;
      if (factory.availability) {
        // Do not declare Vietnamese in expectedOutputs here. Chrome currently
        // rejects unsupported language tags before checking the downloaded model,
        // which previously made a ready Gemini Nano appear unavailable.
        availability = normalizeAvailability(await factory.availability());
      } else if (factory.capabilities) {
        availability = normalizeAvailability(await factory.capabilities());
      } else {
        availability = 'available';
      }

      availabilityCache = {
        value: availability,
        expiresAt: Date.now() + (availability === 'available' ? 60_000 : 8_000),
      };
      return availability;
    } catch {
      return 'unavailable';
    }
  },

  async prewarm(): Promise<boolean> {
    if (await this.getAvailability() !== 'available') return false;
    const provider = getProvider();
    if (!provider) return false;
    try {
      await getBaseSession(provider);
      return true;
    } catch {
      return false;
    }
  },

  async translateWord(word: string, context = '', signal?: AbortSignal): Promise<WordTranslation> {
    const cacheKey = getCacheKey('word', word, context);
    const cached = localResultCache.get(cacheKey) as WordTranslation | undefined;
    if (cached) return cached;
    const pending = pendingLocalResults.get(cacheKey) as Promise<WordTranslation> | undefined;
    if (pending) return pending;

    const request = (async () => {
      const data = await promptLocal(`Analyze "${word}" for a TOEIC learner.
Relevant context: ${context.replace(/\s+/g, ' ').trim().slice(0, 240) || 'none'}

Return exactly:
{
  "sourceText": "${word}",
  "translatedText": "concise Vietnamese meaning",
  "phonetic": "/IPA/",
  "partOfSpeech": "English part of speech",
  "definitionEn": "short learner-friendly English definition",
  "examples": [{"en": "one natural sentence", "vi": "Vietnamese translation"}],
  "synonyms": ["up to four common near-synonyms"]
}`, WORD_RESPONSE_SCHEMA, signal);
      const result: WordTranslation = {
        sourceText: asString(data.sourceText) || word,
        translatedText: asString(data.translatedText),
        phonetic: asString(data.phonetic),
        partOfSpeech: asString(data.partOfSpeech),
        definitionEn: asString(data.definitionEn),
        examples: asArray(data.examples).map((item) => {
          const value = item as Record<string, unknown>;
          return { en: asString(value.en), vi: asString(value.vi) };
        }).filter((item) => item.en),
        synonyms: asArray(data.synonyms).map(asString).filter(Boolean),
        aiSource: 'local',
      };
      rememberLocalResult(cacheKey, result);
      return result;
    })();

    pendingLocalResults.set(cacheKey, request);
    try {
      return await request;
    } finally {
      pendingLocalResults.delete(cacheKey);
    }
  },

  async getDetail(
    word: string,
    section: DictionaryDetailSection,
    context = '',
    signal?: AbortSignal,
  ): Promise<DictionaryDetailResult> {
    const cacheKey = getCacheKey(section, word, context);
    const cached = localResultCache.get(cacheKey) as DictionaryDetailResult | undefined;
    if (cached) return cached;
    const pending = pendingLocalResults.get(cacheKey) as Promise<DictionaryDetailResult> | undefined;
    if (pending) return pending;

    const prompts: Record<DictionaryDetailSection, string> = {
      collocations: `For "${word}", return 2-4 common collocations useful in TOEIC.
Context: ${context.replace(/\s+/g, ' ').trim().slice(0, 180)}
JSON shape: {"items":[{"phrase":"English collocation","meaningVi":"short Vietnamese meaning"}]}`,
      examples: `Write 3 new examples for "${word}" that do not copy the source context.
Increase difficulty from everyday office English to TOEIC email, notice, or conversation.
Context to avoid copying: ${context.replace(/\s+/g, ' ').trim().slice(0, 180)}
JSON shape: {"items":[{"en":"English sentence","vi":"Vietnamese translation","level":"Cơ bản|Trung cấp|TOEIC","context":"Office|Email|Notice|Conversation"}]}`,
      synonyms: `Return 3-5 common English synonyms or near-synonyms for "${word}".
Use only words or short phrases that a learner can look up recursively.
JSON shape: {"items":["synonym"]}`,
      wordFamily: `Return the useful word family for "${word}", including related noun, verb, adjective, or adverb forms when they exist.
JSON shape: {"items":[{"word":"related form","partOfSpeech":"n/v/adj/adv","phonetic":"/short IPA/"}]}`,
    };
    const request = (async () => {
      const data = await promptLocal(prompts[section], DETAIL_RESPONSE_SCHEMAS[section], signal);
      const rawItems = asArray(data.items);
      let items: DictionaryDetailResult['items'];

      if (section === 'collocations') {
        items = rawItems.map((item): DictionaryCollocation => {
          const value = item as Record<string, unknown>;
          return { phrase: asString(value.phrase), meaningVi: asString(value.meaningVi) };
        }).filter((item) => item.phrase).slice(0, 4);
      } else if (section === 'examples') {
        items = rawItems.map((item): DictionaryExample => {
          const value = item as Record<string, unknown>;
          return {
            en: asString(value.en),
            vi: asString(value.vi),
            level: asString(value.level),
            context: asString(value.context),
          };
        }).filter((item) => item.en).slice(0, 3);
      } else if (section === 'wordFamily') {
        items = rawItems.map((item): DictionaryWordFamily => {
          const value = item as Record<string, unknown>;
          return {
            word: asString(value.word),
            partOfSpeech: asString(value.partOfSpeech),
            phonetic: asString(value.phonetic),
          };
        }).filter((item) => item.word).slice(0, 6);
      } else {
        items = rawItems.map(asString).filter(Boolean).slice(0, 5);
      }

      const result: DictionaryDetailResult = { section, items, aiSource: 'local' };
      rememberLocalResult(cacheKey, result);
      return result;
    })();

    pendingLocalResults.set(cacheKey, request);
    try {
      return await request;
    } finally {
      pendingLocalResults.delete(cacheKey);
    }
  },
};
