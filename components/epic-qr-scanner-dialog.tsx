'use client';

import { useCallback } from 'react';
import { toast } from '@/components/toast';
import { QrScanButton, QrScannerDialog } from '@/components/qr-scanner-dialog';
import { decodeEpicQrPayload, type EpicQrData } from '@/lib/epic/decode-qr-payload';

type EpicQrScannerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDataDetected: (data: EpicQrData) => void;
  title?: string;
  description?: string;
  uploadLabel?: string;
};

export function EpicQrScannerDialog({
  open,
  onOpenChange,
  onDataDetected,
  title = 'Scan Voter ID QR',
  description = 'Scan the QR code on the voter ID card to prefill the EPIC number.',
  uploadLabel = 'Upload voter ID photo',
}: EpicQrScannerDialogProps) {
  const handleScan = useCallback(
    async (payload: string) => {
      const data = await decodeEpicQrPayload(payload);
      onDataDetected(data);
      toast({ type: 'success', description: `Prefilled EPIC number ${data.epic}` });
    },
    [onDataDetected],
  );

  return (
    <QrScannerDialog
      open={open}
      onOpenChange={onOpenChange}
      onScan={handleScan}
      title={title}
      description={description}
      uploadLabel={uploadLabel}
    />
  );
}

export function EpicQrScanButton({
  onClick,
  label = 'Scan Voter ID QR',
}: {
  onClick: () => void;
  label?: string;
}) {
  return <QrScanButton onClick={onClick} label={label} />;
}
