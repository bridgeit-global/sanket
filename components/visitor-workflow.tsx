'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  PhoneUpdateForm,
  type MobileNumberEntry,
} from '@/components/phone-update-form';
import { VoterSearchPanel } from '@/components/voter-search-panel';
import { formatDisplayDateTimeIST } from '@/lib/ist-date';
import { isValidIndianMobile, normalizeIndianMobileDigits } from '@/lib/indian-mobile';
import { buildThermalTicketText, shareThermalTicketPdf } from '@/lib/thermal/receipt';
import type { VoterWithPartNo } from '@/lib/db/schema';
import type { ManageFilterState } from '@/lib/operator/manage-url-params';
import { TaskManagement } from '@/components/task-management';
import { ExternalLink, Loader2, Plus, Search, Share2, X } from 'lucide-react';

type WorkflowTab = 'visitor' | 'create' | 'tasks';

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
  token: string;
  location: string | null;
  createdAt: string | Date;
  services: VisitorServiceRow[];
};

type CreatedVisitorService = {
  serviceName: string;
  token: string;
  createdAt: string | Date;
  beneficiaryServiceId?: string | null;
  beneficiaryToken?: string | null;
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

const LINKED_PROGRAMME_STORAGE_KEY = 'visitor_linked_programme';

function readStoredLinkedProgramme(): string {
  if (typeof window === 'undefined') return '';
  try {
    const raw = sessionStorage.getItem(LINKED_PROGRAMME_STORAGE_KEY);
    if (!raw) return '';
    const v = JSON.parse(raw) as { programmeId?: string };
    return v.programmeId?.trim() || '';
  } catch {
    return '';
  }
}

function writeStoredLinkedProgramme(programmeId: string) {
  if (typeof window === 'undefined') return;
  const trimmed = programmeId.trim();
  if (!trimmed) {
    sessionStorage.removeItem(LINKED_PROGRAMME_STORAGE_KEY);
    return;
  }
  sessionStorage.setItem(
    LINKED_PROGRAMME_STORAGE_KEY,
    JSON.stringify({ programmeId: trimmed }),
  );
}

function normalizeInitialTab(tab?: string): WorkflowTab {
  if (tab === 'create' || tab === 'visitor') return tab;
  // Legacy ?tab=manage and ?tab=tasks both open Manage Tasks.
  if (tab === 'tasks' || tab === 'manage') return 'tasks';
  return 'visitor';
}

type VisitorWorkflowProps = {
  initialTab?: WorkflowTab | 'create' | 'manage' | 'tasks';
  initialTaskId?: string;
  initialTaskManageState?: Partial<ManageFilterState>;
};

export function VisitorWorkflow({
  initialTab = 'visitor',
  initialTaskId,
  initialTaskManageState,
}: VisitorWorkflowProps) {
  const { t } = useTranslations();
  const router = useRouter();

  const [tab, setTab] = useState<WorkflowTab>(normalizeInitialTab(initialTab));

  const [catalog, setCatalog] = useState<IndividualServiceRow[]>([]);
  const [programmes, setProgrammes] = useState<ProgrammeRow[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);

  // Visitor tab
  const [name, setName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [voterId, setVoterId] = useState('');
  const [location, setLocation] = useState('');
  const [isOutsider, setIsOutsider] = useState(false);
  const [creatingVisitor, setCreatingVisitor] = useState(false);
  const [createdVisitToken, setCreatedVisitToken] = useState<string | null>(null);
  const [createdVisitorSnapshot, setCreatedVisitorSnapshot] = useState<{
    id: string;
    name: string;
    mobileNumber: string;
    token: string;
    createdAt: string | Date;
  } | null>(null);
  const [selectedVoter, setSelectedVoterForPhone] = useState<VoterWithPartNo | null>(null);
  const [selectedVoterMobileNumbers, setSelectedVoterMobileNumbers] = useState<
    MobileNumberEntry[]
  >([]);
  const [showPhoneUpdate, setShowPhoneUpdate] = useState(false);
  const [programmeId, setProgrammeId] = useState(() => readStoredLinkedProgramme());
  const [programmesLoaded, setProgrammesLoaded] = useState(false);

  // Create Service tab
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorRow | null>(null);
  const [pendingServiceName, setPendingServiceName] = useState('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [creatingServices, setCreatingServices] = useState(false);
  const [createdServices, setCreatedServices] = useState<CreatedVisitorService[]>([]);
  const [createFilterTokenInput, setCreateFilterTokenInput] = useState('');
  const [createFilterNameInput, setCreateFilterNameInput] = useState('');
  const [createFilterMobileInput, setCreateFilterMobileInput] = useState('');
  const [createFilterVoterIdInput, setCreateFilterVoterIdInput] = useState('');
  const [createFilterCreatedFrom, setCreateFilterCreatedFrom] = useState('');
  const [createFilterCreatedTo, setCreateFilterCreatedTo] = useState('');
  const [createFilterToken, setCreateFilterToken] = useState('');
  const [createFilterName, setCreateFilterName] = useState('');
  const [createFilterMobile, setCreateFilterMobile] = useState('');
  const [createFilterVoterId, setCreateFilterVoterId] = useState('');
  const [createPickerVisitors, setCreatePickerVisitors] = useState<VisitorRow[]>([]);
  const [createPickerPage, setCreatePickerPage] = useState(1);
  const [createPickerPageSize, setCreatePickerPageSize] = useState(10);
  const [createPickerTotal, setCreatePickerTotal] = useState(0);
  const [createPickerTotalPages, setCreatePickerTotalPages] = useState(0);
  const [loadingCreatePicker, setLoadingCreatePicker] = useState(false);
  const createInvalidMobileToastRef = useRef(false);

  const [sharingToken, setSharingToken] = useState<string | null>(null);

  const outsiderMode = isOutsider || !voterId.trim();

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
          throw new Error('Failed to load meta');
        }
        const servicesJson = await servicesRes.json();
        const programmesJson = await programmesRes.json();
        if (!cancelled) {
          setCatalog(Array.isArray(servicesJson) ? servicesJson : []);
          setProgrammes(Array.isArray(programmesJson) ? programmesJson : []);
          setProgrammesLoaded(true);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          toast({ type: 'error', description: t('visitor.errors.loadMeta') });
          setProgrammesLoaded(true);
        }
      } finally {
        if (!cancelled) setLoadingMeta(false);
      }
    }
    void loadMeta();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep selected programme across visitor creates; drop it if no longer in today's list.
  useEffect(() => {
    if (!programmesLoaded) return;
    if (!programmeId) return;
    if (programmes.length === 0) {
      setProgrammeId('');
      writeStoredLinkedProgramme('');
      return;
    }
    if (!programmes.some((p) => p.id === programmeId)) {
      setProgrammeId('');
      writeStoredLinkedProgramme('');
    }
  }, [programmesLoaded, programmes, programmeId]);

  function handleProgrammeChange(value: string) {
    setProgrammeId(value);
    writeStoredLinkedProgramme(value);
  }

  const loadCreatePickerVisitors = useCallback(
    async (overrides?: {
      token?: string;
      mobile?: string;
      voterId?: string;
      name?: string;
      createdFrom?: string;
      createdTo?: string;
      page?: number;
      limit?: number;
    }) => {
      setLoadingCreatePicker(true);
      try {
        const token = overrides?.token ?? createFilterToken;
        const mobile = overrides?.mobile ?? createFilterMobile;
        const voterId = overrides?.voterId ?? createFilterVoterId;
        const name = overrides?.name ?? createFilterName;
        const createdFrom = overrides?.createdFrom ?? createFilterCreatedFrom;
        const createdTo = overrides?.createdTo ?? createFilterCreatedTo;
        const page = overrides?.page ?? createPickerPage;
        const limit = overrides?.limit ?? createPickerPageSize;

        const params = new URLSearchParams();
        if (token) params.set('token', token);
        if (mobile) params.set('mobile', mobile);
        if (voterId) params.set('voterId', voterId);
        if (name) params.set('name', name);
        if (createdFrom) params.set('createdFrom', createdFrom);
        if (createdTo) params.set('createdTo', createdTo);
        params.set('page', String(page));
        params.set('limit', String(limit));

        const res = await fetch(`/api/visitor?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to list visitors');
        const json = await res.json();
        setCreatePickerVisitors(json.visitors ?? []);
        setCreatePickerTotal(json.total ?? 0);
        setCreatePickerTotalPages(json.totalPages ?? 0);
        if (typeof json.currentPage === 'number' && json.currentPage !== page) {
          setCreatePickerPage(json.currentPage);
        }
      } catch (error) {
        console.error(error);
        toast({ type: 'error', description: t('visitor.errors.loadList') });
      } finally {
        setLoadingCreatePicker(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      createFilterToken,
      createFilterMobile,
      createFilterVoterId,
      createFilterName,
      createFilterCreatedFrom,
      createFilterCreatedTo,
      createPickerPage,
      createPickerPageSize,
    ],
  );

  useEffect(() => {
    if (tab === 'create' && !selectedVisitor && createdServices.length === 0) {
      void loadCreatePickerVisitors();
    }
  }, [tab, selectedVisitor, createdServices.length, loadCreatePickerVisitors]);

  useEffect(() => {
    if (tab !== 'create') return;
    const handle = window.setTimeout(() => {
      const nextToken = createFilterTokenInput.trim();
      const nextMobileRaw = createFilterMobileInput.trim();
      const nextVoter = createFilterVoterIdInput.trim().toUpperCase();
      const nextName = createFilterNameInput.trim();

      let appliedMobile = '';
      if (nextMobileRaw === '') {
        createInvalidMobileToastRef.current = false;
      } else if (isValidIndianMobile(nextMobileRaw)) {
        appliedMobile = normalizeIndianMobileDigits(nextMobileRaw);
        createInvalidMobileToastRef.current = false;
      } else if (!createInvalidMobileToastRef.current) {
        toast({
          type: 'error',
          description: t('visitor.errors.mobileInvalid'),
        });
        createInvalidMobileToastRef.current = true;
      }

      const changed =
        nextToken !== createFilterToken ||
        appliedMobile !== createFilterMobile ||
        nextVoter !== createFilterVoterId ||
        nextName !== createFilterName;

      if (changed) {
        setCreatePickerPage(1);
      }

      setCreateFilterToken(nextToken);
      setCreateFilterMobile(appliedMobile);
      setCreateFilterVoterId(nextVoter);
      setCreateFilterName(nextName);
    }, 400);

    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    tab,
    createFilterTokenInput,
    createFilterMobileInput,
    createFilterVoterIdInput,
    createFilterNameInput,
    createFilterToken,
    createFilterMobile,
    createFilterVoterId,
    createFilterName,
  ]);

  function switchTab(next: WorkflowTab) {
    setTab(next);
    router.replace(`?tab=${next}`, { scroll: false });
  }

  function selectVoter(voter: VoterWithPartNo) {
    setIsOutsider(false);
    setLocation('');
    setVoterId(voter.epicNumber || '');
    setName(voter.fullName || '');
    const mobile = voter.mobileNoPrimary || voter.mobileNoSecondary || '';
    if (mobile) setMobileNumber(mobile);

    // Same as beneficiary: always offer phone / DOB update after voter select.
    setSelectedVoterForPhone(voter);
    setSelectedVoterMobileNumbers([]);
    setShowPhoneUpdate(true);

    if (!voter.epicNumber) return;

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
  }

  async function handlePhoneUpdate(phoneData: {
    mobileNoPrimary: string;
    mobileNoSecondary?: string;
    dob?: string;
  }) {
    if (!selectedVoter) return;

    if (!isValidIndianMobile(phoneData.mobileNoPrimary)) {
      toast({
        type: 'error',
        description: t('operator.messages.invalidIndianMobile'),
      });
      return;
    }

    const secondaryTrimmed = phoneData.mobileNoSecondary?.trim() ?? '';
    if (secondaryTrimmed !== '' && !isValidIndianMobile(secondaryTrimmed)) {
      toast({
        type: 'error',
        description: t('operator.messages.invalidIndianMobile'),
      });
      return;
    }

    const primaryDigits = normalizeIndianMobileDigits(phoneData.mobileNoPrimary);
    const secondaryDigits =
      secondaryTrimmed !== '' ? normalizeIndianMobileDigits(secondaryTrimmed) : undefined;
    const dobToSave =
      !selectedVoter.dob?.trim() && phoneData.dob?.trim()
        ? phoneData.dob.trim()
        : undefined;

    try {
      const response = await fetch('/api/visitor/update-voter-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          epicNumber: selectedVoter.epicNumber,
          mobileNoPrimary: primaryDigits,
          mobileNoSecondary: secondaryDigits,
          ...(dobToSave ? { dob: dobToSave } : {}),
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          typeof data?.error === 'string' ? data.error : 'Failed to update phone number',
        );
      }

      const updatedVoter = (await response.json()) as VoterWithPartNo;
      setSelectedVoterForPhone((prev) => (prev ? { ...prev, ...updatedVoter } : updatedVoter));
      setMobileNumber(primaryDigits);
      setName(updatedVoter.fullName || selectedVoter.fullName || name);
      setVoterId(updatedVoter.epicNumber || selectedVoter.epicNumber || voterId);

      const updatedMobileNumbers: MobileNumberEntry[] = [
        { mobileNumber: primaryDigits, sortOrder: 1 },
      ];
      if (secondaryDigits) {
        updatedMobileNumbers.push({ mobileNumber: secondaryDigits, sortOrder: 2 });
      }
      setSelectedVoterMobileNumbers(updatedMobileNumbers);
      setShowPhoneUpdate(false);
      toast({
        type: 'success',
        description: t('operator.messages.phoneUpdatedSuccess'),
      });
    } catch (error) {
      console.error('Error updating phone number:', error);
      toast({
        type: 'error',
        description:
          error instanceof Error && error.message
            ? error.message
            : t('operator.messages.phoneUpdateFailed'),
      });
    }
  }

  function handleSkipPhoneUpdate() {
    if (selectedVoter) {
      setName(selectedVoter.fullName || name);
      setVoterId(selectedVoter.epicNumber || voterId);
      const fromList = selectedVoterMobileNumbers
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((entry) => entry.mobileNumber)
        .find((n) => n?.trim());
      const mobile =
        fromList ||
        selectedVoter.mobileNoPrimary ||
        selectedVoter.mobileNoSecondary ||
        mobileNumber;
      if (mobile) setMobileNumber(mobile);
    }
    setShowPhoneUpdate(false);
  }

  function handleCancelPhoneUpdate() {
    setShowPhoneUpdate(false);
    setSelectedVoterForPhone(null);
    setSelectedVoterMobileNumbers([]);
    setName('');
    setMobileNumber('');
    setVoterId('');
    setLocation('');
    setIsOutsider(false);
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

  function resetVisitorForm() {
    setName('');
    setMobileNumber('');
    setVoterId('');
    setLocation('');
    setIsOutsider(false);
    setCreatedVisitToken(null);
    setCreatedVisitorSnapshot(null);
    setSelectedVoterForPhone(null);
    setSelectedVoterMobileNumbers([]);
    setShowPhoneUpdate(false);
    // Keep programme selected across successive visitor registrations.
  }

  function applyCreatePickerFiltersFromInputs():
    | {
        token: string;
        mobile: string;
        voterId: string;
        name: string;
        createdFrom: string;
        createdTo: string;
      }
    | null {
    const nextToken = createFilterTokenInput.trim();
    const nextMobileRaw = createFilterMobileInput.trim();
    const nextVoter = createFilterVoterIdInput.trim().toUpperCase();
    const nextName = createFilterNameInput.trim();
    const nextCreatedFrom = createFilterCreatedFrom.trim();
    const nextCreatedTo = createFilterCreatedTo.trim();

    let appliedMobile = '';
    if (nextMobileRaw === '') {
      createInvalidMobileToastRef.current = false;
    } else if (isValidIndianMobile(nextMobileRaw)) {
      appliedMobile = normalizeIndianMobileDigits(nextMobileRaw);
      createInvalidMobileToastRef.current = false;
    } else {
      toast({
        type: 'error',
        description: t('visitor.errors.mobileInvalid'),
      });
      createInvalidMobileToastRef.current = true;
      return null;
    }

    if (
      nextCreatedFrom &&
      nextCreatedTo &&
      nextCreatedFrom > nextCreatedTo
    ) {
      toast({
        type: 'error',
        description: t('visitor.errors.dateRangeInvalid'),
      });
      return null;
    }

    setCreateFilterToken(nextToken);
    setCreateFilterMobile(appliedMobile);
    setCreateFilterVoterId(nextVoter);
    setCreateFilterName(nextName);
    setCreatePickerPage(1);
    return {
      token: nextToken,
      mobile: appliedMobile,
      voterId: nextVoter,
      name: nextName,
      createdFrom: nextCreatedFrom,
      createdTo: nextCreatedTo,
    };
  }

  function clearCreatePickerFilters() {
    setCreateFilterTokenInput('');
    setCreateFilterNameInput('');
    setCreateFilterMobileInput('');
    setCreateFilterVoterIdInput('');
    setCreateFilterCreatedFrom('');
    setCreateFilterCreatedTo('');
    setCreateFilterToken('');
    setCreateFilterName('');
    setCreateFilterMobile('');
    setCreateFilterVoterId('');
    setCreatePickerPage(1);
    createInvalidMobileToastRef.current = false;
  }

  function resetCreateServiceForm(keepVisitor = false) {
    if (!keepVisitor) {
      setSelectedVisitor(null);
    }
    setPendingServiceName('');
    setSelectedServices([]);
    setNotes('');
    setCreatedServices([]);
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

  async function handleCreateVisitor(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast({ type: 'error', description: t('visitor.errors.nameRequired') });
      return;
    }
    if (!isValidIndianMobile(mobileNumber)) {
      toast({ type: 'error', description: t('visitor.errors.mobileInvalid') });
      return;
    }
    const effectiveVoterId = outsiderMode ? null : voterId.trim().toUpperCase() || null;
    if (!effectiveVoterId && !location.trim()) {
      toast({ type: 'error', description: t('visitor.errors.locationRequired') });
      return;
    }

    setCreatingVisitor(true);
    setCreatedVisitToken(null);
    try {
      const res = await fetch('/api/visitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          mobileNumber: mobileNumber.trim(),
          voterId: effectiveVoterId,
          location: outsiderMode ? location.trim() : location.trim() || null,
          programmeId: programmeId || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Create failed');

      const visitor = json.visitor as {
        id: string;
        name: string;
        mobileNumber: string;
        token: string;
        createdAt?: string | Date;
      };
      setCreatedVisitToken(visitor.token);
      setCreatedVisitorSnapshot({
        id: visitor.id,
        name: visitor.name,
        mobileNumber: visitor.mobileNumber,
        token: visitor.token,
        createdAt: visitor.createdAt ?? new Date().toISOString(),
      });
      toast({ type: 'success', description: t('visitor.create.visitorSuccess') });
    } catch (error) {
      console.error(error);
      toast({
        type: 'error',
        description: error instanceof Error ? error.message : t('visitor.errors.create'),
      });
    } finally {
      setCreatingVisitor(false);
    }
  }

  async function handleCreateServices(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedVisitor) {
      toast({ type: 'error', description: t('visitor.errors.visitorRequired') });
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

    setCreatingServices(true);
    setCreatedServices([]);
    try {
      const res = await fetch(`/api/visitor/${selectedVisitor.id}/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceNames: servicesToCreate,
          programmeId: programmeId || null,
          notes: notes.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create services');
      const beneficiaryByIndex = Array.isArray(json.beneficiaryServices)
        ? json.beneficiaryServices
        : [];
      const created = Array.isArray(json.services)
        ? json.services.map(
            (
              s: {
                serviceName: string;
                token: string;
                createdAt?: string | Date;
                beneficiaryServiceId?: string | null;
              },
              index: number,
            ) => {
              const beneficiary = beneficiaryByIndex[index] as
                | { id?: string; token?: string }
                | undefined;
              return {
                serviceName: s.serviceName,
                token: beneficiary?.token || s.token,
                createdAt: s.createdAt ?? new Date().toISOString(),
                beneficiaryServiceId: beneficiary?.id ?? s.beneficiaryServiceId ?? null,
                beneficiaryToken: beneficiary?.token ?? null,
              };
            },
          )
        : [];
      setCreatedServices(created);
      toast({ type: 'success', description: t('visitor.create.servicesSuccess') });
      setSelectedServices([]);
      setPendingServiceName('');
      setNotes('');
    } catch (error) {
      console.error(error);
      toast({
        type: 'error',
        description: error instanceof Error ? error.message : t('visitor.errors.addService'),
      });
    } finally {
      setCreatingServices(false);
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
          variant={tab === 'visitor' ? 'default' : 'ghost'}
          onClick={() => switchTab('visitor')}
          className="flex-1 text-sm sm:text-base"
        >
          <span className="hidden sm:inline">{t('visitor.tabs.visitor')}</span>
          <span className="sm:hidden">{t('visitor.tabs.visitorShort')}</span>
        </Button>
        <Button
          variant={tab === 'create' ? 'default' : 'ghost'}
          onClick={() => switchTab('create')}
          className="flex-1 text-sm sm:text-base"
        >
          <span className="hidden sm:inline">{t('visitor.tabs.createService')}</span>
          <span className="sm:hidden">{t('visitor.tabs.create')}</span>
        </Button>
        <Button
          variant={tab === 'tasks' ? 'default' : 'ghost'}
          onClick={() => switchTab('tasks')}
          className="flex-1 text-sm sm:text-base"
        >
          <span className="hidden sm:inline">{t('visitor.tabs.manageTasks')}</span>
          <span className="sm:hidden">{t('visitor.tabs.manage')}</span>
        </Button>
      </div>

      {tab === 'visitor' && (
        <>
          {createdVisitToken && createdVisitorSnapshot ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-green-600">{t('visitor.create.visitorSuccessTitle')}</CardTitle>
                <CardDescription>{t('visitor.create.visitorSuccessDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4 text-center sm:p-6">
                  <Label className="text-sm font-medium text-green-800">
                    {t('visitor.create.visitTokenLabel')}
                  </Label>
                  <p className="mt-2 break-all font-mono text-xl font-bold tracking-wide text-green-900 sm:text-2xl">
                    {createdVisitToken}
                  </p>
                  <p className="mt-2 text-sm text-green-700">{t('visitor.create.saveToken')}</p>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-4 w-full sm:w-auto"
                    disabled={sharingToken === createdVisitToken}
                    onClick={() =>
                      void shareVisitorThermalTicket({
                        token: createdVisitToken,
                        createdAt: createdVisitorSnapshot.createdAt,
                        serviceName: t('visitor.create.visitTokenLabel'),
                        name: createdVisitorSnapshot.name,
                        mobile: createdVisitorSnapshot.mobileNumber,
                      })
                    }
                  >
                    {sharingToken === createdVisitToken ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Share2 className="mr-2 h-4 w-4" />
                    )}
                    {t('visitor.create.printToken')}
                  </Button>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
                  <Button onClick={resetVisitorForm} className="flex-1">
                    {t('visitor.create.createAnotherVisitor')}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      resetCreateServiceForm(true);
                      setSelectedVisitor({
                        id: createdVisitorSnapshot.id,
                        name: createdVisitorSnapshot.name,
                        mobileNumber: createdVisitorSnapshot.mobileNumber,
                        voterId: null,
                        token: createdVisitorSnapshot.token,
                        location: null,
                        createdAt: createdVisitorSnapshot.createdAt,
                        services: [],
                      });
                      switchTab('create');
                    }}
                  >
                    {t('visitor.create.addServicesNext')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : showPhoneUpdate && selectedVoter ? (
            <PhoneUpdateForm
              voter={selectedVoter}
              mobileNumbers={selectedVoterMobileNumbers}
              onPhoneUpdate={(phoneData) => {
                void handlePhoneUpdate(phoneData);
              }}
              onSkip={handleSkipPhoneUpdate}
              onPrevious={handleCancelPhoneUpdate}
              onCancel={handleCancelPhoneUpdate}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>{t('visitor.create.visitorTitle')}</CardTitle>
                <CardDescription className="text-sm">
                  {t('visitor.create.visitorDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {!isOutsider && (
                  <VoterSearchPanel
                    searchEndpoint="/api/visitor/search-voter"
                    onSelectVoter={selectVoter}
                    title={t('operator.search.title')}
                    description={t('visitor.form.searchVoterHelp')}
                  />
                )}

                <form onSubmit={handleCreateVisitor} className="space-y-6">
                  <div className="space-y-2 border-b pb-4">
                    <Label>{t('visitor.form.programme')}</Label>
                    <Combobox
                      options={programmeOptions}
                      value={programmeId}
                      onValueChange={handleProgrammeChange}
                      placeholder={t('visitor.form.programmePlaceholder')}
                      disabled={loadingMeta}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="visitor-outsider"
                      checked={isOutsider}
                      onChange={(e) => {
                        const next = e.target.checked;
                        setIsOutsider(next);
                        if (next) {
                          setVoterId('');
                          setSelectedVoterForPhone(null);
                          setShowPhoneUpdate(false);
                        }
                      }}
                    />
                    <Label htmlFor="visitor-outsider" className="cursor-pointer font-normal">
                      {t('visitor.form.outsider')}
                    </Label>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="visitor-name">
                        {t('visitor.form.name')} <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="visitor-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="visitor-mobile">
                        {t('visitor.form.mobile')} <span className="text-red-500">*</span>
                      </Label>
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
                    {!isOutsider && (
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
                    )}
                    {outsiderMode && (
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="visitor-location">
                          {t('visitor.form.location')} <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="visitor-location"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          placeholder={t('visitor.form.locationPlaceholder')}
                          required
                        />
                      </div>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={
                      creatingVisitor ||
                      !name.trim() ||
                      !isValidIndianMobile(mobileNumber) ||
                      (outsiderMode && !location.trim())
                    }
                    className="w-full sm:w-auto"
                  >
                    {creatingVisitor ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('visitor.create.submittingVisitor')}
                      </>
                    ) : (
                      t('visitor.create.submitVisitor')
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {tab === 'create' && (
        <>
          {createdServices.length > 0 && selectedVisitor ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-green-600">{t('visitor.create.servicesSuccessTitle')}</CardTitle>
                <CardDescription>{t('visitor.create.servicesSuccessDescription')}</CardDescription>
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
                      <p className="mt-2 text-sm text-green-700">{t('visitor.create.saveToken')}</p>
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
                            name: selectedVisitor.name,
                            mobile: selectedVisitor.mobileNumber,
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
                  {createdServices.find((s) => s.beneficiaryServiceId) ? (
                    <Button
                      asChild
                      className="flex-1"
                    >
                      <Link
                        href={`/modules/operator?tab=tasks&taskId=${encodeURIComponent(
                          createdServices.find((s) => s.beneficiaryServiceId)!
                            .beneficiaryServiceId!,
                        )}`}
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        {t('visitor.manage.openBeneficiary')}
                      </Link>
                    </Button>
                  ) : null}
                  <Button
                    variant="outline"
                    onClick={() => resetCreateServiceForm(true)}
                    className="flex-1"
                  >
                    {t('visitor.create.addMoreServices')}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      resetCreateServiceForm();
                      switchTab('tasks');
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
                <CardTitle>{t('visitor.create.serviceTitle')}</CardTitle>
                <CardDescription className="text-sm">
                  {t('visitor.create.serviceDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2 border-b pb-4">
                  <Label>{t('visitor.form.programme')}</Label>
                  <Combobox
                    options={programmeOptions}
                    value={programmeId}
                    onValueChange={handleProgrammeChange}
                    placeholder={t('visitor.form.programmePlaceholder')}
                    disabled={loadingMeta}
                  />
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label>{t('visitor.form.selectVisitor')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('visitor.form.selectVisitorHelp')}
                    </p>
                  </div>
                  {selectedVisitor ? (
                    <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 text-sm">
                        <p className="font-medium">{selectedVisitor.name}</p>
                        <p className="font-mono text-muted-foreground">
                          {selectedVisitor.token} · {selectedVisitor.mobileNumber}
                          {selectedVisitor.voterId ? ` · ${selectedVisitor.voterId}` : ''}
                        </p>
                        {selectedVisitor.location ? (
                          <p className="text-muted-foreground">{selectedVisitor.location}</p>
                        ) : null}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedVisitor(null)}
                      >
                        {t('visitor.form.changeVisitor')}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4 rounded-lg border p-3 sm:p-4">
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="create-visitor-created-from-filter">
                            {t('visitor.manage.filters.createdFrom')}
                          </Label>
                          <Input
                            id="create-visitor-created-from-filter"
                            type="date"
                            value={createFilterCreatedFrom}
                            max={createFilterCreatedTo || undefined}
                            onChange={(e) => {
                              setCreateFilterCreatedFrom(e.target.value);
                              setCreatePickerPage(1);
                            }}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="create-visitor-created-to-filter">
                            {t('visitor.manage.filters.createdTo')}
                          </Label>
                          <Input
                            id="create-visitor-created-to-filter"
                            type="date"
                            value={createFilterCreatedTo}
                            min={createFilterCreatedFrom || undefined}
                            onChange={(e) => {
                              setCreateFilterCreatedTo(e.target.value);
                              setCreatePickerPage(1);
                            }}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="create-visitor-token-filter">
                            {t('visitor.manage.filters.token')}
                          </Label>
                          <Input
                            id="create-visitor-token-filter"
                            placeholder={t('visitor.manage.filters.enterToken')}
                            value={createFilterTokenInput}
                            onChange={(e) => setCreateFilterTokenInput(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="create-visitor-name-filter">
                            {t('visitor.manage.filters.name')}
                          </Label>
                          <Input
                            id="create-visitor-name-filter"
                            placeholder={t('visitor.manage.filters.enterName')}
                            value={createFilterNameInput}
                            onChange={(e) => setCreateFilterNameInput(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="create-visitor-mobile-filter">
                            {t('visitor.manage.filters.mobileNumber')}
                          </Label>
                          <Input
                            id="create-visitor-mobile-filter"
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            autoComplete="tel"
                            maxLength={13}
                            placeholder={t('visitor.manage.filters.enterMobile')}
                            value={createFilterMobileInput}
                            onChange={(e) =>
                              setCreateFilterMobileInput(e.target.value.replace(/\D/g, ''))
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="create-visitor-voter-filter">
                            {t('visitor.manage.filters.voterId')}
                          </Label>
                          <Input
                            id="create-visitor-voter-filter"
                            placeholder={t('visitor.manage.filters.enterVoterId')}
                            value={createFilterVoterIdInput}
                            onChange={(e) =>
                              setCreateFilterVoterIdInput(e.target.value.toUpperCase())
                            }
                            className="font-mono uppercase"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-muted-foreground">
                          {t('visitor.manage.filters.showing', {
                            count: createPickerVisitors.length,
                            total: createPickerTotal,
                          })}
                        </p>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Button
                            type="button"
                            onClick={() => {
                              const applied = applyCreatePickerFiltersFromInputs();
                              if (!applied) return;
                              void loadCreatePickerVisitors({
                                ...applied,
                                page: 1,
                              });
                            }}
                            disabled={loadingCreatePicker}
                            className="w-full sm:w-auto"
                          >
                            {loadingCreatePicker ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {t('visitor.manage.actions.searching')}
                              </>
                            ) : (
                              <>
                                <Search className="mr-2 h-4 w-4" />
                                {t('visitor.manage.actions.search')}
                              </>
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={clearCreatePickerFilters}
                            className="w-full sm:w-auto"
                          >
                            {t('visitor.manage.actions.clearFilters')}
                          </Button>
                        </div>
                      </div>

                      {loadingCreatePicker && createPickerVisitors.length === 0 ? (
                        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t('visitor.form.searchingVisitors')}
                        </div>
                      ) : createPickerVisitors.length === 0 ? (
                        <div className="rounded-md border border-dashed py-8 text-center">
                          <p className="text-sm text-muted-foreground">
                            {t('visitor.form.noVisitorsFound')}
                          </p>
                        </div>
                      ) : (
                        <ul className="divide-y rounded-lg border">
                          {createPickerVisitors.map((v) => (
                            <li key={v.id}>
                              <button
                                type="button"
                                className="flex w-full flex-col gap-1 px-3 py-3 text-left text-sm hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
                                onClick={() => setSelectedVisitor(v)}
                              >
                                <div className="min-w-0">
                                  <p className="font-medium">{v.name}</p>
                                  <p className="font-mono text-xs text-muted-foreground">
                                    {v.token} · {v.mobileNumber}
                                    {v.voterId ? ` · ${v.voterId}` : ''}
                                  </p>
                                  {v.location ? (
                                    <p className="text-xs text-muted-foreground">{v.location}</p>
                                  ) : null}
                                </div>
                                <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                                  <Badge variant="secondary">
                                    {t('visitor.manage.serviceCount', {
                                      count: v.services?.length ?? 0,
                                    })}
                                  </Badge>
                                  <span>{formatDisplayDateTimeIST(v.createdAt)}</span>
                                </div>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}

                      {createPickerTotal > 0 ? (
                        <TablePagination
                          currentPage={createPickerPage}
                          totalPages={createPickerTotalPages}
                          pageSize={createPickerPageSize}
                          totalItems={createPickerTotal}
                          onPageChange={setCreatePickerPage}
                          onPageSizeChange={(size) => {
                            setCreatePickerPageSize(size);
                            setCreatePickerPage(1);
                          }}
                          pageSizeOptions={[5, 10, 20, 50]}
                        />
                      ) : null}
                    </div>
                  )}
                </div>

                <form onSubmit={handleCreateServices} className="space-y-6">
                  <div className="space-y-2">
                    <Label>
                      {t('visitor.form.services')} <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <div className="min-w-0 flex-1">
                        <Combobox
                          options={serviceOptions}
                          value={pendingServiceName}
                          onValueChange={setPendingServiceName}
                          placeholder={t('visitor.form.servicePlaceholder')}
                          disabled={loadingMeta || !selectedVisitor}
                          allowCustom
                        />
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={addSelectedService}
                        disabled={
                          loadingMeta || !selectedVisitor || !pendingServiceName.trim()
                        }
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
                    <Label htmlFor="service-notes">{t('visitor.form.notes')}</Label>
                    <Textarea
                      id="service-notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      disabled={!selectedVisitor}
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={
                      creatingServices ||
                      loadingMeta ||
                      !selectedVisitor ||
                      (selectedServices.length === 0 && !pendingServiceName.trim())
                    }
                    className="w-full sm:w-auto"
                  >
                    {creatingServices ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('visitor.create.submittingServices')}
                      </>
                    ) : (
                      t('visitor.create.submitServices')
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {tab === 'tasks' && (
        <TaskManagement
          initialTaskId={initialTaskId}
          initialManageState={initialTaskManageState}
        />
      )}

    </div>
  );
}
