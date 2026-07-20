'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { ModulePageHeader } from '@/components/module-page-header';
import { AdmSkeleton } from '@/components/module-skeleton';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { useTranslations } from '@/hooks/use-translations';
import type {
  AdmFundingCategory,
  AdmFundRecordWithDetails,
  AdmFundAllocationWithProject,
  AdmDocument,
  AdmFundingCategoryWithFunds,
} from '@/lib/db/schema';
import {
  buildAdmSearchParams,
  parseAdmFiltersFromSearchParams,
} from '@/lib/adm/url-params';
import { AdmProfileBanner } from './adm/adm-profile-banner';
import { AdmFundsList } from './adm/adm-funds-list';
import type { AdmProjectOption } from './adm/adm-fund-detail';

export function AdmModule() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlState = parseAdmFiltersFromSearchParams(searchParams);
  const { t } = useTranslations();

  const [categories, setCategories] = useState<AdmFundingCategory[]>([]);
  const [funds, setFunds] = useState<AdmFundRecordWithDetails[]>([]);
  const [projects, setProjects] = useState<AdmProjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(urlState.search);
  const [focusFundId, setFocusFundId] = useState(urlState.fund);

  const [deleteFundId, setDeleteFundId] = useState<string | null>(null);
  const [deleteAllocation, setDeleteAllocation] =
    useState<AdmFundAllocationWithProject | null>(null);
  const [deleteDocument, setDeleteDocument] = useState<{
    fundRecordId: string;
    document: AdmDocument;
  } | null>(null);

  const syncUrl = useCallback(
    (updates: Partial<typeof urlState>) => {
      const params = buildAdmSearchParams(
        {
          fund: updates.fund ?? focusFundId,
          search: updates.search ?? searchTerm,
        },
        new URLSearchParams(searchParams.toString()),
      );
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams, focusFundId, searchTerm],
  );

  useEffect(() => {
    loadDashboard();
  }, []);

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

      const dashboardData =
        (await dashboardRes.json()) as AdmFundingCategoryWithFunds[];
      setCategories(
        dashboardData.map(
          ({ fundRecords: _funds, allocatedBudget: _a, totalBudget: _t, ...cat }) =>
            cat,
        ),
      );
      setFunds(
        dashboardData
          .flatMap((c) => c.fundRecords)
          .sort((a, b) => {
            const fy = b.financialYear.localeCompare(a.financialYear);
            if (fy !== 0) return fy;
            return a.categoryName.localeCompare(b.categoryName);
          }),
      );

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

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    syncUrl({ search: value });
  };

  const handleSelectFund = (fundId: string) => {
    setFocusFundId(fundId);
    syncUrl({ fund: fundId });
  };

  const handleBackToList = useCallback(() => {
    setFocusFundId('');
    syncUrl({ fund: '' });
  }, [syncUrl]);

  const handleCreateFund = async (values: {
    categoryId?: string;
    categoryName?: string;
    financialYear: string;
    budget: number;
  }) => {
    let categoryId = values.categoryId;

    if (!categoryId && values.categoryName) {
      const categoryRes = await fetch('/api/adm/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: values.categoryName }),
      });
      if (!categoryRes.ok) {
        const data = await categoryRes.json();
        throw new Error(data.error || 'Failed to create fund type');
      }
      const category = await categoryRes.json();
      categoryId = category.id as string;
    }

    if (!categoryId) {
      throw new Error('Fund type is required');
    }

    const response = await fetch(`/api/adm/categories/${categoryId}/funds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        financialYear: values.financialYear,
        budget: values.budget,
      }),
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to create fund');
    }
    toast.success(t('adm.fundCreatedSuccess'));
    await loadDashboard();
  };

  const handleUpdateFund = async (
    fundId: string,
    values: { financialYear: string; budget: number },
  ) => {
    const response = await fetch(`/api/adm/funds/${fundId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to update fund');
    }
    toast.success(t('adm.fundUpdatedSuccess'));
    await loadDashboard();
  };

  const handleDeleteFund = async () => {
    if (!deleteFundId) return;
    try {
      const response = await fetch(`/api/adm/funds/${deleteFundId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete');
      }
      toast.success(t('adm.fundDeletedSuccess'));
      setDeleteFundId(null);
      if (focusFundId === deleteFundId) {
        setFocusFundId('');
        syncUrl({ fund: '' });
      }
      await loadDashboard();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('adm.failedToDelete'),
      );
    }
  };

  const handleAddAllocation = async (
    fundRecordId: string,
    projectId: string,
    allocatedBudget: number,
  ) => {
    const response = await fetch('/api/adm/allocations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fundRecordId, projectId, allocatedBudget }),
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to add allocation');
    }
    toast.success(t('adm.allocationAddedSuccess'));
    await loadDashboard();
  };

  const handleCreateProject = async (
    fundRecordId: string,
    values: {
      name: string;
      department?: string;
      allocatedBudget: number;
    },
  ) => {
    const response = await fetch('/api/adm/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: values.name,
        department: values.department,
        status: 'Concept',
        fundRecordId,
        allocatedBudget: values.allocatedBudget,
      }),
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to create project');
    }
    toast.success(t('adm.projectCreatedSuccess'));
    await loadDashboard();
  };

  const handleUpdateAllocation = async (
    id: string,
    allocatedBudget: number,
  ) => {
    const response = await fetch(`/api/adm/allocations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ allocatedBudget }),
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to update allocation');
    }
    toast.success(t('adm.allocationUpdatedSuccess'));
    await loadDashboard();
  };

  const handleDeleteAllocation = async () => {
    if (!deleteAllocation) return;
    try {
      const response = await fetch(
        `/api/adm/allocations/${deleteAllocation.id}`,
        { method: 'DELETE' },
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete');
      }
      toast.success(t('adm.allocationDeletedSuccess'));
      setDeleteAllocation(null);
      await loadDashboard();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('adm.failedToDelete'),
      );
    }
  };

  const handleUploadDocument = async (
    fundRecordId: string,
    file: File,
    kind: string,
  ) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('kind', kind);
    const response = await fetch(`/api/adm/funds/${fundRecordId}/documents`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to upload');
    }
    toast.success(t('adm.documentUploadedSuccess'));
    await loadDashboard();
  };

  const handleDeleteDocument = async () => {
    if (!deleteDocument) return;
    try {
      const response = await fetch(
        `/api/adm/funds/${deleteDocument.fundRecordId}/documents?documentId=${deleteDocument.document.id}`,
        { method: 'DELETE' },
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete');
      }
      toast.success(t('adm.documentDeletedSuccess'));
      setDeleteDocument(null);
      await loadDashboard();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('adm.failedToDelete'),
      );
    }
  };

  if (loading) {
    return <AdmSkeleton />;
  }

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <ModulePageHeader
        title={t('adm.title')}
        description={t('adm.description')}
      />

      <AdmProfileBanner />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder={
            focusFundId ? t('adm.searchFundsPlaceholder') : t('adm.searchPlaceholder')
          }
          className="min-h-11 pl-9"
        />
      </div>

      <AdmFundsList
        categories={categories}
        funds={funds}
        searchTerm={searchTerm}
        selectedFundId={focusFundId}
        projects={projects}
        onSelectFund={handleSelectFund}
        onBackToList={handleBackToList}
        onCreateFund={handleCreateFund}
        onUpdateFund={handleUpdateFund}
        onDeleteFund={(id) => setDeleteFundId(id)}
        onAddAllocation={handleAddAllocation}
        onCreateProject={handleCreateProject}
        onUpdateAllocation={handleUpdateAllocation}
        onDeleteAllocation={(a) => setDeleteAllocation(a)}
        onUploadDocument={handleUploadDocument}
        onDeleteDocument={(fundRecordId, document) =>
          setDeleteDocument({ fundRecordId, document })
        }
      />

      <ConfirmDialog
        open={Boolean(deleteFundId)}
        onOpenChange={(open) => !open && setDeleteFundId(null)}
        title={t('adm.deleteFund')}
        description={t('adm.deleteFundDescription')}
        confirmText={t('adm.delete')}
        variant="destructive"
        onConfirm={handleDeleteFund}
      />

      <ConfirmDialog
        open={Boolean(deleteAllocation)}
        onOpenChange={(open) => !open && setDeleteAllocation(null)}
        title={t('adm.deleteAllocation')}
        description={t('adm.deleteAllocationDescription')}
        confirmText={t('adm.delete')}
        variant="destructive"
        onConfirm={handleDeleteAllocation}
      />

      <ConfirmDialog
        open={Boolean(deleteDocument)}
        onOpenChange={(open) => !open && setDeleteDocument(null)}
        title={t('adm.deleteDocument')}
        description={t('adm.deleteDocumentDescription')}
        confirmText={t('adm.delete')}
        variant="destructive"
        onConfirm={handleDeleteDocument}
      />
    </div>
  );
}
