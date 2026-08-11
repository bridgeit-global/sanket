'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  PhoneUpdateForm,
  type MobileNumberEntry,
} from '@/components/phone-update-form';
import { VoterSearchPanel } from '@/components/voter-search-panel';
import { formatDisplayDateIST, formatDisplayDateTimeIST } from '@/lib/ist-date';
import { isValidIndianMobile, normalizeIndianMobileDigits } from '@/lib/indian-mobile';
import { buildThermalTicketText, shareThermalTicketPdf } from '@/lib/thermal/receipt';
import type {
  BeneficiaryService,
  VoterMaster,
  VoterWithPartNo,
} from '@/lib/db/schema';
import type { CadreMemberCard } from '@/lib/hierarchy/types';
import type { ManageFilterState } from '@/lib/operator/manage-url-params';
import { TaskManagement } from '@/components/task-management';
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  Pencil,
  Plus,
  QrCode,
  Search,
  Share2,
  X,
} from 'lucide-react';
import { QrScannerDialog } from '@/components/qr-scanner-dialog';
import { AadhaarQrScanButton, AadhaarQrScannerDialog } from '@/components/aadhaar-qr-scanner-dialog';
import {
  formatAadhaarAddress,
  type AadhaarQrData,
} from '@/lib/aadhaar/decode-qr-payload';

type WorkflowTab = 'visitor' | 'meeting-lineup' | 'tasks';

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
  canChangeService?: boolean;
};

type VisitorRow = {
  id: string;
  name: string;
  mobileNumber: string;
  voterId: string | null;
  token: string;
  location: string | null;
  programmeId: string | null;
  createdAt: string | Date;
  services: VisitorServiceRow[];
};

type LetterSummary = {
  id: string;
  beneficiaryServiceId: string | null;
  letterType: string;
  referenceNo: string;
  title: string;
  printedAt: string | Date | null;
  createdAt: string | Date;
  pdfStoragePath: string | null;
};

type AttachmentSummary = {
  id: string;
  serviceId: string;
  fileName: string;
  fileSizeKb: number;
  fileUrl: string | null;
  createdAt: string | Date;
};

type VotingHistoryRow = {
  epicNumber: string;
  electionId: string;
  hasVoted: boolean | null;
  electionYear: number | null;
  electionType: string | null;
};

type RelatedVoterRow = VoterMaster & {
  mobileNumbers?: Array<{ mobileNumber: string; sortOrder: number }>;
  votingHistory?: VotingHistoryRow[];
};

type VisitorVoterDetails = {
  success: boolean;
  hasVoter: boolean;
  voterNotFound?: boolean;
  visitor?: VisitorRow;
  voter: VoterMaster | null;
  voterMobileNumbers: Array<{ mobileNumber: string; sortOrder: number }>;
  relatedVoters: RelatedVoterRow[];
  beneficiaryServices: {
    individual: BeneficiaryService[];
    community: BeneficiaryService[];
  };
  dailyProgrammeEvents: Array<{
    id: string;
    title: string;
    remarks: string | null;
    attended: boolean | null;
    date: string | Date;
    startTime: string;
    endTime: string;
    location: string;
    visitorName?: string;
  }>;
  relatedVotersData: Array<{
    voter: VoterMaster;
    services: {
      individual: BeneficiaryService[];
      community: BeneficiaryService[];
    };
  }>;
  cadreMembers: CadreMemberCard[];
  votingHistory: VotingHistoryRow[];
  letters: LetterSummary[];
  attachments: AttachmentSummary[];
  error?: string;
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

function extractTokenFromQrPayload(payload: string): string | null {
  const raw = (payload ?? '').trim();
  if (!raw) return null;

  try {
    const url = new URL(raw);
    const tokenParam =
      url.searchParams.get('token') ??
      url.searchParams.get('tokenNo') ??
      url.searchParams.get('token_no') ??
      url.searchParams.get('tokenNumber') ??
      url.searchParams.get('token_number');
    if (tokenParam?.trim()) return tokenParam.trim();
  } catch {
    // Not a URL.
  }

  if (/^[A-Za-z0-9-]{2,}$/.test(raw)) return raw;

  return (
    raw.match(/\b[A-Za-z]{1,10}-\d{1,10}\b/)?.[0] ??
    raw.match(/\b\d{1,10}\b/)?.[0] ??
    null
  );
}

function normalizeInitialTab(tab?: string): WorkflowTab {
  if (tab === 'visitor') return tab;
  // Prefer meeting-lineup; accept legacy ?tab=create deep links.
  if (tab === 'meeting-lineup' || tab === 'create') return 'meeting-lineup';
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
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [pendingTaskNavId, setPendingTaskNavId] = useState<string | undefined>();
  // Prefer live URL/pending over server prop so stale initialTaskId can't pin the tab.
  const deepLinkTaskId =
    pendingTaskNavId ??
    searchParams.get('taskId') ??
    searchParams.get('serviceId') ??
    undefined;

  // URL (+ pending navigate) is the source of truth so tab UI can't desync.
  const tab = useMemo<WorkflowTab>(() => {
    if (deepLinkTaskId) return 'tasks';
    return normalizeInitialTab(
      searchParams.get('tab') ?? initialTab ?? (initialTaskId ? 'tasks' : 'visitor'),
    );
  }, [deepLinkTaskId, searchParams, initialTab, initialTaskId]);

  useEffect(() => {
    const urlTaskId = searchParams.get('taskId') ?? searchParams.get('serviceId');
    if (pendingTaskNavId && urlTaskId === pendingTaskNavId) {
      setPendingTaskNavId(undefined);
    }
  }, [searchParams, pendingTaskNavId]);

  const [catalog, setCatalog] = useState<IndividualServiceRow[]>([]);
  const [programmes, setProgrammes] = useState<ProgrammeRow[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);

  // Visitor tab
  const [name, setName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [voterId, setVoterId] = useState('');
  const [location, setLocation] = useState('');
  const [isOutsider, setIsOutsider] = useState(false);
  const [showAadhaarScanner, setShowAadhaarScanner] = useState(false);
  const [creatingVisitor, setCreatingVisitor] = useState(false);
  const [createdVisitToken, setCreatedVisitToken] = useState<string | null>(null);
  const [createdVisitorSnapshot, setCreatedVisitorSnapshot] = useState<{
    id: string;
    name: string;
    mobileNumber: string;
    token: string;
    programmeId: string | null;
    createdAt: string | Date;
    serviceName: string | null;
  } | null>(null);
  const [selectedVoter, setSelectedVoterForPhone] = useState<VoterWithPartNo | null>(null);
  const [selectedVoterMobileNumbers, setSelectedVoterMobileNumbers] = useState<
    MobileNumberEntry[]
  >([]);
  const [showPhoneUpdate, setShowPhoneUpdate] = useState(false);
  const [pendingVisitConfirm, setPendingVisitConfirm] = useState<{
    name: string;
    mobileNumber: string;
    secondaryMobile: string | null;
    voterId: string | null;
    location: string | null;
  } | null>(null);
  const [visitConfirmServiceName, setVisitConfirmServiceName] = useState('');
  const [programmeId, setProgrammeId] = useState(() => readStoredLinkedProgramme());
  const [programmesLoaded, setProgrammesLoaded] = useState(false);

  // Meeting Line Up tab — filters collapsed by default; visitor lineup always visible
  const [createServiceFiltersOpen, setCreateServiceFiltersOpen] = useState(false);
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
  const [showTokenQrScanner, setShowTokenQrScanner] = useState(false);
  const createInvalidMobileToastRef = useRef(false);

  const [sharingToken, setSharingToken] = useState<string | null>(null);
  const [expandedVisitorIds, setExpandedVisitorIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [voterDetailsByVisitorId, setVoterDetailsByVisitorId] = useState<
    Record<string, VisitorVoterDetails>
  >({});
  const [loadingVoterDetailsIds, setLoadingVoterDetailsIds] = useState<
    Set<string>
  >(() => new Set());
  const [serviceBeingChanged, setServiceBeingChanged] = useState<{
    visitorId: string;
    service: VisitorServiceRow;
  } | null>(null);
  const [changeServiceName, setChangeServiceName] = useState('');
  const [changingService, setChangingService] = useState(false);

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
    }): Promise<VisitorRow[]> => {
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
        const visitors = (json.visitors ?? []) as VisitorRow[];
        setCreatePickerVisitors(visitors);
        setCreatePickerTotal(json.total ?? 0);
        setCreatePickerTotalPages(json.totalPages ?? 0);
        if (typeof json.currentPage === 'number' && json.currentPage !== page) {
          setCreatePickerPage(json.currentPage);
        }
        return visitors;
      } catch (error) {
        console.error(error);
        toast({ type: 'error', description: t('visitor.errors.loadList') });
        return [];
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
    if (tab === 'meeting-lineup') {
      void loadCreatePickerVisitors();
    }
  }, [tab, loadCreatePickerVisitors]);

  useEffect(() => {
    if (tab !== 'meeting-lineup') return;
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
    setPendingTaskNavId(undefined);
    router.replace(`${pathname}?tab=${next}`, { scroll: false });
  }

  function navigateToBeneficiaryTask(beneficiaryServiceId: string) {
    resetCreateServiceForm();
    setPendingTaskNavId(beneficiaryServiceId);
    router.push(
      `${pathname}?tab=tasks&taskId=${encodeURIComponent(beneficiaryServiceId)}`,
      { scroll: false },
    );
  }

  function selectVoter(voter: VoterWithPartNo) {
    setIsOutsider(false);
    setLocation('');
    setVoterId(voter.epicNumber || '');
    setName(voter.fullName || '');
    const mobile = voter.mobileNoPrimary || voter.mobileNoSecondary || '';
    if (mobile) setMobileNumber(normalizeIndianMobileDigits(mobile).slice(0, 10));

    setSelectedVoterForPhone(voter);
    setPendingVisitConfirm(null);
    setVisitConfirmServiceName('');

    const seeded: MobileNumberEntry[] = [];
    if (voter.mobileNoPrimary?.trim()) {
      seeded.push({
        mobileNumber: normalizeIndianMobileDigits(voter.mobileNoPrimary),
        sortOrder: 1,
      });
    }
    if (voter.mobileNoSecondary?.trim()) {
      seeded.push({
        mobileNumber: normalizeIndianMobileDigits(voter.mobileNoSecondary),
        sortOrder: seeded.length + 1,
      });
    }
    setSelectedVoterMobileNumbers(seeded);

    // Always confirm / update phones (incl. secondary) before issuing a visit token.
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

  function openVisitConfirm(params: {
    name: string;
    mobileNumber: string;
    secondaryMobile?: string | null;
    voterId: string | null;
    location: string | null;
  }) {
    const primary = normalizeIndianMobileDigits(params.mobileNumber);
    if (!isValidIndianMobile(primary)) {
      toast({
        type: 'error',
        description: t('visitor.errors.mobileInvalid'),
      });
      return;
    }

    const secondaryRaw = params.secondaryMobile?.trim() || '';
    const secondary =
      secondaryRaw && isValidIndianMobile(secondaryRaw)
        ? normalizeIndianMobileDigits(secondaryRaw)
        : null;

    setMobileNumber(primary);
    setName(params.name);
    if (params.voterId) setVoterId(params.voterId);
    setShowPhoneUpdate(false);
    setVisitConfirmServiceName('');
    setPendingVisitConfirm({
      name: params.name.trim(),
      mobileNumber: primary,
      secondaryMobile: secondary && secondary !== primary ? secondary : null,
      voterId: params.voterId?.trim().toUpperCase() || null,
      location: params.location?.trim() || null,
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
      const nextName = updatedVoter.fullName || selectedVoter.fullName || name;
      const nextVoterId = updatedVoter.epicNumber || selectedVoter.epicNumber || voterId;

      setSelectedVoterForPhone((prev) => (prev ? { ...prev, ...updatedVoter } : updatedVoter));
      setMobileNumber(primaryDigits);
      setName(nextName);
      setVoterId(nextVoterId);

      const updatedMobileNumbers: MobileNumberEntry[] = [
        { mobileNumber: primaryDigits, sortOrder: 1 },
      ];
      if (secondaryDigits) {
        updatedMobileNumbers.push({ mobileNumber: secondaryDigits, sortOrder: 2 });
      }
      setSelectedVoterMobileNumbers(updatedMobileNumbers);
      toast({
        type: 'success',
        description: t('operator.messages.phoneUpdatedSuccess'),
      });

      openVisitConfirm({
        name: nextName,
        mobileNumber: primaryDigits,
        secondaryMobile: secondaryDigits ?? null,
        voterId: nextVoterId,
        location: null,
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
    if (!selectedVoter) {
      setShowPhoneUpdate(false);
      return;
    }

    const nextName = selectedVoter.fullName || name;
    const nextVoterId = selectedVoter.epicNumber || voterId;
    const ordered = selectedVoterMobileNumbers
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((entry) => entry.mobileNumber)
      .filter((n) => n?.trim());
    const nextMobile =
      ordered[0] ||
      selectedVoter.mobileNoPrimary ||
      selectedVoter.mobileNoSecondary ||
      mobileNumber;
    const nextSecondary = ordered[1] || selectedVoter.mobileNoSecondary || null;

    openVisitConfirm({
      name: nextName,
      mobileNumber: nextMobile || '',
      secondaryMobile: nextSecondary,
      voterId: nextVoterId,
      location: null,
    });
  }

  function handleCancelPhoneUpdate() {
    setShowPhoneUpdate(false);
    setSelectedVoterForPhone(null);
    setSelectedVoterMobileNumbers([]);
    setPendingVisitConfirm(null);
    setVisitConfirmServiceName('');
    setName('');
    setMobileNumber('');
    setVoterId('');
    setLocation('');
    setIsOutsider(false);
  }

  const handleOutsiderAadhaarDetected = useCallback((data: AadhaarQrData) => {
    if (data.name.trim()) {
      setName(data.name.trim());
    }
    const address = formatAadhaarAddress(data);
    if (address) {
      setLocation(address);
    }
  }, []);

  function handleBackToPhoneUpdate() {
    setPendingVisitConfirm(null);
    setVisitConfirmServiceName('');
    if (selectedVoter) {
      setShowPhoneUpdate(true);
    }
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
    setPendingVisitConfirm(null);
    setVisitConfirmServiceName('');
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

  function openAddServiceModal(visitor: VisitorRow) {
    setSelectedVisitor(visitor);
    setPendingServiceName('');
    setSelectedServices([]);
    setNotes('');
    setCreatedServices([]);
  }

  function closeAddServiceModal() {
    resetCreateServiceForm();
    void loadCreatePickerVisitors();
  }

  function openChangeServiceDialog(visitorId: string, service: VisitorServiceRow) {
    setServiceBeingChanged({ visitorId, service });
    setChangeServiceName(service.serviceName);
  }

  function closeChangeServiceDialog() {
    setServiceBeingChanged(null);
    setChangeServiceName('');
    setChangingService(false);
  }

  function applyServiceNameUpdate(
    visitorId: string,
    updatedService: VisitorServiceRow,
  ) {
    setCreatePickerVisitors((prev) =>
      prev.map((visitor) =>
        visitor.id !== visitorId
          ? visitor
          : {
              ...visitor,
              services: visitor.services.map((service) =>
                service.id === updatedService.id
                  ? { ...service, ...updatedService }
                  : service,
              ),
            },
      ),
    );
    setSelectedVisitor((prev) => {
      if (!prev || prev.id !== visitorId) return prev;
      return {
        ...prev,
        services: prev.services.map((service) =>
          service.id === updatedService.id
            ? { ...service, ...updatedService }
            : service,
        ),
      };
    });
  }

  async function handleChangeService(e: React.FormEvent) {
    e.preventDefault();
    if (!serviceBeingChanged) return;

    const nextName = changeServiceName.trim();
    if (!nextName) {
      toast({
        type: 'error',
        description: t('visitor.errors.changeServiceRequired'),
      });
      return;
    }
    if (nextName === serviceBeingChanged.service.serviceName) {
      closeChangeServiceDialog();
      return;
    }

    setChangingService(true);
    try {
      const res = await fetch(
        `/api/visitor/services/${serviceBeingChanged.service.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ serviceName: nextName }),
        },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to change service');

      const updated = json.visitorService as VisitorServiceRow;
      applyServiceNameUpdate(serviceBeingChanged.visitorId, {
        ...serviceBeingChanged.service,
        ...updated,
        serviceName: updated.serviceName ?? nextName,
        canChangeService: updated.canChangeService ?? true,
      });
      toast({
        type: 'success',
        description: t('visitor.manage.changeServiceSuccess'),
      });
      closeChangeServiceDialog();
    } catch (error) {
      console.error(error);
      toast({
        type: 'error',
        description:
          error instanceof Error ? error.message : t('visitor.errors.changeService'),
      });
    } finally {
      setChangingService(false);
    }
  }

  async function handleVisitTokenQrScan(payload: string) {
    const token = extractTokenFromQrPayload(payload);
    if (!token) {
      toast({ type: 'error', description: t('visitor.errors.invalidTokenQr') });
      throw new Error('Invalid token QR');
    }

    setCreateFilterTokenInput(token);
    setCreateFilterToken(token);
    setCreateFilterNameInput('');
    setCreateFilterName('');
    setCreateFilterMobileInput('');
    setCreateFilterMobile('');
    setCreateFilterVoterIdInput('');
    setCreateFilterVoterId('');
    setCreatePickerPage(1);

    const visitors = await loadCreatePickerVisitors({
      token,
      name: '',
      mobile: '',
      voterId: '',
      page: 1,
    });

    if (visitors.length === 1) {
      openAddServiceModal(visitors[0]);
    } else if (visitors.length === 0) {
      toast({ type: 'error', description: t('visitor.form.noVisitorsFound') });
    }
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

  async function loadVisitorVoterDetails(visitorId: string) {
    if (voterDetailsByVisitorId[visitorId] || loadingVoterDetailsIds.has(visitorId)) {
      return;
    }
    setLoadingVoterDetailsIds((prev) => {
      const next = new Set(prev);
      next.add(visitorId);
      return next;
    });
    try {
      const res = await fetch(
        `/api/visitor/${encodeURIComponent(visitorId)}/voter-details`,
      );
      const data = (await res.json()) as VisitorVoterDetails & { error?: string };
      if (!res.ok) {
        throw new Error(data.error || t('visitor.manage.loadVoterDetailsFailed'));
      }
      setVoterDetailsByVisitorId((prev) => ({ ...prev, [visitorId]: data }));
    } catch (error) {
      console.error(error);
      setVoterDetailsByVisitorId((prev) => ({
        ...prev,
        [visitorId]: {
          success: false,
          hasVoter: false,
          voter: null,
          voterMobileNumbers: [],
          relatedVoters: [],
          beneficiaryServices: { individual: [], community: [] },
          dailyProgrammeEvents: [],
          relatedVotersData: [],
          cadreMembers: [],
          votingHistory: [],
          letters: [],
          attachments: [],
          error:
            error instanceof Error
              ? error.message
              : t('visitor.manage.loadVoterDetailsFailed'),
        },
      }));
    } finally {
      setLoadingVoterDetailsIds((prev) => {
        const next = new Set(prev);
        next.delete(visitorId);
        return next;
      });
    }
  }

  function toggleVisitorExpanded(visitor: VisitorRow) {
    const isExpanded = expandedVisitorIds.has(visitor.id);
    setExpandedVisitorIds((prev) => {
      const next = new Set(prev);
      if (isExpanded) next.delete(visitor.id);
      else next.add(visitor.id);
      return next;
    });
    if (!isExpanded && visitor.voterId?.trim()) {
      void loadVisitorVoterDetails(visitor.id);
    }
  }

  function expandAllVisitorCards() {
    const ids = createPickerVisitors.map((v) => v.id);
    setExpandedVisitorIds(new Set(ids));
    for (const visitor of createPickerVisitors) {
      if (visitor.voterId?.trim()) {
        void loadVisitorVoterDetails(visitor.id);
      }
    }
  }

  function collapseAllVisitorCards() {
    setExpandedVisitorIds(new Set());
  }

  function programmeTitleFor(programmeId: string | null | undefined): string | null {
    if (!programmeId) return null;
    return programmes.find((p) => p.id === programmeId)?.title ?? null;
  }

  async function createVisitor(params: {
    name: string;
    mobileNumber: string;
    voterId: string | null;
    location: string | null;
    serviceName?: string | null;
  }): Promise<boolean> {
    const trimmedName = params.name.trim();
    const trimmedMobile = params.mobileNumber.trim();
    const effectiveVoterId =
      params.voterId?.trim().toUpperCase() || null;
    const trimmedLocation = params.location?.trim() || null;
    const trimmedServiceName = params.serviceName?.trim() || null;

    if (!trimmedName) {
      toast({ type: 'error', description: t('visitor.errors.nameRequired') });
      setCreatingVisitor(false);
      return false;
    }
    if (!isValidIndianMobile(trimmedMobile)) {
      toast({ type: 'error', description: t('visitor.errors.mobileInvalid') });
      setCreatingVisitor(false);
      return false;
    }
    if (!effectiveVoterId && !trimmedLocation) {
      toast({ type: 'error', description: t('visitor.errors.locationRequired') });
      setCreatingVisitor(false);
      return false;
    }

    setCreatingVisitor(true);
    setCreatedVisitToken(null);
    try {
      const res = await fetch('/api/visitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Confirmation service name is print-only — omit from API so no beneficiary service is created.
        body: JSON.stringify({
          name: trimmedName,
          mobileNumber: trimmedMobile,
          voterId: effectiveVoterId,
          location: trimmedLocation,
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
        programmeId?: string | null;
        createdAt?: string | Date;
      };
      setCreatedVisitToken(visitor.token);
      setCreatedVisitorSnapshot({
        id: visitor.id,
        name: visitor.name,
        mobileNumber: visitor.mobileNumber,
        token: visitor.token,
        programmeId: visitor.programmeId ?? (programmeId || null),
        createdAt: visitor.createdAt ?? new Date().toISOString(),
        serviceName: trimmedServiceName,
      });
      setShowPhoneUpdate(false);
      setPendingVisitConfirm(null);
      setVisitConfirmServiceName('');
      setSelectedVoterForPhone(null);
      setSelectedVoterMobileNumbers([]);
      toast({ type: 'success', description: t('visitor.create.visitorSuccess') });
      return true;
    } catch (error) {
      console.error(error);
      toast({
        type: 'error',
        description: error instanceof Error ? error.message : t('visitor.errors.create'),
      });
      return false;
    } finally {
      setCreatingVisitor(false);
    }
  }

  async function handleCreateVisitor(e: React.FormEvent) {
    e.preventDefault();
    await createVisitor({
      name,
      mobileNumber,
      voterId: null,
      location,
    });
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
          programmeId: selectedVisitor.programmeId || null,
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
                // Always surface the visit token — beneficiary reuses it.
                token: selectedVisitor.token,
                createdAt: s.createdAt ?? new Date().toISOString(),
                beneficiaryServiceId: beneficiary?.id ?? s.beneficiaryServiceId ?? null,
                beneficiaryToken: selectedVisitor.token,
              };
            },
          )
        : [];
      setCreatedServices(created);
      setSelectedVisitor((prev) => {
        if (!prev) return prev;
        const addedServices = Array.isArray(json.services)
          ? (json.services as VisitorServiceRow[]).map((service) => ({
              ...service,
              canChangeService: service.canChangeService ?? true,
            }))
          : [];
        return {
          ...prev,
          services: [...(prev.services ?? []), ...addedServices],
        };
      });
      void loadCreatePickerVisitors();
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
          variant={tab === 'meeting-lineup' ? 'default' : 'ghost'}
          onClick={() => switchTab('meeting-lineup')}
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
                        serviceName:
                          createdVisitorSnapshot.serviceName ||
                          t('visitor.create.visitTokenLabel'),
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
                        programmeId: createdVisitorSnapshot.programmeId,
                        createdAt: createdVisitorSnapshot.createdAt,
                        services: [],
                      });
                      switchTab('meeting-lineup');
                    }}
                  >
                    {t('visitor.create.addServicesNext')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : creatingVisitor ? (
            <Card>
              <CardContent className="flex items-center justify-center gap-3 py-12">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  {t('visitor.create.submittingVisitor')}
                </p>
              </CardContent>
            </Card>
          ) : pendingVisitConfirm ? (
            <Card>
              <CardHeader>
                <CardTitle>{t('visitor.create.confirmTitle')}</CardTitle>
                <CardDescription className="text-sm">
                  {t('visitor.create.confirmDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-4 rounded-lg bg-muted p-4 md:grid-cols-2">
                  <div>
                    <Label className="text-sm font-medium">{t('common.name')}</Label>
                    <p className="text-sm">{pendingVisitConfirm.name}</p>
                  </div>
                  {pendingVisitConfirm.voterId && (
                    <div>
                      <Label className="text-sm font-medium">{t('forms.epicNumber')}</Label>
                      <p className="font-mono text-sm">{pendingVisitConfirm.voterId}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-sm font-medium">{t('phoneUpdate.primary')}</Label>
                    <p className="font-mono text-sm">{pendingVisitConfirm.mobileNumber}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">{t('phoneUpdate.secondary')}</Label>
                    <p className="font-mono text-sm">
                      {pendingVisitConfirm.secondaryMobile || t('visitor.create.noSecondaryMobile')}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="visit-confirm-service">
                    {t('visitor.form.service')}
                  </Label>
                  <Input
                    id="visit-confirm-service"
                    value={visitConfirmServiceName}
                    onChange={(e) => setVisitConfirmServiceName(e.target.value)}
                    placeholder={t('visitor.create.serviceForPrintPlaceholder')}
                    autoComplete="off"
                  />
                  <p className="text-xs text-muted-foreground sm:text-sm">
                    {t('visitor.create.serviceForPrintHelp')}
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    className="flex-1"
                    onClick={() => {
                      void createVisitor({
                        name: pendingVisitConfirm.name,
                        mobileNumber: pendingVisitConfirm.mobileNumber,
                        voterId: pendingVisitConfirm.voterId,
                        location: pendingVisitConfirm.location,
                        serviceName: visitConfirmServiceName,
                      });
                    }}
                  >
                    {t('visitor.create.confirmGenerateToken')}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1"
                    onClick={handleBackToPhoneUpdate}
                  >
                    {t('common.previous')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelPhoneUpdate}
                  >
                    {t('common.cancel')}
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
              onSkip={() => {
                handleSkipPhoneUpdate();
              }}
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

                <VoterSearchPanel
                  searchEndpoint="/api/visitor/search-voter"
                  onSelectVoter={selectVoter}
                  title={t('operator.search.title')}
                  description={t('visitor.form.searchVoterHelp')}
                  enableOutsider
                  isOutsider={isOutsider}
                  onOutsiderChange={(next) => {
                    setIsOutsider(next);
                    if (next) {
                      setVoterId('');
                      setSelectedVoterForPhone(null);
                      setShowPhoneUpdate(false);
                      setPendingVisitConfirm(null);
                      setVisitConfirmServiceName('');
                    } else {
                      setName('');
                      setMobileNumber('');
                      setLocation('');
                    }
                  }}
                />

                {isOutsider && (
                  <form onSubmit={handleCreateVisitor} className="space-y-6">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-muted-foreground">
                        {t('visitor.form.scanAadhaarHelp')}
                      </p>
                      <AadhaarQrScanButton
                        onClick={() => setShowAadhaarScanner(true)}
                        label={t('operator.search.scanAadhaarQr')}
                      />
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
                          onChange={(e) =>
                            setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10))
                          }
                          placeholder="9876543210"
                          type="tel"
                          inputMode="numeric"
                          autoComplete="tel"
                          maxLength={10}
                          className="font-mono"
                          required
                        />
                      </div>
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
                    </div>

                    <Button
                      type="submit"
                      disabled={
                        creatingVisitor ||
                        !name.trim() ||
                        !isValidIndianMobile(mobileNumber) ||
                        !location.trim()
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
                )}

                <AadhaarQrScannerDialog
                  open={showAadhaarScanner}
                  onOpenChange={setShowAadhaarScanner}
                  onDataDetected={handleOutsiderAadhaarDetected}
                  title={t('operator.search.aadhaarScannerTitle')}
                  description={t('visitor.form.aadhaarScannerDescription')}
                />
              </CardContent>
            </Card>
          )}
        </>
      )}

      {tab === 'meeting-lineup' && (
        <>
          <QrScannerDialog
            open={showTokenQrScanner}
            onOpenChange={setShowTokenQrScanner}
            onScan={handleVisitTokenQrScan}
            title={t('visitor.manage.actions.scanTokenQrTitle')}
            description={t('visitor.manage.actions.scanTokenQrDescription')}
          />
          <Card id="create-service-form">
            <CardHeader className="p-4 sm:p-6" id="create-service-form-header">
              <div className="min-w-0 space-y-1">
                <CardTitle className="text-base sm:text-lg">
                  {t('visitor.create.serviceTitle')}
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  {t('visitor.create.serviceDescription')}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent
              id="create-service-form-content"
              aria-labelledby="create-service-form-header"
              className="space-y-6"
            >
              <div className="space-y-3">
                <div className="overflow-hidden rounded-lg border">
                  <div
                    className="cursor-pointer select-none p-3 transition-colors hover:bg-muted/50 sm:p-4"
                    onClick={() => setCreateServiceFiltersOpen((open) => !open)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setCreateServiceFiltersOpen((open) => !open);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-expanded={createServiceFiltersOpen}
                    aria-controls="create-service-filters-content"
                    id="create-service-filters-header"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <Label className="cursor-pointer text-sm font-medium">
                          {t('visitor.form.selectVisitor')}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {t('visitor.form.selectVisitorHelp')}
                        </p>
                      </div>
                      {createServiceFiltersOpen ? (
                        <ChevronUp
                          className="mt-1 size-5 shrink-0 text-muted-foreground"
                          aria-hidden
                        />
                      ) : (
                        <ChevronDown
                          className="mt-1 size-5 shrink-0 text-muted-foreground"
                          aria-hidden
                        />
                      )}
                    </div>
                  </div>

                  {createServiceFiltersOpen ? (
                    <div
                      id="create-service-filters-content"
                      aria-labelledby="create-service-filters-header"
                      className="space-y-4 border-t p-3 sm:p-4"
                    >
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
                          <div className="flex gap-2">
                            <Input
                              id="create-visitor-token-filter"
                              placeholder={t('visitor.manage.filters.enterToken')}
                              value={createFilterTokenInput}
                              onChange={(e) => setCreateFilterTokenInput(e.target.value)}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              className="shrink-0"
                              title={t('visitor.manage.actions.scanTokenQr')}
                              onClick={() => setShowTokenQrScanner(true)}
                            >
                              <QrCode className="h-4 w-4" />
                            </Button>
                          </div>
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
                            maxLength={10}
                            placeholder={t('visitor.manage.filters.enterMobile')}
                            value={createFilterMobileInput}
                            onChange={(e) =>
                              setCreateFilterMobileInput(
                                e.target.value.replace(/\D/g, '').slice(0, 10),
                              )
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
                            onChange={(e) => setCreateFilterVoterIdInput(e.target.value)}
                            className="font-mono uppercase"
                            spellCheck={false}
                            autoCapitalize="characters"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
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
                  ) : null}
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-muted-foreground">
                      {t('visitor.manage.filters.showing', {
                        count: createPickerVisitors.length,
                        total: createPickerTotal,
                      })}
                    </p>
                    {createPickerVisitors.length > 0 ? (
                      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={expandAllVisitorCards}
                          className="w-full sm:w-auto"
                        >
                          <ChevronDown className="mr-2 h-4 w-4" />
                          {t('visitor.manage.expandAll')}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={collapseAllVisitorCards}
                          className="w-full sm:w-auto"
                        >
                          <ChevronUp className="mr-2 h-4 w-4" />
                          {t('visitor.manage.collapseAll')}
                        </Button>
                      </div>
                    ) : null}
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
                    <div className="grid grid-cols-1 gap-3">
                      {createPickerVisitors.map((v) => {
                        const isExpanded = expandedVisitorIds.has(v.id);
                        const details = voterDetailsByVisitorId[v.id];
                        const detailsLoading = loadingVoterDetailsIds.has(v.id);
                        const epic = v.voterId?.trim().toUpperCase() || null;
                        const visitProgrammeTitle = programmeTitleFor(v.programmeId);

                        return (
                          <Card key={v.id} className="overflow-hidden shadow-sm">
                            <CardHeader className="space-y-3 border-b bg-muted/20 p-4 pb-3">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0 space-y-1">
                                  <CardTitle className="text-base leading-snug sm:text-lg">
                                    {v.name}
                                  </CardTitle>
                                  <CardDescription className="font-mono text-xs sm:text-sm">
                                    {v.token} · {v.mobileNumber}
                                    {v.voterId ? ` · ${v.voterId}` : ''}
                                  </CardDescription>
                                  {v.location ? (
                                    <p className="text-xs text-muted-foreground sm:text-sm">
                                      {v.location}
                                    </p>
                                  ) : null}
                                  <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
                                    <Badge variant="secondary">
                                      {t('visitor.manage.serviceCount', {
                                        count: v.services?.length ?? 0,
                                      })}
                                    </Badge>
                                    <span>{formatDisplayDateTimeIST(v.createdAt)}</span>
                                  </div>
                                </div>
                                <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="w-full sm:w-auto"
                                    disabled={sharingToken === v.token}
                                    onClick={() =>
                                      void shareVisitorThermalTicket({
                                        token: v.token,
                                        createdAt: v.createdAt,
                                        serviceName: t('visitor.create.visitTokenLabel'),
                                        name: v.name,
                                        mobile: v.mobileNumber,
                                      })
                                    }
                                  >
                                    {sharingToken === v.token ? (
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                      <Share2 className="mr-2 h-4 w-4" />
                                    )}
                                    {t('visitor.manage.printToken')}
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    className="w-full sm:w-auto"
                                    onClick={() => openAddServiceModal(v)}
                                  >
                                    <Plus className="mr-2 h-4 w-4" />
                                    {t('visitor.manage.addService')}
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="w-full sm:w-auto"
                                    aria-expanded={isExpanded}
                                    onClick={() => toggleVisitorExpanded(v)}
                                  >
                                    {isExpanded ? (
                                      <ChevronUp className="mr-2 h-4 w-4" />
                                    ) : (
                                      <ChevronDown className="mr-2 h-4 w-4" />
                                    )}
                                    {isExpanded
                                      ? t('visitor.manage.hideDetails')
                                      : t('visitor.manage.showDetails')}
                                  </Button>
                                </div>
                              </div>
                            </CardHeader>
                            {isExpanded ? (
                              <CardContent className="space-y-5 p-4 pt-3">
                                <section className="space-y-2">
                                  <p className="text-xs font-medium text-muted-foreground">
                                    {t('visitor.manage.visitDetails')}
                                  </p>
                                  {visitProgrammeTitle || v.programmeId ? (
                                    <p className="text-sm text-muted-foreground">
                                      {t('visitor.form.programme')}:{' '}
                                      {visitProgrammeTitle ?? v.programmeId}
                                    </p>
                                  ) : null}
                                  <p className="text-xs font-medium text-muted-foreground">
                                    {t('visitor.manage.existingServices')}
                                  </p>
                                  {(v.services?.length ?? 0) > 0 ? (
                                    <ul className="space-y-2">
                                      {v.services.map((service) => (
                                        <li
                                          key={service.id}
                                          className="space-y-2 rounded-lg border bg-muted/10 px-3 py-2.5"
                                        >
                                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                            <div className="min-w-0 space-y-1">
                                              <p className="text-sm font-medium leading-snug">
                                                {service.serviceName}
                                              </p>
                                              <p className="font-mono text-xs text-muted-foreground">
                                                {t('visitor.manage.serviceToken')}:{' '}
                                                {service.token}
                                              </p>
                                              {service.description ? (
                                                <p className="text-xs text-muted-foreground">
                                                  {t('visitor.manage.description')}:{' '}
                                                  {service.description}
                                                </p>
                                              ) : null}
                                              {service.notes ? (
                                                <p className="text-xs text-muted-foreground">
                                                  {t('visitor.form.notes')}: {service.notes}
                                                </p>
                                              ) : null}
                                              {service.convertedAt ? (
                                                <p className="text-xs text-muted-foreground">
                                                  {t('visitor.manage.convertedAt')}:{' '}
                                                  {formatDisplayDateTimeIST(
                                                    service.convertedAt,
                                                  )}
                                                </p>
                                              ) : null}
                                              <p className="text-xs text-muted-foreground">
                                                {formatDisplayDateTimeIST(service.createdAt)}
                                              </p>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2">
                                              {service.status !== 'converted' ? (
                                                <Badge
                                                  variant={
                                                    service.status === 'cancelled'
                                                      ? 'destructive'
                                                      : 'secondary'
                                                  }
                                                  className="w-fit shrink-0 capitalize"
                                                >
                                                  {t(`visitor.status.${service.status}`)}
                                                </Badge>
                                              ) : null}
                                              {service.canChangeService ? (
                                                <Button
                                                  type="button"
                                                  size="sm"
                                                  variant="outline"
                                                  onClick={() =>
                                                    openChangeServiceDialog(v.id, service)
                                                  }
                                                >
                                                  <Pencil className="mr-2 h-4 w-4" />
                                                  {t('visitor.manage.changeService')}
                                                </Button>
                                              ) : null}
                                              {service.beneficiaryServiceId ? (
                                                <Button
                                                  type="button"
                                                  size="sm"
                                                  variant="outline"
                                                  onClick={() =>
                                                    navigateToBeneficiaryTask(
                                                      service.beneficiaryServiceId!,
                                                    )
                                                  }
                                                >
                                                  <ExternalLink className="mr-2 h-4 w-4" />
                                                  {t('visitor.manage.openBeneficiary')}
                                                </Button>
                                              ) : null}
                                            </div>
                                          </div>
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <div className="rounded-lg border border-dashed px-3 py-4 text-center">
                                      <p className="text-sm text-muted-foreground">
                                        {t('visitor.manage.noServices')}
                                      </p>
                                    </div>
                                  )}
                                </section>

                                {!epic ? (
                                  <p className="rounded-lg border border-dashed px-3 py-3 text-sm text-muted-foreground">
                                    {t('visitor.manage.noEpicLinked')}
                                  </p>
                                ) : detailsLoading && !details ? (
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    {t('visitor.manage.loadingVoterDetails')}
                                  </div>
                                ) : details?.error ? (
                                  <p className="text-sm text-destructive">
                                    {details.error}
                                  </p>
                                ) : details ? (
                                  <>
                                    <section className="space-y-2">
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p className="text-xs font-medium text-muted-foreground">
                                          {t('visitor.manage.linkedVoter')}
                                        </p>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="link"
                                          className="h-auto p-0"
                                          asChild
                                        >
                                          <Link
                                            href={`/modules/voter/${encodeURIComponent(epic)}`}
                                          >
                                            {t('visitor.manage.openFullProfile')}
                                          </Link>
                                        </Button>
                                      </div>
                                      {details.voterNotFound || !details.voter ? (
                                        <p className="text-sm text-muted-foreground">
                                          {t('visitor.manage.voterNotFound')}
                                        </p>
                                      ) : (
                                        <div className="space-y-1 rounded-lg border bg-muted/10 px-3 py-2.5 text-sm">
                                          <p className="font-medium">
                                            {details.voter.fullName}
                                          </p>
                                          <p className="font-mono text-xs text-muted-foreground">
                                            {details.voter.epicNumber}
                                          </p>
                                          {(details.voter.relationType ||
                                            details.voter.relationName) && (
                                            <p className="text-xs text-muted-foreground">
                                              {[
                                                details.voter.relationType,
                                                details.voter.relationName,
                                              ]
                                                .filter(Boolean)
                                                .join(': ')}
                                            </p>
                                          )}
                                          <p className="text-xs text-muted-foreground">
                                            {[
                                              details.voter.age != null
                                                ? `Age ${details.voter.age}`
                                                : null,
                                              details.voter.gender,
                                              details.voter.dob
                                                ? formatDisplayDateIST(details.voter.dob)
                                                : null,
                                            ]
                                              .filter(Boolean)
                                              .join(' · ')}
                                          </p>
                                          {(details.voter.houseNumber ||
                                            details.voter.address ||
                                            details.voter.localityStreet ||
                                            details.voter.townVillage ||
                                            details.voter.pincode) && (
                                            <p className="text-xs text-muted-foreground">
                                              {[
                                                details.voter.houseNumber,
                                                details.voter.localityStreet,
                                                details.voter.townVillage,
                                                details.voter.address,
                                                details.voter.pincode,
                                              ]
                                                .filter(Boolean)
                                                .join(', ')}
                                            </p>
                                          )}
                                          {(details.voter.religion ||
                                            details.voter.caste) && (
                                            <p className="text-xs text-muted-foreground">
                                              {[details.voter.religion, details.voter.caste]
                                                .filter(Boolean)
                                                .join(' · ')}
                                            </p>
                                          )}
                                          {details.voterMobileNumbers.length > 0 ? (
                                            <p className="text-xs text-muted-foreground">
                                              {details.voterMobileNumbers
                                                .map((m) => m.mobileNumber)
                                                .join(' · ')}
                                            </p>
                                          ) : null}
                                        </div>
                                      )}
                                    </section>

                                    <section className="space-y-2">
                                      <p className="text-xs font-medium text-muted-foreground">
                                        {t('visitor.manage.votingInformation')}
                                      </p>
                                      {(details.votingHistory?.length ?? 0) ===
                                      0 ? (
                                        <p className="text-sm text-muted-foreground">
                                          {t('visitor.manage.noVotingHistory')}
                                        </p>
                                      ) : (
                                        <ul className="space-y-2">
                                          {details.votingHistory.map((record) => (
                                            <li
                                              key={`${record.epicNumber}-${record.electionId}`}
                                              className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/10 px-3 py-2.5"
                                            >
                                              <p className="text-sm font-medium">
                                                {record.electionType &&
                                                record.electionYear
                                                  ? t(
                                                      'visitor.manage.electionLabel',
                                                      {
                                                        type: record.electionType,
                                                        year: record.electionYear,
                                                      },
                                                    )
                                                  : record.electionId}
                                              </p>
                                              <Badge
                                                variant={
                                                  record.hasVoted
                                                    ? 'default'
                                                    : 'secondary'
                                                }
                                              >
                                                {record.hasVoted
                                                  ? t('visitor.manage.voted')
                                                  : t('visitor.manage.notVoted')}
                                              </Badge>
                                            </li>
                                          ))}
                                        </ul>
                                      )}
                                    </section>

                                    {details.cadreMembers.length > 0 ? (
                                      <section className="space-y-2">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                          <p className="text-xs font-medium text-muted-foreground">
                                            {t('visitor.manage.cadreHierarchy')}
                                          </p>
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant="link"
                                            className="h-auto p-0"
                                            asChild
                                          >
                                            <Link href="/modules/hierarchy">
                                              {t('visitor.manage.openHierarchy')}
                                            </Link>
                                          </Button>
                                        </div>
                                        <ul className="space-y-2">
                                          {details.cadreMembers.map((member) => (
                                            <li
                                              key={member.id}
                                              className="space-y-2 rounded-lg border bg-muted/10 px-3 py-2.5"
                                            >
                                              <div className="flex flex-wrap items-center gap-2">
                                                <p className="text-sm font-medium">
                                                  {member.personName || v.name}
                                                </p>
                                                {!member.isActive ? (
                                                  <Badge variant="secondary">Inactive</Badge>
                                                ) : null}
                                              </div>
                                              {member.personPhone ? (
                                                <p className="text-xs text-muted-foreground">
                                                  {member.personPhone}
                                                </p>
                                              ) : null}
                                              {member.posts.length > 0 ? (
                                                <ul className="space-y-1">
                                                  {member.posts.map((post) => (
                                                    <li
                                                      key={post.id}
                                                      className="rounded border border-dashed px-2 py-1.5 text-xs"
                                                    >
                                                      <span className="font-medium">
                                                        {post.positionName}
                                                      </span>
                                                      {post.isPrimary ? (
                                                        <Badge
                                                          variant="secondary"
                                                          className="ml-2"
                                                        >
                                                          {t('visitor.manage.primaryPost')}
                                                        </Badge>
                                                      ) : null}
                                                      <p className="mt-0.5 text-muted-foreground">
                                                        {[
                                                          post.positionLevelName,
                                                          post.verticalName,
                                                          post.talukaName
                                                            ? `${t('visitor.manage.taluka')}: ${post.talukaName}`
                                                            : null,
                                                          post.wardGeoName
                                                            ? `${t('visitor.manage.ward')}: ${post.wardGeoName}`
                                                            : null,
                                                          post.boothNo
                                                            ? `${t('visitor.manage.booth')}: ${post.boothNo}`
                                                            : null,
                                                          post.label,
                                                        ]
                                                          .filter(Boolean)
                                                          .join(' · ')}
                                                      </p>
                                                    </li>
                                                  ))}
                                                </ul>
                                              ) : null}
                                            </li>
                                          ))}
                                        </ul>
                                      </section>
                                    ) : null}

                                    <section className="space-y-2">
                                      <p className="text-xs font-medium text-muted-foreground">
                                        {t('visitor.manage.allBeneficiaryServices')}
                                      </p>
                                      {details.beneficiaryServices.individual.length ===
                                        0 &&
                                      details.beneficiaryServices.community.length ===
                                        0 ? (
                                        <p className="text-sm text-muted-foreground">
                                          {t('visitor.manage.noServices')}
                                        </p>
                                      ) : (
                                        <div className="space-y-3">
                                          {details.beneficiaryServices.individual.length >
                                          0 ? (
                                            <div className="space-y-1">
                                              <p className="text-xs text-muted-foreground">
                                                {t('visitor.manage.individualServices')}
                                              </p>
                                              <ul className="space-y-1">
                                                {details.beneficiaryServices.individual.map(
                                                  (svc) => (
                                                    <li
                                                      key={svc.id}
                                                      className="rounded border px-2 py-1.5 text-sm"
                                                    >
                                                      <span className="font-medium">
                                                        {svc.serviceName}
                                                      </span>
                                                      <span className="ml-2 text-xs capitalize text-muted-foreground">
                                                        {svc.status}
                                                        {svc.token
                                                          ? ` · ${svc.token}`
                                                          : ''}
                                                      </span>
                                                    </li>
                                                  ),
                                                )}
                                              </ul>
                                            </div>
                                          ) : null}
                                          {details.beneficiaryServices.community.length >
                                          0 ? (
                                            <div className="space-y-1">
                                              <p className="text-xs text-muted-foreground">
                                                {t('visitor.manage.communityServices')}
                                              </p>
                                              <ul className="space-y-1">
                                                {details.beneficiaryServices.community.map(
                                                  (svc) => (
                                                    <li
                                                      key={svc.id}
                                                      className="rounded border px-2 py-1.5 text-sm"
                                                    >
                                                      <span className="font-medium">
                                                        {svc.serviceName}
                                                      </span>
                                                      <span className="ml-2 text-xs capitalize text-muted-foreground">
                                                        {svc.status}
                                                        {svc.token
                                                          ? ` · ${svc.token}`
                                                          : ''}
                                                      </span>
                                                    </li>
                                                  ),
                                                )}
                                              </ul>
                                            </div>
                                          ) : null}
                                        </div>
                                      )}
                                    </section>

                                    <section className="space-y-2">
                                      <p className="text-xs font-medium text-muted-foreground">
                                        {t('visitor.manage.lettersAndAttachments')}
                                      </p>
                                      {details.letters.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">
                                          {t('visitor.manage.noLetters')}
                                        </p>
                                      ) : (
                                        <ul className="space-y-1">
                                          {details.letters.map((letter) => (
                                            <li
                                              key={letter.id}
                                              className="rounded border px-2 py-1.5 text-sm"
                                            >
                                              <span className="font-medium">
                                                {letter.title || letter.letterType}
                                              </span>
                                              <span className="ml-2 font-mono text-xs text-muted-foreground">
                                                {letter.referenceNo}
                                              </span>
                                              {letter.printedAt ? (
                                                <span className="ml-2 text-xs text-muted-foreground">
                                                  {formatDisplayDateTimeIST(
                                                    letter.printedAt,
                                                  )}
                                                </span>
                                              ) : null}
                                            </li>
                                          ))}
                                        </ul>
                                      )}
                                      {details.attachments.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">
                                          {t('visitor.manage.noAttachments')}
                                        </p>
                                      ) : (
                                        <ul className="space-y-1">
                                          {details.attachments.map((att) => (
                                            <li
                                              key={att.id}
                                              className="rounded border px-2 py-1.5 text-sm"
                                            >
                                              {att.fileUrl ? (
                                                <a
                                                  href={att.fileUrl}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  className="font-medium underline-offset-2 hover:underline"
                                                >
                                                  {att.fileName}
                                                </a>
                                              ) : (
                                                <span className="font-medium">
                                                  {att.fileName}
                                                </span>
                                              )}
                                              <span className="ml-2 text-xs text-muted-foreground">
                                                {att.fileSizeKb} KB
                                              </span>
                                            </li>
                                          ))}
                                        </ul>
                                      )}
                                    </section>

                                    <section className="space-y-2">
                                      <p className="text-xs font-medium text-muted-foreground">
                                        {t('visitor.manage.familyRelated')}
                                      </p>
                                      {details.relatedVoters.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">
                                          {t('visitor.manage.noFamily')}
                                        </p>
                                      ) : (
                                        <ul className="space-y-2">
                                          {details.relatedVoters.map((rv) => {
                                            const relatedBundle =
                                              details.relatedVotersData.find(
                                                (d) =>
                                                  d.voter.epicNumber === rv.epicNumber,
                                              );
                                            const relatedServiceCount =
                                              (relatedBundle?.services.individual
                                                .length ?? 0) +
                                              (relatedBundle?.services.community.length ??
                                                0);
                                            const relatedVotingHistory =
                                              rv.votingHistory ?? [];
                                            return (
                                              <li
                                                key={rv.epicNumber}
                                                className="rounded-lg border bg-muted/10 px-3 py-2 text-sm"
                                              >
                                                <p className="font-medium">{rv.fullName}</p>
                                                <p className="font-mono text-xs text-muted-foreground">
                                                  {rv.epicNumber}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                  {[
                                                    rv.relationType,
                                                    rv.relationName,
                                                    rv.age != null
                                                      ? `Age ${rv.age}`
                                                      : null,
                                                    rv.gender,
                                                  ]
                                                    .filter(Boolean)
                                                    .join(' · ')}
                                                </p>
                                                {rv.mobileNumbers &&
                                                rv.mobileNumbers.length > 0 ? (
                                                  <p className="text-xs text-muted-foreground">
                                                    {rv.mobileNumbers
                                                      .map((m) => m.mobileNumber)
                                                      .join(' · ')}
                                                  </p>
                                                ) : null}
                                                {relatedServiceCount > 0 ? (
                                                  <p className="text-xs text-muted-foreground">
                                                    {t('visitor.manage.serviceCount', {
                                                      count: relatedServiceCount,
                                                    })}
                                                  </p>
                                                ) : null}
                                                {relatedVotingHistory.length > 0 ? (
                                                  <ul className="mt-2 space-y-1.5">
                                                    {relatedVotingHistory.map(
                                                      (record) => (
                                                        <li
                                                          key={`${record.epicNumber}-${record.electionId}`}
                                                          className="flex flex-wrap items-center gap-2"
                                                        >
                                                          <p className="text-xs font-medium">
                                                            {record.electionType &&
                                                            record.electionYear
                                                              ? t(
                                                                  'visitor.manage.electionLabel',
                                                                  {
                                                                    type: record.electionType,
                                                                    year: record.electionYear,
                                                                  },
                                                                )
                                                              : record.electionId}
                                                          </p>
                                                          <Badge
                                                            variant={
                                                              record.hasVoted
                                                                ? 'default'
                                                                : 'secondary'
                                                            }
                                                            className="text-[10px]"
                                                          >
                                                            {record.hasVoted
                                                              ? t(
                                                                  'visitor.manage.voted',
                                                                )
                                                              : t(
                                                                  'visitor.manage.notVoted',
                                                                )}
                                                          </Badge>
                                                        </li>
                                                      ),
                                                    )}
                                                  </ul>
                                                ) : null}
                                              </li>
                                            );
                                          })}
                                        </ul>
                                      )}
                                    </section>

                                    <section className="space-y-2">
                                      <p className="text-xs font-medium text-muted-foreground">
                                        {t('visitor.manage.dailyProgrammeEvents')}
                                      </p>
                                      {details.dailyProgrammeEvents.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">
                                          {t('visitor.manage.noProgrammeEvents')}
                                        </p>
                                      ) : (
                                        <ul className="space-y-1">
                                          {details.dailyProgrammeEvents.map((ev) => (
                                            <li
                                              key={ev.id}
                                              className="rounded border px-2 py-1.5 text-sm"
                                            >
                                              <span className="font-medium">{ev.title}</span>
                                              <span className="ml-2 text-xs text-muted-foreground">
                                                {formatDisplayDateTimeIST(ev.date)} ·{' '}
                                                {ev.location}
                                              </span>
                                            </li>
                                          ))}
                                        </ul>
                                      )}
                                    </section>
                                  </>
                                ) : null}
                              </CardContent>
                            ) : null}
                          </Card>
                        );
                      })}
                    </div>
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
              </div>
            </CardContent>
          </Card>

          <Dialog
            open={Boolean(selectedVisitor)}
            onOpenChange={(open) => {
              if (!open) closeAddServiceModal();
            }}
          >
            <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto sm:max-w-xl">
              {selectedVisitor && createdServices.length > 0 ? (
                <>
                  <DialogHeader>
                    <DialogTitle className="text-green-600">
                      {t('visitor.create.servicesSuccessTitle')}
                    </DialogTitle>
                    <DialogDescription>
                      {t('visitor.create.servicesSuccessDescription')}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4 text-center">
                      <Label className="text-sm font-medium text-green-800">
                        {t('visitor.create.visitTokenLabel')}
                      </Label>
                      <p className="mt-2 break-all font-mono text-xl font-bold tracking-wide text-green-900">
                        {selectedVisitor.token}
                      </p>
                      <p className="mt-2 text-sm text-green-700">
                        {t('visitor.create.saveToken')}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        className="mt-4 w-full sm:w-auto"
                        disabled={sharingToken === selectedVisitor.token}
                        onClick={() =>
                          void shareVisitorThermalTicket({
                            token: selectedVisitor.token,
                            createdAt: selectedVisitor.createdAt,
                            serviceName: t('visitor.create.visitTokenLabel'),
                            name: selectedVisitor.name,
                            mobile: selectedVisitor.mobileNumber,
                          })
                        }
                      >
                        {sharingToken === selectedVisitor.token ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Share2 className="mr-2 h-4 w-4" />
                        )}
                        {t('visitor.manage.printToken')}
                      </Button>
                    </div>
                    <ul className="space-y-2 rounded-lg border bg-muted/20 p-3">
                      {createdServices.map((service) => (
                        <li
                          key={`${service.serviceName}-${service.beneficiaryServiceId ?? service.token}`}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-background px-3 py-2 text-sm"
                        >
                          <span className="min-w-0 font-medium">{service.serviceName}</span>
                          {service.beneficiaryServiceId ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                navigateToBeneficiaryTask(service.beneficiaryServiceId!)
                              }
                            >
                              <ExternalLink className="mr-2 h-4 w-4" />
                              {t('visitor.manage.openBeneficiary')}
                            </Button>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <DialogFooter className="flex-col gap-2 sm:flex-row">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full sm:flex-1"
                      onClick={() => resetCreateServiceForm(true)}
                    >
                      {t('visitor.create.addMoreServices')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full sm:flex-1"
                      onClick={closeAddServiceModal}
                    >
                      {t('common.close')}
                    </Button>
                  </DialogFooter>
                </>
              ) : selectedVisitor ? (
                <>
                  <DialogHeader>
                    <DialogTitle>{t('visitor.manage.addService')}</DialogTitle>
                    <DialogDescription>
                      {selectedVisitor.name} · {selectedVisitor.token} ·{' '}
                      {selectedVisitor.mobileNumber}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>{t('visitor.manage.existingServices')}</Label>
                      {(selectedVisitor.services?.length ?? 0) > 0 ? (
                        <ul className="max-h-48 space-y-1.5 overflow-y-auto rounded-lg border bg-muted/20 p-2.5">
                          {selectedVisitor.services.map((service) => (
                            <li
                              key={service.id}
                              className="flex flex-col gap-2 rounded-md bg-background px-2.5 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div className="min-w-0">
                                <p className="font-medium">{service.serviceName}</p>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge
                                  variant={
                                    service.status === 'cancelled'
                                      ? 'destructive'
                                      : service.status === 'converted'
                                        ? 'default'
                                        : 'secondary'
                                  }
                                  className="w-fit shrink-0 capitalize"
                                >
                                  {t(`visitor.status.${service.status}`)}
                                </Badge>
                                {service.canChangeService ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="w-full sm:w-auto"
                                    onClick={() =>
                                      openChangeServiceDialog(
                                        selectedVisitor.id,
                                        service,
                                      )
                                    }
                                  >
                                    <Pencil className="mr-2 h-4 w-4" />
                                    {t('visitor.manage.changeService')}
                                  </Button>
                                ) : null}
                                {service.beneficiaryServiceId ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="w-full sm:w-auto"
                                    onClick={() =>
                                      navigateToBeneficiaryTask(
                                        service.beneficiaryServiceId!,
                                      )
                                    }
                                  >
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                    {t('visitor.manage.openBeneficiary')}
                                  </Button>
                                ) : null}
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {t('visitor.manage.noServices')}
                        </p>
                      )}
                    </div>

                    <form onSubmit={handleCreateServices} className="space-y-4">
                      <div className="space-y-2">
                        <Label>
                          {t('visitor.form.services')}{' '}
                          <span className="text-red-500">*</span>
                        </Label>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <div className="min-w-0 flex-1">
                            <Combobox
                              options={serviceOptions}
                              value={pendingServiceName}
                              onValueChange={setPendingServiceName}
                              placeholder={t('visitor.form.servicePlaceholder')}
                              disabled={loadingMeta}
                              allowCustom
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
                        <Label htmlFor="service-notes">{t('visitor.form.notes')}</Label>
                        <Textarea
                          id="service-notes"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          rows={3}
                        />
                      </div>

                      <DialogFooter className="gap-2 sm:justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={closeAddServiceModal}
                          disabled={creatingServices}
                        >
                          {t('common.cancel')}
                        </Button>
                        <Button
                          type="submit"
                          disabled={
                            creatingServices ||
                            loadingMeta ||
                            (selectedServices.length === 0 && !pendingServiceName.trim())
                          }
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
                      </DialogFooter>
                    </form>
                  </div>
                </>
              ) : null}
            </DialogContent>
          </Dialog>

          <Dialog
            open={Boolean(serviceBeingChanged)}
            onOpenChange={(open) => {
              if (!open) closeChangeServiceDialog();
            }}
          >
            <DialogContent className="max-w-lg sm:max-w-xl">
              {serviceBeingChanged ? (
                <>
                  <DialogHeader>
                    <DialogTitle>{t('visitor.manage.changeServiceTitle')}</DialogTitle>
                    <DialogDescription>
                      {t('visitor.manage.changeServiceDescription')}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleChangeService} className="space-y-4">
                    <div className="space-y-2">
                      <Label>{t('visitor.form.service')}</Label>
                      <Combobox
                        options={serviceOptions}
                        value={changeServiceName}
                        onValueChange={setChangeServiceName}
                        placeholder={t('visitor.manage.changeServicePlaceholder')}
                        disabled={changingService || loadingMeta}
                        allowCustom
                      />
                    </div>
                    <DialogFooter className="flex-col gap-2 sm:flex-row">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full sm:flex-1"
                        disabled={changingService}
                        onClick={closeChangeServiceDialog}
                      >
                        {t('common.cancel')}
                      </Button>
                      <Button
                        type="submit"
                        className="w-full sm:flex-1"
                        disabled={
                          changingService ||
                          loadingMeta ||
                          !changeServiceName.trim() ||
                          changeServiceName.trim() ===
                            serviceBeingChanged.service.serviceName
                        }
                      >
                        {changingService ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {t('visitor.manage.changeServiceSave')}
                          </>
                        ) : (
                          t('visitor.manage.changeServiceSave')
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </>
              ) : null}
            </DialogContent>
          </Dialog>
        </>
      )}

      {tab === 'tasks' && (
        <TaskManagement
          key={deepLinkTaskId ?? 'tasks'}
          initialTaskId={deepLinkTaskId}
          initialManageState={initialTaskManageState}
        />
      )}

    </div>
  );
}
