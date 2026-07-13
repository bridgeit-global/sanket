'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

import { AddressMasterManager } from '@/components/address-master-manager';
import type { AddressMasterRow } from '@/components/letter-address-field';
import { ModulePageHeader } from '@/components/module-page-header';
import { Button } from '@/components/ui/button';
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
          <Button variant="outline" asChild>
            <Link href={backHref}>
              <ArrowLeft className="mr-2 size-4" />
              {t('letterGeneration.addresses.backToLetterGeneration')}
            </Link>
          </Button>
        }
      />

      <AddressMasterManager
        addresses={addresses}
        loading={loading}
        onRefresh={refreshAddresses}
      />
    </div>
  );
}
