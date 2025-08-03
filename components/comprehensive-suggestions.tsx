'use client';

import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { useState, useMemo, useEffect } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import type { UseChatHelpers } from '@ai-sdk/react';
import type { VisibilityType } from './visibility-selector';
import type { ChatMessage } from '@/lib/types';

interface ComprehensiveSuggestionsProps {
  sendMessage: UseChatHelpers<ChatMessage>['sendMessage'];
}

export function ComprehensiveSuggestions({
  sendMessage,
}: ComprehensiveSuggestionsProps) {
  // Use localStorage to persist tab state, ignore prop to prevent overriding
  const [activeTab, setActiveTab] = useLocalStorage<'general' | 'voter' | 'beneficiaries' | 'analytics'>('comprehensive-suggestions-tab', 'general');

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
    {
      title: 'Search transportation updates',
      label: 'metro, bus, and connectivity',
      action: 'Search for current transportation updates, metro services, and bus routes in Anushakti Nagar area',
    },
    {
      title: 'Search healthcare facilities',
      label: 'hospitals and medical services',
      action: 'Search for healthcare facilities, hospitals, and medical services available in Anushakti Nagar constituency',
    },
    {
      title: 'Search educational institutions',
      label: 'colleges and universities',
      action: 'Search for educational institutions, schools, and colleges located in Anushakti Nagar area',
    },
    {
      title: 'Search infrastructure projects',
      label: 'development & construction',
      action: 'Search for infrastructure projects and development work happening in Anushakti Nagar area',
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
      title: 'General voter query',
      label: 'above age 50 and female',
      action: 'All voters above age 50 and female',
    },
  ];

  const beneficiaryActions = [
    {
      title: 'Add service',
      label: 'for an individual',
      action: 'Add a service for an individual voter',
    },
    {
      title: 'Add service',
      label: 'for a community',
      action: 'Add a service for a community project',
    },
    {
      title: 'Update status',
      label: 'pending, in progress, completed',
      action: 'Update status to completed for the voter registration service with completion date today',
    },
    {
      title: 'Get overall statistics',
      label: 'beneficiary dashboard',
      action: 'Show me overall beneficiary statistics and status breakdown',
    },
    {
      title: 'View all services',
      label: 'individual and community',
      action: 'Show me all available services for beneficiary management',
    },

  ];

  const analyticsActions = [
    {
      title: 'Voter turnout analysis',
      label: 'election statistics',
      action: 'Analyze voter turnout patterns and statistics for Anushakti Nagar constituency',
    },
    {
      title: 'Demographic trends',
      label: 'population analysis',
      action: 'Show me demographic trends and population analysis for Anushakti Nagar area',
    },
    {
      title: 'Service utilization rates',
      label: 'beneficiary analytics',
      action: 'Analyze service utilization rates and beneficiary participation across different services',
    },
    {
      title: 'Geographic distribution',
      label: 'area-wise analysis',
      action: 'Show me geographic distribution of voters and beneficiaries across different parts of Anushakti Nagar',
    },
    {
      title: 'Age group analysis',
      label: 'generational trends',
      action: 'Analyze age group distribution and generational trends in voter demographics',
    },
    {
      title: 'Gender-based analysis',
      label: 'male/female statistics',
      action: 'Show me gender-based analysis of voter participation and service utilization',
    },
    {
      title: 'Part-wise comparison',
      label: 'area comparison',
      action: 'Compare voter demographics and beneficiary statistics across different parts of Anushakti Nagar',
    },
    {
      title: 'Service effectiveness',
      label: 'impact analysis',
      action: 'Analyze the effectiveness and impact of different beneficiary services',
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
    { key: 'general', label: 'General' },
    { key: 'voter', label: 'Voter' },
    { key: 'beneficiaries', label: 'Beneficiaries' },
    { key: 'analytics', label: 'Analytics' },
  ];

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 justify-center">
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
            className="text-xs transition-colors duration-150"
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Section Header */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-primary mb-2">{getTabTitle()}</h3>
        <p className="text-sm text-muted-foreground mb-4">{getTabDescription()}</p>
      </div>

      {/* Actions Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 w-full">
        {activeActions.map((action, index) => (
          <Button
            key={`${displayTab}-${index}`}
            variant="ghost"
            onClick={async () => {
              // Update URL to reflect the current tab while preserving chat ID
              const currentUrl = new URL(window.location.href);
              currentUrl.searchParams.set('tab', activeTab);
              window.history.replaceState({}, '', currentUrl.toString());

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
        ))}
      </div>
    </div>
  );
} 