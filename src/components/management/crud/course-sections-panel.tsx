import { useState } from 'react'
import Panel from '../../console/panel'
import Button from '../../console/button'
import Status from '../../console/status'
import SelectField from '../../console/select-field'
import Field from '../../console/form-field'
import ScheduleResourceState from '../../console/schedule/schedule-resource-state'
import { ArrowDown, ArrowUp } from '../../console/icons'
import { useScheduleResource } from '../../../hooks/useScheduleResource'
import { getAdminCourses, type CourseAdmin } from '../../../services/courseAdminService'
import { COURSE_STATUS_LABELS, movedIds, type CourseMutation, type CourseRemoval } from './course-labels'

interface Props {
  course: CourseAdmin
  readOnly: boolean
  busy: boolean
  mutate: CourseMutation
  remove: CourseRemoval
}

// Gifts: other courses the student also gets when buying this one. Any course may come with any
// other, never with itself. The backend keeps the table name `course_sections`, hence the file name.
export default function CourseSectionsPanel({ course, readOnly, busy, mutate, remove }: Props) {
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState('NONE')
  const candidates = useScheduleResource(
    readOnly ? null : `gift-picker:${course.id}:${course.status}:${page}`,
    () =>
      getAdminCourses({
        status: course.status === 'PUBLISHED' ? 'PUBLISHED' : undefined,
        page,
        size: 20,
      })
  )
  const options = (candidates.data?.content ?? []).filter(
    (c) => c.id !== course.id && !course.sections.some((s) => s.sectionCourseId === c.id)
  )
  return (
    <Panel title="Khóa tặng kèm">
      {!readOnly && (
        <ScheduleResourceState
          status={candidates.status}
          errorMessage={candidates.errorMessage}
          onRetry={candidates.reload}
        >
          <div className="flex flex-col gap-3 border-b border-card-border pb-5">
            <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto]">
              <Field label="Khóa tặng kèm" hint="Học viên mua khóa này sẽ được học cả khóa được chọn.">
                <SelectField
                  ariaLabel="Khóa để tặng kèm"
                  value={selected}
                  onChange={setSelected}
                  disabled={busy}
                  options={[
                    { id: 'NONE', label: 'Chọn khóa' },
                    ...options.map((c) => ({
                      id: c.id,
                      label: `${c.title} · ${COURSE_STATUS_LABELS[c.status]}`,
                    })),
                  ]}
                />
              </Field>
              <Button
                disabled={busy || selected === 'NONE'}
                onClick={async () => {
                  if (await mutate('sections', 'POST', { sectionCourseId: selected })) setSelected('NONE')
                }}
              >
                Tặng kèm khóa
              </Button>
            </div>
            {candidates.data && candidates.data.totalPages > 1 && (
              <div className="flex items-center gap-2 text-sm text-text-tertiary">
                <Button
                  size="sm"
                  appearance="outline"
                  disabled={busy || page === 0}
                  onClick={() => {
                    setPage(page - 1)
                    setSelected('NONE')
                  }}
                >
                  Trước
                </Button>
                Trang {page + 1}/{candidates.data.totalPages}
                <Button
                  size="sm"
                  appearance="outline"
                  disabled={busy || candidates.data.last}
                  onClick={() => {
                    setPage(page + 1)
                    setSelected('NONE')
                  }}
                >
                  Sau
                </Button>
              </div>
            )}
            {!options.length && (
              <p className="text-sm text-text-tertiary">Chưa có khóa phù hợp trong trang này.</p>
            )}
          </div>
        </ScheduleResourceState>
      )}
      {!course.sections.length ? (
        <p className="mt-4 text-sm text-text-tertiary">
          Chưa tặng kèm khóa nào. Phần này là tùy chọn: khóa vẫn bán được nếu có chương đã xuất bản.
        </p>
      ) : (
        <ol className="divide-y divide-card-border">
          {course.sections.map((section, index) => (
            <li
              key={section.id}
              className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"
            >
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <h3 className="font-medium text-text-primary">{section.title}</h3>
                <Status tone={section.status === 'PUBLISHED' ? 'success' : 'neutral'}>
                  {COURSE_STATUS_LABELS[section.status]}
                </Status>
              </div>
              {!readOnly && (
                <div className="flex flex-wrap items-center gap-1">
                  <Button
                    size="icon"
                    appearance="ghost"
                    aria-label={`Đưa ${section.title} lên`}
                    disabled={busy || index === 0}
                    onClick={() =>
                      void mutate('sections/order', 'PUT', {
                        ids: movedIds(
                          course.sections.map((s) => s.id),
                          index,
                          -1
                        ),
                      })
                    }
                  >
                    <ArrowUp size={16} />
                  </Button>
                  <Button
                    size="icon"
                    appearance="ghost"
                    aria-label={`Đưa ${section.title} xuống`}
                    disabled={busy || index === course.sections.length - 1}
                    onClick={() =>
                      void mutate('sections/order', 'PUT', {
                        ids: movedIds(
                          course.sections.map((s) => s.id),
                          index,
                          1
                        ),
                      })
                    }
                  >
                    <ArrowDown size={16} />
                  </Button>
                  <Button
                    size="sm"
                    appearance="ghost"
                    variant="danger"
                    disabled={busy}
                    onClick={() => remove(`sections/${section.id}`, section.title)}
                  >
                    Gỡ
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </Panel>
  )
}
