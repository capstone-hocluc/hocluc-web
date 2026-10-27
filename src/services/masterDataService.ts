import { ApiError, request } from '../lib/api'

/** DRAFT: imported, not used yet. ACTIVE: the subject's labels. RETIRED: replaced by a newer one. */
export type MasterDataVersionStatus = 'DRAFT' | 'ACTIVE' | 'RETIRED'

/** One subject's label set as imported from a workbook. */
export interface MasterDataVersion {
  id: string
  categoryId: string
  categoryName: string
  version: string
  codePrefix: string
  status: MasterDataVersionStatus
  importedAt: string | null
  importedBy: string | null
  sourceFilename: string | null
  description: string | null
  clonedFromVersionId: string | null
  activatedAt: string | null
  activatedBy: string | null
}

/** A subject that has an active label set (what teachers can read). */
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
  vactRelevance: string | null
  sourceStatus: string | null
  notes: string | null
}

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

/** Everything one version holds; `mappings` is empty when read through the public endpoints. */
export interface MasterDataContent {
  domains: MdDomain[]
  patterns: MdPattern[]
  skills: MdSkill[]
  microSkills: MdMicroSkill[]
  mappings: MdMapping[]
  errorCodes: MdErrorCode[]
}

export interface ValidationItem {
  sheetName: string
  rowNumber: number
  columnName: string | null
  message: string
}

export interface ValidationReport {
  valid: boolean
  errors: ValidationItem[]
  warnings: ValidationItem[]
  sheetRowCounts: Record<string, number>
}

export interface ImportResult {
  versionId: string
  version: string
  status: MasterDataVersionStatus
  summary: Record<string, number>
  warnings: ValidationItem[]
}

/** What activating a draft would add and drop, against the subject's active version. */
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

/** A workbook the backend refused: the message plus every error and warning by sheet and row. */
export class MasterDataImportRejected extends Error {
  report: ValidationReport
  constructor(message: string, report: ValidationReport) {
    super(message)
    this.report = report
  }
}

const admin = '/api/v1/admin/master-data'
const versionPath = (id: string) => `${admin}/versions/${encodeURIComponent(id)}`

async function data<T>(path: string, fallback: string): Promise<T> {
  const response = await request<T>(path, { auth: true })
  if (response.data === undefined || response.data === null) throw new Error(fallback)
  return response.data
}

export function getVersions(categoryId: string): Promise<MasterDataVersion[]> {
  return data(
    `${admin}/versions?categoryId=${encodeURIComponent(categoryId)}`,
    'Không thể tải các phiên bản master data.'
  )
}

/** All six tables of one version (staff, managers, administrators). */
export async function getVersionContent(versionId: string): Promise<MasterDataContent> {
  const part = <T>(name: string) =>
    data<T[]>(`${versionPath(versionId)}/${name}`, 'Không thể tải dữ liệu master data.')
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

/** Subjects with an active label set, readable by any signed-in user. */
export function getActiveCategories(): Promise<MasterDataCategory[]> {
  return data('/api/v1/master-data/categories', 'Không thể tải danh sách môn có master data.')
}

/** The active version of a subject, through the public endpoints (no mappings there). */
export async function getActiveContent(categoryId: string): Promise<MasterDataContent> {
  const part = <T>(name: string) =>
    data<T[]>(
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

/** Imports a workbook as a DRAFT of the subject; a refused file throws MasterDataImportRejected. */
export async function importWorkbook(categoryId: string, file: File): Promise<ImportResult> {
  const body = new FormData()
  body.append('file', file)
  body.append('categoryId', categoryId)
  try {
    const response = await request<ImportResult>(`${admin}/import`, {
      auth: true,
      method: 'POST',
      body,
      timeoutMs: 120_000,
    })
    if (!response.data) throw new Error('Không nhận được kết quả nhập file.')
    return response.data
  } catch (error) {
    if (error instanceof ApiError && error.status === 400 && isReport(error.data)) {
      throw new MasterDataImportRejected(error.message, error.data)
    }
    throw error
  }
}

export function getVersionDiff(versionId: string): Promise<VersionDiff> {
  return data(`${versionPath(versionId)}/diff`, 'Không thể so sánh phiên bản.')
}

export async function activateVersion(versionId: string): Promise<MasterDataVersion> {
  const response = await request<MasterDataVersion>(`${versionPath(versionId)}/activate`, {
    auth: true,
    method: 'POST',
  })
  if (!response.data) throw new Error('Không nhận được phiên bản vừa kích hoạt.')
  return response.data
}

export async function deleteDraftVersion(versionId: string): Promise<void> {
  await request<void>(versionPath(versionId), { auth: true, method: 'DELETE' })
}

function isReport(value: unknown): value is ValidationReport {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as ValidationReport).errors) &&
    Array.isArray((value as ValidationReport).warnings)
  )
}
