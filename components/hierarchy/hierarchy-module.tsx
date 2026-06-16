'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Settings, SlidersHorizontal, X } from 'lucide-react';
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
import { useIsMobile } from '@/hooks/use-mobile';
import { HierarchyMap } from './hierarchy-map';
import { HierarchyConfigAdmin } from './hierarchy-config-admin';
import { HierarchyNodeDetail } from './hierarchy-node-detail';
import { HierarchyQuickEdit, type QuickEditTarget } from './hierarchy-quick-edit';
import { VerticalDialog } from './vertical-dialog';
import type {
  CadreConfig,
  CadreConfigReferenceCounts,
  CadreNodeDetail,
} from '@/lib/hierarchy/types';
import {
  applyNavFilters,
  applySearchFilters,
  extractWardNumber,
  HIERARCHY_URL_PARAMS,
  nodeMatchesSearch,
  resolveFocusVerticalId,
} from '@/lib/hierarchy/map-filters';
import {
  applyCollapse,
  defaultExpandedIds,
  expandPathTo,
  findBoothGroupId,
  findWardNodeId,
} from '@/lib/hierarchy/collapse';
import { buildForest, isVerticalHubNode } from '@/lib/hierarchy/forest-builder';
import {
  buildBoothOptions,
  buildVerticalOptions,
  buildWardOptions,
  resolveNavPathFromNode,
} from '@/lib/hierarchy/nav-options';
import { extractBoothNumber } from '@/lib/hierarchy/booth-geo-units';
import {
  fromOptionalSelectValue,
  SELECT_NONE_VALUE,
  toControlledSelectValue,
  toOptionalSelectValue,
} from '@/lib/hierarchy/select-utils';
import {
  appendVacantSlotsForForest,
  isPlaceholderNode,
} from '@/lib/hierarchy/vacant-slots';
import { buildNavigableTree } from '@/lib/hierarchy/tree-builder';

const DEFAULT_CONSTITUENCY_ID = '172';

interface HierarchyModuleProps {
  canEdit: boolean;
  isAdmin: boolean;
}

export function HierarchyModule({ canEdit, isAdmin }: HierarchyModuleProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();

  const [config, setConfig] = useState<CadreConfig | null>(null);
  const [referenceCounts, setReferenceCounts] =
    useState<CadreConfigReferenceCounts | null>(null);
  const [nodes, setNodes] = useState<CadreNodeDetail[]>([]);
  const [defaultElectionId, setDefaultElectionId] = useState('');
  const [expectedBoothNos, setExpectedBoothNos] = useState<string[]>([]);
  const [boothWardFromApi, setBoothWardFromApi] = useState<Map<string, string>>(
    () => new Map(),
  );
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchDraft, setSearchDraft] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [expandedInitialized, setExpandedInitialized] = useState(false);

  const [quickEdit, setQuickEdit] = useState<QuickEditTarget | null>(null);
  const [detailNode, setDetailNode] = useState<CadreNodeDetail | null>(null);
  const [verticalDialogOpen, setVerticalDialogOpen] = useState(false);
  const [editVertical, setEditVertical] = useState<
    CadreConfig['verticals'][number] | null
  >(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [verticalSelectOpen, setVerticalSelectOpen] = useState(false);
  const [wardSelectOpen, setWardSelectOpen] = useState(false);
  const [boothSelectOpen, setBoothSelectOpen] = useState(false);

  const searchQuery = searchParams.get(HIERARCHY_URL_PARAMS.search) ?? '';
  const legacyWardNo = searchParams.get(HIERARCHY_URL_PARAMS.wardNo) ?? '';
  const boothNo = searchParams.get(HIERARCHY_URL_PARAMS.boothNo) ?? '';
  const expandParam = searchParams.get(HIERARCHY_URL_PARAMS.expand) ?? '';
  const wardGeoIdParam = searchParams.get(HIERARCHY_URL_PARAMS.ward) ?? '';

  const expandedVerticalIds = useMemo(
    () => new Set(expandParam.split(',').filter(Boolean)),
    [expandParam],
  );

  useEffect(() => {
    setSearchDraft(searchQuery);
  }, [searchQuery]);

  const setUrlParams = useCallback(
    (updates: {
      search?: string;
      wardGeoId?: string;
      boothNo?: string;
      expand?: string;
    }) => {
      const next = {
        search: updates.search ?? searchQuery,
        wardGeoId: updates.wardGeoId ?? wardGeoIdParam,
        boothNo: updates.boothNo ?? boothNo,
        expand: updates.expand ?? expandParam,
      };
      const params = new URLSearchParams();
      if (next.search.trim()) {
        params.set(HIERARCHY_URL_PARAMS.search, next.search.trim());
      }
      if (next.wardGeoId.trim()) {
        params.set(HIERARCHY_URL_PARAMS.ward, next.wardGeoId.trim());
      }
      if (next.boothNo.trim()) {
        params.set(HIERARCHY_URL_PARAMS.boothNo, next.boothNo.trim());
      }
      if (next.expand) {
        params.set(HIERARCHY_URL_PARAMS.expand, next.expand);
      }
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : '?', { scroll: false });
    },
    [router, searchQuery, wardGeoIdParam, boothNo, expandParam],
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
      const message =
        err instanceof Error ? err.message : 'Failed to load hierarchy data';
      setLoadError(message);
      return;
    }
    if (!res.ok) {
      let message = `Failed to load hierarchy (${res.status})`;
      const text = await res.text();
      try {
        const body = JSON.parse(text) as { error?: string };
        if (typeof body.error === 'string' && body.error.trim()) {
          message = body.error.trim();
        }
      } catch {
        if (text.trim()) message = text.trim();
      }
      setLoadError(message);
      return;
    }
    const data = await res.json();
    if (data.config) {
      setConfig(data.config);
    }
    setNodes(data.nodes ?? []);
    setDefaultElectionId(data.defaultElectionId ?? '');
    setExpectedBoothNos(data.boothNos ?? []);
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
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    })();
    return () => controller.abort();
  }, [loadBootstrap]);

  const ensureReferenceCounts = useCallback(async () => {
    if (referenceCounts) return;
    await loadConfig();
  }, [referenceCounts, loadConfig]);

  const boothToWardGeoId = useMemo(() => {
    const mapping = new Map(boothWardFromApi);
    if (config) {
      for (const geo of config.geoUnits) {
        if (geo.type !== 'booth' || !geo.parentId) continue;
        const boothNum = extractBoothNumber(geo.name);
        if (boothNum) mapping.set(boothNum, geo.parentId);
      }
    }
    for (const node of nodes) {
      if (node.positionLevelKey === 'booth' && node.boothNo && node.wardGeoId) {
        mapping.set(node.boothNo, node.wardGeoId);
      }
    }
    return mapping;
  }, [boothWardFromApi, config, nodes]);

  const refresh = useCallback(() => {
    setLoadError(null);
    void loadBootstrap();
  }, [loadBootstrap]);

  const activeVerticals = useMemo(
    () => (config?.verticals ?? []).filter((v) => v.isActive),
    [config?.verticals],
  );

  const resolvedWardGeoId = useMemo(() => {
    if (wardGeoIdParam) return wardGeoIdParam;
    if (!legacyWardNo || !config) return '';
    const match = config.geoUnits.find(
      (g) => g.type === 'ward' && extractWardNumber(g.name) === legacyWardNo.trim(),
    );
    return match?.id ?? '';
  }, [wardGeoIdParam, legacyWardNo, config]);

  const selectedVerticalId = useMemo(() => {
    if (expandParam) return expandParam.split(',')[0] ?? '';
    if (activeVerticals.length === 1) return activeVerticals[0]?.id ?? '';
    if (resolvedWardGeoId) {
      const wardNode = nodes.find(
        (n) => n.positionLevelKey === 'ward' && n.wardGeoId === resolvedWardGeoId,
      );
      if (wardNode) return wardNode.verticalId;
    }
    return '';
  }, [expandParam, activeVerticals, resolvedWardGeoId, nodes]);

  const verticalOptions = useMemo(
    () => buildVerticalOptions(activeVerticals),
    [activeVerticals],
  );

  const wardOptions = useMemo(
    () =>
      selectedVerticalId && config
        ? buildWardOptions(
            nodes,
            selectedVerticalId,
            config,
            DEFAULT_CONSTITUENCY_ID,
          )
        : [],
    [nodes, selectedVerticalId, config],
  );

  const boothOptions = useMemo(
    () => (resolvedWardGeoId ? buildBoothOptions(nodes, resolvedWardGeoId) : []),
    [nodes, resolvedWardGeoId],
  );

  const hasActiveSearchInput = Boolean(searchQuery.trim());

  const focusVerticalId = useMemo(
    () =>
      resolveFocusVerticalId({
        selectedVerticalId,
        wardGeoId: resolvedWardGeoId,
        boothNo,
        verticalSelectOpen,
        wardSelectOpen,
        boothSelectOpen,
        multipleVerticals: verticalOptions.length > 1,
      }),
    [
      selectedVerticalId,
      resolvedWardGeoId,
      boothNo,
      verticalSelectOpen,
      wardSelectOpen,
      boothSelectOpen,
      verticalOptions.length,
    ],
  );

  useEffect(() => {
    const onlyWard = wardOptions.length === 1 ? wardOptions[0] : undefined;
    if (!selectedVerticalId || resolvedWardGeoId || !onlyWard) return;
    setUrlParams({ wardGeoId: onlyWard.value });
  }, [selectedVerticalId, resolvedWardGeoId, wardOptions, setUrlParams]);

  useEffect(() => {
    const onlyBooth = boothOptions.length === 1 ? boothOptions[0] : undefined;
    if (!resolvedWardGeoId || boothNo || !onlyBooth) return;
    setUrlParams({ boothNo: onlyBooth.value });
  }, [resolvedWardGeoId, boothNo, boothOptions, setUrlParams]);

  const navigableForest = useMemo(() => {
    if (!config) {
      return {
        navigableNodes: [] as CadreNodeDetail[],
        hubStats: new Map(),
      };
    }

    const withVacants = appendVacantSlotsForForest(nodes, {
      verticals: activeVerticals.map((v) => ({ id: v.id, name: v.name })),
      constituencyId: DEFAULT_CONSTITUENCY_ID,
      electionId: defaultElectionId,
      wardGeoId: resolvedWardGeoId || null,
      config,
      expectedBoothNos,
      boothToWardGeoId,
    });

    const effectiveExpanded = hasActiveSearchInput
      ? new Set(activeVerticals.map((v) => v.id))
      : selectedVerticalId
        ? new Set([selectedVerticalId])
        : expandedVerticalIds;

    const forest = buildForest(withVacants, activeVerticals, effectiveExpanded);
    const navFiltered = applyNavFilters(forest.nodes, {
      focusVerticalId,
      wardGeoId: resolvedWardGeoId,
      boothNo,
    });

    return {
      navigableNodes: buildNavigableTree(navFiltered.nodes),
      hubStats: forest.hubStats,
    };
  }, [
    config,
    nodes,
    activeVerticals,
    defaultElectionId,
    expectedBoothNos,
    boothToWardGeoId,
    expandedVerticalIds,
    selectedVerticalId,
    hasActiveSearchInput,
    resolvedWardGeoId,
    boothNo,
    focusVerticalId,
  ]);

  useEffect(() => {
    if (expandedInitialized || navigableForest.navigableNodes.length === 0) return;
    setExpandedIds(
      defaultExpandedIds(
        navigableForest.navigableNodes,
        selectedVerticalId || undefined,
      ),
    );
    setExpandedInitialized(true);
  }, [
    navigableForest.navigableNodes,
    selectedVerticalId,
    expandedInitialized,
  ]);

  useEffect(() => {
    if (!selectedVerticalId) return;
    setExpandedInitialized(false);
  }, [selectedVerticalId]);

  const { mapNodes, matchIds, hasActiveFilter, childCountById, hasChildrenById, effectiveExpandedIds } =
    useMemo(() => {
      const { navigableNodes } = navigableForest;
      if (navigableNodes.length === 0) {
        return {
          mapNodes: [] as CadreNodeDetail[],
          matchIds: new Set<string>(),
          hasActiveFilter: false,
          childCountById: new Map<string, number>(),
          hasChildrenById: new Map<string, boolean>(),
          effectiveExpandedIds: new Set<string>(),
        };
      }

      const searchMatches = new Set<string>();
      if (searchQuery.trim()) {
        for (const node of navigableNodes) {
          if (isVerticalHubNode(node)) continue;
          if (nodeMatchesSearch(node, searchQuery)) {
            searchMatches.add(node.id);
          }
        }
      }

      const effectiveExpanded = new Set(expandedIds);

      if (resolvedWardGeoId) {
        const wardNodeId = findWardNodeId(
          navigableNodes,
          resolvedWardGeoId,
          selectedVerticalId || undefined,
        );
        if (wardNodeId) {
          for (const id of expandPathTo(navigableNodes, wardNodeId)) {
            effectiveExpanded.add(id);
          }
          effectiveExpanded.add(wardNodeId);
          if (boothNo) {
            const boothGroupId = findBoothGroupId(
              navigableNodes,
              wardNodeId,
              boothNo,
            );
            if (boothGroupId) {
              for (const id of expandPathTo(navigableNodes, boothGroupId)) {
                effectiveExpanded.add(id);
              }
              effectiveExpanded.add(boothGroupId);
            }
          }
        }
      }

      for (const matchId of searchMatches) {
        for (const id of expandPathTo(navigableNodes, matchId)) {
          effectiveExpanded.add(id);
        }
        effectiveExpanded.add(matchId);
      }

      const collapsed = applyCollapse(navigableNodes, effectiveExpanded);

      const searched = applySearchFilters(collapsed.nodes, {
        search: searchQuery,
        wardGeoId: resolvedWardGeoId,
        boothNo,
      });

      return {
        mapNodes: searchQuery.trim() ? searched.nodes : collapsed.nodes,
        matchIds: searched.matchIds,
        hasActiveFilter: searched.hasActiveFilter,
        childCountById: collapsed.childCountById,
        hasChildrenById: collapsed.hasChildrenById,
        effectiveExpandedIds: effectiveExpanded,
      };
    }, [
      navigableForest,
      expandedIds,
      searchQuery,
      resolvedWardGeoId,
      boothNo,
      selectedVerticalId,
    ]);

  const fitBoundsNodeIds = useMemo(() => {
    if (resolvedWardGeoId || boothNo) {
      if (resolvedWardGeoId && !boothNo) {
        const wardLocal = mapNodes.filter(
          (n) =>
            !isVerticalHubNode(n) &&
            n.positionLevelKey !== 'taluka' &&
            n.wardGeoId === resolvedWardGeoId,
        );
        if (wardLocal.length > 0) {
          return new Set(wardLocal.map((n) => n.id));
        }
      }
      return new Set(mapNodes.map((n) => n.id));
    }
    if (focusVerticalId) {
      return new Set(mapNodes.map((n) => n.id));
    }
    return undefined;
  }, [mapNodes, resolvedWardGeoId, boothNo, focusVerticalId]);

  const toggleVertical = (verticalId: string) => {
    setUrlParams({
      expand: expandedVerticalIds.has(verticalId) ? '' : verticalId,
    });
  };

  const handleToggleExpand = useCallback((nodeId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const handleNodeClick = (node: CadreNodeDetail) => {
    if (!canEdit) {
      setDetailNode(node);
      return;
    }
    setDetailNode(null);
    if (isPlaceholderNode(node)) {
      const wardParent = node.parentId
        ? nodes.find((n) => n.id === node.parentId)
        : undefined;
      setQuickEdit({
        mode: 'create',
        parent: wardParent ?? node,
        verticalId: node.verticalId,
        prefillFrom: node,
      });
    } else {
      setQuickEdit({ mode: 'edit', node });
    }
  };

  const handleAddChild = (parent: CadreNodeDetail) => {
    setDetailNode(null);
    setQuickEdit({ mode: 'create', parent, verticalId: parent.verticalId });
  };

  const openNewVertical = () => {
    void ensureReferenceCounts();
    setEditVertical(null);
    setVerticalDialogOpen(true);
  };

  const commitSearch = () => {
    const trimmed = searchDraft.trim();
    if (!trimmed) {
      setUrlParams({ search: '' });
      return;
    }

    const match = nodes.find(
      (n) => !isVerticalHubNode(n) && nodeMatchesSearch(n, trimmed),
    );
    if (match) {
      const path = resolveNavPathFromNode(match, nodes);
      setUrlParams({
        search: trimmed,
        expand: path.verticalId ?? selectedVerticalId,
        wardGeoId: path.wardGeoId ?? '',
        boothNo: path.boothNo ?? '',
      });
      return;
    }

    setUrlParams({ search: trimmed });
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count += 1;
    if (selectedVerticalId && verticalOptions.length > 1) count += 1;
    if (resolvedWardGeoId) count += 1;
    if (boothNo) count += 1;
    return count;
  }, [
    searchQuery,
    selectedVerticalId,
    verticalOptions.length,
    resolvedWardGeoId,
    boothNo,
  ]);

  const activeFilterChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; onClear: () => void }> = [];

    if (searchQuery.trim()) {
      chips.push({
        key: 'search',
        label: `Search: ${searchQuery.trim()}`,
        onClear: () => setUrlParams({ search: '' }),
      });
    }
    if (selectedVerticalId && verticalOptions.length > 1) {
      const label =
        verticalOptions.find((o) => o.value === selectedVerticalId)?.label ??
        'Vertical';
      chips.push({
        key: 'vertical',
        label,
        onClear: () =>
          setUrlParams({
            expand: '',
            wardGeoId: '',
            boothNo: '',
          }),
      });
    }
    if (resolvedWardGeoId) {
      const label =
        wardOptions.find((o) => o.value === resolvedWardGeoId)?.label ?? 'Ward';
      chips.push({
        key: 'ward',
        label,
        onClear: () =>
          setUrlParams({
            wardGeoId: '',
            boothNo: '',
          }),
      });
    }
    if (boothNo) {
      const label =
        boothOptions.find((o) => o.value === boothNo)?.label ?? `Booth ${boothNo}`;
      chips.push({
        key: 'booth',
        label,
        onClear: () => setUrlParams({ boothNo: '' }),
      });
    }

    return chips;
  }, [
    searchQuery,
    selectedVerticalId,
    verticalOptions,
    resolvedWardGeoId,
    wardOptions,
    boothNo,
    boothOptions,
    setUrlParams,
  ]);

  const navSelects = (
    <>
      {verticalOptions.length > 1 && (
        <div className="w-full md:w-44">
          <Label className="text-xs text-muted-foreground">Vertical</Label>
          <Select
            open={verticalSelectOpen}
            onOpenChange={setVerticalSelectOpen}
            value={toControlledSelectValue(selectedVerticalId)}
            onValueChange={(value) =>
              setUrlParams({
                expand: fromOptionalSelectValue(value),
                wardGeoId: '',
                boothNo: '',
              })
            }
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select vertical" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SELECT_NONE_VALUE}>All verticals</SelectItem>
              {verticalOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {selectedVerticalId && wardOptions.length > 0 && (
        <div className="w-full md:min-w-52 md:max-w-72">
          <Label className="text-xs text-muted-foreground">Ward</Label>
          <Select
            open={wardSelectOpen}
            onOpenChange={setWardSelectOpen}
            value={toOptionalSelectValue(resolvedWardGeoId)}
            onValueChange={(value) => {
              const geoId = fromOptionalSelectValue(value);
              setUrlParams({
                wardGeoId: geoId,
                boothNo: '',
              });
            }}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select ward" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SELECT_NONE_VALUE}>All wards</SelectItem>
              {wardOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {resolvedWardGeoId &&
        (boothOptions.length > 1 || boothNo) && (
          <div className="w-full md:min-w-44 md:max-w-64">
            <Label className="text-xs text-muted-foreground">Booth</Label>
            <Select
              open={boothSelectOpen}
              onOpenChange={setBoothSelectOpen}
              value={toOptionalSelectValue(boothNo)}
              onValueChange={(value) => {
                const nextBooth = fromOptionalSelectValue(value);
                setUrlParams({ boothNo: nextBooth });
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select booth" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SELECT_NONE_VALUE}>All booths</SelectItem>
                {boothOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
    </>
  );

  const overlay = useMemo(() => {
    if (canEdit && quickEdit && config) {
      return (
        <HierarchyQuickEdit
          target={quickEdit}
          config={config}
          constituencyId={DEFAULT_CONSTITUENCY_ID}
          electionId={defaultElectionId}
          onClose={() => setQuickEdit(null)}
          onSaved={refresh}
        />
      );
    }
    if (!canEdit && detailNode) {
      return (
        <HierarchyNodeDetail
          node={detailNode}
          isAdmin={false}
          onClose={() => setDetailNode(null)}
          onEdit={() => {}}
          onAddSubordinate={() => {}}
        />
      );
    }
    return null;
  }, [canEdit, quickEdit, config, defaultElectionId, detailNode, refresh]);

  return (
    <div className="flex h-[calc(100dvh-5.5rem)] max-md:h-[calc(100dvh-9rem)] min-h-[400px] flex-col gap-2 md:gap-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <ModulePageHeader title="Cadre Hierarchy" />
        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={openNewVertical}>
              <Plus className="size-4 mr-1" /> New vertical
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                void ensureReferenceCounts();
                setConfigOpen(true);
              }}
              aria-label="Configuration"
            >
              <Settings className="size-4" />
            </Button>
          </div>
        )}
      </div>

      {isMobile ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <Label className="text-xs text-muted-foreground">Search by name</Label>
              <Input
                className="h-9"
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitSearch();
                }}
                onBlur={commitSearch}
                placeholder="Person name"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 shrink-0 gap-1.5"
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
            <div className="flex gap-1.5 overflow-x-auto pb-0.5">
              {activeFilterChips.map((chip) => (
                <Badge
                  key={chip.key}
                  variant="outline"
                  className="shrink-0 gap-1 pr-1 font-normal"
                >
                  <span className="max-w-40 truncate">{chip.label}</span>
                  <button
                    type="button"
                    className="rounded-full p-0.5 hover:bg-muted"
                    aria-label={`Clear ${chip.label}`}
                    onClick={chip.onClear}
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-xl">
              <SheetHeader>
                <SheetTitle>Map filters</SheetTitle>
              </SheetHeader>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {navSelects}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      ) : (
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-48">
            <Label className="text-xs text-muted-foreground">Search by name</Label>
            <Input
              className="h-9"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitSearch();
              }}
              onBlur={commitSearch}
              placeholder="Person name"
            />
          </div>

          {navSelects}
        </div>
      )}

      <div className="min-h-0 flex-1">
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
          <HierarchyMap
            nodes={mapNodes}
            matchIds={matchIds}
            hasActiveSearchFilter={hasActiveFilter}
            focusNodeId={null}
            fitBoundsNodeIds={fitBoundsNodeIds}
            selectedId={
              quickEdit?.mode === 'edit'
                ? quickEdit.node.id
                : quickEdit?.mode === 'create'
                  ? quickEdit.prefillFrom?.id ?? quickEdit.parent?.id ?? null
                  : detailNode?.id ?? null
            }
            expandedVerticalIds={expandedVerticalIds}
            expandedIds={effectiveExpandedIds}
            childCountById={childCountById}
            hasChildrenById={hasChildrenById}
            onToggleExpand={handleToggleExpand}
            hubStats={navigableForest.hubStats}
            onNodeClick={handleNodeClick}
            onHubToggle={toggleVertical}
            onEditNode={
              canEdit
                ? (node) => {
                    if (isVerticalHubNode(node)) {
                      if (!isAdmin) return;
                      const vertical = activeVerticals.find(
                        (v) => v.id === node.verticalId,
                      );
                      if (vertical) {
                        void ensureReferenceCounts();
                        setEditVertical(vertical);
                        setVerticalDialogOpen(true);
                      }
                      return;
                    }
                    setQuickEdit({ mode: 'edit', node });
                  }
                : undefined
            }
            onAddChild={canEdit ? handleAddChild : undefined}
            overlay={overlay}
          />
        )}
      </div>

      {config && (
        <VerticalDialog
          open={verticalDialogOpen}
          onOpenChange={setVerticalDialogOpen}
          config={config}
          referenceCounts={referenceCounts}
          vertical={editVertical}
          onSaved={(verticalId) => {
            refresh();
            if (verticalId) setUrlParams({ expand: verticalId });
          }}
        />
      )}

      {config && (
        <Sheet open={configOpen} onOpenChange={setConfigOpen}>
          <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Hierarchy configuration</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <HierarchyConfigAdmin
                config={config}
                referenceCounts={referenceCounts}
                onRefresh={loadConfig}
              />
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
