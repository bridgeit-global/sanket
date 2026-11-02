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
    description: 'GLM 5.3 Flash for constituency analytics and chat',
  },
  {
    id: 'chat-model-reasoning',
    name: 'Reasoning',
    description: 'GLM 5.3 Flash with reasoning stream enabled',
  },
];
