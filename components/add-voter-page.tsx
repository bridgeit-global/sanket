'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw, UserPlus } from 'lucide-react';
import { toast } from '@/components/toast';
import { ModulePageHeader } from '@/components/module-page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EpicQrScanButton, EpicQrScannerDialog } from '@/components/epic-qr-scanner-dialog';
import { useTranslations } from '@/hooks/use-translations';
import { ANUSHAKTI_NAGAR_AC_NUMBER } from '@/lib/eci/ac-constants';
import type { EpicQrData } from '@/lib/epic/decode-qr-payload';

type SearchVoter = {
  epicNumber: string;
  fullName: string;
  fullNameL1: string | null;
  relationType: string | null;
  relationName: string | null;
  age: number | null;
  gender: string | null;
  address: string | null;
  partNo: string | null;
  srNo: string | null;
  boothName: string | null;
  boothAddress: string | null;
  acNumber: number | null;
  assemblyName: string | null;
  districtName: string | null;
  stateName: string | null;
  isActive: boolean | null;
};

type SearchResponse = {
  alreadyInMaster: boolean;
  allowed: boolean;
  voter: SearchVoter;
  ticket: string | null;
  error?: string;
};

const EPIC_PATTERN = /^[A-Z]{3}[0-9]{7}$/;

export function AddVoterPage() {
  const { t } = useTranslations();
  const router = useRouter();
  const [epicNumber, setEpicNumber] = useState('');
  const [captchaId, setCaptchaId] = useState('');
  const [captchaImage, setCaptchaImage] = useState('');
  const [captchaData, setCaptchaData] = useState('');
  const [isLoadingCaptcha, setIsLoadingCaptcha] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [showEpicScanner, setShowEpicScanner] = useState(false);

  const loadCaptcha = useCallback(async () => {
    setIsLoadingCaptcha(true);
    try {
      const response = await fetch('/api/back-office/eci-voter/captcha', {
        cache: 'no-store',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load captcha');
      }
      setCaptchaId(data.id);
      setCaptchaImage(data.captcha);
      setCaptchaData('');
    } catch (error) {
      toast({
        type: 'error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to load captcha',
      });
    } finally {
      setIsLoadingCaptcha(false);
    }
  }, []);

  useEffect(() => {
    void loadCaptcha();
  }, [loadCaptcha]);

  const handleEpicDetected = useCallback((data: EpicQrData) => {
    setEpicNumber(data.epic.toUpperCase());
  }, []);

  const handleSearch = async () => {
    const epic = epicNumber.trim().toUpperCase();
    if (!EPIC_PATTERN.test(epic)) {
      toast({
        type: 'error',
        description: t('backOffice.addVoter.invalidEpic'),
      });
      return;
    }
    if (!captchaData.trim()) {
      toast({
        type: 'error',
        description: t('backOffice.addVoter.enterCaptcha'),
      });
      return;
    }

    setIsSearching(true);
    setResult(null);
    try {
      const response = await fetch('/api/back-office/eci-voter/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          epicNumber: epic,
          captchaId,
          captchaData: captchaData.trim(),
        }),
      });
      const data = await response.json();
      await loadCaptcha();

      if (!response.ok) {
        throw new Error(data.error || t('backOffice.addVoter.searchFailed'));
      }

      setResult(data as SearchResponse);
      if (data.alreadyInMaster) {
        toast({
          type: 'info',
          description: t('backOffice.addVoter.alreadyInMaster'),
        });
      } else if (!data.allowed) {
        toast({
          type: 'error',
          description: t('backOffice.addVoter.wrongAssembly', {
            ac: data.voter?.acNumber ?? '',
          }),
        });
      } else {
        toast({
          type: 'success',
          description: t('backOffice.addVoter.foundVoter'),
        });
      }
    } catch (error) {
      toast({
        type: 'error',
        description:
          error instanceof Error
            ? error.message
            : t('backOffice.addVoter.searchFailed'),
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleAdd = async () => {
    if (!result?.ticket) return;
    setIsAdding(true);
    try {
      const response = await fetch('/api/back-office/eci-voter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket: result.ticket }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || t('backOffice.addVoter.addFailed'));
      }

      toast({
        type: 'success',
        description: t('backOffice.addVoter.addedSuccess'),
      });
      router.push(
        `/modules/voter/${encodeURIComponent(result.voter.epicNumber)}`,
      );
    } catch (error) {
      toast({
        type: 'error',
        description:
          error instanceof Error
            ? error.message
            : t('backOffice.addVoter.addFailed'),
      });
    } finally {
      setIsAdding(false);
    }
  };

  const voter = result?.voter;

  return (
    <div className="space-y-6">
      <ModulePageHeader
        title={t('backOffice.addVoter.title')}
        description={t('backOffice.addVoter.subtitle', {
          ac: ANUSHAKTI_NAGAR_AC_NUMBER,
        })}
        actions={
          <Button variant="outline" className="w-full sm:w-auto" asChild>
            <Link href="/modules/back-office">
              <ArrowLeft className="mr-2 size-4 shrink-0" />
              {t('backOffice.addVoter.back')}
            </Link>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>{t('backOffice.addVoter.searchTitle')}</CardTitle>
          <CardDescription>
            {t('backOffice.addVoter.searchDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <Label htmlFor="epicNumber">
                {t('backOffice.voterIdEpicNumber')}
              </Label>
              <EpicQrScanButton
                onClick={() => setShowEpicScanner(true)}
                label={t('backOffice.scanEpicQr')}
              />
            </div>
            <Input
              id="epicNumber"
              value={epicNumber}
              onChange={(e) => setEpicNumber(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && void handleSearch()}
              placeholder={t('backOffice.enterVoterId')}
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="captchaData">{t('backOffice.addVoter.captcha')}</Label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                {captchaImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`data:image/jpg;base64,${captchaImage}`}
                    alt={t('backOffice.addVoter.captcha')}
                    width={190}
                    height={65}
                    className="h-[65px] w-[190px] rounded border bg-white"
                  />
                ) : (
                  <div className="flex h-[65px] w-[190px] items-center justify-center rounded border bg-muted text-sm text-muted-foreground">
                    {isLoadingCaptcha
                      ? t('backOffice.addVoter.loadingCaptcha')
                      : t('backOffice.addVoter.noCaptcha')}
                  </div>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => void loadCaptcha()}
                  disabled={isLoadingCaptcha}
                  aria-label={t('backOffice.addVoter.refreshCaptcha')}
                >
                  <RefreshCw
                    className={isLoadingCaptcha ? 'animate-spin' : ''}
                  />
                </Button>
              </div>
              <Input
                id="captchaData"
                value={captchaData}
                onChange={(e) => setCaptchaData(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void handleSearch()}
                placeholder={t('backOffice.addVoter.enterCaptchaPlaceholder')}
                className="sm:max-w-xs"
                autoComplete="off"
              />
            </div>
          </div>

          <Button
            onClick={() => void handleSearch()}
            disabled={isSearching || isLoadingCaptcha}
          >
            {isSearching
              ? t('backOffice.searching')
              : t('backOffice.addVoter.searchButton')}
          </Button>
        </CardContent>
      </Card>

      {result && voter && (
        <Card>
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>{voter.fullName}</CardTitle>
                {voter.fullNameL1 && (
                  <p className="mt-1 text-muted-foreground">{voter.fullNameL1}</p>
                )}
                <CardDescription className="mt-2 font-medium">
                  {voter.epicNumber}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                {result.alreadyInMaster ? (
                  <Badge variant="secondary">
                    {t('backOffice.addVoter.alreadyInMasterBadge')}
                  </Badge>
                ) : result.allowed ? (
                  <Badge>{t('backOffice.addVoter.acAllowedBadge')}</Badge>
                ) : (
                  <Badge variant="destructive">
                    {t('backOffice.addVoter.wrongAssemblyBadge')}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Detail
                label={t('backOffice.addVoter.assembly')}
                value={
                  voter.assemblyName
                    ? `${voter.assemblyName} (AC ${voter.acNumber ?? '—'})`
                    : voter.acNumber != null
                      ? `AC ${voter.acNumber}`
                      : null
                }
              />
              <Detail
                label={t('backOffice.addVoter.district')}
                value={
                  [voter.districtName, voter.stateName]
                    .filter(Boolean)
                    .join(', ') || null
                }
              />
              <Detail label={t('backOffice.age')} value={voter.age} />
              <Detail label={t('backOffice.gender')} value={voter.gender} />
              <Detail
                label={t('backOffice.addVoter.relation')}
                value={
                  voter.relationType && voter.relationName
                    ? `${voter.relationType}: ${voter.relationName}`
                    : voter.relationName
                }
              />
              <Detail
                label={t('backOffice.addVoter.partSerial')}
                value={
                  voter.partNo
                    ? `${voter.partNo}${voter.srNo ? ` / ${voter.srNo}` : ''}`
                    : voter.srNo
                }
              />
              <Detail
                label={t('backOffice.addVoter.pollingStation')}
                value={voter.boothName}
              />
              <Detail
                label={t('backOffice.addVoter.address')}
                value={voter.boothAddress || voter.address}
              />
            </div>

            {!result.allowed && (
              <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {t('backOffice.addVoter.wrongAssembly', {
                  ac: voter.acNumber ?? '—',
                })}
              </p>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              {result.alreadyInMaster ? (
                <Button asChild>
                  <Link
                    href={`/modules/voter/${encodeURIComponent(voter.epicNumber)}`}
                  >
                    {t('backOffice.addVoter.viewProfile')}
                  </Link>
                </Button>
              ) : (
                <Button
                  onClick={() => void handleAdd()}
                  disabled={!result.ticket || isAdding}
                >
                  <UserPlus className="mr-2 size-4" />
                  {isAdding
                    ? t('backOffice.addVoter.adding')
                    : t('backOffice.addVoter.addToMaster')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <EpicQrScannerDialog
        open={showEpicScanner}
        onOpenChange={setShowEpicScanner}
        onDataDetected={handleEpicDetected}
        title={t('backOffice.epicScannerTitle')}
        description={t('backOffice.epicScannerDescription')}
        uploadLabel={t('backOffice.uploadEpicPhoto')}
      />
    </div>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  if (value == null || value === '') return null;
  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-base">{value}</p>
    </div>
  );
}
