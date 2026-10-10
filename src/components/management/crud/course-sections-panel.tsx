import { useState } from 'react'
import Panel from '../../console/panel'
import Button from '../../console/button'
import SelectField from '../../console/select-field'
import Field from '../../console/form-field'
import ScheduleResourceState from '../../console/schedule/schedule-resource-state'
import { ArrowDown, ArrowUp } from '../../console/icons'
import { useScheduleResource } from '../../../hooks/useScheduleResource'
import { getAdminCourses, type CourseAdmin } from '../../../services/courseAdminService'
import { movedIds, type CourseMutation, type CourseRemoval } from './course-labels'

interface Props {
  course: CourseAdmin
  readOnly: boolean
  busy: boolean
  mutate: CourseMutation
  remove: CourseRemoval
}
export default function CourseSectionsPanel({ course, readOnly, busy, mutate, remove }: Props) {
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState('NONE')
  const [phaseId, setPhaseId] = useState('NONE')
  const candidates = useScheduleResource(
    readOnly ? null : `section-picker:${course.status}:${page}`,
    () =>
      getAdminCourses({
        type: 'SECTION',
        status: course.status === 'PUBLISHED' ? 'PUBLISHED' : undefined,
        page,
        size: 20,
      })
  )
  const options = (candidates.data?.content ?? []).filter(
    (c) => !course.sections.some((s) => s.sectionCourseId === c.id)
  )
  const phaseOptions = [
    { id: 'NONE', label: 'Không có giai đoạn' },
    ...course.phases.map((p) => ({ id: p.id, label: p.name })),
  ]
  return (
    <Panel title="SECTION trong khóa">
      {!readOnly && (
        <ScheduleResourceState
          status={candidates.status}
          errorMessage={candidates.errorMessage}
          onRetry={candidates.reload}
        >
          <div className="flex flex-col gap-3 border-b border-card-border pb-5">
            <div className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <Field label="Khóa nhỏ">
                <SelectField
                  ariaLabel="SECTION để gắn"
                  value={selected}
                  onChange={setSelected}
                  disabled={busy}
                  options={[
                    { id: 'NONE', label: 'Chọn SECTION' },
                    ...options.map((c) => ({ id: c.id, label: c.title })),
                  ]}
                />
              </Field>
              <Field label="Giai đoạn">
                <SelectField
                  ariaLabel="Giai đoạn SECTION mới"
                  value={phaseId}
                  onChange={setPhaseId}
                  disabled={busy}
                  options={phaseOptions}
                />
              </Field>
              <Button
                disabled={busy || selected === 'NONE'}
                onClick={async () => {
                  if (
                    await mutate('sections', 'POST', {
                      sectionCourseId: selected,
                      phaseId: phaseId === 'NONE' ? null : phaseId,
                    })
                  )
                    setSelected('NONE')
                }}
              >
                Gắn SECTION
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
              <p className="text-sm text-text-tertiary">Chưa có SECTION phù hợp trong trang này.</p>
            )}
          </div>
        </ScheduleResourceState>
      )}
      {!course.sections.length ? (
        <p className="mt-4 text-sm text-text-tertiary">Chưa gắn SECTION vào khóa.</p>
      ) : (
        <ol className="divide-y divide-card-border">
          {course.sections.map((section, index) => (
            <li
              key={section.id}
              className="flex flex-wrap items-center justify-between gap-3 py-4 last:pb-0"
            >
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-text-primary">{section.title}</h3>
                {readOnly && (
                  <p className="mt-1 text-sm text-text-tertiary">
                    {course.phases.find((p) => p.id === section.phaseId)?.name ??
                      'Không có giai đoạn'}
                  </p>
                )}
              </div>
              {!readOnly && (
                <div className="flex flex-wrap items-center gap-1">
                  <SelectField
                    ariaLabel={`Giai đoạn của ${section.title}`}
                    value={section.phaseId ?? 'NONE'}
                    disabled={busy}
                    options={phaseOptions}
                    onChange={(value) =>
                      void mutate(`sections/${section.id}`, 'PUT', {
                        phaseId: value === 'NONE' ? null : value,
                      })
                    }
                  />
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
