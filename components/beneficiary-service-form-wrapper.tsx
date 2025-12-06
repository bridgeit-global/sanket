'use client';

import React, { useState } from 'react';
import { AddBeneficiaryServiceForm } from './add-beneficiary-service-form';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Plus, X } from 'lucide-react';
import type { UseChatHelpers } from '@ai-sdk/react';
import type { ChatMessage } from '@/lib/types';
import { useTranslations } from '@/hooks/use-translations';

interface BeneficiaryServiceFormWrapperProps {
    chatId: string;
    sendMessage: UseChatHelpers<ChatMessage>['sendMessage'];
}

export function BeneficiaryServiceFormWrapper({ chatId, sendMessage }: BeneficiaryServiceFormWrapperProps) {
    const { t } = useTranslations();
    const [showForm, setShowForm] = useState(false);

    const handleCancel = () => {
        setShowForm(false);
    };

    if (!showForm) {
        return (
            <Card className="w-full">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <span>{t('beneficiary.title')}</span>
                        <Badge variant="outline">Quick Actions</Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="text-center">
                            <p className="text-sm text-muted-foreground mb-4">
                                {t('beneficiary.subtitle')}
                            </p>
                        </div>

                        <Button
                            onClick={() => setShowForm(true)}
                            className="w-full"
                            size="lg"
                        >
                            <Plus className="size-4 mr-2" />
                            {t('beneficiary.addNewService')}
                        </Button>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                            <div className="p-3 border rounded-lg">
                                <h4 className="font-medium text-sm">{t('beneficiary.individual')}</h4>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Voter registration, Aadhar card, ration card, etc.
                                </p>
                            </div>
                            <div className="p-3 border rounded-lg">
                                <h4 className="font-medium text-sm">{t('beneficiary.community')}</h4>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Public works, infrastructure, community development
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">{t('beneficiaryService.form.title')}</h3>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancel}
                >
                    <X className="size-4" />
                </Button>
            </div>

            <AddBeneficiaryServiceForm
                onClose={handleCancel}
                sendMessage={sendMessage}
            />
        </div>
    );
} 