import { useState } from 'react'
import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  GripVertical,
  Pencil,
  Plus,
  Send,
  Trash2,
  Users,
} from 'lucide-react'
import TeacherPageHeader, { TeacherBackLink } from './TeacherPageHeader'
import Button from '../ui/Button'
import Card from '../ui/Card'
import DropdownField from '../ui/DropdownField'
import { Field, Input, Textarea } from '../ui/Field'
import Notice from '../ui/Notice'
import StatusBadge from '../ui/StatusBadge'
import { cn } from '../../lib/cn'

// MOCK: assignments until the backend exposes the assignment API.
const mockAssignments = [
  {
    id: 1,
    title: 'Bài tập hàm số bậc hai',
    targetType: 'Bài học',
    target: 'Bài 06 · Hàm số bậc hai',
    deadline: '2026-09-20T23:59',
    maxScore: 10,
    status: 'Đã xuất bản',
    submitted: 29,
  },
  {
    id: 2,
    title: 'Luyện tập phương trình mũ',
    targetType: 'Nhóm học tập',
    target: 'Nhóm Tăng tốc',
    deadline: '2026-09-22T20:00',
    maxScore: 15,
    status: 'Bản nháp',
    submitted: 0,
  },
]

const formatDeadline = (value) =>
  new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value)
  )

function AssignmentEditor({ assignment, onCancel, onSave }) {
  const [form, setForm] = useState({
    title: assignment?.title || '',
    targetType: assignment?.targetType || 'Bài học',
    target: assignment?.target || 'Bài 06 · Hàm số bậc hai',
    deadline: assignment?.deadline || '2026-09-20T23:59',
    maxScore: assignment?.maxScore || 10,
  })
  const [error, setError] = useState('')
  const [duration, setDuration] = useState(assignment?.duration || 30)
  const [attempts, setAttempts] = useState(assignment?.attempts || 1)
  const emptyQuestion = () => ({
    id: Date.now() + Math.random(),
    type: 'multiple-choice',
    text: '',
    options: ['', '', '', ''],
    correct: 0,
    answerGuide: '',
  })
  const [questions, setQuestions] = useState(
    assignment?.questions || [
      {
        id: 'question-initial',
        type: 'multiple-choice',
        text: '',
        options: ['', '', '', ''],
        correct: 0,
        answerGuide: '',
      },
    ]
  )
  const [draggedQuestionIndex, setDraggedQuestionIndex] = useState(null)
  const defaultTargets =
    form.targetType === 'Bài học'
      ? ['Bài 06 · Hàm số bậc hai', 'Bài 08 · Phương trình mũ', 'Bài 10 · Xác suất cơ bản']
      : ['Nhóm Nền tảng', 'Nhóm Tăng tốc', 'Nhóm Ôn luyện cuối kỳ']
  const targetOptions = defaultTargets.includes(form.target)
    ? defaultTargets
    : [form.target, ...defaultTargets]
  const publish = () => {
    if (!form.title.trim() || !form.deadline || !Number(form.maxScore)) {
      setError('Vui lòng nhập tên bài tập, hạn nộp và điểm tối đa.')
      return
    }
    onSave({
      ...assignment,
      ...form,
      duration: Number(duration),
      attempts: Number(attempts),
      questions,
      id: assignment?.id || Date.now(),
      maxScore: Number(form.maxScore),
      status: 'Đã xuất bản',
      submitted: assignment?.submitted || 0,
    })
  }
  const updateQuestion = (id, update) =>
    setQuestions((items) => items.map((item) => (item.id === id ? { ...item, ...update } : item)))
  const updateOption = (questionId, optionIndex, value) =>
    setQuestions((items) =>
      items.map((item) =>
        item.id === questionId
          ? {
              ...item,
              options: item.options.map((option, index) =>
                index === optionIndex ? value : option
              ),
            }
          : item
      )
    )
  const moveQuestionTo = (fromIndex, toIndex) => {
    if (fromIndex === null || fromIndex === toIndex) return
    setQuestions((items) => {
      const next = [...items]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return next
    })
  }
  const questionSection = (
    <div className="mt-5 grid gap-4 border-t border-border-subtle pt-5">
      <h2 className="text-base font-semibold text-text-heading">Thiết lập làm bài</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Thời gian làm bài (phút)">
          <Input
            type="number"
            min="1"
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
          />
        </Field>
        <Field label="Số lần làm tối đa">
          <Input
            type="number"
            min="1"
            value={attempts}
            onChange={(event) => setAttempts(event.target.value)}
          />
        </Field>
      </div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-text-heading">Câu hỏi ({questions.length})</h2>
          <small className="mt-1 block text-xs text-text-subtle">
            Kéo biểu tượng ⋮⋮ để đổi thứ tự câu hỏi.
          </small>
        </div>
        <Button
          type="button"
          appearance="ghost"
          size="sm"
          onClick={() => setQuestions((items) => [...items, emptyQuestion()])}
        >
          <Plus size={15} />
          Thêm câu hỏi
        </Button>
      </div>
      <div className="grid gap-3.5">
        {questions.map((question, index) => (
          <article
            key={question.id}
            className={cn(
              'rounded-xl border border-border-primary bg-surface-soft p-4 transition',
              draggedQuestionIndex === index && 'scale-[0.99] border-primary opacity-50 shadow-card-hover'
            )}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault()
              moveQuestionTo(draggedQuestionIndex, index)
              setDraggedQuestionIndex(null)
            }}
          >
            <div className="mb-3 flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                draggable
                className="grid size-8 cursor-grab place-items-center rounded-lg border border-dashed border-primary bg-surface-hover text-primary active:cursor-grabbing"
                title="Kéo để đổi thứ tự"
                onDragStart={(event) => {
                  setDraggedQuestionIndex(index)
                  event.dataTransfer.effectAllowed = 'move'
                }}
                onDragEnd={() => setDraggedQuestionIndex(null)}
              >
                <GripVertical size={18} />
              </button>
              <strong className="text-sm text-primary">Câu {index + 1}</strong>
              <div className="ml-auto flex gap-1.5 max-sm:order-3 max-sm:ml-0 max-sm:w-full [&>button]:max-sm:flex-1">
                {[
                  { type: 'multiple-choice', label: 'Trắc nghiệm', active: question.type !== 'essay' },
                  { type: 'essay', label: 'Tự luận', active: question.type === 'essay' },
                ].map(({ type, label, active }) => (
                  <Button
                    key={type}
                    type="button"
                    size="sm"
                    appearance={active ? 'fill' : 'outline'}
                    onClick={() => updateQuestion(question.id, { type })}
                  >
                    {label}
                  </Button>
                ))}
              </div>
              {questions.length > 1 && (
                <Button
                  type="button"
                  variant="danger"
                  appearance="ghost"
                  size="icon"
                  className="size-8 bg-badge-danger-bg"
                  onClick={() =>
                    setQuestions((items) => items.filter((item) => item.id !== question.id))
                  }
                  aria-label={`Xóa câu ${index + 1}`}
                >
                  <Trash2 size={15} />
                </Button>
              )}
            </div>
            <Field label="Nội dung câu hỏi">
              <Input
                value={question.text}
                onChange={(event) => updateQuestion(question.id, { text: event.target.value })}
                placeholder="Nhập nội dung câu hỏi"
              />
            </Field>
            {question.type !== 'essay' ? (
              <>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {question.options.map((option, optionIndex) => {
                    const correct = question.correct === optionIndex
                    return (
                      <label
                        key={`${question.id}-${optionIndex}`}
                        className={cn(
                          'grid min-w-0 grid-cols-[16px_23px_minmax(0,1fr)_auto] items-center gap-1.5 rounded-[9px] border bg-surface px-2 py-1',
                          correct ? 'border-success bg-badge-success-bg' : 'border-border-subtle'
                        )}
                      >
                        <input
                          type="radio"
                          name={`correct-${question.id}`}
                          checked={correct}
                          onChange={() => updateQuestion(question.id, { correct: optionIndex })}
                          className="m-0 size-3.5 accent-success"
                        />
                        <span className="grid size-5 place-items-center rounded-md bg-badge-info-bg text-[11px] font-black text-primary">
                          {String.fromCharCode(65 + optionIndex)}
                        </span>
                        <input
                          value={option}
                          onChange={(event) =>
                            updateOption(question.id, optionIndex, event.target.value)
                          }
                          placeholder={`Lựa chọn ${String.fromCharCode(65 + optionIndex)}`}
                          className="h-8 min-w-0 border-0 bg-transparent p-0 text-sm text-text-strong outline-0 placeholder:text-text-faint"
                        />
                        {question.options.length > 2 && (
                          <button
                            type="button"
                            className="grid size-5 cursor-pointer place-items-center rounded-[5px] bg-badge-danger-bg leading-none text-badge-danger-text"
                            onClick={() =>
                              updateQuestion(question.id, {
                                options: question.options.filter(
                                  (_, optionPosition) => optionPosition !== optionIndex
                                ),
                                correct:
                                  question.correct >= question.options.length - 1
                                    ? 0
                                    : question.correct,
                              })
                            }
                            aria-label={`Xóa lựa chọn ${String.fromCharCode(65 + optionIndex)}`}
                          >
                            ×
                          </button>
                        )}
                      </label>
                    )
                  })}
                </div>
                <Button
                  type="button"
                  appearance="outline"
                  size="sm"
                  className="mt-2.5 border-dashed"
                  onClick={() =>
                    updateQuestion(question.id, { options: [...question.options, ''] })
                  }
                >
                  <Plus size={14} />
                  Thêm đáp án
                </Button>
              </>
            ) : (
              <div className="mt-3 grid gap-2.5">
                <Field label="Câu trả lời tự luận của học sinh">
                  <Textarea
                    disabled
                    placeholder="Học sinh sẽ nhập câu trả lời vào ô này khi làm bài."
                  />
                </Field>
                <Field label="Đáp án gợi ý / hướng dẫn chấm">
                  <Textarea
                    value={question.answerGuide || ''}
                    onChange={(event) =>
                      updateQuestion(question.id, { answerGuide: event.target.value })
                    }
                    placeholder="Nhập đáp án gợi ý hoặc tiêu chí chấm điểm."
                  />
                </Field>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  )
  return (
    <section className="flex flex-col gap-4">
      <TeacherBackLink onClick={onCancel}>Quay lại danh sách bài tập</TeacherBackLink>
      <TeacherPageHeader
        title={assignment ? 'Chỉnh sửa bài tập' : 'Tạo bài tập'}
        description="Giao bài và đặt hạn nộp."
      />
      <Card as="section" padding="lg" radius="lg">
        <h2 className="mb-4 text-base font-semibold text-text-heading">Thiết lập bài tập</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Tên bài tập" full>
            <Input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              placeholder="Ví dụ: Bài tập hàm số bậc hai"
            />
          </Field>
          <Field label="Gán bài tập theo">
            <DropdownField
              ariaLabel="Gán bài tập theo"
              options={[
                { id: 'Bài học', label: 'Bài học' },
                { id: 'Nhóm học tập', label: 'Nhóm học tập' },
              ]}
              value={form.targetType}
              onChange={(value) => {
                if (value === null) return
                const targetType = value
                setForm({
                  ...form,
                  targetType,
                  target: targetType === 'Bài học' ? 'Bài 06 · Hàm số bậc hai' : 'Nhóm Nền tảng',
                })
              }}
            />
          </Field>
          <Field label={form.targetType}>
            <DropdownField
              ariaLabel={form.targetType}
              options={targetOptions.map((target) => ({ id: target, label: target }))}
              value={form.target}
              onChange={(value) => {
                if (value !== null) setForm({ ...form, target: value })
              }}
            />
          </Field>
          <Field label="Hạn nộp">
            <Input
              type="datetime-local"
              value={form.deadline}
              onChange={(event) => setForm({ ...form, deadline: event.target.value })}
            />
          </Field>
          <Field label="Điểm tối đa">
            <Input
              type="number"
              min="1"
              value={form.maxScore}
              onChange={(event) => setForm({ ...form, maxScore: event.target.value })}
            />
          </Field>
        </div>
        {questionSection}
        {error && (
          <Notice tone="danger" role="alert" className="mt-4">
            {error}
          </Notice>
        )}
        <div className="mt-[17px] flex flex-col-reverse justify-end gap-2 sm:flex-row">
          <Button type="button" appearance="ghost" onClick={onCancel}>
            Hủy
          </Button>
          <Button type="button" onClick={publish}>
            <Send size={15} />
            Xuất bản bài tập
          </Button>
        </div>
      </Card>
    </section>
  )
}

function TeacherAssignments({ course, onBack, onAction, assignmentPreset }) {
  const [assignments, setAssignments] = useState(mockAssignments)
  const [editingAssignment, setEditingAssignment] = useState(assignmentPreset || null)
  const saveAssignment = (assignment) => {
    setAssignments((items) =>
      items.some((item) => item.id === assignment.id)
        ? items.map((item) => (item.id === assignment.id ? assignment : item))
        : [assignment, ...items]
    )
    setEditingAssignment(null)
    onAction('Đã xuất bản bài tập.')
  }
  const removeAssignment = (id) => {
    setAssignments((items) => items.filter((item) => item.id !== id))
    onAction('Đã xóa bài tập.')
  }
  if (editingAssignment !== null)
    return (
      <AssignmentEditor
        assignment={editingAssignment || null}
        onCancel={() => setEditingAssignment(null)}
        onSave={saveAssignment}
      />
    )
  const rowGrid =
    'grid items-center gap-3 px-5 max-md:grid-cols-[minmax(0,1fr)_60px] md:grid-cols-[minmax(175px,1.15fr)_minmax(145px,0.9fr)_0.9fr_0.5fr_0.62fr_60px] lg:grid-cols-[minmax(175px,1.15fr)_minmax(145px,0.9fr)_0.9fr_0.5fr_0.62fr_60px]'
  return (
    <section className="flex flex-col gap-4">
      <TeacherBackLink onClick={onBack}>Quay lại lớp học</TeacherBackLink>
      <TeacherPageHeader
        title="Bài tập"
        description={`${course.name} · Giao bài và theo dõi kết quả.`}
        actions={
          <Button onClick={() => setEditingAssignment({})}>
            <Plus size={16} />
            Tạo bài tập
          </Button>
        }
      />
      <section className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: ClipboardList, value: assignments.length, label: 'Bài tập' },
          {
            icon: BookOpen,
            value: assignments.filter((item) => item.targetType === 'Bài học').length,
            label: 'Giao theo bài học',
          },
          {
            icon: Users,
            value: assignments.reduce((total, item) => total + item.submitted, 0),
            label: 'Lượt đã nộp',
          },
        ].map(({ icon: Icon, value, label }) => (
          <Card key={label} radius="lg" className="flex items-center gap-2.5 text-primary">
            <Icon size={20} />
            <div>
              <strong className="block text-[15px] text-text-strong">{value}</strong>
              <small className="block text-xs text-text-subtle">{label}</small>
            </div>
          </Card>
        ))}
      </section>
      <Card as="section" padding="none" radius="lg" className="overflow-hidden">
        <h2 className="px-5 pt-[19px] pb-3.5 text-base font-semibold text-text-heading">
          Danh sách bài tập
        </h2>
        <div className="grid">
          <div
            className={cn(
              rowGrid,
              'border-t border-border-subtle bg-surface-soft py-2.5 text-xs font-bold text-text-subtle max-md:hidden'
            )}
          >
            <span>Tên bài tập</span>
            <span>Giao cho</span>
            <span>Hạn nộp</span>
            <span>Điểm tối đa</span>
            <span>Trạng thái</span>
            <span />
          </div>
          {assignments.map((item) => (
            <article
              key={item.id}
              className={cn(
                rowGrid,
                'border-t border-border-subtle py-3.5 text-[13px] text-text-heading-soft'
              )}
            >
              <span>
                <strong className="block text-sm text-text-strong">{item.title}</strong>
                <small className="mt-1 block text-xs text-text-subtle">
                  {item.submitted} học viên đã nộp
                </small>
              </span>
              <span className="max-md:hidden">
                <StatusBadge tone="info" size="sm">
                  {item.targetType}
                </StatusBadge>
                <small className="mt-1 block text-xs text-text-subtle">{item.target}</small>
              </span>
              <span className="flex items-center gap-1.5 max-md:hidden">
                <CalendarDays size={14} />
                {formatDeadline(item.deadline)}
              </span>
              <span className="max-md:hidden">{item.maxScore} điểm</span>
              <span className="max-md:hidden">
                <StatusBadge tone={item.status === 'Đã xuất bản' ? 'success' : 'neutral'} size="sm">
                  {item.status}
                </StatusBadge>
              </span>
              <div className="flex gap-1.5">
                <Button
                  type="button"
                  appearance="ghost"
                  size="icon"
                  className="size-7 rounded-[7px] bg-surface-hover"
                  onClick={() => setEditingAssignment(item)}
                  aria-label={`Sửa ${item.title}`}
                >
                  <Pencil size={15} />
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  appearance="ghost"
                  size="icon"
                  className="size-7 rounded-[7px] bg-badge-danger-bg"
                  onClick={() => removeAssignment(item.id)}
                  aria-label={`Xóa ${item.title}`}
                >
                  <Trash2 size={15} />
                </Button>
              </div>
            </article>
          ))}
        </div>
      </Card>
    </section>
  )
}

export default TeacherAssignments
