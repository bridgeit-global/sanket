import type { ChatModel } from './models';

// Role names that map to entitlements
export type RoleName = 'admin' | 'operator' | 'back-office' | 'regular';

interface Entitlements {
  maxMessagesPerDay: number;
  availableChatModelIds: Array<ChatModel['id']>;
}

export const entitlementsByUserRole: Record<RoleName, Entitlements> = {
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

  /*
   * For back-office users - same as operator
   */
  'back-office': {
    maxMessagesPerDay: 50,
    availableChatModelIds: ['chat-model'],
  },
};
