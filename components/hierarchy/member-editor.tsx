'use client';

import { useEffect, useState } from 'react';
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
import type { CadreConfig, CadreMemberCard } from '@/lib/hierarchy/types';
import {
  extractBoothNumber,
  getBoothGeoUnits,
} from '@/lib/hierarchy/booth-geo-units';
import {
  positionNeedsBooth,
  positionNeedsTaluka,
  positionNeedsWard,
} from '@/lib/hierarchy/member-list';
import {
  SELECT_NONE_VALUE,
  fromOptionalSelectValue,
  isValidSelectItemValue,
  toControlledSelectValue,
  toOptionalSelectValue,
} from '@/lib/hierarchy/select-utils';

export type MemberEditorTarget =
  | { mode: 'edit'; member: CadreMemberCard }
  | { mode: 'create' };

type PostDraft = {
  key: string;
  positionId: string;
  talukaId: string;
  wardGeoId: string;
  boothNo: string;
  label: string;
  isPrimary: boolean;
};

type Draft = {
  memberId: string | null;
  personName: string;
  personPhone: string;
  personEmail: string;
  photoUrl: string;
  userId: string | null;
  epicNumber: string | null;
  notes: string;
  verticalIds: string[];
  primaryVerticalId: string | null;
  posts: PostDraft[];
};

let postKeySeq = 0;
function newPostKey(): string {
  postKeySeq += 1;
  return `post-${postKeySeq}`;
}

function emptyPost(positionId = ''): PostDraft {
  return {
    key: newPostKey(),
    positionId,
    talukaId: '',
    wardGeoId: '',
    boothNo: '',
    label: '',
    isPrimary: false,
  };
}

function draftFromTarget(target: MemberEditorTarget): Draft {
  if (target.mode === 'edit') {
    const m = target.member;
    return {
      memberId: m.id,
      personName: m.personName ?? '',
      personPhone: m.personPhone ?? '',
      personEmail: m.personEmail ?? '',
      photoUrl: m.photoUrl ?? '',
      userId: m.userId,
      epicNumber: m.epicNumber,
      notes: m.notes ?? '',
      verticalIds: m.verticals.map((v) => v.id),
      primaryVerticalId: m.verticals.find((v) => v.isPrimary)?.id ?? m.verticals[0]?.id ?? null,
      posts:
        m.posts.length > 0
          ? m.posts.map((p) => ({
              key: newPostKey(),
              positionId: p.positionId,
              talukaId: p.talukaId ?? '',
              wardGeoId: p.wardGeoId ?? '',
              boothNo: p.boothNo ?? '',
              label: p.label ?? '',
              isPrimary: p.isPrimary,
            }))
          : [emptyPost()],
    };
  }
  return {
    memberId: null,
    personName: '',
    personPhone: '',
    personEmail: '',
    photoUrl: '',
    userId: null,
    epicNumber: null,
    notes: '',
    verticalIds: [],
    primaryVerticalId: null,
    posts: [{ ...emptyPost(), isPrimary: true }],
  };
}

interface MemberEditorProps {
  target: MemberEditorTarget;
  config: CadreConfig;
  constituencyId: string;
  electionId: string;
  onClose: () => void;
  onSaved: () => void;
}

export function MemberEditor({
  target,
  config,
  constituencyId,
  electionId,
  onClose,
  onSaved,
}: MemberEditorProps) {
  const [draft, setDraft] = useState<Draft>(() => draftFromTarget(target));
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setDraft(draftFromTarget(target));
  }, [target]);

  const isEdit = draft.memberId !== null;
  const positions = config.positions.filter(
    (p) => p.isActive && isValidSelectItemValue(p.id),
  );
  const wardUnits = config.geoUnits.filter(
    (g) => g.type === 'ward' && g.isActive && isValidSelectItemValue(g.id),
  );
  const talukaUnits = config.geoUnits.filter(
    (g) => g.type === 'taluka' && g.isActive && isValidSelectItemValue(g.id),
  );

  const levelKeyFor = (positionId: string) =>
    config.positions.find((p) => p.id === positionId)?.levelKey ?? null;

  const boothOptionsForPost = (post: PostDraft) => {
    if (!post.wardGeoId) return [];
    const options = getBoothGeoUnits(
      config.geoUnits,
      constituencyId,
      post.wardGeoId,
    ).map((g) => ({
      boothNo: extractBoothNumber(g.name) ?? g.name.trim(),
      label: g.name,
    }));
    if (post.boothNo && !options.some((b) => b.boothNo === post.boothNo)) {
      return [
        { boothNo: post.boothNo, label: `Booth ${post.boothNo}` },
        ...options,
      ];
    }
    return options;
  };

  const toggleVertical = (verticalId: string, checked: boolean) => {
    setDraft((prev) => {
      const set = new Set(prev.verticalIds);
      if (checked) set.add(verticalId);
      else set.delete(verticalId);
      const verticalIds = [...set];
      let primaryVerticalId = prev.primaryVerticalId;
      if (!primaryVerticalId || !set.has(primaryVerticalId)) {
        primaryVerticalId = verticalIds[0] ?? null;
      }
      return { ...prev, verticalIds, primaryVerticalId };
    });
  };

  const updatePost = (key: string, patch: Partial<PostDraft>) => {
    setDraft((prev) => ({
      ...prev,
      posts: prev.posts.map((p) => (p.key === key ? { ...p, ...patch } : p)),
    }));
  };

  const setPrimaryPost = (key: string) => {
    setDraft((prev) => ({
      ...prev,
      posts: prev.posts.map((p) => ({ ...p, isPrimary: p.key === key })),
    }));
  };

  const addPost = () => {
    setDraft((prev) => ({ ...prev, posts: [...prev.posts, emptyPost()] }));
  };

  const removePost = (key: string) => {
    setDraft((prev) => {
      const posts = prev.posts.filter((p) => p.key !== key);
      if (posts.length > 0 && !posts.some((p) => p.isPrimary)) {
        posts[0] = { ...posts[0], isPrimary: true };
      }
      return { ...prev, posts };
    });
  };

  const hasPerson = Boolean(
    draft.personName.trim() || draft.userId || draft.epicNumber,
  );
  const validPosts = draft.posts.filter((p) => p.positionId);
  const canSave =
    hasPerson && draft.verticalIds.length > 0 && validPosts.length > 0;

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        constituencyId,
        personName: draft.personName.trim() || null,
        personPhone: draft.personPhone.trim() || null,
        personEmail: draft.personEmail.trim() || null,
        photoUrl: draft.photoUrl.trim() || null,
        userId: draft.userId,
        epicNumber: draft.epicNumber,
        notes: draft.notes.trim() || null,
        verticalIds: draft.verticalIds,
        primaryVerticalId: draft.primaryVerticalId,
        posts: validPosts.map((p, index) => {
          const levelKey = levelKeyFor(p.positionId);
          const needsWard = positionNeedsWard(levelKey);
          const needsBooth = positionNeedsBooth(levelKey);
          const needsTaluka = positionNeedsTaluka(levelKey);
          return {
            positionId: p.positionId,
            talukaId: needsTaluka && p.talukaId ? p.talukaId : null,
            wardGeoId: needsWard && p.wardGeoId ? p.wardGeoId : null,
            boothNo: needsBooth && p.boothNo.trim() ? p.boothNo.trim() : null,
            electionId: needsBooth && p.boothNo.trim() ? electionId : null,
            label: p.label.trim() || null,
            isPrimary: p.isPrimary,
            sortOrder: index,
          };
        }),
      };

      const url = isEdit
        ? `/api/hierarchy/members/${draft.memberId}`
        : '/api/hierarchy/members';
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Save failed');
      toast({
        type: 'success',
        description: isEdit ? 'Member updated' : 'Member created',
      });
      onSaved();
      onClose();
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
    if (!draft.memberId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/hierarchy/members/${draft.memberId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Delete failed');
      toast({ type: 'success', description: 'Member deleted' });
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

  return (
    <Card className="flex max-h-full w-[360px] max-w-full flex-col overflow-hidden border-2 shadow-xl">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="inline-flex items-center gap-1.5 text-base leading-tight">
          {isEdit ? (
            <>
              <Pencil className="size-3.5" /> Edit member
            </>
          ) : (
            <>
              <UserPlus className="size-3.5" /> Add member
            </>
          )}
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 shrink-0"
          onClick={onClose}
        >
          <X className="size-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 overflow-y-auto text-sm">
        <Tabs defaultValue="manual">
          <TabsList className="grid h-8 w-full grid-cols-3">
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
            <Input
              placeholder="Voter ID / EPIC"
              className="h-9"
              value={draft.epicNumber ?? ''}
              onChange={(e) =>
                setDraft({ ...draft, epicNumber: e.target.value.trim() || null })
              }
            />
            <Input
              placeholder="Photo URL"
              className="h-9"
              value={draft.photoUrl}
              onChange={(e) => setDraft({ ...draft, photoUrl: e.target.value })}
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

        <div>
          <Label className="text-xs">Verticals</Label>
          <div className="mt-1 max-h-32 space-y-1 overflow-y-auto rounded-md border p-2">
            {config.verticals
              .filter((v) => v.isActive)
              .map((v) => {
                const checked = draft.verticalIds.includes(v.id);
                return (
                  <div key={v.id} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-xs">
                      <Checkbox
                        checked={checked}
                        onChange={(e) => toggleVertical(v.id, e.target.checked)}
                      />
                      {v.name}
                    </span>
                    {checked && (
                      <button
                        type="button"
                        className={`text-[10px] uppercase tracking-wide ${
                          draft.primaryVerticalId === v.id
                            ? 'font-semibold text-primary'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                        onClick={() =>
                          setDraft({ ...draft, primaryVerticalId: v.id })
                        }
                      >
                        {draft.primaryVerticalId === v.id ? 'Primary' : 'Set primary'}
                      </button>
                    )}
                  </div>
                );
              })}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Posts</Label>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={addPost}
            >
              <Plus className="mr-1 size-3.5" /> Add post
            </Button>
          </div>
          {draft.posts.map((post) => {
            const levelKey = levelKeyFor(post.positionId);
            const needsWard = positionNeedsWard(levelKey);
            const needsBooth = positionNeedsBooth(levelKey);
            const needsTaluka = positionNeedsTaluka(levelKey);
            return (
              <div key={post.key} className="space-y-2 rounded-md border p-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Checkbox
                      checked={post.isPrimary}
                      onChange={() => setPrimaryPost(post.key)}
                    />
                    Primary post
                  </span>
                  {draft.posts.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-6"
                      aria-label="Remove post"
                      onClick={() => removePost(post.key)}
                    >
                      <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
                <Select
                  value={toControlledSelectValue(post.positionId)}
                  onValueChange={(v) => updatePost(post.key, { positionId: v })}
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
                {needsTaluka && (
                  <Select
                    value={toOptionalSelectValue(post.talukaId)}
                    onValueChange={(v) =>
                      updatePost(post.key, { talukaId: fromOptionalSelectValue(v) })
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select taluka" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SELECT_NONE_VALUE}>None</SelectItem>
                      {talukaUnits.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {needsWard && (
                  <Select
                    value={toOptionalSelectValue(post.wardGeoId)}
                    onValueChange={(v) =>
                      updatePost(post.key, {
                        wardGeoId: fromOptionalSelectValue(v),
                        boothNo: '',
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
                )}
                {needsBooth && (
                  <Select
                    value={toOptionalSelectValue(post.boothNo)}
                    onValueChange={(v) =>
                      updatePost(post.key, { boothNo: fromOptionalSelectValue(v) })
                    }
                    disabled={!post.wardGeoId}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue
                        placeholder={
                          post.wardGeoId ? 'Select booth' : 'Select ward first'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SELECT_NONE_VALUE}>None</SelectItem>
                      {boothOptionsForPost(post).map((b) => (
                        <SelectItem key={b.boothNo} value={b.boothNo}>
                          {b.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Input
                  placeholder="Custom label (optional, e.g. Mandal Head)"
                  className="h-9"
                  value={post.label}
                  onChange={(e) => updatePost(post.key, { label: e.target.value })}
                />
              </div>
            );
          })}
        </div>

        <div>
          <Label className="text-xs">Notes</Label>
          <Input
            className="h-9"
            placeholder="Optional"
            value={draft.notes}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
          />
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            className="flex-1"
            disabled={saving || !canSave}
            onClick={save}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
          {isEdit && (
            <Button
              size="sm"
              variant="ghost"
              disabled={saving}
              onClick={() => setConfirmDelete(true)}
              aria-label="Delete member"
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          )}
        </div>
      </CardContent>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this member?"
        description="The member and all their posts will be permanently removed."
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </Card>
  );
}
