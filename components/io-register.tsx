'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RegisterModule } from '@/components/register-module';
import { useTranslations } from '@/hooks/use-translations';

export function IoRegister({ isAdmin = false }: { isAdmin?: boolean }) {
  const { t } = useTranslations();
  const searchParams = useSearchParams();
  const initialTab =
    searchParams.get('tab') === 'outward' ? 'outward' : 'inward';
  const [tab, setTab] = useState<'inward' | 'outward'>(initialTab);

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => setTab(value as 'inward' | 'outward')}
      className="w-full"
    >
      <TabsList className="grid w-full max-w-md grid-cols-2">
        <TabsTrigger value="inward">{t('register.inward')}</TabsTrigger>
        <TabsTrigger value="outward">{t('register.outward')}</TabsTrigger>
      </TabsList>
      <TabsContent value="inward" className="mt-6">
        <RegisterModule type="inward" />
      </TabsContent>
      <TabsContent value="outward" className="mt-6">
        <RegisterModule type="outward" canDeleteAttachments={isAdmin} />
      </TabsContent>
    </Tabs>
  );
}
