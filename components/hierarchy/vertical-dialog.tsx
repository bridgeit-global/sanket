'use client';

import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { toast } from '@/components/toast';
import type {
  CadreConfig,
  CadreConfigReferenceCounts,
} from '@/lib/hierarchy/types';
import { isValidSelectItemValue } from '@/lib/hierarchy/select-utils';

const NEW_CATEGORY_VALUE = '__new_category__';

interface VerticalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: CadreConfig;
  referenceCounts: CadreConfigReferenceCounts | null;
  /** Existing vertical to edit; null for create. */
  vertical: CadreConfig['verticals'][number] | null;
  /** Receives the saved vertical id (new hubs are auto-expanded). */
  onSaved: (verticalId: string | null) => void;
}

export function VerticalDialog({
  open,
  onOpenChange,
  config,
  referenceCounts,
  vertical,
  onSaved,
}: VerticalDialogProps) {
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [maxGeoLevel, setMaxGeoLevel] = useState<'ward' | 'booth'>('ward');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(vertical?.name ?? '');
    setCategoryId(vertical?.categoryId ?? config.categories[0]?.id ?? '');
    setNewCategoryName('');
    setMaxGeoLevel(vertical?.maxGeoLevel === 'booth' ? 'booth' : 'ward');
  }, [open, vertical, config.categories]);

  const isEdit = Boolean(vertical);
  const nodeCount = vertical
    ? referenceCounts?.verticals[vertical.id]?.nodeCount ?? 0
    : 0;
  const creatingCategory = categoryId === NEW_CATEGORY_VALUE;
  const canSave =
    Boolean(name.trim()) &&
    (creatingCategory ? Boolean(newCategoryName.trim()) : Boolean(categoryId));

  const save = async () => {
    setSaving(true);
    try {
      let finalCategoryId = categoryId;

      if (creatingCategory) {
        const catRes = await fetch('/api/hierarchy/config/geo-units', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entityType: 'category',
            name: newCategoryName.trim(),
            sortOrder: 99,
            isActive: true,
          }),
        });
        const catData = await catRes.json();
        if (!catRes.ok) throw new Error(catData.error ?? 'Failed to create category');
        finalCategoryId = catData.category?.id;
        if (!finalCategoryId) throw new Error('Category created but id missing');
      }

      const body: Record<string, unknown> = {
        name: name.trim(),
        categoryId: finalCategoryId,
        sortOrder: vertical?.sortOrder ?? 99,
        isActive: true,
        maxGeoLevel,
      };
      if (vertical) body.id = vertical.id;

      const res = await fetch('/api/hierarchy/config/verticals', {
        method: vertical ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Save failed');
      toast({
        type: 'success',
        description: vertical ? 'Vertical updated' : 'Vertical created',
      });
      onOpenChange(false);
      onSaved(data.vertical?.id ?? vertical?.id ?? null);
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
    if (!vertical) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/hierarchy/config/verticals?id=${encodeURIComponent(vertical.id)}`,
        { method: 'DELETE' },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Delete failed');
      toast({ type: 'success', description: 'Vertical deleted' });
      onOpenChange(false);
      onSaved(null);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit vertical' : 'New vertical'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Yuvak Congress"
              autoFocus
            />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {config.categories
                  .filter((c) => c.isActive && isValidSelectItemValue(c.id))
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                <SelectItem value={NEW_CATEGORY_VALUE}>+ New category…</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Max hierarchy depth</Label>
            <Select
              value={maxGeoLevel}
              onValueChange={(v) => setMaxGeoLevel(v === 'booth' ? 'booth' : 'ward')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ward">Taluka → Ward</SelectItem>
                <SelectItem value="booth">Taluka → Ward → Booth</SelectItem>
              </SelectContent>
            </Select>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Only Basic typically includes booth-level positions.
            </p>
          </div>
          {creatingCategory && (
            <div>
              <Label>New category name</Label>
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g. Frontal Organisations"
              />
            </div>
          )}
          <div className="flex gap-2">
            <Button className="flex-1" disabled={saving || !canSave} onClick={save}>
              {saving ? 'Saving...' : isEdit ? 'Update' : 'Create vertical'}
            </Button>
            {isEdit && (
              <Button
                variant="ghost"
                disabled={saving || nodeCount > 0}
                title={
                  nodeCount > 0
                    ? `Cannot delete — ${nodeCount} cadre node${nodeCount === 1 ? '' : 's'} assigned`
                    : 'Delete vertical'
                }
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            )}
          </div>
          {isEdit && nodeCount > 0 && (
            <p className="text-xs text-muted-foreground">
              This vertical has {nodeCount} cadre node{nodeCount === 1 ? '' : 's'} and
              cannot be deleted.
            </p>
          )}
        </div>

        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title="Delete this vertical?"
          description={`"${vertical?.name}" will be permanently deleted. This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          variant="destructive"
          onConfirm={handleDelete}
        />
      </DialogContent>
    </Dialog>
  );
}
