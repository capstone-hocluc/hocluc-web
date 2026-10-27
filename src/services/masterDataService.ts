import { ApiError, request } from '../lib/api'

export type MasterDataVersionStatus = 'DRAFT' | 'ACTIVE' | 'RETIRED'

export interface MasterDataVersion {
  id: string
  categoryId: string
  categoryName: string
  version: string
  codePrefix: string | null
  status: MasterDataVersionStatus
  importedAt: string | null
  sourceFilename: string | null
  activatedAt: string | null
}

export interface MasterDataIssue {
  sheetName: string
  rowNumber: number
  columnName: string | null
  message: string
}

export interface MasterDataReport {
  valid: boolean
  errors: MasterDataIssue[]
  warnings: MasterDataIssue[]
}

export interface MasterDataImportResult {
  versionId: string
  version: string
  status: MasterDataVersionStatus
  summary: Record<string, number>
  warnings: MasterDataIssue[]
}

const BASE = '/api/v1/admin/master-data'
const requireData = <T>(response: { data?: T }): T => {
  if (response.data === undefined) throw new Error('Không nhận được dữ liệu Master Data.')
  return response.data
}

// STAFF, MANAGER, ADMINISTRATOR; the backend also requires AUTHOR on the subject (administrators always have it).
export async function getMasterDataVersions(categoryId: string): Promise<MasterDataVersion[]> {
  return requireData(
    await request<MasterDataVersion[]>(`${BASE}/versions?categoryId=${encodeURIComponent(categoryId)}`, { auth: true })
  )
}

/** Imports an Excel workbook as a DRAFT version of the subject. A rejected workbook throws with its report in `details`. */
export async function importMasterData(categoryId: string, file: File): Promise<MasterDataImportResult> {
  const body = new FormData()
  body.set('categoryId', categoryId)
  body.set('file', file)
  return requireData(
    await request<MasterDataImportResult>(`${BASE}/import`, { auth: true, method: 'POST', body, timeoutMs: 120_000 })
  )
}

export async function activateMasterDataVersion(versionId: string): Promise<MasterDataVersion> {
  return requireData(
    await request<MasterDataVersion>(`${BASE}/versions/${encodeURIComponent(versionId)}/activate`, {
      auth: true,
      method: 'POST',
    })
  )
}

export async function deleteMasterDataDraft(versionId: string): Promise<void> {
  await request<void>(`${BASE}/versions/${encodeURIComponent(versionId)}`, { auth: true, method: 'DELETE' })
}

/** The per-row report of a workbook the server refused, or null for any other failure. */
export function reportOf(error: unknown): MasterDataReport | null {
  if (!(error instanceof ApiError) || error.status !== 400) return null
  const report = error.details as Partial<MasterDataReport> | undefined
  return report && Array.isArray(report.errors) ? { valid: false, errors: report.errors, warnings: report.warnings ?? [] } : null
}
