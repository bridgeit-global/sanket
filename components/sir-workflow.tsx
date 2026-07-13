'use client';

import { useState } from 'react';
import { ArrowLeft, Plus, Search, Trash2 } from 'lucide-react';
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
import { SidebarToggle } from '@/components/sidebar-toggle';
import { toast } from '@/components/toast';
import { useTranslations } from '@/hooks/use-translations';
import { isValidIndianMobile } from '@/lib/indian-mobile';
import { SirProfilePdf } from '@/components/sir-profile-pdf';
import type { SirProfile } from '@/lib/sir/types';

type SearchType = 'voterId' | 'mobileNumber';

interface SearchResultVoter {
  epicNumber: string;
  fullName: string;
  age?: number | null;
  gender?: string | null;
  relationType?: string | null;
  relationName?: string | null;
  mobileNoPrimary?: string | null;
  mobileNoSecondary?: string | null;
}

const MAX_PHONES = 5;

interface PhoneEntry {
  id: string;
  value: string;
}

let phoneIdCounter = 0;
function makePhoneEntry(value = ''): PhoneEntry {
  phoneIdCounter += 1;
  return { id: `phone-${phoneIdCounter}`, value };
}

export function SirWorkflow() {
  const { t } = useTranslations();

  const [step, setStep] = useState<'search' | 'verify' | 'profile'>('search');
  const [searchType, setSearchType] = useState<SearchType>('voterId');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults] = useState<SearchResultVoter[]>([]);

  const [profile, setProfile] = useState<SirProfile | null>(null);
  const [phones, setPhones] = useState<PhoneEntry[]>([makePhoneEntry()]);
  const [dob, setDob] = useState('');
  const [hadPhone, setHadPhone] = useState(false);
  const [hadDob, setHadDob] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const resetToSearch = () => {
    setStep('search');
    setProfile(null);
    setPhones([makePhoneEntry()]);
    setDob('');
  };

  const handleSearch = async () => {
    const term = searchTerm.trim();
    if (!term) {
      toast({
        type: 'error',
        description:
          searchType === 'mobileNumber'
            ? t('sir.enterMobileNumber')
            : t('sir.enterVoterId'),
      });
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    try {
      const response = await fetch('/api/sir/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchTerm: term, searchType }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to search');
      }
      const data = await response.json();
      setResults(data.voters || []);
      if ((data.voters || []).length === 0) {
        toast({ type: 'error', description: t('sir.noVotersFound') });
      }
    } catch (error) {
      toast({
        type: 'error',
        description:
          error instanceof Error ? error.message : t('sir.actionFailed'),
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectVoter = async (voter: SearchResultVoter) => {
    try {
      const response = await fetch(
        `/api/sir/voter/${encodeURIComponent(voter.epicNumber)}`,
      );
      if (!response.ok) throw new Error('Failed to load voter');
      const data = await response.json();
      const loaded = data.profile as SirProfile;

      setProfile(loaded);
      const existingPhones = loaded.mobileNumbers
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((m) => m.mobileNumber);
      setPhones(
        existingPhones.length > 0
          ? existingPhones.map((value) => makePhoneEntry(value))
          : [makePhoneEntry()],
      );
      setHadPhone(existingPhones.length > 0);
      setDob(loaded.dob || '');
      setHadDob(Boolean(loaded.dob));
      setStep('verify');
    } catch (_error) {
      toast({ type: 'error', description: t('sir.actionFailed') });
    }
  };

  const updatePhone = (id: string, value: string) => {
    setPhones((prev) => prev.map((p) => (p.id === id ? { ...p, value } : p)));
  };

  const addPhone = () => {
    setPhones((prev) =>
      prev.length < MAX_PHONES ? [...prev, makePhoneEntry()] : prev,
    );
  };

  const removePhone = (id: string) => {
    setPhones((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSaveAndContinue = async () => {
    if (!profile) return;

    const trimmedPhones = phones
      .map((p) => p.value.trim())
      .filter((p) => p.length > 0);

    // First phone mandatory only when the voter currently has none.
    if (!hadPhone && trimmedPhones.length === 0) {
      toast({ type: 'error', description: t('sir.phoneRequired') });
      return;
    }
    for (const p of trimmedPhones) {
      if (!isValidIndianMobile(p)) {
        toast({ type: 'error', description: t('sir.invalidMobile') });
        return;
      }
    }

    // DOB mandatory only when the voter currently has none.
    if (!hadDob && !dob.trim()) {
      toast({ type: 'error', description: t('sir.dobRequired') });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/sir/voter/${encodeURIComponent(profile.epicNumber)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mobileNumbers: trimmedPhones,
            dob: dob.trim() || undefined,
          }),
        },
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save');
      }
      const data = await response.json();
      setProfile(data.profile as SirProfile);
      setStep('profile');
      toast({ type: 'success', description: t('sir.saveSuccess') });
    } catch (error) {
      toast({
        type: 'error',
        description:
          error instanceof Error ? error.message : t('sir.actionFailed'),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <SidebarToggle />
        <div>
          <h1 className="text-3xl font-bold">{t('sir.title')}</h1>
          <p className="mt-1 text-muted-foreground">{t('sir.subtitle')}</p>
        </div>
      </div>

      {step === 'search' && (
        <Card>
          <CardHeader>
            <CardTitle>{t('sir.searchTitle')}</CardTitle>
            <CardDescription>{t('sir.searchSubtitle')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-2 rounded-lg border p-3 transition-colors hover:bg-muted/50">
                <input
                  type="radio"
                  name="sirSearchType"
                  value="voterId"
                  checked={searchType === 'voterId'}
                  onChange={() => {
                    setSearchType('voterId');
                    setSearchTerm('');
                    setResults([]);
                    setHasSearched(false);
                  }}
                  className="size-4"
                />
                <span className="text-sm font-medium">{t('sir.searchByVoterId')}</span>
              </label>
              <label className="flex items-center gap-2 rounded-lg border p-3 transition-colors hover:bg-muted/50">
                <input
                  type="radio"
                  name="sirSearchType"
                  value="mobileNumber"
                  checked={searchType === 'mobileNumber'}
                  onChange={() => {
                    setSearchType('mobileNumber');
                    setSearchTerm('');
                    setResults([]);
                    setHasSearched(false);
                  }}
                  className="size-4"
                />
                <span className="text-sm font-medium">{t('sir.searchByMobile')}</span>
              </label>
            </div>

            <div>
              <Label htmlFor="sirSearch">
                {searchType === 'mobileNumber'
                  ? t('sir.mobileNumber')
                  : t('sir.voterId')}
              </Label>
              <Input
                id="sirSearch"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder={
                  searchType === 'mobileNumber'
                    ? t('sir.enterMobileNumber')
                    : t('sir.enterVoterId')
                }
                type={searchType === 'mobileNumber' ? 'tel' : 'text'}
              />
            </div>

            <Button onClick={handleSearch} disabled={isSearching} className="w-full">
              <Search className="mr-2 size-4" />
              {isSearching ? t('sir.searching') : t('sir.search')}
            </Button>

            {results.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">{t('sir.searchResults')}</h3>
                {results.map((voter) => (
                  <button
                    key={voter.epicNumber}
                    type="button"
                    onClick={() => handleSelectVoter(voter)}
                    className="w-full rounded-lg border p-4 text-left transition-colors hover:bg-muted"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-lg font-medium">{voter.fullName}</p>
                        {voter.relationName && (
                          <p className="text-sm text-muted-foreground">
                            {voter.relationType}: {voter.relationName}
                          </p>
                        )}
                      </div>
                      <span className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-800">
                        {voter.epicNumber}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      {t('sir.fields.age')}: {voter.age ?? '-'} |{' '}
                      {voter.mobileNoPrimary || t('sir.noPhone')}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {hasSearched && !isSearching && results.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {t('sir.noVotersFound')}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {step === 'verify' && profile && (
        <Card>
          <CardHeader>
            <CardTitle>{t('sir.verifyTitle')}</CardTitle>
            <CardDescription>{t('sir.verifySubtitle')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-4 rounded-lg bg-muted p-4 sm:grid-cols-2">
              <div>
                <Label className="text-sm">{t('sir.fields.name')}</Label>
                <p className="text-sm">{profile.fullName}</p>
              </div>
              <div>
                <Label className="text-sm">{t('sir.fields.epicNumber')}</Label>
                <p className="font-mono text-sm">{profile.epicNumber}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{t('sir.phoneNumbers')}</h3>
                {phones.length < MAX_PHONES && (
                  <Button type="button" variant="outline" size="sm" onClick={addPhone}>
                    <Plus className="mr-1 size-4" />
                    {t('sir.addPhone')}
                  </Button>
                )}
              </div>
              {phones.map((phone, index) => (
                <div key={phone.id} className="flex items-end gap-2">
                  <div className="flex-1">
                    <Label htmlFor={`sir-${phone.id}`}>
                      {index === 0 ? (
                        <>
                          {t('sir.primaryPhone')}{' '}
                          {!hadPhone && <span className="text-red-500">*</span>}
                        </>
                      ) : (
                        t('sir.additionalPhone')
                      )}
                    </Label>
                    <Input
                      id={`sir-${phone.id}`}
                      type="tel"
                      inputMode="numeric"
                      maxLength={13}
                      value={phone.value}
                      onChange={(e) => updatePhone(phone.id, e.target.value)}
                      placeholder={t('sir.enterMobileNumber')}
                      className="font-mono"
                    />
                  </div>
                  {phones.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removePhone(phone.id)}
                      aria-label={t('sir.removePhone')}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                {hadPhone ? t('sir.phoneOptionalHelp') : t('sir.phoneRequiredHelp')}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sir-dob">
                {t('sir.dob')} {!hadDob && <span className="text-red-500">*</span>}
              </Label>
              <Input
                id="sir-dob"
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {hadDob ? t('sir.dobOptionalHelp') : t('sir.dobRequiredHelp')}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                onClick={handleSaveAndContinue}
                disabled={isSaving}
                className="flex-1"
              >
                {isSaving ? t('sir.saving') : t('sir.saveContinue')}
              </Button>
              <Button type="button" variant="outline" onClick={resetToSearch}>
                <ArrowLeft className="mr-2 size-4" />
                {t('sir.back')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'profile' && profile && (
        <div className="space-y-4">
          <SirProfilePdf profile={profile} />
          <div className="flex justify-end">
            <Button variant="outline" onClick={resetToSearch}>
              <Search className="mr-2 size-4" />
              {t('sir.searchAnother')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
