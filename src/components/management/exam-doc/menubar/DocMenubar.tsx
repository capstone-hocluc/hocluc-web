import { useRef, useState, type KeyboardEvent } from 'react'
import * as Menu from '@radix-ui/react-dropdown-menu'
import { useExamDoc } from '../exam-doc-context'
import { insertPickedImage } from '../insert-image'
import LinkDialog from './LinkDialog'
import WordCountDialog from './WordCountDialog'
import { MenuContent } from './menu-ui'
import {
  EditMenu,
  FileMenu,
  FormatMenu,
  InsertMenu,
  ToolsMenu,
  ViewMenu,
  type RunCommand,
} from './menus'

const MENUS = [
  { id: 'file', label: 'Tệp' },
  { id: 'edit', label: 'Chỉnh sửa' },
  { id: 'view', label: 'Xem' },
  { id: 'insert', label: 'Chèn' },
  { id: 'format', label: 'Định dạng' },
  { id: 'tools', label: 'Công cụ' },
] as const

type MenuId = (typeof MENUS)[number]['id']

interface DocMenubarProps {
  onNew: () => void
  outlineOpen: boolean
  onToggleOutline: () => void
  chatOpen: boolean
  onToggleChat: () => void
}

/**
 * Tệp / Chỉnh sửa / Xem / Chèn / Định dạng / Công cụ. Behaves as a menubar: arrow keys move between
 * the menus (also while one is open), and hovering another menu while one is open switches to it.
 */
export default function DocMenubar({
  onNew,
  outlineOpen,
  onToggleOutline,
  chatOpen,
  onToggleChat,
}: DocMenubarProps) {
  const { editor, pages } = useExamDoc()
  const [openMenu, setOpenMenuState] = useState<MenuId | null>(null)
  // Read by the close handlers, which run after the state has already moved on.
  const openRef = useRef<MenuId | null>(null)
  const [focusIndex, setFocusIndex] = useState(0)
  const triggers = useRef<Array<HTMLButtonElement | null>>([])
  // Set when a menu action has sent focus somewhere (editor, dialog, file picker).
  const focusMovedRef = useRef(false)
  const imageInput = useRef<HTMLInputElement>(null)
  const [dialog, setDialog] = useState<'link' | 'count' | null>(null)

  function setOpenMenu(next: MenuId | null) {
    openRef.current = next
    setOpenMenuState(next)
  }

  function wrap(index: number, delta: number) {
    return (index + delta + MENUS.length) % MENUS.length
  }

  function focusTrigger(index: number) {
    setFocusIndex(index)
    triggers.current[index]?.focus()
  }

  const run: RunCommand = (command) => {
    if (!editor || editor.isDestroyed) return
    focusMovedRef.current = true
    command(editor)
  }

  function openDialog(kind: 'link' | 'count') {
    focusMovedRef.current = true
    setDialog(kind)
  }

  function closeDialog() {
    setDialog(null)
    if (editor && !editor.isDestroyed) editor.commands.focus()
  }

  function pickImage() {
    focusMovedRef.current = true
    imageInput.current?.click()
  }

  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault()
      focusTrigger(wrap(index, event.key === 'ArrowRight' ? 1 : -1))
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      focusTrigger(event.key === 'Home' ? 0 : MENUS.length - 1)
    }
  }

  function onContentKeyDown(event: KeyboardEvent<HTMLDivElement>, index: number) {
    // Submenus handle their own Left/Right (open/close) and mark the event handled.
    if (event.defaultPrevented) return
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    event.preventDefault()
    const next = wrap(index, event.key === 'ArrowRight' ? 1 : -1)
    setFocusIndex(next)
    setOpenMenu(MENUS[next].id)
  }

  function renderMenu(id: MenuId) {
    switch (id) {
      case 'file':
        return <FileMenu onNew={onNew} />
      case 'edit':
        return <EditMenu run={run} />
      case 'view':
        return (
          <ViewMenu
            outlineOpen={outlineOpen}
            onToggleOutline={onToggleOutline}
            chatOpen={chatOpen}
            onToggleChat={onToggleChat}
          />
        )
      case 'insert':
        return (
          <InsertMenu run={run} onPickImage={pickImage} onOpenLink={() => openDialog('link')} />
        )
      case 'format':
        return <FormatMenu run={run} />
      case 'tools':
        return <ToolsMenu onOpenWordCount={() => openDialog('count')} />
    }
  }

  return (
    <>
      <div
        role="menubar"
        aria-label="Menu đề thi"
        className="-ml-0.5 flex min-w-0 items-center overflow-x-auto [scrollbar-width:none]"
      >
        {MENUS.map((menu, index) => (
          <Menu.Root
            key={menu.id}
            modal={false}
            open={openMenu === menu.id}
            onOpenChange={(next) => {
              if (next) {
                setFocusIndex(index)
                setOpenMenu(menu.id)
              } else if (openRef.current === menu.id) {
                setOpenMenu(null)
              }
            }}
          >
            <Menu.Trigger
              ref={(node) => {
                triggers.current[index] = node
              }}
              role="menuitem"
              tabIndex={index === focusIndex ? 0 : -1}
              title={menu.label}
              onFocus={() => setFocusIndex(index)}
              onPointerEnter={() => {
                if (openRef.current && openRef.current !== menu.id) {
                  setFocusIndex(index)
                  setOpenMenu(menu.id)
                }
              }}
              onKeyDown={(event) => onTriggerKeyDown(event, index)}
              className="h-6 shrink-0 rounded-md px-2 text-[13px] leading-6 whitespace-nowrap text-text-secondary transition-colors outline-none hover:bg-background-gray-secondary hover:text-text-primary focus-visible:ring-2 focus-visible:ring-input-primary-focus-border focus-visible:ring-inset data-[state=open]:bg-badge-primary-background data-[state=open]:text-primary-text"
            >
              {menu.label}
            </Menu.Trigger>
            <MenuContent
              onKeyDown={(event) => onContentKeyDown(event, index)}
              onCloseAutoFocus={(event) => {
                // Keep focus where the action (or the next open menu) put it; Escape still returns
                // focus to the trigger.
                if (focusMovedRef.current || openRef.current !== null) event.preventDefault()
                focusMovedRef.current = false
              }}
            >
              {renderMenu(menu.id)}
            </MenuContent>
          </Menu.Root>
        ))}
      </div>

      <input
        ref={imageInput}
        type="file"
        accept="image/*"
        hidden
        tabIndex={-1}
        aria-hidden
        onChange={(event) => void insertPickedImage(editor, event.currentTarget)}
      />
      {dialog === 'link' && editor && <LinkDialog editor={editor} onClose={closeDialog} />}
      {dialog === 'count' && editor && (
        <WordCountDialog editor={editor} pages={pages} onClose={closeDialog} />
      )}
    </>
  )
}
