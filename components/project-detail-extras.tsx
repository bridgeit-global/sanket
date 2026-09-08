'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { FileText, Loader2, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations } from '@/hooks/use-translations';
import { AdmMilestoneRow } from '@/components/adm/adm-milestone-row';
import {
  ProjectPhotoGallery,
  type ProjectPhotoItem,
} from '@/components/projects/project-photo-gallery';
import { toast } from '@/components/toast';
import { getTodayDateStringIST } from '@/lib/ist-date';
import type {
  ProjectAttachment,
  ProjectGroundMedia,
  ProjectGroundMediaPhotoType,
  ProjectDocumentKind,
  ProjectPhysicalStatus,
  ProjectApprovalStatus,
  ProjectNocStatus,
} from '@/lib/db/schema';

export type ProjectFundAllocationView = {
  id: string;
  fundRecordId: string;
  allocatedBudget: number;
  categoryName: string;
  categoryCode: string;
  fundRecord: {
    id: string;
    financialYear: string;
    budget: number;
    categoryId: string;
  };
};

interface ProjectDetailExtrasProps {
  projectId: string;
  physicalStatus: ProjectPhysicalStatus;
  bhoomiPujanDone: boolean;
  bhoomiPujanDate: string | null;
  lokarpanDone: boolean;
  lokarpanDate: string | null;
  documents: ProjectAttachment[];
  groundMedia: ProjectGroundMedia[];
  onPatchProject: (patch: Record<string, unknown>) => Promise<void>;
  onRefresh: () => Promise<void>;
  onUnsavedChange?: (dirty: boolean) => void;
}

const DOC_KINDS: ProjectDocumentKind[] = [
  'approval_pdf',
  'sanction_letter',
  'noc',
  'supporting',
  'request_letter',
];

const EXECUTION_PHOTO_TYPES = ['bhoomi_pujan', 'lokarpan'] as const;
const GROUND_PHOTO_TYPES = ['before', 'after'] as const;
const PHOTO_QUEUE_TYPES = [
  ...GROUND_PHOTO_TYPES,
  ...EXECUTION_PHOTO_TYPES,
] as const;

type PendingPhoto = {
  localId: string;
  file: File;
  previewUrl: string;
};

function emptyPendingAdds(): Record<
  ProjectGroundMediaPhotoType,
  PendingPhoto[]
> {
  return { before: [], after: [], bhoomi_pujan: [], lokarpan: [] };
}

function emptyPendingDeletes(): Record<
  ProjectGroundMediaPhotoType,
  string[]
> {
  return { before: [], after: [], bhoomi_pujan: [], lokarpan: [] };
}

export function ProjectDetailExtras({
  projectId,
  physicalStatus,
  bhoomiPujanDone,
  bhoomiPujanDate,
  lokarpanDone,
  lokarpanDate,
  documents,
  groundMedia,
  onPatchProject,
  onRefresh,
  onUnsavedChange,
}: ProjectDetailExtrasProps) {
  const { t } = useTranslations();
  const docInputRef = useRef<HTMLInputElement>(null);
  const [docKind, setDocKind] = useState<ProjectDocumentKind>('supporting');
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<ProjectPhotoItem | null>(
    null,
  );
  const [savingExecution, setSavingExecution] = useState(false);
  const [savingGround, setSavingGround] = useState(false);
  const [pendingPhotoAdds, setPendingPhotoAdds] =
    useState(emptyPendingAdds);
  const [pendingPhotoDeletes, setPendingPhotoDeletes] =
    useState(emptyPendingDeletes);
  const pendingPhotoAddsRef = useRef(pendingPhotoAdds);
  pendingPhotoAddsRef.current = pendingPhotoAdds;
  const [executionDraft, setExecutionDraft] = useState({
    physicalStatus,
    bhoomiPujanDone,
    bhoomiPujanDate,
    lokarpanDone,
    lokarpanDate,
  });

  useEffect(() => {
    setExecutionDraft((prev) => {
      const dirty =
        prev.physicalStatus !== physicalStatus ||
        prev.bhoomiPujanDone !== bhoomiPujanDone ||
        (prev.bhoomiPujanDate || null) !== (bhoomiPujanDate || null) ||
        prev.lokarpanDone !== lokarpanDone ||
        (prev.lokarpanDate || null) !== (lokarpanDate || null);
      if (dirty) return prev;
      return {
        physicalStatus,
        bhoomiPujanDone,
        bhoomiPujanDate,
        lokarpanDone,
        lokarpanDate,
      };
    });
  }, [
    physicalStatus,
    bhoomiPujanDone,
    bhoomiPujanDate,
    lokarpanDone,
    lokarpanDate,
  ]);

  useEffect(() => {
    return () => {
      for (const type of PHOTO_QUEUE_TYPES) {
        for (const photo of pendingPhotoAddsRef.current[type]) {
          URL.revokeObjectURL(photo.previewUrl);
        }
      }
    };
  }, []);

  const executionFieldsDirty = useMemo(
    () =>
      executionDraft.physicalStatus !== physicalStatus ||
      executionDraft.bhoomiPujanDone !== bhoomiPujanDone ||
      (executionDraft.bhoomiPujanDate || null) !== (bhoomiPujanDate || null) ||
      executionDraft.lokarpanDone !== lokarpanDone ||
      (executionDraft.lokarpanDate || null) !== (lokarpanDate || null),
    [
      executionDraft,
      physicalStatus,
      bhoomiPujanDone,
      bhoomiPujanDate,
      lokarpanDone,
      lokarpanDate,
    ],
  );

  const kindLabel = (kind: ProjectDocumentKind) => {
    switch (kind) {
      case 'approval_pdf':
        return t('projects.kindApprovalPdf');
      case 'sanction_letter':
        return t('projects.kindSanctionLetter');
      case 'noc':
        return t('projects.kindNoc');
      case 'request_letter':
        return t('projects.kindRequestLetter');
      default:
        return t('projects.kindSupporting');
    }
  };

  const photosByType = (type: ProjectGroundMediaPhotoType) =>
    groundMedia.filter((m) => m.photoType === type);

  const photosDirty = (types: readonly ProjectGroundMediaPhotoType[]) =>
    types.some(
      (type) =>
        pendingPhotoAdds[type].length > 0 ||
        pendingPhotoDeletes[type].length > 0,
    );

  const executionPhotosDirty = photosDirty(EXECUTION_PHOTO_TYPES);
  const executionDirty = executionFieldsDirty || executionPhotosDirty;
  const groundDirty = photosDirty(GROUND_PHOTO_TYPES);

  useEffect(() => {
    onUnsavedChange?.(executionDirty || groundDirty);
  }, [executionDirty, groundDirty, onUnsavedChange]);

  const visiblePhotos = (
    type: ProjectGroundMediaPhotoType,
  ): ProjectPhotoItem[] => {
    const existing = photosByType(type)
      .filter((photo) => !pendingPhotoDeletes[type].includes(photo.id))
      .map((photo) => ({
        id: photo.id,
        fileUrl: photo.fileUrl,
        fileName: photo.fileName,
      }));
    const pending = pendingPhotoAdds[type].map((photo) => ({
      id: photo.localId,
      fileUrl: photo.previewUrl,
      fileName: photo.file.name,
    }));
    return [...existing, ...pending];
  };

  const latestByGroup = new Map<string, ProjectAttachment>();
  for (const doc of documents) {
    const existing = latestByGroup.get(doc.versionGroupId);
    if (!existing || doc.version > existing.version) {
      latestByGroup.set(doc.versionGroupId, doc);
    }
  }
  const latestDocs = Array.from(latestByGroup.values());

  const uploadDocument = async (file: File, versionGroupId?: string) => {
    setUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentKind', docKind);
      if (versionGroupId) formData.append('versionGroupId', versionGroupId);
      const res = await fetch(`/api/projects/${projectId}/documents`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Upload failed');
      }
      await onRefresh();
    } finally {
      setUploadingDoc(false);
      if (docInputRef.current) docInputRef.current.value = '';
    }
  };

  const deleteDocument = async (documentId: string) => {
    const res = await fetch(
      `/api/projects/${projectId}/documents?documentId=${documentId}`,
      { method: 'DELETE' },
    );
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Delete failed');
    }
    await onRefresh();
  };

  const postPhoto = async (
    type: ProjectGroundMediaPhotoType,
    file: File,
  ) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    const res = await fetch(`/api/projects/${projectId}/photos`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Upload failed');
    }
  };

  const removePhoto = async (mediaId: string) => {
    const res = await fetch(
      `/api/projects/${projectId}/photos?mediaId=${mediaId}`,
      { method: 'DELETE' },
    );
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Delete failed');
    }
  };

  const queuePhotoUpload = async (
    type: ProjectGroundMediaPhotoType,
    files: File[],
  ) => {
    if (files.length === 0) return;
    const additions = files.map((file) => ({
      localId: `local-${crypto.randomUUID()}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setPendingPhotoAdds((prev) => ({
      ...prev,
      [type]: [...prev[type], ...additions],
    }));
  };

  const queuePhotoDelete = async (
    type: ProjectGroundMediaPhotoType,
    mediaId: string,
  ) => {
    const local = pendingPhotoAdds[type].find(
      (photo) => photo.localId === mediaId,
    );
    if (local) {
      URL.revokeObjectURL(local.previewUrl);
      setPendingPhotoAdds((prev) => ({
        ...prev,
        [type]: prev[type].filter((photo) => photo.localId !== mediaId),
      }));
      return;
    }
    setPendingPhotoDeletes((prev) => ({
      ...prev,
      [type]: prev[type].includes(mediaId)
        ? prev[type]
        : [...prev[type], mediaId],
    }));
  };

  const persistQueuedPhotos = async (
    types: readonly ProjectGroundMediaPhotoType[],
  ) => {
    let failed = false;
    const nextAdds: Record<ProjectGroundMediaPhotoType, PendingPhoto[]> = {
      before: [...pendingPhotoAdds.before],
      after: [...pendingPhotoAdds.after],
      bhoomi_pujan: [...pendingPhotoAdds.bhoomi_pujan],
      lokarpan: [...pendingPhotoAdds.lokarpan],
    };
    const nextDeletes: Record<ProjectGroundMediaPhotoType, string[]> = {
      before: [...pendingPhotoDeletes.before],
      after: [...pendingPhotoDeletes.after],
      bhoomi_pujan: [...pendingPhotoDeletes.bhoomi_pujan],
      lokarpan: [...pendingPhotoDeletes.lokarpan],
    };

    for (const type of types) {
      const kept: PendingPhoto[] = [];
      for (const photo of nextAdds[type]) {
        if (failed) {
          kept.push(photo);
          continue;
        }
        try {
          await postPhoto(type, photo.file);
          URL.revokeObjectURL(photo.previewUrl);
        } catch (error) {
          failed = true;
          kept.push(photo);
          toast.error(
            error instanceof Error ? error.message : t('adm.failedToSave'),
          );
        }
      }
      nextAdds[type] = kept;
    }

    for (const type of types) {
      const keptDeletes: string[] = [];
      for (const mediaId of nextDeletes[type]) {
        if (failed) {
          keptDeletes.push(mediaId);
          continue;
        }
        try {
          await removePhoto(mediaId);
        } catch (error) {
          failed = true;
          keptDeletes.push(mediaId);
          toast.error(
            error instanceof Error ? error.message : t('adm.failedToDelete'),
          );
        }
      }
      nextDeletes[type] = keptDeletes;
    }

    setPendingPhotoAdds(nextAdds);
    setPendingPhotoDeletes(nextDeletes);
    return !failed;
  };

  const saveExecution = async () => {
    if (!executionDirty || savingExecution) return;
    setSavingExecution(true);
    try {
      if (executionFieldsDirty) {
        await onPatchProject({
          physicalStatus: executionDraft.physicalStatus,
          bhoomiPujanDone: executionDraft.bhoomiPujanDone,
          bhoomiPujanDate: executionDraft.bhoomiPujanDate,
          lokarpanDone: executionDraft.lokarpanDone,
          lokarpanDate: executionDraft.lokarpanDate,
        });
      }
      if (executionPhotosDirty) {
        const photosOk = await persistQueuedPhotos(EXECUTION_PHOTO_TYPES);
        await onRefresh();
        if (photosOk && !executionFieldsDirty) {
          toast.success(t('common.success'));
        }
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('adm.failedToSave'),
      );
    } finally {
      setSavingExecution(false);
    }
  };

  const saveGroundMedia = async () => {
    if (!groundDirty || savingGround) return;
    setSavingGround(true);
    try {
      const photosOk = await persistQueuedPhotos(GROUND_PHOTO_TYPES);
      await onRefresh();
      if (photosOk) {
        toast.success(t('common.success'));
      }
    } finally {
      setSavingGround(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('projects.tabExecution')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('projects.physicalStatus')}</Label>
            <Select
              value={executionDraft.physicalStatus}
              onValueChange={(value: ProjectPhysicalStatus) =>
                setExecutionDraft((prev) => ({
                  ...prev,
                  physicalStatus: value,
                }))
              }
            >
              <SelectTrigger className="min-h-11 w-full sm:w-72">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WNS">{t('adm.physicalStatusWns')}</SelectItem>
                <SelectItem value="WIP">{t('adm.physicalStatusWip')}</SelectItem>
                <SelectItem value="WC">{t('adm.physicalStatusWc')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-medium">{t('projects.milestones')}</p>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="min-w-0 space-y-3">
                <AdmMilestoneRow
                  id={`project-bhoomi-${projectId}`}
                  label={t('adm.milestoneBhoomiPujan')}
                  sublabel={t('adm.milestoneBhoomiPujanMr')}
                  checked={executionDraft.bhoomiPujanDone}
                  date={executionDraft.bhoomiPujanDate ?? ''}
                  onCheckedChange={(checked) =>
                    setExecutionDraft((prev) => ({
                      ...prev,
                      bhoomiPujanDone: checked,
                      bhoomiPujanDate: checked
                        ? prev.bhoomiPujanDate || getTodayDateStringIST()
                        : null,
                    }))
                  }
                  onDateChange={(date) =>
                    setExecutionDraft((prev) => ({
                      ...prev,
                      bhoomiPujanDone: true,
                      bhoomiPujanDate: date || null,
                    }))
                  }
                />
                <ProjectPhotoGallery
                  title={t('projects.photosBhoomiPujan')}
                  titleClassName="text-sm font-medium"
                  photos={visiblePhotos('bhoomi_pujan')}
                  uploading={savingExecution}
                  onUpload={(files) => queuePhotoUpload('bhoomi_pujan', files)}
                  onDelete={(id) => queuePhotoDelete('bhoomi_pujan', id)}
                  onOpen={setLightboxPhoto}
                  emptyLabel={t('projects.photosPending')}
                  dropLabel={t('projects.dropPhotos')}
                  deleteAriaLabel={t('adm.delete')}
                  hideLabel={t('projects.hidePhotos')}
                  showLabel={t('projects.showPhotos')}
                />
              </div>
              <div className="min-w-0 space-y-3">
                <AdmMilestoneRow
                  id={`project-lokarpan-${projectId}`}
                  label={t('adm.milestoneLokarpan')}
                  sublabel={t('adm.milestoneLokarpanMr')}
                  checked={executionDraft.lokarpanDone}
                  date={executionDraft.lokarpanDate ?? ''}
                  onCheckedChange={(checked) =>
                    setExecutionDraft((prev) => ({
                      ...prev,
                      lokarpanDone: checked,
                      lokarpanDate: checked
                        ? prev.lokarpanDate || getTodayDateStringIST()
                        : null,
                    }))
                  }
                  onDateChange={(date) =>
                    setExecutionDraft((prev) => ({
                      ...prev,
                      lokarpanDone: true,
                      lokarpanDate: date || null,
                    }))
                  }
                />
                <ProjectPhotoGallery
                  title={t('projects.photosLokarpan')}
                  titleClassName="text-sm font-medium"
                  photos={visiblePhotos('lokarpan')}
                  uploading={savingExecution}
                  onUpload={(files) => queuePhotoUpload('lokarpan', files)}
                  onDelete={(id) => queuePhotoDelete('lokarpan', id)}
                  onOpen={setLightboxPhoto}
                  emptyLabel={t('projects.photosPending')}
                  dropLabel={t('projects.dropPhotos')}
                  deleteAriaLabel={t('adm.delete')}
                  hideLabel={t('projects.hidePhotos')}
                  showLabel={t('projects.showPhotos')}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              className="min-h-11"
              disabled={!executionDirty || savingExecution}
              onClick={() => void saveExecution()}
            >
              {savingExecution ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {t('common.save')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('projects.groundMedia')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            {(['before', 'after'] as const).map((type) => (
              <ProjectPhotoGallery
                key={type}
                title={
                  type === 'before'
                    ? t('projects.photosBefore')
                    : t('projects.photosAfter')
                }
                titleClassName="text-sm font-medium"
                photos={visiblePhotos(type)}
                uploading={savingGround}
                onUpload={(files) => queuePhotoUpload(type, files)}
                onDelete={(id) => queuePhotoDelete(type, id)}
                onOpen={setLightboxPhoto}
                emptyLabel={t('projects.photosPending')}
                dropLabel={t('projects.dropPhotos')}
                deleteAriaLabel={t('adm.delete')}
                hideLabel={t('projects.hidePhotos')}
                showLabel={t('projects.showPhotos')}
              />
            ))}
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              className="min-h-11"
              disabled={!groundDirty || savingGround}
              onClick={() => void saveGroundMedia()}
            >
              {savingGround ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {t('common.save')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(lightboxPhoto)}
        onOpenChange={(open) => {
          if (!open) setLightboxPhoto(null);
        }}
      >
        <DialogContent className="max-h-[90dvh] w-[calc(100%-1rem)] max-w-4xl overflow-hidden p-3 sm:p-6">
          <DialogTitle className="truncate pr-8 text-sm sm:text-base">
            {lightboxPhoto?.fileName ?? t('projects.groundMedia')}
          </DialogTitle>
          {lightboxPhoto ? (
            <div className="relative mx-auto flex max-h-[75dvh] w-full items-center justify-center bg-muted/30">
              <Image
                src={lightboxPhoto.fileUrl}
                alt={lightboxPhoto.fileName}
                width={1600}
                height={1200}
                className="max-h-[75dvh] w-auto max-w-full object-contain"
                unoptimized
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t('projects.documentRepository')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1">
              <Label>{t('projects.documentKind')}</Label>
              <Select
                value={docKind}
                onValueChange={(v: ProjectDocumentKind) => setDocKind(v)}
              >
                <SelectTrigger className="min-h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOC_KINDS.map((kind) => (
                    <SelectItem key={kind} value={kind}>
                      {kindLabel(kind)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              className="min-h-11 w-full sm:w-auto"
              disabled={uploadingDoc}
              onClick={() => docInputRef.current?.click()}
            >
              <Upload className="mr-1 h-4 w-4" />
              {t('projects.uploadDocument')}
            </Button>
            <input
              ref={docInputRef}
              type="file"
              className="hidden"
              accept=".pdf,image/*,.doc,.docx"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) await uploadDocument(file);
              }}
            />
          </div>

          {latestDocs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('projects.noProjectDocuments')}
            </p>
          ) : (
            <ul className="space-y-3">
              {latestDocs.map((doc) => {
                const versions = documents
                  .filter((d) => d.versionGroupId === doc.versionGroupId)
                  .sort((a, b) => b.version - a.version);
                return (
                  <li
                    key={doc.versionGroupId}
                    className="rounded-md border border-border p-3 text-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium">{kindLabel(doc.documentKind)}</p>
                        {doc.fileUrl ? (
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            {doc.fileName}
                          </a>
                        ) : (
                          <span>{doc.fileName}</span>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {t('projects.version')} {doc.version}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setDocKind(doc.documentKind);
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = '.pdf,image/*,.doc,.docx';
                            input.onchange = async () => {
                              const file = input.files?.[0];
                              if (file) {
                                await uploadDocument(file, doc.versionGroupId);
                              }
                            };
                            input.click();
                          }}
                        >
                          {t('projects.uploadNewVersion')}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => deleteDocument(doc.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    {versions.length > 1 && (
                      <ul className="mt-2 space-y-1 border-t border-border pt-2 text-xs text-muted-foreground">
                        {versions.slice(1).map((v) => (
                          <li key={v.id}>
                            {t('projects.version')} {v.version}:{' '}
                            {v.fileUrl ? (
                              <a
                                href={v.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary hover:underline"
                              >
                                {v.fileName}
                              </a>
                            ) : (
                              v.fileName
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function ProjectRosterFields({
  department,
  category,
  estimatedCost,
  approvalStatus,
  nocRequired,
  nocStatus,
  remarks,
  onChange,
}: {
  department: string;
  category: string;
  estimatedCost: number;
  approvalStatus: ProjectApprovalStatus;
  nocRequired: boolean;
  nocStatus: ProjectNocStatus;
  remarks: string;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const { t } = useTranslations();

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label>{t('projects.department')}</Label>
        <Input
          value={department}
          onChange={(e) => onChange({ department: e.target.value })}
          className="min-h-11"
        />
      </div>
      <div className="space-y-2">
        <Label>{t('projects.category')}</Label>
        <Input
          value={category}
          onChange={(e) => onChange({ category: e.target.value })}
          className="min-h-11"
        />
      </div>
      <div className="space-y-2">
        <Label>{t('projects.estimatedCost')}</Label>
        <Input
          type="number"
          min={0}
          value={estimatedCost || ''}
          onChange={(e) =>
            onChange({
              estimatedCost: Number.parseInt(e.target.value, 10) || 0,
            })
          }
          className="min-h-11"
        />
      </div>
      <div className="space-y-2">
        <Label>{t('projects.approvalStatus')}</Label>
        <Select
          value={approvalStatus}
          onValueChange={(v: ProjectApprovalStatus) =>
            onChange({ approvalStatus: v })
          }
        >
          <SelectTrigger className="min-h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Pending">{t('projects.approvalPending')}</SelectItem>
            <SelectItem value="Approved">{t('projects.approvalApproved')}</SelectItem>
            <SelectItem value="Rejected">{t('projects.approvalRejected')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>{t('projects.nocRequired')}</Label>
        <Select
          value={nocRequired ? 'yes' : 'no'}
          onValueChange={(v) =>
            onChange({
              nocRequired: v === 'yes',
              nocStatus: v === 'yes' ? 'Pending' : 'NotRequired',
            })
          }
        >
          <SelectTrigger className="min-h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="yes">{t('projects.yes')}</SelectItem>
            <SelectItem value="no">{t('projects.no')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>{t('projects.nocStatus')}</Label>
        <Select
          value={nocStatus}
          onValueChange={(v: ProjectNocStatus) => onChange({ nocStatus: v })}
          disabled={!nocRequired}
        >
          <SelectTrigger className="min-h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NotRequired">
              {t('projects.nocNotRequired')}
            </SelectItem>
            <SelectItem value="Pending">{t('projects.nocPending')}</SelectItem>
            <SelectItem value="Obtained">{t('projects.nocObtained')}</SelectItem>
            <SelectItem value="Rejected">{t('projects.nocRejected')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label>{t('projects.remarks')}</Label>
        <Input
          value={remarks}
          onChange={(e) => onChange({ remarks: e.target.value })}
          className="min-h-11"
        />
      </div>
    </div>
  );
}
