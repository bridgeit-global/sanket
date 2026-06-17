'use client';

import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Trash2, UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { toast } from '@/components/toast';
import { UserPickerCombobox } from './user-picker-combobox';
import { VoterPickerCombobox } from './voter-picker-combobox';
import type { CadreConfig, CadreNodeDetail } from '@/lib/hierarchy/types';
import {
  getInheritedGeo,
  getPositionLevelKey,
  getSuggestedChildPositionId,
  positionNeedsBooth,
  positionNeedsWard,
} from '@/lib/hierarchy/child-position';
import {
  boothNoFromGeoUnit,
  getBoothGeoUnits,
  resolveBoothGeoId,
  wardGeoIdFromBoothGeoUnit,
} from '@/lib/hierarchy/booth-geo-units';
import { toPersistableParentId } from '@/lib/hierarchy/forest-builder';
import { formatGeoContextLine } from '@/lib/hierarchy/geo-attribution';
import {
  SELECT_NONE_VALUE,
  fromOptionalSelectValue,
  isValidSelectItemValue,
  toControlledSelectValue,
  toOptionalSelectValue,
} from '@/lib/hierarchy/select-utils';

export type QuickEditTarget =
  | { mode: 'edit'; node: CadreNodeDetail }
  | {
      mode: 'create';
      /** Real or synthetic (hub / vacant) node the create was launched from. */
      parent: CadreNodeDetail | null;
      verticalId: string;
      /** Vacant placeholder being filled — pre-fills position, ward, booth. */
      prefillFrom?: CadreNodeDetail | null;
    };

type Draft = {
  nodeId: string | null;
  parentId: string | null;
  verticalId: string;
  positionId: string;
  personName: string;
  personPhone: string;
  personEmail: string;
  userId: string | null;
  epicNumber: string | null;
  wardGeoId: string;
  boothGeoId: string;
  divisionId: string | null;
  notes: string;
  isVacant: boolean;
  parentLabel: string | null;
};

function draftFromTarget(target: QuickEditTarget, config: CadreConfig): Draft {
  if (target.mode === 'edit') {
    const node = target.node;
    return {
      nodeId: node.id,
      // Forest layout reparents roots under synthetic vertical hubs; never
      // persist those ids back to the database.
      parentId: toPersistableParentId(node.parentId),
      verticalId: node.verticalId,
      positionId: node.positionId,
      personName: node.personName ?? '',
      personPhone: node.personPhone ?? '',
      personEmail: node.personEmail ?? '',
      userId: node.userId,
      epicNumber: node.epicNumber,
      wardGeoId: node.wardGeoId ?? '',
      boothGeoId: resolveBoothGeoId(config.geoUnits, node.wardGeoId, node.boothNo),
      divisionId: node.divisionId,
      notes: node.notes ?? '',
      isVacant: node.isVacant,
      parentLabel: null,
    };
  }

  const { parent, prefillFrom } = target;
  const anchor = prefillFrom ?? parent;
  const inherited = getInheritedGeo(anchor);
  const wardFromParent =
    parent?.positionLevelKey === 'ward' ||
    parent?.positionLevelKey === 'ward_committee_group' ||
    parent?.positionLevelKey === 'booth_group'
      ? parent.wardGeoId ?? ''
      : '';
  const positionId =
    prefillFrom?.positionId ??
    getSuggestedChildPositionId(
      prefillFrom?.positionLevelKey ?? parent?.positionLevelKey ?? null,
      config,
    );

  return {
    nodeId: null,
    parentId: toPersistableParentId(prefillFrom?.parentId ?? parent?.id ?? null),
    verticalId: target.verticalId,
    positionId,
    personName: '',
    personPhone: '',
    personEmail: '',
    userId: null,
    epicNumber: null,
    wardGeoId: inherited.wardGeoId || wardFromParent,
    boothGeoId: resolveBoothGeoId(
      config.geoUnits,
      inherited.wardGeoId || wardFromParent,
      inherited.boothNo,
    ),
    divisionId: null,
    notes: '',
    isVacant: false,
    parentLabel: parent
      ? `${parent.positionName}${parent.personName ? ` — ${parent.personName}` : ''}`
      : null,
  };
}

interface HierarchyQuickEditProps {
  target: QuickEditTarget;
  config: CadreConfig;
  constituencyId: string;
  electionId: string;
  onClose: () => void;
  /** Called after every successful save / delete so the tree can refresh. */
  onSaved: () => void;
}

export function HierarchyQuickEdit({
  target,
  config,
  constituencyId,
  electionId,
  onClose,
  onSaved,
}: HierarchyQuickEditProps) {
  const [draft, setDraft] = useState<Draft>(() => draftFromTarget(target, config));
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setDraft(draftFromTarget(target, config));
  }, [target, config]);

  const isEdit = draft.nodeId !== null;
  const levelKey = getPositionLevelKey(draft.positionId, config);
  const needsWard = positionNeedsWard(levelKey);
  const needsBooth = positionNeedsBooth(levelKey);
  const position = config.positions.find((p) => p.id === draft.positionId);
  const wardUnits = config.geoUnits.filter(
    (g) => g.type === 'ward' && g.isActive && isValidSelectItemValue(g.id),
  );
  const boothUnits = useMemo(
    () =>
      getBoothGeoUnits(
        config.geoUnits,
        constituencyId,
        needsWard ? draft.wardGeoId : null,
      ).filter((g) => isValidSelectItemValue(g.id)),
    [config.geoUnits, constituencyId, needsWard, draft.wardGeoId],
  );
  const positions = config.positions.filter(
    (p) => p.isActive && isValidSelectItemValue(p.id),
  );

  const resolvedBoothNo =
    boothNoFromGeoUnit(config.geoUnits, draft.boothGeoId) ??
    (target.mode === 'create' ? target.prefillFrom?.boothNo ?? null : null);
  const resolvedWardGeoId =
    wardGeoIdFromBoothGeoUnit(config.geoUnits, draft.boothGeoId) ??
    draft.wardGeoId ??
    (target.mode === 'create' &&
    target.parent &&
    ['ward', 'ward_committee_group', 'booth_group'].includes(
      target.parent.positionLevelKey,
    )
      ? target.parent.wardGeoId ?? null
      : null) ??
    '';

  const canSave =
    Boolean(draft.positionId) &&
    (draft.isVacant ||
      Boolean(draft.personName.trim() || draft.userId || draft.epicNumber));

  const save = async (intent: 'close' | 'child' | 'sibling') => {
    setSaving(true);
    try {
      const payload = {
        parentId: draft.parentId,
        verticalId: draft.verticalId,
        positionId: draft.positionId,
        constituencyId,
        divisionId: draft.divisionId,
        wardGeoId: needsWard && resolvedWardGeoId ? resolvedWardGeoId : null,
        electionId: needsBooth && resolvedBoothNo ? electionId : null,
        boothNo: needsBooth && resolvedBoothNo ? resolvedBoothNo : null,
        personName: draft.personName.trim() || null,
        personPhone: draft.personPhone.trim() || null,
        personEmail: draft.personEmail.trim() || null,
        userId: draft.userId,
        epicNumber: draft.epicNumber,
        notes: draft.notes.trim() || null,
        isVacant: draft.isVacant,
      };

      const url = isEdit ? `/api/hierarchy/nodes/${draft.nodeId}` : '/api/hierarchy/nodes';
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Save failed');
      toast({ type: 'success', description: isEdit ? 'Node updated' : 'Node created' });
      onSaved();

      if (intent === 'close') {
        onClose();
        return;
      }

      const savedId: string | null = data.node?.id ?? draft.nodeId;
      const savedLabel = `${position?.name ?? 'Node'}${
        draft.personName ? ` — ${draft.personName}` : ''
      }`;

      if (intent === 'child') {
        setDraft({
          ...draft,
          nodeId: null,
          parentId: savedId,
          positionId: getSuggestedChildPositionId(levelKey, config),
          personName: '',
          personPhone: '',
          personEmail: '',
          userId: null,
          epicNumber: null,
          // Booth context carries down to committee members; ward carries to booths.
          boothGeoId: levelKey === 'booth' ? draft.boothGeoId : '',
          divisionId: null,
          notes: '',
          isVacant: false,
          parentLabel: savedLabel,
        });
      } else {
        setDraft({
          ...draft,
          nodeId: null,
          personName: '',
          personPhone: '',
          personEmail: '',
          userId: null,
          epicNumber: null,
          // Sibling at same level: keep ward for booths, clear booth/ward selection
          // that was specific to the saved node.
          wardGeoId: needsBooth ? resolvedWardGeoId : '',
          boothGeoId: '',
          divisionId: null,
          notes: '',
          isVacant: false,
        });
      }
    } catch (e) {
      toast({
        type: 'error',
        description: e instanceof Error ? e.message : 'Save failed',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!draft.nodeId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/hierarchy/nodes/${draft.nodeId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Delete failed');
      toast({ type: 'success', description: 'Node deleted' });
      onSaved();
      onClose();
    } catch (e) {
      toast({
        type: 'error',
        description: e instanceof Error ? e.message : 'Delete failed',
      });
    } finally {
      setSaving(false);
      setConfirmDelete(false);
    }
  };

  const geoLine = target.mode === 'edit' ? formatGeoContextLine(target.node) : null;

  return (
    <Card className="w-[340px] max-h-full overflow-y-auto shadow-xl border-2">
      <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
        <div className="pr-6 space-y-0.5">
          <CardTitle className="text-base leading-tight">
            {isEdit ? (
              <span className="inline-flex items-center gap-1.5">
                <Pencil className="size-3.5" /> {position?.name ?? 'Edit node'}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <UserPlus className="size-3.5" /> Add {position?.name ?? 'node'}
              </span>
            )}
          </CardTitle>
          {geoLine && (
            <p className="text-xs font-medium text-muted-foreground">{geoLine}</p>
          )}
          {!isEdit && draft.parentLabel && (
            <p className="text-xs text-muted-foreground">Under: {draft.parentLabel}</p>
          )}
        </div>
        <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <Label className="text-xs">Position</Label>
          <Select
            value={toControlledSelectValue(draft.positionId)}
            onValueChange={(v) => setDraft({ ...draft, positionId: v })}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select position" />
            </SelectTrigger>
            <SelectContent>
              {positions.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} ({p.levelName})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="quick-vacant"
            checked={draft.isVacant}
            onChange={(e) => setDraft({ ...draft, isVacant: e.target.checked })}
          />
          <Label htmlFor="quick-vacant" className="text-xs">
            Vacant position
          </Label>
        </div>

        {!draft.isVacant && (
          <Tabs defaultValue="manual">
            <TabsList className="grid w-full grid-cols-3 h-8">
              <TabsTrigger value="manual" className="text-xs">
                Manual
              </TabsTrigger>
              <TabsTrigger value="user" className="text-xs">
                Link user
              </TabsTrigger>
              <TabsTrigger value="voter" className="text-xs">
                Link voter
              </TabsTrigger>
            </TabsList>
            <TabsContent value="manual" className="space-y-2 pt-2">
              <Input
                placeholder="Name"
                className="h-9"
                value={draft.personName}
                onChange={(e) => setDraft({ ...draft, personName: e.target.value })}
              />
              <Input
                placeholder="Phone"
                className="h-9"
                value={draft.personPhone}
                onChange={(e) => setDraft({ ...draft, personPhone: e.target.value })}
              />
              <Input
                placeholder="Email"
                className="h-9"
                value={draft.personEmail}
                onChange={(e) => setDraft({ ...draft, personEmail: e.target.value })}
              />
            </TabsContent>
            <TabsContent value="user" className="pt-2">
              <UserPickerCombobox
                value={draft.userId}
                onSelect={(u) =>
                  setDraft({
                    ...draft,
                    userId: u?.id ?? null,
                    personName: u ? u.userId : draft.personName,
                  })
                }
              />
            </TabsContent>
            <TabsContent value="voter" className="pt-2">
              <VoterPickerCombobox
                value={draft.epicNumber}
                onSelect={(v) =>
                  setDraft({
                    ...draft,
                    epicNumber: v?.epicNumber ?? null,
                    personName: v ? v.fullName : draft.personName,
                  })
                }
              />
            </TabsContent>
          </Tabs>
        )}

        {needsWard && (
          <div>
            <Label className="text-xs">Ward</Label>
            <Select
              value={toOptionalSelectValue(draft.wardGeoId)}
              onValueChange={(v) =>
                setDraft({
                  ...draft,
                  wardGeoId: fromOptionalSelectValue(v),
                  boothGeoId: '',
                })
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select ward" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SELECT_NONE_VALUE}>None</SelectItem>
                {wardUnits.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {needsBooth && (
          <div>
            <Label className="text-xs">Booth / Part No</Label>
            <Select
              value={toOptionalSelectValue(draft.boothGeoId)}
              onValueChange={(v) => {
                const boothGeoId = fromOptionalSelectValue(v);
                const wardFromBooth = wardGeoIdFromBoothGeoUnit(
                  config.geoUnits,
                  boothGeoId,
                );
                setDraft({
                  ...draft,
                  boothGeoId,
                  wardGeoId: wardFromBooth ?? draft.wardGeoId,
                });
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select booth" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SELECT_NONE_VALUE}>None</SelectItem>
                {boothUnits.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div>
          <Label className="text-xs">Notes</Label>
          <Input
            className="h-9"
            placeholder="Optional"
            value={draft.notes}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
          />
        </div>

        <div className="space-y-2 pt-1">
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1"
              disabled={saving || !canSave}
              onClick={() => save('close')}
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
            {isEdit && (
              <Button
                size="sm"
                variant="ghost"
                disabled={saving}
                onClick={() => setConfirmDelete(true)}
                aria-label="Delete node"
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            )}
          </div>
          {levelKey !== 'booth_committee' && (
            <Button
              size="sm"
              variant="secondary"
              className="w-full"
              disabled={saving || !canSave}
              onClick={() => save('child')}
            >
              <Plus className="size-3.5 mr-1" /> Save & add child
            </Button>
          )}
          {!isEdit && levelKey !== 'taluka' && (
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              disabled={saving || !canSave}
              onClick={() => save('sibling')}
            >
              <Plus className="size-3.5 mr-1" /> Save & add another
            </Button>
          )}
        </div>
      </CardContent>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this node?"
        description="The node will be permanently removed. Nodes with subordinates cannot be deleted."
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </Card>
  );
}
