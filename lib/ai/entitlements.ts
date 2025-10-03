import type { UserRole } from '@/app/(auth)/auth';
import type { ChatModel } from './models';

interface Entitlements {
  maxMessagesPerDay: number;
  availableChatModelIds: Array<ChatModel['id']>;
}

export const entitlementsByUserRole: Record<UserRole, Entitlements> = {
  /*
   * For regular users with an account
   */
  regular: {
    maxMessagesPerDay: 100,
    availableChatModelIds: ['chat-model', 'chat-model-reasoning'],
  },

  /*
   * For admin users - full access
   */
  admin: {
    maxMessagesPerDay: 1000,
    availableChatModelIds: ['chat-model', 'chat-model-reasoning'],
  },

  /*
   * For operator users - limited access
   */
  operator: {
    maxMessagesPerDay: 50,
    availableChatModelIds: ['chat-model'],
  },
};
