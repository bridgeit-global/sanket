'use client';

import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { memo } from 'react';
import type { UseChatHelpers } from '@ai-sdk/react';
import type { ChatMessage } from '@/lib/types';
import { useTranslations } from '@/hooks/use-translations';

interface VoterSuggestionsProps {
    chatId: string;
    sendMessage: UseChatHelpers<ChatMessage>['sendMessage'];
}

function PureVoterSuggestions({
    chatId,
    sendMessage,
}: VoterSuggestionsProps) {
    const { t } = useTranslations();
    const voterActions = [
        {
            title: 'Get constituency overview',
            label: 'demographics & statistics',
            action: 'Show me the overall voter demographics and statistics for Anushakti Nagar constituency',
        },
        {
            title: 'Find voter by EPIC',
            label: 'individual voter lookup',
            action: 'Find voter with EPIC number ANU001234 and show their details',
        },
        {
            title: 'Search voter by name',
            label: 'name-based search',
            action: 'Search for voters with the name "Rajesh" in Anushakti Nagar',
        },
        {
            title: 'Analyze voting patterns',
            label: '2024 election data',
            action: 'Show me the voting patterns and statistics for the 2024 elections in Anushakti Nagar',
        },
        {
            title: 'Get voters by age group',
            label: 'demographic analysis',
            action: 'Show me all voters aged between 25 and 35 years in the constituency',
        },
        {
            title: 'Get voters by gender',
            label: 'gender distribution',
            action: 'Show me all female voters in Anushakti Nagar constituency',
        },
        {
            title: 'Get voters by ward',
            label: 'ward-wise analysis',
            action: 'Show me all voters in Ward 15 of Anushakti Nagar',
        },
        {
            title: 'Get voters by part number',
            label: 'part-wise analysis',
            action: 'Show me all voters in Part 12 of Anushakti Nagar constituency',
        },
        {
            title: 'Get voters by booth',
            label: 'booth-wise analysis',
            action: 'Show me all voters assigned to "Municipal School No. 5" polling booth',
        },
        {
            title: 'Get non-voters analysis',
            label: 'voter engagement',
            action: 'Show me all voters who did not vote in the 2024 elections',
        },
        {
            title: 'Get voted voters analysis',
            label: 'voter participation',
            action: 'Show me all voters who voted in the 2024 elections with their details',
        },
        {
            title: 'Get booth-wise distribution',
            label: 'polling center analysis',
            action: 'Show me the distribution of voters across all polling booths in Anushakti Nagar',
        },
        {
            title: 'Get AC-wise statistics',
            label: 'assembly constituency data',
            action: 'Show me voter statistics for Assembly Constituency 170 in Anushakti Nagar',
        },
        {
            title: 'Get age and gender analysis',
            label: 'combined demographics',
            action: 'Show me male voters aged between 40 and 50 years in the constituency',
        },
        {
            title: 'Get voting rate by area',
            label: 'geographic voting patterns',
            action: 'Compare voting rates across different parts and wards of Anushakti Nagar',
        },
        {
            title: 'Get family grouping analysis',
            label: 'household patterns',
            action: 'Show me voter family groupings and household patterns in the constituency',
        },
        {
            title: 'Get religion-wise distribution',
            label: 'religious demographics',
            action: 'Show me the religious distribution of voters in Anushakti Nagar',
        },
        {
            title: 'Get mobile number analysis',
            label: 'contact information',
            action: 'Show me voters with mobile numbers for contact and outreach purposes',
        },
        {
            title: 'Get address-wise clustering',
            label: 'geographic clustering',
            action: 'Show me voters grouped by their house numbers and addresses',
        },
        {
            title: 'Get comprehensive report',
            label: 'full constituency analysis',
            action: 'Generate a comprehensive voter analysis report for Anushakti Nagar constituency including demographics, voting patterns, and geographic distribution',
        },
    ];

    return (
        <div className="space-y-4">
            <div className="text-center">
                <h3 className="text-lg font-semibold text-primary mb-2">🗳️ {t('voter.title')}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                    {t('voter.subtitle')}
                </p>
                <div className="text-xs text-muted-foreground bg-muted p-2 rounded mb-4">
                    💡 <strong>Try these sample queries:</strong> Search voters by name, analyze demographics,
                    check voting patterns, or get booth-wise distribution
                </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 w-full">
                {voterActions.map((action, index) => (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{ delay: 0.05 * index }}
                        key={`voter-action-${action.title}-${index}`}
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

            <div className="text-center mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2">🎯 Quick Analysis Examples</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-blue-700">
                    <div>• Search: &quot;Find voter Rajesh Kumar&quot;</div>
                    <div>• Demographics: &quot;Show age distribution&quot;</div>
                    <div>• Voting: &quot;2024 voting statistics&quot;</div>
                    <div>• Geographic: &quot;Voters in Ward 15&quot;</div>
                </div>
            </div>
        </div>
    );
}

export const VoterSuggestions = memo(
    PureVoterSuggestions,
    (prevProps, nextProps) => {
        if (prevProps.chatId !== nextProps.chatId) return false;
        return true;
    },
);
