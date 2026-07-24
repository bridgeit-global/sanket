'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { toast } from '@/components/toast';

import { DocumentTypeMasterManager } from '@/components/document-type-master-manager';
import {
  LetterAddressLinkManager,
  type LetterAddressTypeLinkRow,
} from '@/components/letter-address-link-manager';
import { ModulePageHeader } from '@/components/module-page-header';
import { Button } from '@/components/ui/button';
import { useTranslations } from '@/hooks/use-translations';

export type DocumentTypeMasterRow = {
  id: string;
  code: string;
  labelEn: string;
  labelMr: string;
  lastSequence: number;
  isActive: boolean;
  sortOrder: number;
};

export function DocumentTypeMasterPage() {
  const { t } = useTranslations();
  const searchParams = useSearchParams();
  const fromOutward = searchParams.get('from') === 'outward';
  const tRef = useRef(t);
  tRef.current = t;
  const [documentTypes, setDocumentTypes] = useState<DocumentTypeMasterRow[]>([]);
  const [links, setLinks] = useState<LetterAddressTypeLinkRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [linksLoading, setLinksLoading] = useState(false);

  const refreshDocumentTypes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/document-types?includeInactive=true');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to fetch document types');
      setDocumentTypes((json?.documentTypes ?? []) as DocumentTypeMasterRow[]);
    } catch (error) {
      console.error('Failed to fetch document types', error);
      toast.error(tRef.current('letterGeneration.documentTypesMaster.fetchError'));
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
    void refreshDocumentTypes();
    void refreshLinks();
  }, [refreshDocumentTypes, refreshLinks]);

  const beneficiaryServiceId = searchParams.get('beneficiaryServiceId');
  const backHref = fromOutward
    ? '/modules/io-register?tab=outward'
    : beneficiaryServiceId
      ? `/modules/letter-generation?beneficiaryServiceId=${encodeURIComponent(beneficiaryServiceId)}`
      : '/modules/operator';
  const backLabel = fromOutward
    ? t('register.outward')
    : t('letterGeneration.documentTypesMaster.backToLetterGeneration');

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <ModulePageHeader
        title={t('letterGeneration.documentTypesMaster.title')}
        description={t('letterGeneration.documentTypesMaster.description')}
        actions={
          <Button variant="outline" asChild>
            <Link href={backHref}>
              <ArrowLeft className="mr-2 size-4" />
              {backLabel}
            </Link>
          </Button>
        }
      />

      <LetterAddressLinkManager
        links={links}
        loading={linksLoading}
        onRefresh={refreshLinks}
      />

      <DocumentTypeMasterManager
        documentTypes={documentTypes}
        loading={loading}
        onRefresh={refreshDocumentTypes}
      />
    </div>
  );
}
