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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  capDepthWithoutWard,
  extractWardNumber,
  filterNodesForMap,
  DEFAULT_MAP_DEPTH,
  getMapRenderGate,
  HIERARCHY_URL_PARAMS,
  isDepthAllowed,
  MAP_DEPTH_LABELS,
  MAP_MAX_RENDER_NODES,
  nodeMatchesSearch,
  parseMapDepth,
  type MapDepth,
} from '@/lib/hierarchy/map-filters';
import { buildForest, isVerticalHubNode } from '@/lib/hierarchy/forest-builder';
import {
  buildBoothCommitteeOptions,
  buildBoothOptions,
  buildVerticalOptions,
  buildWardCommitteeOptions,
  buildWardOptions,
  inferDepthFromNav,
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

const DEFAULT_CONSTITUENCY_ID = '172';

interface HierarchyModuleProps {
  isAdmin: boolean;
}

export function HierarchyModule({ isAdmin }: HierarchyModuleProps) {
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
  const [searchDraft, setSearchDraft] = useState('');

  const [quickEdit, setQuickEdit] = useState<QuickEditTarget | null>(null);
  const [detailNode, setDetailNode] = useState<CadreNodeDetail | null>(null);
  const [verticalDialogOpen, setVerticalDialogOpen] = useState(false);
  const [editVertical, setEditVertical] = useState<
    CadreConfig['verticals'][number] | null
  >(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const mapDepth = parseMapDepth(searchParams.get(HIERARCHY_URL_PARAMS.depth));
  const searchQuery = searchParams.get(HIERARCHY_URL_PARAMS.search) ?? '';
  const legacyWardNo = searchParams.get(HIERARCHY_URL_PARAMS.wardNo) ?? '';
  const boothNo = searchParams.get(HIERARCHY_URL_PARAMS.boothNo) ?? '';
  const expandParam = searchParams.get(HIERARCHY_URL_PARAMS.expand) ?? '';
  const wardGeoIdParam = searchParams.get(HIERARCHY_URL_PARAMS.ward) ?? '';
  const wardMemberId = searchParams.get(HIERARCHY_URL_PARAMS.wardMember) ?? '';
  const boothMemberId = searchParams.get(HIERARCHY_URL_PARAMS.boothMember) ?? '';

  const expandedVerticalIds = useMemo(
    () => new Set(expandParam.split(',').filter(Boolean)),
    [expandParam],
  );

  useEffect(() => {
    setSearchDraft(searchQuery);
  }, [searchQuery]);

  // Builds the query string from managed params only, dropping legacy
  // params (vertical, ward, tab) from older versions of this page.
  const setUrlParams = useCallback(
    (updates: {
      depth?: MapDepth;
      search?: string;
      wardGeoId?: string;
      wardMemberId?: string;
      boothNo?: string;
      boothMemberId?: string;
      expand?: string;
    }) => {
      const next = {
        depth: updates.depth ?? mapDepth,
        search: updates.search ?? searchQuery,
        wardGeoId: updates.wardGeoId ?? wardGeoIdParam,
        wardMemberId: updates.wardMemberId ?? wardMemberId,
        boothNo: updates.boothNo ?? boothNo,
        boothMemberId: updates.boothMemberId ?? boothMemberId,
        expand: updates.expand ?? expandParam,
      };
      const params = new URLSearchParams();
      if (next.depth !== DEFAULT_MAP_DEPTH) {
        params.set(HIERARCHY_URL_PARAMS.depth, next.depth);
      }
      if (next.search.trim()) {
        params.set(HIERARCHY_URL_PARAMS.search, next.search.trim());
      }
      if (next.wardGeoId.trim()) {
        params.set(HIERARCHY_URL_PARAMS.ward, next.wardGeoId.trim());
      }
      if (next.wardMemberId.trim()) {
        params.set(HIERARCHY_URL_PARAMS.wardMember, next.wardMemberId.trim());
      }
      if (next.boothNo.trim()) {
        params.set(HIERARCHY_URL_PARAMS.boothNo, next.boothNo.trim());
      }
      if (next.boothMemberId.trim()) {
        params.set(HIERARCHY_URL_PARAMS.boothMember, next.boothMemberId.trim());
      }
      if (next.expand) {
        params.set(HIERARCHY_URL_PARAMS.expand, next.expand);
      }
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : '?', { scroll: false });
    },
    [
      router,
      mapDepth,
      searchQuery,
      wardGeoIdParam,
      wardMemberId,
      boothNo,
      boothMemberId,
      expandParam,
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

  const loadBootstrap = useCallback(async (signal?: AbortSignal) => {
    const params = new URLSearchParams({ constituencyId: DEFAULT_CONSTITUENCY_ID });
    const res = await fetch(`/api/hierarchy/bootstrap?${params}`, { signal });
    if (!res.ok) {
      console.error('Hierarchy bootstrap failed:', res.status, await res.text());
      return;
    }
    const data = await res.json();
    if (data.config) {
      setConfig(data.config);
      setReferenceCounts(data.referenceCounts ?? null);
    }
    setNodes(data.nodes ?? []);
    setDefaultElectionId(data.defaultElectionId ?? '');
    setExpectedBoothNos(data.boothNos ?? []);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      setLoading(true);
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

  const boothToWardGeoId = useMemo(() => {
    const mapping = new Map(boothWardFromApi);
    if (config) {
      for (const geo of config.geoUnits) {
        if (geo.type !== 'booth' || !geo.parentId) continue;
        const boothNo = extractBoothNumber(geo.name);
        if (boothNo) mapping.set(boothNo, geo.parentId);
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

  const wardCommitteeOptions = useMemo(
    () =>
      resolvedWardGeoId ? buildWardCommitteeOptions(nodes, resolvedWardGeoId) : [],
    [nodes, resolvedWardGeoId],
  );

  const boothOptions = useMemo(
    () => (resolvedWardGeoId ? buildBoothOptions(nodes, resolvedWardGeoId) : []),
    [nodes, resolvedWardGeoId],
  );

  const boothCommitteeOptions = useMemo(
    () =>
      resolvedWardGeoId && boothNo
        ? buildBoothCommitteeOptions(nodes, resolvedWardGeoId, boothNo)
        : [],
    [nodes, resolvedWardGeoId, boothNo],
  );

  const hasActiveSearchInput = Boolean(searchQuery.trim());

  const focusNodeId = wardMemberId || boothMemberId || null;

  // Skip singleton ward/booth dropdowns by auto-selecting the only option.
  useEffect(() => {
    const onlyWard = wardOptions.length === 1 ? wardOptions[0] : undefined;
    if (!selectedVerticalId || resolvedWardGeoId || !onlyWard) return;
    setUrlParams({ wardGeoId: onlyWard.value, depth: 'ward' });
  }, [selectedVerticalId, resolvedWardGeoId, wardOptions, setUrlParams]);

  useEffect(() => {
    const onlyBooth = boothOptions.length === 1 ? boothOptions[0] : undefined;
    if (!resolvedWardGeoId || wardMemberId || boothNo || !onlyBooth) return;
    setUrlParams({ boothNo: onlyBooth.value, depth: 'booth' });
  }, [resolvedWardGeoId, wardMemberId, boothNo, boothOptions, setUrlParams]);

  // Booth/committee depth without a ward loads the entire vertical — cap to ward.
  useEffect(() => {
    const capped = capDepthWithoutWard(mapDepth, resolvedWardGeoId);
    if (capped !== mapDepth) {
      setUrlParams({ depth: capped });
    }
  }, [mapDepth, resolvedWardGeoId, setUrlParams]);

  const { nodes: mapNodes, matchIds, hasActiveFilter, hubStats } = useMemo(() => {
    if (!config) {
      return {
        nodes: [] as CadreNodeDetail[],
        matchIds: new Set<string>(),
        hasActiveFilter: false,
        hubStats: new Map(),
      };
    }

    const withVacants = appendVacantSlotsForForest(nodes, {
      verticals: activeVerticals.map((v) => ({ id: v.id, name: v.name })),
      constituencyId: DEFAULT_CONSTITUENCY_ID,
      electionId: defaultElectionId,
      mapDepth,
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
    const depthFiltered = filterNodesForMap(
      forest.nodes,
      mapDepth,
      resolvedWardGeoId || null,
    );
    const navFiltered = applyNavFilters(depthFiltered, {
      wardGeoId: resolvedWardGeoId,
      boothNo,
      wardMemberId,
      boothMemberId,
    });
    const searched = applySearchFilters(navFiltered.nodes, {
      search: searchQuery,
      wardGeoId: resolvedWardGeoId,
      boothNo,
    });

    const combinedMatchIds = new Set([
      ...navFiltered.matchIds,
      ...searched.matchIds,
    ]);

    return {
      nodes: searched.nodes,
      matchIds: combinedMatchIds,
      hasActiveFilter: navFiltered.hasActiveFilter || searched.hasActiveFilter,
      hubStats: forest.hubStats,
    };
  }, [
    config,
    nodes,
    activeVerticals,
    defaultElectionId,
    mapDepth,
    expectedBoothNos,
    boothToWardGeoId,
    expandedVerticalIds,
    selectedVerticalId,
    hasActiveSearchInput,
    searchQuery,
    resolvedWardGeoId,
    boothNo,
    wardMemberId,
    boothMemberId,
  ]);

  const mapRenderGate = useMemo(
    () =>
      getMapRenderGate(mapNodes.length, {
        wardGeoId: resolvedWardGeoId,
        boothNo,
        wardMemberId,
        boothMemberId,
      }, mapDepth),
    [mapNodes.length, resolvedWardGeoId, boothNo, wardMemberId, boothMemberId, mapDepth],
  );

  const fitBoundsNodeIds = useMemo(() => {
    if (focusNodeId) return undefined;
    if (resolvedWardGeoId || boothNo || wardMemberId || boothMemberId) {
      if (resolvedWardGeoId && !wardMemberId && !boothMemberId) {
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
    return undefined;
  }, [mapNodes, focusNodeId, resolvedWardGeoId, boothNo, wardMemberId, boothMemberId]);

  const toggleVertical = (verticalId: string) => {
    // One expanded vertical at a time keeps large trees fast.
    setUrlParams({
      expand: expandedVerticalIds.has(verticalId) ? '' : verticalId,
    });
  };

  const handleNodeClick = (node: CadreNodeDetail) => {
    if (!isAdmin) {
      setDetailNode(node);
      return;
    }
    setDetailNode(null);
    if (isPlaceholderNode(node)) {
      setQuickEdit({
        mode: 'create',
        parent: node,
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
      const depth = inferDepthFromNav(path);
      setUrlParams({
        search: trimmed,
        expand: path.verticalId ?? selectedVerticalId,
        wardGeoId: path.wardGeoId ?? '',
        wardMemberId: path.wardMemberId ?? '',
        boothNo: path.boothNo ?? '',
        boothMemberId: path.boothMemberId ?? '',
        ...(depth ? { depth } : {}),
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
    if (wardMemberId) count += 1;
    if (boothNo) count += 1;
    if (boothMemberId) count += 1;
    if (mapDepth !== DEFAULT_MAP_DEPTH) count += 1;
    return count;
  }, [
    searchQuery,
    selectedVerticalId,
    verticalOptions.length,
    resolvedWardGeoId,
    wardMemberId,
    boothNo,
    boothMemberId,
    mapDepth,
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
            wardMemberId: '',
            boothNo: '',
            boothMemberId: '',
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
            wardMemberId: '',
            boothNo: '',
            boothMemberId: '',
            depth: DEFAULT_MAP_DEPTH,
          }),
      });
    }
    if (wardMemberId) {
      const label =
        wardCommitteeOptions.find((o) => o.value === wardMemberId)?.label ??
        'Ward committee';
      chips.push({
        key: 'wardMember',
        label,
        onClear: () => setUrlParams({ wardMemberId: '' }),
      });
    }
    if (boothNo) {
      const label =
        boothOptions.find((o) => o.value === boothNo)?.label ?? `Booth ${boothNo}`;
      chips.push({
        key: 'booth',
        label,
        onClear: () =>
          setUrlParams({ boothNo: '', boothMemberId: '', depth: 'ward' }),
      });
    }
    if (boothMemberId) {
      const label =
        boothCommitteeOptions.find((o) => o.value === boothMemberId)?.label ??
        'Booth committee';
      chips.push({
        key: 'boothMember',
        label,
        onClear: () => setUrlParams({ boothMemberId: '' }),
      });
    }
    if (mapDepth !== DEFAULT_MAP_DEPTH) {
      chips.push({
        key: 'depth',
        label: `Depth: ${MAP_DEPTH_LABELS[mapDepth]}`,
        onClear: () => setUrlParams({ depth: DEFAULT_MAP_DEPTH }),
      });
    }

    return chips;
  }, [
    searchQuery,
    selectedVerticalId,
    verticalOptions,
    resolvedWardGeoId,
    wardOptions,
    wardMemberId,
    wardCommitteeOptions,
    boothNo,
    boothOptions,
    boothMemberId,
    boothCommitteeOptions,
    mapDepth,
    setUrlParams,
  ]);

  const depthTabs = (
    <div>
      <Label className="text-xs text-muted-foreground">Depth</Label>
      <Tabs
        value={mapDepth}
        onValueChange={(value) => setUrlParams({ depth: value as MapDepth })}
      >
        <TabsList className="h-9 max-md:w-max">
          {(Object.keys(MAP_DEPTH_LABELS) as MapDepth[]).map((depth) => (
            <TabsTrigger
              key={depth}
              value={depth}
              disabled={!isDepthAllowed(depth, resolvedWardGeoId)}
              className="text-xs"
              title={
                !isDepthAllowed(depth, resolvedWardGeoId)
                  ? 'Select a ward first'
                  : undefined
              }
            >
              {MAP_DEPTH_LABELS[depth]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );

  const navSelects = (
    <>
      {verticalOptions.length > 1 && (
        <div className="w-full md:w-44">
          <Label className="text-xs text-muted-foreground">Vertical</Label>
          <Select
            value={toControlledSelectValue(selectedVerticalId)}
            onValueChange={(value) =>
              setUrlParams({
                expand: fromOptionalSelectValue(value),
                wardGeoId: '',
                wardMemberId: '',
                boothNo: '',
                boothMemberId: '',
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
            value={toOptionalSelectValue(resolvedWardGeoId)}
            onValueChange={(value) => {
              const geoId = fromOptionalSelectValue(value);
              setUrlParams({
                wardGeoId: geoId,
                wardMemberId: '',
                boothNo: '',
                boothMemberId: '',
                depth: geoId ? 'ward' : DEFAULT_MAP_DEPTH,
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

      {resolvedWardGeoId && wardCommitteeOptions.length > 0 && (
        <div className="w-full md:min-w-44 md:max-w-64">
          <Label className="text-xs text-muted-foreground">Ward committee</Label>
          <Select
            value={toOptionalSelectValue(wardMemberId)}
            onValueChange={(value) => {
              const memberId = fromOptionalSelectValue(value);
              setUrlParams({
                wardMemberId: memberId,
                boothNo: '',
                boothMemberId: '',
              });
            }}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select member" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SELECT_NONE_VALUE}>All members</SelectItem>
              {wardCommitteeOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {resolvedWardGeoId &&
        !wardMemberId &&
        (boothOptions.length > 1 || boothNo) && (
          <div className="w-full md:min-w-44 md:max-w-64">
            <Label className="text-xs text-muted-foreground">Booth</Label>
            <Select
              value={toOptionalSelectValue(boothNo)}
              onValueChange={(value) => {
                const nextBooth = fromOptionalSelectValue(value);
                setUrlParams({
                  boothNo: nextBooth,
                  boothMemberId: '',
                  depth: nextBooth ? 'booth' : mapDepth,
                });
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

      {boothNo && boothCommitteeOptions.length > 0 && (
        <div className="w-full md:min-w-44 md:max-w-64">
          <Label className="text-xs text-muted-foreground">Booth committee</Label>
          <Select
            value={toOptionalSelectValue(boothMemberId)}
            onValueChange={(value) => {
              const memberId = fromOptionalSelectValue(value);
              setUrlParams({
                boothMemberId: memberId,
                depth: memberId ? 'committee' : mapDepth,
              });
            }}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select member" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SELECT_NONE_VALUE}>All members</SelectItem>
              {boothCommitteeOptions.map((opt) => (
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
    if (isAdmin && quickEdit && config) {
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
    if (!isAdmin && detailNode) {
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
  }, [isAdmin, quickEdit, config, defaultElectionId, detailNode, refresh]);

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
              onClick={() => setConfigOpen(true)}
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

          <div className="-mx-1 overflow-x-auto px-1">{depthTabs}</div>

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
          {depthTabs}

          {mapNodes.length > MAP_MAX_RENDER_NODES && (
            <div className="flex items-end pb-0.5">
              <span className="text-xs text-muted-foreground">
                {mapNodes.length.toLocaleString()} nodes on map
              </span>
            </div>
          )}
        </div>
      )}

      <div className="min-h-0 flex-1">
        {loading ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted/20">
            <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Loading hierarchy…</p>
          </div>
        ) : (
          <HierarchyMap
            nodes={mapNodes}
            matchIds={matchIds}
            hasActiveSearchFilter={hasActiveFilter}
            focusNodeId={focusNodeId}
            fitBoundsNodeIds={fitBoundsNodeIds}
            mapRenderGate={mapRenderGate}
            selectedId={
              quickEdit?.mode === 'edit'
                ? quickEdit.node.id
                : quickEdit?.mode === 'create'
                  ? quickEdit.prefillFrom?.id ?? quickEdit.parent?.id ?? null
                  : detailNode?.id ?? null
            }
            expandedVerticalIds={expandedVerticalIds}
            hubStats={hubStats}
            onNodeClick={handleNodeClick}
            onHubToggle={toggleVertical}
            onEditNode={
              isAdmin
                ? (node) => {
                    if (isVerticalHubNode(node)) {
                      const vertical = activeVerticals.find(
                        (v) => v.id === node.verticalId,
                      );
                      if (vertical) {
                        setEditVertical(vertical);
                        setVerticalDialogOpen(true);
                      }
                      return;
                    }
                    setQuickEdit({ mode: 'edit', node });
                  }
                : undefined
            }
            onAddChild={isAdmin ? handleAddChild : undefined}
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
