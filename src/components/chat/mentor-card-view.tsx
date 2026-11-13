import type { ReactNode } from 'react'
import type { MentorCard } from '../../services/mentorProfileService'
import { Avatar, AvatarFallback, AvatarImage } from '../tailgrids/core/avatar'
import { Skeleton } from '../tailgrids/core/skeleton'

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(-2).map((word) => word[0]).join('').toUpperCase() || '?'

const dayLabel = (day: number) => (day === 7 ? 'CN' : `Thứ ${day + 1}`)

/** Support hours grouped by weekday, e.g. "Thứ 2: 19:00–21:00, 21:30–22:00". */
function hourLines(hours: MentorCard['supportHours']) {
  const byDay = new Map<number, string[]>()
  for (const interval of [...hours].sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startLocal.localeCompare(b.startLocal))) {
    byDay.set(interval.dayOfWeek, [...(byDay.get(interval.dayOfWeek) ?? []), `${interval.startLocal}–${interval.endLocal}`])
  }
  return [...byDay].map(([day, ranges]) => `${dayLabel(day)}: ${ranges.join(', ')}`)
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-1">
      <h3 className="text-xs font-semibold text-text-muted">{title}</h3>
      <div className="text-sm break-words whitespace-pre-line text-text-heading">{children}</div>
    </section>
  )
}

/** What a student sees about the mentor answering them. */
export function MentorCardView({ card }: { card: MentorCard }) {
  const study = [card.major, card.university].filter(Boolean).join(' · ')
  const hours = hourLines(card.supportHours)
  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-3">
        <Avatar className="size-14 text-lg">
          {card.avatarUrl && <AvatarImage src={card.avatarUrl} alt="" />}
          <AvatarFallback>{initials(card.displayName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-base font-semibold break-words text-text-heading">{card.displayName}</p>
          {(study || card.yearOfStudy) && (
            <p className="text-sm text-text-muted">
              {[study, card.yearOfStudy ? `Năm ${card.yearOfStudy}` : ''].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
      </div>
      {card.subjects.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {card.subjects.map((subject) => (
            <span key={subject} className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-medium text-primary-text">
              {subject}
            </span>
          ))}
        </div>
      )}
      {card.bio && <Section title="Giới thiệu">{card.bio}</Section>}
      {card.achievements && <Section title="Thành tích">{card.achievements}</Section>}
      {card.experience && <Section title="Kinh nghiệm">{card.experience}</Section>}
      <Section title="Giờ hỗ trợ">
        {hours.length ? hours.map((line) => <p key={line}>{line}</p>) : 'Chưa thiết lập lịch hỗ trợ'}
      </Section>
    </div>
  )
}

export function MentorCardSkeleton() {
  return (
    <div className="grid gap-4" aria-hidden>
      <div className="flex items-center gap-3">
        <Skeleton className="size-14 rounded-full" />
        <div className="grid flex-1 gap-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>
      <div className="flex gap-1.5">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="grid gap-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-full" />
        </div>
      ))}
    </div>
  )
}
