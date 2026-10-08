import type { ReactNode } from 'react'
import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../../../lib/cn'
import ActivityButton from './ActivityButton'

interface PageNavProps {
  page: number
  totalPages: number
  onPrevious: () => void
  onNext: () => void
}

// "Trang trước · Trang 1/2 · Trang sau" under a stack of questions.
export function PageNav({ page, totalPages, onPrevious, onNext }: PageNavProps) {
  return (
    <div className="flex items-center justify-between gap-2.5 max-[760px]:flex-col max-[760px]:items-stretch">
      <ActivityButton
        block
        disabled={page === 1}
        className="disabled:opacity-[0.55]"
        onClick={onPrevious}
      >
        <ChevronLeft size={15} />
        Trang trước
      </ActivityButton>
      <span className="text-[12px] font-semibold text-text-secondary max-[760px]:text-center">
        Trang {page}/{totalPages}
      </span>
      <ActivityButton
        block
        disabled={page === totalPages}
        className="disabled:opacity-[0.55]"
        onClick={onNext}
      >
        Trang sau
        <ChevronRight size={15} />
      </ActivityButton>
    </div>
  )
}

interface FilterPillsProps {
  items: { key: string; label: string }[]
  active: string
  onChange: (key: string) => void
}

// Review filter chips ("Tất cả / Câu đúng / ...").
export function FilterPills({ items, active, onChange }: FilterPillsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          className={cn(
            'min-h-[34px] cursor-pointer rounded-full border border-line bg-surface px-[13px] text-[12px] font-extrabold text-text-dim',
            active === item.key && 'border-primary bg-primary-soft text-primary'
          )}
          onClick={() => onChange(item.key)}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

interface SubmitConfirmModalProps {
  onContinue: () => void
  onSubmit: () => void
}

// "Bạn vẫn còn câu chưa trả lời" confirmation (Radix AlertDialog: focus trap, ESC = continue).
export function SubmitConfirmModal({ onContinue, onSubmit }: SubmitConfirmModalProps) {
  return (
    <AlertDialog.Root open onOpenChange={(open) => !open && onContinue()}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-80 grid place-items-center bg-[rgba(9,17,41,0.45)] p-5">
          <AlertDialog.Content className="w-[min(430px,100%)] rounded-[18px] bg-surface p-5 shadow-[0_24px_70px_rgba(9,17,41,0.22)]">
            <AlertDialog.Title>Xác nhận nộp bài</AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-[14px] leading-[1.5] text-text-dim">
              Bạn vẫn còn câu chưa trả lời. Bạn có chắc muốn nộp bài không?
            </AlertDialog.Description>
            <div className="mt-[18px] flex justify-end gap-2.5">
              <AlertDialog.Cancel asChild>
                <ActivityButton weight="extrabold">Tiếp tục làm</ActivityButton>
              </AlertDialog.Cancel>
              <ActivityButton tone="primary" weight="extrabold" onClick={onSubmit}>
                Nộp bài
              </ActivityButton>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Overlay>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}

// Row of previous / mark-complete / next actions under a video lesson.
export function LessonActions({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2.5 max-[760px]:flex-col max-[760px]:items-stretch">
      {children}
    </div>
  )
}
