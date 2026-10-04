'use client';

import { useRef, useState } from 'react';
import { FileText, Trash2, Upload } from 'lucide-react';
import { FilePreviewButton } from '@/components/file-preview-button';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations } from '@/hooks/use-translations';
import { toast } from '@/components/toast';
import type {
  ProjectAttachment,
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
  documents: ProjectAttachment[];
  onRefresh: () => Promise<void>;
}

export function ProjectDetailExtras({
  projectId,
  documents,
  onRefresh,
}: ProjectDetailExtrasProps) {
  const { t } = useTranslations();
  const docInputRef = useRef<HTMLInputElement>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);

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
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('adm.failedToSave'),
      );
    } finally {
      setUploadingDoc(false);
      if (docInputRef.current) docInputRef.current.value = '';
    }
  };

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
