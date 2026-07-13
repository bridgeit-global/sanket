'use client';

import { useRef, useState } from 'react';
import { Download, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/toast';
import { useTranslations } from '@/hooks/use-translations';
import {
  exportElementToPdf,
  A4_PORTRAIT_CONTENT_WIDTH_PX,
} from '@/lib/pdf/export-element-to-pdf';
import type { SirProfile } from '@/lib/sir/types';

interface SirProfilePdfProps {
  profile: SirProfile;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border py-2">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-base font-medium text-foreground">{value || '-'}</span>
    </div>
  );
}

export function SirProfilePdf({ profile }: SirProfilePdfProps) {
  const { t } = useTranslations();
  const printRef = useRef<HTMLDivElement>(null);
  const [isBusy, setIsBusy] = useState(false);

  const na = t('sir.notAvailable');
  const fileName = `SIR-${profile.epicNumber}`;

  const registerActivity = async (action: 'download' | 'share') => {
    try {
      await fetch('/api/sir/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ epicNumber: profile.epicNumber, action }),
      });
    } catch {
      // Non-fatal: activity logging should not disrupt the user.
    }
  };

  const handleDownload = async () => {
    if (!printRef.current) return;
    setIsBusy(true);
    try {
      await exportElementToPdf({
        element: printRef.current,
        fileName,
        captureWidthPx: A4_PORTRAIT_CONTENT_WIDTH_PX,
        destination: 'download',
      });
      await registerActivity('download');
      toast({ type: 'success', description: t('sir.downloadSuccess') });
    } catch (_error) {
      toast({ type: 'error', description: t('sir.actionFailed') });
    } finally {
      setIsBusy(false);
    }
  };

  const handleShare = async () => {
    if (!printRef.current) return;
    setIsBusy(true);
    try {
      const blob = await exportElementToPdf({
        element: printRef.current,
        fileName,
        captureWidthPx: A4_PORTRAIT_CONTENT_WIDTH_PX,
        destination: 'blob',
      });
      const file = new File([blob], `${fileName}.pdf`, {
        type: 'application/pdf',
      });

      const shareData: ShareData = {
        files: [file],
        title: fileName,
        text: `${profile.fullName} (${profile.epicNumber})`,
      };

      const canShareFiles =
        typeof navigator !== 'undefined' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] });

      if (canShareFiles && typeof navigator.share === 'function') {
        await navigator.share(shareData);
        await registerActivity('share');
        toast({ type: 'success', description: t('sir.shareSuccess') });
      } else {
        // Desktop / unsupported: fall back to a download.
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileName}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        await registerActivity('download');
        toast({ type: 'success', description: t('sir.downloadSuccess') });
      }
    } catch (error) {
      // AbortError => user dismissed the native share sheet; not an error.
      if (error instanceof DOMException && error.name === 'AbortError') return;
      toast({ type: 'error', description: t('sir.actionFailed') });
    } finally {
      setIsBusy(false);
    }
  };

  const primaryPhone = profile.mobileNumbers
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((m) => m.mobileNumber)
    .join(', ');

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>{t('sir.profileTitle')}</CardTitle>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={isBusy}
          >
            <Download className="mr-2 size-4" />
            {t('sir.download')}
          </Button>
          <Button type="button" size="sm" onClick={handleShare} disabled={isBusy}>
            <Share2 className="mr-2 size-4" />
            {t('sir.share')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div ref={printRef} className="bg-white text-black">
          <div className="mb-4 text-center">
            <h2 className="text-xl font-bold">{t('sir.documentTitle')}</h2>
            <p className="text-sm text-muted-foreground">
              {profile.state} / {profile.district} / {profile.assemblyConstituency}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
            <Field label={t('sir.fields.epicNumber')} value={profile.epicNumber} />
            <Field label={t('sir.fields.name')} value={profile.fullName} />
            <Field
              label={t('sir.fields.age')}
              value={profile.age != null ? String(profile.age) : na}
            />
            <Field
              label={t('sir.fields.relativeName')}
              value={profile.relationName || na}
            />
            <Field label={t('sir.fields.state')} value={profile.state} />
            <Field label={t('sir.fields.district')} value={profile.district} />
            <Field
              label={t('sir.fields.assemblyConstituency')}
              value={profile.assemblyConstituency}
            />
            <Field
              label={t('sir.fields.partNumber')}
              value={profile.partNo || na}
            />
            <Field
              label={t('sir.fields.partSerialNumber')}
              value={profile.srNo || na}
            />
            <Field
              label={t('sir.fields.phoneNumbers')}
              value={primaryPhone || na}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
