'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ExternalLink, FileText, Plus, Trash2, Upload, X } from 'lucide-react';
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
import { formatCurrency } from '@/lib/mla-office-utils';
import { AdmMilestoneRow } from '@/components/adm/adm-milestone-row';
import type {
  ProjectAttachment,
  ProjectGroundMedia,
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
  fundAllocations: ProjectFundAllocationView[];
  onPatchProject: (patch: Record<string, unknown>) => Promise<void>;
  onRefresh: () => Promise<void>;
}

const DOC_KINDS: ProjectDocumentKind[] = [
  'approval_pdf',
  'sanction_letter',
  'noc',
  'supporting',
];

export function ProjectDetailExtras({
  projectId,
  physicalStatus,
  bhoomiPujanDone,
  bhoomiPujanDate,
  lokarpanDone,
  lokarpanDate,
  documents,
  groundMedia,
  fundAllocations,
  onPatchProject,
  onRefresh,
}: ProjectDetailExtrasProps) {
  const { t } = useTranslations();
  const docInputRef = useRef<HTMLInputElement>(null);
  const beforeInputRef = useRef<HTMLInputElement>(null);
  const afterInputRef = useRef<HTMLInputElement>(null);
  const [docKind, setDocKind] = useState<ProjectDocumentKind>('supporting');
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadingBefore, setUploadingBefore] = useState(false);
  const [uploadingAfter, setUploadingAfter] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<ProjectGroundMedia | null>(
    null,
  );

  const kindLabel = (kind: ProjectDocumentKind) => {
    switch (kind) {
      case 'approval_pdf':
        return t('projects.kindApprovalPdf');
      case 'sanction_letter':
        return t('projects.kindSanctionLetter');
      case 'noc':
        return t('projects.kindNoc');
      default:
        return t('projects.kindSupporting');
    }
  };

  const beforePhotos = groundMedia.filter((m) => m.photoType === 'before');
  const afterPhotos = groundMedia.filter((m) => m.photoType === 'after');

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

  const uploadPhoto = async (type: 'before' | 'after', file: File) => {
    const setUploading = type === 'before' ? setUploadingBefore : setUploadingAfter;
    setUploading(true);
    try {
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
      await onRefresh();
    } finally {
      setUploading(false);
    }
  };

  const deletePhoto = async (mediaId: string) => {
    const res = await fetch(
      `/api/projects/${projectId}/photos?mediaId=${mediaId}`,
      { method: 'DELETE' },
    );
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Delete failed');
    }
    await onRefresh();
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('projects.fundAllocations')}</CardTitle>
        </CardHeader>
        <CardContent>
          {fundAllocations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('projects.noFundAllocations')}
            </p>
          ) : (
            <ul className="space-y-2">
              {fundAllocations.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-col gap-2 rounded-md border border-border px-3 py-2 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium">
                      {a.categoryName} ({a.categoryCode})
                    </p>
                    <p className="text-xs text-muted-foreground">
                      FY {a.fundRecord.financialYear} ·{' '}
                      {formatCurrency(a.allocatedBudget)}
                    </p>
                  </div>
                  <Link
                    href={`/modules/adm?fund=${a.fundRecord.id}`}
                    className="inline-flex min-h-11 items-center justify-center gap-1 rounded-md border border-border px-3 text-primary hover:bg-muted/40 sm:min-h-0 sm:justify-start sm:border-0 sm:px-0 sm:hover:bg-transparent sm:hover:underline"
                  >
                    {t('projects.viewAdmFund')}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('projects.tabExecution')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('projects.physicalStatus')}</Label>
            <Select
              value={physicalStatus}
              onValueChange={(value: ProjectPhysicalStatus) =>
                onPatchProject({ physicalStatus: value })
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
            <AdmMilestoneRow
              id={`project-bhoomi-${projectId}`}
              label={t('adm.milestoneBhoomiPujan')}
              sublabel={t('adm.milestoneBhoomiPujanMr')}
              checked={bhoomiPujanDone}
              date={bhoomiPujanDate ?? ''}
              onCheckedChange={(checked) =>
                onPatchProject({
                  bhoomiPujanDone: checked,
                  bhoomiPujanDate: checked
                    ? bhoomiPujanDate || new Date().toISOString().slice(0, 10)
                    : null,
                })
              }
              onDateChange={(date) =>
                onPatchProject({
                  bhoomiPujanDone: true,
                  bhoomiPujanDate: date || null,
                })
              }
            />
            <AdmMilestoneRow
              id={`project-lokarpan-${projectId}`}
              label={t('adm.milestoneLokarpan')}
              sublabel={t('adm.milestoneLokarpanMr')}
              checked={lokarpanDone}
              date={lokarpanDate ?? ''}
              onCheckedChange={(checked) =>
                onPatchProject({
                  lokarpanDone: checked,
                  lokarpanDate: checked
                    ? lokarpanDate || new Date().toISOString().slice(0, 10)
                    : null,
                })
              }
              onDateChange={(date) =>
                onPatchProject({
                  lokarpanDone: true,
                  lokarpanDate: date || null,
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('projects.groundMedia')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          {(['before', 'after'] as const).map((type) => {
            const photos = type === 'before' ? beforePhotos : afterPhotos;
            const uploading = type === 'before' ? uploadingBefore : uploadingAfter;
            const inputRef = type === 'before' ? beforeInputRef : afterInputRef;
            return (
              <div key={type} className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-medium">
                    {type === 'before'
                      ? t('projects.photosBefore')
                      : t('projects.photosAfter')}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="min-h-11 w-full sm:min-h-9 sm:w-auto"
                    disabled={uploading}
                    onClick={() => inputRef.current?.click()}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    {t('projects.addPhoto')}
                  </Button>
                  <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) await uploadPhoto(type, file);
                      e.target.value = '';
                    }}
                  />
                </div>
                {photos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t('projects.noPhotos')}
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {photos.map((photo) => (
                      <div
                        key={photo.id}
                        className="overflow-hidden rounded-md border border-border"
                      >
                        <button
                          type="button"
                          className="relative block aspect-[4/3] w-full bg-muted/40"
                          onClick={() => setLightboxPhoto(photo)}
                          aria-label={photo.fileName}
                        >
                          <Image
                            src={photo.fileUrl}
                            alt={photo.fileName}
                            fill
                            className="object-contain"
                            unoptimized
                            sizes="(max-width: 640px) 100vw, 50vw"
                          />
                        </button>
                        <div className="flex items-center justify-between gap-2 border-t border-border px-2 py-1.5">
                          <p className="min-w-0 truncate text-xs text-muted-foreground">
                            {photo.fileName}
                          </p>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="min-h-9 shrink-0 text-destructive hover:text-destructive"
                            onClick={() => deletePhoto(photo.id)}
                            aria-label={t('adm.delete')}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
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
