import { request } from '../lib/api'

export const IMAGE_UPLOAD_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const
export const IMAGE_UPLOAD_MAX_BYTES = 5 * 1024 * 1024

interface PresignedUpload {
  uploadUrl: string
  storageKey: string
}
interface StoredFile {
  url: string
}

/** The problem with a picked image, or null when it can be uploaded. */
export function imageFileProblem(file: File): string | null {
  if (!(IMAGE_UPLOAD_TYPES as readonly string[]).includes(file.type)) {
    return 'Chỉ nhận ảnh PNG, JPG hoặc WebP.'
  }
  if (file.size <= 0) return 'Ảnh trống.'
  if (file.size > IMAGE_UPLOAD_MAX_BYTES) return 'Ảnh lớn hơn 5MB.'
  return null
}

/**
 * Uploads an image the whole site may see (course covers) and returns its public address:
 * ask the backend for an upload link, send the file straight to storage, then confirm it.
 */
export async function uploadPublicImage(file: File, entityType: string): Promise<string> {
  const problem = imageFileProblem(file)
  if (problem) throw new Error(problem)

  const slot = await request<PresignedUpload>('/api/v1/files/upload-urls', {
    method: 'POST',
    auth: true,
    body: {
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      category: 'GENERIC_ASSET',
      entityType,
    },
  })
  if (!slot.data) throw new Error('Không lấy được liên kết tải ảnh lên.')

  let stored: Response
  try {
    stored = await fetch(slot.data.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    })
  } catch {
    throw new Error('Không gửi được ảnh lên kho lưu trữ. Kiểm tra mạng và thử lại.')
  }
  if (!stored.ok) throw new Error('Kho lưu trữ từ chối ảnh. Thử lại hoặc chọn ảnh khác.')

  const done = await request<StoredFile>('/api/v1/files/complete-upload', {
    method: 'POST',
    auth: true,
    body: {
      storageKey: slot.data.storageKey,
      fileName: file.name,
      category: 'GENERIC_ASSET',
      entityType,
    },
  })
  if (!done.data?.url) throw new Error('Không xác nhận được ảnh đã tải lên.')
  return done.data.url
}
