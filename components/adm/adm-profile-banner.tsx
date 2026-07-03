'use client';

import { Card, CardContent } from '@/components/ui/card';
import { useTranslations } from '@/hooks/use-translations';

export function AdmProfileBanner() {
  const { t } = useTranslations();

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('adm.activeProfile')}
          </p>
          <p className="text-base font-semibold sm:text-lg">{t('adm.mlaName')}</p>
        </div>
      </CardContent>
    </Card>
  );
}
