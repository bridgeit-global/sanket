'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ModulePageHeader } from '@/components/module-page-header';
import { AdmSkeleton } from '@/components/module-skeleton';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { useTranslations } from '@/hooks/use-translations';
import type { AdmFundingCategoryWithWorks, AdmWorkWithProject } from '@/lib/db/schema';
import {
  buildAdmSearchParams,
  getAdmCategoryElementId,
  parseAdmFiltersFromSearchParams,
} from '@/lib/adm/url-params';
import { AdmProfileBanner } from './adm/adm-profile-banner';
import { AdmCategoryAccordion } from './adm/adm-category-accordion';
import {
  AdmWorkFormDialog,
  type AdmProjectOption,
  type AdmWorkFormValues,
} from './adm/adm-work-form-dialog';

export function AdmModule() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlState = parseAdmFiltersFromSearchParams(searchParams);
  const { t } = useTranslations();

  const [categories, setCategories] = useState<AdmFundingCategoryWithWorks[]>([]);
  const [projects, setProjects] = useState<AdmProjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(urlState.search);
  const [expandedCategory, setExpandedCategory] = useState(urlState.expanded);
  const shouldScrollToExpanded = useRef(Boolean(urlState.expanded));

  const [workDialogOpen, setWorkDialogOpen] = useState(false);
  const [workDialogMode, setWorkDialogMode] = useState<'create' | 'edit'>('create');
  const [activeCategory, setActiveCategory] = useState<AdmFundingCategoryWithWorks | null>(null);
  const [editingWork, setEditingWork] = useState<AdmWorkWithProject | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workToDelete, setWorkToDelete] = useState<AdmWorkWithProject | null>(null);

  const syncUrl = useCallback(
    (updates: Partial<typeof urlState>) => {
      const params = buildAdmSearchParams(
        {
          expanded: updates.expanded ?? expandedCategory,
          search: updates.search ?? searchTerm,
        },
        new URLSearchParams(searchParams.toString()),
      );
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams, expandedCategory, searchTerm],
  );

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    if (loading || !expandedCategory || !shouldScrollToExpanded.current) return;

    const frame = requestAnimationFrame(() => {
      document
        .getElementById(getAdmCategoryElementId(expandedCategory))
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      shouldScrollToExpanded.current = false;
    });

    return () => cancelAnimationFrame(frame);
  }, [loading, expandedCategory, categories]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [dashboardRes, projectsRes] = await Promise.all([
        fetch('/api/adm/dashboard'),
        fetch('/api/adm/projects'),
      ]);

      if (!dashboardRes.ok) {
        throw new Error('Failed to load dashboard');
      }

      const dashboardData = await dashboardRes.json();
      setCategories(dashboardData);

      if (projectsRes.ok) {
        const projectsData = await projectsRes.json();
        setProjects(projectsData);
      }
    } catch (error) {
      console.error('Error loading ADM dashboard:', error);
      toast.error(t('adm.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const handleExpandedChange = (categoryId: string) => {
    setExpandedCategory(categoryId);
    syncUrl({ expanded: categoryId });
  };
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    syncUrl({ search: value });
  };

  const openCreateWork = (category: AdmFundingCategoryWithWorks) => {
    setActiveCategory(category);
    setEditingWork(null);
    setWorkDialogMode('create');
    setWorkDialogOpen(true);
  };

  const openEditWork = (work: AdmWorkWithProject) => {
    const category = categories.find((c) => c.id === work.categoryId) ?? null;
    setActiveCategory(category);
    setEditingWork(work);
    setWorkDialogMode('edit');
    setWorkDialogOpen(true);
  };

  const handleWorkSubmit = async (values: AdmWorkFormValues) => {
    try {
      if (workDialogMode === 'create') {
        const response = await fetch('/api/adm/works', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to create work');
        }
        toast.success(t('adm.workAddedSuccess'));
      } else if (editingWork) {
        const response = await fetch(`/api/adm/works/${editingWork.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to update work');
        }
        toast.success(t('adm.workUpdatedSuccess'));
      }
      await loadDashboard();
    } catch (error) {
      console.error('Error saving work:', error);
      toast.error(error instanceof Error ? error.message : t('adm.failedToSave'));
      throw error;
    }
  };

  const handleUpdateWork = async (id: string, patch: Record<string, unknown>) => {
    const work = categories
      .flatMap((c) => c.works)
      .find((w) => w.id === id);
    if (!work) return;

    try {
      const response = await fetch(`/api/adm/works/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: work.name,
          categoryId: work.categoryId,
          workBudget: work.workBudget,
          projectId: work.projectId,
          physicalStatus: work.physicalStatus,
          bhoomiPujanDone: work.bhoomiPujanDone,
          bhoomiPujanDate: work.bhoomiPujanDate,
          lokarpanDone: work.lokarpanDone,
          lokarpanDate: work.lokarpanDate,
          ...patch,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update');
      }
      await loadDashboard();
    } catch (error) {
      console.error('Error updating work:', error);
      toast.error(error instanceof Error ? error.message : t('adm.failedToSave'));
    }
  };

  const handleDeleteWork = async () => {
    if (!workToDelete) return;
    try {
      const response = await fetch(`/api/adm/works/${workToDelete.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete');
      }
      toast.success(t('adm.workDeletedSuccess'));
      setDeleteDialogOpen(false);
      setWorkToDelete(null);
      await loadDashboard();
    } catch (error) {
      console.error('Error deleting work:', error);
      toast.error(error instanceof Error ? error.message : t('adm.failedToDelete'));
    }
  };

  const handlePhotoUpload = async (
    workId: string,
    type: 'before' | 'after',
    file: File,
  ) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      const response = await fetch(`/api/adm/works/${workId}/photos`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to upload');
      }
      toast.success(t('adm.photoUploadedSuccess'));
      await loadDashboard();
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error(error instanceof Error ? error.message : t('adm.failedToUpload'));
    }
  };

  const handlePhotoRemove = async (workId: string, type: 'before' | 'after') => {
    try {
      const response = await fetch(
        `/api/adm/works/${workId}/photos?type=${type}`,
        { method: 'DELETE' },
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove');
      }
      toast.success(t('adm.photoRemovedSuccess'));
      await loadDashboard();
    } catch (error) {
      console.error('Error removing photo:', error);
      toast.error(error instanceof Error ? error.message : t('adm.failedToUpload'));
    }
  };

  if (loading) {
    return <AdmSkeleton />;
  }

  const firstCategory = categories[0];

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <ModulePageHeader
        title={t('adm.title')}
        description={t('adm.description')}
        actions={
          firstCategory ? (
            <Button
              className="min-h-11"
              onClick={() => openCreateWork(firstCategory)}
            >
              <Plus className="mr-1 h-4 w-4" />
              {t('adm.addWork')}
            </Button>
          ) : undefined
        }
      />

      <AdmProfileBanner />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder={t('adm.searchPlaceholder')}
          className="min-h-11 pl-9"
        />
      </div>

      <AdmCategoryAccordion
        categories={categories}
        expandedCategory={expandedCategory}
        searchTerm={searchTerm}
        onExpandedChange={handleExpandedChange}
        onAddWork={openCreateWork}
        onEditWork={openEditWork}
        onDeleteWork={(work) => {
          setWorkToDelete(work);
          setDeleteDialogOpen(true);
        }}
        onUpdateWork={handleUpdateWork}
        onPhotoUpload={handlePhotoUpload}
        onPhotoRemove={handlePhotoRemove}
      />

      {activeCategory && (
        <AdmWorkFormDialog
          open={workDialogOpen}
          onOpenChange={setWorkDialogOpen}
          categoryId={activeCategory.id}
          categoryName={activeCategory.name}
          mode={workDialogMode}
          projects={projects}
          initialValues={
            editingWork
              ? {
                  name: editingWork.name,
                  categoryId: editingWork.categoryId,
                  workBudget: editingWork.workBudget,
                  projectId: editingWork.projectId,
                  physicalStatus: editingWork.physicalStatus,
                }
              : { categoryId: activeCategory.id }
          }
          onSubmit={handleWorkSubmit}
        />
      )}

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t('adm.deleteWork')}
        description={t('adm.deleteWorkDescription')}
        confirmText={t('adm.delete')}
        variant="destructive"
        onConfirm={handleDeleteWork}
      />
    </div>
  );
}
