'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { toast } from '@/components/toast';

import { AddressMasterManager } from '@/components/address-master-manager';
import {
  AddressBlocksManager,
  AddressTypesManager,
  PositionsManager,
} from '@/components/address-master-submasters';
import type { AddressMasterRow } from '@/components/letter-address-field';
import { ModulePageHeader } from '@/components/module-page-header';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslations } from '@/hooks/use-translations';

export function AddressMasterPage() {
  const { t } = useTranslations();
  const searchParams = useSearchParams();
  const beneficiaryServiceId = searchParams.get('beneficiaryServiceId');
  const backHref = beneficiaryServiceId
    ? `/modules/letter-generation?beneficiaryServiceId=${encodeURIComponent(beneficiaryServiceId)}`
    : '/modules/operator';
  const tRef = useRef(t);
  tRef.current = t;
  const [addresses, setAddresses] = useState<AddressMasterRow[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshAddresses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/addresses?includeInactive=true');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to fetch addresses');
      setAddresses((json?.addresses ?? []) as AddressMasterRow[]);
    } catch (error) {
      console.error('Failed to fetch addresses', error);
      toast.error(tRef.current('letterGeneration.addresses.fetchError'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshAddresses();
  }, [refreshAddresses]);

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <ModulePageHeader
        title={t('letterGeneration.addresses.title')}
        description={t('letterGeneration.addresses.description')}
        actions={
          <Button variant="outline" className="w-full sm:w-auto" asChild>
            <Link href={backHref}>
              <ArrowLeft className="mr-2 size-4 shrink-0" />
              <span className="truncate">
                {t('letterGeneration.addresses.backToLetterGeneration')}
              </span>
            </Link>
          </Button>
        }
      />

      <Tabs defaultValue="entries" className="w-full min-w-0">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 p-1 sm:inline-flex sm:w-auto sm:flex-wrap sm:justify-start">
          <TabsTrigger value="entries" className="w-full sm:w-auto">
            {t('letterGeneration.addresses.tabs.entries')}
          </TabsTrigger>
          <TabsTrigger value="types" className="w-full sm:w-auto">
            {t('letterGeneration.addresses.tabs.types')}
          </TabsTrigger>
          <TabsTrigger value="addresses" className="w-full sm:w-auto">
            {t('letterGeneration.addresses.tabs.addresses')}
          </TabsTrigger>
          <TabsTrigger value="positions" className="w-full sm:w-auto">
            {t('letterGeneration.addresses.tabs.positions')}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="entries" className="mt-4">
          <AddressMasterManager
            addresses={addresses}
            loading={loading}
            onRefresh={refreshAddresses}
          />
        </TabsContent>
        <TabsContent value="types" className="mt-4">
          <AddressTypesManager />
        </TabsContent>
        <TabsContent value="addresses" className="mt-4">
          <AddressBlocksManager />
        </TabsContent>
        <TabsContent value="positions" className="mt-4">
          <PositionsManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
