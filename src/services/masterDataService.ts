import { ApiError, request } from '../lib/api'

export type MasterDataVersionStatus = 'DRAFT' | 'ACTIVE' | 'RETIRED'

/** One subject's label set as imported from a workbook. */
export interface MasterDataVersion {
  id: string
  categoryId: string
  categoryName: string
  version: string
  codePrefix: string | null
  status: MasterDataVersionStatus
  importedAt: string | null
  importedBy?: string | null
  sourceFilename: string | null
  description?: string | null
  clonedFromVersionId?: string | null
  activatedAt: string | null
  activatedBy?: string | null
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
  sheetRowCounts?: Record<string, number>
}

export type ValidationItem = MasterDataIssue
export type ValidationReport = MasterDataReport & { sheetRowCounts: Record<string, number> }

export interface MasterDataImportResult {
  versionId: string
  version: string
  status: MasterDataVersionStatus
  summary: Record<string, number>
  warnings: MasterDataIssue[]
}

export type ImportResult = MasterDataImportResult

export interface MasterDataCategory {
  categoryId: string
  categoryName: string
  codePrefix: string
  versionId: string
  version: string
}

export interface MdDomain {
  id: string
  code: string
  nameVi: string
  nameEn: string | null
  scope: string | null
  curriculumLevel: string | null
  sourceStatus: string | null
  notes: string | null
}

export interface MdPattern {
  id: string
  code: string
  domainCode: string
  domainNameVi: string | null
  nameVi: string
  canonicalPrompt: string | null
  stimulusType: string | null
  stimulusKind: string | null
  responseType: string | null
  primarySkillCode: string | null
  difficultyBand: string | null
  difficultyMin?: DifficultyLevel | null
  difficultyMax?: DifficultyLevel | null
  vactRelevance: string | null
  sourceStatus: string | null
  notes: string | null
}

export type DifficultyLevel = 'DE' | 'TB' | 'KHO'

export interface MdSkill {
  id: string
  code: string
  domainCodeText: string | null
  domainCodes: string[]
  nameVi: string
  nameEn: string | null
  skillCategory: string | null
  description: string | null
  observableBehavior: string | null
  level: string | null
  prerequisiteSkillCode: string | null
  vactRelevance: string | null
  sourceStatus: string | null
}

export interface MdMicroSkill {
  id: string
  code: string
  skillCode: string
  nameVi: string
  description: string | null
  masteryEvidence: string | null
  suggestedDrill: string | null
  defaultErrorCode: string | null
  difficultyBand: string | null
  sourceStatus: string | null
}

export interface MdMapping {
  id: string
  patternCode: string
  skillCode: string
  microSkillCode: string | null
  role: 'PRIMARY' | 'SUPPORTING' | null
  weight: number | null
  notes: string | null
}

export interface MdErrorCode {
  id: string
  code: string
  errorCategory: string | null
  nameVi: string
  diagnosticRule: string | null
  remediationAction: string | null
  appliesToText: string | null
  allDomains: boolean
  domainCodes: string[]
}

/** All tables belonging to one version; public active data omits mappings. */
export interface MasterDataContent {
  domains: MdDomain[]
  patterns: MdPattern[]
  skills: MdSkill[]
  microSkills: MdMicroSkill[]
  mappings: MdMapping[]
  errorCodes: MdErrorCode[]
}

export interface VersionDiff {
  candidateVersion: string
  activeVersion: string | null
  addedDomains: string[]
  removedDomains: string[]
  addedPatterns: string[]
  removedPatterns: string[]
  addedSkills: string[]
  removedSkills: string[]
  addedMicroSkills: string[]
  removedMicroSkills: string[]
  addedErrorCodes: string[]
  removedErrorCodes: string[]
  affectedQuestionsCount: number
  affectedLessonsCount: number
}

/** A workbook the backend refused, with its per-sheet validation report. */
export class MasterDataImportRejected extends Error {
  report: ValidationReport

  constructor(message: string, report: MasterDataReport) {
    super(message)
    this.name = 'MasterDataImportRejected'
    this.report = { ...report, sheetRowCounts: report.sheetRowCounts ?? {} }
  }
}

const BASE = '/api/v1/admin/master-data'
const versionPath = (id: string) => `${BASE}/versions/${encodeURIComponent(id)}`

async function requireData<T>(path: string, fallback: string, options?: Parameters<typeof request<T>>[1]): Promise<T> {
  const response = await request<T>(path, { auth: true, ...options })
  if (response.data === undefined || response.data === null) throw new Error(fallback)
  return response.data
}

export function getVersions(categoryId: string): Promise<MasterDataVersion[]> {
  return requireData(
    `${BASE}/versions?categoryId=${encodeURIComponent(categoryId)}`,
    'Không thể tải các phiên bản master data.'
  )
}

/** Kept for the existing import screen while the detailed workspace uses `getVersions`. */
export const getMasterDataVersions = getVersions

export async function getVersionContent(versionId: string): Promise<MasterDataContent> {
  const part = <T>(name: string) =>
    requireData<T[]>(`${versionPath(versionId)}/${name}`, 'Không thể tải dữ liệu master data.')
  const [domains, patterns, skills, microSkills, mappings, errorCodes] = await Promise.all([
    part<MdDomain>('domains'),
    part<MdPattern>('patterns'),
    part<MdSkill>('skills'),
    part<MdMicroSkill>('micro-skills'),
    part<MdMapping>('mappings'),
    part<MdErrorCode>('error-codes'),
  ])
  return { domains, patterns, skills, microSkills, mappings, errorCodes }
}

export function getActiveCategories(): Promise<MasterDataCategory[]> {
  return requireData('/api/v1/master-data/categories', 'Không thể tải danh sách môn có master data.')
}

export async function getActiveContent(categoryId: string): Promise<MasterDataContent> {
  const part = <T>(name: string) =>
    requireData<T[]>(
      `/api/v1/master-data/${name}?categoryId=${encodeURIComponent(categoryId)}`,
      'Không thể tải dữ liệu master data.'
    )
  const [domains, patterns, skills, microSkills, errorCodes] = await Promise.all([
    part<MdDomain>('domains'),
    part<MdPattern>('patterns'),
    part<MdSkill>('skills'),
    part<MdMicroSkill>('micro-skills'),
    part<MdErrorCode>('error-codes'),
  ])
  return { domains, patterns, skills, microSkills, mappings: [], errorCodes }
}

export function activateVersion(versionId: string): Promise<MasterDataVersion> {
  return requireData(`${versionPath(versionId)}/activate`, 'Không nhận được phiên bản vừa kích hoạt.', {
    method: 'POST',
  })
}

export const activateMasterDataVersion = activateVersion

export async function deleteDraftVersion(versionId: string): Promise<void> {
  await request<void>(versionPath(versionId), { auth: true, method: 'DELETE' })
}

export const deleteMasterDataDraft = deleteDraftVersion

/** Copies a version into a new DRAFT, the only kind of version whose labels can be changed. */
export function cloneVersion(versionId: string, body: { version: string; description: string | null }): Promise<MasterDataVersion> {
  return requireData(`${versionPath(versionId)}/clone`, 'Không nhận được bản nháp vừa tạo.', { method: 'POST', body })
}

export interface DomainBody {
  code: string
  nameVi: string
  nameEn: string | null
  scope: string | null
  curriculumLevel: string | null
  sourceStatus: string | null
  notes: string | null
}

export interface PatternBody {
  code: string
  domainCode: string
  nameVi: string
  canonicalPrompt: string | null
  stimulusType: string | null
  stimulusKind: string | null
  responseType: string | null
  difficultyMin: DifficultyLevel | null
  difficultyMax: DifficultyLevel | null
  vactRelevance: string | null
  sourceStatus: string | null
  notes: string | null
}

export interface SkillBody {
  code: string
  domainCodes: string[]
  nameVi: string
  nameEn: string | null
  skillCategory: string | null
  description: string | null
  observableBehavior: string | null
  level: string | null
  prerequisiteSkillCode: string | null
  vactRelevance: string | null
  sourceStatus: string | null
}

export interface MicroSkillBody {
  code: string
  skillCode: string
  nameVi: string
  description: string | null
  masteryEvidence: string | null
  suggestedDrill: string | null
  defaultErrorCode: string | null
  difficultyBand: string | null
  sourceStatus: string | null
}

export interface ErrorCodeBody {
  code: string
  errorCategory: string | null
  nameVi: string
  diagnosticRule: string | null
  remediationAction: string | null
  allDomains: boolean
  domainCodes: string[]
}

export interface MappingBody {
  patternCode: string
  skillCode: string
  microSkillCode: string | null
  role: 'PRIMARY' | 'SUPPORTING'
  weight: number
  notes: string | null
}

/** What a draft holds, by the path segment of its endpoints. */
export interface LabelBodies {
  domains: DomainBody
  patterns: PatternBody
  skills: SkillBody
  'micro-skills': MicroSkillBody
  'error-codes': ErrorCodeBody
  mappings: MappingBody
}

/** Creates a label in a draft (no id) or replaces one (with its id); a code never changes. */
export function saveLabel<K extends keyof LabelBodies>(
  versionId: string,
  segment: K,
  id: string | null,
  body: LabelBodies[K]
): Promise<unknown> {
  const path = `${versionPath(versionId)}/${segment}${id ? `/${encodeURIComponent(id)}` : ''}`
  return requireData(path, 'Không nhận được dữ liệu vừa lưu.', { method: id ? 'PUT' : 'POST', body })
}

export async function deleteLabel(versionId: string, segment: keyof LabelBodies, id: string): Promise<void> {
  await request<void>(`${versionPath(versionId)}/${segment}/${encodeURIComponent(id)}`, { auth: true, method: 'DELETE' })
}

export function getVersionDiff(versionId: string): Promise<VersionDiff> {
  return requireData(`${versionPath(versionId)}/diff`, 'Không thể so sánh phiên bản.')
}

async function uploadWorkbook(categoryId: string, file: File): Promise<MasterDataImportResult> {
  const body = new FormData()
  body.append('file', file)
  body.append('categoryId', categoryId)
  return requireData(`${BASE}/import`, 'Không nhận được kết quả nhập file.', {
    method: 'POST',
    body,
    timeoutMs: 120_000,
  })
}

/** Imports a workbook as a DRAFT; rejected workbooks carry the server's row report. */
export async function importWorkbook(categoryId: string, file: File): Promise<ImportResult> {
  try {
    return await uploadWorkbook(categoryId, file)
  } catch (error) {
    const report = reportOf(error)
    if (report) throw new MasterDataImportRejected(error instanceof Error ? error.message : 'File không hợp lệ.', report)
    throw error
  }
}

/** Existing upload entry point; keeps the original ApiError behavior for `reportOf` callers. */
export const importMasterData = uploadWorkbook

function isReport(value: unknown): value is MasterDataReport {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as MasterDataReport).errors) &&
    Array.isArray((value as MasterDataReport).warnings)
  )
}

/** The per-row report of a workbook rejection, or null for any other failure. */
export function reportOf(error: unknown): MasterDataReport | null {
  if (error instanceof MasterDataImportRejected) return error.report
  if (!(error instanceof ApiError) || error.status !== 400) return null
  const report = error.details ?? error.data
  return isReport(report) ? { ...report, sheetRowCounts: report.sheetRowCounts ?? {} } : null
}
