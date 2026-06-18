'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Search, Settings, SlidersHorizontal, X } from 'lucide-react';
import { ModulePageHeader } from '@/components/module-page-header';
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
import { MemberList } from './member-list';
import { MemberEditor, type MemberEditorTarget } from './member-editor';
import { HierarchyConfigAdmin } from './hierarchy-config-admin';
import type {
  CadreConfig,
  CadreConfigReferenceCounts,
  CadreMemberCard,
} from '@/lib/hierarchy/types';
import { getMemberDisplayName } from '@/lib/hierarchy/geo-attribution';
import {
  DEFAULT_MEMBER_PAGE_SIZE,
  HIERARCHY_URL_PARAMS,
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

const FILTER_URL_KEYS = ['search', 'vertical', 'position', 'ward', 'booth', 'member'] as const;

interface HierarchyModuleProps {
  canEdit: boolean;
  isAdmin: boolean;
}

export function HierarchyModule({ canEdit, isAdmin }: HierarchyModuleProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [config, setConfig] = useState<CadreConfig | null>(null);
  const [referenceCounts, setReferenceCounts] =
    useState<CadreConfigReferenceCounts | null>(null);
  const [members, setMembers] = useState<CadreMemberCard[]>([]);
  const [defaultElectionId, setDefaultElectionId] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchDraft, setSearchDraft] = useState('');

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

  useEffect(() => {
    setSearchDraft(searchQuery);
  }, [searchQuery]);

  const setUrlParams = useCallback(
    (updates: {
      search?: string;
      vertical?: string;
      position?: string;
      ward?: string;
      booth?: string;
      member?: string;
      page?: number;
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
      if (nextPage > 1) params.set(HIERARCHY_URL_PARAMS.page, String(nextPage));
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : '?', { scroll: false });
    },
    [router, searchQuery, verticalId, positionId, wardGeoId, boothNo, focusMemberId, pageFromUrl],
  );

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

  const visibleMembers = useMemo(
    () =>
      sortMembers(
        filterMembers(members, {
          search: searchQuery,
          verticalId,
          positionId,
          wardGeoId,
          boothNo,
          memberId: focusMemberId,
        }),
      ),
    [members, searchQuery, verticalId, positionId, wardGeoId, boothNo, focusMemberId],
  );

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

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (verticalId) count += 1;
    if (positionId) count += 1;
    if (wardGeoId) count += 1;
    if (boothNo) count += 1;
    return count;
  }, [verticalId, positionId, wardGeoId, boothNo]);

  const commitSearch = () => setUrlParams({ search: searchDraft });

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

  const overlay = useMemo(() => {
    if (canEdit && editorTarget && config) {
      return (
        <MemberEditor
          target={editorTarget}
          config={config}
          constituencyId={DEFAULT_CONSTITUENCY_ID}
          electionId={defaultElectionId}
          onClose={() => setEditorTarget(null)}
          onSaved={refresh}
        />
      );
    }
    return null;
  }, [canEdit, editorTarget, config, defaultElectionId, refresh]);

  const verticalSelect = (
    <Select
      value={toOptionalSelectValue(verticalId)}
      onValueChange={(v) => setUrlParams({ vertical: fromOptionalSelectValue(v) })}
    >
      <SelectTrigger className="h-9 w-auto gap-1 rounded-full">
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

  const wardSelect = (
    <Select
      value={toOptionalSelectValue(wardGeoId)}
      onValueChange={(v) =>
        setUrlParams({ ward: fromOptionalSelectValue(v), booth: '' })
      }
    >
      <SelectTrigger className="h-9 w-auto gap-1 rounded-full">
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
      <SelectTrigger className="h-9 w-auto gap-1 rounded-full">
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

  return (
    <div className="relative flex h-full max-md:h-[calc(100dvh-9rem)] min-h-[400px] flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <ModulePageHeader title="MLA Hierarchy" />
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <Button size="sm" variant="outline" onClick={openCreateMember}>
              <Plus className="mr-1 size-4" /> Add member
            </Button>
          )}
          {isAdmin && (
            <Button
              size="sm"
              variant="outline"
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

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-11 w-full rounded-xl pl-9"
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitSearch();
          }}
          onBlur={commitSearch}
          placeholder="Search by name, position, or Voter ID..."
        />
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
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

      {activeFilterChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
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

      <div ref={listScrollRef} className="min-h-0 flex-1">
        {loading ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted/20">
            <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Loading hierarchy…</p>
          </div>
        ) : loadError ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-destructive/40 bg-destructive/5 px-4 text-center">
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
        ) : (
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
        )}
      </div>

      {overlay && (
        <div className="absolute inset-x-2 bottom-2 z-20 max-h-[min(80dvh,calc(100%-1rem))] overflow-hidden md:inset-x-auto md:bottom-3 md:right-3 md:top-3 md:max-h-[calc(100%-1.5rem)] md:max-w-[min(24rem,calc(100%-1.5rem))]">
          {overlay}
        </div>
      )}

      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-xl">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <div className="mt-4 flex flex-col gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Vertical</Label>
              {verticalSelect}
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
                  <SelectTrigger className="h-9">
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
