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
      title: 'Check BMC infrastructure',
      label: 'projects in Anushakti Nagar',
      action: 'What are the current BMC infrastructure projects and their status in Anushakti Nagar constituency?',
    },
    {
      title: 'Review MMRDA development',
      label: 'plans for our area',
      action: 'What are the current MMRDA development plans and metro projects affecting Anushakti Nagar constituency?',
    },
    {
      title: 'Address citizen complaints',
      label: 'from AGNI reports',
      action: 'What are the recent citizen complaints and issues reported through AGNI for Anushakti Nagar area?',
    },
    {
      title: 'Draft letter to BMC',
      label: 'about water supply issues',
      action: 'Help me draft a formal letter to BMC Commissioner about water supply and drainage issues in Anushakti Nagar',
    },
    {
      title: 'Prepare for assembly',
      label: 'session on civic issues',
      action: 'Help me prepare key points for the next Maharashtra Legislative Assembly session regarding civic issues in Anushakti Nagar',
    },
    {
      title: 'Generate report on',
      label: 'healthcare facilities',
      action: 'Generate a comprehensive report on healthcare facilities, hospitals, and medical services available in Anushakti Nagar constituency',
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
            className="text-left border rounded-xl px-4 py-3.5 text-sm flex-1 gap-1 sm:flex-col w-full h-auto justify-start items-start"
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
