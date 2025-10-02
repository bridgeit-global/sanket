'use client';

import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { memo } from 'react';
import type { UseChatHelpers } from '@ai-sdk/react';
import type { VisibilityType } from './visibility-selector';
import type { ChatMessage } from '@/lib/types';

interface SuggestedActionsProps {
  chatId: string;
  sendMessage: UseChatHelpers<ChatMessage>['sendMessage'];
  selectedVisibilityType: VisibilityType;
}

function PureSuggestedActions({
  chatId,
  sendMessage,
  selectedVisibilityType,
}: SuggestedActionsProps) {
  const suggestedActions = [
    {
      title: 'Voter demographics overview',
      label: 'complete constituency stats',
      action: 'Show me comprehensive voter demographics and statistics for Anushakti Nagar constituency',
    },
    {
      title: 'Search voter by name',
      label: 'find individual voters',
      action: 'Search for voters with the name "Rajesh" in Anushakti Nagar constituency',
    },
    {
      title: '2024 voting analysis',
      label: 'election participation data',
      action: 'Show me the voting patterns and statistics for the 2024 elections in Anushakti Nagar',
    },
    {
      title: 'Booth-wise distribution',
      label: 'polling center analysis',
      action: 'Show me the distribution of voters across all polling booths in Anushakti Nagar',
    },
    {
      title: 'Age & gender breakdown',
      label: 'demographic insights',
      action: 'Show me all voters aged between 25 and 35 years in the constituency',
    },
    {
      title: 'Non-voters analysis',
      label: 'engagement opportunities',
      action: 'Show me all voters who did not vote in the 2024 elections',
    }
  ];

  return (
    <div
      data-testid="suggested-actions"
      className="grid sm:grid-cols-2 gap-2 w-full"
    >
      {suggestedActions.map((suggestedAction, index) => (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.05 * index }}
          key={`suggested-action-${suggestedAction.title}-${index}`}
          className={index > 1 ? 'hidden sm:block' : 'block'}
        >
          <Button
            variant="ghost"
            onClick={async () => {
              window.history.replaceState({}, '', `/chat/${chatId}`);

              sendMessage({
                role: 'user',
                parts: [{ type: 'text', text: suggestedAction.action }],
              });
            }}
            className="text-left border rounded-xl px-4 py-3.5 text-sm flex-1 gap-1 sm:flex-col w-full h-auto justify-start items-start hover:bg-accent hover:border-accent-foreground/20 transition-colors duration-150"
          >
            <span className="font-medium">{suggestedAction.title}</span>
            <span className="text-muted-foreground">
              {suggestedAction.label}
            </span>
          </Button>
        </motion.div>
      ))}
    </div>
  );
}

export const SuggestedActions = memo(
  PureSuggestedActions,
  (prevProps, nextProps) => {
    if (prevProps.chatId !== nextProps.chatId) return false;
    if (prevProps.selectedVisibilityType !== nextProps.selectedVisibilityType)
      return false;

    return true;
  },
);
