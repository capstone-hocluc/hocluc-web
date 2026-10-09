import { useState } from 'react'
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  ClipboardList,
  GripVertical,
  Pencil,
  Plus,
  Send,
  Trash2,
  Users,
} from '../console/icons'
import { fieldControlClass } from '../console/form-field'
import DropdownField from '../console/dropdown-field'
import Button from '../console/button'
import Panel from '../console/panel'
import Status from '../console/status'
import StatCard from '../ui/StatCard'
import TeacherPageHeader from './TeacherPageHeader'
import { cn } from '../../lib/cn'

const labelClass = 'flex flex-col gap-1.5 text-sm font-medium text-text-primary'
const inputClass = fieldControlClass

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
    <div className="mt-6 flex flex-col gap-4 border-t border-card-border pt-6">
      <h3 className="text-base font-medium text-text-primary">Thiết lập làm bài</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          Thời gian (phút)
          <input className={inputClass} type="number" min="1" value={duration} onChange={(event) => setDuration(event.target.value)} />
        </label>
        <label className={labelClass}>
          Số lần làm tối đa
          <input className={inputClass} type="number" min="1" value={attempts} onChange={(event) => setAttempts(event.target.value)} />
        </label>
      </div>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-medium text-text-primary">Câu hỏi ({questions.length})</h3>
        <Button type="button" appearance="outline" size="sm" onClick={() => setQuestions((items) => [...items, emptyQuestion()])}>
          <Plus size={15} />
          Thêm câu hỏi
        </Button>
      </div>
      <div className="flex flex-col gap-4">
        {questions.map((question, index) => (
          <article
            key={question.id}
            className={cn('flex flex-col gap-3 rounded-lg border border-card-border p-4', draggedQuestionIndex === index && 'opacity-50')}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault()
              moveQuestionTo(draggedQuestionIndex, index)
              setDraggedQuestionIndex(null)
            }}
          >
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                draggable
                className="cursor-grab text-icon-tertiary"
                title="Kéo để đổi thứ tự"
                onDragStart={(event) => {
                  setDraggedQuestionIndex(index)
                  event.dataTransfer.effectAllowed = 'move'
                }}
                onDragEnd={() => setDraggedQuestionIndex(null)}
              >
                <GripVertical size={18} />
              </button>
              <strong className="text-sm font-medium text-text-primary">Câu {index + 1}</strong>
              <div className="flex gap-1.5">
                <Button type="button" size="sm" appearance={question.type !== 'essay' ? 'fill' : 'outline'} onClick={() => updateQuestion(question.id, { type: 'multiple-choice' })}>
                  Trắc nghiệm
                </Button>
                <Button type="button" size="sm" appearance={question.type === 'essay' ? 'fill' : 'outline'} onClick={() => updateQuestion(question.id, { type: 'essay' })}>
                  Tự luận
                </Button>
              </div>
              {questions.length > 1 && (
                <button
                  type="button"
                  className="ml-auto text-icon-tertiary hover:text-text-primary"
                  onClick={() => setQuestions((items) => items.filter((item) => item.id !== question.id))}
                  aria-label={`Xóa câu ${index + 1}`}
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
            <label className={labelClass}>
              Nội dung
              <input className={inputClass} value={question.text} onChange={(event) => updateQuestion(question.id, { text: event.target.value })} placeholder="Nhập câu hỏi" />
            </label>
            {question.type !== 'essay' ? (
              <>
                <div className="flex flex-col gap-2">
                  {question.options.map((option, optionIndex) => (
                    <div key={`${question.id}-${optionIndex}`} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct-${question.id}`}
                        checked={question.correct === optionIndex}
                        onChange={() => updateQuestion(question.id, { correct: optionIndex })}
                        aria-label={`Đáp án đúng ${String.fromCharCode(65 + optionIndex)}`}
                      />
                      <span className="w-5 text-sm font-medium text-text-tertiary">{String.fromCharCode(65 + optionIndex)}</span>
                      <input
                        className={inputClass}
                        value={option}
                        onChange={(event) => updateOption(question.id, optionIndex, event.target.value)}
                        placeholder={`Lựa chọn ${String.fromCharCode(65 + optionIndex)}`}
                      />
                      {question.options.length > 2 && (
                        <button
                          type="button"
                          className="px-1 text-lg text-icon-tertiary hover:text-text-primary"
                          onClick={() =>
                            updateQuestion(question.id, {
                              options: question.options.filter((_, optionPosition) => optionPosition !== optionIndex),
                              correct: question.correct >= question.options.length - 1 ? 0 : question.correct,
                            })
                          }
                          aria-label={`Xóa lựa chọn ${String.fromCharCode(65 + optionIndex)}`}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div>
                  <Button type="button" appearance="ghost" size="sm" onClick={() => updateQuestion(question.id, { options: [...question.options, ''] })}>
                    <Plus size={14} />
                    Thêm đáp án
                  </Button>
                </div>
              </>
            ) : (
              <label className={labelClass}>
                Đáp án gợi ý
                <textarea
                  className={`${inputClass} min-h-24`}
                  value={question.answerGuide || ''}
                  onChange={(event) => updateQuestion(question.id, { answerGuide: event.target.value })}
                  placeholder="Hướng dẫn chấm"
                />
              </label>
            )}
          </article>
        ))}
      </div>
    </div>
  )
  return (
    <section className="flex flex-col gap-5">
      <div>
        <Button appearance="ghost" size="sm" type="button" onClick={onCancel}>
          <ArrowLeft size={16} />
          Quay lại
        </Button>
      </div>
      <TeacherPageHeader title={assignment ? 'Chỉnh sửa bài tập' : 'Tạo bài tập'} />
      <Panel title="Thiết lập bài tập">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={`${labelClass} sm:col-span-2`}>
            Tên bài tập
            <input
              className={inputClass}
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              placeholder="Ví dụ: Bài tập hàm số bậc hai"
            />
          </label>
          <label className={labelClass}>
            Gán theo
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
          </label>
          <label className={labelClass}>
            {form.targetType}
            <DropdownField
              ariaLabel={form.targetType}
              options={targetOptions.map((target) => ({ id: target, label: target }))}
              value={form.target}
              onChange={(value) => {
                if (value !== null) setForm({ ...form, target: value })
              }}
            />
          </label>
          <label className={labelClass}>
            Hạn nộp
            <input className={inputClass} type="datetime-local" value={form.deadline} onChange={(event) => setForm({ ...form, deadline: event.target.value })} />
          </label>
          <label className={labelClass}>
            Điểm tối đa
            <input className={inputClass} type="number" min="1" value={form.maxScore} onChange={(event) => setForm({ ...form, maxScore: event.target.value })} />
          </label>
        </div>
        {questionSection}
        {error && (
          <p className="mt-4 text-sm text-badge-error-text" role="alert">
            {error}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Button appearance="outline" type="button" onClick={onCancel}>
            Hủy
          </Button>
          <Button type="button" onClick={publish}>
            <Send size={15} />
            Xuất bản
          </Button>
        </div>
      </Panel>
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
  return (
    <section className="flex flex-col gap-5">
      <div>
        <Button appearance="ghost" size="sm" type="button" onClick={onBack}>
          <ArrowLeft size={16} />
          Quay lại
        </Button>
      </div>
      <TeacherPageHeader
        title="Bài tập"
        description={course.name}
        actions={
          <Button type="button" onClick={() => setEditingAssignment({})}>
            <Plus size={16} />
            Tạo bài tập
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Bài tập" value={assignments.length} icon={ClipboardList} tone="info" />
        <StatCard label="Giao theo bài học" value={assignments.filter((item) => item.targetType === 'Bài học').length} icon={BookOpen} tone="success" />
        <StatCard label="Lượt đã nộp" value={assignments.reduce((total, item) => total + item.submitted, 0)} icon={Users} tone="warning" />
      </div>
      <Panel title="Danh sách bài tập" className="overflow-hidden">
        <div className="-m-5 overflow-x-auto">
          <table className="w-full min-w-170 text-left text-sm">
            <thead>
              <tr className="border-b border-card-border text-xs text-text-tertiary">
                <th className="px-5 py-3 font-medium">Tên bài tập</th>
                <th className="px-3 py-3 font-medium">Giao cho</th>
                <th className="px-3 py-3 font-medium">Hạn nộp</th>
                <th className="px-3 py-3 font-medium">Điểm</th>
                <th className="px-3 py-3 font-medium">Trạng thái</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {assignments.map((item) => (
                <tr key={item.id} className="border-b border-card-border last:border-0">
                  <td className="px-5 py-3">
                    <p className="font-medium text-text-primary">{item.title}</p>
                    <p className="text-xs text-text-tertiary">{item.submitted} đã nộp</p>
                  </td>
                  <td className="px-3 py-3">
                    <p className="text-text-primary">{item.targetType}</p>
                    <p className="text-xs text-text-tertiary">{item.target}</p>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-text-primary">
                    <CalendarDays size={14} className="mr-1.5 inline text-icon-tertiary" />
                    {formatDeadline(item.deadline)}
                  </td>
                  <td className="px-3 py-3 text-text-primary">{item.maxScore}</td>
                  <td className="px-3 py-3">
                    <Status tone={item.status === 'Đã xuất bản' ? 'success' : 'neutral'}>{item.status}</Status>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <button type="button" className="rounded-md p-1.5 text-icon-tertiary hover:text-text-primary" onClick={() => setEditingAssignment(item)} aria-label={`Sửa ${item.title}`}>
                        <Pencil size={15} />
                      </button>
                      <button type="button" className="rounded-md p-1.5 text-icon-tertiary hover:text-badge-error-text" onClick={() => removeAssignment(item.id)} aria-label={`Xóa ${item.title}`}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </section>
  )
}

export default TeacherAssignments
