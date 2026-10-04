export const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp'] as const;

export const FILE_PREVIEW_ZOOM_MIN = 0.5;
export const FILE_PREVIEW_ZOOM_MAX = 2.5;
export const FILE_PREVIEW_ZOOM_STEP = 0.1;

export function getFileExt(fileName: string) {
  return fileName.split('.').pop()?.toLowerCase() ?? '';
}

export function isImageFile(fileName: string) {
  return (IMAGE_EXTS as readonly string[]).includes(getFileExt(fileName));
}

export function isPdfFile(fileName: string) {
  return getFileExt(fileName) === 'pdf';
}

export function canPreviewInline(fileName: string) {
  const ext = getFileExt(fileName);
  return [...IMAGE_EXTS, 'pdf', 'txt'].includes(ext);
}

/** Ensure the blob has a MIME type mobile browsers need to open the file. */
export function withMimeType(blob: Blob, fileName: string): Blob {
  if (blob.type && blob.type !== 'application/octet-stream') {
    return blob;
  }
  const ext = getFileExt(fileName);
  const mimeByExt: Record<string, string> = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    txt: 'text/plain',
  };
  const mime = mimeByExt[ext];
  return mime ? new Blob([blob], { type: mime }) : blob;
}

export function clampFilePreviewZoom(value: number): number {
  return Math.min(
    FILE_PREVIEW_ZOOM_MAX,
    Math.max(
      FILE_PREVIEW_ZOOM_MIN,
      Math.round(value / FILE_PREVIEW_ZOOM_STEP) * FILE_PREVIEW_ZOOM_STEP,
    ),
  );
}

export function clampFilePreviewZoomContinuous(value: number): number {
  return Math.min(
    FILE_PREVIEW_ZOOM_MAX,
    Math.max(FILE_PREVIEW_ZOOM_MIN, value),
  );
}

export function touchDistance(a: Touch, b: Touch): number {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

export async function downloadFileFromUrl(
  fileUrl: string,
  fileName: string,
): Promise<void> {
  const response = await fetch(fileUrl);
  if (!response.ok) throw new Error('Failed to fetch file');
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);
}
