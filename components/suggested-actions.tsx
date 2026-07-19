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
      title: 'Form 20 winner & turnout',
      label: '2024 candidate votes',
      action:
        'Show Form 20 2024 winner, margin, and turnout summary for Anushakti Nagar AC 172',
    },
    {
      title: 'Votes in ward 140',
      label: 'Form 20 by ward',
      action: 'How many Form 20 votes were cast in ward 140 in the 2024 assembly election?',
    },
    {
      title: 'Votes in part 1',
      label: 'Form 20 by booth/part',
      action: 'Show Form 20 2024 candidate vote counts for part 1',
    },
    {
      title: 'Demographics by religion',
      label: 'voter roll analysis',
      action: 'Show voter demographics broken down by religion for Anushakti Nagar',
    },
    {
      title: 'Who did not vote',
      label: '2024 turnout (has_voted)',
      action:
        'Show how many voters did not vote (has_voted = false) in the 2024 elections for Anushakti Nagar',
    },
    {
      title: 'Search voter by name',
      label: 'find on the voter roll',
      action: 'Search for voters with the name "Rajesh" in Anushakti Nagar constituency',
    },
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
