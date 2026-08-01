'use client';

import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from '@/hooks/use-translations';
import type {
  AdmDocument,
  AdmFundAllocationWithProject,
  AdmFundRecordWithDetails,
} from '@/lib/db/schema';
import { AdmFundRecordCard } from './adm-fund-record-card';

interface AdmFundDetailProps {
  fund: AdmFundRecordWithDetails;
  onBack: () => void;
  onUpdateFund: (
    fundId: string,
    values: { financialYear: string; budget: number },
  ) => Promise<void>;
  onDeleteFund: (fundId: string) => void;
  onUpdateAllocation: (id: string, allocatedBudget: number) => Promise<void>;
  onDeleteAllocation: (allocation: AdmFundAllocationWithProject) => void;
  onUploadDocument: (
    fundRecordId: string,
    file: File,
    kind: string,
  ) => Promise<void>;
  onDeleteDocument: (fundRecordId: string, document: AdmDocument) => void;
}

export function AdmFundDetail({
  fund,
  onBack,
  onUpdateFund,
  onDeleteFund,
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
        onUpdateFund={onUpdateFund}
        onDeleteFund={onDeleteFund}
        onUpdateAllocation={onUpdateAllocation}
        onDeleteAllocation={onDeleteAllocation}
        onUploadDocument={onUploadDocument}
        onDeleteDocument={onDeleteDocument}
      />
    </div>
  );
}
