'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  CalendarClock,
  Clock,
  MapPin,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DmyDateInput } from '@/components/ui/dmy-date-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ModulePageHeader } from '@/components/module-page-header';
import { TableSkeleton } from '@/components/module-skeleton';
import { toast } from '@/components/toast';
import { useTranslations } from '@/hooks/use-translations';
import { cn } from '@/lib/utils';
import { formatDisplayDateIST, getTodayDateStringIST } from '@/lib/ist-date';
import {
  GOV_FOLLOW_UP_BROWSE_TABS,
  GOV_FOLLOW_UP_KPI_CHIPS,
  GOV_FOLLOW_UP_PRIMARY_TABS,
  GOV_FOLLOW_UP_QUICK_CHIPS,
  type GovFollowUpChip,
  type GovFollowUpTab,
} from '@/lib/gov-follow-up/constants';
import {
  buildGovFollowUpSearchParams,
  parseGovFollowUpFiltersFromSearchParams,
} from '@/lib/gov-follow-up/url-params';
import type {
  GovFollowUpCatalogs,
  GovFollowUpGroupRow,
  GovFollowUpLogInput,
  GovFollowUpMatterInput,
  GovFollowUpSummary,
} from '@/lib/gov-follow-up/types';
import type {
  GovFollowUpMatterDetail,
  GovFollowUpMatterListItem,
} from '@/lib/db/schema';
import { GovFollowUpMatterTable } from './matter-table';
import {
  emptyMatterForm,
  GovFollowUpCreateDialog,
  GovFollowUpDetailDialog,
  type MatterFormState,
} from './matter-dialogs';

const EMPTY_CATALOGS: GovFollowUpCatalogs = {
  departments: [],
  locations: [],
  officers: [],
  offices: [],
  desks: [],
  users: [],
  addressTypes: [],
  addressOfficers: [],
  wards: [],
};

const EMPTY_SUMMARY: GovFollowUpSummary = {
  dueToday: 0,
  upcoming: 0,
  overdue: 0,
  visits: 0,
  closed: 0,
  stale7: 0,
  mantralaya: 0,
  bmc: 0,
  sra: 0,
  minister: 0,
  deptReply: 0,
  sanctions: 0,
  recentlyClosed: 0,
};

const CHIP_COUNTS: Record<GovFollowUpChip, keyof GovFollowUpSummary> = {
  'due-today': 'dueToday',
  overdue: 'overdue',
  'stale-7': 'stale7',
  mantralaya: 'mantralaya',
  bmc: 'bmc',
  sra: 'sra',
  minister: 'minister',
  'dept-reply': 'deptReply',
  sanctions: 'sanctions',
  'recently-closed': 'recentlyClosed',
};

const KPI_META: Record<
  (typeof GOV_FOLLOW_UP_KPI_CHIPS)[number],
  { icon: typeof CalendarClock; labelKey: string }
> = {
  'due-today': { icon: CalendarClock, labelKey: 'govFollowUp.kpis.dueToday' },
  overdue: { icon: AlertTriangle, labelKey: 'govFollowUp.kpis.overdue' },
  'stale-7': { icon: Clock, labelKey: 'govFollowUp.kpis.stale' },
};

function chipToTab(chip: GovFollowUpChip): GovFollowUpTab {
  if (chip === 'due-today') return 'today';
  if (chip === 'overdue') return 'overdue';
  if (chip === 'recently-closed') return 'closed';
  if (chip === 'mantralaya' || chip === 'bmc' || chip === 'sra') {
    return 'by-department';
  }
  return 'today';
}

export function GovFollowUpDesk() {
  const { t } = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();
  const filters = useMemo(
    () => parseGovFollowUpFiltersFromSearchParams(new URLSearchParams(searchKey)),
    [searchKey],
  );
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const [catalogs, setCatalogs] = useState<GovFollowUpCatalogs>(EMPTY_CATALOGS);
  const [summary, setSummary] = useState<GovFollowUpSummary>(EMPTY_SUMMARY);
  const [matters, setMatters] = useState<GovFollowUpMatterListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [groups, setGroups] = useState<GovFollowUpGroupRow[]>([]);
  const [visitTotal, setVisitTotal] = useState(0);
  const [visitLocationName, setVisitLocationName] = useState('');
  const [visitByDept, setVisitByDept] = useState<
    Array<{ departmentId: string; name: string; count: number }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<GovFollowUpMatterDetail | null>(null);
  const [createForm, setCreateForm] = useState<MatterFormState>(emptyMatterForm());
  const [reloadToken, setReloadToken] = useState(0);
  const [searchDraft, setSearchDraft] = useState(filters.search);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncUrl = useCallback(
    (updates: Partial<typeof filters>) => {
      const params = buildGovFollowUpSearchParams(
        { ...filtersRef.current, ...updates },
        new URLSearchParams(),
      );
      const qs = params.toString();
      const next = qs ? `${pathname}?${qs}` : pathname;
      const current = searchKey ? `${pathname}?${searchKey}` : pathname;
      if (next === current) return;
      router.replace(next, { scroll: false });
    },
    [pathname, router, searchKey],
  );

  const scheduleSearch = useCallback(
    (value: string) => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      searchTimerRef.current = setTimeout(() => {
        syncUrl({ search: value, page: 1 });
      }, 350);
    },
    [syncUrl],
  );

  useEffect(() => {
    setSearchDraft(filters.search);
  }, [filters.search]);

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  const loadCore = useCallback(async () => {
    const [catalogsRes, summaryRes] = await Promise.all([
      fetch('/api/gov-follow-up/catalogs'),
      fetch('/api/gov-follow-up/summary'),
    ]);
    if (catalogsRes.ok) {
      setCatalogs((await catalogsRes.json()) as GovFollowUpCatalogs);
    }
    if (summaryRes.ok) {
      setSummary((await summaryRes.json()) as GovFollowUpSummary);
    }
  }, []);

  const reloadDesk = useCallback(() => {
    setReloadToken((token) => token + 1);
    void loadCore();
  }, [loadCore]);

  const listKey = [
    filters.tab,
    filters.chip,
    filters.search,
    filters.departmentId,
    filters.locationId,
    filters.officer,
    filters.staffUserId,
    filters.status,
    filters.visitDate,
    String(filters.page),
    String(filters.limit),
  ].join('|');

  useEffect(() => {
    void loadCore();
  }, [loadCore]);

  useEffect(() => {
    let cancelled = false;

    const loadList = async () => {
      setLoading(true);
      try {
        const current = filtersRef.current;
        const params = new URLSearchParams();
        params.set('tab', current.tab);
        if (current.chip) params.set('chip', current.chip);
        if (current.search) params.set('search', current.search);
        if (current.departmentId) params.set('departmentId', current.departmentId);
        if (current.locationId) params.set('locationId', current.locationId);
        if (current.officer) params.set('officer', current.officer);
        if (current.staffUserId) params.set('staffUserId', current.staffUserId);
        if (current.status) params.set('status', current.status);
        params.set('page', String(current.page));
        params.set('limit', String(current.limit));

        if (current.tab === 'visits') {
          const visitParams = new URLSearchParams();
          if (current.locationId) {
            visitParams.set('locationId', current.locationId);
          }
          visitParams.set(
            'date',
            current.visitDate || getTodayDateStringIST(),
          );
          const visitRes = await fetch(
            `/api/gov-follow-up/visits?${visitParams.toString()}`,
          );
          if (!visitRes.ok) throw new Error('visit');
          const visit = await visitRes.json();
          if (cancelled) return;
          setMatters(visit.matters ?? []);
          setTotal((visit.matters ?? []).length);
          setVisitTotal(visit.total ?? 0);
          setVisitLocationName(visit.locationName ?? '');
          setVisitByDept(visit.byDepartment ?? []);
        } else {
          const listRes = await fetch(`/api/gov-follow-up?${params.toString()}`);
          if (!listRes.ok) throw new Error('list');
          const list = await listRes.json();
          if (cancelled) return;
          setMatters(list.matters ?? []);
          setTotal(list.total ?? 0);
        }

        if (
          current.tab === 'by-department' ||
          current.tab === 'by-officer' ||
          current.tab === 'by-staff'
        ) {
          const by =
            current.tab === 'by-department'
              ? 'department'
              : current.tab === 'by-officer'
                ? 'officer'
                : 'staff';
          const groupRes = await fetch(`/api/gov-follow-up/groups?by=${by}`);
          if (groupRes.ok) {
            const payload = await groupRes.json();
            if (!cancelled) setGroups(payload.groups ?? []);
          }
        } else if (!cancelled) {
          setGroups([]);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) toast.error(t('govFollowUp.failedToLoad'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadList();
    return () => {
      cancelled = true;
    };
    // `t` is recreated every render; listKey + reloadToken are the real triggers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listKey, reloadToken]);

  useEffect(() => {
    if (!filters.matter) {
      setDetail(null);
      return;
    }
    void fetch(`/api/gov-follow-up/${filters.matter}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((matter) => setDetail(matter));
  }, [filters.matter]);

  useEffect(() => {
    if (!filters.isNew) return;
    const run = async () => {
      let next = emptyMatterForm();
      if (filters.letterId || filters.registerEntryId) {
        const params = new URLSearchParams();
        if (filters.letterId) params.set('letterId', filters.letterId);
        if (filters.registerEntryId) {
          params.set('registerEntryId', filters.registerEntryId);
        }
        const res = await fetch(`/api/gov-follow-up/prefill?${params}`);
        if (res.ok) {
          const prefill = await res.json();
          if (prefill.existingMatterId) {
            toast.success(t('govFollowUp.openExisting'));
            syncUrl({
              isNew: false,
              matter: prefill.existingMatterId,
              letterId: '',
              registerEntryId: '',
            });
            return;
          }
          next = {
            ...next,
            subject: prefill.subject || '',
            dateSubmitted: prefill.dateSubmitted || next.dateSubmitted,
            inwardRefNo: prefill.inwardRefNo || '',
            letterId: prefill.letterId || '',
            registerEntryId: prefill.registerEntryId || '',
          };
        }
      }
      setCreateForm(next);
    };
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.isNew, filters.letterId, filters.registerEntryId, syncUrl]);

  const todayLabel = formatDisplayDateIST(getTodayDateStringIST());

  const selectedGroupKey = useMemo(() => {
    if (filters.tab === 'by-department') return filters.departmentId;
    if (filters.tab === 'by-officer') return filters.officer;
    if (filters.tab === 'by-staff') return filters.staffUserId;
    return '';
  }, [filters]);

  const openMatter = (id: string) => syncUrl({ matter: id });
  const openCreate = () => syncUrl({ isNew: true });

  const applyChip = (chip: GovFollowUpChip) => {
    const active = filters.chip === chip;
    syncUrl({
      chip: active ? '' : chip,
      tab: active ? filters.tab : chipToTab(chip),
      page: 1,
      departmentId:
        chip === 'bmc'
          ? catalogs.departments.find((d) => d.code === 'bmc')?.id ?? ''
          : chip === 'sra'
            ? catalogs.departments.find((d) => d.code === 'sra')?.id ?? ''
            : '',
      locationId:
        chip === 'mantralaya'
          ? catalogs.locations.find((l) => l.code === 'mantralaya')?.id ?? ''
          : '',
    });
  };

  const saveMatter = async (input: GovFollowUpMatterInput) => {
    setSaving(true);
    try {
      const res = await fetch('/api/gov-follow-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'save');
      toast.success(t('govFollowUp.saved'));
      syncUrl({ isNew: false, matter: payload.id, letterId: '', registerEntryId: '' });
      reloadDesk();
    } catch (error) {
      console.error(error);
      toast.error(t('govFollowUp.failedToSave'));
    } finally {
      setSaving(false);
    }
  };

  const saveLog = async (input: GovFollowUpLogInput) => {
    if (!filters.matter) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/gov-follow-up/${filters.matter}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'log');
      setDetail(payload);
      toast.success(t('govFollowUp.logged'));
      reloadDesk();
    } catch (error) {
      console.error(error);
      toast.error(t('govFollowUp.failedToLog'));
    } finally {
      setSaving(false);
    }
  };

  const resultCount = filters.tab === 'visits' ? visitTotal : total;
  const tabCount = (tab: GovFollowUpTab): number | null => {
    if (tab === 'today') return summary.dueToday;
    if (tab === 'upcoming') return summary.upcoming;
    if (tab === 'overdue') return summary.overdue;
    if (tab === 'visits') return summary.visits;
    if (tab === 'closed') return summary.closed;
    return null;
  };

  return (
    <div className="flex flex-col gap-5">
      <ModulePageHeader
        title={t('govFollowUp.title')}
        description={t('govFollowUp.description')}
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            {t('govFollowUp.newMatter')}
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {GOV_FOLLOW_UP_KPI_CHIPS.map((chip) => {
          const count = summary[CHIP_COUNTS[chip]];
          const active = filters.chip === chip;
          const Icon = KPI_META[chip].icon;
          return (
            <button
              key={chip}
              type="button"
              aria-pressed={active}
              onClick={() => applyChip(chip)}
              className={cn(
                'flex flex-col gap-1 rounded-lg border p-4 text-left transition-colors',
                active
                  ? chip === 'overdue'
                    ? 'border-destructive bg-destructive/10'
                    : 'border-primary bg-primary/5'
                  : 'hover:border-primary/50 hover:bg-muted/50',
                !active &&
                  chip === 'overdue' &&
                  count > 0 &&
                  'border-destructive/30',
              )}
            >
              <span className="text-muted-foreground flex items-center gap-1.5 text-xs uppercase tracking-wide">
                <Icon className="size-3.5" />
                {t(KPI_META[chip].labelKey)}
              </span>
              <span
                className={cn(
                  'text-2xl font-semibold',
                  chip === 'overdue' && count > 0 && 'text-destructive',
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
          {t('govFollowUp.quickFilters')}
        </div>
        <div className="flex flex-wrap gap-2">
          {GOV_FOLLOW_UP_QUICK_CHIPS.map((chip) => {
            const count = summary[CHIP_COUNTS[chip]];
            const active = filters.chip === chip;
            return (
              <button
                key={chip}
                type="button"
                aria-pressed={active}
                onClick={() => applyChip(chip)}
                className={cn(
                  'inline-flex items-center rounded-full border px-3 py-1 text-xs transition-colors',
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'hover:border-primary/50',
                )}
              >
                {t(`govFollowUp.chips.${chip}`)}
                <Badge
                  variant={active ? 'secondary' : 'outline'}
                  className="ml-1.5 h-5 min-w-5 px-1.5"
                >
                  {count}
                </Badge>
              </button>
            );
          })}
        </div>
      </div>

      {filters.chip ? (
        <div className="bg-muted/50 flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-sm">
          <span className="text-muted-foreground">
            {t('govFollowUp.filterActive')}
          </span>
          <span className="font-medium">
            {t(`govFollowUp.chips.${filters.chip}`)}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-7"
            onClick={() => syncUrl({ chip: '', page: 1 })}
          >
            <X className="size-3.5" />
            {t('govFollowUp.clearFilter')}
          </Button>
        </div>
      ) : null}

      <Tabs
        value={filters.tab}
        onValueChange={(value) =>
          syncUrl({
            tab: value as GovFollowUpTab,
            page: 1,
            chip: '',
          })
        }
        className="space-y-2"
      >
        <div className="-mx-3 overflow-x-auto px-3 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex h-auto w-max min-w-full justify-start">
            {GOV_FOLLOW_UP_PRIMARY_TABS.map((tab) => {
              const count = tabCount(tab);
              return (
                <TabsTrigger key={tab} value={tab} className="gap-1.5">
                  {t(`govFollowUp.tabs.${tab}`)}
                  {count != null ? (
                    <Badge
                      variant="secondary"
                      className="h-5 min-w-5 px-1.5 text-[10px]"
                    >
                      {count}
                    </Badge>
                  ) : null}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-muted-foreground mr-1 text-xs font-medium uppercase tracking-wide">
            {t('govFollowUp.browse')}
          </span>
          <TabsList className="h-auto bg-transparent p-0">
            {GOV_FOLLOW_UP_BROWSE_TABS.map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="h-auto rounded-full border px-2.5 py-1 text-xs data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-transparent data-[state=inactive]:text-muted-foreground data-[state=inactive]:shadow-none"
              >
                {t(`govFollowUp.tabs.${tab}`)}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>

      {filters.tab === 'today' ? (
        <h2 className="text-base font-semibold">
          {t('govFollowUp.todayTitle', { date: todayLabel })}
        </h2>
      ) : null}

      {filters.tab === 'visits' ? (
        <div className="space-y-3 rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 font-medium">
            <MapPin className="text-muted-foreground size-4" />
            {t('govFollowUp.visits.title')}
          </div>
          <p className="text-muted-foreground text-sm">
            {t('govFollowUp.visits.help')}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="space-y-1.5">
              <div className="text-sm font-medium">
                {t('govFollowUp.visits.pickLocation')}
              </div>
              <Select
                value={filters.locationId || undefined}
                onValueChange={(value) =>
                  syncUrl({ locationId: value, page: 1 })
                }
              >
                <SelectTrigger className="w-full sm:w-[220px]">
                  <SelectValue placeholder={t('govFollowUp.selectLocation')} />
                </SelectTrigger>
                <SelectContent>
                  {catalogs.locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <div className="text-sm font-medium">
                {t('govFollowUp.visits.pickDate')}
              </div>
              <DmyDateInput
                value={filters.visitDate || getTodayDateStringIST()}
                onValueChange={(ymd) => syncUrl({ visitDate: ymd, page: 1 })}
              />
            </div>
          </div>
          <p className="text-sm font-medium">
            {t('govFollowUp.visits.headline', {
              count: visitTotal,
              location: visitLocationName || '—',
            })}
          </p>
          {visitByDept.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {visitByDept.map((dept) => (
                <Badge key={dept.departmentId} variant="outline">
                  {dept.count} – {dept.name}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 lg:flex-row">
        {groups.length > 0 ? (
          <aside className="flex shrink-0 flex-col rounded-lg border bg-card lg:w-56">
            <div className="text-muted-foreground border-b px-3 py-2 text-xs font-medium uppercase tracking-wide">
              {t('govFollowUp.groups.title')}
            </div>
            <div className="flex gap-1 overflow-x-auto p-1.5 lg:max-h-[480px] lg:flex-col lg:overflow-y-auto">
              <button
                type="button"
                className={cn(
                  'flex shrink-0 items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-sm',
                  !selectedGroupKey
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted',
                )}
                onClick={() =>
                  syncUrl({
                    departmentId: '',
                    officer: '',
                    staffUserId: '',
                    page: 1,
                  })
                }
              >
                {t('govFollowUp.groups.all')}
              </button>
              {groups.map((group) => (
                <button
                  key={group.key}
                  type="button"
                  className={cn(
                    'flex shrink-0 items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-sm',
                    selectedGroupKey === group.key
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted',
                  )}
                  onClick={() => {
                    if (filters.tab === 'by-department') {
                      syncUrl({ departmentId: group.key, page: 1 });
                    } else if (filters.tab === 'by-officer') {
                      syncUrl({
                        officer: group.key,
                        page: 1,
                      });
                    } else {
                      syncUrl({
                        staffUserId: group.key,
                        page: 1,
                      });
                    }
                  }}
                >
                  <span className="truncate">{group.label}</span>
                  <Badge
                    variant={
                      selectedGroupKey === group.key ? 'secondary' : 'outline'
                    }
                    className="h-5 shrink-0 px-1.5"
                  >
                    {group.count}
                  </Badge>
                </button>
              ))}
            </div>
          </aside>
        ) : null}

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
              <Input
                className="pl-9 pr-9"
                placeholder={t('govFollowUp.searchPlaceholder')}
                value={searchDraft}
                onChange={(e) => {
                  const value = e.target.value;
                  setSearchDraft(value);
                  scheduleSearch(value);
                }}
              />
              {searchDraft ? (
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground absolute right-2.5 top-1/2 -translate-y-1/2"
                  onClick={() => {
                    if (searchTimerRef.current) {
                      clearTimeout(searchTimerRef.current);
                    }
                    setSearchDraft('');
                    syncUrl({ search: '', page: 1 });
                  }}
                  aria-label={t('common.reset')}
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </div>
            <p className="text-muted-foreground shrink-0 text-sm">
              {t('govFollowUp.resultsCount', { count: resultCount })}
            </p>
          </div>
          {loading ? (
            <TableSkeleton rows={8} />
          ) : (
            <GovFollowUpMatterTable
              matters={
                filters.tab === 'visits'
                  ? matters.slice(
                      (filters.page - 1) * filters.limit,
                      filters.page * filters.limit,
                    )
                  : matters
              }
              total={filters.tab === 'visits' ? visitTotal : total}
              page={filters.page}
              limit={filters.limit}
              onPageChange={(page) => syncUrl({ page })}
              onPageSizeChange={(limit) => syncUrl({ limit, page: 1 })}
              onOpen={openMatter}
              onCreate={openCreate}
              actionColumn={
                filters.tab === 'today' || filters.tab === 'overdue'
                  ? 'today'
                  : 'next'
              }
            />
          )}
        </div>
      </div>

      <GovFollowUpCreateDialog
        open={filters.isNew}
        onOpenChange={(open) =>
          syncUrl(
            open
              ? { isNew: true }
              : { isNew: false, letterId: '', registerEntryId: '' },
          )
        }
        catalogs={catalogs}
        initial={createForm}
        saving={saving}
        onSave={saveMatter}
      />

      <GovFollowUpDetailDialog
        open={Boolean(filters.matter)}
        onOpenChange={(open) => {
          if (!open) syncUrl({ matter: '' });
        }}
        matter={detail}
        catalogs={catalogs}
        saving={saving}
        onLog={saveLog}
      />
    </div>
  );
}
