'use client';

import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { toast } from '@/components/toast';
import {
  CADRE_GEOGRAPHIC_UNIT_TYPE_LABELS,
  CADRE_GEOGRAPHIC_UNIT_TYPES,
  type CadreConfig,
  type CadreConfigReferenceCounts,
  type CadreGeographicUnitType,
} from '@/lib/hierarchy/types';

// Categories and verticals are managed directly from the map (vertical dialog).
type ConfigKind = 'position' | 'level' | 'geo';

type EditState = {
  kind: ConfigKind;
  id?: string;
  name: string;
  key: string;
  sortOrder: number;
  isActive: boolean;
  levelId: string;
  geoType: CadreGeographicUnitType;
};

type DeleteTarget = {
  kind: ConfigKind;
  id: string;
  name: string;
};

interface HierarchyConfigAdminProps {
  config: CadreConfig;
  referenceCounts: CadreConfigReferenceCounts | null;
  onRefresh: () => void;
}

const EMPTY_REFERENCE_COUNTS: CadreConfigReferenceCounts = {
  categories: {},
  verticals: {},
  levels: {},
  positions: {},
  geoUnits: {},
};

function defaultEditState(kind: ConfigKind): EditState {
  return {
    kind,
    name: '',
    key: '',
    sortOrder: 99,
    isActive: true,
    levelId: '',
    geoType: 'division',
  };
}

function getDeleteBlockReason(
  kind: ConfigKind,
  id: string,
  name: string,
  referenceCounts: CadreConfigReferenceCounts,
): string | null {
  if (kind === 'level') {
    const positionCount = referenceCounts.levels[id]?.positionCount ?? 0;
    if (positionCount > 0) {
      return `Cannot delete ${name} — ${positionCount} position${positionCount === 1 ? '' : 's'} use this level`;
    }
    return null;
  }
  if (kind === 'position') {
    const nodeCount = referenceCounts.positions[id]?.nodeCount ?? 0;
    if (nodeCount > 0) {
      return `Cannot delete ${name} — ${nodeCount} cadre node${nodeCount === 1 ? '' : 's'} use this position`;
    }
    return null;
  }
  const usage = referenceCounts.geoUnits[id];
  const nodeCount = usage?.nodeCount ?? 0;
  const childGeoCount = usage?.childGeoCount ?? 0;
  if (nodeCount === 0 && childGeoCount === 0) return null;
  const parts: string[] = [];
  if (nodeCount > 0) {
    parts.push(
      `${nodeCount} cadre node${nodeCount === 1 ? '' : 's'} ${nodeCount === 1 ? 'is' : 'are'} assigned to this unit`,
    );
  }
  if (childGeoCount > 0) {
    parts.push(
      `${childGeoCount} child geographic unit${childGeoCount === 1 ? '' : 's'} depend on this unit`,
    );
  }
  return `Cannot delete ${name} — ${parts.join('; ')}`;
}

function getDeleteUrl(target: DeleteTarget): string {
  if (target.kind === 'level') {
    return `/api/hierarchy/config/levels?id=${encodeURIComponent(target.id)}`;
  }
  if (target.kind === 'position') {
    return `/api/hierarchy/config/positions?id=${encodeURIComponent(target.id)}`;
  }
  const params = new URLSearchParams({
    id: target.id,
    entityType: 'geo',
    name: target.name,
  });
  return `/api/hierarchy/config/geo-units?${params}`;
}

function RowActions({
  deleteReason,
  deleting,
  onEdit,
  onDelete,
}: {
  deleteReason: string | null;
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const deleteButton = (
    <Button
      variant="ghost"
      size="icon"
      disabled={deleting || deleteReason !== null}
      onClick={onDelete}
    >
      <Trash2 className="size-4 text-destructive" />
    </Button>
  );

  return (
    <div className="flex gap-1">
      <Button variant="ghost" size="icon" onClick={onEdit}>
        <Pencil className="size-4" />
      </Button>
      {deleteReason ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">{deleteButton}</span>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">{deleteReason}</TooltipContent>
        </Tooltip>
      ) : (
        deleteButton
      )}
    </div>
  );
}

export function HierarchyConfigAdmin({
  config,
  referenceCounts,
  onRefresh,
}: HierarchyConfigAdminProps) {
  const counts = referenceCounts ?? EMPTY_REFERENCE_COUNTS;
  const [editState, setEditState] = useState<EditState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const openCreate = (kind: ConfigKind) => {
    setEditState(defaultEditState(kind));
  };

  const openEditPosition = (item: CadreConfig['positions'][number]) => {
    setEditState({
      kind: 'position',
      id: item.id,
      name: item.name,
      key: '',
      sortOrder: item.sortOrder,
      isActive: item.isActive,
      levelId: item.levelId,
      geoType: 'division',
    });
  };

  const openEditLevel = (item: CadreConfig['levels'][number]) => {
    setEditState({
      kind: 'level',
      id: item.id,
      name: item.name,
      key: item.key,
      sortOrder: item.sortOrder,
      isActive: true,
      levelId: '',
      geoType: 'division',
    });
  };

  const openEditGeo = (item: CadreConfig['geoUnits'][number]) => {
    setEditState({
      kind: 'geo',
      id: item.id,
      name: item.name,
      key: '',
      sortOrder: item.sortOrder,
      isActive: item.isActive,
      levelId: '',
      geoType: item.type as EditState['geoType'],
    });
  };

  const closeDialog = () => setEditState(null);

  const save = async () => {
    if (!editState || !editState.name.trim()) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: editState.name.trim(),
        sortOrder: editState.sortOrder,
      };
      if (editState.id) body.id = editState.id;

      if (editState.kind === 'position' || editState.kind === 'geo') {
        body.isActive = editState.isActive;
      }

      if (editState.kind === 'position') {
        if (!editState.levelId) throw new Error('Level is required');
        body.levelId = editState.levelId;
      } else if (editState.kind === 'level') {
        body.key = editState.key.trim();
      } else {
        body.type = editState.geoType;
      }

      const url =
        editState.kind === 'position'
          ? '/api/hierarchy/config/positions'
          : editState.kind === 'level'
            ? '/api/hierarchy/config/levels'
            : '/api/hierarchy/config/geo-units';
      const res = await fetch(url, {
        method: editState.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ type: 'success', description: editState.id ? 'Updated' : 'Saved' });
      closeDialog();
      onRefresh();
    } catch (e) {
      toast({
        type: 'error',
        description: e instanceof Error ? e.message : 'Save failed',
      });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      const res = await fetch(getDeleteUrl(deleteTarget), { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ type: 'success', description: 'Deleted' });
      setDeleteTarget(null);
      onRefresh();
    } catch (e) {
      toast({
        type: 'error',
        description: e instanceof Error ? e.message : 'Delete failed',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const isEdit = Boolean(editState?.id);
  const canSave =
    Boolean(editState?.name.trim()) &&
    (editState?.kind === 'position'
      ? Boolean(editState.levelId)
      : editState?.kind === 'level'
        ? Boolean(editState.key.trim())
        : true);

  const editDialogTitle = (() => {
    if (!editState) return '';
    const action = isEdit ? 'Edit' : 'Add';
    if (editState.kind === 'position') return `${action} position`;
    if (editState.kind === 'level') return `${action} position level`;
    return `${action} geographic unit`;
  })();

  return (
    <TooltipProvider>
      <div>
        <Tabs defaultValue="positions">
          <TabsList>
            <TabsTrigger value="positions">Positions</TabsTrigger>
            <TabsTrigger value="levels">Position Levels</TabsTrigger>
            <TabsTrigger value="geo">Geographic</TabsTrigger>
          </TabsList>

          <TabsContent value="positions" className="space-y-4">
            <Button onClick={() => openCreate('position')}>Add position</Button>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {config.positions.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.name}</TableCell>
                      <TableCell>{p.levelName}</TableCell>
                      <TableCell>{p.sortOrder}</TableCell>
                      <TableCell>{p.isActive ? 'Yes' : 'No'}</TableCell>
                      <TableCell>
                        <RowActions
                          deleteReason={getDeleteBlockReason('position', p.id, p.name, counts)}
                          deleting={deletingId === p.id}
                          onEdit={() => openEditPosition(p)}
                          onDelete={() =>
                            setDeleteTarget({ kind: 'position', id: p.id, name: p.name })
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="levels" className="space-y-4">
            <Button onClick={() => openCreate('level')}>Add position level</Button>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Key</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {config.levels.map((level) => (
                    <TableRow key={level.id}>
                      <TableCell>{level.name}</TableCell>
                      <TableCell>
                        <code className="text-xs">{level.key}</code>
                      </TableCell>
                      <TableCell>{level.sortOrder}</TableCell>
                      <TableCell>
                        <RowActions
                          deleteReason={getDeleteBlockReason('level', level.id, level.name, counts)}
                          deleting={deletingId === level.id}
                          onEdit={() => openEditLevel(level)}
                          onDelete={() =>
                            setDeleteTarget({ kind: 'level', id: level.id, name: level.name })
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="geo" className="space-y-4">
            <Button onClick={() => openCreate('geo')}>Add geographic unit</Button>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>AC</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {config.geoUnits.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell className="capitalize">{g.type}</TableCell>
                      <TableCell>{g.name}</TableCell>
                      <TableCell>{g.acNo ?? '—'}</TableCell>
                      <TableCell>{g.sortOrder}</TableCell>
                      <TableCell>{g.isActive ? 'Yes' : 'No'}</TableCell>
                      <TableCell>
                        <RowActions
                          deleteReason={getDeleteBlockReason('geo', g.id, g.name, counts)}
                          deleting={deletingId === g.id}
                          onEdit={() => openEditGeo(g)}
                          onDelete={() =>
                            setDeleteTarget({ kind: 'geo', id: g.id, name: g.name })
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>

        <Dialog open={editState !== null} onOpenChange={(open) => !open && closeDialog()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editDialogTitle}</DialogTitle>
            </DialogHeader>
            {editState && (
              <div className="space-y-4">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={editState.name}
                    onChange={(e) =>
                      setEditState({ ...editState, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Sort order</Label>
                  <Input
                    type="number"
                    value={editState.sortOrder}
                    onChange={(e) =>
                      setEditState({
                        ...editState,
                        sortOrder: Number.parseInt(e.target.value, 10) || 0,
                      })
                    }
                  />
                </div>
                {(editState.kind === 'position' || editState.kind === 'geo') && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="config-active"
                      checked={editState.isActive}
                      onChange={(e) =>
                        setEditState({ ...editState, isActive: e.target.checked })
                      }
                    />
                    <Label htmlFor="config-active">Active</Label>
                  </div>
                )}
                {editState.kind === 'level' && (
                  <div>
                    <Label>Key</Label>
                    {isEdit ? (
                      <Input value={editState.key} disabled />
                    ) : (
                      <Input
                        value={editState.key}
                        placeholder="e.g. ward_committee"
                        onChange={(e) =>
                          setEditState({ ...editState, key: e.target.value })
                        }
                      />
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {isEdit
                        ? 'Key is fixed after creation because it is referenced in code.'
                        : 'Lowercase slug used in hierarchy logic (e.g. taluka, ward, booth).'}
                    </p>
                  </div>
                )}
                {editState.kind === 'position' && (
                  <div>
                    <Label>Level</Label>
                    <Select
                      value={editState.levelId}
                      onValueChange={(value) =>
                        setEditState({ ...editState, levelId: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        {config.levels.map((l) => (
                          <SelectItem key={l.id} value={l.id}>
                            {l.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {editState.kind === 'geo' && !isEdit && (
                  <div>
                    <Label>Type</Label>
                    <Select
                      value={editState.geoType}
                      onValueChange={(value) =>
                        setEditState({
                          ...editState,
                          geoType: value as EditState['geoType'],
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CADRE_GEOGRAPHIC_UNIT_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {CADRE_GEOGRAPHIC_UNIT_TYPE_LABELS[type]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {editState.kind === 'geo' && isEdit && (
                  <div>
                    <Label>Type</Label>
                    <Input
                      value={
                        CADRE_GEOGRAPHIC_UNIT_TYPE_LABELS[editState.geoType] ??
                        editState.geoType
                      }
                      disabled
                    />
                  </div>
                )}
                <Button
                  className="w-full"
                  disabled={saving || !canSave}
                  onClick={save}
                >
                  {saving ? 'Saving...' : isEdit ? 'Update' : 'Save'}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <ConfirmDialog
          open={deleteTarget !== null}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          title="Delete configuration item?"
          description={
            deleteTarget
              ? `This will permanently delete "${deleteTarget.name}". This action cannot be undone.`
              : ''
          }
          confirmText="Delete"
          cancelText="Cancel"
          variant="destructive"
          onConfirm={confirmDelete}
        />
      </div>
    </TooltipProvider>
  );
}
