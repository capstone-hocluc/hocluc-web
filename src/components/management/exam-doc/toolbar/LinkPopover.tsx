import { useRef, useState, type ReactNode } from 'react'
import * as Popover from '@radix-ui/react-popover'
import Button from '../../../console/button'
import Notice from '../../../console/notice'
import { cn } from '../../../../lib/cn'
import { surfaceClass } from './toolbar-styles'

interface LinkPopoverProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Address of the link under the caret, prefilled. */
  href: string
  /** Applies the typed address (an empty one removes the link); false when the address is refused. */
  onApply: (raw: string) => boolean
  /** Gives the caret back to the editor after applying. */
  onDone: () => void
  /** The element the form opens under (the "Thêm công cụ" button). */
  children: ReactNode
}

/** The address field; mounted with each opening, so an earlier error is gone. */
function LinkForm({ href, onSubmit }: { href: string; onSubmit: (raw: string) => boolean }) {
  const [invalid, setInvalid] = useState(false)
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        if (!onSubmit(String(new FormData(event.currentTarget).get('href') ?? ''))) setInvalid(true)
      }}
    >
      <div className="flex items-center gap-2">
        <input
          name="href"
          type="text"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          aria-label="Địa chỉ liên kết"
          aria-invalid={invalid || undefined}
          placeholder="https://"
          defaultValue={href}
          onChange={() => setInvalid(false)}
          className="h-8 min-w-0 flex-1 rounded-lg border border-input-border bg-input-background px-2.5 text-[13px] text-text-primary outline-none placeholder:text-input-placeholder-text-color focus:border-input-primary-focus-border"
        />
        <Button type="submit" size="sm" className="h-8">
          Áp dụng
        </Button>
      </div>
      {invalid && <Notice tone="danger">Liên kết không hợp lệ</Notice>}
    </form>
  )
}

/** Small address form opened from "Chèn liên kết". A refused address keeps it open with an error. */
export function LinkPopover({
  open,
  onOpenChange,
  href,
  onApply,
  onDone,
  children,
}: LinkPopoverProps) {
  // Set when the form closes by Apply or Escape; a click elsewhere keeps focus where the user clicked.
  const refocus = useRef(false)

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Anchor asChild>{children}</Popover.Anchor>
      <Popover.Portal>
        <Popover.Content
          aria-label="Chèn liên kết"
          side="bottom"
          align="end"
          sideOffset={6}
          collisionPadding={8}
          className={cn(surfaceClass, 'w-[min(320px,calc(100vw-2rem))] p-2')}
          onEscapeKeyDown={() => {
            refocus.current = true
          }}
          onCloseAutoFocus={(event) => {
            // The form has no trigger to return to, so the caret goes back to the editor.
            event.preventDefault()
            if (!refocus.current) return
            refocus.current = false
            onDone()
          }}
        >
          <LinkForm
            href={href}
            onSubmit={(raw) => {
              refocus.current = true
              if (!onApply(raw)) {
                refocus.current = false
                return false
              }
              onOpenChange(false)
              return true
            }}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
