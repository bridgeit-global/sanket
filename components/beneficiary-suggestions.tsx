'use client';

import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { memo } from 'react';
import type { UseChatHelpers } from '@ai-sdk/react';
import type { ChatMessage } from '@/lib/types';
import { useTranslations } from '@/hooks/use-translations';

interface BeneficiarySuggestionsProps {
  chatId: string;
  sendMessage: UseChatHelpers<ChatMessage>['sendMessage'];
}

function PureBeneficiarySuggestions({
  chatId,
  sendMessage,
}: BeneficiarySuggestionsProps) {
  const { t } = useTranslations();

  const beneficiaryActions = [
    {
      title: t('beneficiary.viewAllServices'),
      label: `${t('beneficiary.individual')} and ${t('beneficiary.community')}`,
      action: 'Show me all available services for beneficiary management',
    },
    {
      title: t('beneficiary.addNewService'),
      label: 'form interface',
      action: 'I want to add a new beneficiary service',
    },
    {
      title: t('beneficiary.addBeneficiaryToService', { service: 'voter service' }),
      label: t('beneficiary.individual') + ' voter',
      action: 'Add voter ID TEST001 to the voter registration service with notes "New voter registration assistance"',
    },
    {
      title: t('beneficiary.addBeneficiaryToService', { service: 'Aadhar service' }),
      label: t('beneficiary.individual') + ' voter',
      action: 'Add voter ID TEST002 to the Aadhar card service with notes "Aadhar card application assistance"',
    },
    {
      title: t('beneficiary.addBeneficiaryToService', { service: 'public works' }),
      label: t('beneficiary.community') + ' voters',
      action: 'Add Part 5 to the road construction service with notes "Public work affecting all voters in Part 5"',
    },
    {
      title: t('beneficiary.getBeneficiariesByVoter'),
      label: 'individual tracking',
      action: 'Show me all beneficiaries for voter ID TEST001',
    },
    {
      title: t('beneficiary.getBeneficiariesByService'),
      label: 'service tracking',
      action: 'Show me all beneficiaries for the voter registration service',
    },
    {
      title: t('beneficiary.getBeneficiariesByPart'),
      label: 'area tracking',
      action: 'Show me all beneficiaries for Part 5',
    },
    {
      title: t('beneficiary.getOverallStatistics'),
      label: 'beneficiary dashboard',
      action: 'Show me overall beneficiary statistics and status breakdown',
    },
    {
      title: t('beneficiary.updateStatus', { status: t('beneficiary.status.pending') }),
      label: 'service request submitted',
      action: 'Update beneficiary status to pending for the voter registration service',
    },
    {
      title: t('beneficiary.updateStatus', { status: t('beneficiary.status.inProgress') }),
      label: 'service being processed',
      action: 'Update beneficiary status to in_progress for the Aadhar card service',
    },
    {
      title: t('beneficiary.updateStatus', { status: t('beneficiary.status.completed') }),
      label: 'service finished',
      action: 'Update beneficiary status to completed for the voter registration service with completion date today',
    },
    {
      title: t('beneficiary.updateStatus', { status: t('beneficiary.status.rejected') }),
      label: 'service request denied',
      action: 'Update beneficiary status to rejected for the ration card service with notes "Incomplete documentation"',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-primary mb-2">{t('beneficiary.title')}</h3>
        <p className="text-sm text-muted-foreground mb-4">{t('beneficiary.subtitle')}</p>
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