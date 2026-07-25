'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { toast } from '@/components/toast';

import { AddressMasterManager } from '@/components/address-master-manager';
import {
  LetterAddressLinkManager,
  type LetterAddressTypeLinkRow,
} from '@/components/letter-address-link-manager';
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
  const [links, setLinks] = useState<LetterAddressTypeLinkRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [linksLoading, setLinksLoading] = useState(false);

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

  const refreshLinks = useCallback(async () => {
    setLinksLoading(true);
    try {
      const res = await fetch('/api/letter-address-links');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to fetch links');
      setLinks((json?.links ?? []) as LetterAddressTypeLinkRow[]);
    } catch (error) {
      console.error('Failed to fetch letter address links', error);
      toast.error(tRef.current('letterGeneration.letterAddressLinks.fetchError'));
    } finally {
      setLinksLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshAddresses();
    void refreshLinks();
  }, [refreshAddresses, refreshLinks]);

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

      <LetterAddressLinkManager
        links={links}
        loading={linksLoading}
        onRefresh={refreshLinks}
      />

      <AddressMasterManager
        addresses={addresses}
        loading={loading}
        onRefresh={refreshAddresses}
      />
    </div>
  );
}
