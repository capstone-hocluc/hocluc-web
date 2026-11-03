import { ArrowLeft, Eye } from '../../../console/icons'
import { useExamDoc } from '../exam-doc-context'

/** The strip above the sheet while an exam variant is shown read-only, with the way back to the original. */
export default function VariantBanner() {
  const { activeVariant, setActiveVariant } = useExamDoc()
  if (!activeVariant) return null
  return (
    <div className="flex h-10 shrink-0 items-center gap-2 border-b border-card-border bg-badge-primary-background px-3 text-[13px] text-primary-text">
      <Eye aria-hidden size={15} className="shrink-0" />
      <p role="status" className="min-w-0 truncate font-medium">
        Đang xem mã {activeVariant} · chỉ đọc
      </p>
      <button
        type="button"
        onClick={() => setActiveVariant(null)}
        aria-label="Về đề gốc"
        title="Về đề gốc"
        className="ml-auto inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border border-primary-text/30 bg-card-background px-2.5 text-xs font-medium text-primary-text outline-none transition-colors hover:bg-background-gray-secondary focus-visible:ring-2 focus-visible:ring-input-primary-focus-border"
      >
        <ArrowLeft aria-hidden size={13} />
        Về đề gốc
      </button>
    </div>
  )
}
