import { useEffect, useRef, useState } from 'react'
import type { MathfieldElement } from 'mathlive'

export interface MathLiveHandle {
  insert(latex: string): void
  value(): string
}

// MathLive writes a fraction of single characters compactly (`\frac12`); braces keep the saved
// LaTeX readable and match what authors type elsewhere.
function braceFraction(latex: string) {
  return latex.replace(/\\frac\s*([0-9A-Za-z])([0-9A-Za-z])/g, '\\frac{$1}{$2}')
}

let mathliveLoad: Promise<typeof import('mathlive')> | null = null

/** MathLive is a large bundle, so it is fetched the first time a formula is edited. */
function loadMathlive() {
  mathliveLoad ??= import('mathlive').then((module) => {
    module.MathfieldElement.fontsDirectory = '/mathlive-fonts'
    module.MathfieldElement.soundsDirectory = null
    return module
  })
  return mathliveLoad
}

interface MathLiveFieldProps {
  value: string
  onChange: (latex: string) => void
  handleRef: { current: MathLiveHandle | null }
  ariaLabel?: string
}

/** Created imperatively: MathLive defines the `<math-field>` custom element, not a React one. */
export default function MathLiveField({
  value,
  onChange,
  handleRef,
  ariaLabel = 'Công thức',
}: MathLiveFieldProps) {
  const host = useRef<HTMLDivElement>(null)
  const change = useRef(onChange)
  const initial = useRef({ value, ariaLabel })
  const [ready, setReady] = useState(false)

  useEffect(() => { change.current = onChange }, [onChange])

  useEffect(() => {
    let live = true
    let field: MathfieldElement | null = null

    loadMathlive().then(({ MathfieldElement }) => {
      if (!live || !host.current) return
      field = new MathfieldElement()
      field.className = 'block w-full min-w-0'
      // MathLive resolves some options through the mount point, so attach before configuring.
      host.current.appendChild(field)
      field.mathModeSpace = '\\:'
      field.smartSuperscript = false
      field.menuItems = []
      field.mathVirtualKeyboardPolicy = window.matchMedia('(pointer: coarse)').matches ? 'auto' : 'manual'
      try {
        field.inlineShortcuts = Object.fromEntries(
          Object.entries(field.inlineShortcuts).filter(([key]) => !['AA', 'EE', 'ee', 'oo', 'xx'].includes(key))
        )
      } catch {
        // Shortcut keys differ between MathLive builds; the defaults are still usable.
      }
      field.setAttribute('aria-label', initial.current.ariaLabel)
      field.setAttribute('placeholder', '\\text{Nhập công thức…}')
      field.style.minHeight = '2.75rem'
      field.setValue(initial.current.value)
      const current = field
      const read = () => braceFraction(current.getValue('latex-without-placeholders'))
      current.addEventListener('input', () => change.current(read()))
      // The dialog's focus trap consumes Tab before MathLive can move between placeholders.
      current.addEventListener('keydown', (event) => {
        if (event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey) return
        event.preventDefault()
        event.stopPropagation()
        current.executeCommand(event.shiftKey ? 'moveToPreviousGroup' : 'moveToNextGroup')
      }, true)
      handleRef.current = {
        insert: (latex) => current.insert(latex, { selectionMode: 'placeholder', focus: true }),
        value: read,
      }
      setReady(true)
      requestAnimationFrame(() => { if (live) current.focus() })
    }).catch(() => {
      // Leave the skeleton in place: MathLive is retried on the next open.
    })

    return () => {
      live = false
      handleRef.current = null
      field?.remove()
    }
  }, [handleRef])

  return (
    <div className="relative">
      <div ref={host} className="min-h-11" />
      {!ready && (
        <div
          role="status"
          aria-label="Đang tải công cụ công thức"
          className="absolute inset-0 animate-pulse rounded-md bg-background-gray-secondary"
        />
      )}
    </div>
  )
}
