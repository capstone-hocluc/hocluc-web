import { useEffect, useRef, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from '../console/icons'
import Button from '../ui/Button'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { getProfileSubjects, updateStudentProfile, type ProfileSubject, type SubjectLevel } from '../../services/userService'
import { getErrorMessage } from '../../lib/errors'
import styles from './onboarding/LearningProfileForm.module.css'

const inputClass = 'mt-2 min-h-11 w-full rounded-xl border border-line bg-surface-input px-3 text-text-heading focus-visible:outline-2 focus-visible:outline-focus-ring aria-invalid:border-danger'
const groups = [
  { label: 'Tư duy & Ngôn ngữ', names: ['Toán học', 'Ngữ văn', 'Tiếng Anh'] },
  { label: 'Khoa học tự nhiên', names: ['Vật lý', 'Hóa học', 'Sinh học'] },
  { label: 'Khoa học xã hội', names: ['Lịch sử', 'Địa lý'] },
]

interface Props {
  onClose: () => void
  onComplete: () => void
  restoreFocus: HTMLElement | null
  continueToAssessment?: boolean
}

export default function StudentOnboarding({ onClose, onComplete, restoreFocus, continueToAssessment = true }: Props) {
  const { profile, applyStudentProfile } = useCurrentUser()
  const saved = profile?.studentProfile
  const [step, setStep] = useState(1)
  const heading = useRef<HTMLHeadingElement>(null)
  const scrollBody = useRef<HTMLDivElement>(null)
  const busy = useRef(false)
  const [score, setScore] = useState(saved?.targetScore == null ? '' : String(saved.targetScore))
  const [university, setUniversity] = useState(saved?.targetUniversity ?? '')
  const [major, setMajor] = useState(saved?.targetMajor ?? '')
  const [subjects, setSubjects] = useState<Record<string, SubjectLevel>>(() => Object.fromEntries(
    (saved?.subjectAssessments ?? []).map((item) => [item.categoryId, item.level])
  ))
  const [categories, setCategories] = useState<ProfileSubject[]>([])
  const [categoryError, setCategoryError] = useState(false)
  const [categoryLoading, setCategoryLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [failure, setFailure] = useState('')
  const completed = (profile?.onboardingState ?? saved?.onboardingState) === 'COMPLETED'
  const [retryState, setRetryState] = useState<'DEFERRED' | 'COMPLETED' | 'EDIT'>('DEFERRED')
  const scoreError = score !== '' && (!Number.isInteger(Number(score)) || Number(score) < 0 || Number(score) > 1200)
    ? 'Nhập số nguyên từ 0 đến 1200, hoặc chọn Chưa xác định.' : ''
  const universityError = university.trim().length > 200 ? 'Tên trường tối đa 200 ký tự.' : ''
  const majorError = major.trim().length > 200 ? 'Tên ngành tối đa 200 ký tự.' : ''

  const loadCategories = () => {
    setCategoryLoading(true)
    setCategoryError(false)
    getProfileSubjects().then(setCategories).catch(() => setCategoryError(true)).finally(() => setCategoryLoading(false))
  }
  useEffect(() => {
    let active = true
    getProfileSubjects().then((items) => { if (active) setCategories(items) })
      .catch(() => { if (active) setCategoryError(true) })
      .finally(() => { if (active) setCategoryLoading(false) })
    return () => { active = false }
  }, [])
  useEffect(() => {
    heading.current?.focus({ preventScroll: true })
    if (scrollBody.current) scrollBody.current.scrollTop = 0
  }, [step])

  const save = async (state: 'DEFERRED' | 'COMPLETED' | 'EDIT') => {
    if (busy.current) return
    if (state !== 'DEFERRED' && (scoreError || universityError || majorError)) {
      setStep(1)
      heading.current?.focus()
      return
    }
    busy.current = true
    setSaving(true)
    setFailure('')
    setRetryState(state)
    try {
      const response = await updateStudentProfile({
        firstName: profile?.firstName, lastName: profile?.lastName,
        displayName: profile?.displayName, phone: profile?.phone,
        avatarUrl: profile?.avatarUrl, bio: profile?.bio,
        targetExam: 'VNUHCM_DGNL',
        ...(scoreError ? {} : { targetScore: score === '' ? null : Number(score) }),
        ...(universityError ? {} : { targetUniversity: university.trim() }),
        ...(majorError ? {} : { targetMajor: major.trim() }),
        subjectAssessments: Object.entries(subjects).map(([categoryId, level]) => ({ categoryId, level })),
        onboardingState: state === 'EDIT' ? undefined : state,
      })
      if (!response.success || !response.data) throw new Error('Chưa nhận được hồ sơ đã lưu. Vui lòng thử lại.')
      if (profile) applyStudentProfile(profile.id, response.data)
      if (state === 'COMPLETED') onComplete()
      else onClose()
    } catch (error) {
      setFailure(getErrorMessage(error) || 'Chưa lưu được hồ sơ. Câu trả lời của bạn vẫn được giữ lại.')
    } finally {
      busy.current = false
      setSaving(false)
    }
  }
  const defer = () => {
    if (busy.current) return
    if (completed) onClose()
    else void save('DEFERRED')
  }

  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) defer() }}>
      <Dialog.Portal>
        <Dialog.Overlay data-testid="learning-profile-backdrop" className="fixed inset-0 z-60 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content
          aria-modal="true"
          aria-describedby="learning-profile-description"
          onInteractOutside={(event) => event.preventDefault()}
          onOpenAutoFocus={(event) => { event.preventDefault(); heading.current?.focus() }}
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            if (restoreFocus?.isConnected) restoreFocus.focus()
            else document.getElementById('student-content')?.focus()
          }}
          className="fixed top-1/2 left-1/2 z-60 flex max-h-[min(90dvh,850px)] w-[min(720px,calc(100%-48px))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-line-card bg-surface text-text-heading shadow-xl outline-none max-[760px]:inset-0 max-[760px]:h-dvh max-[760px]:max-h-dvh max-[760px]:w-full max-[760px]:translate-none max-[760px]:rounded-none max-[760px]:border-0"
        >
          <header className={`${styles.header} shrink-0 border-b border-line px-6 pt-[max(20px,env(safe-area-inset-top))] pb-4 max-[760px]:px-4`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="mb-1 text-xs font-bold tracking-wider text-primary-text">HỒ SƠ HỌC TẬP · BƯỚC {step} / 2</p>
                <Dialog.Title ref={heading} tabIndex={-1} className="text-2xl font-bold outline-none">{step === 1 ? 'Mục tiêu học tập' : 'Tự đánh giá môn học'}</Dialog.Title>
              </div>
              <Button appearance="ghost" size="icon" aria-label={completed ? 'Đóng' : 'Đóng và lưu bản nháp'} disabled={saving} onClick={defer}><X size={20} /></Button>
            </div>
            <Dialog.Description id="learning-profile-description" className="mt-2 text-sm text-text-body">Mục tiêu và môn học giúp cá nhân hóa lộ trình; bạn có thể cập nhật sau.</Dialog.Description>
            <ol aria-label="Tiến trình thiết lập hồ sơ" className="mt-4 grid grid-cols-2 gap-3">
              {['Mục tiêu', 'Môn học'].map((label, index) => <li key={label} aria-current={step === index + 1 ? 'step' : undefined} className="min-w-0">
                <div className={`mb-1.5 h-1 rounded-full ${step >= index + 1 ? 'bg-primary' : 'bg-line'}`} />
                <span className={`text-xs font-semibold ${step >= index + 1 ? 'text-primary-text' : 'text-text-muted'}`}>{index + 1}. {label}</span>
              </li>)}
            </ol>
          </header>
          <div ref={scrollBody} className="min-h-0 flex-1 app-scroll overflow-y-auto px-6 py-4 max-[760px]:px-4" aria-busy={saving}>
            {step === 1 ? (
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-surface-brand px-4 py-3"><p className="text-sm text-text-body">Kỳ thi mục tiêu</p><strong className="text-sm">ĐGNL ĐHQG TP.HCM</strong></div>
                <div className="rounded-2xl border border-line-card p-4">
                  <label htmlFor="learning-target-score" className="text-sm font-semibold">Điểm mục tiêu</label>
                  <p className="mt-1 text-xs text-text-body">Kéo thanh điểm hoặc nhập mục tiêu của bạn.</p>
                  <input aria-label="Thanh điểm mục tiêu" className={`${styles.range} mt-5 mb-2 w-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring`} style={{ background: `linear-gradient(to right, var(--color-primary) ${scoreError || score === '' ? 0 : Number(score) / 12}%, var(--color-line) 0)` }} type="range" min={0} max={1200} step={1} value={scoreError || score === '' ? 0 : Number(score)} onChange={(event) => setScore(event.target.value)} />
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <input id="learning-target-score" className={`${inputClass.replace('w-full', 'w-28')} mt-0`} type="number" min={0} max={1200} step={1} value={score} placeholder="Chưa đặt" aria-invalid={!!scoreError} aria-describedby={scoreError ? 'learning-score-error' : undefined} onChange={(event) => setScore(event.target.value)} />
                    <span className="text-sm text-text-body">/ 1200 điểm</span>
                    <button type="button" aria-pressed={score === ''} className="ml-auto min-h-11 rounded-full border border-line px-3 text-sm font-semibold text-primary-text transition-colors hover:bg-surface-brand aria-pressed:border-primary aria-pressed:bg-surface-brand focus-visible:outline-2 focus-visible:outline-focus-ring" onClick={() => setScore('')}>Chưa xác định</button>
                  </div>
                  {scoreError && <p id="learning-score-error" role="alert" className="mt-2 text-sm text-danger">{scoreError}</p>}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                <label className="min-w-0 text-sm font-semibold">Trường đại học mục tiêu
                  <input className={inputClass} value={university} placeholder="Nhập tên trường (không bắt buộc)" aria-invalid={!!universityError} aria-describedby={universityError ? 'learning-university-error' : undefined} onChange={(event) => setUniversity(event.target.value)} />
                  {universityError && <span id="learning-university-error" className="mt-2 block text-danger">{universityError}</span>}
                </label>
                <label className="min-w-0 text-sm font-semibold">Ngành học mục tiêu
                  <input className={inputClass} value={major} placeholder="Nhập tên ngành (không bắt buộc)" aria-invalid={!!majorError} aria-describedby={majorError ? 'learning-major-error' : undefined} onChange={(event) => setMajor(event.target.value)} />
                  {majorError && <span id="learning-major-error" className="mt-2 block text-danger">{majorError}</span>}
                </label>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="rounded-xl bg-surface-brand px-3 py-2 text-xs leading-relaxed text-text-body">Chọn mức tự đánh giá cho từng môn, hoặc bỏ trống. Nhấn lại lựa chọn để bỏ chọn.</p>
                {categoryLoading && <p role="status">Đang tải môn học…</p>}
                {categoryError && <div role="alert">Không thể tải môn học. Các lựa chọn đã lưu vẫn được giữ.<Button appearance="outline" onClick={loadCategories}>Thử tải lại</Button></div>}
                {!categoryLoading && !categoryError && categories.length === 0 && <p>Chưa có môn học để lựa chọn.</p>}
                {groups.map((group) => {
                  const items = group.names.flatMap((name) => categories.filter((item) => item.name === name))
                  if (!items.length) return null
                  return <section key={group.label} className="overflow-hidden rounded-2xl border border-line-card"><h3 className="bg-surface-hover px-4 py-2.5 text-sm font-bold">{group.label}</h3><div className="divide-y divide-line px-4">{items.map((item) => (
                    <div key={item.id} role="group" aria-label={item.name} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                      <span className="text-sm font-semibold">{item.name}</span>
                      <div className="flex gap-2">{([['STRONG', 'Tự tin'], ['NEEDS_WORK', 'Cần cải thiện']] as const).map(([level, label]) => (
                        <button key={level} type="button" data-tone={level === 'STRONG' ? 'strong' : 'needs-work'} aria-pressed={subjects[item.id] === level} className={`${styles.choice} min-h-11 rounded-full border border-line bg-surface px-3 text-sm font-semibold text-text-body transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring`} onClick={() => setSubjects((current) => {
                          const next = { ...current }
                          if (next[item.id] === level) delete next[item.id]
                          else next[item.id] = level
                          return next
                        })}>{label}</button>
                      ))}</div>
                    </div>
                  ))}</div></section>
                })}
              </div>
            )}
          </div>
          <footer className="shrink-0 border-t border-line px-6 pt-4 pb-[max(20px,env(safe-area-inset-bottom))] max-[760px]:px-4">
            {failure && <div role="alert" className="mb-3 text-sm text-danger"><p>{failure}</p><Button appearance="outline" disabled={saving} onClick={() => void save(retryState)}>Thử lại</Button></div>}
            <div className="flex flex-wrap items-center justify-between gap-3 max-[760px]:grid max-[760px]:grid-cols-2 max-[760px]:gap-2">
              <Button appearance="ghost" disabled={saving} onClick={defer}>Để sau</Button>
              <div className="flex flex-wrap gap-2 max-[760px]:contents">
                {completed && <Button appearance="outline" disabled={saving} onClick={() => void save('EDIT')}>Lưu và đóng</Button>}
                {step === 2 && <Button appearance="outline" disabled={saving} onClick={() => setStep(1)}>Quay lại</Button>}
                <Button disabled={saving} className="whitespace-normal" onClick={() => {
                  if (step === 1) { if (!scoreError && !universityError && !majorError) setStep(2) }
                  else void save('COMPLETED')
                }}>{saving ? 'Đang lưu…' : step === 1 ? 'Tiếp tục' : continueToAssessment ? 'Lưu và đến bài đánh giá' : 'Lưu mục tiêu'}</Button>
              </div>
            </div>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
