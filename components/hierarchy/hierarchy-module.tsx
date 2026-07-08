'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Plus, Search, Settings, X } from 'lucide-react';
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
import { HierarchyCanvasView } from './hierarchy-canvas-view';
import { MemberEditor, type MemberEditorTarget } from './member-editor';
import { HierarchyConfigAdmin } from './hierarchy-config-admin';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type {
  CadreConfig,
  CadreConfigReferenceCounts,
} from '@/lib/hierarchy/types';
import {
  getMemberDisplayName,
  getMemberPhone,
} from '@/lib/hierarchy/geo-attribution';
import {
  HIERARCHY_URL_PARAMS,
  HIERARCHY_VIEWS,
  extractWardNumber,
  memberNameMatchesSearch,
} from '@/lib/hierarchy/member-list';
import type { HierarchyLeaders } from '@/lib/hierarchy/leaders';
import { useTranslations } from '@/hooks/use-translations';

const DEFAULT_CONSTITUENCY_ID = '172';
const CONSTITUENCY_TITLE = 'NCP 172 Anushakti Nagar';

const EMPTY_LEADERS: HierarchyLeaders = {
  talukaAdhyaksh: null,
  wardHeads: [],
};

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
  const [leaders, setLeaders] = useState<HierarchyLeaders>(EMPTY_LEADERS);
  const [defaultElectionId, setDefaultElectionId] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingLeaders, setLoadingLeaders] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchDraft, setSearchDraft] = useState('');
  const [isSearchPending, setIsSearchPending] = useState(false);
  const pendingSearchRef = useRef<string | null>(null);

  const [editorTarget, setEditorTarget] = useState<MemberEditorTarget | null>(null);
  const [configOpen, setConfigOpen] = useState(false);

  const searchQuery = searchParams.get(HIERARCHY_URL_PARAMS.search) ?? '';
  const verticalId = searchParams.get(HIERARCHY_URL_PARAMS.vertical) ?? '';
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
    (updates: { search?: string; vertical?: string; view?: string }) => {
      const next = {
        search: updates.search ?? searchQuery,
        vertical: updates.vertical ?? verticalId,
        view: 'view' in updates ? (updates.view ?? '') : viewMode,
      };
      const params = new URLSearchParams();
      if (next.search.trim()) params.set(HIERARCHY_URL_PARAMS.search, next.search.trim());
      if (next.vertical.trim()) params.set(HIERARCHY_URL_PARAMS.vertical, next.vertical.trim());
      if (next.view.trim()) params.set(HIERARCHY_URL_PARAMS.view, next.view.trim());
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchQuery, verticalId, viewMode],
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
    const res = await fetch(`/api/hierarchy/bootstrap?${params}`, { signal });
    if (!res.ok) {
      let message = `Failed to load hierarchy (${res.status})`;
      const text = await res.text();
      try {
        const body = JSON.parse(text) as { error?: string };
        if (typeof body.error === 'string' && body.error.trim()) message = body.error.trim();
      } catch {
        if (text.trim()) message = text.trim();
      }
      throw new Error(message);
    }
    const data = await res.json();
    if (data.config) setConfig(data.config);
    setDefaultElectionId(data.defaultElectionId ?? '');
  }, []);

  const loadLeaders = useCallback(
    async (nextVerticalId: string, wardGeoIds: string[], signal?: AbortSignal) => {
      if (!nextVerticalId) {
        setLeaders(EMPTY_LEADERS);
        return;
      }

      const params = new URLSearchParams({
        constituencyId: DEFAULT_CONSTITUENCY_ID,
        verticalId: nextVerticalId,
      });
      for (const wardGeoId of wardGeoIds) {
        params.append('wardGeoId', wardGeoId);
      }

      const res = await fetch(`/api/hierarchy/leaders?${params}`, { signal });
      if (!res.ok) {
        let message = `Failed to load leaders (${res.status})`;
        const text = await res.text();
        try {
          const body = JSON.parse(text) as { error?: string };
          if (typeof body.error === 'string' && body.error.trim()) message = body.error.trim();
        } catch {
          if (text.trim()) message = text.trim();
        }
        throw new Error(message);
      }
      const data = await res.json();
      setLeaders(data.leaders ?? EMPTY_LEADERS);
    },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        await loadBootstrap(controller.signal);
      } catch (err) {
        if (!controller.signal.aborted) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load hierarchy data');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [loadBootstrap]);

  const wardOptions = useMemo(
    () =>
      (config?.geoUnits ?? [])
        .filter((g) => g.type === 'ward' && g.isActive)
        .sort((a, b) => extractWardNumber(a.name) - extractWardNumber(b.name)),
    [config?.geoUnits],
  );

  const wardGeoIds = useMemo(() => wardOptions.map((ward) => ward.id), [wardOptions]);

  const activeVerticals = useMemo(
    () => (config?.verticals ?? []).filter((v) => v.isActive),
    [config?.verticals],
  );

  const effectiveVerticalId = verticalId || activeVerticals[0]?.id || '';
  const selectedVerticalName =
    activeVerticals.find((v) => v.id === effectiveVerticalId)?.name ?? 'Basic';

  useEffect(() => {
    if (!config || !effectiveVerticalId) return;
    const controller = new AbortController();
    (async () => {
      setLoadingLeaders(true);
      setLoadError(null);
      try {
        await loadLeaders(effectiveVerticalId, wardGeoIds, controller.signal);
      } catch (err) {
        if (!controller.signal.aborted) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load hierarchy leaders');
        }
      } finally {
        if (!controller.signal.aborted) setLoadingLeaders(false);
      }
    })();
    return () => controller.abort();
  }, [config, effectiveVerticalId, wardGeoIds, loadLeaders]);

  const ensureReferenceCounts = useCallback(async () => {
    if (referenceCounts) return;
    await loadConfig();
  }, [referenceCounts, loadConfig]);

  const refresh = useCallback(async () => {
    setLoadError(null);
    try {
      await loadBootstrap();
      if (effectiveVerticalId) {
        await loadLeaders(effectiveVerticalId, wardGeoIds);
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to refresh hierarchy data');
    }
  }, [loadBootstrap, loadLeaders, effectiveVerticalId, wardGeoIds]);

  const showCanvas = viewMode === HIERARCHY_VIEWS.canvas;
  const hierarchyDisplayMode = showCanvas ? 'canvas' : 'list';

  const wardHeadById = useMemo(
    () => new Map(leaders.wardHeads.map((entry) => [entry.wardGeoId, entry.member])),
    [leaders.wardHeads],
  );

  const wardEntries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return wardOptions
      .map((ward) => {
        const head = wardHeadById.get(ward.id) ?? null;
        const wardLabel = formatWardLabel(ward.name);
        const headName = head ? getMemberDisplayName(head) : '—';
        const headPhone = head ? getMemberPhone(head) : null;

        return { ward, wardLabel, headName, headPhone };
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
  }, [wardOptions, wardHeadById, searchQuery]);

  const clearSearch = useCallback(() => {
    setSearchDraft('');
    setUrlParams({ search: '' });
  }, [setUrlParams]);

  const hasSearch = Boolean(searchDraft.trim() || searchQuery.trim());

  const openCreateMember = () => {
    setEditorTarget({ mode: 'create' });
  };

  const openCanvasView = () => {
    setUrlParams({ view: HIERARCHY_VIEWS.canvas });
  };

  const openListView = () => {
    setUrlParams({ view: '' });
  };

  const talukaAdhyaksh = leaders.talukaAdhyaksh;
  const talukaAdhyakshName = talukaAdhyaksh ? getMemberDisplayName(talukaAdhyaksh) : '—';
  const talukaAdhyakshPhone = talukaAdhyaksh ? getMemberPhone(talukaAdhyaksh) : null;
  const isContentLoading = loading || loadingLeaders;

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
            SEARCH WARDS
          </Label>
          {hasSearch && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={clearSearch}
            >
              Clear
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
              placeholder="Search by ward number or adhyaksh name"
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

      <div className="shrink-0">{verticalSelect}</div>

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

      <div className="flex flex-col gap-3">
        {isContentLoading ? (
          <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 py-12">
            <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">
              {loading ? 'Loading hierarchy…' : 'Loading leaders…'}
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
              Retry
            </Button>
          </div>
        ) : showCanvas ? (
          <HierarchyCanvasView
            leaders={leaders}
            verticalName={selectedVerticalName}
            wardOptions={wardOptions}
          />
        ) : (
          <div className="flex flex-col gap-3">
            <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 dark:border-primary/50 dark:bg-primary/10">
              <p className="text-sm">
                Taluka Adhyaksh ({selectedVerticalName}): {talukaAdhyakshName}
              </p>
              <div className="mt-1">
                <ContactWithCall phone={talukaAdhyakshPhone} />
              </div>
            </div>

            {wardEntries.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
                No wards match the current search.
              </div>
            ) : (
              wardEntries.map((entry) => (
                <div
                  key={entry.ward.id}
                  className="overflow-hidden rounded-xl border border-border bg-card px-4 py-3 shadow-sm"
                >
                  <p className="font-bold">Ward No. {entry.wardLabel}</p>
                  <div className="mt-1 space-y-1 text-sm">
                    <p>Ward Adhyaksh: {entry.headName}</p>
                    <ContactWithCall phone={entry.headPhone} />
                  </div>
                </div>
              ))
            )}
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
          onSaved={() => {
            void refresh();
          }}
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
