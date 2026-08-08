'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/toast';
import { useTranslations } from '@/hooks/use-translations';
import { AadhaarQrScanButton, AadhaarQrScannerDialog } from '@/components/aadhaar-qr-scanner-dialog';
import { EpicQrScanButton, EpicQrScannerDialog } from '@/components/epic-qr-scanner-dialog';
import {
  EpicBarcodeScanButton,
  EpicBarcodeScannerDialog,
} from '@/components/epic-barcode-scanner-dialog';
import {
  ageFromAadhaarDob,
  mapAadhaarGenderToSearchValue,
  type AadhaarQrData,
} from '@/lib/aadhaar/decode-qr-payload';
import type { EpicQrData } from '@/lib/epic/decode-qr-payload';
import type { VoterWithPartNo } from '@/lib/db/schema';
import { isValidIndianMobile } from '@/lib/indian-mobile';

const VOTER_SEARCH_PAGE_SIZE = 50;
const ESTIMATED_VOTER_ROW_PX = 144;

type SearchOverrides = {
  name?: string;
  gender?: string;
  age?: number | undefined;
  ageRange?: number;
  forceDetails?: boolean;
  searchTerm?: string;
  forceVoterId?: boolean;
};

type VoterSearchResultsVirtualListProps = {
  voters: VoterWithPartNo[];
  totalCount: number;
  lastSearchType: string | null;
  hasMore: boolean;
  isLoadingMore: boolean;
  isSearching: boolean;
  onSelectVoter: (voter: VoterWithPartNo) => void;
  onLoadMore: () => void;
};

function VoterSearchResultsVirtualList({
  voters,
  totalCount,
  lastSearchType,
  hasMore,
  isLoadingMore,
  isSearching,
  onSelectVoter,
  onLoadMore,
}: VoterSearchResultsVirtualListProps) {
  const { t } = useTranslations();
  const scrollParentRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: voters.length,
    getScrollElement: () => scrollParentRef.current,
    estimateSize: () => ESTIMATED_VOTER_ROW_PX,
    overscan: 6,
  });

  useEffect(() => {
    const root = scrollParentRef.current;
    const target = sentinelRef.current;
    if (!root || !target || !hasMore || isLoadingMore || isSearching) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onLoadMore();
        }
      },
      { root, rootMargin: '240px', threshold: 0 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, isSearching, onLoadMore, voters.length]);

  return (
    <div className="mt-4">
      <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-base font-semibold sm:text-lg">
            {t('backOffice.searchResults')}
          </h3>
          <p className="text-sm text-muted-foreground tabular-nums">
            {voters.length >= totalCount
              ? t('operator.search.totalCountOnly', { count: totalCount })
              : t('operator.search.showingOfTotal', {
                  loaded: voters.length,
                  total: totalCount,
                })}
          </p>
        </div>
        {lastSearchType && (
          <span className="text-xs text-muted-foreground sm:text-right sm:text-sm">
            {t('operator.search.foundBy', {
              type:
                lastSearchType === 'voterId'
                  ? t('backOffice.voterIdType')
                  : lastSearchType === 'phone' || lastSearchType === 'mobileNumber'
                    ? t('operator.search.types.phone')
                    : lastSearchType === 'name'
                      ? t('operator.search.types.name')
                      : t('backOffice.detailsType'),
            })}
          </span>
        )}
      </div>
      {hasMore && voters.length > 0 && (
        <p className="mb-2 text-xs text-muted-foreground">
          {t('operator.search.scrollForMore')}
        </p>
      )}
      <div
        ref={scrollParentRef}
        className="max-h-[min(70vh,560px)] overflow-auto rounded-lg bg-muted/10 p-2 sm:p-3"
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            position: 'relative',
            width: '100%',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const voter = voters[virtualRow.index];
            return (
              <div
                key={virtualRow.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <button
                  type="button"
                  className="w-full rounded-xl border bg-background p-3 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:p-4"
                  onClick={() => onSelectVoter(voter)}
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex-1">
                      <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <p className="break-words text-base font-medium leading-snug sm:text-lg">
                            {voter.fullName}
                          </p>
                          {voter.relationName && voter.relationType && (
                            <p className="break-words text-sm text-muted-foreground">
                              {voter.relationType}: {voter.relationName}
                            </p>
                          )}
                        </div>
                        <span className="inline-flex max-w-full items-center rounded bg-blue-100 px-2 py-1 text-xs font-medium break-all text-blue-800">
                          {voter.epicNumber}
                        </span>
                      </div>
                      <div className="mb-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-2">
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-muted-foreground">
                            {t('backOffice.age')}:
                          </span>
                          <span>{voter.age || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-muted-foreground">
                            {t('backOffice.gender')}:
                          </span>
                          <span>{voter.gender || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {voter.acNo && `AC: ${voter.acNo}`}
                        {voter.wardNo && ` | Ward: ${voter.wardNo}`}
                        {voter.boothName && ` | Booth: ${voter.boothName}`}
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
        {hasMore ? (
          <div
            ref={sentinelRef}
            className="flex min-h-10 items-center justify-center py-2 text-xs text-muted-foreground"
            aria-hidden
          >
            {isLoadingMore ? (
              <span className="inline-flex items-center gap-2">
                <span className="size-4 animate-spin rounded-full border-b-2 border-primary" />
                {t('operator.search.loadingMore')}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

type VoterSearchType = 'voterId' | 'phone' | 'details' | 'outsider';

export type VoterSearchPanelProps = {
  searchEndpoint: string;
  onSelectVoter: (voter: VoterWithPartNo) => void;
  title?: string;
  description?: string;
  /** When true, shows an Outsider option that skips voter lookup. */
  enableOutsider?: boolean;
  isOutsider?: boolean;
  onOutsiderChange?: (isOutsider: boolean) => void;
};

export function VoterSearchPanel({
  searchEndpoint,
  onSelectVoter,
  title,
  description,
  enableOutsider = false,
  isOutsider = false,
  onOutsiderChange,
}: VoterSearchPanelProps) {
  const { t } = useTranslations();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<VoterWithPartNo[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreSearchResults, setHasMoreSearchResults] = useState(false);
  const [searchTotalCount, setSearchTotalCount] = useState(0);
  const loadMoreInFlightRef = useRef(false);
  const [searchType, setSearchType] = useState<VoterSearchType>(
    isOutsider && enableOutsider ? 'outsider' : 'voterId',
  );
  const [lastSearchType, setLastSearchType] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [detailName, setDetailName] = useState('');
  const [gender, setGender] = useState('');
  const [age, setAge] = useState<number | undefined>(undefined);
  const [ageRange, setAgeRange] = useState(5);
  const [showAadhaarScanner, setShowAadhaarScanner] = useState(false);
  const [showEpicScanner, setShowEpicScanner] = useState(false);
  const [showEpicBarcodeScanner, setShowEpicBarcodeScanner] = useState(false);

  useEffect(() => {
    if (!enableOutsider) return;
    if (isOutsider && searchType !== 'outsider') {
      setSearchType('outsider');
    } else if (!isOutsider && searchType === 'outsider') {
      setSearchType('voterId');
    }
  }, [enableOutsider, isOutsider, searchType]);

  const handleSearchTypeChange = (newSearchType: VoterSearchType) => {
    setSearchType(newSearchType);
    setSearchTerm('');
    setDetailName('');
    setGender('');
    setAge(undefined);
    setAgeRange(5);
    setSearchResults([]);
    setHasSearched(false);
    setIsSearching(false);
    setHasMoreSearchResults(false);
    setIsLoadingMore(false);
    loadMoreInFlightRef.current = false;
    setSearchTotalCount(0);
    setLastSearchType(null);
    if (enableOutsider) {
      onOutsiderChange?.(newSearchType === 'outsider');
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setDetailName('');
    setGender('');
    setAge(undefined);
    setAgeRange(5);
    setSearchResults([]);
    setSearchTotalCount(0);
    setHasMoreSearchResults(false);
    setIsLoadingMore(false);
    loadMoreInFlightRef.current = false;
    setLastSearchType(null);
    setHasSearched(false);
    setIsSearching(false);
  };

  const loadMoreSearchResults = useCallback(async () => {
    if (
      !hasMoreSearchResults ||
      isLoadingMore ||
      isSearching ||
      loadMoreInFlightRef.current
    ) {
      return;
    }
    loadMoreInFlightRef.current = true;
    setIsLoadingMore(true);
    try {
      const offset = searchResults.length;
      const effectiveSearchType = lastSearchType ?? searchType;
      const response = await fetch(searchEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchTerm: searchTerm.trim(),
          searchType: effectiveSearchType,
          name: effectiveSearchType === 'details' ? detailName.trim() : undefined,
          gender:
            effectiveSearchType === 'details'
              ? gender === 'any'
                ? undefined
                : gender
              : undefined,
          age: effectiveSearchType === 'details' ? age : undefined,
          ageRange: effectiveSearchType === 'details' ? ageRange : undefined,
          limit: VOTER_SEARCH_PAGE_SIZE,
          offset,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to load more voters');
      }

      const data = await response.json();
      const next = (data.voters || []) as VoterWithPartNo[];
      setSearchResults((prev) => [...prev, ...next]);
      setHasMoreSearchResults(!!data.hasMore);
      if (typeof data.totalCount === 'number') {
        setSearchTotalCount(data.totalCount);
      }
    } catch {
      toast({
        type: 'error',
        description: t('operator.messages.failedToSearch'),
      });
    } finally {
      setIsLoadingMore(false);
      loadMoreInFlightRef.current = false;
    }
  }, [
    age,
    ageRange,
    detailName,
    gender,
    hasMoreSearchResults,
    isLoadingMore,
    isSearching,
    lastSearchType,
    searchEndpoint,
    searchResults.length,
    searchTerm,
    searchType,
    t,
  ]);

  const handleSearch = useCallback(
    async (overrides?: SearchOverrides) => {
      const effectiveSearchType = overrides?.forceVoterId
        ? 'voterId'
        : overrides?.forceDetails
          ? 'details'
          : searchType;
      const effectiveName = overrides?.name ?? detailName;
      const effectiveGender = overrides?.gender ?? gender;
      const effectiveAge = overrides?.age !== undefined ? overrides.age : age;
      const effectiveAgeRange = overrides?.ageRange ?? ageRange;
      const trimmedTerm = (overrides?.searchTerm ?? searchTerm).trim();

      if (effectiveSearchType === 'details') {
        if (
          !effectiveName.trim() &&
          (!effectiveGender || effectiveGender === 'any') &&
          effectiveAge === undefined
        ) {
          toast({
            type: 'error',
            description: t('operator.messages.pleaseProvideCriteria'),
          });
          return;
        }
      } else {
        if (!trimmedTerm) {
          toast({
            type: 'error',
            description: t('operator.messages.pleaseEnterVoterId'),
          });
          return;
        }
        if (effectiveSearchType === 'phone' && !isValidIndianMobile(trimmedTerm)) {
          toast({
            type: 'error',
            description: t('operator.messages.invalidIndianMobile'),
          });
          return;
        }
      }

      const runSearch = async (typeToUse: 'voterId' | 'phone' | 'details') => {
        const response = await fetch(searchEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            searchTerm: typeToUse === 'details' ? '' : trimmedTerm,
            searchType: typeToUse,
            name:
              typeToUse === 'details'
                ? effectiveSearchType === 'details'
                  ? effectiveName.trim()
                  : trimmedTerm
                : undefined,
            gender:
              typeToUse === 'details'
                ? effectiveGender === 'any'
                  ? undefined
                  : effectiveGender
                : undefined,
            age: typeToUse === 'details' ? effectiveAge : undefined,
            ageRange: typeToUse === 'details' ? effectiveAgeRange : undefined,
            limit: VOTER_SEARCH_PAGE_SIZE,
            offset: 0,
          }),
        });

        if (!response.ok) {
          const json = await response.json().catch(() => ({}));
          throw new Error(json.error || 'Failed to search voters');
        }

        return (await response.json()) as {
          voters: VoterWithPartNo[];
          hasMore?: boolean;
          totalCount?: number;
          searchType?: string;
        };
      };

      setIsSearching(true);
      setHasSearched(true);
      setHasMoreSearchResults(false);
      setLastSearchType(null);

      try {
        const searchOrder: Array<'voterId' | 'phone' | 'details'> =
          effectiveSearchType === 'details' ? ['details'] : ['voterId', 'phone', 'details'];

        let finalData: {
          voters: VoterWithPartNo[];
          hasMore?: boolean;
          totalCount?: number;
          searchType?: string;
        } | null = null;
        let finalType: string = effectiveSearchType;

        for (const typeToUse of searchOrder) {
          if (effectiveSearchType === 'phone' && typeToUse === 'voterId') continue;

          const data = await runSearch(typeToUse);
          finalData = data;
          finalType = data.searchType ?? typeToUse;
          if ((data.voters || []).length > 0 || typeToUse === 'details') {
            break;
          }
        }

        const voters = finalData?.voters || [];
        setSearchResults(voters);
        setHasMoreSearchResults(!!finalData?.hasMore);
        const total =
          typeof finalData?.totalCount === 'number' ? finalData.totalCount : voters.length;
        setSearchTotalCount(total);
        setLastSearchType(finalType);

        const searchTypeText =
          finalType === 'voterId'
            ? t('operator.search.types.voterId')
            : finalType === 'phone' || finalType === 'mobileNumber'
              ? t('operator.search.types.phone')
              : t('backOffice.detailsType');

        if (voters.length === 0) {
          toast({
            type: 'error',
            description: t('operator.messages.noVotersFound', { type: searchTypeText }),
          });
        } else {
          toast({
            type: 'success',
            description: t('operator.messages.votersFound', {
              count: total,
              type: searchTypeText,
            }),
          });
        }
      } catch (error) {
        toast({
          type: 'error',
          description:
            error instanceof Error ? error.message : t('operator.messages.failedToSearch'),
        });
      } finally {
        setIsSearching(false);
      }
    },
    [age, ageRange, detailName, gender, searchEndpoint, searchTerm, searchType, t],
  );

  const handleAadhaarDataDetected = useCallback(
    (data: AadhaarQrData) => {
      const mappedGender = mapAadhaarGenderToSearchValue(data.gender);
      const calculatedAge = ageFromAadhaarDob(data.dateOfBirth);

      setSearchType('details');
      setDetailName(data.name);
      if (mappedGender) setGender(mappedGender);
      if (calculatedAge !== undefined) setAge(calculatedAge);

      void handleSearch({
        name: data.name,
        gender: mappedGender || gender,
        age: calculatedAge ?? age,
        ageRange,
        forceDetails: true,
      });
    },
    [age, ageRange, gender, handleSearch],
  );

  const handleEpicDataDetected = useCallback(
    (data: EpicQrData) => {
      setSearchType('voterId');
      setSearchTerm(data.epic);
      void handleSearch({ searchTerm: data.epic, forceVoterId: true });
    },
    [handleSearch],
  );

  const handleEpicBarcodeDetected = useCallback(
    (epic: string) => {
      setSearchType('voterId');
      setSearchTerm(epic);
      void handleSearch({ searchTerm: epic, forceVoterId: true });
    },
    [handleSearch],
  );

  return (
    <div className="space-y-4">
      {(title || description) && (
        <div>
          {title ? <h3 className="text-lg font-semibold">{title}</h3> : null}
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
      )}

      <div
        className={`grid grid-cols-1 gap-3 ${enableOutsider ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-3'}`}
      >
        <div className="flex items-center space-x-2 rounded-lg border p-3 transition-colors hover:bg-muted/50">
          <input
            type="radio"
            id="visitor-search-voterId"
            name="visitorSearchType"
            value="voterId"
            checked={searchType === 'voterId'}
            onChange={(e) => handleSearchTypeChange(e.target.value as VoterSearchType)}
            className="size-4"
          />
          <Label htmlFor="visitor-search-voterId" className="flex-1 cursor-pointer text-sm font-medium">
            {t('operator.search.types.voterId')}
          </Label>
        </div>
        <div className="flex items-center space-x-2 rounded-lg border p-3 transition-colors hover:bg-muted/50">
          <input
            type="radio"
            id="visitor-search-phone"
            name="visitorSearchType"
            value="phone"
            checked={searchType === 'phone'}
            onChange={(e) => handleSearchTypeChange(e.target.value as VoterSearchType)}
            className="size-4"
          />
          <Label htmlFor="visitor-search-phone" className="flex-1 cursor-pointer text-sm font-medium">
            {t('operator.search.types.phone')}
          </Label>
        </div>
        <div className="flex items-center space-x-2 rounded-lg border p-3 transition-colors hover:bg-muted/50">
          <input
            type="radio"
            id="visitor-search-details"
            name="visitorSearchType"
            value="details"
            checked={searchType === 'details'}
            onChange={(e) => handleSearchTypeChange(e.target.value as VoterSearchType)}
            className="size-4"
          />
          <Label
            htmlFor="visitor-search-details"
            className="flex-1 cursor-pointer text-sm font-medium"
          >
            {t('operator.search.types.detailed')}
          </Label>
        </div>
        {enableOutsider && (
          <div className="flex items-center space-x-2 rounded-lg border p-3 transition-colors hover:bg-muted/50">
            <input
              type="radio"
              id="visitor-search-outsider"
              name="visitorSearchType"
              value="outsider"
              checked={searchType === 'outsider'}
              onChange={(e) => handleSearchTypeChange(e.target.value as VoterSearchType)}
              className="size-4"
            />
            <Label
              htmlFor="visitor-search-outsider"
              className="flex-1 cursor-pointer text-sm font-medium"
            >
              {t('operator.search.types.outsider')}
            </Label>
          </div>
        )}
      </div>

      {searchType === 'outsider' ? (
        <div className="rounded-lg border border-dashed bg-muted/20 p-4">
          <p className="text-sm text-muted-foreground">{t('operator.search.outsiderHelp')}</p>
        </div>
      ) : searchType === 'details' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <Label htmlFor="visitor-detail-name">{t('backOffice.nameOptional')}</Label>
                <AadhaarQrScanButton
                  onClick={() => setShowAadhaarScanner(true)}
                  label={t('operator.search.scanAadhaarQr')}
                />
              </div>
              <Input
                id="visitor-detail-name"
                value={detailName}
                onChange={(e) => setDetailName(e.target.value)}
                placeholder={t('operator.search.namePlaceholder')}
                type="text"
              />
            </div>
            <div>
              <Label htmlFor="visitor-detail-gender">{t('backOffice.genderOptional')}</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger id="visitor-detail-gender">
                  <SelectValue placeholder={t('backOffice.selectGender')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">{t('backOffice.anyGender')}</SelectItem>
                  <SelectItem value="M">{t('backOffice.male')}</SelectItem>
                  <SelectItem value="F">{t('backOffice.female')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="visitor-detail-age">{t('backOffice.ageYears')}</Label>
              <Input
                id="visitor-detail-age"
                type="number"
                min={1}
                max={150}
                value={age ?? ''}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (!raw) {
                    setAge(undefined);
                    return;
                  }
                  const parsed = Number.parseInt(raw, 10);
                  if (!Number.isFinite(parsed) || parsed <= 0) {
                    setAge(undefined);
                    return;
                  }
                  setAge(Math.min(Math.max(parsed, 1), 150));
                }}
                placeholder={t('backOffice.enterAge')}
                className="w-full"
              />
            </div>
            <div>
              <Label htmlFor="visitor-detail-age-range">
                {t('backOffice.ageRange', { range: ageRange })}
              </Label>
              <Slider
                id="visitor-detail-age-range"
                min={0}
                max={20}
                step={1}
                value={[ageRange]}
                onValueChange={(value: number[]) => setAgeRange(value[0])}
                disabled={age === undefined}
                className="w-full"
              />
              {age === undefined ? (
                <p className="mt-1 text-sm text-muted-foreground">{t('backOffice.enterAge')}</p>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">
                  {t('backOffice.searchRange', { min: age - ageRange, max: age + ageRange })}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              onClick={() => void handleSearch()}
              disabled={isSearching}
              className="flex-1"
            >
              {isSearching ? t('operator.search.searching') : t('common.search')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={clearSearch}
              className="px-4 sm:w-auto"
            >
              {t('backOffice.clear')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <Label htmlFor="visitor-search-term">
                {searchType === 'voterId'
                  ? t('backOffice.voterIdEpicNumber')
                  : t('operator.search.types.phone')}
              </Label>
              {searchType === 'voterId' && (
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <EpicQrScanButton
                    onClick={() => setShowEpicScanner(true)}
                    label={t('operator.search.scanEpicQr')}
                  />
                  <EpicBarcodeScanButton
                    onClick={() => setShowEpicBarcodeScanner(true)}
                    label={t('operator.search.scanEpicBarcode')}
                  />
                </div>
              )}
            </div>
            <div className="relative">
              <Input
                id="visitor-search-term"
                value={searchTerm}
                onChange={(e) => {
                  const next = e.target.value;
                  setSearchTerm(
                    searchType === 'phone'
                      ? next.replace(/\D/g, '').slice(0, 10)
                      : next,
                  );
                }}
                placeholder={
                  searchType === 'voterId'
                    ? t('operator.search.voterIdPlaceholder')
                    : t('operator.search.phonePlaceholder')
                }
                type={searchType === 'phone' ? 'tel' : 'text'}
                inputMode={searchType === 'phone' ? 'numeric' : undefined}
                autoComplete={searchType === 'phone' ? 'tel' : undefined}
                maxLength={searchType === 'phone' ? 10 : undefined}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void handleSearch();
                  }
                }}
                className="pr-10"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Clear search"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              onClick={() => void handleSearch()}
              disabled={isSearching}
              className="flex-1"
            >
              {isSearching ? t('operator.search.searching') : t('common.search')}
            </Button>
            {searchTerm && (
              <Button
                type="button"
                variant="outline"
                onClick={clearSearch}
                className="px-4 sm:w-auto"
              >
                {t('backOffice.clear')}
              </Button>
            )}
          </div>
        </div>
      )}

      {searchResults.length > 0 && (
        <VoterSearchResultsVirtualList
          voters={searchResults}
          totalCount={searchTotalCount}
          lastSearchType={lastSearchType}
          hasMore={hasMoreSearchResults}
          isLoadingMore={isLoadingMore}
          isSearching={isSearching}
          onSelectVoter={(voter) => {
            onSelectVoter(voter);
            clearSearch();
          }}
          onLoadMore={loadMoreSearchResults}
        />
      )}

      {isSearching && (
        <div className="mt-4 rounded-lg border border-muted-foreground/25 bg-muted/10 p-6">
          <div className="flex items-center justify-center gap-3">
            <div className="size-5 animate-spin rounded-full border-b-2 border-primary" />
            <p className="text-sm text-muted-foreground">{t('backOffice.searchingVoters')}</p>
          </div>
        </div>
      )}

      {hasSearched && !isSearching && searchResults.length === 0 && (
        <div className="mt-4 rounded-lg border border-muted-foreground/25 bg-muted/20 p-4">
          <div className="flex items-center gap-3">
            <div className="text-muted-foreground">
              <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">
                {t('operator.search.noResults')}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('operator.search.noResultsHelp')}
              </p>
            </div>
          </div>
        </div>
      )}

      <AadhaarQrScannerDialog
        open={showAadhaarScanner}
        onOpenChange={setShowAadhaarScanner}
        onDataDetected={handleAadhaarDataDetected}
        title={t('operator.search.aadhaarScannerTitle')}
        description={t('operator.search.aadhaarScannerDescription')}
      />
      <EpicQrScannerDialog
        open={showEpicScanner}
        onOpenChange={setShowEpicScanner}
        onDataDetected={handleEpicDataDetected}
        title={t('operator.search.epicScannerTitle')}
        description={t('operator.search.epicScannerDescription')}
        uploadLabel={t('operator.search.uploadEpicPhoto')}
      />
      <EpicBarcodeScannerDialog
        open={showEpicBarcodeScanner}
        onOpenChange={setShowEpicBarcodeScanner}
        onEpicDetected={handleEpicBarcodeDetected}
        title={t('operator.search.epicBarcodeScannerTitle')}
        description={t('operator.search.epicBarcodeScannerDescription')}
        uploadLabel={t('operator.search.uploadEpicPhoto')}
      />
    </div>
  );
}
