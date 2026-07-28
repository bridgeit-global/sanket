'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { toast } from '@/components/toast';

import {
  LetterTemplateMasterManager,
  type LetterMasterRow,
} from '@/components/letter-template-master-manager';
import { ModulePageHeader } from '@/components/module-page-header';
import { Button } from '@/components/ui/button';
import { useTranslations } from '@/hooks/use-translations';
import type { LetterLocale } from '@/lib/letters/templates';

export function LetterTemplateEditorPage() {
  const { t } = useTranslations();
  const searchParams = useSearchParams();
  const tRef = useRef(t);
  tRef.current = t;

  const [letterMasters, setLetterMasters] = useState<LetterMasterRow[]>([]);
  const [letterMastersLoading, setLetterMastersLoading] = useState(true);

  const refreshLetterMasters = useCallback(async () => {
    setLetterMastersLoading(true);
    try {
      const res = await fetch('/api/letter-masters');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to fetch letter masters');
      setLetterMasters((json?.letterMasters ?? []) as LetterMasterRow[]);
    } catch (error) {
      console.error('Failed to fetch letter masters', error);
      toast.error(tRef.current('letterGeneration.templates.fetchError'));
    } finally {
      setLetterMastersLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshLetterMasters();
  }, [refreshLetterMasters]);

  const typeParam = searchParams.get('letterType');
  const localeParam = searchParams.get('letterLocale');
  const initialLetterType = typeParam?.trim() || null;
  const initialLetterLocale: LetterLocale | null =
    localeParam === 'en' || localeParam === 'mr' ? localeParam : null;

  const beneficiaryServiceId = searchParams.get('beneficiaryServiceId');
  const backHref = beneficiaryServiceId
    ? `/modules/letter-generation?beneficiaryServiceId=${encodeURIComponent(beneficiaryServiceId)}`
    : '/modules/operator';

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <ModulePageHeader
        title={t('letterGeneration.templates.title')}
        description={t('letterGeneration.templates.description')}
        actions={
          <Button variant="outline" asChild>
            <Link href={backHref}>
              <ArrowLeft className="mr-2 size-4" />
              {t('letterGeneration.templates.backToLetterGeneration')}
            </Link>
          </Button>
        }
      />

      <LetterTemplateMasterManager
        letterMasters={letterMasters}
        loading={letterMastersLoading}
        onRefresh={refreshLetterMasters}
        initialLetterType={initialLetterType}
        initialLetterLocale={initialLetterLocale}
      />
    </div>
  );
}
