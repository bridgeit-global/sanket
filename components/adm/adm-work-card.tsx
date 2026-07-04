'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslations } from '@/hooks/use-translations';
import { formatCurrency } from '@/lib/mla-office-utils';
import type { AdmPhysicalStatus, AdmWorkWithProject } from '@/lib/db/schema';
import { AdmMilestoneRow } from './adm-milestone-row';
import { AdmPhotoFrame } from './adm-photo-frame';
import { cn } from '@/lib/utils';

interface AdmWorkCardProps {
  work: AdmWorkWithProject;
  onUpdate: (id: string, patch: Record<string, unknown>) => Promise<void>;
  onEdit: (work: AdmWorkWithProject) => void;
  onDelete: (work: AdmWorkWithProject) => void;
  onPhotoUpload: (workId: string, type: 'before' | 'after', file: File) => Promise<void>;
  onPhotoRemove: (workId: string, type: 'before' | 'after') => Promise<void>;
}

function statusBadgeClass(status: AdmPhysicalStatus): string {
  switch (status) {
    case 'WIP':
      return 'bg-warning/15 text-warning border-warning/30';
    case 'WC':
      return 'bg-success/15 text-success border-success/30';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export function AdmWorkCard({
  work,
  onUpdate,
  onEdit,
  onDelete,
  onPhotoUpload,
  onPhotoRemove,
}: AdmWorkCardProps) {
  const { t } = useTranslations();
  const [uploadingBefore, setUploadingBefore] = useState(false);
  const [uploadingAfter, setUploadingAfter] = useState(false);

  const statusLabel = {
    WNS: t('adm.physicalStatusWns'),
    WIP: t('adm.physicalStatusWip'),
    WC: t('adm.physicalStatusWc'),
  }[work.physicalStatus];

  const handleStatusChange = async (value: AdmPhysicalStatus) => {
    await onUpdate(work.id, { physicalStatus: value });
  };

  const handleMilestoneChange = async (
    field: 'bhoomiPujan' | 'lokarpan',
    checked: boolean,
    date: string,
  ) => {
    if (field === 'bhoomiPujan') {
      await onUpdate(work.id, {
        bhoomiPujanDone: checked,
        bhoomiPujanDate: checked ? date || null : null,
      });
    } else {
      await onUpdate(work.id, {
        lokarpanDone: checked,
        lokarpanDate: checked ? date || null : null,
      });
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="grid gap-4 p-4 lg:grid-cols-3 lg:gap-6">
        {/* Project Roster Details */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('adm.projectRoster')}
          </p>
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t('adm.workName')}</p>
            <p className="font-semibold">{work.name}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t('adm.workBudget')}</p>
            <p className="font-semibold">{formatCurrency(work.workBudget)}</p>
          </div>
          {work.projectId && (
            <Link
              href={`/modules/projects/${work.projectId}`}
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {t('adm.viewProject')}
              {work.projectName ? `: ${work.projectName}` : ''}
            </Link>
          )}
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-9"
              onClick={() => onEdit(work)}
            >
              <Pencil className="mr-1 h-3.5 w-3.5" />
              {t('adm.edit')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-9 text-destructive hover:text-destructive"
              onClick={() => onDelete(work)}
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              {t('adm.delete')}
            </Button>
          </div>
        </div>

        {/* Execution Metrics */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('adm.executionMetrics')}
          </p>
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{t('adm.physicalStatus')}</p>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={work.physicalStatus} onValueChange={handleStatusChange}>
                <SelectTrigger className="min-h-11 w-full sm:w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WNS">{t('adm.physicalStatusWns')}</SelectItem>
                  <SelectItem value="WIP">{t('adm.physicalStatusWip')}</SelectItem>
                  <SelectItem value="WC">{t('adm.physicalStatusWc')}</SelectItem>
                </SelectContent>
              </Select>
              <Badge variant="outline" className={cn('text-xs', statusBadgeClass(work.physicalStatus))}>
                {statusLabel}
              </Badge>
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">{t('adm.milestones')}</p>
            <AdmMilestoneRow
              id={`bhoomi-${work.id}`}
              label={t('adm.milestoneBhoomiPujan')}
              sublabel={t('adm.milestoneBhoomiPujanMr')}
              checked={work.bhoomiPujanDone}
              date={work.bhoomiPujanDate ?? ''}
              onCheckedChange={(checked) =>
                handleMilestoneChange(
                  'bhoomiPujan',
                  checked,
                  checked
                    ? work.bhoomiPujanDate || new Date().toISOString().slice(0, 10)
                    : '',
                )
              }
              onDateChange={(date) =>
                handleMilestoneChange('bhoomiPujan', work.bhoomiPujanDone, date)
              }
            />
            <AdmMilestoneRow
              id={`lokarpan-${work.id}`}
              label={t('adm.milestoneLokarpan')}
              sublabel={t('adm.milestoneLokarpanMr')}
              checked={work.lokarpanDone}
              date={work.lokarpanDate ?? ''}
              onCheckedChange={(checked) =>
                handleMilestoneChange(
                  'lokarpan',
                  checked,
                  checked
                    ? work.lokarpanDate || new Date().toISOString().slice(0, 10)
                    : '',
                )
              }
              onDateChange={(date) =>
                handleMilestoneChange('lokarpan', work.lokarpanDone, date)
              }
            />
          </div>
        </div>

        {/* Ground Media Proof */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('adm.groundMedia')}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <AdmPhotoFrame
              label={t('adm.photosBefore')}
              photoUrl={work.beforePhotoUrl}
              photoName={work.beforePhotoName}
              uploading={uploadingBefore}
              onUpload={async (file) => {
                setUploadingBefore(true);
                try {
                  await onPhotoUpload(work.id, 'before', file);
                } finally {
                  setUploadingBefore(false);
                }
              }}
              onRemove={async () => {
                setUploadingBefore(true);
                try {
                  await onPhotoRemove(work.id, 'before');
                } finally {
                  setUploadingBefore(false);
                }
              }}
            />
            <AdmPhotoFrame
              label={t('adm.photosAfter')}
              photoUrl={work.afterPhotoUrl}
              photoName={work.afterPhotoName}
              uploading={uploadingAfter}
              onUpload={async (file) => {
                setUploadingAfter(true);
                try {
                  await onPhotoUpload(work.id, 'after', file);
                } finally {
                  setUploadingAfter(false);
                }
              }}
              onRemove={async () => {
                setUploadingAfter(true);
                try {
                  await onPhotoRemove(work.id, 'after');
                } finally {
                  setUploadingAfter(false);
                }
              }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
