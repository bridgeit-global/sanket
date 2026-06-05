'use client';

import { useCallback } from 'react';
import { toast } from '@/components/toast';
import {
  BarcodeScanButton,
  BarcodeScannerDialog,
} from '@/components/barcode-scanner-dialog';
import { resolveEpicFromBarcodePayload } from '@/lib/epic/resolve-epic-from-barcode';

type EpicBarcodeScannerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEpicDetected: (epic: string) => void;
  title?: string;
  description?: string;
  uploadLabel?: string;
};

export function EpicBarcodeScannerDialog({
  open,
  onOpenChange,
  onEpicDetected,
  title = 'Scan Voter ID barcode',
  description = 'Scan the barcode on the voter ID card to prefill the EPIC number.',
  uploadLabel = 'Upload voter ID photo',
}: EpicBarcodeScannerDialogProps) {
  const handleScan = useCallback(
    async (payload: string) => {
      const epic = await resolveEpicFromBarcodePayload(payload);
      if (!epic) {
        throw new Error(
          'Could not find EPIC for this barcode. The voter may not be in the electoral roll yet.',
        );
      }
      onEpicDetected(epic);
      toast({ type: 'success', description: `Prefilled EPIC number ${epic}` });
    },
    [onEpicDetected],
  );

  return (
    <BarcodeScannerDialog
      open={open}
      onOpenChange={onOpenChange}
      onScan={handleScan}
      title={title}
      description={description}
      uploadLabel={uploadLabel}
    />
  );
}

export function EpicBarcodeScanButton({
  onClick,
  label = 'Scan Voter ID barcode',
}: {
  onClick: () => void;
  label?: string;
}) {
  return <BarcodeScanButton onClick={onClick} label={label} />;
}

