export const MAX_MATERIAL_UPLOAD_BYTES = 50_000_000

export const MATERIAL_UPLOAD_TOO_LARGE_MESSAGE = 'הקובץ גדול מדי. הגודל המרבי הוא 50MB.'

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

export function isMaterialUploadTooLarge(file: File): boolean {
  return file.size > MAX_MATERIAL_UPLOAD_BYTES
}
