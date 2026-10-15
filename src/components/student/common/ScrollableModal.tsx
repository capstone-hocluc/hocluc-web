import type { ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from '../../console/icons'

interface ScrollableModalProps {
  title: ReactNode
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  maxWidth?: number
}

// Modal with a fixed header and a scrolling body, on Radix Dialog (focus trap,
// ESC and click-outside to close, aria wiring).
function ScrollableModal({
  title,
  isOpen,
  onClose,
  children,
  maxWidth = 680,
}: ScrollableModalProps) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-120 grid place-items-center bg-[rgba(10,16,35,0.44)] p-6 backdrop-blur-[8px] max-[760px]:p-4">
          <Dialog.Content
            aria-describedby={undefined}
            className="flex max-h-[78vh] w-full flex-col overflow-hidden rounded-3xl border-[1.5px] border-line-card bg-surface shadow-[0_5px_0_#dce8f0,0_30px_80px_rgba(9,16,36,0.25)] outline-none max-[760px]:max-h-[80vh] max-[760px]:rounded-[20px]"
            style={{ maxWidth: Math.min(maxWidth, 680) }}
          >
            <div className="flex items-center justify-between gap-4 border-b-[1.5px] border-line px-5 py-[18px] max-[760px]:px-4">
              <Dialog.Title className="text-[22px] leading-[1.25] font-black tracking-[-0.3px] text-text-heading">
                {title}
              </Dialog.Title>
              <Dialog.Close
                aria-label="Đóng"
                className="grid size-10 cursor-pointer place-items-center rounded-xl border-2 border-line bg-surface text-primary-text transition active:translate-y-0.5 active:shadow-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#174fbd]"
              >
                <X size={18} />
              </Dialog.Close>
            </div>
            <div className="min-h-0 overflow-y-auto px-5 pt-[18px] pb-5 max-[760px]:px-4">
              {children}
            </div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default ScrollableModal
