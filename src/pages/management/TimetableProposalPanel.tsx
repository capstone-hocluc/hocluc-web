import { useState, type FormEvent } from 'react'
import { ApiError } from '../../lib/api'
import { SCHEDULING_TIMEZONE, localDateLabel, localToday } from '../../lib/scheduling'
import type { CourseSection } from '../../services/courseService'
import {
  confirmTimetableProposal,
  generateTimetableProposal,
  proposalSchedulesAsRecurring,
} from '../../services/timetableProposalService'
import type { DeliveryMode, TimetableProposalResponse } from '../../types/scheduling'
import type { ScheduleResourceStatus } from '../../hooks/useScheduleResource'
import Button from '../../components/console/button'
import { fieldControlClass } from '../../components/console/form-field'
import Card from '../../components/console/card'
import Notice from '../../components/console/notice'

const fieldClass = fieldControlClass

const weekdays: Record<string, string> = {
  MONDAY: 'Thứ Hai',
  TUESDAY: 'Thứ Ba',
  WEDNESDAY: 'Thứ Tư',
  THURSDAY: 'Thứ Năm',
  FRIDAY: 'Thứ Sáu',
  SATURDAY: 'Thứ Bảy',
  SUNDAY: 'Chủ Nhật',
}

const deliveryModes: Record<DeliveryMode, string> = {
  PHYSICAL: 'Trực tiếp',
  ONLINE: 'Trực tuyến',
  HYBRID: 'Kết hợp',
  OFFLINE: 'Ngoại tuyến',
}

interface Props {
  courseId: string
  sections: CourseSection[]
  sectionsStatus: ScheduleResourceStatus
  sectionsErrorMessage: string
  confirmationBlocked: boolean
  onConfirmationUnknown: () => void
  onConfirmed: () => void
}

function getSectionsMessage(status: ScheduleResourceStatus, errorMessage: string, sections: CourseSection[]) {
  if (status === 'loading') return 'Đang tải danh sách môn của khóa học.'
  if (status === 'forbidden') return 'Tài khoản hiện tại không có quyền xem nội dung khóa học.'
  if (status === 'not-found') return 'Không tìm thấy khóa học đã chọn.'
  if (status === 'error') return errorMessage || 'Không tải được danh sách môn của khóa học.'
  if (status === 'ready' && sections.length === 0) return 'Khóa học chưa có môn để tạo đề xuất thời khóa biểu.'
  return ''
}

export default function TimetableProposalPanel({
  courseId,
  sections,
  sectionsStatus,
  sectionsErrorMessage,
  confirmationBlocked,
  onConfirmationUnknown,
  onConfirmed,
}: Props) {
  const [startDate, setStartDate] = useState(localToday())
  const [endDate, setEndDate] = useState('')
  const [sectionSelection, setSectionSelection] = useState<string[] | null>(null)
  const [sessionsPerWeek, setSessionsPerWeek] = useState(2)
  const [durationMinutes, setDurationMinutes] = useState(120)
  const [preferredMode, setPreferredMode] = useState<DeliveryMode>('PHYSICAL')
  const [proposal, setProposal] = useState<TimetableProposalResponse | null>(null)
  const [busy, setBusy] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [confirmationUnknown, setConfirmationUnknown] = useState(false)
  const sectionsMessage = getSectionsMessage(sectionsStatus, sectionsErrorMessage, sections)
  const allSectionIds = sections.map((section) => section.sectionCourseId).filter(Boolean)
  const selectedSectionIds = sectionSelection ?? allSectionIds
  const confirmationLocked = confirmationUnknown || confirmationBlocked

  const clearResult = () => {
    setProposal(null)
    setSuccessMessage('')
    setErrorMessage('')
  }

  const toggleSection = (sectionId: string) => {
    clearResult()
    setSectionSelection((current) => {
      const availableIds = new Set(allSectionIds)
      const currentIds = (current ?? allSectionIds).filter((id) => availableIds.has(id))
      return currentIds.includes(sectionId)
        ? currentIds.filter((id) => id !== sectionId)
        : [...currentIds, sectionId]
    })
  }

  const generate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy || confirmationLocked) return
    if (!startDate || !endDate || startDate > endDate) {
      setErrorMessage('Chọn khoảng ngày hợp lệ; ngày kết thúc phải bằng hoặc sau ngày bắt đầu.')
      return
    }
    if (selectedSectionIds.length === 0) {
      setErrorMessage('Chọn ít nhất một môn để tạo đề xuất.')
      return
    }
    if (!Number.isInteger(sessionsPerWeek) || sessionsPerWeek < 1 || sessionsPerWeek > 7) {
      setErrorMessage('Số buổi mỗi tuần phải từ 1 đến 7.')
      return
    }
    if (!Number.isInteger(durationMinutes) || durationMinutes < 30) {
      setErrorMessage('Thời lượng mỗi buổi phải ít nhất 30 phút.')
      return
    }

    setBusy(true)
    setErrorMessage('')
    setSuccessMessage('')
    setProposal(null)
    try {
      const selected = new Set(selectedSectionIds)
      const result = await generateTimetableProposal(courseId, {
        startDate,
        endDate,
        sectionRequirements: sections
          .filter((section) => selected.has(section.sectionCourseId))
          .map((section) => ({
            sectionId: section.sectionCourseId,
            sectionTitle: section.title,
            sessionsPerWeek,
            durationMinutes,
            preferredMode,
          })),
      })
      setProposal(result)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể tạo đề xuất thời khóa biểu.')
    } finally {
      setBusy(false)
    }
  }

  const confirm = async () => {
    if (!proposal || busy || confirmationLocked || proposal.proposedSchedules.length === 0) return
    const schedules = proposalSchedulesAsRecurring(proposal, { startDate, endDate }, SCHEDULING_TIMEZONE)
    setBusy(true)
    setErrorMessage('')
    setSuccessMessage('')
    try {
      const created = await confirmTimetableProposal(courseId, { schedules })
      if (created.length !== schedules.length) {
        setConfirmationUnknown(true)
        onConfirmationUnknown()
        setErrorMessage('Máy chủ trả về số lịch khác với số lịch đã gửi. Đừng gửi lại; hãy tải lại lịch để kiểm tra kết quả.')
        onConfirmed()
        return
      }
      setProposal(null)
      setSuccessMessage(`Đã tạo ${created.length} chuỗi lịch lặp. Danh sách lịch đang được cập nhật.`)
      onConfirmed()
    } catch (error) {
      const outcomeMayBeUnknown = !(error instanceof ApiError) || error.status === 408 || error.status >= 500
      if (outcomeMayBeUnknown) {
        setConfirmationUnknown(true)
        onConfirmationUnknown()
        setErrorMessage('Chưa xác định được máy chủ đã tạo lịch hay chưa. Đừng gửi lại; hãy kiểm tra mục Chuỗi lịch lặp sau khi tải lại lịch.')
        onConfirmed()
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Không thể xác nhận đề xuất.')
      }
    } finally {
      setBusy(false)
    }
  }

  const toggleAllSections = () => {
    clearResult()
    setSectionSelection((current) => (current ?? allSectionIds).length === allSectionIds.length
      ? []
      : allSectionIds
    )
  }

  const controlsDisabled = busy || confirmationLocked || sectionsStatus !== 'ready' || sections.length === 0

  return (
    <Card as="section" padding="lg" className="space-y-4">
      <div>
        <h2 className="text-base font-medium text-text-primary">Đề xuất thời khóa biểu</h2>
      </div>

      {sectionsMessage && (
        <Notice tone={sectionsStatus === 'error' || sectionsStatus === 'not-found' ? 'danger' : 'warning'}>
          {sectionsMessage}
        </Notice>
      )}
      {confirmationLocked && (
        <Notice tone="warning">
          {errorMessage || 'Kết quả chưa rõ. Hãy tải lại lịch và kiểm tra trước khi tạo tiếp.'}
        </Notice>
      )}
      {errorMessage && !confirmationLocked && <Notice tone="danger">{errorMessage}</Notice>}
      {successMessage && <Notice tone="info">{successMessage}</Notice>}

      <form className="space-y-4" onSubmit={(event) => void generate(event)}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium text-text-primary">
            Từ ngày
            <input
              name="proposalStartDate"
              autoComplete="off"
              type="date"
              value={startDate}
              onChange={(event) => {
                setStartDate(event.target.value)
                clearResult()
              }}
              className={fieldClass + ' mt-1 w-full'}
              disabled={controlsDisabled}
              required
            />
          </label>
          <label className="text-sm font-medium text-text-primary">
            Đến ngày
            <input
              name="proposalEndDate"
              autoComplete="off"
              type="date"
              min={startDate || undefined}
              value={endDate}
              onChange={(event) => {
                setEndDate(event.target.value)
                clearResult()
              }}
              className={fieldClass + ' mt-1 w-full'}
              disabled={controlsDisabled}
              required
            />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm font-medium text-text-primary">
            Buổi mỗi tuần
            <input
              name="sessionsPerWeek"
              autoComplete="off"
              type="number"
              min="1"
              max="7"
              step="1"
              value={sessionsPerWeek}
              onChange={(event) => {
                setSessionsPerWeek(Number(event.target.value))
                clearResult()
              }}
              className={fieldClass + ' mt-1 w-full'}
              disabled={controlsDisabled}
              required
            />
          </label>
          <label className="text-sm font-medium text-text-primary">
            Thời lượng (phút)
            <input
              name="durationMinutes"
              autoComplete="off"
              type="number"
              min="30"
              step="30"
              value={durationMinutes}
              onChange={(event) => {
                setDurationMinutes(Number(event.target.value))
                clearResult()
              }}
              className={fieldClass + ' mt-1 w-full'}
              disabled={controlsDisabled}
              required
            />
          </label>
          <label className="text-sm font-medium text-text-primary">
            Hình thức
            <select
              name="preferredMode"
              value={preferredMode}
              onChange={(event) => {
                setPreferredMode(event.target.value as DeliveryMode)
                clearResult()
              }}
              className={fieldClass + ' mt-1 w-full'}
              disabled={controlsDisabled}
            >
              <option value="PHYSICAL">Trực tiếp</option>
              <option value="ONLINE">Trực tuyến</option>
              <option value="HYBRID">Kết hợp</option>
              <option value="OFFLINE">Ngoại tuyến</option>
            </select>
          </label>
        </div>

        <fieldset className="space-y-2" disabled={controlsDisabled}>
          <legend className="text-sm font-medium text-text-primary">Môn cần xếp lịch</legend>
          <Button type="button" size="sm" appearance="ghost" onClick={toggleAllSections} disabled={controlsDisabled}>
            {selectedSectionIds.length === sections.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
          </Button>
          <div className="grid gap-2 sm:grid-cols-2">
            {sections.map((section) => (
              <label
                key={section.sectionCourseId}
                className="flex min-h-11 items-center gap-3 rounded-xl border border-card-border bg-card-background px-3 py-2 text-sm text-text-primary"
              >
                <input
                  type="checkbox"
                  checked={selectedSectionIds.includes(section.sectionCourseId)}
                  onChange={() => toggleSection(section.sectionCourseId)}
                  className="size-4 accent-primary"
                />
                <span>{section.title}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-card-border pt-4">
          <p className="m-0 text-xs text-text-tertiary">Múi giờ: {SCHEDULING_TIMEZONE}</p>
          <Button
            type="submit"
           
            disabled={controlsDisabled || selectedSectionIds.length === 0 || !startDate || !endDate}
          >
            {busy ? 'Đang xử lý…' : 'Tạo đề xuất'}
          </Button>
        </div>
      </form>

      {proposal && (
        <div className="space-y-3 border-t border-card-border pt-4">
          <div>
            <h3 className="text-sm font-medium text-text-primary">Kết quả đề xuất</h3>
            <p className="mt-1 text-xs text-text-tertiary">
              {proposal.proposedSchedules.length} lịch được đề xuất
              {proposal.unassignedSections.length > 0 ? ` · ${proposal.unassignedSections.length} môn chưa xếp đủ` : ''}
            </p>
          </div>
          {proposal.unassignedSections.length > 0 && (
            <Notice tone="warning">
              <span className="font-medium">Một số môn chưa xếp đủ:</span>{' '}
              {proposal.unassignedSections.map((section) => `${section.sectionTitle || 'Môn học'}${section.reason ? ` (${section.reason})` : ''}`).join('; ')}
            </Notice>
          )}
          {proposal.proposedSchedules.length > 0 ? (
            <div className="space-y-2">
              {proposal.proposedSchedules.map((schedule, index) => (
                <article key={`${schedule.sectionId}-${schedule.dayOfWeek}-${schedule.startTime}-${index}`} className="rounded-xl border border-card-border bg-card-background px-3 py-3">
                  <p className="m-0 text-sm font-medium text-text-primary">{schedule.sectionTitle}</p>
                  <p className="mt-1 mb-0 text-sm text-text-tertiary">
                    {weekdays[schedule.dayOfWeek] ?? schedule.dayOfWeek} · {schedule.startTime.slice(0, 5)}–{schedule.endTime.slice(0, 5)} · {schedule.durationMinutes} phút · {deliveryModes[schedule.mode] ?? schedule.mode} · {schedule.teacherName}
                  </p>
                  <p className="mt-1 mb-0 text-xs text-text-tertiary">
                    {schedule.projectedSessionDates.length} buổi trong kỳ
                    {schedule.projectedSessionDates.length > 0
                      ? ` · ${schedule.projectedSessionDates.slice(0, 3).map((date) => localDateLabel(date, { day: 'numeric', month: 'short' })).join(', ')}`
                      : ''}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <Notice tone="warning">Chưa có khung giờ phù hợp. Hãy đổi yêu cầu hoặc khoảng ngày.</Notice>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" appearance="outline" disabled={busy} onClick={clearResult}>
              Bỏ đề xuất
            </Button>
            <Button
              type="button"
             
              disabled={busy || confirmationLocked || proposal.proposedSchedules.length === 0}
              onClick={() => void confirm()}
            >
              {busy ? 'Đang xác nhận…' : 'Tạo các chuỗi lịch này'}
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
