import {
  customProvider,
  extractReasoningMiddleware,
  generateText,
  wrapLanguageModel,
} from 'ai';
import { createGroq } from '@ai-sdk/groq';
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from './models.test';
import { isTestEnvironment } from '../constants';


const moonshot = createGroq({
  baseURL: 'https://api.moonshot.ai/v1',
  apiKey: process.env.MOONSHOT_API_KEY
});

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
      'chat-model': moonshot('kimi-k2-0711-preview'),
      'chat-model-reasoning': wrapLanguageModel({
        model: moonshot('kimi-k2-0711-preview'),
        middleware: extractReasoningMiddleware({ tagName: 'think' }),
      }),
      'title-model': moonshot('kimi-k2-0711-preview'),
      'artifact-model': moonshot('kimi-k2-0711-preview'),
    },
  });
