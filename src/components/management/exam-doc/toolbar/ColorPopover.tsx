import { useRef, useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import * as Menu from '@radix-ui/react-dropdown-menu'
import { cn } from '../../../../lib/cn'
import { Ban, Baseline, Check, ChevronDown, Highlighter } from './toolbar-icons'
import { HIGHLIGHT_COLORS, TEXT_COLORS, type Swatch } from './toolbar-options'
import { MenuItem, MenuSeparator, MenuSub } from './ToolbarMenu'
import { controlClass, menuItemClass, surfaceClass } from './toolbar-styles'

type ColorKind = 'text' | 'highlight'

const KINDS: Record<ColorKind, { label: string; palette: Swatch[]; checkColor: string }> = {
  // Dark text colours take a white check, light highlight tints a dark one (the swatches are document colours).
  text: { label: 'Màu chữ', palette: TEXT_COLORS, checkColor: '#ffffff' },
  highlight: { label: 'Màu nền chữ', palette: HIGHLIGHT_COLORS, checkColor: '#1f2937' },
}

function SwatchDot({
  kind,
  swatch,
  selected,
}: {
  kind: ColorKind
  swatch: Swatch
  selected: boolean
}) {
  return (
    <span
      aria-hidden
      className="grid size-6 place-items-center rounded-full border border-input-border"
      style={{ backgroundColor: swatch.value }}
    >
      {selected && <Check size={13} strokeWidth={3} style={{ color: KINDS[kind].checkColor }} />}
    </span>
  )
}

/** "A" or the highlighter, with a bar in the selection's colour underneath. */
function ColorGlyph({ kind, value }: { kind: ColorKind; value: string | null }) {
  return (
    <span aria-hidden className="flex w-5 flex-col items-center gap-0.5">
      {kind === 'text' ? (
        <span className="text-[15px] leading-4 font-semibold">A</span>
      ) : (
        <Highlighter size={15} strokeWidth={1.75} />
      )}
      <span
        className={cn(
          'h-[3px] w-4 rounded-full ring-1 ring-card-border',
          !value && (kind === 'text' ? 'bg-text-primary' : 'bg-transparent')
        )}
        style={value ? { backgroundColor: value } : undefined}
      />
    </span>
  )
}

interface ColorPickerProps {
  kind: ColorKind
  /** Colour of the selection as lower-case hex, null when none is set. */
  value: string | null
  /** A palette colour, or null for "Mặc định" (removes the colour). */
  onPick: (color: string | null) => void
}

interface ColorPopoverProps extends ColorPickerProps {
  disabled: boolean
  /** Gives the caret back to the editor after a pick. */
  onDone: () => void
}

/** Toolbar button that opens a 10-colour grid plus "Mặc định". */
export function ColorPopover({ kind, value, disabled, onPick, onDone }: ColorPopoverProps) {
  const [open, setOpen] = useState(false)
  const picked = useRef(false)
  const { label, palette } = KINDS[kind]

  const pick = (color: string | null) => {
    picked.current = true
    onPick(color)
    setOpen(false)
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild disabled={disabled}>
        <button
          type="button"
          aria-label={label}
          title={label}
          className={cn(controlClass, 'gap-0.5 px-1.5')}
        >
          <ColorGlyph kind={kind} value={value} />
          <ChevronDown
            size={12}
            strokeWidth={2}
            aria-hidden
            className="shrink-0 text-icon-tertiary"
          />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          aria-label={label}
          sideOffset={6}
          align="start"
          collisionPadding={8}
          className={cn(surfaceClass, 'w-[196px] p-2')}
          onCloseAutoFocus={(event) => {
            if (!picked.current) return
            picked.current = false
            event.preventDefault()
            onDone()
          }}
        >
          <div className="grid grid-cols-5 gap-1.5">
            {palette.map((swatch) => {
              const selected = value === swatch.value
              return (
                <button
                  key={swatch.value}
                  type="button"
                  aria-label={swatch.label}
                  aria-pressed={selected}
                  title={swatch.label}
                  onClick={() => pick(swatch.value)}
                  className="grid size-8 place-items-center rounded-md outline-none transition-colors hover:bg-background-gray-secondary_alt focus-visible:ring-2 focus-visible:ring-input-primary-focus-border"
                >
                  <SwatchDot kind={kind} swatch={swatch} selected={selected} />
                </button>
              )
            })}
          </div>
          <div className="-mx-2 my-2 h-px bg-card-border" />
          <button
            type="button"
            aria-pressed={value === null}
            onClick={() => pick(null)}
            className={cn(
              menuItemClass,
              'pr-2 hover:bg-background-gray-secondary_alt focus-visible:ring-2 focus-visible:ring-input-primary-focus-border'
            )}
          >
            <Ban size={16} strokeWidth={1.75} aria-hidden className="shrink-0 text-icon-tertiary" />
            <span className="flex-1">Mặc định</span>
            {value === null && (
              <Check size={14} strokeWidth={2.25} aria-hidden className="text-primary-text" />
            )}
          </button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

/** The same grid as a submenu of "Thêm công cụ", for when the colour buttons do not fit the row. */
export function ColorMenuSub({ kind, value, onPick }: ColorPickerProps) {
  const { label, palette } = KINDS[kind]
  const current = palette.find((swatch) => swatch.value === value)?.label

  return (
    <MenuSub
      icon={kind === 'text' ? Baseline : Highlighter}
      label={label}
      hint={current}
      contentClassName="w-[196px] min-w-0 p-2"
    >
      <div className="grid grid-cols-5 gap-1.5">
        {palette.map((swatch) => (
          <Menu.Item
            key={swatch.value}
            aria-label={swatch.label}
            title={swatch.label}
            onSelect={() => onPick(swatch.value)}
            className="grid size-8 cursor-default place-items-center rounded-md outline-none data-[highlighted]:bg-background-gray-secondary_alt data-[highlighted]:ring-2 data-[highlighted]:ring-input-primary-focus-border"
          >
            <SwatchDot kind={kind} swatch={swatch} selected={value === swatch.value} />
          </Menu.Item>
        ))}
      </div>
      <MenuSeparator />
      <MenuItem icon={Ban} onSelect={() => onPick(null)}>
        Mặc định
      </MenuItem>
    </MenuSub>
  )
}
