'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations } from '@/hooks/use-translations';
import type { Voter } from '@/lib/db/schema';

export interface MobileNumberEntry {
    mobileNumber: string;
    sortOrder: number;
}

interface PhoneUpdateFormProps {
    voter: Voter;
    mobileNumbers?: MobileNumberEntry[];
    onPhoneUpdate: (phoneData: { mobileNoPrimary: string; mobileNoSecondary?: string }) => void;
    onSkip: () => void;
    onCancel: () => void;
}

export function PhoneUpdateForm({ voter, mobileNumbers, onPhoneUpdate, onSkip, onCancel }: PhoneUpdateFormProps) {
    const { t } = useTranslations();
    const [mobileNoPrimary, setMobileNoPrimary] = useState('');
    const [mobileNoSecondary, setMobileNoSecondary] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const orderedNumbers = (mobileNumbers || [])
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((entry) => entry.mobileNumber)
            .filter((number) => number && number.trim());

        setMobileNoPrimary(orderedNumbers[0] || '');
        setMobileNoSecondary(orderedNumbers[1] || '');
    }, [mobileNumbers]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!mobileNoPrimary.trim()) {
            return;
        }

        setIsSubmitting(true);
        try {
            onPhoneUpdate({
                mobileNoPrimary: mobileNoPrimary.trim(),
                mobileNoSecondary: mobileNoSecondary.trim() || undefined,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('phoneUpdate.title')}</CardTitle>
                <CardDescription>
                    {t('phoneUpdate.description')}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Voter Information Display */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">{t('phoneUpdate.voterInfo')}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                            <div>
                                <Label className="text-sm font-medium">{t('common.name')}</Label>
                                <p className="text-sm">{voter.fullName}</p>
                            </div>
                            <div>
                                <Label className="text-sm font-medium">{t('forms.epicNumber')}</Label>
                                <p className="text-sm font-mono">{voter.epicNumber}</p>
                            </div>
                            <div>
                                <Label className="text-sm font-medium">{t('forms.age')}</Label>
                                <p className="text-sm">{voter.age || 'N/A'}</p>
                            </div>
                            <div>
                                <Label className="text-sm font-medium">{t('forms.gender')}</Label>
                                <p className="text-sm">{voter.gender || 'N/A'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Phone Number Input Fields */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">{t('phoneUpdate.contactInfo')}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="mobileNoPrimary">
                                    {t('phoneUpdate.primary')} <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="mobileNoPrimary"
                                    type="tel"
                                    value={mobileNoPrimary}
                                    onChange={(e) => setMobileNoPrimary(e.target.value)}
                                    placeholder={t('phoneUpdate.primaryPlaceholder')}
                                    required
                                    className="font-mono"
                                />
                                <p className="text-xs text-muted-foreground">
                                    {t('phoneUpdate.primaryHelp')}
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="mobileNoSecondary">
                                    {t('phoneUpdate.secondary')}
                                </Label>
                                <Input
                                    id="mobileNoSecondary"
                                    type="tel"
                                    value={mobileNoSecondary}
                                    onChange={(e) => setMobileNoSecondary(e.target.value)}
                                    placeholder={t('phoneUpdate.secondaryPlaceholder')}
                                    className="font-mono"
                                />
                                <p className="text-xs text-muted-foreground">
                                    {t('phoneUpdate.secondaryHelp')}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4">
                        <Button
                            type="submit"
                            disabled={isSubmitting || !mobileNoPrimary.trim()}
                            className="flex-1"
                        >
                            {isSubmitting ? t('phoneUpdate.updating') : t('phoneUpdate.update')}
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            onClick={onCancel}
                            disabled={isSubmitting}
                        >
                            {t('common.cancel')}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
