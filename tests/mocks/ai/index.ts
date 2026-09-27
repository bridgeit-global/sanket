// Reuse the repository's existing MockLanguageModelV2 fixtures. The source
// file is a test helper despite its historical `.test.ts` suffix.
export {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from '@/lib/ai/models.test';
