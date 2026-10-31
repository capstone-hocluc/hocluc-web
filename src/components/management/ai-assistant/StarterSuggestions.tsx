import { useEffect, useRef, useState } from 'react'
import { cn } from '../../../lib/cn'
import type { AiAssistantMode } from '../../../services/aiAssistantService'
import {
  ArrowUpRight,
  ClipboardList,
  CornerDownLeft,
  FileCheck2,
  RefreshCw,
  Sparkles,
  type LucideIcon,
} from '../../console/icons'

interface Suggestion {
  label: string
  prompt: string
}

const GUIDES: { id: AiAssistantMode; label: string; icon: LucideIcon; prompts: Suggestion[] }[] = [
  {
    id: 'ask',
    label: 'Hỏi đáp',
    icon: Sparkles,
    prompts: [
      {
        label: 'Giải thích vì sao tại điểm cực trị đạo hàm bằng 0',
        prompt: 'Giải thích vì sao tại điểm cực trị đạo hàm lại bằng 0, kèm ví dụ.',
      },
      {
        label: 'Tóm tắt các bước giải phương trình lượng giác',
        prompt: 'Tóm tắt các bước giải phương trình lượng giác cơ bản.',
      },
    ],
  },
  {
    id: 'compose',
    label: 'Soạn câu hỏi',
    icon: ClipboardList,
    prompts: [
      {
        label: 'Soạn 5 câu trắc nghiệm về cực trị hàm số',
        prompt: 'Soạn 5 câu trắc nghiệm về cực trị hàm số, mức thông hiểu.',
      },
      {
        label: 'Soạn 3 câu đúng – sai về dấu đạo hàm',
        prompt: 'Soạn 3 câu đúng – sai về dấu đạo hàm, kèm lời giải.',
      },
    ],
  },
  {
    id: 'mock-exam',
    label: 'Mô phỏng đề',
    icon: FileCheck2,
    prompts: [
      {
        label: 'Mô phỏng đề 20 câu từ ngân hàng câu hỏi',
        prompt: 'Mô phỏng một đề 20 câu từ ngân hàng câu hỏi hiện có.',
      },
      {
        label: 'Tạo đề kiểm tra 15 phút từ đề tham khảo',
        prompt: 'Tạo đề kiểm tra 15 phút dựa trên đề tham khảo 2026.',
      },
    ],
  },
]

const ALL_PROMPTS = GUIDES.flatMap((guide) =>
  guide.prompts.map((prompt) => ({ ...prompt, mode: guide.id }))
)

export default function StarterSuggestions({
  onModeChange,
  onPick,
  disabled = false,
}: {
  onModeChange: (mode: AiAssistantMode) => void
  onPick: (mode: AiAssistantMode, prompt: string) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState<AiAssistantMode | null>(null)
  const [adviceIndex, setAdviceIndex] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)
  const guide = GUIDES.find((entry) => entry.id === open)
  const advice = ALL_PROMPTS[adviceIndex % ALL_PROMPTS.length]

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(null)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(null)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div
      className="mx-auto w-full max-w-[768px] px-6 pb-6"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          event.stopPropagation()
          setOpen(null)
        }
      }}
    >
      <div ref={menuRef} className="relative z-20">
        <div className="flex flex-wrap justify-center gap-1.5">
          {GUIDES.map((entry) => {
            const Icon = entry.icon
            const expanded = open === entry.id
            return (
              <button
                key={entry.id}
                type="button"
                aria-expanded={expanded}
                onClick={() => {
                  onModeChange(entry.id)
                  setOpen(expanded ? null : entry.id)
                }}
                className={cn(
                  'inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[13px] font-medium shadow-xs transition-colors focus-visible:ring-2 focus-visible:ring-input-primary-focus-border',
                  expanded
                    ? 'border-primary-text/30 bg-badge-primary-background text-primary-text'
                    : 'border-card-border bg-card-background text-text-secondary hover:bg-background-gray-secondary hover:text-text-primary'
                )}
              >
                <Icon size={14} strokeWidth={1.7} aria-hidden />
                <span>{entry.label}</span>
              </button>
            )
          })}
        </div>
        {guide && (
          <div
            role="group"
            aria-label={guide.label}
            className="absolute top-full right-0 left-0 mx-auto mt-2 max-w-[600px] rounded-xl border border-card-border bg-card-background p-1.5 shadow-card-hover"
          >
            {guide.prompts.map((prompt) => (
              <button
                key={prompt.label}
                type="button"
                disabled={disabled}
                onClick={() => {
                  onPick(guide.id, prompt.prompt)
                  setOpen(null)
                }}
                className="group/row flex min-h-[42px] w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm text-text-primary transition-colors hover:bg-background-gray-secondary focus-visible:ring-2 focus-visible:ring-input-primary-focus-border"
              >
                <span className="min-w-0 flex-1 truncate">{prompt.label}</span>
                <CornerDownLeft
                  size={14}
                  strokeWidth={1.8}
                  aria-hidden
                  className="shrink-0 text-icon-tertiary opacity-0 transition-opacity group-hover/row:opacity-100"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center justify-center">
        <div className="inline-flex max-w-full items-center rounded-lg transition-colors hover:bg-background-gray-secondary">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onPick(advice.mode, advice.prompt)}
            className="inline-flex h-8 min-w-0 items-center gap-1.5 rounded-lg px-3 text-[13px] text-text-secondary focus-visible:ring-2 focus-visible:ring-input-primary-focus-border"
          >
            <ArrowUpRight size={14} strokeWidth={1.8} className="shrink-0 text-icon-tertiary" />
            <span className="shrink-0 text-text-tertiary">Gợi ý cho bạn</span>
            <span className="min-w-0 max-w-[min(440px,56vw)] truncate text-text-secondary">
              {advice.label}
            </span>
          </button>
          <button
            type="button"
            aria-label="Gợi ý khác"
            title="Gợi ý khác"
            disabled={disabled}
            onClick={() => setAdviceIndex((index) => index + 1)}
            className="mr-0.5 inline-grid size-7 shrink-0 place-items-center rounded-lg text-icon-tertiary transition-colors hover:bg-card-background hover:text-text-primary focus-visible:ring-2 focus-visible:ring-input-primary-focus-border"
          >
            <RefreshCw size={14} strokeWidth={1.3} />
          </button>
        </div>
      </div>
    </div>
  )
}
