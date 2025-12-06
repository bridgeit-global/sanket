'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BackButton } from '@/components/back-button';
import { useTranslations } from '@/hooks/use-translations';

export default function UnauthorizedPage() {
    const { t } = useTranslations();
    
    return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl">{t('unauthorized.title')}</CardTitle>
                    <CardDescription>
                        {t('unauthorized.description')}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="text-center">
                        <p className="text-muted-foreground">
                            {t('unauthorized.contactAdmin')}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <BackButton />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
