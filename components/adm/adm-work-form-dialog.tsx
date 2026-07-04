'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { useTranslations } from '@/hooks/use-translations';
import { admWorkFormSchema, validateForm } from '@/lib/validations';
import type { AdmPhysicalStatus } from '@/lib/db/schema';

export interface AdmProjectOption {
  id: string;
  name: string;
}

export interface AdmWorkFormValues {
  name: string;
  categoryId: string;
  workBudget: number;
  projectId: string | null;
  physicalStatus: AdmPhysicalStatus;
}

interface AdmWorkFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  categoryName: string;
  initialValues?: Partial<AdmWorkFormValues>;
  projects: AdmProjectOption[];
  onSubmit: (values: AdmWorkFormValues) => Promise<void>;
  mode: 'create' | 'edit';
}

export function AdmWorkFormDialog({
  open,
  onOpenChange,
  categoryId,
  categoryName,
  initialValues,
  projects,
  onSubmit,
  mode,
}: AdmWorkFormDialogProps) {
  const { t } = useTranslations();
  const [form, setForm] = useState<AdmWorkFormValues>({
    name: '',
    categoryId,
    workBudget: 0,
    projectId: null,
    physicalStatus: 'WNS',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        name: initialValues?.name ?? '',
        categoryId: initialValues?.categoryId ?? categoryId,
        workBudget: initialValues?.workBudget ?? 0,
        projectId: initialValues?.projectId ?? null,
        physicalStatus: initialValues?.physicalStatus ?? 'WNS',
      });
      setErrors({});
    }
  }, [open, categoryId, initialValues]);

  const handleProjectChange = (projectId: string) => {
    if (projectId === 'none') {
      setForm((prev) => ({ ...prev, projectId: null }));
      return;
    }
    const project = projects.find((p) => p.id === projectId);
    setForm((prev) => ({
      ...prev,
      projectId,
      name: prev.name || project?.name || prev.name,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateForm(admWorkFormSchema, form);
    if (!validation.success) {
      setErrors(validation.errors);
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        ...validation.data,
        projectId: validation.data.projectId ?? null,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? t('adm.addWork') : t('adm.editWork')}
          </DialogTitle>
          <DialogDescription>{categoryName}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="adm-work-name">{t('adm.workName')}</Label>
            <Input
              id="adm-work-name"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder={t('adm.workNamePlaceholder')}
              className="min-h-11"
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="adm-work-budget">{t('adm.workBudget')}</Label>
            <Input
              id="adm-work-budget"
              type="number"
              min={0}
              value={form.workBudget || ''}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  workBudget: Number.parseInt(e.target.value, 10) || 0,
                }))
              }
              className="min-h-11"
              aria-invalid={!!errors.workBudget}
            />
            {errors.workBudget && (
              <p className="text-xs text-destructive">{errors.workBudget}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>{t('adm.linkProject')}</Label>
            <Select
              value={form.projectId ?? 'none'}
              onValueChange={handleProjectChange}
            >
              <SelectTrigger className="min-h-11">
                <SelectValue placeholder={t('adm.linkProjectNone')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('adm.linkProjectNone')}</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('adm.physicalStatus')}</Label>
            <Select
              value={form.physicalStatus}
              onValueChange={(value: AdmPhysicalStatus) =>
                setForm((prev) => ({ ...prev, physicalStatus: value }))
              }
            >
              <SelectTrigger className="min-h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WNS">{t('adm.physicalStatusWns')}</SelectItem>
                <SelectItem value="WIP">{t('adm.physicalStatusWip')}</SelectItem>
                <SelectItem value="WC">{t('adm.physicalStatusWc')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t('adm.cancel')}
            </Button>
            <Button type="submit" disabled={saving}>
              {t('adm.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
