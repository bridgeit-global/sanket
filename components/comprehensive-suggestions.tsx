'use client';

import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { useState, useMemo, useEffect } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import type { UseChatHelpers } from '@ai-sdk/react';
import type { VisibilityType } from './visibility-selector';
import type { ChatMessage } from '@/lib/types';
import { AddBeneficiaryServiceForm } from './add-beneficiary-service-form';

interface ComprehensiveSuggestionsProps {
  sendMessage: UseChatHelpers<ChatMessage>['sendMessage'];
}

export function ComprehensiveSuggestions({
  sendMessage,
}: ComprehensiveSuggestionsProps) {
  // Use localStorage to persist tab state, ignore prop to prevent overriding
  const [activeTab, setActiveTab] = useLocalStorage<'general' | 'voter' | 'beneficiaries' | 'analytics'>('comprehensive-suggestions-tab', 'voter');
  const [showBeneficiaryForm, setShowBeneficiaryForm] = useState(false);

  // Debug localStorage updates
  console.log('ComprehensiveSuggestions - localStorage activeTab:', activeTab);
  // Add mounted state to prevent hydration mismatch
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Use 'general' as default during SSR to prevent hydration mismatch
  const displayTab = hasMounted ? activeTab : 'general';

  const generalActions = [
    {
      title: 'Search latest news',
      label: 'Anushakti Nagar current events',
      action: 'Search for the latest news and current events happening in Anushakti Nagar area',
    },
    {
      title: 'Search local events',
      label: 'activities and festivals',
      action: 'Search for local events, festivals, and community activities in Anushakti Nagar area',
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
  ];

  const beneficiaryActions = [
    {
      title: 'Add beneficiary service',
      label: 'new service request',
      action: 'show_form', // Special action to show the form
    },
    {
      title: 'Search beneficiaries',
      label: 'by name or details',
      action: 'Search for existing beneficiaries by name or other details',
    },
  ];

  const analyticsActions = [
    {
      title: 'Voter turnout analysis',
      label: 'participation trends',
      action: 'Analyze voter turnout patterns and participation trends across different parts',
    },
    {
      title: 'Age group analysis',
      label: 'generational trends',
      action: 'Analyze age group distribution and generational trends in voter demographics',
    },
  ];

  // Memoize the active actions to prevent unnecessary re-renders
  const activeActions = useMemo(() => {
    switch (displayTab) {
      case 'voter':
        return voterActions;
      case 'beneficiaries':
        return beneficiaryActions;
      case 'analytics':
        return analyticsActions;
      default:
        return generalActions;
    }
  }, [displayTab]);

  const getTabTitle = () => {
    switch (displayTab) {
      case 'voter':
        return 'Voter Analysis';
      case 'beneficiaries':
        return 'Beneficiary Management';
      case 'analytics':
        return 'Data Analytics';
      default:
        return 'General Information';
    }
  };

  const getTabDescription = () => {
    switch (displayTab) {
      case 'voter':
        return 'Analyze voter data and demographics for Anushakti Nagar constituency';
      case 'beneficiaries':
        return 'Manage services and beneficiaries for individual voters and public works';
      case 'analytics':
        return 'Comprehensive data analysis and insights for decision making';
      default:
        return 'Get general information about Anushakti Nagar area';
    }
  };

  const tabs = [
    { key: 'voter', label: 'Voter' },
    { key: 'beneficiaries', label: 'Beneficiaries' },
    { key: 'analytics', label: 'Analytics' },
    { key: 'general', label: 'General' },
  ];

  const handleActionClick = async (action: any) => {
    if (action.action === 'show_form') {
      setShowBeneficiaryForm(true);
      return;
    }

    // Update URL to reflect the current tab while preserving chat ID
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('tab', activeTab);
    window.history.replaceState({}, '', currentUrl.toString());

    sendMessage({
      role: 'user',
      parts: [{ type: 'text', text: action.action }],
    });
  };

  if (showBeneficiaryForm) {
    return (
      <AddBeneficiaryServiceForm
        onClose={() => setShowBeneficiaryForm(false)}
        sendMessage={sendMessage}
      />
    );
  }

  return (
    <div className="space-y-2 sm:space-y-3 lg:space-y-4 px-2 sm:px-0 mt-2 sm:mt-4">
      {/* Tab Navigation - Mobile Optimized */}
      <div className="flex flex-wrap gap-1 sm:gap-2 justify-center">
        {tabs.map((tab) => (
          <Button
            key={tab.key}
            variant={displayTab === tab.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              console.log('Tab clicked:', tab.key);
              setActiveTab(tab.key as any);
              // Update URL to reflect the new tab while preserving chat ID
              const currentUrl = new URL(window.location.href);
              currentUrl.searchParams.set('tab', tab.key);
              window.history.replaceState({}, '', currentUrl.toString());
              console.log('Updated localStorage and URL for tab:', tab.key);
            }}
            className="text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-1.5 h-auto min-h-[32px] sm:min-h-[28px] transition-colors duration-150"
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Section Header - Mobile Optimized */}
      <div className="text-center px-2 sm:px-0">
        <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-primary mb-1 sm:mb-2">{getTabTitle()}</h3>
        <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3 lg:mb-4 leading-relaxed max-w-2xl mx-auto">{getTabDescription()}</p>
      </div>

      {/* Actions Grid - Mobile Optimized */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 w-full max-w-lg mx-auto mb-2 sm:mb-4">
        {activeActions.map((action, index) => (
          <Button
            key={`${displayTab}-${index}`}
            variant="ghost"
            onClick={() => handleActionClick(action)}
            className="text-left border rounded-xl px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-xs sm:text-sm h-auto min-h-[60px] sm:min-h-[70px] lg:min-h-[80px] justify-start items-start hover:bg-accent hover:border-accent-foreground/20 transition-all duration-150 shadow-sm hover:shadow-md active:scale-[0.98] touch-manipulation"
          >
            <div className="flex flex-col gap-1 w-full">
              <span className="font-medium text-foreground leading-tight">{action.title}</span>
              <span className="text-muted-foreground text-xs leading-relaxed">
                {action.label}
              </span>
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
} 