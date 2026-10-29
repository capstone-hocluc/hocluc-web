import type { Page, Route } from '@playwright/test'
import type { UserRole } from '../../src/services/userService'
import type { MasterDataIssue, MasterDataReport, MasterDataVersion } from '../../src/services/masterDataService'
import { installQuizFixture } from './quiz-permissions-fixture'

export const issue = (
  sheetName: string,
  message: string,
  details: { rowNumber?: number; columnName?: string | null } = {}
): MasterDataIssue => ({
  sheetName,
  rowNumber: details.rowNumber ?? 2,
  columnName: details.columnName ?? 'code',
  message,
})

export const report = (
  errors: MasterDataIssue[] = [],
  warnings: MasterDataIssue[] = []
): MasterDataReport => ({
  valid: errors.length === 0,
  errors,
  warnings,
  sheetRowCounts: { Domains: 2 },
})

const version = (status: MasterDataVersion['status']): MasterDataVersion => ({
  id: 'v-1',
  categoryId: 'category-1',
  categoryName: 'Toán',
  version: '1.0',
  codePrefix: 'MA',
  status,
  importedAt: '2026-10-20T08:00:00Z',
  sourceFilename: 'toan.xlsx',
  activatedAt: null,
})

/** One answer per validation request, 'fail' for a 500; the last answer repeats. */
type ValidationAnswer = MasterDataReport | 'fail'

interface MasterDataOptions {
  role?: UserRole
  versions?: MasterDataVersion['status'][]
  validations?: ValidationAnswer[]
  /** POST activate answers with this rejection instead of activating the draft. */
  activateRejection?: { status: number; report: MasterDataReport }
  importAnswer?: 'ok' | 'invalid'
}

/** Subject, draft version and validation endpoints behind the master data screen, for browser tests. */
export async function installMasterData(page: Page, options: MasterDataOptions = {}) {
  const state = await installQuizFixture(page, options.role ?? 'STAFF')
  let versions = (options.versions ?? ['DRAFT']).map(version)
  const answers = [...(options.validations ?? [report()])]
  const calls: string[] = []
  const validationRequests: string[] = []

  async function handle(route: Route) {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname
    calls.push(`${request.method()} ${path}${url.search}`)
    const ok = (data: unknown) => route.fulfill({ json: { success: true, status: 200, data } })
    const fail = (status: number, message: string, data?: unknown) =>
      route.fulfill({ status, json: { success: false, status, message, data } })

    if (path === '/api/v1/master-data/categories')
      return ok([{ categoryId: 'category-1', categoryName: 'Toán', codePrefix: 'MA', versionId: 'v-1', version: '1.0' }])
    if (path.startsWith('/api/v1/master-data/')) return ok([])

    if (path.endsWith('/validation')) {
      validationRequests.push(path)
      const answer = answers.length > 1 ? answers.shift()! : answers[0]
      if (answer === 'fail') return fail(500, 'Máy chủ không kiểm tra được bản nháp.')
      return ok(answer)
    }
    if (path.endsWith('/activate') && request.method() === 'POST') {
      if (options.activateRejection)
        return fail(options.activateRejection.status, 'Bản nháp còn lỗi.', options.activateRejection.report)
      versions = versions.map((item) => ({ ...item, status: 'ACTIVE' as const, activatedAt: '2026-10-21T08:00:00Z' }))
      return ok(versions[0])
    }
    if (path.endsWith('/import') && request.method() === 'POST') {
      if (options.importAnswer === 'invalid')
        return fail(400, 'File Master Data không hợp lệ.', report([issue('Patterns', 'Mã bị trùng', { rowNumber: 7 })]))
      versions = [version('DRAFT')]
      return ok({ versionId: 'v-1', version: '1.0', status: 'DRAFT', summary: { Domains: 2 }, warnings: [] })
    }
    if (path.endsWith('/versions')) return ok(versions)
    if (/\/(domains|patterns|skills|micro-skills|mappings|error-codes)$/.test(path)) return ok([])
    return route.fulfill({ status: 404, json: { success: false, status: 404, message: 'unmatched' } })
  }

  await page.route('**/api/v1/admin/master-data/**', handle)
  await page.route('**/api/v1/master-data/**', handle)
  return { state, calls, validationRequests }
}
