import type { Page } from '@playwright/test'
import type { ExamYear } from '../../src/services/examYearService'
import { installQuizFixture } from './quiz-permissions-fixture'

const stamp = '2026-10-17T00:00:00Z'
const emptyPage = {
  content: [],
  pageNumber: 0,
  pageSize: 20,
  totalElements: 0,
  totalPages: 0,
  last: true,
}
const stats = {
  total: 0,
  needsReview: 0,
  unlabelled: 0,
  byPart: {},
  byYear: {},
  byAnswerSource: { PUBLISHED_KEY: 0, REFERENCE_KEY: 0, NONE: 0 },
  bySubject: [],
}
const examYear: ExamYear = {
  id: 'exam-year-2021',
  assessmentType: 'TN_THPT',
  examYear: 2021,
  name: 'Năm thi 2021',
  status: 'ACTIVE',
  note: null,
  updatedAt: stamp,
  sessions: [
    {
      id: 'exam-session-1',
      examYearId: 'exam-year-2021',
      roundNo: 1,
      name: 'Đợt 1',
      examStartDate: '2021-07-07',
      examEndDate: null,
      dateConfirmed: true,
      registrationOpenDate: null,
      registrationCloseDate: null,
      courseCount: 0,
      updatedAt: stamp,
    },
    {
      id: 'exam-session-2',
      examYearId: 'exam-year-2021',
      roundNo: 2,
      name: 'Đợt 2',
      examStartDate: '2021-08-07',
      examEndDate: null,
      dateConfirmed: true,
      registrationOpenDate: null,
      registrationCloseDate: null,
      courseCount: 0,
      updatedAt: stamp,
    },
  ],
}
const queuedPaper = {
  id: 'bank-source-round',
  code: 'de-2021',
  title: 'Đề 2021',
  year: 2021,
  round: 'DE_MAU',
  answerSource: 'REFERENCE_KEY',
  status: 'PENDING',
  progress: 'Đang đọc đề',
  error: null,
  questionCount: 0,
  duplicateCount: 0,
  needsReviewCount: 0,
  unlabelledCount: 0,
  finishedAt: null,
  retryable: false,
}

/** A question bank with nothing in it yet, and one exam year that has two sittings. */
export async function installBankRoundFixture(page: Page) {
  const state = await installQuizFixture(page, 'STAFF')
  let upload: string | null = null
  await page.route('**/api/v1/question-bank/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const ok = (data: unknown) =>
      route.fulfill({ json: { success: true, status: 200, message: 'OK', data } })
    if (path.endsWith('/me/scopes'))
      return ok({ administrator: false, authorSubjectIds: [], reviewerSubjectIds: [] })
    if (path.endsWith('/stats')) return ok(stats)
    if (path.endsWith('/patterns')) return ok([])
    if (path.endsWith('/labelling')) return ok({ ready: true, reason: null })
    if (path.endsWith('/questions')) return ok(emptyPage)
    if (path.endsWith('/sources')) {
      if (request.method() === 'POST') {
        upload = request.postData()
        return route.fulfill({
          status: 202,
          json: { success: true, status: 202, message: 'OK', data: queuedPaper },
        })
      }
      return ok([])
    }
    return route.fulfill({
      status: 404,
      json: { success: false, status: 404, message: `Unhandled ${request.method()} ${path}` },
    })
  })
  await page.route('**/api/v1/admin/exam-years', async (route) => {
    await route.fulfill({
      json: { success: true, status: 200, message: 'OK', data: [examYear] },
    })
  })
  return { state, upload: () => upload }
}
