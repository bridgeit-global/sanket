export const DEFAULT_CHAT_MODEL: string = 'chat-model';

export interface ChatModel {
  id: string;
  name: string;
  description: string;
}

export const chatModels: Array<ChatModel> = [
  {
    id: 'chat-model',
    name: 'Agent',
    description: 'Claude Sonnet 5 for constituency analytics and chat',
  },
  {
    id: 'chat-model-reasoning',
    name: 'Reasoning',
    description: 'Claude Sonnet 5 with reasoning stream enabled',
  },
];
