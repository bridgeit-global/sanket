'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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

type QrScannerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (payload: string) => void | Promise<void>;
  title?: string;
  description?: string;
  uploadLabel?: string;
  processingUploadLabel?: string;
  closeLabel?: string;
};

async function decodeQrFromImageFile(file: File): Promise<string> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = new Image();
    image.src = objectUrl;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Could not load image'));
    });

    const { BrowserQRCodeReader } = await import('@zxing/browser');
    const reader = new BrowserQRCodeReader();
    const result = await reader.decodeFromImageElement(image);
    const text = result.getText()?.trim();
    if (!text) {
      throw new Error('No QR code found in image');
    }
    return text;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function QrScannerDialog({
  open,
  onOpenChange,
  onScan,
  title = 'Scan QR Code',
  description = 'Scan a QR code to continue.',
  uploadLabel = 'Upload photo',
  processingUploadLabel = 'Processing image…',
  closeLabel = 'Close',
}: QrScannerDialogProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const runningRef = useRef(false);
  const zxingControlsRef = useRef<{ stop: () => void } | null>(null);
  const startSeqRef = useRef(0);
  const retryTimeoutRef = useRef<number | null>(null);
  const stopPromiseRef = useRef<Promise<void> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  const handlePayload = useCallback(
    async (payload: string) => {
      try {
        await onScan(payload);
        onOpenChange(false);
      } catch (error) {
        console.error('QR scan handler error:', error);
        toast({
          type: 'error',
          description: error instanceof Error ? error.message : 'Could not read QR code',
        });
      }
    },
    [onOpenChange, onScan],
  );

  useEffect(() => {
    const stopMedia = () => {
      const video = videoRef.current;
      const videoStream = video?.srcObject instanceof MediaStream ? video.srcObject : null;
      const stream = streamRef.current ?? videoStream;

      if (stream) {
        for (const track of stream.getTracks()) {
          track.stop();
        }
      }
      streamRef.current = null;

      if (video) {
        video.pause?.();
        video.srcObject = null;
        video.load?.();
      }
    };

    const stop = () => {
      const promise = (async () => {
        startSeqRef.current += 1;
        runningRef.current = false;

        if (rafRef.current != null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        if (retryTimeoutRef.current != null) {
          window.clearTimeout(retryTimeoutRef.current);
          retryTimeoutRef.current = null;
        }

        const controls = zxingControlsRef.current;
        zxingControlsRef.current = null;
        try {
          await Promise.resolve(controls?.stop());
        } catch {
          // ignore
        }

        stopMedia();
      })();

      stopPromiseRef.current = promise;
      return promise;
    };

    const start = async () => {
      if (!open) {
        return;
      }
      if (typeof window === 'undefined') {
        return;
      }
      if (stopPromiseRef.current) {
        await stopPromiseRef.current;
      }

      const mySeq = startSeqRef.current;
      if (!window.isSecureContext) {
        toast({
          type: 'error',
          description:
            'Camera requires HTTPS on mobile. Open this page over HTTPS (or use localhost on the same device).',
        });
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        toast({ type: 'error', description: 'Camera is not available on this device.' });
        return;
      }

      try {
        const video = videoRef.current;
        if (!video || !open || mySeq !== startSeqRef.current) {
          return;
        }

        video.muted = true;
        video.autoplay = true;
        video.playsInline = true;
        video.setAttribute('muted', '');
        video.setAttribute('autoplay', '');
        video.setAttribute('playsinline', '');

        if ('BarcodeDetector' in window) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' } },
            audio: false,
          });
          if (!open || mySeq !== startSeqRef.current) {
            for (const track of stream.getTracks()) {
              track.stop();
            }
            return;
          }

          streamRef.current = stream;
          video.srcObject = stream;
          await video.play();

          const detector = new (window as Window & { BarcodeDetector: new (opts: { formats: string[] }) => { detect: (bitmap: ImageBitmap) => Promise<Array<{ rawValue?: string }>> } }).BarcodeDetector({
            formats: ['qr_code'],
          });
          runningRef.current = true;

          const tick = async () => {
            if (!runningRef.current) {
              return;
            }

            const currentVideo = videoRef.current;
            if (!currentVideo || currentVideo.readyState < 2) {
              rafRef.current = requestAnimationFrame(() => void tick());
              return;
            }

            try {
              const bitmap = await createImageBitmap(currentVideo);
              const codes = await detector.detect(bitmap);
              bitmap.close?.();
              const rawValue = codes?.[0]?.rawValue;
              if (rawValue) {
                await handlePayload(rawValue);
                stop();
                return;
              }
            } catch {
              // keep scanning
            }

            rafRef.current = requestAnimationFrame(() => void tick());
          };

          rafRef.current = requestAnimationFrame(() => void tick());
        } else {
          const { BrowserQRCodeReader } = await import('@zxing/browser');
          const reader = new BrowserQRCodeReader();
          const controls = await reader.decodeFromVideoDevice(undefined, video, (result, error, control) => {
            zxingControlsRef.current = control ?? zxingControlsRef.current;
            const text = result?.getText()?.trim();
            if (text) {
              void handlePayload(text).then(() => stop());
            } else if (error) {
              // ignore transient scan errors
            }
          });
          zxingControlsRef.current = controls;
          if (video.srcObject instanceof MediaStream) {
            streamRef.current = video.srcObject;
          }
          await video.play().catch(() => {
            // Some browsers require a user gesture.
          });
        }
      } catch (error) {
        console.error('QR scanner error:', error);
        const err = error as { name?: string } | null;
        if (err?.name === 'AbortError' && open) {
          if (retryTimeoutRef.current == null) {
            retryTimeoutRef.current = window.setTimeout(() => {
              retryTimeoutRef.current = null;
              void start();
            }, 300);
          }
          return;
        }

        toast({
          type: 'error',
          description:
            'Could not access camera. Please allow camera permission and close any other app using the camera.',
        });
      }
    };

    if (open) {
      void start();
    } else {
      void stop();
    }

    return () => {
      void stop();
    };
  }, [open, handlePayload]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    setIsProcessingImage(true);
    try {
      const payload = await decodeQrFromImageFile(file);
      await handlePayload(payload);
    } catch (error) {
      console.error('QR image decode error:', error);
      toast({
        type: 'error',
        description: error instanceof Error ? error.message : 'Could not read QR code from image',
      });
    } finally {
      setIsProcessingImage(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="overflow-hidden rounded-lg border bg-black">
          <video ref={videoRef} className="h-[320px] w-full object-cover" playsInline muted autoPlay />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="outline"
            disabled={isProcessingImage}
            onClick={() => fileInputRef.current?.click()}
          >
            <ImageUp className="mr-2 h-4 w-4" />
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

export function QrScanButton({
  onClick,
  label = 'Scan QR',
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <Button type="button" variant="outline" size="sm" onClick={onClick} className="shrink-0">
      <ScanLine className="mr-2 h-4 w-4" />
      {label}
    </Button>
  );
}
