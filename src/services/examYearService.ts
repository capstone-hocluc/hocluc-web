import { request } from '../lib/api'

export type ExamYearStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED'

/** One sitting of an exam year (Đợt 1, Đợt 2, ...). Dates are yyyy-MM-dd. */
export interface ExamSession {
  id: string
  examYearId: string
  roundNo: number
  name: string
  examStartDate: string
  /** Last exam day when the sitting spans several days; null for a one-day sitting. */
  examEndDate: string | null
  /** False while the date is only expected ("dự kiến"). */
  dateConfirmed: boolean
  registrationOpenDate: string | null
  registrationCloseDate: string | null
  /** MAIN courses preparing for it; it cannot be deleted while above 0. */
  courseCount: number
  updatedAt: string
}

/** An exam year, e.g. "Năm thi 2026-2027" (examYear 2027), with its sittings in round order. */
export interface ExamYear {
  id: string
  assessmentType: string
  examYear: number
  name: string
  status: ExamYearStatus
  note: string | null
  updatedAt: string
  sessions: ExamSession[]
}

/** The sitting a MAIN course prepares for, as the course responses carry it. */
export interface ExamSessionSummary {
  id: string
  name: string
  roundNo: number
  examYearId: string
  examYear: number
  examYearName: string
  examStartDate: string
  examEndDate: string | null
  dateConfirmed: boolean
}

export interface SaveExamSessionRequest {
  roundNo: number
  name?: string | null
  examStartDate: string
  examEndDate?: string | null
  dateConfirmed: boolean
  registrationOpenDate?: string | null
  registrationCloseDate?: string | null
  expectedUpdatedAt?: string
}

export interface SaveExamYearRequest {
  examYear: number
  name?: string | null
  note?: string | null
  /** Create only: the sittings created with the year. */
  sessions?: SaveExamSessionRequest[]
  expectedUpdatedAt?: string
}

async function requireData<T>(
  path: string,
  fallbackMessage: string,
  options?: Parameters<typeof request<T>>[1]
): Promise<T> {
  const response = await request<T>(path, { auth: true, ...options })
  if (!response.data) throw new Error(fallbackMessage)
  return response.data
}

const ADMIN = '/api/v1/admin'

export function getAdminExamYears(): Promise<ExamYear[]> {
  return requireData(`${ADMIN}/exam-years`, 'Không thể tải danh sách năm thi.')
}

export function createExamYear(payload: SaveExamYearRequest): Promise<ExamYear> {
  return requireData(`${ADMIN}/exam-years`, 'Không thể tạo năm thi.', {
    method: 'POST',
    body: payload,
  })
}

export function updateExamYear(id: string, payload: SaveExamYearRequest): Promise<ExamYear> {
  return requireData(`${ADMIN}/exam-years/${encodeURIComponent(id)}`, 'Không thể lưu năm thi.', {
    method: 'PUT',
    body: payload,
  })
}

/** ACTIVE closes the year that was active before. */
export function changeExamYearStatus(id: string, status: ExamYearStatus): Promise<ExamYear> {
  return requireData(
    `${ADMIN}/exam-years/${encodeURIComponent(id)}/status`,
    'Không thể đổi trạng thái năm thi.',
    {
      method: 'PATCH',
      body: { status },
    }
  )
}

export function deleteExamYear(id: string): Promise<void> {
  return request<void>(`${ADMIN}/exam-years/${encodeURIComponent(id)}`, {
    auth: true,
    method: 'DELETE',
  }).then(() => undefined)
}

export function addExamSession(
  examYearId: string,
  payload: SaveExamSessionRequest
): Promise<ExamYear> {
  return requireData(
    `${ADMIN}/exam-years/${encodeURIComponent(examYearId)}/sessions`,
    'Không thể thêm đợt thi.',
    {
      method: 'POST',
      body: payload,
    }
  )
}

export function updateExamSession(id: string, payload: SaveExamSessionRequest): Promise<ExamYear> {
  return requireData(`${ADMIN}/exam-sessions/${encodeURIComponent(id)}`, 'Không thể lưu đợt thi.', {
    method: 'PUT',
    body: payload,
  })
}

export function deleteExamSession(id: string): Promise<void> {
  return request<void>(`${ADMIN}/exam-sessions/${encodeURIComponent(id)}`, {
    auth: true,
    method: 'DELETE',
  }).then(() => undefined)
}

/** Public: every year that is not a draft, newest first. */
export async function getExamYears(): Promise<ExamYear[]> {
  const response = await request<ExamYear[]>('/api/v1/exam-years')
  return response.data ?? []
}

/** Public: the active year, or null when none is set. */
export async function getCurrentExamYear(): Promise<ExamYear | null> {
  const response = await request<ExamYear | null>('/api/v1/exam-years/current')
  return response.data ?? null
}
