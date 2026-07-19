import { customProvider } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from './models.test';
import { isTestEnvironment } from '../constants';

// 5 minute timeout for API calls
const API_TIMEOUT_MS = 5 * 60 * 1000;

const fetchWithTimeout: typeof fetch = async (url, options) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
};

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  fetch: fetchWithTimeout,
});

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  fetch: fetchWithTimeout,
});

/** Primary chat / analytics model */
const CHAT_MODEL = 'claude-sonnet-5';
/** Lightweight models for titles and artifacts */
const GEMINI_MODEL = 'gemini-3.5-flash';

const claudeChatModel = anthropic(CHAT_MODEL);
const geminiModel = google(GEMINI_MODEL);

export const myProvider = isTestEnvironment
  ? customProvider({
      languageModels: {
        'chat-model': chatModel,
        'chat-model-reasoning': reasoningModel,
        'title-model': titleModel,
        'artifact-model': artifactModel,
      },
    })
  : customProvider({
      languageModels: {
        'chat-model': claudeChatModel,
        'chat-model-reasoning': claudeChatModel,
        // @ts-expect-error - Type compatibility between AI SDK versions
        'title-model': geminiModel,
        // @ts-expect-error - Type compatibility between AI SDK versions
        'artifact-model': geminiModel,
      },
    });
