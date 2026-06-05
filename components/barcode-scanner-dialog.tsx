'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DetectedBarcode } from 'react-barcode-scanner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/toast';
import { ImageUp, ScanLine } from 'lucide-react';

const BarcodeScanner = dynamic(
  () =>
    import('react-barcode-scanner/polyfill').then(() =>
      import('react-barcode-scanner').then((mod) => mod.BarcodeScanner),
    ),
  { ssr: false },
);

const SCANNER_FORMATS = [
  'code_128',
  'code_39',
  'code_93',
  'codabar',
  'ean_13',
  'ean_8',
  'itf',
  'upc_a',
  'upc_e',
  'qr_code',
];

type BarcodeScannerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (payload: string) => void | Promise<void>;
  title?: string;
  description?: string;
  uploadLabel?: string;
  processingUploadLabel?: string;
  closeLabel?: string;
};

async function decodeBarcodeFromImageFile(file: File): Promise<string> {
  await import('react-barcode-scanner/polyfill');

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = new Image();
    image.src = objectUrl;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Could not load image'));
    });

    const bitmap = await createImageBitmap(image);
    try {
      const detector = new BarcodeDetector({ formats: SCANNER_FORMATS });
      const codes = await detector.detect(bitmap);
      const rawValue = codes?.[0]?.rawValue?.trim();
      if (!rawValue) {
        throw new Error('No barcode found in image');
      }
      return rawValue;
    } finally {
      bitmap.close?.();
    }
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function BarcodeScannerDialog({
  open,
  onOpenChange,
  onScan,
  title = 'Scan barcode',
  description = 'Point your camera at the barcode to auto-fill data.',
  uploadLabel = 'Upload photo',
  processingUploadLabel = 'Processing image…',
  closeLabel = 'Close',
}: BarcodeScannerDialogProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const processingPayloadRef = useRef(false);
  const lastRejectedPayloadRef = useRef<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isProcessingScan, setIsProcessingScan] = useState(false);

  const scannerOptions = useMemo(
    () => ({ delay: 500, formats: SCANNER_FORMATS }),
    [],
  );

  const handlePayload = useCallback(
    async (payload: string) => {
      if (processingPayloadRef.current) return false;
      processingPayloadRef.current = true;
      setIsProcessingScan(true);
      try {
        await onScan(payload);
        lastRejectedPayloadRef.current = null;
        onOpenChange(false);
        return true;
      } catch (error) {
        console.error('Barcode scan handler error:', error);
        if (lastRejectedPayloadRef.current !== payload) {
          lastRejectedPayloadRef.current = payload;
          toast({
            type: 'error',
            description:
              error instanceof Error ? error.message : 'Could not read barcode',
          });
        }
        return false;
      } finally {
        processingPayloadRef.current = false;
        setIsProcessingScan(false);
      }
    },
    [onOpenChange, onScan],
  );

  const onCapture = useCallback(
    (barcodes: DetectedBarcode[]) => {
      const rawValue = barcodes?.[0]?.rawValue?.trim();
      if (!rawValue || rawValue === lastRejectedPayloadRef.current) return;
      void handlePayload(rawValue);
    },
    [handlePayload],
  );

  useEffect(() => {
    if (!open) return;
    lastRejectedPayloadRef.current = null;

    if (typeof window === 'undefined') return;
    if (!window.isSecureContext) {
      toast({
        type: 'error',
        description:
          'Camera requires HTTPS on mobile. Open this page over HTTPS (or use localhost on the same device).',
      });
    }
  }, [open]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setIsProcessingImage(true);
    try {
      const payload = await decodeBarcodeFromImageFile(file);
      await handlePayload(payload);
    } catch (error) {
      console.error('Barcode image decode error:', error);
      toast({
        type: 'error',
        description:
          error instanceof Error ? error.message : 'Could not read barcode from image',
      });
    } finally {
      setIsProcessingImage(false);
    }
  };

  const isPaused = !open || isProcessingScan || isProcessingImage;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="h-[320px] overflow-hidden rounded-lg border bg-black">
          {open ? (
            <BarcodeScanner
              className="h-full w-full object-cover"
              options={scannerOptions}
              onCapture={onCapture}
              paused={isPaused}
              trackConstraints={{
                facingMode: { ideal: 'environment' },
              }}
            />
          ) : null}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="outline"
            disabled={isProcessingImage}
            onClick={() => fileInputRef.current?.click()}
          >
            <ImageUp className="mr-2 size-4" />
            {isProcessingImage ? processingUploadLabel : uploadLabel}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(event) => void handleImageUpload(event)}
          />
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {closeLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function BarcodeScanButton({
  onClick,
  label = 'Scan barcode',
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <Button type="button" variant="outline" size="sm" onClick={onClick} className="shrink-0">
      <ScanLine className="mr-2 size-4" />
      {label}
    </Button>
  );
}
