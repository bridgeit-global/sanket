'use client';

import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { useState, useMemo } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import type { UseChatHelpers } from '@ai-sdk/react';
import type { VisibilityType } from './visibility-selector';
import type { ChatMessage } from '@/lib/types';

interface ComprehensiveSuggestionsProps {
  chatId: string;
  sendMessage: UseChatHelpers<ChatMessage>['sendMessage'];
  selectedVisibilityType: VisibilityType;
}

export function ComprehensiveSuggestions({
  chatId,
  sendMessage,
  selectedVisibilityType,
}: ComprehensiveSuggestionsProps) {
  // Use localStorage to persist tab state
  const [activeTab, setActiveTab] = useLocalStorage<'general' | 'voter' | 'beneficiary' | 'local'>('comprehensive-suggestions-tab', 'general');

  const generalActions = [
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
    },
    {
      title: 'Infrastructure projects',
      label: 'development updates',
      action: 'What infrastructure projects and development work is happening in Anushakti Nagar area?',
    },
  ];

  const voterActions = [
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
      title: 'Voter contact information',
      label: 'with mobile and email',
      action: 'Show me voters with contact information including mobile numbers and email addresses',
    },
    {
      title: 'Custom voter query',
      label: 'SQL analysis',
      action: 'Run SQL query: SELECT COUNT(*) FROM voters WHERE age > 50 AND gender = "F"',
    },
  ];

  const beneficiaryActions = [
    {
      title: 'Add voter registration service',
      label: 'individual service',
      action: 'Add a new service for voter registration assistance with description "Help voters with registration process"',
    },
    {
      title: 'Add Aadhar card service',
      label: 'individual service',
      action: 'Add a new service for Aadhar card applications with description "Assist with Aadhar card applications and updates"',
    },
    {
      title: 'Add ration card service',
      label: 'individual service',
      action: 'Add a new service for ration card applications with description "Help with ration card applications and renewals"',
    },
    {
      title: 'Add government schemes service',
      label: 'individual service',
      action: 'Add a new service for government scheme applications with description "Assist with various government scheme applications"',
    },
    {
      title: 'Add public works service',
      label: 'community service',
      action: 'Add a new service for road construction in Part 5 with description "Public work for road construction affecting all voters in Part 5"',
    },
    {
      title: 'Add fund utilization service',
      label: 'community service',
      action: 'Add a new service for fund utilization projects with description "Track fund utilization for development projects"',
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

  const localActions = [
    {
      title: 'BMC projects in Anushakti Nagar',
      label: 'municipal development',
      action: 'What BMC projects and municipal development work is happening in Anushakti Nagar area?',
    },
    {
      title: 'Water supply updates',
      label: 'infrastructure maintenance',
      action: 'What are the current water supply updates and maintenance work in Anushakti Nagar area?',
    },
    {
      title: 'Electricity and power',
      label: 'utility services',
      action: 'What are the electricity and power supply updates in Anushakti Nagar area?',
    },
    {
      title: 'Sanitation and waste',
      label: 'municipal services',
      action: 'What are the sanitation and waste management services in Anushakti Nagar area?',
    },
    {
      title: 'Road maintenance',
      label: 'infrastructure updates',
      action: 'What road maintenance and repair work is happening in Anushakti Nagar area?',
    },
    {
      title: 'Public safety',
      label: 'police and security',
      action: 'What are the public safety updates and police services in Anushakti Nagar area?',
    },
  ];

  // Memoize the active actions to prevent unnecessary re-renders
  const activeActions = useMemo(() => {
    switch (activeTab) {
      case 'voter':
        return voterActions;
      case 'beneficiary':
        return beneficiaryActions;
      case 'local':
        return localActions;
      default:
        return generalActions;
    }
  }, [activeTab]);

  const getTabTitle = () => {
    switch (activeTab) {
      case 'voter':
        return 'Voter Analysis';
      case 'beneficiary':
        return 'Beneficiary Management';
      case 'local':
        return 'Local Services';
      default:
        return 'General Information';
    }
  };

  const getTabDescription = () => {
    switch (activeTab) {
      case 'voter':
        return 'Analyze voter data and demographics for Anushakti Nagar constituency';
      case 'beneficiary':
        return 'Manage services and beneficiaries for individual voters and public works';
      case 'local':
        return 'Get information about local services and municipal updates';
      default:
        return 'Get general information about Anushakti Nagar area';
    }
  };

  const tabs = [
    { key: 'general', label: 'General' },
    { key: 'voter', label: 'Voter Data' },
    { key: 'beneficiary', label: 'Beneficiary' },
    { key: 'local', label: 'Local Services' },
  ];

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 justify-center">
        {tabs.map((tab) => (
          <Button
            key={tab.key}
            variant={activeTab === tab.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab(tab.key as any)}
            className="text-xs transition-colors duration-150"
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Section Header */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-blue-600 mb-2">{getTabTitle()}</h3>
        <p className="text-sm text-gray-600 mb-4">{getTabDescription()}</p>
      </div>
      
      {/* Actions Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 w-full">
        {activeActions.map((action, index) => (
          <Button
            key={`${activeTab}-${index}`}
            variant="ghost"
            onClick={async () => {
              window.history.replaceState({}, '', `/chat/${chatId}`);

              sendMessage({
                role: 'user',
                parts: [{ type: 'text', text: action.action }],
              });
            }}
            className="text-left border rounded-xl px-4 py-3.5 text-sm flex-1 gap-1 sm:flex-col w-full h-auto justify-start items-start hover:bg-blue-50 hover:border-blue-200 transition-colors duration-150"
          >
            <span className="font-medium">{action.title}</span>
            <span className="text-muted-foreground">
              {action.label}
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
} 