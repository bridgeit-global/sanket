'use client';

import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from '@/hooks/use-translations';
import type {
  AdmDocument,
  AdmFundAllocationWithProject,
  AdmFundRecordWithDetails,
} from '@/lib/db/schema';
import {
  AdmFundRecordCard,
  type AdmProjectOption,
} from './adm-fund-record-card';

interface AdmFundDetailProps {
  fund: AdmFundRecordWithDetails;
  projects: AdmProjectOption[];
  onBack: () => void;
  onUpdateFund: (
    fundId: string,
    values: { financialYear: string; budget: number },
  ) => Promise<void>;
  onDeleteFund: (fundId: string) => void;
  onAddAllocation: (
    fundRecordId: string,
    projectId: string,
    allocatedBudget: number,
  ) => Promise<void>;
  onCreateProject: (
    fundRecordId: string,
    values: {
      name: string;
      department?: string;
      allocatedBudget: number;
    },
  ) => Promise<void>;
  onUpdateAllocation: (id: string, allocatedBudget: number) => Promise<void>;
  onDeleteAllocation: (allocation: AdmFundAllocationWithProject) => void;
  onUploadDocument: (
    fundRecordId: string,
    file: File,
    kind: string,
  ) => Promise<void>;
  onDeleteDocument: (fundRecordId: string, document: AdmDocument) => void;
}

export type { AdmProjectOption };

export function AdmFundDetail({
  fund,
  projects,
  onBack,
  onUpdateFund,
  onDeleteFund,
  onAddAllocation,
  onCreateProject,
  onUpdateAllocation,
  onDeleteAllocation,
  onUploadDocument,
  onDeleteDocument,
}: AdmFundDetailProps) {
  const { t } = useTranslations();

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        className="min-h-10"
        onClick={onBack}
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        {t('adm.backToFunds')}
      </Button>

      <AdmFundRecordCard
        fund={fund}
        projects={projects}
        onUpdateFund={onUpdateFund}
        onDeleteFund={onDeleteFund}
        onAddAllocation={onAddAllocation}
        onCreateProject={onCreateProject}
        onUpdateAllocation={onUpdateAllocation}
        onDeleteAllocation={onDeleteAllocation}
        onUploadDocument={onUploadDocument}
        onDeleteDocument={onDeleteDocument}
      />
    </div>
  );
}
