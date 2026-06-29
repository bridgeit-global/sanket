'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ChevronDown, Loader2, Plus, Search, Settings, SlidersHorizontal, X } from 'lucide-react';
import { SidebarToggle } from '@/components/sidebar-toggle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ContactWithCall } from './contact-with-call';
import { MemberList } from './member-list';
import { WardPanel } from './ward-panel';
import { MemberEditor, type MemberEditorTarget } from './member-editor';
import { HierarchyConfigAdmin } from './hierarchy-config-admin';
import type {
  CadreConfig,
  CadreConfigReferenceCounts,
  CadreMemberCard,
} from '@/lib/hierarchy/types';
import {
  getMemberDisplayName,
  getMemberPhone,
} from '@/lib/hierarchy/geo-attribution';
import {
  DEFAULT_MEMBER_PAGE_SIZE,
  filterWardCommitteeMembers,
  filterBoothCommitteeMembers,
  HIERARCHY_URL_PARAMS,
  HIERARCHY_VIEWS,
  extractWardNumber,
  filterMembers,
  paginateMembers,
  parseMemberPageParam,
  sortMembers,
} from '@/lib/hierarchy/member-list';
import {
  extractBoothNumber,
  getBoothGeoUnits,
} from '@/lib/hierarchy/booth-geo-units';
import {
  findSeniorMemberForGeo,
  geoTargetToFilterUpdates,
  type GeoBreadcrumbTarget,
} from '@/lib/hierarchy/geo-navigation';
import {
  SELECT_NONE_VALUE,
  fromOptionalSelectValue,
  toOptionalSelectValue,
} from '@/lib/hierarchy/select-utils';

const DEFAULT_CONSTITUENCY_ID = '172';
const CONSTITUENCY_TITLE = 'NCP 172 Anushakti Nagar';

const FILTER_URL_KEYS = ['search', 'vertical', 'position', 'ward', 'booth', 'member', 'view'] as const;

const COMMITTEE_LEVEL_KEYS = new Set(['ward_committee', 'booth_committee']);

function memberHasVertical(member: CadreMemberCard, verticalId: string): boolean {
  return member.verticals.some((v) => v.id === verticalId);
}

function filterMembersByVertical(
  members: CadreMemberCard[],
  verticalId: string,
): CadreMemberCard[] {
  if (!verticalId) return members;
  return members.filter((member) => memberHasVertical(member, verticalId));
}

function findSeniorMemberForGeoAndVertical(
  members: CadreMemberCard[],
  target: GeoBreadcrumbTarget,
  verticalId: string,
): CadreMemberCard | null {
  return findSeniorMemberForGeo(filterMembersByVertical(members, verticalId), target);
}

function formatWardLabel(wardName: string): string {
  const wardNumber = extractWardNumber(wardName);
  return wardNumber !== Number.MAX_SAFE_INTEGER ? String(wardNumber) : wardName;
}

interface HierarchyModuleProps {
  canEdit: boolean;
  isAdmin: boolean;
}

export function HierarchyModule({ canEdit, isAdmin }: HierarchyModuleProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, startSearchTransition] = useTransition();

  const [config, setConfig] = useState<CadreConfig | null>(null);
  const [referenceCounts, setReferenceCounts] =
    useState<CadreConfigReferenceCounts | null>(null);
  const [members, setMembers] = useState<CadreMemberCard[]>([]);
  const [defaultElectionId, setDefaultElectionId] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchDraft, setSearchDraft] = useState('');
  const [isSearchPending, setIsSearchPending] = useState(false);
  const pendingSearchRef = useRef<string | null>(null);

  const [editorTarget, setEditorTarget] = useState<MemberEditorTarget | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [pageSize, setPageSize] = useState(DEFAULT_MEMBER_PAGE_SIZE);
  const listScrollRef = useRef<HTMLDivElement>(null);

  const searchQuery = searchParams.get(HIERARCHY_URL_PARAMS.search) ?? '';
  const verticalId = searchParams.get(HIERARCHY_URL_PARAMS.vertical) ?? '';
  const positionId = searchParams.get(HIERARCHY_URL_PARAMS.position) ?? '';
  const wardGeoId = searchParams.get(HIERARCHY_URL_PARAMS.ward) ?? '';
  const boothNo = searchParams.get(HIERARCHY_URL_PARAMS.booth) ?? '';
  const focusMemberId = searchParams.get(HIERARCHY_URL_PARAMS.member) ?? '';
  const pageFromUrl = parseMemberPageParam(searchParams.get(HIERARCHY_URL_PARAMS.page));
  const viewMode = searchParams.get(HIERARCHY_URL_PARAMS.view) ?? '';

  useEffect(() => {
    setSearchDraft(searchQuery);
    if (pendingSearchRef.current !== null && searchQuery.trim() === pendingSearchRef.current) {
      pendingSearchRef.current = null;
      setIsSearchPending(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (!isSearchPending) return;
    const timeoutId = window.setTimeout(() => {
      pendingSearchRef.current = null;
      setIsSearchPending(false);
    }, 2000);
    return () => window.clearTimeout(timeoutId);
  }, [isSearchPending]);

  const isSearching = isNavigating || isSearchPending;

  const setUrlParams = useCallback(
    (updates: {
      search?: string;
      vertical?: string;
      position?: string;
      ward?: string;
      booth?: string;
      member?: string;
      page?: number;
      view?: string;
    }) => {
      const hasFilterUpdate = FILTER_URL_KEYS.some((key) => key in updates);
      const clearsMemberFocus =
        hasFilterUpdate &&
        !('member' in updates) &&
        FILTER_URL_KEYS.some((key) => key !== 'member' && key in updates);
      const next = {
        search: updates.search ?? searchQuery,
        vertical: updates.vertical ?? verticalId,
        position: updates.position ?? positionId,
        ward: updates.ward ?? wardGeoId,
        booth: updates.booth ?? boothNo,
        member: clearsMemberFocus ? '' : (updates.member ?? focusMemberId),
        view: 'view' in updates ? (updates.view ?? '') : viewMode,
      };
      const nextPage = hasFilterUpdate
        ? 1
        : (updates.page ?? pageFromUrl);
      const params = new URLSearchParams();
      if (next.search.trim()) params.set(HIERARCHY_URL_PARAMS.search, next.search.trim());
      if (next.vertical.trim()) params.set(HIERARCHY_URL_PARAMS.vertical, next.vertical.trim());
      if (next.position.trim()) params.set(HIERARCHY_URL_PARAMS.position, next.position.trim());
      if (next.ward.trim()) params.set(HIERARCHY_URL_PARAMS.ward, next.ward.trim());
      if (next.booth.trim()) params.set(HIERARCHY_URL_PARAMS.booth, next.booth.trim());
      if (next.member.trim()) params.set(HIERARCHY_URL_PARAMS.member, next.member.trim());
      if (next.view.trim()) params.set(HIERARCHY_URL_PARAMS.view, next.view.trim());
      if (nextPage > 1) params.set(HIERARCHY_URL_PARAMS.page, String(nextPage));
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchQuery, verticalId, positionId, wardGeoId, boothNo, focusMemberId, pageFromUrl, viewMode],
  );

  const commitSearch = useCallback(() => {
    const trimmed = searchDraft.trim();
    if (trimmed === searchQuery.trim()) return;
    pendingSearchRef.current = trimmed;
    setIsSearchPending(true);
    startSearchTransition(() => {
      setUrlParams({ search: searchDraft });
    });
  }, [searchDraft, searchQuery, setUrlParams, startSearchTransition]);

  const loadConfig = useCallback(async () => {
    const res = await fetch('/api/hierarchy/config');
    const data = await res.json();
    if (data.config) {
      setConfig(data.config);
      setReferenceCounts(data.referenceCounts ?? null);
    }
  }, []);

  const loadBootstrap = useCallback(async (signal?: AbortSignal) => {
    const params = new URLSearchParams({ constituencyId: DEFAULT_CONSTITUENCY_ID });
    let res: Response;
    try {
      res = await fetch(`/api/hierarchy/bootstrap?${params}`, { signal });
    } catch (err) {
      if (signal?.aborted) return;
      setLoadError(err instanceof Error ? err.message : 'Failed to load hierarchy data');
      return;
    }
    if (!res.ok) {
      let message = `Failed to load hierarchy (${res.status})`;
      const text = await res.text();
      try {
        const body = JSON.parse(text) as { error?: string };
        if (typeof body.error === 'string' && body.error.trim()) message = body.error.trim();
      } catch {
        if (text.trim()) message = text.trim();
      }
      setLoadError(message);
      return;
    }
    const data = await res.json();
    if (data.config) setConfig(data.config);
    setMembers(data.members ?? []);
    setDefaultElectionId(data.defaultElectionId ?? '');
    setLoadError(null);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        await loadBootstrap(controller.signal);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [loadBootstrap]);

  const ensureReferenceCounts = useCallback(async () => {
    if (referenceCounts) return;
    await loadConfig();
  }, [referenceCounts, loadConfig]);

  const refresh = useCallback(() => {
    setLoadError(null);
    void loadBootstrap();
  }, [loadBootstrap]);

  const activeVerticals = useMemo(
    () => (config?.verticals ?? []).filter((v) => v.isActive),
    [config?.verticals],
  );

  const effectiveVerticalId = verticalId || activeVerticals[0]?.id || '';
  const selectedVerticalName =
    activeVerticals.find((v) => v.id === effectiveVerticalId)?.name ?? 'Basic';

  const showWardPanel = Boolean(wardGeoId);
  const showOverview = !wardGeoId && viewMode !== HIERARCHY_VIEWS.talukaCommittee;
  const showTalukaCommittee = viewMode === HIERARCHY_VIEWS.talukaCommittee;
  const showWardCommittee = showWardPanel && viewMode === HIERARCHY_VIEWS.wardCommittee;
  const showBoothCommittee = showWardPanel && viewMode === HIERARCHY_VIEWS.boothCommittee;
  const showWardPanelMain =
    showWardPanel && !showWardCommittee && !showBoothCommittee;

  const activePositions = useMemo(
    () =>
      (config?.positions ?? [])
        .filter((p) => p.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [config?.positions],
  );

  const wardOptions = useMemo(
    () =>
      (config?.geoUnits ?? [])
        .filter((g) => g.type === 'ward' && g.isActive)
        .sort((a, b) => extractWardNumber(a.name) - extractWardNumber(b.name)),
    [config?.geoUnits],
  );

  const boothOptions = useMemo(() => {
    if (!config?.geoUnits) return [];
    const units = wardGeoId
      ? getBoothGeoUnits(config.geoUnits, DEFAULT_CONSTITUENCY_ID, wardGeoId)
      : getBoothGeoUnits(config.geoUnits, DEFAULT_CONSTITUENCY_ID);
    return units
      .map((g) => extractBoothNumber(g.name) ?? g.name.trim())
      .filter((b): b is string => Boolean(b));
  }, [config?.geoUnits, wardGeoId]);

  const visibleMembers = useMemo(() => {
    if (showTalukaCommittee) {
      const committeeMembers = filterMembersByVertical(members, effectiveVerticalId).filter(
        (member) =>
          member.posts.some((post) => COMMITTEE_LEVEL_KEYS.has(post.positionLevelKey)),
      );
      return sortMembers(
        filterMembers(committeeMembers, {
          search: searchQuery,
          memberId: focusMemberId,
        }),
      );
    }

    if (showWardCommittee) {
      const committeeMembers = filterWardCommitteeMembers(
        members,
        wardGeoId,
        effectiveVerticalId,
      );
      return sortMembers(
        filterMembers(committeeMembers, {
          search: searchQuery,
          memberId: focusMemberId,
        }),
      );
    }

    if (showBoothCommittee) {
      const committeeMembers = filterBoothCommitteeMembers(
        members,
        wardGeoId,
        boothNo,
        effectiveVerticalId,
      );
      return sortMembers(
        filterMembers(committeeMembers, {
          search: searchQuery,
          memberId: focusMemberId,
        }),
      );
    }

    return sortMembers(
      filterMembers(members, {
        search: searchQuery,
        verticalId: effectiveVerticalId,
        positionId,
        wardGeoId,
        boothNo,
        memberId: focusMemberId,
      }),
    );
  }, [
    members,
    searchQuery,
    effectiveVerticalId,
    positionId,
    wardGeoId,
    boothNo,
    focusMemberId,
    showTalukaCommittee,
    showWardCommittee,
    showBoothCommittee,
  ]);

  const memberPagination = useMemo(
    () => paginateMembers(visibleMembers, pageFromUrl, pageSize),
    [visibleMembers, pageFromUrl, pageSize],
  );

  useEffect(() => {
    if (!focusMemberId || loading) return;
    const frame = requestAnimationFrame(() => {
      document
        .getElementById(`member-card-${focusMemberId}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    return () => cancelAnimationFrame(frame);
  }, [focusMemberId, visibleMembers, loading]);

  useEffect(() => {
    if (pageFromUrl !== memberPagination.currentPage) {
      setUrlParams({ page: memberPagination.currentPage });
    }
  }, [pageFromUrl, memberPagination.currentPage, setUrlParams]);

  const handleMemberPageChange = useCallback(
    (page: number) => {
      setUrlParams({ page });
      listScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [setUrlParams],
  );

  const handleMemberPageSizeChange = useCallback(
    (size: number) => {
      setPageSize(size);
      setUrlParams({ page: 1 });
      listScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [setUrlParams],
  );

  const talukaAdhyaksh = useMemo(
    () =>
      findSeniorMemberForGeoAndVertical(
        members,
        { scope: 'constituency' },
        effectiveVerticalId,
      ),
    [members, effectiveVerticalId],
  );

  const wardEntries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return wardOptions
      .map((ward) => {
        const head = findSeniorMemberForGeoAndVertical(
          members,
          { scope: 'ward', wardGeoId: ward.id },
          effectiveVerticalId,
        );
        const wardLabel = formatWardLabel(ward.name);
        const headName = head ? getMemberDisplayName(head) : '—';
        const headPhone = head ? getMemberPhone(head) : null;

        return {
          ward,
          wardLabel,
          head,
          headName,
          headPhone,
        };
      })
      .filter((entry) => {
        if (!query) return true;
        if (entry.ward.name.toLowerCase().includes(query)) return true;
        if (entry.wardLabel.toLowerCase().includes(query)) return true;
        if (entry.headName.toLowerCase().includes(query)) return true;
        if ((entry.headPhone ?? '').includes(query)) return true;
        return false;
      });
  }, [wardOptions, members, effectiveVerticalId, searchQuery]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (verticalId) count += 1;
    if (positionId) count += 1;
    if (wardGeoId) count += 1;
    if (boothNo) count += 1;
    return count;
  }, [verticalId, positionId, wardGeoId, boothNo]);

  const clearSearch = useCallback(() => {
    setSearchDraft('');
    setUrlParams({ search: '' });
  }, [setUrlParams]);

  const hasSearch = Boolean(searchDraft.trim() || searchQuery.trim());

  const activeFilterChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; onRemove: () => void }> = [];

    if (verticalId) {
      chips.push({
        key: 'vertical',
        label: activeVerticals.find((v) => v.id === verticalId)?.name ?? 'Vertical',
        onRemove: () => setUrlParams({ vertical: '' }),
      });
    }
    if (wardGeoId) {
      chips.push({
        key: 'ward',
        label: wardOptions.find((w) => w.id === wardGeoId)?.name ?? 'Ward',
        onRemove: () => setUrlParams({ ward: '', booth: '' }),
      });
    }
    if (positionId) {
      chips.push({
        key: 'position',
        label: activePositions.find((p) => p.id === positionId)?.name ?? 'Position',
        onRemove: () => setUrlParams({ position: '' }),
      });
    }
    if (boothNo) {
      chips.push({
        key: 'booth',
        label: `Booth ${boothNo}`,
        onRemove: () => setUrlParams({ booth: '' }),
      });
    }
    if (searchQuery.trim()) {
      chips.push({
        key: 'search',
        label: `Search: "${searchQuery.trim()}"`,
        onRemove: () => {
          setSearchDraft('');
          setUrlParams({ search: '' });
        },
      });
    }
    if (focusMemberId) {
      const focusMember = members.find((m) => m.id === focusMemberId);
      chips.push({
        key: 'member',
        label: focusMember ? getMemberDisplayName(focusMember) : 'Member focus',
        onRemove: () => setUrlParams({ member: '' }),
      });
    }

    return chips;
  }, [
    verticalId,
    wardGeoId,
    positionId,
    boothNo,
    searchQuery,
    focusMemberId,
    activeVerticals,
    wardOptions,
    activePositions,
    members,
    setUrlParams,
  ]);

  const openCreateMember = () => {
    setEditorTarget({ mode: 'create' });
  };

  const handleEdit = (member: CadreMemberCard) => {
    setEditorTarget({ mode: 'edit', member });
  };

  const handleNavigateToGeo = useCallback(
    (target: GeoBreadcrumbTarget) => {
      const seniorMember = findSeniorMemberForGeo(members, target);
      if (!seniorMember) return;

      setEditorTarget(null);
      setUrlParams(geoTargetToFilterUpdates(target, seniorMember));
      listScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [members, setUrlParams],
  );

  const filterVerticalSelect = (
    <Select
      value={toOptionalSelectValue(verticalId || effectiveVerticalId)}
      onValueChange={(v) => setUrlParams({ vertical: fromOptionalSelectValue(v) })}
    >
      <SelectTrigger className="h-9 w-full rounded-xl">
        <SelectValue placeholder="All Verticals" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={SELECT_NONE_VALUE}>All Verticals</SelectItem>
        {activeVerticals.map((v) => (
          <SelectItem key={v.id} value={v.id}>
            {v.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const verticalSelect = (
    <Select
      value={effectiveVerticalId}
      onValueChange={(v) => setUrlParams({ vertical: v })}
    >
      <SelectTrigger className="h-11 w-full rounded-xl border border-input bg-muted/40 px-3 shadow-none [&>svg]:hidden">
        <span className="flex w-full min-w-0 items-center justify-between gap-2 text-sm">
          <span className="min-w-0 truncate">
            <span className="hidden sm:inline">Vertical Category: </span>
            <span className="sm:hidden">Vertical: </span>
            <span className="font-medium">{selectedVerticalName}</span>
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </span>
      </SelectTrigger>
      <SelectContent>
        {activeVerticals.map((v) => (
          <SelectItem key={v.id} value={v.id}>
            {v.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const wardSelect = (
    <Select
      value={toOptionalSelectValue(wardGeoId)}
      onValueChange={(v) =>
        setUrlParams({ ward: fromOptionalSelectValue(v), booth: '' })
      }
    >
      <SelectTrigger className="h-9 w-auto gap-1 rounded-xl">
        <SelectValue placeholder="All wards" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={SELECT_NONE_VALUE}>All wards</SelectItem>
        {wardOptions.map((w) => (
          <SelectItem key={w.id} value={w.id}>
            {w.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const positionSelect = (
    <Select
      value={toOptionalSelectValue(positionId)}
      onValueChange={(v) => setUrlParams({ position: fromOptionalSelectValue(v) })}
    >
      <SelectTrigger className="h-9 w-auto gap-1 rounded-xl">
        <SelectValue placeholder="All positions" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={SELECT_NONE_VALUE}>All positions</SelectItem>
        {activePositions.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const openWardPanel = (wardId: string) => {
    setUrlParams({
      ward: wardId,
      booth: '',
      member: '',
      position: '',
      view: '',
      page: 1,
    });
    listScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openTalukaCommittee = () => {
    setUrlParams({
      view: HIERARCHY_VIEWS.talukaCommittee,
      ward: '',
      booth: '',
      member: '',
      position: '',
      page: 1,
    });
    listScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const backToOverview = () => {
    setUrlParams({
      ward: '',
      booth: '',
      member: '',
      position: '',
      view: '',
      page: 1,
    });
    listScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const backToWardPanel = () => {
    setUrlParams({
      booth: '',
      member: '',
      position: '',
      view: '',
      page: 1,
    });
    listScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openViewWardCommittee = (verticalId: string) => {
    setUrlParams({
      vertical: verticalId,
      view: HIERARCHY_VIEWS.wardCommittee,
      booth: '',
      member: '',
      position: '',
      page: 1,
    });
    listScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openViewBoothCommittee = (booth: string) => {
    setUrlParams({
      booth,
      view: HIERARCHY_VIEWS.boothCommittee,
      member: '',
      position: '',
      page: 1,
    });
    listScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openAddBoothCommitteeMember = (booth: string) => {
    setUrlParams({ booth });
    setEditorTarget({ mode: 'create' });
  };

  const talukaAdhyakshName = talukaAdhyaksh ? getMemberDisplayName(talukaAdhyaksh) : '—';
  const talukaAdhyakshPhone = talukaAdhyaksh ? getMemberPhone(talukaAdhyaksh) : null;
  const selectedWardName =
    wardOptions.find((w) => w.id === wardGeoId)?.name ?? 'Ward';
  const selectedWardLabel = formatWardLabel(selectedWardName);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col gap-2 overflow-hidden sm:gap-3">
      <div className="flex shrink-0 items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <SidebarToggle />
          <h1 className="truncate text-base font-bold tracking-tight sm:text-xl">
            {CONSTITUENCY_TITLE}
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {canEdit && (
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl px-2.5 sm:px-3"
              onClick={openCreateMember}
            >
              <Plus className="size-4 sm:mr-1" />
              <span className="hidden sm:inline">Add member</span>
              <span className="sr-only sm:hidden">Add member</span>
            </Button>
          )}
          {isAdmin && (
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl"
              aria-label="Configuration"
              onClick={() => {
                void ensureReferenceCounts();
                setConfigOpen(true);
              }}
            >
              <Settings className="size-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="shrink-0">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <Label
            htmlFor="hierarchy-search"
            className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground"
          >
            SEARCH
          </Label>
          {hasSearch && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={clearSearch}
            >
              Clear all
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Input
              id="hierarchy-search"
              className="h-11 rounded-xl border border-input bg-muted/40 px-3 shadow-none focus-visible:ring-1 pr-10"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitSearch();
              }}
              placeholder="Search name/number..."
            />
            {hasSearch && (
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Clear search"
                onMouseDown={(e) => e.preventDefault()}
                onClick={clearSearch}
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <Button
            type="button"
            className="h-11 shrink-0 gap-1.5 rounded-xl px-3 sm:px-4"
            disabled={isSearching}
            onClick={commitSearch}
            aria-label={isSearching ? 'Searching' : 'Search'}
          >
            {isSearching ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Search className="size-4" />
            )}
            <span className="hidden sm:inline">
              {isSearching ? 'Searching…' : 'Search'}
            </span>
          </Button>
        </div>
      </div>

      {!showWardPanelMain && <div className="shrink-0">{verticalSelect}</div>}

      {!showOverview && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-fit shrink-0 gap-1.5 text-muted-foreground hover:text-foreground"
          onClick={
            showWardPanel && (showWardCommittee || showBoothCommittee)
              ? backToWardPanel
              : backToOverview
          }
        >
          <ArrowLeft className="size-4" />
          {showWardPanel && (showWardCommittee || showBoothCommittee)
            ? 'Back to ward panel'
            : showWardPanel
              ? 'Back to all wards'
              : 'Back to constituency'}
        </Button>
      )}

      {showWardPanel && (
        <div className="flex shrink-0 items-center gap-2 overflow-x-auto pb-0.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 shrink-0 gap-1.5 rounded-full"
            onClick={() => setFiltersOpen(true)}
          >
            <SlidersHorizontal className="size-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="h-5 min-w-5 justify-center px-1.5">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </div>
      )}

      {showWardPanel && activeFilterChips.length > 0 && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {activeFilterChips.map((chip) => (
            <Badge
              key={chip.key}
              variant="secondary"
              className="gap-1 pr-1 font-normal"
            >
              {chip.label}
              <button
                type="button"
                aria-label={`Remove ${chip.label} filter`}
                className="rounded-full p-0.5 hover:bg-muted-foreground/20"
                onClick={chip.onRemove}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <div
        ref={listScrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain pb-[max(0.5rem,env(safe-area-inset-bottom))] [-webkit-overflow-scrolling:touch]"
      >
        {loading ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/20">
            <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Loading hierarchy…</p>
          </div>
        ) : loadError ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-destructive/40 bg-destructive/5 px-4 text-center">
            <p className="text-sm text-destructive">{loadError}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setLoading(true);
                setLoadError(null);
                void loadBootstrap().finally(() => setLoading(false));
              }}
            >
              Retry
            </Button>
          </div>
        ) : showOverview ? (
          <div className="flex flex-col gap-3">
            <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 dark:border-primary/50 dark:bg-primary/10">
              <p className="text-sm">
                Taluka Adhyaksh ({selectedVerticalName}): {talukaAdhyakshName}
              </p>
              <div className="mt-1">
                <ContactWithCall phone={talukaAdhyakshPhone} />
              </div>
              <button
                type="button"
                className="mt-2 text-xs font-semibold tracking-[0.08em] text-primary uppercase hover:underline"
                onClick={openTalukaCommittee}
              >
                View Taluka Committee
              </button>
            </div>

            {wardEntries.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
                No wards match the current search.
              </div>
            ) : (
              wardEntries.map((entry) => (
                <div key={entry.ward.id} className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                  <div className="px-4 py-3">
                    <p className="font-bold">Ward No. {entry.wardLabel}</p>
                    <div className="mt-1 space-y-1 text-sm">
                      <p>Head: {entry.headName}</p>
                      <ContactWithCall phone={entry.headPhone} />
                    </div>
                  </div>
                  <button
                    type="button"
                    className="w-full bg-muted/60 px-4 py-2.5 text-sm transition-colors hover:bg-muted"
                    onClick={() => openWardPanel(entry.ward.id)}
                  >
                    Open Ward {entry.wardLabel} Control Panel
                  </button>
                </div>
              ))
            )}
          </div>
        ) : showWardPanelMain ? (
          <WardPanel
            wardGeoId={wardGeoId}
            wardLabel={selectedWardLabel}
            members={members}
            activeVerticals={activeVerticals}
            boothNumbers={boothOptions}
            canEdit={canEdit}
            initialExpandedBooth={boothNo || undefined}
            onViewWardCommittee={openViewWardCommittee}
            onViewBoothCommittee={openViewBoothCommittee}
            onAddBoothCommitteeMember={openAddBoothCommitteeMember}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {showWardPanel && (showWardCommittee || showBoothCommittee) && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 dark:border-primary/50 dark:bg-primary/10">
                <p className="text-sm font-medium">
                  {showBoothCommittee
                    ? `Booth ${boothNo} Committee`
                    : `${selectedWardName} Ward Committee`}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {selectedVerticalName} vertical · committee members
                </p>
              </div>
            )}
            {showTalukaCommittee && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 dark:border-primary/50 dark:bg-primary/10">
                <p className="text-sm font-medium">Taluka Committee</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {selectedVerticalName} vertical · committee members
                </p>
              </div>
            )}
            <MemberList
              members={memberPagination.items}
              allMembers={members}
              canEdit={canEdit}
              onEdit={canEdit ? handleEdit : undefined}
              onNavigateToGeo={handleNavigateToGeo}
              pagination={{
                currentPage: memberPagination.currentPage,
                totalPages: memberPagination.totalPages,
                pageSize,
                totalItems: memberPagination.totalItems,
                onPageChange: handleMemberPageChange,
                onPageSizeChange: handleMemberPageSizeChange,
              }}
            />
          </div>
        )}
      </div>

      {canEdit && editorTarget && config && (
        <MemberEditor
          open
          onOpenChange={(open) => {
            if (!open) setEditorTarget(null);
          }}
          target={editorTarget}
          config={config}
          constituencyId={DEFAULT_CONSTITUENCY_ID}
          electionId={defaultElectionId}
          onSaved={refresh}
        />
      )}

      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-xl">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <div className="mt-4 flex flex-col gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Vertical</Label>
              {filterVerticalSelect}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Position</Label>
              {positionSelect}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Ward</Label>
              {wardSelect}
            </div>
            {boothOptions.length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground">Booth</Label>
                <Select
                  value={toOptionalSelectValue(boothNo)}
                  onValueChange={(v) => setUrlParams({ booth: fromOptionalSelectValue(v) })}
                >
                  <SelectTrigger className="h-9 rounded-xl">
                    <SelectValue placeholder="All booths" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SELECT_NONE_VALUE}>All booths</SelectItem>
                    {boothOptions.map((b) => (
                      <SelectItem key={b} value={b}>
                        Booth {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() =>
                  setUrlParams({
                    vertical: '',
                    position: '',
                    ward: '',
                    booth: '',
                    member: '',
                    view: '',
                  })
                }
              >
                <X className="size-4" /> Clear filters
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {config && (
        <Sheet open={configOpen} onOpenChange={setConfigOpen}>
          <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-3xl">
            <SheetHeader>
              <SheetTitle>Hierarchy configuration</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <HierarchyConfigAdmin
                config={config}
                referenceCounts={referenceCounts}
                onRefresh={loadConfig}
                onMembersRefresh={refresh}
                onVerticalSaved={(savedId) => {
                  if (savedId) setUrlParams({ vertical: savedId });
                }}
              />
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
