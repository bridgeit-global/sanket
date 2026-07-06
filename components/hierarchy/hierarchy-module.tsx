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
import { ContactWithCall } from './contact-with-call';
import { WhatsAppMessagePanel } from './whatsapp-message-panel';
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
import { getMemberWhatsAppForContext } from '@/lib/hierarchy/contact-channels';
import {
  DEFAULT_MEMBER_PAGE_SIZE,
  filterWardCommitteeMembers,
  filterBoothCommitteeMembers,
  HIERARCHY_URL_PARAMS,
  HIERARCHY_VIEWS,
  extractWardNumber,
  filterMembers,
  filterMembersGlobalSearch,
  memberNameMatchesSearch,
  paginateMembers,
  parseMemberPageParam,
  parseMemberPageSizeParam,
  sortMembers,
} from '@/lib/hierarchy/member-list';
import {
  extractBoothNumber,
  getBoothGeoUnits,
} from '@/lib/hierarchy/booth-geo-units';
import { useTranslations } from '@/hooks/use-translations';
import {
  findSeniorMemberForGeo,
  type GeoBreadcrumbTarget,
} from '@/lib/hierarchy/geo-navigation';

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
  const { t } = useTranslations();
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

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const searchQuery = searchParams.get(HIERARCHY_URL_PARAMS.search) ?? '';
  const verticalId = searchParams.get(HIERARCHY_URL_PARAMS.vertical) ?? '';
  const positionId = searchParams.get(HIERARCHY_URL_PARAMS.position) ?? '';
  const wardGeoId = searchParams.get(HIERARCHY_URL_PARAMS.ward) ?? '';
  const boothNo = searchParams.get(HIERARCHY_URL_PARAMS.booth) ?? '';
  const focusMemberId = searchParams.get(HIERARCHY_URL_PARAMS.member) ?? '';
  const pageFromUrl = parseMemberPageParam(searchParams.get(HIERARCHY_URL_PARAMS.page));
  const pageSize = parseMemberPageSizeParam(searchParams.get(HIERARCHY_URL_PARAMS.pageSize));
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
      pageSize?: number;
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
      const nextPageSize = updates.pageSize ?? pageSize;
      const params = new URLSearchParams();
      if (next.search.trim()) params.set(HIERARCHY_URL_PARAMS.search, next.search.trim());
      if (next.vertical.trim()) params.set(HIERARCHY_URL_PARAMS.vertical, next.vertical.trim());
      if (next.position.trim()) params.set(HIERARCHY_URL_PARAMS.position, next.position.trim());
      if (next.ward.trim()) params.set(HIERARCHY_URL_PARAMS.ward, next.ward.trim());
      if (next.booth.trim()) params.set(HIERARCHY_URL_PARAMS.booth, next.booth.trim());
      if (next.member.trim()) params.set(HIERARCHY_URL_PARAMS.member, next.member.trim());
      if (next.view.trim()) params.set(HIERARCHY_URL_PARAMS.view, next.view.trim());
      if (nextPage > 1) params.set(HIERARCHY_URL_PARAMS.page, String(nextPage));
      if (nextPageSize !== DEFAULT_MEMBER_PAGE_SIZE) {
        params.set(HIERARCHY_URL_PARAMS.pageSize, String(nextPageSize));
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchQuery, verticalId, positionId, wardGeoId, boothNo, focusMemberId, pageFromUrl, pageSize, viewMode],
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

  const isGlobalSearch = Boolean(searchQuery.trim());

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
    if (isGlobalSearch) {
      return filterMembersGlobalSearch(members, searchQuery, focusMemberId);
    }

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
    isGlobalSearch,
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
        if (memberNameMatchesSearch(entry.headName, query)) return true;
        if ((entry.headPhone ?? '').replace(/\D/g, '').includes(query.replace(/\D/g, ''))) {
          return true;
        }
        return false;
      });
  }, [wardOptions, members, effectiveVerticalId, searchQuery]);

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

  const verticalSelect = (
    <div className="space-y-1.5">
      <Label htmlFor="hierarchy-vertical-select" className="text-xs text-muted-foreground">
        Vertical category
      </Label>
      <Select
        value={effectiveVerticalId}
        onValueChange={(v) => setUrlParams({ vertical: v })}
      >
        <SelectTrigger id="hierarchy-vertical-select" className="h-11 w-full rounded-xl">
          <SelectValue placeholder="Select vertical" />
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
    scrollToTop();
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
    scrollToTop();
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
    scrollToTop();
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

  const openViewWardCommittee = (verticalId: string) => {
    setUrlParams({
      vertical: verticalId,
      view: HIERARCHY_VIEWS.wardCommittee,
      booth: '',
      member: '',
      position: '',
      page: 1,
    });
    scrollToTop();
  };

  const openViewBoothCommittee = (booth: string) => {
    setUrlParams({
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

  const talukaAdhyakshName = talukaAdhyaksh ? getMemberDisplayName(talukaAdhyaksh) : '—';
  const talukaAdhyakshPhone = talukaAdhyaksh ? getMemberPhone(talukaAdhyaksh) : null;
  const talukaAdhyakshWhatsApp = talukaAdhyaksh
    ? getMemberWhatsAppForContext(talukaAdhyaksh, 'taluka_overview')
    : null;
  const selectedWardName =
    wardOptions.find((w) => w.id === wardGeoId)?.name ?? 'Ward';
  const selectedWardLabel = formatWardLabel(selectedWardName);

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
              placeholder={t('hierarchyModule.searchPlaceholder')}
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

      {!isGlobalSearch && !showWardPanelMain && <div className="shrink-0">{verticalSelect}</div>}

      {!isGlobalSearch && !showOverview && (
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

      <div className="flex flex-col gap-3">
        {loading ? (
          <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 py-12">
            <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Loading hierarchy…</p>
          </div>
        ) : loadError ? (
          <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-destructive/40 bg-destructive/5 px-4 py-12 text-center">
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
        ) : isGlobalSearch ? (
          <div className="flex flex-col gap-3">
            <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 dark:border-primary/50 dark:bg-primary/10">
              <p className="text-sm font-medium">
                {t('hierarchyModule.globalSearchTitle', { query: searchQuery.trim() })}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('hierarchyModule.globalSearchSubtitle', {
                  count: memberPagination.totalItems,
                })}
              </p>
            </div>
            <MemberList
              members={memberPagination.items}
              canEdit={canEdit}
              onEdit={canEdit ? handleEdit : undefined}
              pagination={{
                currentPage: memberPagination.currentPage,
                totalPages: memberPagination.totalPages,
                pageSize,
                totalItems: memberPagination.totalItems,
                onPageChange: handleMemberPageChange,
                onPageSizeChange: handleMemberPageSizeChange,
              }}
              emptyMessage={t('hierarchyModule.noSearchResults')}
              emptyHint={t('hierarchyModule.noSearchResultsHint')}
            />
          </div>
        ) : showOverview ? (
          <div className="flex flex-col gap-3">
            <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 dark:border-primary/50 dark:bg-primary/10">
              <p className="text-sm">
                Taluka Adhyaksh ({selectedVerticalName}): {talukaAdhyakshName}
              </p>
              <div className="mt-1">
                <ContactWithCall
                  phone={talukaAdhyakshPhone}
                  whatsapp={talukaAdhyakshWhatsApp}
                />
              </div>
              <button
                type="button"
                className="mt-2 text-xs font-semibold tracking-[0.08em] text-primary uppercase hover:underline"
                onClick={openTalukaCommittee}
              >
                View Taluka Committee
              </button>
              <WhatsAppMessagePanel
                memberId={talukaAdhyaksh?.id ?? null}
                whatsappPhone={talukaAdhyakshWhatsApp}
                canSend={canEdit}
              />
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
              canEdit={canEdit}
              onEdit={canEdit ? handleEdit : undefined}
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
