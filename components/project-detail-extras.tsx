'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { FileText, Loader2, Trash2, Upload } from 'lucide-react';
import { FilePreviewButton } from '@/components/file-preview-button';
import { AdmMilestoneRow } from '@/components/adm/adm-milestone-row';
import {
  ProjectPhotoGallery,
  type ProjectPhotoItem,
} from '@/components/projects/project-photo-gallery';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileUploadZone } from '@/components/ui/file-upload-zone';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations } from '@/hooks/use-translations';
import { toast } from '@/components/toast';
import { getTodayDateStringIST } from '@/lib/ist-date';
import type {
  ProjectAttachment,
  ProjectApprovalStatus,
  ProjectGroundMedia,
  ProjectGroundMediaPhotoType,
  ProjectNocStatus,
  ProjectPhysicalStatus,
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
  documents: ProjectAttachment[];
  groundMedia: ProjectGroundMedia[];
  physicalStatus: ProjectPhysicalStatus;
  bhoomiPujanDone: boolean;
  bhoomiPujanDate: string | null;
  lokarpanDone: boolean;
  lokarpanDate: string | null;
  isAdmProject: boolean;
  onRefresh: () => Promise<void>;
}

export function ProjectDetailExtras({
  projectId,
  documents,
  groundMedia,
  physicalStatus,
  bhoomiPujanDone,
  bhoomiPujanDate,
  lokarpanDone,
  lokarpanDate,
  isAdmProject,
  onRefresh,
}: ProjectDetailExtrasProps) {
  const { t } = useTranslations();
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadingPhotoType, setUploadingPhotoType] =
    useState<ProjectGroundMediaPhotoType | null>(null);
  const [savingExecution, setSavingExecution] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<ProjectPhotoItem | null>(
    null,
  );
  const [executionDraft, setExecutionDraft] = useState({
    physicalStatus,
    bhoomiPujanDone,
    bhoomiPujanDate,
    lokarpanDone,
    lokarpanDate,
  });

  useEffect(() => {
    setExecutionDraft({
      physicalStatus,
      bhoomiPujanDone,
      bhoomiPujanDate,
      lokarpanDone,
      lokarpanDate,
    });
  }, [
    physicalStatus,
    bhoomiPujanDone,
    bhoomiPujanDate,
    lokarpanDone,
    lokarpanDate,
  ]);

  const sortedDocs = [...documents].sort((a, b) => {
    const aTime = new Date(a.createdAt || 0).getTime();
    const bTime = new Date(b.createdAt || 0).getTime();
    return bTime - aTime;
  });

  const uploadDocument = async (file: File) => {
    setUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentKind', 'supporting');
      const res = await fetch(`/api/projects/${projectId}/documents`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Upload failed');
      }
      await onRefresh();
      toast.success(t('projects.documentUploadedSuccess'));
      setUploadDialogOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('adm.failedToSave'),
      );
    } finally {
      setUploadingDoc(false);
    }
  };

  const photosOf = (type: ProjectGroundMediaPhotoType): ProjectPhotoItem[] =>
    groundMedia
      .filter((photo) => photo.photoType === type)
      .map((photo) => ({
        id: photo.id,
        fileUrl: photo.fileUrl,
        fileName: photo.fileName,
      }));

  const uploadPhotos = async (
    type: ProjectGroundMediaPhotoType,
    files: File[],
  ) => {
    setUploadingPhotoType(type);
    try {
      for (const file of files) {
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
      }
      await onRefresh();
      toast.success(t('common.success'));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('adm.failedToSave'),
      );
    } finally {
      setUploadingPhotoType(null);
    }
  };

  const deletePhoto = async (mediaId: string) => {
    try {
      const res = await fetch(
        `/api/projects/${projectId}/photos?mediaId=${mediaId}`,
        { method: 'DELETE' },
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Delete failed');
      }
      await onRefresh();
      toast.success(t('common.success'));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('adm.failedToDelete'),
      );
    }
  };

  const executionDirty =
    executionDraft.physicalStatus !== physicalStatus ||
    executionDraft.bhoomiPujanDone !== bhoomiPujanDone ||
    (executionDraft.bhoomiPujanDate || null) !== (bhoomiPujanDate || null) ||
    executionDraft.lokarpanDone !== lokarpanDone ||
    (executionDraft.lokarpanDate || null) !== (lokarpanDate || null);

  const saveExecution = async () => {
    if (!executionDirty || savingExecution) return;
    setSavingExecution(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          physicalStatus: executionDraft.physicalStatus,
          bhoomiPujanDone: executionDraft.bhoomiPujanDone,
          bhoomiPujanDate: executionDraft.bhoomiPujanDate,
          lokarpanDone: executionDraft.lokarpanDone,
          lokarpanDate: executionDraft.lokarpanDate,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Save failed');
      }
      await onRefresh();
      toast.success(t('common.success'));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('adm.failedToSave'),
      );
    } finally {
      setSavingExecution(false);
    }
  };

  const photoGallery = (type: ProjectGroundMediaPhotoType, title: string) => (
    <ProjectPhotoGallery
      title={title}
      photos={photosOf(type)}
      uploading={uploadingPhotoType === type}
      onUpload={(files) => uploadPhotos(type, files)}
      onDelete={deletePhoto}
      onOpen={setLightboxPhoto}
      emptyLabel={t('projects.photosPending')}
      dropLabel={t('projects.dropPhotos')}
      deleteAriaLabel={t('adm.delete')}
      hideLabel={t('projects.hidePhotos')}
      showLabel={t('projects.showPhotos')}
    />
  );

  const deleteDocument = async (documentId: string) => {
    try {
      const res = await fetch(
        `/api/projects/${projectId}/documents?documentId=${documentId}`,
        { method: 'DELETE' },
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Delete failed');
      }
      await onRefresh();
      toast.success(t('projects.documentDeletedSuccess'));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('adm.failedToDelete'),
      );
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {isAdmProject ? (
        <>
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
                  <SelectTrigger className="min-h-11 w-full md:w-72">
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
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
                    {photoGallery('bhoomi_pujan', t('projects.photosBhoomiPujan'))}
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
                    {photoGallery('lokarpan', t('projects.photosLokarpan'))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  className="min-h-11 w-full sm:w-auto"
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
            <CardContent>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {photoGallery('before', t('projects.photosBefore'))}
                {photoGallery('after', t('projects.photosAfter'))}
              </div>
            </CardContent>
          </Card>

          <Dialog
            open={Boolean(lightboxPhoto)}
            onOpenChange={(open) => {
              if (!open) setLightboxPhoto(null);
            }}
          >
            <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-4xl overflow-hidden p-3 sm:max-w-4xl sm:p-6">
              <DialogHeader>
                <DialogTitle className="truncate pr-8 text-sm sm:text-base">
                  {lightboxPhoto?.fileName ?? t('projects.groundMedia')}
                </DialogTitle>
              </DialogHeader>
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
        </>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t('projects.documentRepository')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-end">
            <Button
              type="button"
              className="min-h-11 w-full sm:w-auto"
              disabled={uploadingDoc}
              onClick={() => setUploadDialogOpen(true)}
            >
              <Upload className="mr-1 h-4 w-4" />
              {t('projects.uploadDocument')}
            </Button>
          </div>

          {sortedDocs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('projects.noProjectDocuments')}
            </p>
          ) : (
            <ul className="space-y-3">
              {sortedDocs.map((doc) => (
                <li
                  key={doc.id}
                  className="rounded-md border border-border p-3 text-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate font-medium">{doc.fileName}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {doc.fileUrl ? (
                        <FilePreviewButton
                          fileUrl={doc.fileUrl}
                          fileName={doc.fileName || 'document'}
                        />
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        onClick={() => void deleteDocument(doc.id)}
                        title="Delete"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-xl">
          <DialogHeader>
            <DialogTitle>{t('projects.uploadDocument')}</DialogTitle>
            <DialogDescription>
              Upload one project document. It will be added to this repository immediately.
            </DialogDescription>
          </DialogHeader>
          <FileUploadZone
            multiple={false}
            isUploading={uploadingDoc}
            onUpload={async (files) => {
              const file = files[0];
              if (file) await uploadDocument(file);
            }}
            validation={{
              accept: '.pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx',
              maxSizeBytes: 10 * 1024 * 1024,
            }}
            title={uploadingDoc ? t('adm.uploading') : 'Drop your document here or click to browse'}
            description="PDF, images, or Word documents (maximum 10 MB)"
            hint="The document will upload immediately after selection."
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setUploadDialogOpen(false)}
              disabled={uploadingDoc}
            >
              {t('adm.cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
