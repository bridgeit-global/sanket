'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from '@/components/toast';
import { useTranslations } from '@/hooks/use-translations';
import { SidebarToggle } from '@/components/sidebar-toggle';
import { TablePagination } from '@/components/table-pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Combobox } from '@/components/ui/combobox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { VoterSearchPanel } from '@/components/voter-search-panel';
import { formatDisplayDateTimeIST } from '@/lib/ist-date';
import { isValidIndianMobile, normalizeIndianMobileDigits } from '@/lib/indian-mobile';
import { buildThermalTicketText, shareThermalTicketPdf } from '@/lib/thermal/receipt';
import type { VoterWithPartNo } from '@/lib/db/schema';
import {
  buildVisitorManageSearchParams,
  DEFAULT_VISITOR_MANAGE_PAGE_SIZE,
  parseVisitorManageFiltersFromSearchParams,
  type VisitorManageFilterState,
} from '@/lib/visitor/manage-url-params';
import { Loader2, Plus, Search, Share2, UserCheck, X } from 'lucide-react';

type IndividualServiceRow = {
  id: string;
  name: string;
  category: string | null;
  sortOrder: number;
};

type ProgrammeRow = {
  id: string;
  title: string;
  startTime: string;
  location: string;
};

type VisitorServiceRow = {
  id: string;
  visitorId: string;
  serviceName: string;
  programmeId: string | null;
  token: string;
  description: string | null;
  notes: string | null;
  status: 'pending' | 'converted' | 'cancelled';
  beneficiaryServiceId: string | null;
  convertedAt: string | Date | null;
  createdAt: string | Date;
};

type VisitorRow = {
  id: string;
  name: string;
  mobileNumber: string;
  voterId: string | null;
  createdAt: string | Date;
  services: VisitorServiceRow[];
};

function buildServiceComboboxOptions(
  services: IndividualServiceRow[],
): Array<{ value: string; label: string; disabled?: boolean }> {
  const groups = new Map<string, IndividualServiceRow[]>();
  const sorted = [...services].sort((a, b) => {
    const catA = a.category?.trim() || 'Other';
    const catB = b.category?.trim() || 'Other';
    if (catA !== catB) return catA.localeCompare(catB);
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.name.localeCompare(b.name);
  });

  for (const service of sorted) {
    const category = service.category?.trim() || 'Other';
    const list = groups.get(category) ?? [];
    list.push(service);
    groups.set(category, list);
  }

  const options: Array<{ value: string; label: string; disabled?: boolean }> = [];
  for (const [category, rows] of groups) {
    options.push({
      value: `__category__${category}`,
      label: category,
      disabled: true,
    });
    for (const service of rows) {
      options.push({ value: service.name, label: service.name });
    }
  }
  return options;
}

function statusVariant(status: VisitorServiceRow['status']): 'default' | 'secondary' | 'outline' {
  if (status === 'converted') return 'default';
  if (status === 'cancelled') return 'outline';
  return 'secondary';
}

type CreatedVisitorService = {
  serviceName: string;
  token: string;
  createdAt: string | Date;
};

type VisitorWorkflowProps = {
  initialTab?: 'create' | 'manage';
  initialManageState?: Partial<VisitorManageFilterState>;
};

export function VisitorWorkflow({
  initialTab = 'create',
  initialManageState,
}: VisitorWorkflowProps) {
  const { t } = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlFilters = parseVisitorManageFiltersFromSearchParams(searchParams);
  const mergedInitial: VisitorManageFilterState = {
    status: initialManageState?.status ?? urlFilters.status,
    serviceName: initialManageState?.serviceName ?? urlFilters.serviceName,
    token: initialManageState?.token ?? urlFilters.token,
    mobile: initialManageState?.mobile ?? urlFilters.mobile,
    voterId: initialManageState?.voterId ?? urlFilters.voterId,
    name: initialManageState?.name ?? urlFilters.name,
    createdFrom: initialManageState?.createdFrom ?? urlFilters.createdFrom,
    createdTo: initialManageState?.createdTo ?? urlFilters.createdTo,
    page: initialManageState?.page ?? urlFilters.page,
    limit: initialManageState?.limit ?? urlFilters.limit,
  };

  const [tab, setTab] = useState<'create' | 'manage'>(initialTab);

  const [catalog, setCatalog] = useState<IndividualServiceRow[]>([]);
  const [programmes, setProgrammes] = useState<ProgrammeRow[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);

  const [name, setName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [voterId, setVoterId] = useState('');
  const [pendingServiceName, setPendingServiceName] = useState('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [programmeId, setProgrammeId] = useState('');
  const [notes, setNotes] = useState('');
  const [creating, setCreating] = useState(false);
  const [createdServices, setCreatedServices] = useState<CreatedVisitorService[]>([]);
  const [createdVisitorSnapshot, setCreatedVisitorSnapshot] = useState<{
    name: string;
    mobileNumber: string;
  } | null>(null);
  const [sharingToken, setSharingToken] = useState<string | null>(null);

  const [filterStatus, setFilterStatus] = useState(mergedInitial.status);
  const [filterServiceName, setFilterServiceName] = useState(
    mergedInitial.serviceName || 'all',
  );
  const [filterToken, setFilterToken] = useState(mergedInitial.token);
  const [filterMobile, setFilterMobile] = useState(mergedInitial.mobile);
  const [filterVoterId, setFilterVoterId] = useState(mergedInitial.voterId);
  const [filterName, setFilterName] = useState(mergedInitial.name);
  const [filterCreatedFrom, setFilterCreatedFrom] = useState(mergedInitial.createdFrom);
  const [filterCreatedTo, setFilterCreatedTo] = useState(mergedInitial.createdTo);
  const [filterTokenInput, setFilterTokenInput] = useState(mergedInitial.token);
  const [filterMobileInput, setFilterMobileInput] = useState(mergedInitial.mobile);
  const [filterVoterIdInput, setFilterVoterIdInput] = useState(mergedInitial.voterId);
  const [filterNameInput, setFilterNameInput] = useState(mergedInitial.name);
  const [currentPage, setCurrentPage] = useState(mergedInitial.page);
  const [pageSize, setPageSize] = useState(mergedInitial.limit);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [visitors, setVisitors] = useState<VisitorRow[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [addServiceForId, setAddServiceForId] = useState<string | null>(null);
  const [addServiceName, setAddServiceName] = useState('');
  const [addProgrammeId, setAddProgrammeId] = useState('');
  const [addingService, setAddingService] = useState(false);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const invalidMobileFilterToastSentRef = useRef(false);

  const serviceOptions = useMemo(() => buildServiceComboboxOptions(catalog), [catalog]);
  const programmeOptions = useMemo(
    () => [
      { value: '', label: t('visitor.form.noProgramme') },
      ...programmes.map((p) => ({
        value: p.id,
        label: `${p.startTime} — ${p.title}${p.location ? ` (${p.location})` : ''}`,
      })),
    ],
    [programmes, t],
  );

  const syncManageUrl = useCallback(
    (updates: Partial<VisitorManageFilterState> & { tab?: string }, resetPage = false) => {
      const next: Partial<VisitorManageFilterState> & { tab?: string } = {
        status: updates.status ?? filterStatus,
        serviceName:
          updates.serviceName !== undefined
            ? updates.serviceName
            : filterServiceName === 'all'
              ? ''
              : filterServiceName,
        token: updates.token ?? filterToken,
        mobile: updates.mobile ?? filterMobile,
        voterId: updates.voterId ?? filterVoterId,
        name: updates.name ?? filterName,
        createdFrom: updates.createdFrom ?? filterCreatedFrom,
        createdTo: updates.createdTo ?? filterCreatedTo,
        page: resetPage ? 1 : (updates.page ?? currentPage),
        limit: updates.limit ?? pageSize,
        tab: updates.tab ?? searchParams.get('tab') ?? 'manage',
      };
      const params = buildVisitorManageSearchParams(
        next,
        new URLSearchParams(searchParams.toString()),
      );
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [
      searchParams,
      router,
      filterStatus,
      filterServiceName,
      filterToken,
      filterMobile,
      filterVoterId,
      filterName,
      filterCreatedFrom,
      filterCreatedTo,
      currentPage,
      pageSize,
    ],
  );

  useEffect(() => {
    let cancelled = false;
    async function loadMeta() {
      setLoadingMeta(true);
      try {
        const [servicesRes, programmesRes] = await Promise.all([
          fetch('/api/visitor/individual-services'),
          fetch('/api/visitor/today-programmes'),
        ]);
        if (!servicesRes.ok || !programmesRes.ok) {
          throw new Error('Failed to load form data');
        }
        const servicesJson = await servicesRes.json();
        const programmesJson = await programmesRes.json();
        if (!cancelled) {
          setCatalog(servicesJson);
          setProgrammes(programmesJson);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          toast({ type: 'error', description: t('visitor.errors.loadMeta') });
        }
      } finally {
        if (!cancelled) setLoadingMeta(false);
      }
    }
    void loadMeta();
    return () => {
      cancelled = true;
    };
    // Intentionally mount-only: `t` from useTranslations is a new function each render
    // and would retrigger this effect in a fetch loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadVisitors = useCallback(async () => {
    setLoadingList(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.set('status', filterStatus);
      if (filterServiceName && filterServiceName !== 'all') {
        params.set('serviceName', filterServiceName);
      }
      if (filterToken) params.set('token', filterToken);
      if (filterMobile) params.set('mobile', filterMobile);
      if (filterVoterId) params.set('voterId', filterVoterId);
      if (filterName) params.set('name', filterName);
      if (filterCreatedFrom) params.set('createdFrom', filterCreatedFrom);
      if (filterCreatedTo) params.set('createdTo', filterCreatedTo);
      params.set('page', String(currentPage));
      params.set('limit', String(pageSize));

      const res = await fetch(`/api/visitor?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to list visitors');
      const json = await res.json();
      setVisitors(json.visitors ?? []);
      setTotalCount(json.total ?? 0);
      setTotalPages(json.totalPages ?? 0);
      if (typeof json.currentPage === 'number' && json.currentPage !== currentPage) {
        setCurrentPage(json.currentPage);
      }
    } catch (error) {
      console.error(error);
      toast({ type: 'error', description: t('visitor.errors.loadList') });
    } finally {
      setLoadingList(false);
    }
    // Omit `t`: useTranslations returns a new function each render and would
    // retrigger this callback → manage-tab fetch effect in a loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filterStatus,
    filterServiceName,
    filterToken,
    filterMobile,
    filterVoterId,
    filterName,
    filterCreatedFrom,
    filterCreatedTo,
    currentPage,
    pageSize,
  ]);

  useEffect(() => {
    if (tab === 'manage') {
      void loadVisitors();
    }
  }, [tab, loadVisitors]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const nextToken = filterTokenInput.trim();
      const nextMobileRaw = filterMobileInput.trim();
      const nextVoter = filterVoterIdInput.trim().toUpperCase();
      const nextName = filterNameInput.trim();

      let appliedMobile = '';
      if (nextMobileRaw === '') {
        invalidMobileFilterToastSentRef.current = false;
      } else if (isValidIndianMobile(nextMobileRaw)) {
        appliedMobile = normalizeIndianMobileDigits(nextMobileRaw);
        invalidMobileFilterToastSentRef.current = false;
      } else if (!invalidMobileFilterToastSentRef.current) {
        toast({
          type: 'error',
          description: t('visitor.errors.mobileInvalid'),
        });
        invalidMobileFilterToastSentRef.current = true;
      }

      const changed =
        nextToken !== filterToken ||
        appliedMobile !== filterMobile ||
        nextVoter !== filterVoterId ||
        nextName !== filterName;

      if (changed) {
        setCurrentPage(1);
        syncManageUrl(
          {
            token: nextToken,
            mobile: appliedMobile,
            voterId: nextVoter,
            name: nextName,
            page: 1,
          },
          true,
        );
      }

      setFilterToken(nextToken);
      setFilterMobile(appliedMobile);
      setFilterVoterId(nextVoter);
      setFilterName(nextName);
    }, 400);

    return () => window.clearTimeout(handle);
    // Omit `t`: unstable identity would reset this debounce every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filterTokenInput,
    filterMobileInput,
    filterVoterIdInput,
    filterNameInput,
    filterToken,
    filterMobile,
    filterVoterId,
    filterName,
    syncManageUrl,
  ]);

  function switchTab(next: 'create' | 'manage') {
    setTab(next);
    if (next === 'create') {
      router.replace('?tab=create', { scroll: false });
    } else {
      syncManageUrl({ tab: 'manage' });
    }
  }

  function handleClearFilters() {
    setFilterStatus('all');
    setFilterServiceName('all');
    setFilterToken('');
    setFilterMobile('');
    setFilterVoterId('');
    setFilterName('');
    setFilterCreatedFrom('');
    setFilterCreatedTo('');
    setFilterTokenInput('');
    setFilterMobileInput('');
    setFilterVoterIdInput('');
    setFilterNameInput('');
    invalidMobileFilterToastSentRef.current = false;
    setCurrentPage(1);
    setPageSize(DEFAULT_VISITOR_MANAGE_PAGE_SIZE);
    syncManageUrl(
      {
        status: 'all',
        serviceName: '',
        token: '',
        mobile: '',
        voterId: '',
        name: '',
        createdFrom: '',
        createdTo: '',
        page: 1,
        limit: DEFAULT_VISITOR_MANAGE_PAGE_SIZE,
        tab: 'manage',
      },
      true,
    );
  }

  function selectVoter(voter: VoterWithPartNo) {
    setVoterId(voter.epicNumber || '');
    setName(voter.fullName || '');
    const mobile = voter.mobileNoPrimary || voter.mobileNoSecondary || '';
    if (mobile) setMobileNumber(mobile);
  }

  function addSelectedService() {
    const next = pendingServiceName.trim();
    if (!next) {
      toast({ type: 'error', description: t('visitor.errors.serviceRequired') });
      return;
    }
    if (selectedServices.includes(next)) {
      toast({ type: 'error', description: t('visitor.errors.serviceDuplicate') });
      return;
    }
    setSelectedServices((prev) => [...prev, next]);
    setPendingServiceName('');
  }

  function removeSelectedService(service: string) {
    setSelectedServices((prev) => prev.filter((item) => item !== service));
  }

  function resetCreateForm() {
    setName('');
    setMobileNumber('');
    setVoterId('');
    setPendingServiceName('');
    setSelectedServices([]);
    setProgrammeId('');
    setNotes('');
    setCreatedServices([]);
    setCreatedVisitorSnapshot(null);
  }

  async function shareVisitorThermalTicket(params: {
    token: string;
    createdAt: Date | string;
    serviceName: string;
    name?: string | null;
    mobile?: string | null;
  }) {
    setSharingToken(params.token);
    try {
      const receiptText = buildThermalTicketText({
        token: params.token,
        createdAt: params.createdAt,
        name: params.name?.trim() || 'Visitor',
        mobile: params.mobile,
        serviceName: params.serviceName,
        width: 32,
      });

      const outcome = await shareThermalTicketPdf(
        receiptText,
        `thermal-ticket-${params.token.toLowerCase()}`,
        {
          headerImageUrl: '/images/ncp_election_symbol.png',
          qrValue: params.token,
          paperWidthMm: 88,
        },
      );

      if (outcome === 'downloaded') {
        toast({
          type: 'success',
          description: t('visitor.create.ticketDownloaded'),
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        type: 'error',
        description: t('visitor.errors.printTicket'),
      });
    } finally {
      setSharingToken(null);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast({ type: 'error', description: t('visitor.errors.nameRequired') });
      return;
    }
    if (!isValidIndianMobile(mobileNumber)) {
      toast({ type: 'error', description: t('visitor.errors.mobileInvalid') });
      return;
    }

    const servicesToCreate = [...selectedServices];
    if (pendingServiceName.trim() && !servicesToCreate.includes(pendingServiceName.trim())) {
      servicesToCreate.push(pendingServiceName.trim());
    }
    if (servicesToCreate.length === 0) {
      toast({ type: 'error', description: t('visitor.errors.serviceRequired') });
      return;
    }

    setCreating(true);
    setCreatedServices([]);
    try {
      const res = await fetch('/api/visitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          mobileNumber: mobileNumber.trim(),
          voterId: voterId.trim() || null,
          serviceNames: servicesToCreate,
          programmeId: programmeId || null,
          notes: notes.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Create failed');
      const created = Array.isArray(json.services)
        ? json.services.map(
            (s: { serviceName: string; token: string; createdAt?: string | Date }) => ({
              serviceName: s.serviceName,
              token: s.token,
              createdAt: s.createdAt ?? new Date().toISOString(),
            }),
          )
        : [];
      setCreatedVisitorSnapshot({
        name: name.trim(),
        mobileNumber: normalizeIndianMobileDigits(mobileNumber),
      });
      setCreatedServices(created);
      toast({ type: 'success', description: t('visitor.create.success') });
      setNotes('');
      setSelectedServices([]);
      setPendingServiceName('');
    } catch (error) {
      console.error(error);
      toast({
        type: 'error',
        description: error instanceof Error ? error.message : t('visitor.errors.create'),
      });
    } finally {
      setCreating(false);
    }
  }

  async function handleAddService(visitorId: string) {
    if (!addServiceName.trim()) {
      toast({ type: 'error', description: t('visitor.errors.serviceRequired') });
      return;
    }
    setAddingService(true);
    try {
      const res = await fetch(`/api/visitor/${visitorId}/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceName: addServiceName,
          programmeId: addProgrammeId || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to add service');
      toast({
        type: 'success',
        description: t('visitor.manage.serviceAdded', { token: json.service?.token ?? '' }),
      });
      setAddServiceForId(null);
      setAddServiceName('');
      setAddProgrammeId('');
      await loadVisitors();
    } catch (error) {
      console.error(error);
      toast({
        type: 'error',
        description: error instanceof Error ? error.message : t('visitor.errors.addService'),
      });
    } finally {
      setAddingService(false);
    }
  }

  async function handleConvert(serviceId: string) {
    setConvertingId(serviceId);
    try {
      const res = await fetch(`/api/visitor/services/${serviceId}/convert`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Convert failed');
      toast({
        type: 'success',
        description: t('visitor.manage.convertSuccess', {
          token: json.beneficiaryService?.token ?? '',
        }),
      });
      await loadVisitors();
    } catch (error) {
      console.error(error);
      toast({
        type: 'error',
        description: error instanceof Error ? error.message : t('visitor.errors.convert'),
      });
    } finally {
      setConvertingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 sm:items-center">
          <SidebarToggle />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold sm:text-3xl">{t('visitor.title')}</h1>
            <p className="mt-1 text-sm text-muted-foreground sm:mt-2 sm:text-base">
              {t('visitor.subtitle')}
            </p>
          </div>
        </div>
      </div>

      <div className="flex space-x-1 rounded-lg bg-muted p-1">
        <Button
          variant={tab === 'create' ? 'default' : 'ghost'}
          onClick={() => switchTab('create')}
          className="flex-1 text-sm sm:text-base"
        >
          <span className="hidden sm:inline">{t('visitor.tabs.createVisitor')}</span>
          <span className="sm:hidden">{t('visitor.tabs.create')}</span>
        </Button>
        <Button
          variant={tab === 'manage' ? 'default' : 'ghost'}
          onClick={() => switchTab('manage')}
          className="flex-1 text-sm sm:text-base"
        >
          <span className="hidden sm:inline">{t('visitor.tabs.manageVisitors')}</span>
          <span className="sm:hidden">{t('visitor.tabs.manage')}</span>
        </Button>
      </div>

      {tab === 'create' && (
        <>
          {createdServices.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-green-600">{t('visitor.create.successTitle')}</CardTitle>
                <CardDescription>{t('visitor.create.successDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  {createdServices.map((service) => (
                    <div
                      key={`${service.serviceName}-${service.token}`}
                      className="rounded-lg border-2 border-green-200 bg-green-50 p-4 text-center sm:p-6"
                    >
                      <Label className="text-sm font-medium text-green-800">
                        {service.serviceName}
                      </Label>
                      <p className="mt-2 break-all font-mono text-xl font-bold tracking-wide text-green-900 sm:text-2xl">
                        {service.token}
                      </p>
                      <p className="mt-2 text-sm text-green-700">
                        {t('visitor.create.saveToken')}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        className="mt-4 w-full sm:w-auto"
                        disabled={sharingToken === service.token}
                        onClick={() =>
                          void shareVisitorThermalTicket({
                            token: service.token,
                            createdAt: service.createdAt,
                            serviceName: service.serviceName,
                            name: createdVisitorSnapshot?.name ?? name,
                            mobile: createdVisitorSnapshot?.mobileNumber ?? mobileNumber,
                          })
                        }
                      >
                        {sharingToken === service.token ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Share2 className="mr-2 h-4 w-4" />
                        )}
                        {t('visitor.create.printToken')}
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
                  <Button onClick={resetCreateForm} className="flex-1">
                    {t('visitor.create.createAnother')}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      resetCreateForm();
                      switchTab('manage');
                    }}
                  >
                    {t('visitor.create.viewVisitors')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>{t('visitor.create.title')}</CardTitle>
                <CardDescription className="text-sm">
                  {t('visitor.create.description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <VoterSearchPanel
                  searchEndpoint="/api/visitor/search-voter"
                  onSelectVoter={selectVoter}
                  title={t('operator.search.title')}
                  description={t('visitor.form.searchVoterHelp')}
                />

                {(name || mobileNumber || voterId) && (
                  <div className="rounded-lg border bg-muted/30 p-3 sm:p-4">
                    <p className="mb-2 text-sm font-medium">{t('visitor.form.selectedVoter')}</p>
                    <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-3">
                      <div>
                        <span className="text-muted-foreground">{t('visitor.form.name')}: </span>
                        <span className="font-medium">{name || '—'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('visitor.form.mobile')}: </span>
                        <span className="font-mono font-medium">{mobileNumber || '—'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('visitor.form.voterId')}: </span>
                        <span className="font-mono font-medium">{voterId || '—'}</span>
                      </div>
                    </div>
                  </div>
                )}

                <form onSubmit={handleCreate} className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="visitor-name">{t('visitor.form.name')}</Label>
                      <Input
                        id="visitor-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="visitor-mobile">{t('visitor.form.mobile')}</Label>
                      <Input
                        id="visitor-mobile"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value)}
                        placeholder="9876543210"
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel"
                        maxLength={13}
                        className="font-mono"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="visitor-voter-id">{t('visitor.form.voterId')}</Label>
                      <Input
                        id="visitor-voter-id"
                        value={voterId}
                        onChange={(e) => setVoterId(e.target.value.toUpperCase())}
                        placeholder="ABC1234567"
                        className="font-mono uppercase"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('visitor.form.programme')}</Label>
                      <Combobox
                        options={programmeOptions}
                        value={programmeId}
                        onValueChange={setProgrammeId}
                        placeholder={t('visitor.form.programmePlaceholder')}
                        disabled={loadingMeta}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>{t('visitor.form.services')}</Label>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <div className="min-w-0 flex-1">
                        <Combobox
                          options={serviceOptions}
                          value={pendingServiceName}
                          onValueChange={setPendingServiceName}
                          placeholder={t('visitor.form.servicePlaceholder')}
                          disabled={loadingMeta}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={addSelectedService}
                        disabled={loadingMeta || !pendingServiceName.trim()}
                        className="sm:w-auto"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        {t('visitor.form.addService')}
                      </Button>
                    </div>
                    {selectedServices.length > 0 ? (
                      <ul className="space-y-2 rounded-lg border bg-muted/20 p-3">
                        {selectedServices.map((service) => (
                          <li
                            key={service}
                            className="flex items-center justify-between gap-2 rounded-md bg-background px-3 py-2 text-sm"
                          >
                            <span className="min-w-0 break-words">{service}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 shrink-0 p-0"
                              onClick={() => removeSelectedService(service)}
                              aria-label={t('visitor.form.removeService')}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-muted-foreground sm:text-sm">
                        {t('visitor.form.servicesHint')}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="visitor-notes">{t('visitor.form.notes')}</Label>
                    <Textarea
                      id="visitor-notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
                    <Button
                      type="submit"
                      disabled={creating || loadingMeta}
                      className="flex-1"
                    >
                      {creating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t('visitor.create.submitting')}
                        </>
                      ) : (
                        t('visitor.create.submit')
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {tab === 'manage' && (
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-4 sm:pt-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  <div>
                    <Label htmlFor="visitor-service-name-filter">
                      {t('visitor.manage.filters.serviceName')}
                    </Label>
                    <Select
                      value={filterServiceName}
                      onValueChange={(value) => {
                        setFilterServiceName(value);
                        setCurrentPage(1);
                        syncManageUrl(
                          {
                            serviceName: value === 'all' ? '' : value,
                            page: 1,
                          },
                          true,
                        );
                      }}
                    >
                      <SelectTrigger id="visitor-service-name-filter">
                        <SelectValue placeholder={t('visitor.manage.filters.allServices')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          {t('visitor.manage.filters.allServices')}
                        </SelectItem>
                        {(() => {
                          const groups = new Map<string, IndividualServiceRow[]>();
                          for (const service of catalog) {
                            const key = service.category?.trim() || 'Other';
                            const list = groups.get(key) ?? [];
                            list.push(service);
                            groups.set(key, list);
                          }
                          return Array.from(groups.entries()).map(([category, services]) => (
                            <SelectGroup key={category}>
                              <SelectLabel>{category}</SelectLabel>
                              {services.map((service) => (
                                <SelectItem key={service.id} value={service.name}>
                                  {service.name}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          ));
                        })()}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="visitor-status-filter">
                      {t('visitor.manage.filters.status')}
                    </Label>
                    <Select
                      value={filterStatus}
                      onValueChange={(value) => {
                        setFilterStatus(value);
                        setCurrentPage(1);
                        syncManageUrl({ status: value, page: 1 }, true);
                      }}
                    >
                      <SelectTrigger id="visitor-status-filter">
                        <SelectValue placeholder={t('visitor.manage.filters.selectStatus')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          {t('visitor.manage.filters.allStatuses')}
                        </SelectItem>
                        <SelectItem value="pending">{t('visitor.status.pending')}</SelectItem>
                        <SelectItem value="converted">{t('visitor.status.converted')}</SelectItem>
                        <SelectItem value="cancelled">{t('visitor.status.cancelled')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="visitor-token-filter">
                      {t('visitor.manage.filters.serviceToken')}
                    </Label>
                    <Input
                      id="visitor-token-filter"
                      placeholder={t('visitor.manage.filters.enterToken')}
                      value={filterTokenInput}
                      onChange={(e) => setFilterTokenInput(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="visitor-name-filter">
                      {t('visitor.manage.filters.name')}
                    </Label>
                    <Input
                      id="visitor-name-filter"
                      placeholder={t('visitor.manage.filters.enterName')}
                      value={filterNameInput}
                      onChange={(e) => setFilterNameInput(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="visitor-mobile-filter">
                      {t('visitor.manage.filters.mobileNumber')}
                    </Label>
                    <Input
                      id="visitor-mobile-filter"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="tel"
                      maxLength={13}
                      placeholder={t('visitor.manage.filters.enterMobile')}
                      value={filterMobileInput}
                      onChange={(e) =>
                        setFilterMobileInput(e.target.value.replace(/\D/g, ''))
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="visitor-voter-filter">
                      {t('visitor.manage.filters.voterId')}
                    </Label>
                    <Input
                      id="visitor-voter-filter"
                      placeholder={t('visitor.manage.filters.enterVoterId')}
                      value={filterVoterIdInput}
                      onChange={(e) => setFilterVoterIdInput(e.target.value.toUpperCase())}
                      className="font-mono uppercase"
                    />
                  </div>

                  <div>
                    <Label htmlFor="visitor-created-from-filter">
                      {t('visitor.manage.filters.createdFrom')}
                    </Label>
                    <Input
                      id="visitor-created-from-filter"
                      type="date"
                      value={filterCreatedFrom}
                      max={filterCreatedTo || undefined}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFilterCreatedFrom(value);
                        setCurrentPage(1);
                        syncManageUrl({ createdFrom: value, page: 1 }, true);
                      }}
                    />
                  </div>

                  <div>
                    <Label htmlFor="visitor-created-to-filter">
                      {t('visitor.manage.filters.createdTo')}
                    </Label>
                    <Input
                      id="visitor-created-to-filter"
                      type="date"
                      value={filterCreatedTo}
                      min={filterCreatedFrom || undefined}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFilterCreatedTo(value);
                        setCurrentPage(1);
                        syncManageUrl({ createdTo: value, page: 1 }, true);
                      }}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div>
                      <Label htmlFor="visitor-page-size">
                        {t('visitor.manage.filters.itemsPerPage')}
                      </Label>
                      <Select
                        value={pageSize.toString()}
                        onValueChange={(value) => {
                          const size = Number.parseInt(value, 10);
                          setPageSize(size);
                          setCurrentPage(1);
                          syncManageUrl({ limit: size, page: 1 });
                        }}
                      >
                        <SelectTrigger id="visitor-page-size" className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5</SelectItem>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {t('visitor.manage.filters.showing', {
                        count: visitors.length,
                        total: totalCount,
                      })}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      onClick={() => {
                        setCurrentPage(1);
                        syncManageUrl({ page: 1 }, true);
                        void loadVisitors();
                      }}
                      disabled={loadingList}
                      className="w-full sm:w-auto"
                    >
                      {loadingList
                        ? t('visitor.manage.actions.searching')
                        : t('visitor.manage.actions.search')}
                    </Button>
                    <Button
                      onClick={handleClearFilters}
                      variant="outline"
                      className="w-full sm:w-auto"
                    >
                      {t('visitor.manage.actions.clearFilters')}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {loadingList && visitors.length === 0 ? (
            <div className="flex min-h-[40vh] items-center justify-center bg-background">
              <div className="text-center">
                <div className="mx-auto size-8 animate-spin rounded-full border-b-2 border-primary" />
                <p className="mt-2 text-muted-foreground">{t('visitor.manage.loading')}</p>
              </div>
            </div>
          ) : visitors.length === 0 ? (
            <Card>
              <CardContent className="pt-4 sm:pt-6">
                <div className="py-8 text-center">
                  <p className="text-muted-foreground">{t('visitor.manage.empty')}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t('visitor.manage.emptyHelp')}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3 pb-4">
              {visitors.map((visitor) => (
                  <div
                    key={visitor.id}
                    className="space-y-3 overflow-hidden rounded-xl border bg-background p-3 sm:p-4"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                        <p className="break-words text-base font-medium leading-snug sm:text-lg">
                          {visitor.name}
                        </p>
                        <span className="shrink-0 text-xs text-muted-foreground sm:text-sm">
                          {formatDisplayDateTimeIST(visitor.createdAt)}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                        <span className="font-mono">{visitor.mobileNumber}</span>
                        {visitor.voterId ? (
                          <span className="inline-flex items-center rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                            {visitor.voterId}
                          </span>
                        ) : null}
                        <Badge variant="secondary">
                          {t('visitor.manage.serviceCount', {
                            count: visitor.services.length,
                          })}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-3 border-t pt-3">
                      {visitor.services.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          {t('visitor.manage.noServices')}
                        </p>
                      ) : (
                        visitor.services.map((service) => (
                          <div
                            key={service.id}
                            className="flex flex-col gap-3 rounded-lg border bg-muted/10 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4"
                          >
                            <div className="min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="break-words font-medium">
                                  {service.serviceName}
                                </span>
                                <Badge variant={statusVariant(service.status)}>
                                  {t(`visitor.status.${service.status}`)}
                                </Badge>
                              </div>
                              <div className="break-all font-mono text-sm">{service.token}</div>
                              {service.beneficiaryServiceId && (
                                <div className="text-xs text-muted-foreground">
                                  {t('visitor.manage.linkedBeneficiary')}
                                </div>
                              )}
                            </div>
                            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="w-full shrink-0 sm:w-auto"
                                disabled={sharingToken === service.token}
                                onClick={() =>
                                  void shareVisitorThermalTicket({
                                    token: service.token,
                                    createdAt: service.createdAt,
                                    serviceName: service.serviceName,
                                    name: visitor.name,
                                    mobile: visitor.mobileNumber,
                                  })
                                }
                              >
                                {sharingToken === service.token ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <Share2 className="mr-2 h-4 w-4" />
                                )}
                                {t('visitor.manage.printToken')}
                              </Button>
                              {service.status === 'pending' && (
                                <Button
                                  type="button"
                                  size="sm"
                                  className="w-full shrink-0 sm:w-auto"
                                  onClick={() => void handleConvert(service.id)}
                                  disabled={convertingId === service.id}
                                >
                                  {convertingId === service.id ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <UserCheck className="mr-2 h-4 w-4" />
                                  )}
                                  {t('visitor.manage.convert')}
                                </Button>
                              )}
                            </div>
                          </div>
                        ))
                      )}

                      {addServiceForId === visitor.id ? (
                        <div className="grid grid-cols-1 gap-3 rounded-lg border bg-muted/10 p-3 sm:p-4 md:grid-cols-2">
                          <div className="space-y-2 md:col-span-2">
                            <Label>{t('visitor.form.service')}</Label>
                            <Combobox
                              options={serviceOptions}
                              value={addServiceName}
                              onValueChange={setAddServiceName}
                              placeholder={t('visitor.form.servicePlaceholder')}
                            />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label>{t('visitor.form.programme')}</Label>
                            <Combobox
                              options={programmeOptions}
                              value={addProgrammeId}
                              onValueChange={setAddProgrammeId}
                              placeholder={t('visitor.form.programmePlaceholder')}
                            />
                          </div>
                          <div className="flex flex-col gap-2 md:col-span-2 sm:flex-row">
                            <Button
                              type="button"
                              onClick={() => void handleAddService(visitor.id)}
                              disabled={addingService}
                              className="flex-1"
                            >
                              {addingService ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : null}
                              {t('visitor.manage.saveService')}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              className="sm:w-auto"
                              onClick={() => {
                                setAddServiceForId(null);
                                setAddServiceName('');
                                setAddProgrammeId('');
                              }}
                            >
                              {t('common.cancel')}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full sm:w-auto"
                          onClick={() => {
                            setAddServiceForId(visitor.id);
                            setAddServiceName('');
                            setAddProgrammeId('');
                          }}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          {t('visitor.manage.addService')}
                        </Button>
                      )}
                    </div>
                  </div>
              ))}

              {totalPages > 1 && (
                <TablePagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  totalItems={totalCount}
                  onPageChange={(page) => {
                    setCurrentPage(page);
                    syncManageUrl({ page });
                  }}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setCurrentPage(1);
                    syncManageUrl({ limit: size, page: 1 });
                  }}
                  pageSizeOptions={[5, 10, 20, 50]}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
