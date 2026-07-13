'use client';

import { useRef, useState } from 'react';
import { Download, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/toast';
import { useTranslations } from '@/hooks/use-translations';
import {
  exportElementToPdf,
  A4_PORTRAIT_CONTENT_WIDTH_PX,
} from '@/lib/pdf/export-element-to-pdf';
import {
  SIR_CREDIT_LOGO,
  SIR_MLA_NAME,
  SIR_MLA_WORDMARK,
  SIR_MLA_PHOTO,
  SIR_ASSEMBLY_CONSTITUENCY,
} from '@/lib/sir/constants';
import type { SirProfile } from '@/lib/sir/types';

interface SirProfilePdfProps {
  profile: SirProfile;
}

/** Title-case a name: first letter of each word capitalized, rest lowercase. */
function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/(^|[\s'-])([a-z])/g, (_m, sep, ch) => sep + ch.toUpperCase());
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

  // Voter's primary mobile number formatted for a wa.me deep link (India +91).
  const buildWhatsAppUrl = (message: string) => {
    const primary = profile.mobileNumbers
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)[0]?.mobileNumber;
    const digits = (primary || '').replace(/\D/g, '');
    const to = digits.length === 10 ? `91${digits}` : digits;
    const base = to ? `https://wa.me/${to}` : 'https://wa.me/';
    return `${base}?text=${encodeURIComponent(message)}`;
  };

  const handleShare = async () => {
    if (!printRef.current) return;

    const primary = profile.mobileNumbers
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)[0]?.mobileNumber;
    if (!primary) {
      toast({ type: 'error', description: t('sir.noPhoneToShare') });
      return;
    }

    setIsBusy(true);
    try {
      // Prepare the attachment by downloading it, so the user can attach it in
      // the WhatsApp chat that opens next.
      const blob = await exportElementToPdf({
        element: printRef.current,
        fileName,
        captureWidthPx: A4_PORTRAIT_CONTENT_WIDTH_PX,
        destination: 'blob',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      // Open a WhatsApp chat with the voter's number and a prefilled message.
      const message = `${toTitleCase(profile.fullName)} (${profile.epicNumber}) - ${t('sir.documentTitle')}`;
      window.open(buildWhatsAppUrl(message), '_blank', 'noopener,noreferrer');
      await registerActivity('share');
      toast({ type: 'success', description: t('sir.whatsappAttachHint') });
    } catch (_error) {
      toast({ type: 'error', description: t('sir.actionFailed') });
    } finally {
      setIsBusy(false);
    }
  };

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
          <Button
            type="button"
            size="sm"
            onClick={handleShare}
            disabled={isBusy}
            className="bg-[#25D366] text-white hover:bg-[#1ebe5b]"
          >
            <MessageCircle className="mr-2 size-4" />
            {t('sir.shareWhatsApp')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div ref={printRef} className="bg-white text-black">
          {/* Branded letterhead: MLA portrait, wordmark and NCP election symbol */}
          <div className="flex items-center justify-between gap-4 border-b-4 border-[#d6006e] pb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={SIR_MLA_PHOTO}
              alt=""
              crossOrigin="anonymous"
              className="size-16 shrink-0 rounded-full border-2 border-[#d6006e] object-cover sm:size-20"
            />
            <div className="flex min-w-0 flex-1 flex-col items-center text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={SIR_MLA_WORDMARK}
                alt=""
                crossOrigin="anonymous"
                className="h-9 object-contain sm:h-11"
              />
              <p className="mt-1 text-sm font-bold text-black sm:text-base">
                {SIR_MLA_NAME}
              </p>
              <p className="text-[11px] font-medium text-neutral-600 sm:text-xs">
                {t('sir.credit.mlaDesignation')}
              </p>
              <p className="text-[11px] text-neutral-600 sm:text-xs">
                {profile.assemblyConstituency} {t('sir.fields.assemblyConstituency')}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={SIR_CREDIT_LOGO}
                alt=""
                crossOrigin="anonymous"
                className="size-14 object-contain sm:size-16"
              />
              <span className="text-[9px] font-medium uppercase tracking-wide text-neutral-500">
                {t('sir.credit.electionSymbol')}
              </span>
            </div>
          </div>

          <div className="my-4 text-center">
            <h2 className="text-xl font-bold">{t('sir.documentTitle')}</h2>
            <p className="text-sm text-muted-foreground">
              {profile.state} / {profile.district} / {profile.assemblyConstituency}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
            <Field label={t('sir.fields.epicNumber')} value={profile.epicNumber} />
            <Field label={t('sir.fields.name')} value={toTitleCase(profile.fullName)} />
            <Field
              label={t('sir.fields.age')}
              value={profile.age != null ? String(profile.age) : na}
            />
            <Field
              label={t('sir.fields.relativeName')}
              value={profile.relationName ? toTitleCase(profile.relationName) : na}
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
          </div>

          <div className="mt-6 flex items-center gap-3 border-t-2 border-[#d6006e] pt-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={SIR_CREDIT_LOGO}
              alt=""
              crossOrigin="anonymous"
              className="size-14 shrink-0 object-contain"
            />
            <div className="text-xs leading-snug text-neutral-600">
              <p>
                {t('sir.credit.line', {
                  mla: SIR_MLA_NAME,
                  ac: SIR_ASSEMBLY_CONSTITUENCY,
                })}
              </p>
              <p className="mt-0.5 font-medium text-[#d6006e]">
                {t('sir.credit.party')}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
