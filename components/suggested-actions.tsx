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
      title: 'Show voter demographics',
      label: 'for Anushakti Nagar',
      action: 'Show me comprehensive voter demographics for Anushakti Nagar constituency including gender distribution and age statistics',
    },
    {
      title: 'Search voters by last name',
      label: 'like "Kumar" or "Sharma"',
      action: 'Search for voters with last name Kumar in Anushakti Nagar constituency',
    },
    {
      title: 'Age groups with gender',
      label: 'male/female breakdown',
      action: 'Show me age group distribution with male and female bifurcation for Anushakti Nagar constituency',
    },
    {
      title: 'Analyze voters by parts',
      label: 'and polling stations',
      action: 'Show me voter analysis by parts/areas in Anushakti Nagar constituency',
    },
    {
      title: 'Show available services',
      label: 'beneficiary management',
      action: 'Show me all available services for beneficiary management in Anushakti Nagar constituency',
    },
    {
      title: 'Add new service',
      label: 'voter registration or public works',
      action: 'Add a new service for voter registration assistance in Anushakti Nagar constituency',
    },
    {
      title: 'Add beneficiary',
      label: 'to existing service',
      action: 'Add a beneficiary to the voter registration service for voter ID TEST001',
    },
    {
      title: 'Get beneficiary info',
      label: 'by voter or service',
      action: 'Show me beneficiary information for voter ID TEST001',
    },
    {
      title: 'Update beneficiary status',
      label: 'mark as completed',
      action: 'Update beneficiary status to completed for the voter registration service',
    },
    {
      title: 'Latest news in Anushakti Nagar',
      label: 'current events and updates',
      action: 'What are the latest news and current events happening in Anushakti Nagar area?',
    },
    {
      title: 'Local events and activities',
      label: 'community happenings',
      action: 'What local events, festivals, or community activities are happening in Anushakti Nagar area?',
    },
    {
      title: 'Transportation updates',
      label: 'metro and bus services',
      action: 'What are the current transportation updates, metro services, and bus routes in Anushakti Nagar area?',
    },
    {
      title: 'Healthcare facilities',
      label: 'hospitals and clinics',
      action: 'What healthcare facilities, hospitals, and medical services are available in Anushakti Nagar constituency?',
    },
    {
      title: 'Educational institutions',
      label: 'schools and colleges',
      action: 'What educational institutions, schools, and colleges are located in Anushakti Nagar area?',
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
