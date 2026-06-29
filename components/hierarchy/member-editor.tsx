'use client';

import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { useTranslations } from '@/hooks/use-translations';
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
    posts: [],
  };
}

interface MemberEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: MemberEditorTarget;
  config: CadreConfig;
  constituencyId: string;
  electionId: string;
  onSaved: () => void;
}

export function MemberEditor({
  open,
  onOpenChange,
  target,
  config,
  constituencyId,
  electionId,
  onSaved,
}: MemberEditorProps) {
  const { t } = useTranslations();
  const [draft, setDraft] = useState<Draft>(() => draftFromTarget(target));
  const [enrollStep, setEnrollStep] = useState<1 | 2>(1);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setDraft(draftFromTarget(target));
    setEnrollStep(target.mode === 'create' ? 1 : 2);
  }, [target]);

  const isEdit = draft.memberId !== null;
  const isCreateWizard = target.mode === 'create';
  const showPartyStep = isCreateWizard ? enrollStep === 1 : true;
  const showPostStep = isCreateWizard ? enrollStep === 2 : true;
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
  const canEnrollPartyMember =
    hasPerson && draft.verticalIds.length > 0 && !saving;
  const canAssignPost = validPosts.length > 0 && !saving;
  const canSaveEdit =
    hasPerson && draft.verticalIds.length > 0 && !saving;

  const buildPayload = (includePosts: boolean) => ({
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
    posts: includePosts
      ? validPosts.map((p, index) => {
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
      })
      : [],
  });

  const enrollPartyMember = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/hierarchy/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(false)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Save failed');
      const memberId = data.member?.id as string | undefined;
      if (!memberId) throw new Error('Save failed');
      setDraft((prev) => ({
        ...prev,
        memberId,
        posts:
          prev.posts.length > 0
            ? prev.posts
            : [{ ...emptyPost(), isPrimary: true }],
      }));
      toast({ type: 'success', description: t('hierarchyModule.memberCreated') });
      onSaved();
      setEnrollStep(2);
    } catch (e) {
      toast({
        type: 'error',
        description: e instanceof Error ? e.message : 'Save failed',
      });
    } finally {
      setSaving(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = buildPayload(true);
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
        description: isCreateWizard && enrollStep === 2
          ? t('hierarchyModule.postAssigned')
          : isEdit
            ? t('hierarchyModule.memberUpdated')
            : t('hierarchyModule.memberCreated'),
      });
      onSaved();
      onOpenChange(false);
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
      onOpenChange(false);
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
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[85dvh] max-w-md flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
          <DialogHeader className="shrink-0 px-6 pt-6 pb-2">
            <DialogTitle className="inline-flex items-center gap-1.5 text-base leading-tight">
              {isEdit ? (
                <>
                  <Pencil className="size-3.5" /> {t('hierarchyModule.editMember')}
                </>
              ) : (
                <>
                  <UserPlus className="size-3.5" /> {t('hierarchyModule.enrollMember')}
                </>
              )}
            </DialogTitle>
            {isCreateWizard && (
              <div className="mt-3 flex gap-2">
                <div
                  className={`flex-1 rounded-lg border px-2 py-1.5 text-center text-[11px] font-medium ${
                    enrollStep === 1
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground'
                  }`}
                >
                  1. {t('hierarchyModule.partyMembership')}
                </div>
                <div
                  className={`flex-1 rounded-lg border px-2 py-1.5 text-center text-[11px] font-medium ${
                    enrollStep === 2
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground'
                  }`}
                >
                  2. {t('hierarchyModule.postAssignment')}
                </div>
              </div>
            )}
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-6 text-sm">
            {showPartyStep && (
              <div className="space-y-3">
                {isCreateWizard ? (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                    <p className="text-xs font-semibold">{t('hierarchyModule.stepPartyMember')}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {t('hierarchyModule.stepPartyMemberHint')}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs font-semibold text-muted-foreground">
                    {t('hierarchyModule.partyMembership')}
                  </p>
                )}
                <Tabs defaultValue={isCreateWizard ? 'voter' : 'manual'}>
                  <TabsList className="grid w-full grid-cols-3">
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
                                className={`text-[10px] uppercase tracking-wide ${draft.primaryVerticalId === v.id
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

                {!isCreateWizard && (
                  <div>
                    <Label className="text-xs">Notes</Label>
                    <Input
                      className="h-9"
                      placeholder="Optional"
                      value={draft.notes}
                      onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                    />
                  </div>
                )}
              </div>
            )}

            {showPostStep && (
              <div className="space-y-3">
                {isCreateWizard ? (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                    <p className="text-xs font-semibold">{t('hierarchyModule.stepAssignPost')}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {t('hierarchyModule.stepAssignPostHint')}
                    </p>
                    {draft.personName.trim() && (
                      <p className="mt-1 text-[11px] font-medium">
                        {t('hierarchyModule.enrolledAs', { name: draft.personName.trim() })}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs font-semibold text-muted-foreground">
                    {t('hierarchyModule.postAssignment')}
                  </p>
                )}

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
                  {draft.posts.length === 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          posts: [{ ...emptyPost(), isPrimary: true }],
                        }))
                      }
                    >
                      <Plus className="mr-1 size-3.5" /> Add post
                    </Button>
                  )}
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
                              {talukaUnits.map((taluka) => (
                                <SelectItem key={taluka.id} value={taluka.id}>
                                  {taluka.name}
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

                {isCreateWizard && (
                  <div>
                    <Label className="text-xs">Notes</Label>
                    <Input
                      className="h-9"
                      placeholder="Optional"
                      value={draft.notes}
                      onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              {isCreateWizard && enrollStep === 1 ? (
                <Button
                  size="sm"
                  className="flex-1"
                  disabled={!canEnrollPartyMember}
                  onClick={enrollPartyMember}
                >
                  {saving ? 'Saving...' : t('hierarchyModule.enrollAndContinue')}
                </Button>
              ) : isCreateWizard && enrollStep === 2 ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={saving}
                    onClick={() => setEnrollStep(1)}
                  >
                    Back
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    disabled={saving}
                    onClick={() => onOpenChange(false)}
                  >
                    {t('hierarchyModule.assignLater')}
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    disabled={!canAssignPost}
                    onClick={save}
                  >
                    {saving ? 'Saving...' : t('hierarchyModule.assignPost')}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="sm"
                    className="flex-1"
                    disabled={saving || !canSaveEdit}
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
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
    </>
  );
}
