import { request } from '../lib/api'

export const IMAGE_UPLOAD_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const
export const IMAGE_UPLOAD_MAX_BYTES = 5 * 1024 * 1024
export const VIDEO_UPLOAD_TYPES = ['video/mp4', 'video/webm'] as const
export const VIDEO_UPLOAD_MAX_BYTES = 500 * 1024 * 1024

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

/** The problem with a picked intro video, or null when it can be uploaded. */
export function videoFileProblem(file: File): string | null {
  if (!(VIDEO_UPLOAD_TYPES as readonly string[]).includes(file.type)) {
    return 'Chỉ nhận video MP4 hoặc WebM.'
  }
  if (file.size <= 0) return 'Video trống.'
  if (file.size > VIDEO_UPLOAD_MAX_BYTES) return 'Video lớn hơn 500MB.'
  return null
}

// PUT straight to storage. XHR rather than fetch because only XHR reports upload progress.
function putToStorage(url: string, file: File, onProgress?: (fraction: number) => void): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    xhr.setRequestHeader('Content-Type', file.type)
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total)
    }
    xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300)
    xhr.onerror = () => reject(new Error('network'))
    xhr.send(file)
  })
}

/**
 * Uploads a file the whole site may see and returns its public address: ask the backend for an
 * upload link, send the file straight to storage, then confirm it.
 */
async function uploadPublicFile(
  file: File,
  category: 'GENERIC_ASSET' | 'COURSE_PREVIEW_VIDEO',
  entityType: string,
  noun: string,
  onProgress?: (fraction: number) => void
): Promise<string> {
  const slot = await request<PresignedUpload>('/api/v1/files/upload-urls', {
    method: 'POST',
    auth: true,
    body: { fileName: file.name, fileSize: file.size, mimeType: file.type, category, entityType },
  })
  if (!slot.data) throw new Error(`Không lấy được liên kết tải ${noun} lên.`)

  let stored: boolean
  try {
    stored = await putToStorage(slot.data.uploadUrl, file, onProgress)
  } catch {
    throw new Error(`Không gửi được ${noun} lên kho lưu trữ. Kiểm tra mạng và thử lại.`)
  }
  if (!stored) throw new Error(`Kho lưu trữ từ chối ${noun}. Thử lại hoặc chọn tệp khác.`)

  const done = await request<StoredFile>('/api/v1/files/complete-upload', {
    method: 'POST',
    auth: true,
    body: { storageKey: slot.data.storageKey, fileName: file.name, category, entityType },
  })
  if (!done.data?.url) throw new Error(`Không xác nhận được ${noun} đã tải lên.`)
  return done.data.url
}

/** Uploads a public image (course covers) and returns its address. */
export async function uploadPublicImage(file: File, entityType: string): Promise<string> {
  const problem = imageFileProblem(file)
  if (problem) throw new Error(problem)
  return uploadPublicFile(file, 'GENERIC_ASSET', entityType, 'ảnh')
}

/** Uploads a course's intro video, shown on its public page, and returns its address. */
export async function uploadCoursePreviewVideo(
  file: File,
  onProgress?: (fraction: number) => void
): Promise<string> {
  const problem = videoFileProblem(file)
  if (problem) throw new Error(problem)
  return uploadPublicFile(file, 'COURSE_PREVIEW_VIDEO', 'COURSE', 'video', onProgress)
}
