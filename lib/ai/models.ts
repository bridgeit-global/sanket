export const DEFAULT_CHAT_MODEL: string = 'chat-model';

export interface ChatModel {
  id: string;
  name: string;
  description: string;
}

export const chatModels: Array<ChatModel> = [
  {
    id: 'chat-model',
    name: 'Claude Sonnet 4',
    description: 'Primary model for all-purpose chat using Claude Sonnet 4',
  },
  {
    id: 'chat-model-reasoning',
    name: 'Claude Sonnet 4 (Reasoning)',
    description: 'Uses advanced reasoning with Claude Sonnet 4',
  },
];
