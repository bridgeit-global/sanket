import { customProvider } from 'ai';
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

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  // Custom fetch with timeout to prevent hanging requests
  fetch: async (url, options) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  },
});

// Gemini 2.5 Flash Lite model for all use cases
const GEMINI_MODEL = 'gemini-2.5-flash-lite';

// Create Gemini model instances
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
      // Gemini doesn't use <think> tags, so both models use the same base
      // @ts-expect-error - Type compatibility between AI SDK versions
      'chat-model': geminiModel,
      // @ts-expect-error - Type compatibility between AI SDK versions
      'chat-model-reasoning': geminiModel,
      // @ts-expect-error - Type compatibility between AI SDK versions
      'title-model': geminiModel,
      // @ts-expect-error - Type compatibility between AI SDK versions
      'artifact-model': geminiModel,
    },
  });
