import { useState, type FormEvent } from 'react'
import { useScheduleResource } from '../../hooks/useScheduleResource'
import { getErrorMessage } from '../../lib/errors'
import { getMyMentorProfile, updateMyMentorProfile, type MentorCard } from '../../services/mentorProfileService'
import { MentorCardSkeleton, MentorCardView } from '../chat/mentor-card-view'
import { Card } from '../tailgrids/core/card'
import { Label } from '../tailgrids/core/label'
import { Skeleton } from '../tailgrids/core/skeleton'
import { TextArea } from '../tailgrids/core/text-area'
import { TextField } from '../tailgrids/core/text-field'
import { cn } from '../../lib/cn'
import Button from './button'
import Notice from './notice'

/** A mentor writes their achievements and experience and sees the card students get. */
export default function MentorSelfProfile() {
  const resource = useScheduleResource('mentor-self-profile', getMyMentorProfile)
  const [saved, setSaved] = useState<MentorCard | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [failed, setFailed] = useState(false)
  const card = saved ?? resource.data

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setBusy(true)
    setMessage('')
    try {
      setSaved(
        await updateMyMentorProfile({
          achievements: String(form.get('achievements') ?? ''),
          experience: String(form.get('experience') ?? ''),
        })
      )
      setFailed(false)
      setMessage('Đã lưu hồ sơ.')
    } catch (reason) {
      setFailed(true)
      setMessage(getErrorMessage(reason))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="bg-transparent p-5">
      <h2 className="mb-6 text-xl leading-7 font-semibold text-text-primary">Hồ sơ Mentor</h2>
      {resource.status === 'loading' ? (
        <div className="grid gap-6 lg:grid-cols-2" aria-hidden>
          <div className="grid content-start gap-5">
            {Array.from({ length: 2 }, (_, index) => (
              <div key={index} className="grid gap-2.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-32 w-full" />
              </div>
            ))}
          </div>
          <MentorCardSkeleton />
        </div>
      ) : !card ? (
        <Notice tone="danger">{resource.errorMessage || 'Không thể tải hồ sơ mentor.'}</Notice>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <form className="space-y-5" onSubmit={onSubmit}>
            <TextField className="w-full gap-2.5">
              <Label>Thành tích</Label>
              <TextArea name="achievements" rows={5} maxLength={3000} defaultValue={card.achievements ?? ''} className="w-full" />
            </TextField>
            <TextField className="w-full gap-2.5">
              <Label>Kinh nghiệm</Label>
              <TextArea name="experience" rows={5} maxLength={3000} defaultValue={card.experience ?? ''} className="w-full" />
            </TextField>
            <div className="flex items-center justify-end gap-3">
              {message && (
                <p role={failed ? 'alert' : 'status'} className={cn('text-sm', failed ? 'text-danger' : 'text-success')}>
                  {message}
                </p>
              )}
              <Button type="submit" disabled={busy}>
                {busy ? 'Đang lưu...' : 'Lưu hồ sơ'}
              </Button>
            </div>
          </form>
          <section className="rounded-xl border border-card-border p-4">
            <h3 className="mb-4 text-sm font-medium text-text-primary">Học sinh thấy</h3>
            <MentorCardView card={card} />
          </section>
        </div>
      )}
    </Card>
  )
}
