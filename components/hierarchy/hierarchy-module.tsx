'use client';

import { useCallback, useEffect, useState } from 'react';
import { ModulePageHeader } from '@/components/module-page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { HierarchyMap } from './hierarchy-map';
import { HierarchyManageAdmin } from './hierarchy-manage-admin';
import { HierarchyConfigAdmin } from './hierarchy-config-admin';
import { HierarchyNodeEditSheet } from './hierarchy-node-edit-sheet';
import type { CadreConfig, CadreNodeDetail } from '@/lib/hierarchy/types';

interface Election {
  electionId: string;
  constituencyType: string | null;
  constituencyId: string | null;
}

interface HierarchyModuleProps {
  isAdmin: boolean;
}

export function HierarchyModule({ isAdmin }: HierarchyModuleProps) {
  const [config, setConfig] = useState<CadreConfig | null>(null);
  const [nodes, setNodes] = useState<CadreNodeDetail[]>([]);
  const [elections, setElections] = useState<Election[]>([]);
  const [verticalId, setVerticalId] = useState('');
  const [constituencyId, setConstituencyId] = useState('172');
  const [electionId, setElectionId] = useState('');
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editNode, setEditNode] = useState<CadreNodeDetail | null>(null);
  const [parentId, setParentId] = useState<string | null>(null);

  const loadConfig = useCallback(async () => {
    const res = await fetch('/api/hierarchy/config');
    const data = await res.json();
    if (data.config) {
      setConfig(data.config);
      if (!verticalId && data.config.verticals.length > 0) {
        const main =
          data.config.verticals.find((v: { name: string }) => v.name === 'Main Organization') ??
          data.config.verticals[0];
        setVerticalId(main.id);
      }
    }
  }, [verticalId]);

  const loadTree = useCallback(async () => {
    if (!verticalId) return;
    const params = new URLSearchParams({ verticalId, constituencyId });
    const res = await fetch(`/api/hierarchy/tree?${params}`);
    const data = await res.json();
    setNodes(data.nodes ?? []);
  }, [verticalId, constituencyId]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([
        loadConfig(),
        fetch('/api/elections')
          .then((r) => r.json())
          .then((d) => {
            const list = d.elections ?? [];
            setElections(list);
            const assembly = list.find(
              (e: Election) => e.constituencyType === 'assembly' && e.constituencyId === '172',
            );
            if (assembly) setElectionId(assembly.electionId);
            else if (list[0]) setElectionId(list[0].electionId);
          }),
      ]);
      setLoading(false);
    })();
  }, [loadConfig]);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  const refresh = () => {
    loadConfig();
    loadTree();
  };

  const openCreate = (parent?: CadreNodeDetail | null) => {
    setEditNode(null);
    setParentId(parent?.id ?? null);
    setEditOpen(true);
  };

  const openEdit = (node: CadreNodeDetail) => {
    setEditNode(node);
    setParentId(null);
    setEditOpen(true);
  };

  const assemblyElections = elections.filter((e) => e.constituencyType === 'assembly');

  return (
    <div className="flex flex-col gap-4">
      <ModulePageHeader title="Cadre Hierarchy" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Label className="text-xs text-muted-foreground">Vertical</Label>
          <Select value={verticalId} onValueChange={setVerticalId}>
            <SelectTrigger>
              <SelectValue placeholder="Select vertical" />
            </SelectTrigger>
            <SelectContent>
              {config?.verticals
                .filter((v) => v.isActive)
                .map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Assembly constituency</Label>
          <Select value={constituencyId} onValueChange={setConstituencyId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {assemblyElections.map((e) => (
                <SelectItem key={e.electionId} value={e.constituencyId ?? e.electionId}>
                  AC {e.constituencyId}
                </SelectItem>
              ))}
              <SelectItem value="172">AC 172</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Election (booth context)</Label>
          <Select value={electionId} onValueChange={setElectionId}>
            <SelectTrigger>
              <SelectValue placeholder="Election" />
            </SelectTrigger>
            <SelectContent>
              {elections.map((e) => (
                <SelectItem key={e.electionId} value={e.electionId}>
                  {e.electionId}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground py-12 text-center">Loading...</p>
      ) : (
        <Tabs defaultValue="map">
          <TabsList>
            <TabsTrigger value="map">Map</TabsTrigger>
            {isAdmin && <TabsTrigger value="manage">Manage</TabsTrigger>}
            {isAdmin && <TabsTrigger value="config">Configuration</TabsTrigger>}
          </TabsList>
          <TabsContent value="map" className="mt-4">
            <HierarchyMap
              nodes={nodes}
              isAdmin={isAdmin}
              onEdit={openEdit}
              onAddSubordinate={openCreate}
            />
          </TabsContent>
          {isAdmin && (
            <TabsContent value="manage" className="mt-4">
              <HierarchyManageAdmin
                nodes={nodes}
                onAdd={() => openCreate()}
                onEdit={openEdit}
                onRefresh={refresh}
              />
            </TabsContent>
          )}
          {isAdmin && config && (
            <TabsContent value="config" className="mt-4">
              <HierarchyConfigAdmin config={config} onRefresh={loadConfig} />
            </TabsContent>
          )}
        </Tabs>
      )}

      {config && verticalId && (
        <HierarchyNodeEditSheet
          open={editOpen}
          onOpenChange={setEditOpen}
          config={config}
          node={editNode}
          parentId={parentId}
          verticalId={verticalId}
          constituencyId={constituencyId}
          electionId={electionId}
          onSaved={refresh}
        />
      )}
    </div>
  );
}
