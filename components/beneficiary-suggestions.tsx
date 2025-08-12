'use client';

import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { memo } from 'react';
import type { UseChatHelpers } from '@ai-sdk/react';
import type { ChatMessage } from '@/lib/types';

interface BeneficiarySuggestionsProps {
  chatId: string;
  sendMessage: UseChatHelpers<ChatMessage>['sendMessage'];
}

function PureBeneficiarySuggestions({
  chatId,
  sendMessage,
}: BeneficiarySuggestionsProps) {
  const beneficiaryActions = [
    {
      title: 'View all services',
      label: 'individual and community',
      action: 'Show me all available services for beneficiary management',
    },
    {
      title: 'Add new beneficiary service',
      label: 'form interface',
      action: 'I want to add a new beneficiary service',
    },
    {
      title: 'Add beneficiary to voter service',
      label: 'individual voter',
      action: 'Add voter ID TEST001 to the voter registration service with notes "New voter registration assistance"',
    },
    {
      title: 'Add beneficiary to Aadhar service',
      label: 'individual voter',
      action: 'Add voter ID TEST002 to the Aadhar card service with notes "Aadhar card application assistance"',
    },
    {
      title: 'Add beneficiary to public works',
      label: 'community voters',
      action: 'Add Part 5 to the road construction service with notes "Public work affecting all voters in Part 5"',
    },
    {
      title: 'Get beneficiaries by voter',
      label: 'individual tracking',
      action: 'Show me all beneficiaries for voter ID TEST001',
    },
    {
      title: 'Get beneficiaries by service',
      label: 'service tracking',
      action: 'Show me all beneficiaries for the voter registration service',
    },
    {
      title: 'Get beneficiaries by part',
      label: 'area tracking',
      action: 'Show me all beneficiaries for Part 5',
    },
    {
      title: 'Get overall statistics',
      label: 'beneficiary dashboard',
      action: 'Show me overall beneficiary statistics and status breakdown',
    },
    {
      title: 'Update status to pending',
      label: 'service request submitted',
      action: 'Update beneficiary status to pending for the voter registration service',
    },
    {
      title: 'Update status to in progress',
      label: 'service being processed',
      action: 'Update beneficiary status to in_progress for the Aadhar card service',
    },
    {
      title: 'Update status to completed',
      label: 'service finished',
      action: 'Update beneficiary status to completed for the voter registration service with completion date today',
    },
    {
      title: 'Update status to rejected',
      label: 'service request denied',
      action: 'Update beneficiary status to rejected for the ration card service with notes "Incomplete documentation"',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-primary mb-2">Beneficiary Management</h3>
        <p className="text-sm text-muted-foreground mb-4">Manage services and beneficiaries for Anushakti Nagar constituency</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 w-full">
        {beneficiaryActions.map((action, index) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ delay: 0.05 * index }}
            key={`beneficiary-action-${action.title}-${index}`}
          >
            <Button
              variant="ghost"
              onClick={async () => {
                window.history.replaceState({}, '', `/chat/${chatId}`);

                sendMessage({
                  role: 'user',
                  parts: [{ type: 'text', text: action.action }],
                });
              }}
              className="text-left border rounded-xl px-4 py-3.5 text-sm flex-1 gap-1 sm:flex-col w-full h-auto justify-start items-start hover:bg-accent hover:border-accent-foreground/20 transition-colors duration-150"
            >
              <span className="font-medium">{action.title}</span>
              <span className="text-muted-foreground">
                {action.label}
              </span>
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export const BeneficiarySuggestions = memo(
  PureBeneficiarySuggestions,
  (prevProps, nextProps) => {
    if (prevProps.chatId !== nextProps.chatId) return false;
    return true;
  },
); 