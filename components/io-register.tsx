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
      <TabsList className="grid h-auto w-full grid-cols-2 sm:max-w-md">
        <TabsTrigger value="inward" className="whitespace-normal px-2 py-2 text-center sm:whitespace-nowrap">
          {t('register.inward')}
        </TabsTrigger>
        <TabsTrigger value="outward" className="whitespace-normal px-2 py-2 text-center sm:whitespace-nowrap">
          {t('register.outward')}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="inward" className="mt-4 sm:mt-6">
        <RegisterModule type="inward" />
      </TabsContent>
      <TabsContent value="outward" className="mt-4 sm:mt-6">
        <RegisterModule type="outward" canDeleteAttachments={isAdmin} />
      </TabsContent>
    </Tabs>
  );
}
