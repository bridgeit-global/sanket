'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SidebarToggle } from '@/components/sidebar-toggle';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { toast } from '@/components/toast';
import { BeneficiaryServiceForm } from '@/components/beneficiary-service-form';
import { PhoneUpdateForm, type MobileNumberEntry } from '@/components/phone-update-form';
import { TaskManagement } from '@/components/task-management';
import { useTranslations } from '@/hooks/use-translations';
import { Share2 } from 'lucide-react';
import type { VoterWithPartNo, BeneficiaryService } from '@/lib/db/schema';
import { buildThermalTicketText, shareThermalTicketPdf } from '@/lib/thermal/receipt';

const VOTER_SEARCH_PAGE_SIZE = 50;
const ESTIMATED_VOTER_ROW_PX = 144;

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
            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3 mb-2">
                <div className="flex flex-col gap-0.5">
                    <h3 className="text-base sm:text-lg font-semibold">{t('backOffice.searchResults')}</h3>
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
                    <span className="text-xs sm:text-sm text-muted-foreground sm:text-right">
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
                <p className="text-xs text-muted-foreground mb-2">{t('operator.search.scrollForMore')}</p>
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
                                    className="w-full rounded-xl border bg-background p-3 sm:p-4 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    onClick={() => onSelectVoter(voter)}
                                >
                                    <div className="flex flex-col gap-2">
                                        <div className="flex-1">
                                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-2">
                                                <div className="flex min-w-0 flex-col gap-0.5">
                                                    <p className="font-medium text-base sm:text-lg leading-snug break-words">
                                                        {voter.fullName}
                                                    </p>
                                                    {voter.relationName && voter.relationType && (
                                                        <p className="text-sm text-muted-foreground break-words">
                                                            {voter.relationType}: {voter.relationName}
                                                        </p>
                                                    )}
                                                </div>
                                                <span className="inline-flex max-w-full items-center rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 break-all">
                                                    {voter.epicNumber}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-2 gap-2 text-sm mb-2">
                                                <div className="flex items-center gap-1">
                                                    <span className="font-medium text-muted-foreground">{t('backOffice.age')}:</span>
                                                    <span>{voter.age || 'N/A'}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <span className="font-medium text-muted-foreground">{t('backOffice.gender')}:</span>
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
                                <span className="animate-spin rounded-full size-4 border-b-2 border-primary" />
                                {t('operator.search.loadingMore')}
                            </span>
                        ) : null}
                    </div>
                ) : null}
            </div>
        </div>
    );
}

export function BeneficiaryManagement() {
    const { t } = useTranslations();
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<VoterWithPartNo[]>([]);
    const [selectedVoter, setSelectedVoter] = useState<VoterWithPartNo | null>(null);
    const [selectedVoterMobileNumbers, setSelectedVoterMobileNumbers] = useState<MobileNumberEntry[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMoreSearchResults, setHasMoreSearchResults] = useState(false);
    const [searchTotalCount, setSearchTotalCount] = useState(0);
    const loadMoreInFlightRef = useRef(false);
    const [searchType, setSearchType] = useState<'voterId' | 'phone' | 'details'>('details');
    const [lastSearchType, setLastSearchType] = useState<string | null>(null);
    const [hasSearched, setHasSearched] = useState(false);

    // Detailed search parameters
    const [name, setName] = useState('');
    const [gender, setGender] = useState('');
    const [age, setAge] = useState<number | undefined>(undefined);
    const [ageRange, setAgeRange] = useState<number>(5);
    const [showBeneficiaryService, setShowBeneficiaryService] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [showPhoneUpdate, setShowPhoneUpdate] = useState(false);
    const [serviceData, setServiceData] = useState<any>(null);
    const [createdService, setCreatedService] = useState<BeneficiaryService | null>(null);
    const [workflowStep, setWorkflowStep] = useState<'search' | 'phoneUpdate' | 'service' | 'confirmation' | 'completed' | 'tasks'>('search');
    const [activeTab, setActiveTab] = useState<'create' | 'manage'>('create');

    // Helper function to clear search state when switching tabs
    const clearSearchStateIfNeeded = () => {
        if (searchTerm || searchResults.length > 0 || hasSearched || isSearching) {
            setSearchTerm('');
            setSearchResults([]);
            setHasSearched(false);
            setIsSearching(false);
            setHasMoreSearchResults(false);
            setIsLoadingMore(false);
            loadMoreInFlightRef.current = false;
            setSearchTotalCount(0);
            setLastSearchType(null);
        }
    };

    // Handler for search type changes - clears input and voter data
    const handleSearchTypeChange = (newSearchType: 'voterId' | 'phone' | 'details') => {
        setSearchType(newSearchType);
        // Clear search input and any selected voter data
        setSearchTerm('');
        setName('');
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
        setSelectedVoter(null);
        setSelectedVoterMobileNumbers([]);
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
            const response = await fetch('/operator/api/search-voter', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    searchTerm: searchTerm.trim(),
                    searchType: searchType,
                    name: searchType === 'details' ? name.trim() : undefined,
                    gender: searchType === 'details' ? (gender === 'any' ? undefined : gender) : undefined,
                    age: searchType === 'details' ? age : undefined,
                    ageRange: searchType === 'details' ? ageRange : undefined,
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
        gender,
        hasMoreSearchResults,
        isLoadingMore,
        isSearching,
        name,
        searchResults.length,
        searchTerm,
        searchType,
        t,
    ]);

    const handleSearch = async () => {
        if (searchType === 'details') {
            if (!name.trim() && (!gender || gender === 'any') && age === undefined) {
                toast({
                    type: 'error',
                    description: t('operator.messages.pleaseProvideCriteria'),
                });
                return;
            }
        } else {
            if (!searchTerm.trim()) {
                toast({
                    type: 'error',
                    description: t('operator.messages.pleaseEnterVoterId'),
                });
                return;
            }
        }

        setIsSearching(true);
        setHasSearched(true);
        setHasMoreSearchResults(false);
        try {
            const response = await fetch('/operator/api/search-voter', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    searchTerm: searchTerm.trim(),
                    searchType: searchType,
                    name: searchType === 'details' ? name.trim() : undefined,
                    gender: searchType === 'details' ? (gender === 'any' ? undefined : gender) : undefined,
                    age: searchType === 'details' ? age : undefined,
                    ageRange: searchType === 'details' ? ageRange : undefined,
                    limit: VOTER_SEARCH_PAGE_SIZE,
                    offset: 0,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to search voters');
            }

            const data = await response.json();
            setSearchResults(data.voters || []);
            setHasMoreSearchResults(!!data.hasMore);
            const total =
                typeof data.totalCount === 'number' ? data.totalCount : (data.voters || []).length;
            setSearchTotalCount(total);
            setLastSearchType(data.searchType || searchType);

            if (data.voters.length === 0) {
                const searchTypeText = data.searchType === 'voterId' ? t('operator.search.types.voterId') :
                    data.searchType === 'phone' ? t('operator.search.types.phone') : t('backOffice.detailsType');
                toast({
                    type: 'error',
                    description: t('operator.messages.noVotersFound', { type: searchTypeText }),
                });
            } else {
                const searchTypeText = data.searchType === 'voterId' ? t('operator.search.types.voterId') :
                    data.searchType === 'phone' ? t('operator.search.types.phone') : t('backOffice.detailsType');
                toast({
                    type: 'success',
                    description: t('operator.messages.votersFound', { count: total, type: searchTypeText }),
                });
            }
        } catch (error) {
            toast({
                type: 'error',
                description: t('operator.messages.failedToSearch'),
            });
        } finally {
            setIsSearching(false);
        }
    };

    const handleSelectVoter = (voter: VoterWithPartNo) => {
        setSelectedVoter(voter);
        setSelectedVoterMobileNumbers([]);
        setSearchResults([]);
        setSearchTotalCount(0);
        setSearchTerm('');

        // Always show phone update form to allow updating phone numbers even if they exist
        setShowPhoneUpdate(true);
        clearSearchStateIfNeeded();
        setWorkflowStep('phoneUpdate');

        fetch(`/api/voter/${encodeURIComponent(voter.epicNumber)}/mobile-numbers`)
            .then(async (response) => {
                if (!response.ok) {
                    throw new Error('Failed to load voter contact numbers');
                }
                const data = await response.json();
                if (data?.success && Array.isArray(data.voterMobileNumbers)) {
                    setSelectedVoterMobileNumbers(data.voterMobileNumbers);
                }
            })
            .catch((error) => {
                console.error('Error loading voter contact numbers:', error);
            });
    };

    const handlePhoneUpdate = async (phoneData: { mobileNoPrimary: string; mobileNoSecondary?: string }) => {
        if (!selectedVoter) return;

        try {
            const response = await fetch('/operator/api/update-voter-phone', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    epicNumber: selectedVoter.epicNumber,
                    ...phoneData,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to update phone number');
            }

            const updatedVoter = await response.json();
            setSelectedVoter((prev) => (prev ? { ...prev, ...updatedVoter } : updatedVoter));
            const updatedMobileNumbers: MobileNumberEntry[] = [
                {
                    mobileNumber: phoneData.mobileNoPrimary.trim(),
                    sortOrder: 1,
                },
            ];
            if (phoneData.mobileNoSecondary?.trim()) {
                updatedMobileNumbers.push({
                    mobileNumber: phoneData.mobileNoSecondary.trim(),
                    sortOrder: 2,
                });
            }
            setSelectedVoterMobileNumbers(updatedMobileNumbers);
            setShowPhoneUpdate(false);
            setShowBeneficiaryService(true);
            setWorkflowStep('service');
            toast({
                type: 'success',
                description: t('operator.messages.phoneUpdatedSuccess'),
            });
        } catch (error) {
            console.error('Error updating phone number:', error);
            toast({
                type: 'error',
                description: t('operator.messages.phoneUpdateFailed'),
            });
        }
    };

    const handleSkipPhoneUpdate = () => {
        setShowPhoneUpdate(false);
        setShowBeneficiaryService(true);
        setWorkflowStep('service');
    };

    const handleServiceDataReady = (data: any) => {
        setServiceData(data);
        setShowBeneficiaryService(false);
        setShowConfirmation(true);
        clearSearchStateIfNeeded();
        setWorkflowStep('confirmation');
    };

    const handleConfirmService = async () => {
        if (!serviceData || !selectedVoter) {
            toast({
                type: 'error',
                description: t('operator.messages.serviceDataMissing'),
            });
            return;
        }

        try {
            const response = await fetch('/operator/api/create-beneficiary-service', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...serviceData,
                    voterId: selectedVoter.epicNumber,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create beneficiary service');
            }

            const result = await response.json();
            setCreatedService(result.service);
            setShowConfirmation(false);
            clearSearchStateIfNeeded();
            setWorkflowStep('completed');
            toast({
                type: 'success',
                description: t('operator.messages.serviceCreatedSuccess'),
            });
        } catch (error) {
            console.error('Error creating service:', error);
            toast({
                type: 'error',
                description: t('operator.messages.serviceCreateFailed'),
            });
        }
    };

    const handleStartNew = () => {
        setSelectedVoter(null);
        setSelectedVoterMobileNumbers([]);
        setSearchResults([]);
        setSearchTotalCount(0);
        setHasMoreSearchResults(false);
        setIsLoadingMore(false);
        loadMoreInFlightRef.current = false;
        setSearchTerm('');
        setHasSearched(false);
        setIsSearching(false);
        setShowBeneficiaryService(false);
        setShowConfirmation(false);
        setShowPhoneUpdate(false);
        setServiceData(null);
        setCreatedService(null);
        setWorkflowStep('search');
    };

    const handleShareThermalTicket = async () => {
        if (!createdService || !selectedVoter) return;

        const receiptText = buildThermalTicketText({
            token: createdService.token,
            createdAt: createdService.createdAt,
            name: selectedVoter.fullName ?? 'Beneficiary',
            mobile: selectedVoterMobileNumbers[0]?.mobileNumber ?? null,
            serviceName: createdService.serviceName,
            width: 32,
        });

        const outcome = await shareThermalTicketPdf(
            receiptText,
            `thermal-ticket-${createdService.token.toLowerCase()}`,
            { headerImageUrl: '/images/ncp_election_symbol.png', qrValue: createdService.token, paperWidthMm: 88 }
        );

        if (outcome === 'downloaded') {
            toast({
                type: 'success',
                description: 'Ticket PDF downloaded. Share it to your thermal printer app.',
            });
        }
    };

    const handleCancel = () => {
        setShowBeneficiaryService(false);
        setShowConfirmation(false);
        setShowPhoneUpdate(false);
        setServiceData(null);
        setSelectedVoterMobileNumbers([]);
        setWorkflowStep('search');
    };

    return (
        <div className="space-y-6">
            {/* Header with Sign Out */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3 sm:items-center">
                    <SidebarToggle />
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold">{t('operator.dashboard.title')}</h1>
                        <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">
                            {t('operator.dashboard.subtitle')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex space-x-1 bg-muted p-1 rounded-lg">
                <Button
                    variant={activeTab === 'create' ? 'default' : 'ghost'}
                    onClick={() => {
                        setActiveTab('create');
                        setWorkflowStep('search');
                    }}
                    className="flex-1 text-sm sm:text-base"
                >
                    <span className="hidden sm:inline">{t('operator.tabs.createService')}</span>
                    <span className="sm:hidden">{t('operator.tabs.create')}</span>
                </Button>
                <Button
                    variant={activeTab === 'manage' ? 'default' : 'ghost'}
                    onClick={() => {
                        setActiveTab('manage');
                        setWorkflowStep('tasks');
                    }}
                    className="flex-1 text-sm sm:text-base"
                >
                    <span className="hidden sm:inline">{t('operator.tabs.manageTasks')}</span>
                    <span className="sm:hidden">{t('operator.tabs.manage')}</span>
                </Button>
            </div>

            {/* Task Management Section */}
            {activeTab === 'manage' && (
                <TaskManagement />
            )}

            {/* Workflow Progress Indicator */}
            {activeTab === 'create' && workflowStep !== 'search' && (
                <Card>
                    <CardContent className="pt-6">
                        <div className="hidden sm:flex items-center space-x-4">
                            <div className={`flex items-center space-x-2 ${workflowStep === 'phoneUpdate' ? 'text-blue-600' : workflowStep === 'service' || workflowStep === 'confirmation' || workflowStep === 'completed' ? 'text-green-600' : 'text-gray-500'}`}>
                                <div className={`size-6 rounded-full flex items-center justify-center text-sm font-medium ${workflowStep === 'phoneUpdate' ? 'bg-blue-100 text-blue-600' : workflowStep === 'service' || workflowStep === 'confirmation' || workflowStep === 'completed' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                                    1
                                </div>
                                <span className="text-sm font-medium">{t('operator.workflow.phoneUpdate')}</span>
                            </div>
                            <div className="flex-1 h-px bg-gray-200" />
                            <div className={`flex items-center space-x-2 ${workflowStep === 'service' ? 'text-blue-600' : workflowStep === 'confirmation' || workflowStep === 'completed' ? 'text-green-600' : 'text-gray-500'}`}>
                                <div className={`size-6 rounded-full flex items-center justify-center text-sm font-medium ${workflowStep === 'service' ? 'bg-blue-100 text-blue-600' : workflowStep === 'confirmation' || workflowStep === 'completed' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                                    2
                                </div>
                                <span className="text-sm font-medium">{t('operator.workflow.serviceDetails')}</span>
                            </div>
                            <div className="flex-1 h-px bg-gray-200" />
                            <div className={`flex items-center space-x-2 ${workflowStep === 'confirmation' ? 'text-blue-600' : workflowStep === 'completed' ? 'text-green-600' : 'text-gray-500'}`}>
                                <div className={`size-6 rounded-full flex items-center justify-center text-sm font-medium ${workflowStep === 'confirmation' ? 'bg-blue-100 text-blue-600' : workflowStep === 'completed' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                                    3
                                </div>
                                <span className="text-sm font-medium">{t('operator.workflow.confirmation')}</span>
                            </div>
                            <div className="flex-1 h-px bg-gray-200" />
                            <div className={`flex items-center space-x-2 ${workflowStep === 'completed' ? 'text-green-600' : 'text-gray-500'}`}>
                                <div className={`size-6 rounded-full flex items-center justify-center text-sm font-medium ${workflowStep === 'completed' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                                    4
                                </div>
                                <span className="text-sm font-medium">{t('operator.workflow.tokenGenerated')}</span>
                            </div>
                        </div>

                        {/* Mobile Progress Indicator */}
                        <div className="sm:hidden space-y-2">
                            <div className="flex items-center justify-between text-xs">
                                <span>{t('operator.workflow.step', { current: workflowStep === 'phoneUpdate' ? '1' : workflowStep === 'service' ? '2' : workflowStep === 'confirmation' ? '3' : '4', total: '4' })}</span>
                                <span className="text-muted-foreground">
                                    {workflowStep === 'phoneUpdate' ? t('operator.workflow.phoneUpdate') :
                                        workflowStep === 'service' ? t('operator.workflow.serviceDetails') :
                                            workflowStep === 'confirmation' ? t('operator.workflow.confirmation') : t('operator.workflow.tokenGenerated')}
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                    style={{
                                        width: `${workflowStep === 'phoneUpdate' ? 25 :
                                            workflowStep === 'service' ? 50 :
                                                workflowStep === 'confirmation' ? 75 : 100}%`
                                    }}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Create Service Workflow */}
            {activeTab === 'create' && (
                <>
                    {/* Phone Update Form */}
                    {showPhoneUpdate && selectedVoter && (
                        <PhoneUpdateForm
                            voter={selectedVoter}
                            mobileNumbers={selectedVoterMobileNumbers}
                            onPhoneUpdate={handlePhoneUpdate}
                            onSkip={handleSkipPhoneUpdate}
                            onCancel={handleCancel}
                        />
                    )}

                    {/* Beneficiary Service Form */}
                    {showBeneficiaryService && selectedVoter && (
                        <BeneficiaryServiceForm
                            voter={selectedVoter}
                            onServiceCreated={() => { }} // Not used in confirmation flow
                            onServiceDataReady={handleServiceDataReady}
                            onCancel={handleCancel}
                        />
                    )}

                    {/* Confirmation Step */}
                    {showConfirmation && selectedVoter && serviceData && (
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('operator.confirmation.title')}</CardTitle>
                                <CardDescription>
                                    {t('operator.confirmation.description')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Voter Information */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold">{t('operator.confirmation.voterInfo')}</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                                        <div>
                                            <Label className="text-sm font-medium">Name</Label>
                                            <p>{selectedVoter.fullName}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium">EPIC Number</Label>
                                            <p>{selectedVoter.epicNumber}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium">Mobile Primary</Label>
                                            <p>
                                                {selectedVoterMobileNumbers.find((entry) => entry.sortOrder === 1)?.mobileNumber ||
                                                    'Not set'}
                                            </p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium">Mobile Secondary</Label>
                                            <p>
                                                {selectedVoterMobileNumbers.find((entry) => entry.sortOrder === 2)?.mobileNumber ||
                                                    'Not set'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Service Information */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold">{t('operator.confirmation.serviceDetails')}</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                                        <div>
                                            <Label className="text-sm font-medium">{t('operator.confirmation.serviceType')}</Label>
                                            <p className="capitalize">{serviceData.serviceType}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium">{t('operator.confirmation.serviceName')}</Label>
                                            <p>{serviceData.serviceName}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium">{t('operator.confirmation.priority')}</Label>
                                            <p className="capitalize">{serviceData.priority || 'Medium'}</p>
                                        </div>
                                        {serviceData.description && (
                                            <div className="md:col-span-2">
                                                <Label className="text-sm font-medium">{t('operator.confirmation.description')}</Label>
                                                <p>{serviceData.description}</p>
                                            </div>
                                        )}
                                        {serviceData.notes && (
                                            <div className="md:col-span-2">
                                                <Label className="text-sm font-medium">{t('operator.confirmation.notes')}</Label>
                                                <p>{serviceData.notes}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
                                    <Button onClick={handleConfirmService} className="flex-1">
                                        {t('operator.confirmation.confirmButton')}
                                    </Button>
                                    <Button variant="outline" onClick={handleCancel} className="sm:w-auto">
                                        {t('common.cancel')}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Completion Step */}
                    {workflowStep === 'completed' && createdService && selectedVoter && (
                        <Card className="service-completion-print">
                            {/* On-screen completion UI (hidden when printing) */}
                            <CardHeader className="screen-only">
                                <CardTitle className="text-green-600">{t('operator.completion.title')}</CardTitle>
                                <CardDescription>
                                    {t('operator.completion.description')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6 screen-only">
                                {/* Token Display */}
                                <div className="text-center space-y-4 token-display">
                                    <div className="p-6 bg-green-50 border-2 border-green-200 rounded-lg">
                                        <Label className="text-sm font-medium text-green-800">{t('operator.completion.referenceToken')}</Label>
                                        <p className="text-2xl font-bold text-green-900 mt-2">{createdService.token}</p>
                                        <p className="text-sm text-green-700 mt-2">
                                            {t('operator.completion.saveToken')}
                                        </p>
                                    </div>
                                </div>

                                {/* Service Summary */}
                                <div className="space-y-4 service-summary">
                                    <h3 className="text-lg font-semibold">{t('operator.completion.serviceSummary')}</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted rounded-lg summary-grid">
                                        <div className="summary-item">
                                            <Label className="text-sm font-medium">{t('operator.completion.serviceId')}</Label>
                                            <p className="font-mono text-sm">{createdService.id}</p>
                                        </div>
                                        <div className="summary-item">
                                            <Label className="text-sm font-medium">{t('operator.completion.token')}</Label>
                                            <p className="font-mono text-sm">{createdService.token}</p>
                                        </div>
                                        <div className="summary-item">
                                            <Label className="text-sm font-medium">{t('operator.confirmation.serviceType')}</Label>
                                            <p className="capitalize">{createdService.serviceType}</p>
                                        </div>
                                        <div className="summary-item">
                                            <Label className="text-sm font-medium">{t('operator.confirmation.serviceName')}</Label>
                                            <p>{createdService.serviceName}</p>
                                        </div>
                                        <div className="summary-item">
                                            <Label className="text-sm font-medium">{t('operator.completion.status')}</Label>
                                            <p className="capitalize">{createdService.status}</p>
                                        </div>
                                        <div className="summary-item">
                                            <Label className="text-sm font-medium">{t('operator.confirmation.priority')}</Label>
                                            <p className="capitalize">{createdService.priority}</p>
                                        </div>
                                        <div className="summary-item">
                                            <Label className="text-sm font-medium">{t('operator.completion.createdAt')}</Label>
                                            <p>{new Date(createdService.createdAt).toLocaleString()}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 no-print">
                                    <Button onClick={handleStartNew} className="flex-1">
                                        {t('operator.completion.createAnother')}
                                    </Button>
                                    <Button onClick={handleShareThermalTicket} className="flex-1">
                                        <Share2 className="mr-2 h-4 w-4" />
                                        Share Thermal Ticket
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Search Section */}
                    {workflowStep === 'search' && (
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('operator.search.title')}</CardTitle>
                                <CardDescription className="text-sm">
                                    {t('operator.search.description')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {/* Search Type Selection */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                            <input
                                                type="radio"
                                                id="details"
                                                name="searchType"
                                                value="details"
                                                checked={searchType === 'details'}
                                                onChange={(e) => handleSearchTypeChange(e.target.value as 'voterId' | 'phone' | 'details')}
                                                className="size-4"
                                            />
                                            <Label htmlFor="details" className="text-sm font-medium cursor-pointer flex-1">
                                                {t('operator.search.types.detailed')}
                                            </Label>
                                        </div>
                                        <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                            <input
                                                type="radio"
                                                id="phone"
                                                name="searchType"
                                                value="phone"
                                                checked={searchType === 'phone'}
                                                onChange={(e) => handleSearchTypeChange(e.target.value as 'voterId' | 'phone' | 'details')}
                                                className="size-4"
                                            />
                                            <Label htmlFor="phone" className="text-sm font-medium cursor-pointer flex-1">
                                                {t('operator.search.types.phone')}
                                            </Label>
                                        </div>
                                        <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                            <input
                                                type="radio"
                                                id="voterId"
                                                name="searchType"
                                                value="voterId"
                                                checked={searchType === 'voterId'}
                                                onChange={(e) => handleSearchTypeChange(e.target.value as 'voterId' | 'phone' | 'details')}
                                                className="size-4"
                                            />
                                            <Label htmlFor="voterId" className="text-sm font-medium cursor-pointer flex-1">
                                                {t('operator.search.types.voterId')}
                                            </Label>
                                        </div>
                                    </div>

                                    {/* Search Input */}
                                    {searchType === 'details' ? (
                                        <div className="space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <Label htmlFor="name">{t('backOffice.nameOptional')}</Label>
                                                    <Input
                                                        id="name"
                                                        value={name}
                                                        onChange={(e) => setName(e.target.value)}
                                                        placeholder={t('operator.search.namePlaceholder')}
                                                        type="text"
                                                    />
                                                </div>
                                                <div>
                                                    <Label htmlFor="gender">{t('backOffice.genderOptional')}</Label>
                                                    <Select value={gender} onValueChange={setGender}>
                                                        <SelectTrigger>
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
                                                    <Label htmlFor="age">{t('backOffice.ageYears')}</Label>
                                                    <Input
                                                        id="age"
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

                                                            const clamped = Math.min(Math.max(parsed, 1), 150);
                                                            setAge(clamped);
                                                        }}
                                                        placeholder={t('backOffice.enterAge')}
                                                        className="w-full"
                                                    />
                                                </div>
                                                <div>
                                                    <Label htmlFor="ageRange">{t('backOffice.ageRange', { range: ageRange })}</Label>
                                                    <Slider
                                                        id="ageRange"
                                                        min={0}
                                                        max={20}
                                                        step={1}
                                                        value={[ageRange]}
                                                        onValueChange={(value: number[]) => setAgeRange(value[0])}
                                                        disabled={age === undefined}
                                                        className="w-full"
                                                    />
                                                    {age === undefined ? (
                                                        <p className="text-sm text-muted-foreground mt-1">
                                                            {t('backOffice.enterAge')}
                                                        </p>
                                                    ) : (
                                                        <p className="text-sm text-muted-foreground mt-1">
                                                            {t('backOffice.searchRange', { min: age - ageRange, max: age + ageRange })}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-2 sm:flex-row">
                                                <Button onClick={handleSearch} disabled={isSearching} className="flex-1">
                                                    {isSearching ? t('operator.search.searching') : t('common.search')}
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    onClick={() => {
                                                        setName('');
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
                                                    }}
                                                    className="px-4 sm:w-auto"
                                                >
                                                    {t('backOffice.clear')}
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div>
                                                <Label htmlFor="search">
                                                    {searchType === 'voterId' ? t('backOffice.voterIdEpicNumber') : t('operator.search.types.phone')}
                                                </Label>
                                                <div className="relative">
                                                    <Input
                                                        id="search"
                                                        value={searchTerm}
                                                        onChange={(e) => setSearchTerm(e.target.value)}
                                                        placeholder={
                                                            searchType === 'voterId'
                                                                ? t('operator.search.voterIdPlaceholder')
                                                                : t('operator.search.phonePlaceholder')
                                                        }
                                                        type={searchType === 'phone' ? 'tel' : 'text'}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                                        className="pr-10"
                                                    />
                                                    {searchTerm && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setSearchTerm('');
                                                                setSearchResults([]);
                                                                setSearchTotalCount(0);
                                                                setHasMoreSearchResults(false);
                                                                setIsLoadingMore(false);
                                                                loadMoreInFlightRef.current = false;
                                                                setLastSearchType(null);
                                                                setHasSearched(false);
                                                                setIsSearching(false);
                                                            }}
                                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
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
                                                <Button onClick={handleSearch} disabled={isSearching} className="flex-1">
                                                    {isSearching ? t('operator.search.searching') : t('common.search')}
                                                </Button>
                                                {searchTerm && (
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => {
                                                            setSearchTerm('');
                                                            setSearchResults([]);
                                                            setSearchTotalCount(0);
                                                            setHasMoreSearchResults(false);
                                                            setIsLoadingMore(false);
                                                            loadMoreInFlightRef.current = false;
                                                            setLastSearchType(null);
                                                            setHasSearched(false);
                                                            setIsSearching(false);
                                                        }}
                                                        className="px-4 sm:w-auto"
                                                    >
                                                        Clear
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Search Results */}
                                {searchResults.length > 0 && (
                                    <VoterSearchResultsVirtualList
                                        voters={searchResults}
                                        totalCount={searchTotalCount}
                                        lastSearchType={lastSearchType}
                                        hasMore={hasMoreSearchResults}
                                        isLoadingMore={isLoadingMore}
                                        isSearching={isSearching}
                                        onSelectVoter={handleSelectVoter}
                                        onLoadMore={loadMoreSearchResults}
                                    />
                                )}

                                {/* Loading State */}
                                {isSearching && (
                                    <div className="mt-4 p-6 border border-muted-foreground/25 rounded-lg bg-muted/10">
                                        <div className="flex items-center justify-center gap-3">
                                            <div className="animate-spin rounded-full size-5 border-b-2 border-primary" />
                                            <p className="text-sm text-muted-foreground">
                                                {t('backOffice.searchingVoters')}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* No Results Message */}
                                {hasSearched && !isSearching && searchResults.length === 0 && (
                                    <div className="mt-4 p-4 border border-muted-foreground/25 rounded-lg bg-muted/20">
                                        <div className="flex items-center gap-3">
                                            <div className="text-muted-foreground">
                                                <svg
                                                    className="size-5"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
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
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {t('operator.search.noResultsHelp')}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
}
