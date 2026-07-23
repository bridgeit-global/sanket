'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, Plus, Search, Settings, X } from 'lucide-react';
import { SidebarToggle } from '@/components/sidebar-toggle';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HierarchyCanvasView } from './hierarchy-canvas-view';
import { LeadershipSection } from './leadership-section';
import { WardAccessSection } from './ward-access-section';
import { MemberList } from './member-list';
import { WardPanel } from './ward-panel';
import { MemberEditor, type MemberEditorTarget } from './member-editor';
import { HierarchyConfigAdmin } from './hierarchy-config-admin';
import type {
  CadreConfig,
  CadreConfigReferenceCounts,
  CadreMemberCard,
  WardSummary,
} from '@/lib/hierarchy/types';
import {
  HIERARCHY_URL_PARAMS,
  HIERARCHY_VIEWS,
  VOTER_ID_FILTERS,
  extractWardNumber,
  filterMembers,
  paginateMembers,
  parseMemberPageParam,
  parseMemberPageSizeParam,
  parseVoterIdFilterParam,
  sortMembers,
} from '@/lib/hierarchy/member-list';
import {
  extractBoothNumber,
  getBoothGeoUnits,
} from '@/lib/hierarchy/booth-geo-units';
import type { LeadershipEntry } from './leadership-section';
import {
  EMPTY_CANVAS_DATA,
  type HierarchyCanvasData,
} from '@/lib/hierarchy/canvas-data';
import { getMemberDisplayName } from '@/lib/hierarchy/geo-attribution';
import {
  buildBoothSearchOptions,
  resolveHierarchyGeoNavigation,
} from '@/lib/hierarchy/geo-search-navigation';
import { useTranslations } from '@/hooks/use-translations';

const DEFAULT_CONSTITUENCY_ID = '172';
const CONSTITUENCY_TITLE = 'NCP 172 Anushakti Nagar';

const FILTER_URL_KEYS = [
  'search',
  'vertical',
  'position',
  'ward',
  'booth',
  'member',
  'view',
  'voterId',
] as const;

function formatWardLabel(wardName: string): string {
  const wardNumber = extractWardNumber(wardName);
  return wardNumber !== Number.MAX_SAFE_INTEGER ? String(wardNumber) : wardName;
}

interface HierarchyModuleProps {
  canEdit: boolean;
  isAdmin: boolean;
}

export function HierarchyModule({ canEdit, isAdmin }: HierarchyModuleProps) {
  const { t } = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, startSearchTransition] = useTransition();

  const [config, setConfig] = useState<CadreConfig | null>(null);
  const [referenceCounts, setReferenceCounts] =
    useState<CadreConfigReferenceCounts | null>(null);
  const [membersTotal, setMembersTotal] = useState(0);
  const [pagedListMembers, setPagedListMembers] = useState<CadreMemberCard[]>([]);
  const [pagedListPagination, setPagedListPagination] = useState({
    total: 0,
    totalPages: 1,
    page: 1,
  });
  const [talukaLeadership, setTalukaLeadership] = useState<LeadershipEntry[]>([]);
  const [wardSummaries, setWardSummaries] = useState<WardSummary[]>([]);
  const [scopedMembers, setScopedMembers] = useState<CadreMemberCard[]>([]);
  const [canvasData, setCanvasData] = useState<HierarchyCanvasData>(EMPTY_CANVAS_DATA);
  const [defaultElectionId, setDefaultElectionId] = useState('');
  const [loading, setLoading] = useState(true);
  const [scopeLoading, setScopeLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchDraft, setSearchDraft] = useState('');
  const [isSearchPending, setIsSearchPending] = useState(false);
  const pendingSearchRef = useRef<string | null>(null);

  const [editorTarget, setEditorTarget] = useState<MemberEditorTarget | null>(null);
  const [configOpen, setConfigOpen] = useState(false);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const searchQuery = searchParams.get(HIERARCHY_URL_PARAMS.search) ?? '';
  const verticalId = searchParams.get(HIERARCHY_URL_PARAMS.vertical) ?? '';
  const positionId = searchParams.get(HIERARCHY_URL_PARAMS.position) ?? '';
  const wardGeoId = searchParams.get(HIERARCHY_URL_PARAMS.ward) ?? '';
  const boothNo = searchParams.get(HIERARCHY_URL_PARAMS.booth) ?? '';
  const focusMemberId = searchParams.get(HIERARCHY_URL_PARAMS.member) ?? '';
  const voterIdFilter = parseVoterIdFilterParam(
    searchParams.get(HIERARCHY_URL_PARAMS.voterId),
  );
  const pageFromUrl = parseMemberPageParam(searchParams.get(HIERARCHY_URL_PARAMS.page));
  const pageSize = parseMemberPageSizeParam(searchParams.get(HIERARCHY_URL_PARAMS.pageSize));
  const viewMode = searchParams.get(HIERARCHY_URL_PARAMS.view) ?? '';
  const returnToParam = searchParams.get(HIERARCHY_URL_PARAMS.returnTo) ?? '';

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
      voterId?: string;
      page?: number;
      pageSize?: number;
      view?: string;
    }) => {
      const clearsMemberFocus =
        !('member' in updates) &&
        FILTER_URL_KEYS.some((key) => key !== 'member' && key in updates);

      const next = {
        search: updates.search ?? searchQuery,
        vertical: updates.vertical ?? verticalId,
        position: updates.position ?? positionId,
        ward: updates.ward ?? wardGeoId,
        booth: updates.booth ?? boothNo,
        member: clearsMemberFocus ? '' : (updates.member ?? focusMemberId),
        voterId: 'voterId' in updates ? (updates.voterId ?? '') : voterIdFilter,
        view: 'view' in updates ? (updates.view ?? '') : viewMode,
      };
      const nextPage = updates.page !== undefined
        ? updates.page
        : clearsMemberFocus || 'search' in updates || 'voterId' in updates
          ? 1
          : pageFromUrl;
      const nextPageSize = updates.pageSize ?? pageSize;

      const params = new URLSearchParams();
      if (next.search.trim()) params.set(HIERARCHY_URL_PARAMS.search, next.search.trim());
      if (next.vertical.trim()) params.set(HIERARCHY_URL_PARAMS.vertical, next.vertical.trim());
      if (next.position.trim()) params.set(HIERARCHY_URL_PARAMS.position, next.position.trim());
      if (next.ward.trim()) params.set(HIERARCHY_URL_PARAMS.ward, next.ward.trim());
      if (next.booth.trim()) params.set(HIERARCHY_URL_PARAMS.booth, next.booth.trim());
      if (next.member.trim()) params.set(HIERARCHY_URL_PARAMS.member, next.member.trim());
      if (next.voterId.trim()) params.set(HIERARCHY_URL_PARAMS.voterId, next.voterId.trim());
      if (next.view.trim()) params.set(HIERARCHY_URL_PARAMS.view, next.view.trim());
      if (nextPage > 1) params.set(HIERARCHY_URL_PARAMS.page, String(nextPage));
      if (nextPageSize !== parseMemberPageSizeParam(null)) {
        params.set(HIERARCHY_URL_PARAMS.pageSize, String(nextPageSize));
      }
      if (returnToParam.trim()) {
        params.set(HIERARCHY_URL_PARAMS.returnTo, returnToParam.trim());
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [
      router,
      pathname,
      searchQuery,
      verticalId,
      positionId,
      wardGeoId,
      boothNo,
      focusMemberId,
      voterIdFilter,
      viewMode,
      pageFromUrl,
      pageSize,
      returnToParam,
    ],
  );

  const loadConfig = useCallback(async () => {
    const res = await fetch('/api/hierarchy/config');
    const data = await res.json();
    if (data.config) {
      setConfig(data.config);
      setReferenceCounts(data.referenceCounts ?? null);
    }
  }, []);

  const loadInitial = useCallback(async (signal?: AbortSignal) => {
    const bootstrapParams = new URLSearchParams({
      constituencyId: DEFAULT_CONSTITUENCY_ID,
      configOnly: 'true',
    });

    const [bootstrapRes, leadershipRes] = await Promise.all([
      fetch(`/api/hierarchy/bootstrap?${bootstrapParams}`, { signal }),
      fetch(
        `/api/hierarchy/taluka-leadership?constituencyId=${DEFAULT_CONSTITUENCY_ID}`,
        { signal },
      ),
    ]);

    if (!bootstrapRes.ok) {
      throw new Error(`Failed to load hierarchy (${bootstrapRes.status})`);
    }
    if (!leadershipRes.ok) {
      throw new Error(`Failed to load taluka leadership (${leadershipRes.status})`);
    }

    const bootstrap = (await bootstrapRes.json()) as {
      config?: CadreConfig;
      defaultElectionId?: string;
      membersTotal?: number;
    };
    const leadership = (await leadershipRes.json()) as {
      entries?: { verticalId: string; head: CadreMemberCard | null }[];
      wardSummaries?: WardSummary[];
    };

    if (signal?.aborted) return;

    if (bootstrap.config) setConfig(bootstrap.config);
    setDefaultElectionId(bootstrap.defaultElectionId ?? '');
    setMembersTotal(bootstrap.membersTotal ?? 0);

    const verticals = (bootstrap.config?.verticals ?? []).filter((v) => v.isActive);
    const verticalById = new Map(verticals.map((v) => [v.id, v]));
    setTalukaLeadership(
      (leadership.entries ?? [])
        .map((entry) => {
          const vertical = verticalById.get(entry.verticalId);
          if (!vertical) return null;
          return {
            verticalId: entry.verticalId,
            verticalName: vertical.name,
            head: entry.head,
          };
        })
        .filter((entry): entry is LeadershipEntry => entry !== null)
        .sort(
          (a, b) =>
            (verticalById.get(a.verticalId)?.sortOrder ?? 0) -
            (verticalById.get(b.verticalId)?.sortOrder ?? 0),
        ),
    );
    setWardSummaries(leadership.wardSummaries ?? []);
  }, []);

  const loadMemberPage = useCallback(
    async (signal?: AbortSignal) => {
      const params = new URLSearchParams({
        constituencyId: DEFAULT_CONSTITUENCY_ID,
        page: String(pageFromUrl),
        pageSize: String(pageSize),
      });
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      if (verticalId.trim()) params.set('verticalId', verticalId.trim());
      if (focusMemberId.trim()) params.set('memberId', focusMemberId.trim());
      if (voterIdFilter) params.set('voterId', voterIdFilter);

      const res = await fetch(`/api/hierarchy/members?${params}`, { signal });
      if (!res.ok) {
        throw new Error(`Failed to load members (${res.status})`);
      }
      const data = (await res.json()) as {
        members?: CadreMemberCard[];
        pagination?: {
          page: number;
          pageSize: number;
          total: number;
          totalPages: number;
        };
      };
      if (signal?.aborted) return;

      setPagedListMembers(data.members ?? []);
      setPagedListPagination({
        total: data.pagination?.total ?? 0,
        totalPages: data.pagination?.totalPages ?? 1,
        page: data.pagination?.page ?? pageFromUrl,
      });
    },
    [pageFromUrl, pageSize, searchQuery, verticalId, focusMemberId, voterIdFilter],
  );

  const loadScopedMembers = useCallback(
    async (
      scope:
        | { type: 'ward'; wardGeoId: string }
        | {
            type: 'committee';
            committeeLevel: 'taluka_committee' | 'ward_committee' | 'booth_committee';
            verticalId: string;
            wardGeoId?: string;
            boothNo?: string;
          },
      signal?: AbortSignal,
    ) => {
      const params = new URLSearchParams({
        constituencyId: DEFAULT_CONSTITUENCY_ID,
      });

      if (scope.type === 'ward') {
        params.set('scope', 'ward');
        params.set('wardGeoId', scope.wardGeoId);
      } else {
        params.set('scope', scope.committeeLevel);
        params.set('verticalId', scope.verticalId);
        if (scope.wardGeoId) params.set('wardGeoId', scope.wardGeoId);
        if (scope.boothNo) params.set('boothNo', scope.boothNo);
      }

      const res = await fetch(`/api/hierarchy/scoped-members?${params}`, { signal });
      if (!res.ok) {
        throw new Error(`Failed to load members (${res.status})`);
      }
      const data = (await res.json()) as { members?: CadreMemberCard[] };
      if (signal?.aborted) return;
      setScopedMembers(data.members ?? []);
    },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        await loadInitial(controller.signal);
      } catch (err) {
        if (!controller.signal.aborted) {
          setLoadError(
            err instanceof Error ? err.message : t('hierarchyModule.loadHierarchyFailed'),
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [loadInitial]);

  const wardOptions = useMemo(
    () =>
      (config?.geoUnits ?? [])
        .filter((g) => g.type === 'ward' && g.isActive)
        .sort((a, b) => extractWardNumber(a.name) - extractWardNumber(b.name)),
    [config?.geoUnits],
  );

  const commitSearch = useCallback(() => {
    const trimmed = searchDraft.trim();
    if (!trimmed) {
      if (searchQuery.trim()) {
        pendingSearchRef.current = '';
        setIsSearchPending(true);
        startSearchTransition(() => {
          setUrlParams({ search: '' });
        });
      }
      return;
    }

    const geoTarget = resolveHierarchyGeoNavigation(trimmed, {
      wards: wardOptions,
      booths: buildBoothSearchOptions(
        config?.geoUnits ?? [],
        DEFAULT_CONSTITUENCY_ID,
      ),
      currentWardGeoId: wardGeoId || undefined,
    });

    if (geoTarget) {
      pendingSearchRef.current = null;
      setIsSearchPending(false);
      setSearchDraft('');
      if (geoTarget.type === 'ward') {
        setUrlParams({
          search: '',
          ward: geoTarget.wardGeoId,
          booth: '',
          member: '',
          position: '',
          view: '',
          page: 1,
        });
        scrollToTop();
      } else {
        setUrlParams({
          search: '',
          ward: geoTarget.wardGeoId,
          booth: geoTarget.boothNo,
          member: '',
          position: '',
          view: '',
          page: 1,
        });
        // WardPanel scrolls the matched booth section into view.
      }
      return;
    }

    if (trimmed === searchQuery.trim()) return;
    pendingSearchRef.current = trimmed;
    setIsSearchPending(true);
    startSearchTransition(() => {
      setUrlParams({ search: searchDraft });
    });
  }, [
    searchDraft,
    searchQuery,
    setUrlParams,
    startSearchTransition,
    wardOptions,
    config?.geoUnits,
    wardGeoId,
  ]);

  const wardGeoIds = useMemo(() => wardOptions.map((ward) => ward.id), [wardOptions]);

  const activeVerticals = useMemo(
    () => (config?.verticals ?? []).filter((v) => v.isActive),
    [config?.verticals],
  );

  const committeeVerticalId = verticalId.trim();
  const canvasVerticalId = committeeVerticalId || activeVerticals[0]?.id || '';
  const canvasVerticalName =
    activeVerticals.find((v) => v.id === canvasVerticalId)?.name ?? 'Basic';

  const loadCanvasData = useCallback(
    async (nextVerticalId: string, signal?: AbortSignal) => {
      const params = new URLSearchParams({
        constituencyId: DEFAULT_CONSTITUENCY_ID,
        verticalId: nextVerticalId,
        includeCanvas: '1',
      });
      for (const wardId of wardGeoIds) {
        params.append('wardGeoId', wardId);
      }

      const res = await fetch(`/api/hierarchy/leaders?${params}`, { signal });
      if (!res.ok) {
        throw new Error(`Failed to load canvas (${res.status})`);
      }
      const data = (await res.json()) as { canvas?: HierarchyCanvasData };
      if (signal?.aborted) return;
      setCanvasData(data.canvas ?? EMPTY_CANVAS_DATA);
    },
    [wardGeoIds],
  );

  const ensureReferenceCounts = useCallback(async () => {
    if (referenceCounts) return;
    await loadConfig();
  }, [referenceCounts, loadConfig]);

  const showCanvas = viewMode === HIERARCHY_VIEWS.canvas;
  const hierarchyDisplayMode = showCanvas ? 'canvas' : 'list';
  const showWardPanel = Boolean(wardGeoId);
  const showOverview =
    !showCanvas &&
    !wardGeoId &&
    viewMode !== HIERARCHY_VIEWS.talukaCommittee &&
    viewMode !== HIERARCHY_VIEWS.allMembers;
  const showAllMembers = viewMode === HIERARCHY_VIEWS.allMembers;
  const showTalukaCommittee = viewMode === HIERARCHY_VIEWS.talukaCommittee;
  const showWardCommittee = showWardPanel && viewMode === HIERARCHY_VIEWS.wardCommittee;
  const showBoothCommittee = showWardPanel && viewMode === HIERARCHY_VIEWS.boothCommittee;
  const showWardPanelMain =
    showWardPanel && !showWardCommittee && !showBoothCommittee && !showCanvas;
  const isGlobalSearch = Boolean(searchQuery.trim());

  const refresh = useCallback(async () => {
    setLoadError(null);
    setPagedListMembers([]);
    try {
      await loadInitial();
      if (showCanvas && canvasVerticalId) {
        await loadCanvasData(canvasVerticalId);
      } else if (showAllMembers || isGlobalSearch) {
        await loadMemberPage();
      } else if (showTalukaCommittee && committeeVerticalId) {
        await loadScopedMembers({
          type: 'committee',
          committeeLevel: 'taluka_committee',
          verticalId: committeeVerticalId,
        });
      } else if (showWardCommittee && committeeVerticalId && wardGeoId) {
        await loadScopedMembers({
          type: 'committee',
          committeeLevel: 'ward_committee',
          verticalId: committeeVerticalId,
          wardGeoId,
        });
      } else if (showBoothCommittee && committeeVerticalId && wardGeoId && boothNo) {
        await loadScopedMembers({
          type: 'committee',
          committeeLevel: 'booth_committee',
          verticalId: committeeVerticalId,
          wardGeoId,
          boothNo,
        });
      } else if (showWardPanelMain && wardGeoId) {
        await loadScopedMembers({ type: 'ward', wardGeoId });
      }
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : t('hierarchyModule.refreshHierarchyFailed'),
      );
    }
  }, [
    loadInitial,
    loadMemberPage,
    loadScopedMembers,
    loadCanvasData,
    showCanvas,
    canvasVerticalId,
    showAllMembers,
    isGlobalSearch,
    showTalukaCommittee,
    committeeVerticalId,
    showWardCommittee,
    wardGeoId,
    showBoothCommittee,
    boothNo,
    showWardPanelMain,
    t,
  ]);

  useEffect(() => {
    if (loading) return;

    const controller = new AbortController();
    (async () => {
      setScopeLoading(true);
      setLoadError(null);
      try {
        if (showCanvas && canvasVerticalId) {
          await loadCanvasData(canvasVerticalId, controller.signal);
          return;
        }

        if (showAllMembers || isGlobalSearch) {
          await loadMemberPage(controller.signal);
          return;
        }

        if (showTalukaCommittee && committeeVerticalId) {
          await loadScopedMembers(
            {
              type: 'committee',
              committeeLevel: 'taluka_committee',
              verticalId: committeeVerticalId,
            },
            controller.signal,
          );
          return;
        }

        if (showWardCommittee && committeeVerticalId && wardGeoId) {
          await loadScopedMembers(
            {
              type: 'committee',
              committeeLevel: 'ward_committee',
              verticalId: committeeVerticalId,
              wardGeoId,
            },
            controller.signal,
          );
          return;
        }

        if (showBoothCommittee && committeeVerticalId && wardGeoId && boothNo) {
          await loadScopedMembers(
            {
              type: 'committee',
              committeeLevel: 'booth_committee',
              verticalId: committeeVerticalId,
              wardGeoId,
              boothNo,
            },
            controller.signal,
          );
          return;
        }

        if (showWardPanelMain && wardGeoId) {
          await loadScopedMembers({ type: 'ward', wardGeoId }, controller.signal);
          return;
        }

        setScopedMembers([]);
      } catch (err) {
        if (!controller.signal.aborted) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load members');
        }
      } finally {
        if (!controller.signal.aborted) setScopeLoading(false);
      }
    })();

    return () => controller.abort();
  }, [
    loading,
    showCanvas,
    canvasVerticalId,
    showAllMembers,
    isGlobalSearch,
    showTalukaCommittee,
    committeeVerticalId,
    showWardCommittee,
    wardGeoId,
    showBoothCommittee,
    boothNo,
    showWardPanelMain,
    pageFromUrl,
    pageSize,
    focusMemberId,
    loadMemberPage,
    loadScopedMembers,
    loadCanvasData,
  ]);

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
    if (showTalukaCommittee || showWardCommittee || showBoothCommittee) {
      return sortMembers(
        filterMembers(scopedMembers, {
          search: searchQuery,
          memberId: focusMemberId,
          voterId: voterIdFilter,
        }),
      );
    }

    return sortMembers(
      filterMembers(scopedMembers, {
        search: searchQuery,
        positionId,
        wardGeoId,
        boothNo,
        memberId: focusMemberId,
        voterId: voterIdFilter,
      }),
    );
  }, [
    scopedMembers,
    searchQuery,
    positionId,
    wardGeoId,
    boothNo,
    focusMemberId,
    voterIdFilter,
    showTalukaCommittee,
    showWardCommittee,
    showBoothCommittee,
  ]);

  const usesServerMemberPagination = isGlobalSearch || showAllMembers;

  const memberPagination = useMemo(() => {
    if (usesServerMemberPagination) {
      return {
        items: pagedListMembers,
        totalPages: pagedListPagination.totalPages,
        currentPage: pageFromUrl,
        totalItems: pagedListPagination.total,
      };
    }

    return paginateMembers(visibleMembers, pageFromUrl, pageSize);
  }, [
    usesServerMemberPagination,
    pagedListMembers,
    pagedListPagination.totalPages,
    pagedListPagination.total,
    visibleMembers,
    pageFromUrl,
    pageSize,
  ]);

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
    if (usesServerMemberPagination) {
      if (!scopeLoading && pagedListPagination.page !== pageFromUrl) {
        setUrlParams({ page: pagedListPagination.page });
      }
      return;
    }
    if (pageFromUrl !== memberPagination.currentPage) {
      setUrlParams({ page: memberPagination.currentPage });
    }
  }, [
    usesServerMemberPagination,
    scopeLoading,
    pagedListPagination.page,
    pageFromUrl,
    memberPagination.currentPage,
    setUrlParams,
  ]);

  const handleMemberPageChange = useCallback(
    (page: number) => {
      setUrlParams({ page });
      scrollToTop();
    },
    [setUrlParams],
  );

  const handleMemberPageSizeChange = useCallback(
    (size: number) => {
      setUrlParams({ pageSize: size, page: 1 });
      scrollToTop();
    },
    [setUrlParams],
  );

  const wardSummariesById = useMemo(
    () => new Map(wardSummaries.map((summary) => [summary.wardGeoId, summary])),
    [wardSummaries],
  );

  const wardAccessEntries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return wardOptions
      .map((ward) => {
        const summary = wardSummariesById.get(ward.id);
        const boothCount =
          summary?.boothCount ??
          getBoothGeoUnits(config?.geoUnits ?? [], DEFAULT_CONSTITUENCY_ID, ward.id).length;

        return {
          wardGeoId: ward.id,
          wardLabel: formatWardLabel(ward.name),
          boothCount,
          wingsAssigned: summary?.wingsAssigned ?? 0,
          wingsTotal: summary?.wingsTotal ?? activeVerticals.length,
          primaryHead: summary?.primaryHead ?? null,
          wardName: ward.name,
          headNames: (summary?.allHeads ?? []).map((head) => getMemberDisplayName(head)),
        };
      })
      .filter((entry) => {
        if (!query) return true;
        if (entry.wardName.toLowerCase().includes(query)) return true;
        if (entry.wardLabel.toLowerCase().includes(query)) return true;
        return entry.headNames.some((name) => name.toLowerCase().includes(query));
      });
  }, [
    wardOptions,
    wardSummariesById,
    searchQuery,
    config?.geoUnits,
    activeVerticals.length,
  ]);

  const clearSearch = useCallback(() => {
    setSearchDraft('');
    setUrlParams({ search: '' });
  }, [setUrlParams]);

  const hasSearch = Boolean(searchDraft.trim() || searchQuery.trim());

  const openCreateMember = () => {
    setEditorTarget({ mode: 'create' });
  };

  const handleEdit = (member: CadreMemberCard) => {
    setEditorTarget({ mode: 'edit', member });
  };

  const openCanvasView = () => {
    setUrlParams({ view: HIERARCHY_VIEWS.canvas });
  };

  const openListView = () => {
    setUrlParams({ view: '' });
  };

  const openWardPanel = (wardId: string) => {
    setUrlParams({
      ward: wardId,
      booth: '',
      member: '',
      position: '',
      view: '',
      page: 1,
    });
    scrollToTop();
  };

  const openTalukaCommittee = (nextVerticalId: string) => {
    setUrlParams({
      vertical: nextVerticalId,
      view: HIERARCHY_VIEWS.talukaCommittee,
      ward: '',
      booth: '',
      member: '',
      position: '',
      page: 1,
    });
    scrollToTop();
  };

  const backToOverview = () => {
    setUrlParams({
      ward: '',
      booth: '',
      member: '',
      position: '',
      vertical: '',
      view: '',
      page: 1,
    });
    scrollToTop();
  };

  const backToConstituency = () => {
    const returnTo = returnToParam.trim();
    const isSafeInternalPath =
      returnTo.startsWith('/') &&
      !returnTo.startsWith('//') &&
      !returnTo.startsWith('/modules/hierarchy');
    if (isSafeInternalPath) {
      router.push(returnTo);
      return;
    }
    backToOverview();
  };

  const backToWardPanel = () => {
    setUrlParams({
      booth: '',
      member: '',
      position: '',
      view: '',
      page: 1,
    });
    scrollToTop();
  };

  const openViewWardCommittee = (nextVerticalId: string) => {
    setUrlParams({
      vertical: nextVerticalId,
      view: HIERARCHY_VIEWS.wardCommittee,
      booth: '',
      member: '',
      position: '',
      page: 1,
    });
    scrollToTop();
  };

  const openViewBoothCommittee = (booth: string, nextVerticalId: string) => {
    setUrlParams({
      vertical: nextVerticalId,
      booth,
      view: HIERARCHY_VIEWS.boothCommittee,
      member: '',
      position: '',
      page: 1,
    });
    scrollToTop();
  };

  const openAddBoothCommitteeMember = (booth: string) => {
    setUrlParams({ booth });
    setEditorTarget({ mode: 'create' });
  };

  const selectedWardName = wardOptions.find((w) => w.id === wardGeoId)?.name ?? 'Ward';
  const selectedWardLabel = formatWardLabel(selectedWardName);
  const isContentLoading = loading || scopeLoading;
  const vacantLabel = t('hierarchyModule.vacantPosition');
  const viewCommitteeLabel = t('hierarchyModule.viewCommitteeLink');
  const showCommitteeList = showTalukaCommittee || showWardCommittee || showBoothCommittee;
  const usesCompactMemberList = showCommitteeList || isGlobalSearch || showAllMembers;
  const memberListCompactDetail = isGlobalSearch || showAllMembers;
  const committeeSectionTitle = showBoothCommittee
    ? t('hierarchyModule.boothCommitteeTitle', { booth: boothNo })
    : showWardCommittee
      ? t('hierarchyModule.wardCommitteeTitle', { ward: selectedWardName })
      : showTalukaCommittee
        ? t('hierarchyModule.talukaCommitteeTitle')
        : undefined;
  const memberListSectionTitle = showCommitteeList
    ? committeeSectionTitle
    : isGlobalSearch
      ? t('hierarchyModule.globalSearchTitle', { query: searchQuery.trim() })
      : showAllMembers
        ? t('hierarchyModule.allMembersTitle')
        : undefined;

  const verticalSelect = showCanvas ? (
    <div className="space-y-1.5">
      <Label htmlFor="hierarchy-vertical-select" className="text-xs text-muted-foreground">
        {t('hierarchyModule.canvasVerticalLabel')}
      </Label>
      <Select
        value={canvasVerticalId}
        onValueChange={(v) => setUrlParams({ vertical: v })}
      >
        <SelectTrigger id="hierarchy-vertical-select" className="h-11 w-full rounded-xl">
          <SelectValue placeholder={t('hierarchyModule.selectVertical')} />
        </SelectTrigger>
        <SelectContent>
          {activeVerticals.map((v) => (
            <SelectItem key={v.id} value={v.id}>
              {v.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  ) : null;

  const memberListBlock = (
    <MemberList
      members={memberPagination.items}
      canEdit={canEdit}
      onEdit={canEdit ? handleEdit : undefined}
      onVoterIdUpdated={canEdit ? () => { void refresh(); } : undefined}
      variant={usesCompactMemberList ? 'compact' : 'default'}
      compactDetail={memberListCompactDetail}
      sectionTitle={memberListSectionTitle}
      pagination={{
        currentPage: memberPagination.currentPage,
        totalPages: memberPagination.totalPages,
        pageSize,
        totalItems: memberPagination.totalItems,
        onPageChange: handleMemberPageChange,
        onPageSizeChange: handleMemberPageSizeChange,
      }}
      emptyMessage={
        isGlobalSearch
          ? t('hierarchyModule.noSearchResults')
          : t('hierarchyModule.noMembersFiltered')
      }
      emptyHint={
        isGlobalSearch ? t('hierarchyModule.noSearchResultsHint') : undefined
      }
    />
  );

  return (
    <div className="relative flex flex-col gap-2 sm:gap-3">
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
              <span className="hidden sm:inline">{t('hierarchyModule.addMember')}</span>
              <span className="sr-only sm:hidden">{t('hierarchyModule.addMember')}</span>
            </Button>
          )}
          {isAdmin && (
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl"
              aria-label={t('hierarchyModule.configurationAria')}
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

      {!loading && !loadError && (
        <Tabs
          value={hierarchyDisplayMode}
          onValueChange={(value) => {
            if (value === 'canvas') openCanvasView();
            else openListView();
          }}
          className="shrink-0"
        >
          <TabsList className="h-10 w-full rounded-xl sm:w-auto">
            <TabsTrigger value="list" className="flex-1 rounded-lg sm:flex-none">
              {t('hierarchyModule.listViewTab')}
            </TabsTrigger>
            <TabsTrigger value="canvas" className="flex-1 rounded-lg sm:flex-none">
              {t('hierarchyModule.canvasViewTab')}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {!showCanvas && (
        <div className="shrink-0 space-y-2">
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
                placeholder={
                  showWardPanelMain || isGlobalSearch
                    ? t('hierarchyModule.searchPlaceholder')
                    : t('hierarchyModule.wardSearchPlaceholder')
                }
              />
              {hasSearch && (
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={t('hierarchyModule.clearSearchAria')}
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
              aria-label={
                isSearching
                  ? t('hierarchyModule.searchingAria')
                  : t('hierarchyModule.searchAction')
              }
            >
              {isSearching ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Search className="size-4" />
              )}
              <span className="hidden sm:inline">
                {isSearching
                  ? t('hierarchyModule.searching')
                  : t('hierarchyModule.searchAction')}
              </span>
            </Button>
          </div>
          {(showCommitteeList || isGlobalSearch || showAllMembers) && (
            <div className="space-y-1.5">
              <Label
                htmlFor="hierarchy-voter-id-filter"
                className="text-xs text-muted-foreground"
              >
                {t('hierarchyModule.voterIdFilterLabel')}
              </Label>
              <Select
                value={voterIdFilter || 'all'}
                onValueChange={(value) =>
                  setUrlParams({
                    voterId: value === 'all' ? '' : value,
                  })
                }
              >
                <SelectTrigger
                  id="hierarchy-voter-id-filter"
                  className="h-10 w-full rounded-xl sm:w-56"
                >
                  <SelectValue placeholder={t('hierarchyModule.voterIdFilterAll')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t('hierarchyModule.voterIdFilterAll')}
                  </SelectItem>
                  <SelectItem value={VOTER_ID_FILTERS.linked}>
                    {t('hierarchyModule.voterIdFilterLinked')}
                  </SelectItem>
                  <SelectItem value={VOTER_ID_FILTERS.missing}>
                    {t('hierarchyModule.voterIdFilterMissing')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {!isGlobalSearch && !showOverview && !showCanvas && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-fit shrink-0 gap-1.5 text-muted-foreground hover:text-foreground"
          onClick={
            showWardPanel && (showWardCommittee || showBoothCommittee)
              ? backToWardPanel
              : showWardPanel
                ? backToOverview
                : backToConstituency
          }
        >
          <ArrowLeft className="size-4" />
          {showWardPanel && (showWardCommittee || showBoothCommittee)
            ? t('hierarchyModule.backToWardPanel')
            : showWardPanel
              ? t('hierarchyModule.backToAllWards')
              : t('hierarchyModule.backToConstituency')}
        </Button>
      )}

      <div className="flex flex-col gap-3">
        {isContentLoading ? (
          <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 py-12">
            <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">
              {t('hierarchyModule.loadingHierarchy')}
            </p>
          </div>
        ) : loadError ? (
          <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-destructive/40 bg-destructive/5 px-4 py-12 text-center">
            <p className="text-sm text-destructive">{loadError}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                void refresh();
              }}
            >
              {t('hierarchyModule.retry')}
            </Button>
          </div>
        ) : showCanvas ? (
          <>
            {verticalSelect}
            <HierarchyCanvasView
              canvasData={canvasData}
              verticalName={canvasVerticalName}
              verticalId={canvasVerticalId}
              wardOptions={wardOptions}
            />
          </>
        ) : isGlobalSearch ? (
          memberListBlock
        ) : showOverview ? (
          <div className="flex flex-col gap-3">
            <LeadershipSection
              title={t('hierarchyModule.talukaLeadershipTitle')}
              entries={talukaLeadership}
              vacantLabel={vacantLabel}
              viewCommitteeLabel={viewCommitteeLabel}
              onViewCommittee={openTalukaCommittee}
              canEdit={canEdit}
              onVoterIdUpdated={canEdit ? () => { void refresh(); } : undefined}
            />

            {wardAccessEntries.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
                {t('hierarchyModule.noWardsMatch')}
              </div>
            ) : (
              <WardAccessSection
                entries={wardAccessEntries}
                vacantLabel={vacantLabel}
                onOpenWard={openWardPanel}
              />
            )}
          </div>
        ) : showAllMembers ? (
          memberListBlock
        ) : showWardPanelMain ? (
          <WardPanel
            wardGeoId={wardGeoId}
            wardLabel={selectedWardLabel}
            members={scopedMembers}
            activeVerticals={activeVerticals}
            boothNumbers={boothOptions}
            canEdit={canEdit}
            initialExpandedBooth={boothNo || undefined}
            onViewWardCommittee={openViewWardCommittee}
            onViewBoothCommittee={openViewBoothCommittee}
            onAddBoothCommitteeMember={openAddBoothCommitteeMember}
            onVoterIdUpdated={canEdit ? () => { void refresh(); } : undefined}
          />
        ) : (
          <div className="flex flex-col gap-3">{memberListBlock}</div>
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
          onSaved={() => {
            void refresh();
          }}
        />
      )}

      {config && (
        <Sheet open={configOpen} onOpenChange={setConfigOpen}>
          <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-3xl">
            <SheetHeader>
              <SheetTitle>{t('hierarchyModule.hierarchyConfigTitle')}</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <HierarchyConfigAdmin
                config={config}
                referenceCounts={referenceCounts}
                onRefresh={loadConfig}
                onMembersRefresh={() => {
                  void refresh();
                }}
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
