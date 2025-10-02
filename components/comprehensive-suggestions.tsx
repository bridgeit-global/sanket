'use client';

import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { useState } from 'react';
import type { UseChatHelpers } from '@ai-sdk/react';
import type { ChatMessage } from '@/lib/types';

interface ComprehensiveSuggestionsProps {
  sendMessage: UseChatHelpers<ChatMessage>['sendMessage'];
}

export function ComprehensiveSuggestions({
  sendMessage,
}: ComprehensiveSuggestionsProps) {
  const [showSuggestions, setShowSuggestions] = useState(true);

  const generalActions = [
    {
      title: 'Search latest news',
      label: 'Current events and news',
      action: 'Search for the latest news and current events',
    },
    {
      title: 'Research topic',
      label: 'In-depth analysis',
      action: 'Help me research and analyze a specific topic in detail',
    },
    {
      title: 'Create document',
      label: 'Report or content',
      action: 'Help me create a comprehensive document or report',
    },
    {
      title: 'Data analysis',
      label: 'Insights and trends',
      action: 'Help me analyze data and identify trends and patterns',
    },
  ];

  const handleAction = (action: string) => {
    sendMessage({
      role: 'user',
      parts: [{ type: 'text', text: action }],
    });
  };

  if (!showSuggestions) {
    return (
      <div className="flex justify-center mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSuggestions(true)}
          className="text-xs"
        >
          Show Suggestions
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2 sm:space-y-3 lg:space-y-4 px-2 sm:px-0 mt-2 sm:mt-4">
      {/* Section Header */}
      <div className="text-center px-2 sm:px-0">
        <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-primary mb-1 sm:mb-2">
          General Analysis Assistant
        </h3>
        <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3 lg:mb-4 leading-relaxed max-w-2xl mx-auto">
          I can help you with research, analysis, document creation, and data insights. Choose an action below to get started.
        </p>
      </div>

      {/* Actions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 w-full max-w-lg mx-auto mb-2 sm:mb-4">
        {generalActions.map((action, index) => (
          <motion.div
            key={action.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Button
              variant="outline"
              className="w-full h-auto p-3 sm:p-4 text-left flex flex-col items-start gap-1 sm:gap-2 hover:bg-muted/50 transition-colors duration-200"
              onClick={() => handleAction(action.action)}
            >
              <span className="font-medium text-sm sm:text-base">
                {action.title}
              </span>
              <span className="text-xs sm:text-sm text-muted-foreground">
                {action.label}
              </span>
            </Button>
          </motion.div>
        ))}
      </div>

      {/* Hide Suggestions Button */}
      <div className="flex justify-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSuggestions(false)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Hide Suggestions
        </Button>
      </div>
    </div>
  );
}