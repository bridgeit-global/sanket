import { createDocumentHandler } from '@/lib/artifacts/server';

// Note: Image generation is not supported with Gemini Flash Lite
// This handler throws an error indicating the feature is unavailable
export const imageDocumentHandler = createDocumentHandler<'image'>({
  kind: 'image',
  onCreateDocument: async () => {
    throw new Error(
      'Image generation is not available. The current AI model (Gemini Flash Lite) does not support image generation.'
    );
  },
  onUpdateDocument: async () => {
    throw new Error(
      'Image generation is not available. The current AI model (Gemini Flash Lite) does not support image generation.'
    );
  },
});
