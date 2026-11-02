import { customProvider } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
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

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const OPENROUTER_SESSION_HEADER = 'x-session-id';

/** Pin a conversation to one OpenRouter cache. GLM reuses cached input for that session. */
export function openRouterSessionHeaders(
  sessionId: string,
): Record<string, string> {
  return { [OPENROUTER_SESSION_HEADER]: sessionId.slice(0, 256) };
}

/**
 * Copy the session header into the JSON body as `session_id`. OpenRouter uses
 * that field as the sticky cache key, so later turns in the same chat hit the
 * cached prefix instead of a new provider cache.
 */
const fetchViaOpenRouter: typeof fetch = async (url, options) => {
  const headers = new Headers(options?.headers);
  const sessionId = headers.get(OPENROUTER_SESSION_HEADER);
  let body = options?.body;
  if (sessionId && typeof body === 'string') {
    try {
      const json = JSON.parse(body) as Record<string, unknown>;
      if (json && typeof json === 'object' && !Array.isArray(json)) {
        json.session_id = sessionId;
        body = JSON.stringify(json);
        headers.delete('content-length');
      }
    } catch {
      // Leave non-JSON bodies unchanged.
    }
  }
  return fetchWithTimeout(url, {
    ...options,
    headers,
    body,
  });
};

const openrouter = createOpenAI({
  baseURL: OPENROUTER_BASE_URL,
  apiKey: process.env.OPENROUTER_API_KEY,
  name: 'openrouter',
  fetch: fetchViaOpenRouter,
});

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  fetch: fetchWithTimeout,
});

/** Primary chat / analytics model, served by OpenRouter. */
const CHAT_MODEL = 'z-ai/glm-5.3-flash';
/** Lightweight models for titles and artifacts */
const GEMINI_MODEL = 'gemini-3.5-flash';

// `.chat()` uses OpenRouter's OpenAI-compatible chat completions API.
const glmChatModel = openrouter.chat(CHAT_MODEL);
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
        'chat-model': glmChatModel,
        'chat-model-reasoning': glmChatModel,
        // @ts-expect-error - Type compatibility between AI SDK versions
        'title-model': geminiModel,
        // @ts-expect-error - Type compatibility between AI SDK versions
        'artifact-model': geminiModel,
      },
    });
