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
} from 'lucide-react'
import DropdownField from '../ui/DropdownField'

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
    <section className="hl-teacher-panel hl-teacher-assignment-quiz-settings">
      <div className="hl-teacher-panel-heading">
        <div>
          <h2>Thiết lập làm bài</h2>
        </div>
      </div>
      <div className="hl-teacher-assignment-form">
        <label>
          Thời gian làm bài (phút)
          <input
            type="number"
            min="1"
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
          />
        </label>
        <label>
          Số lần làm tối đa
          <input
            type="number"
            min="1"
            value={attempts}
            onChange={(event) => setAttempts(event.target.value)}
          />
        </label>
      </div>
      <div className="hl-teacher-panel-heading hl-teacher-assignment-questions-head">
        <div>
          <h2>Câu hỏi ({questions.length})</h2>
          <small className="hl-teacher-drag-hint">Kéo biểu tượng ⋮⋮ để đổi thứ tự câu hỏi.</small>
        </div>
        <button type="button" onClick={() => setQuestions((items) => [...items, emptyQuestion()])}>
          <Plus size={15} />
          Thêm câu hỏi
        </button>
      </div>
      <div className="hl-teacher-question-list">
        {questions.map((question, index) => (
          <article
            key={question.id}
            className={draggedQuestionIndex === index ? 'is-dragging' : ''}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault()
              moveQuestionTo(draggedQuestionIndex, index)
              setDraggedQuestionIndex(null)
            }}
          >
            <div className="hl-teacher-question-top">
              <button
                type="button"
                draggable
                className="hl-teacher-question-drag-handle"
                title="Kéo để đổi thứ tự"
                onDragStart={(event) => {
                  setDraggedQuestionIndex(index)
                  event.dataTransfer.effectAllowed = 'move'
                }}
                onDragEnd={() => setDraggedQuestionIndex(null)}
              >
                <GripVertical size={18} />
              </button>
              <strong>Câu {index + 1}</strong>
              <div className="hl-teacher-question-type-tabs">
                <button
                  type="button"
                  className={question.type !== 'essay' ? 'is-active' : ''}
                  onClick={() => updateQuestion(question.id, { type: 'multiple-choice' })}
                >
                  Trắc nghiệm
                </button>
                <button
                  type="button"
                  className={question.type === 'essay' ? 'is-active' : ''}
                  onClick={() => updateQuestion(question.id, { type: 'essay' })}
                >
                  Tự luận
                </button>
              </div>
              {questions.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setQuestions((items) => items.filter((item) => item.id !== question.id))
                  }
                  aria-label={`Xóa câu ${index + 1}`}
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
            <label>
              Nội dung câu hỏi
              <input
                value={question.text}
                onChange={(event) => updateQuestion(question.id, { text: event.target.value })}
                placeholder="Nhập nội dung câu hỏi"
              />
            </label>
            {question.type !== 'essay' ? (
              <>
                <div className="hl-teacher-option-list">
                  {question.options.map((option, optionIndex) => (
                    <label
                      key={`${question.id}-${optionIndex}`}
                      className={question.correct === optionIndex ? 'is-correct' : ''}
                    >
                      <input
                        type="radio"
                        name={`correct-${question.id}`}
                        checked={question.correct === optionIndex}
                        onChange={() => updateQuestion(question.id, { correct: optionIndex })}
                      />
                      <span>{String.fromCharCode(65 + optionIndex)}</span>
                      <input
                        value={option}
                        onChange={(event) =>
                          updateOption(question.id, optionIndex, event.target.value)
                        }
                        placeholder={`Lựa chọn ${String.fromCharCode(65 + optionIndex)}`}
                      />
                      {question.options.length > 2 && (
                        <button
                          type="button"
                          className="hl-teacher-remove-option"
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
                  ))}
                </div>
                <button
                  type="button"
                  className="hl-teacher-add-option"
                  onClick={() =>
                    updateQuestion(question.id, { options: [...question.options, ''] })
                  }
                >
                  <Plus size={14} />
                  Thêm đáp án
                </button>
              </>
            ) : (
              <div className="hl-teacher-essay-answer">
                <label>
                  Câu trả lời tự luận của học sinh
                  <textarea
                    disabled
                    placeholder="Học sinh sẽ nhập câu trả lời vào ô này khi làm bài."
                  />
                </label>
                <label>
                  Đáp án gợi ý / hướng dẫn chấm
                  <textarea
                    value={question.answerGuide || ''}
                    onChange={(event) =>
                      updateQuestion(question.id, { answerGuide: event.target.value })
                    }
                    placeholder="Nhập đáp án gợi ý hoặc tiêu chí chấm điểm."
                  />
                </label>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  )
  return (
    <section className="hl-teacher-assignment-editor">
      <button type="button" className="hl-teacher-text-back" onClick={onCancel}>
        <ArrowLeft size={16} />
        Quay lại danh sách bài tập
      </button>
      <div className="hl-teacher-title">
        <div>
          <h1>{assignment ? 'Chỉnh sửa bài tập' : 'Tạo bài tập'}</h1>
          <p>Giao bài và đặt hạn nộp.</p>
        </div>
      </div>
      <section className="hl-teacher-panel">
        <div className="hl-teacher-panel-heading">
          <div>
            <h2>Thiết lập bài tập</h2>
          </div>
        </div>
        <div className="hl-teacher-assignment-form">
          <label className="is-full">
            Tên bài tập
            <input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              placeholder="Ví dụ: Bài tập hàm số bậc hai"
            />
          </label>
          <label>
            Gán bài tập theo
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
          <label>
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
          <label>
            Hạn nộp
            <input
              type="datetime-local"
              value={form.deadline}
              onChange={(event) => setForm({ ...form, deadline: event.target.value })}
            />
          </label>
          <label>
            Điểm tối đa
            <input
              type="number"
              min="1"
              value={form.maxScore}
              onChange={(event) => setForm({ ...form, maxScore: event.target.value })}
            />
          </label>
        </div>
        {questionSection}
        {error && (
          <p className="hl-teacher-quiz-form-error" role="alert">
            {error}
          </p>
        )}
        <div className="hl-teacher-quiz-editor-actions">
          <button type="button" onClick={onCancel}>
            Hủy
          </button>
          <button type="button" className="hl-teacher-primary" onClick={publish}>
            <Send size={15} />
            Xuất bản bài tập
          </button>
        </div>
      </section>
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
    <section className="hl-teacher-assignments-page">
      <button type="button" className="hl-teacher-text-back" onClick={onBack}>
        <ArrowLeft size={16} />
        Quay lại lớp học
      </button>
      <div className="hl-teacher-title">
        <div>
          <h1>Bài tập</h1>
          <p>{course.name} · Giao bài và theo dõi kết quả.</p>
        </div>
        <button
          type="button"
          className="hl-teacher-primary"
          onClick={() => setEditingAssignment({})}
        >
          <Plus size={16} />
          Tạo bài tập
        </button>
      </div>
      <section className="hl-teacher-assignment-summary">
        <span>
          <ClipboardList size={20} />
          <div>
            <strong>{assignments.length}</strong>
            <small>Bài tập</small>
          </div>
        </span>
        <span>
          <BookOpen size={20} />
          <div>
            <strong>{assignments.filter((item) => item.targetType === 'Bài học').length}</strong>
            <small>Giao theo bài học</small>
          </div>
        </span>
        <span>
          <Users size={20} />
          <div>
            <strong>{assignments.reduce((total, item) => total + item.submitted, 0)}</strong>
            <small>Lượt đã nộp</small>
          </div>
        </span>
      </section>
      <section className="hl-teacher-panel hl-teacher-assignment-list-panel">
        <div className="hl-teacher-panel-heading">
          <div>
            <h2>Danh sách bài tập</h2>
          </div>
        </div>
        <div className="hl-teacher-assignment-table">
          <div className="hl-teacher-assignment-row is-head">
            <span>Tên bài tập</span>
            <span>Giao cho</span>
            <span>Hạn nộp</span>
            <span>Điểm tối đa</span>
            <span>Trạng thái</span>
            <span />
          </div>
          {assignments.map((item) => (
            <article key={item.id} className="hl-teacher-assignment-row">
              <span>
                <strong>{item.title}</strong>
                <small>{item.submitted} học viên đã nộp</small>
              </span>
              <span>
                <em>{item.targetType}</em>
                <small>{item.target}</small>
              </span>
              <span>
                <CalendarDays size={14} />
                {formatDeadline(item.deadline)}
              </span>
              <span>{item.maxScore} điểm</span>
              <span>
                <b className={item.status === 'Đã xuất bản' ? 'is-published' : ''}>{item.status}</b>
              </span>
              <div>
                <button
                  type="button"
                  onClick={() => setEditingAssignment(item)}
                  aria-label={`Sửa ${item.title}`}
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  className="is-delete"
                  onClick={() => removeAssignment(item.id)}
                  aria-label={`Xóa ${item.title}`}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  )
}

export default TeacherAssignments
