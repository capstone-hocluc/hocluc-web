import * as Dialog from '@radix-ui/react-dialog'
import Button from '../../ui/Button'

interface ScoreLimitDialogProps {
  open: boolean
  onClose: () => void
}

// Shown when the typed target score is above the 1200 maximum (Radix Dialog: focus trap,
// ESC and click-outside close).
function ScoreLimitDialog({ open, onClose }: ScoreLimitDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-60 grid place-items-center bg-[rgba(10,16,35,0.42)] p-6 backdrop-blur-[8px]">
          <Dialog.Content
            aria-describedby="onboarding-score-limit-text"
            className="w-[min(520px,100%)] rounded-3xl border border-[rgba(223,230,247,0.95)] bg-white/98 px-[22px] pt-6 pb-5 text-center shadow-[0_28px_70px_rgba(9,16,36,0.28)] outline-none max-[701px]:rounded-[20px] max-[701px]:px-[18px] max-[701px]:pt-5 max-[701px]:pb-[18px]"
          >
            <div className="mx-auto mb-3.5 grid size-[52px] place-items-center rounded-[18px] bg-[linear-gradient(135deg,var(--color-primary),var(--color-primary-dark))] text-[28px] leading-none font-black text-surface shadow-[0_14px_24px_rgba(28, 176, 246,0.24)]">
              !
            </div>
            <Dialog.Title className="text-[22px] leading-[1.2] tracking-[-0.4px] text-text-heading max-[701px]:text-[20px]">
              Điểm tối đa đã đạt tới
            </Dialog.Title>
            <p
              id="onboarding-score-limit-text"
              className="mt-3 text-[14px] leading-[1.7] text-text-body max-[701px]:text-[13px]"
            >
              Điểm tối đa của kỳ thi đánh giá năng lực do{' '}
              <strong className="font-extrabold text-text-heading">Đại học Quốc gia TP. HCM</strong>{' '}
              tổ chức là <strong className="font-extrabold text-text-heading">1.200 điểm.</strong>{' '}
              Bạn vui lòng chọn lại nhé.
            </p>
            <Button
              className="mt-[18px] h-auto rounded-[10px] border-0 px-[18px] py-3 text-[14px] font-medium"
              onClick={onClose}
            >
              Đã hiểu
            </Button>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default ScoreLimitDialog
