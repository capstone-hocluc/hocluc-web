import { Fragment, useRef, useState, type ReactNode } from 'react'
import * as Menu from '@radix-ui/react-dropdown-menu'
import type { ChainedCommands } from '@tiptap/react'
import { cn } from '../../../lib/cn'
import { useExamDoc } from './exam-doc-context'
import { insertPickedImage } from './insert-image'
import { linkSelection } from './link-url'
import { ColorMenuSub, ColorPopover } from './toolbar/ColorPopover'
import { FontSizeControl } from './toolbar/FontSizeControl'
import { LinkPopover } from './toolbar/LinkPopover'
import { ToolbarButton, ToolbarSeparator } from './toolbar/ToolbarButton'
import {
  MenuCheckItem,
  MenuContent,
  MenuItem,
  MenuRadioList,
  MenuSeparator,
  MenuSub,
} from './toolbar/ToolbarMenu'
import { ToolbarSelect } from './toolbar/ToolbarSelect'
import {
  ALargeSmall,
  Bold,
  EllipsisVertical,
  FlaskConical,
  ImageIcon,
  Italic,
  LinkIcon,
  List,
  ListChevronsUpDown,
  ListIndentDecrease,
  ListIndentIncrease,
  ListOrdered,
  Minus,
  Pilcrow,
  Plus,
  Printer,
  Redo2,
  RemoveFormatting,
  SeparatorHorizontal,
  Sigma,
  Square,
  Strikethrough,
  Subscript,
  Superscript,
  Table,
  Type,
  Underline,
  Undo2,
  type LucideIcon,
} from './toolbar/toolbar-icons'
import {
  ALIGN_OPTIONS,
  BLOCK_OPTIONS,
  FONT_OPTIONS,
  FONT_SIZE_OPTIONS,
  LINE_HEIGHT_DEFAULT,
  LINE_HEIGHT_OPTIONS,
  MAX_FONT_SIZE_PT,
  MIN_FONT_SIZE_PT,
  ZOOM_OPTIONS,
  clampFontSize,
  formatDecimal,
  parseFontSize,
  ptToCss,
  type TextAlignValue,
} from './toolbar/toolbar-options'
import { controlClass } from './toolbar/toolbar-styles'
import { useToolbarOverflow } from './toolbar/use-toolbar-overflow'
import { useToolbarState } from './toolbar/use-toolbar-state'

interface ToolbarAction {
  label: string
  icon: LucideIcon
  shortcut?: string
  /** Toggle state; undefined for plain actions. */
  pressed?: boolean
  disabled: boolean
  run: () => void
  /**
   * What happens once the "Thêm công cụ" menu has closed after this action: the caret goes back to the
   * editor (default), the link form opens, or nothing (a dialog or file picker takes over).
   */
  after?: 'editor' | 'link' | null
}

/** Row groups, left to right; the first one never moves into the menu. */
const GROUP_COUNT = 8

function ActionButtons({ actions }: { actions: ToolbarAction[] }) {
  return actions.map((action) => (
    <ToolbarButton
      key={action.label}
      label={action.label}
      icon={action.icon}
      shortcut={action.shortcut}
      pressed={action.pressed}
      disabled={action.disabled}
      onClick={action.run}
    />
  ))
}

function ActionItems({
  actions,
  onRun,
}: {
  actions: ToolbarAction[]
  onRun: (action: ToolbarAction) => void
}) {
  return actions.map((action) =>
    action.pressed === undefined ? (
      <MenuItem
        key={action.label}
        icon={action.icon}
        hint={action.shortcut}
        disabled={action.disabled}
        onSelect={() => onRun(action)}
      >
        {action.label}
      </MenuItem>
    ) : (
      <MenuCheckItem
        key={action.label}
        icon={action.icon}
        hint={action.shortcut}
        checked={action.pressed}
        disabled={action.disabled}
        onSelect={() => onRun(action)}
      >
        {action.label}
      </MenuCheckItem>
    )
  )
}

/**
 * The formatting toolbar of the exam document: one pill row of grouped controls. Groups that do not fit move,
 * from the right, into the "Thêm công cụ" menu, which also holds the less used tools (link, table, image...).
 */
export default function DocToolbar() {
  const { editor, zoom, setZoom, openFormula } = useExamDoc()
  const state = useToolbarState(editor)
  const { rowRef, moreRef, registerGroup, visibleCount } = useToolbarOverflow(GROUP_COUNT)
  const [linkOpen, setLinkOpen] = useState(false)
  const imageInput = useRef<HTMLInputElement>(null)
  const afterMenu = useRef<ToolbarAction['after']>(null)

  const off = !state.editable

  const focusEditor = () => {
    if (editor && !editor.isDestroyed) editor.commands.focus(null, { scrollIntoView: false })
  }

  /** Runs a command chain on the editor, with the caret back in the document. */
  const exec = (command: (chain: ChainedCommands) => ChainedCommands) => {
    if (editor && !editor.isDestroyed) command(editor.chain().focus()).run()
  }

  const runFromMenu = (action: ToolbarAction) => {
    afterMenu.current = action.after === undefined ? 'editor' : action.after
    action.run()
  }

  /** Wraps a value setter used inside the menu so the caret returns to the editor afterwards. */
  const fromMenu =
    <T,>(apply: (value: T) => void) =>
    (value: T) => {
      afterMenu.current = 'editor'
      apply(value)
    }

  const setBlock = (value: string) =>
    exec((chain) =>
      value === 'paragraph'
        ? chain.setParagraph()
        : chain.setHeading({ level: Number(value.slice(1)) as 1 | 2 | 3 })
    )
  const setFontFamily = (family: string) => exec((chain) => chain.setFontFamily(family))
  // No focus here: the size field keeps focus while the user tabs on; Enter hands the caret back itself.
  const setFontSize = (pt: number) => {
    if (editor && !editor.isDestroyed) editor.chain().setFontSize(ptToCss(pt)).run()
  }
  const setColor = (color: string | null) =>
    exec((chain) => (color ? chain.setColor(color) : chain.unsetColor()))
  const setHighlight = (color: string | null) =>
    exec((chain) => (color ? chain.setBackgroundColor(color) : chain.unsetBackgroundColor()))
  const setAlign = (value: string) => exec((chain) => chain.setTextAlign(value as TextAlignValue))
  const setLineHeight = (value: string) =>
    exec((chain) => chain.setLineSpacing(value === LINE_HEIGHT_DEFAULT ? null : value))

  /** The link form's address: an empty one removes the link; false when it is refused (the form shows why). */
  const applyLink = (raw: string): boolean => {
    if (!editor || editor.isDestroyed) return true
    if (!raw.trim()) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return true
    }
    return linkSelection(editor, raw)
  }

  const history: ToolbarAction[] = [
    {
      label: 'Hoàn tác',
      icon: Undo2,
      shortcut: 'Ctrl+Z',
      disabled: !state.canUndo,
      run: () => exec((c) => c.undo()),
    },
    {
      label: 'Làm lại',
      icon: Redo2,
      shortcut: 'Ctrl+Y',
      disabled: !state.canRedo,
      run: () => exec((c) => c.redo()),
    },
    {
      label: 'In',
      icon: Printer,
      shortcut: 'Ctrl+P',
      disabled: !state.ready,
      run: () => window.print(),
    },
  ]
  const marks: ToolbarAction[] = [
    {
      label: 'Đậm',
      icon: Bold,
      shortcut: 'Ctrl+B',
      pressed: state.bold,
      disabled: off,
      run: () => exec((c) => c.toggleBold()),
    },
    {
      label: 'Nghiêng',
      icon: Italic,
      shortcut: 'Ctrl+I',
      pressed: state.italic,
      disabled: off,
      run: () => exec((c) => c.toggleItalic()),
    },
    {
      label: 'Gạch chân',
      icon: Underline,
      shortcut: 'Ctrl+U',
      pressed: state.underline,
      disabled: off,
      run: () => exec((c) => c.toggleUnderline()),
    },
  ]
  const formulas: ToolbarAction[] = [
    {
      label: 'Chèn công thức toán',
      icon: Sigma,
      disabled: off,
      after: null,
      run: () => openFormula('math'),
    },
    {
      label: 'Chèn công thức hoá học',
      icon: FlaskConical,
      disabled: off,
      after: null,
      run: () => openFormula('chem'),
    },
  ]
  const lists: ToolbarAction[] = [
    {
      label: 'Danh sách dấu đầu dòng',
      icon: List,
      shortcut: 'Ctrl+Shift+8',
      pressed: state.bulletList,
      disabled: off,
      run: () => exec((c) => c.toggleBulletList()),
    },
    {
      label: 'Danh sách đánh số',
      icon: ListOrdered,
      shortcut: 'Ctrl+Shift+7',
      pressed: state.orderedList,
      disabled: off,
      run: () => exec((c) => c.toggleOrderedList()),
    },
    {
      label: 'Giảm thụt lề',
      icon: ListIndentDecrease,
      shortcut: 'Shift+Tab',
      disabled: off || !state.canOutdent,
      run: () => exec((c) => c.outdent()),
    },
    {
      label: 'Tăng thụt lề',
      icon: ListIndentIncrease,
      shortcut: 'Tab',
      disabled: off || !state.canIndent,
      run: () => exec((c) => c.indent()),
    },
  ]
  const inserts: ToolbarAction[] = [
    { label: 'Chèn liên kết', icon: LinkIcon, disabled: off, after: 'link', run: () => undefined },
    {
      label: 'Chèn bảng',
      icon: Table,
      disabled: off,
      run: () => exec((c) => c.insertTable({ rows: 3, cols: 3, withHeaderRow: false })),
    },
    {
      label: 'Chèn hình',
      icon: ImageIcon,
      disabled: off,
      after: null,
      run: () => imageInput.current?.click(),
    },
    {
      label: 'Ngắt trang',
      icon: SeparatorHorizontal,
      shortcut: 'Ctrl+Enter',
      disabled: off,
      run: () => exec((c) => c.setPageBreak()),
    },
  ]
  const textMarks: ToolbarAction[] = [
    {
      label: 'Gạch ngang',
      icon: Strikethrough,
      shortcut: 'Ctrl+Shift+S',
      pressed: state.strike,
      disabled: off,
      run: () => exec((c) => c.toggleStrike()),
    },
    {
      label: 'Chỉ số trên',
      icon: Superscript,
      shortcut: 'Ctrl+.',
      pressed: state.superscript,
      disabled: off,
      run: () => exec((c) => c.toggleSuperscript()),
    },
    {
      label: 'Chỉ số dưới',
      icon: Subscript,
      shortcut: 'Ctrl+,',
      pressed: state.subscript,
      disabled: off,
      run: () => exec((c) => c.toggleSubscript()),
    },
    {
      label: 'Chữ đóng khung',
      icon: Square,
      pressed: state.boxed,
      disabled: off,
      run: () => exec((c) => c.toggleBoxed()),
    },
  ]
  const clearFormatting: ToolbarAction = {
    label: 'Xoá định dạng',
    icon: RemoveFormatting,
    disabled: off,
    run: () => exec((c) => c.unsetAllMarks().clearNodes()),
  }

  const align = ALIGN_OPTIONS.find((option) => option.value === state.textAlign) ?? ALIGN_OPTIONS[3]
  const AlignIcon = align.icon
  const blockLabel = BLOCK_OPTIONS.find((option) => option.value === state.block)?.label
  const lineHeightValue = state.lineHeight ?? LINE_HEIGHT_DEFAULT
  const lineHeightLabel =
    LINE_HEIGHT_OPTIONS.find((option) => option.value === lineHeightValue)?.label ??
    state.lineHeight ??
    undefined
  const sizeLabel = formatDecimal(state.fontSizePt)

  // Each group as it sits in the row...
  const rowGroups: ReactNode[] = [
    <>
      <ActionButtons actions={history} />
      <ToolbarSelect
        label="Thu phóng"
        value={String(zoom)}
        options={ZOOM_OPTIONS}
        fallbackLabel={`${Math.round(zoom * 100)}%`}
        onChange={(value) => setZoom(Number(value))}
        onDone={focusEditor}
        disabled={!state.ready}
        className="ml-0.5 w-[72px]"
      />
    </>,
    <>
      <ToolbarSelect
        label="Kiểu đoạn"
        value={state.block}
        options={BLOCK_OPTIONS}
        onChange={setBlock}
        onDone={focusEditor}
        disabled={off}
        className="w-[132px]"
      />
      <ToolbarSeparator />
      <ToolbarSelect
        label="Phông chữ"
        value={state.fontFamily}
        options={FONT_OPTIONS}
        fallbackLabel={state.fontFamily}
        onChange={setFontFamily}
        onDone={focusEditor}
        disabled={off}
        className="w-[132px]"
      />
    </>,
    <FontSizeControl
      value={state.fontSizePt}
      disabled={off}
      onChange={setFontSize}
      onDone={focusEditor}
    />,
    <ActionButtons actions={marks} />,
    <ActionButtons actions={formulas} />,
    <>
      <ColorPopover
        kind="text"
        value={state.color}
        disabled={off}
        onPick={setColor}
        onDone={focusEditor}
      />
      <ColorPopover
        kind="highlight"
        value={state.highlight}
        disabled={off}
        onPick={setHighlight}
        onDone={focusEditor}
      />
    </>,
    <>
      <ToolbarSelect
        label="Căn lề"
        value={state.textAlign}
        options={ALIGN_OPTIONS}
        onChange={setAlign}
        onDone={focusEditor}
        disabled={off}
        display={<AlignIcon size={18} strokeWidth={1.75} aria-hidden />}
      />
      <ToolbarSelect
        label="Giãn dòng"
        value={lineHeightValue}
        options={LINE_HEIGHT_OPTIONS}
        fallbackLabel={lineHeightLabel}
        onChange={setLineHeight}
        onDone={focusEditor}
        disabled={off}
        display={<ListChevronsUpDown size={18} strokeWidth={1.75} aria-hidden />}
        contentClassName="min-w-[160px]"
      />
    </>,
    <ActionButtons actions={lists} />,
  ]

  // ...and the same group inside "Thêm công cụ" once it no longer fits (the first group always fits).
  const menuGroups: ReactNode[] = [
    null,
    <>
      <MenuSub icon={Pilcrow} label="Kiểu đoạn" hint={blockLabel} disabled={off}>
        <MenuRadioList value={state.block} options={BLOCK_OPTIONS} onChange={fromMenu(setBlock)} />
      </MenuSub>
      <MenuSub icon={Type} label="Phông chữ" hint={state.fontFamily} disabled={off}>
        <MenuRadioList
          value={state.fontFamily}
          options={FONT_OPTIONS}
          onChange={fromMenu(setFontFamily)}
        />
      </MenuSub>
    </>,
    <MenuSub
      icon={ALargeSmall}
      label="Cỡ chữ"
      hint={sizeLabel}
      disabled={off}
      contentClassName="min-w-[160px]"
    >
      <MenuItem
        icon={Minus}
        disabled={state.fontSizePt <= MIN_FONT_SIZE_PT}
        onSelect={() => fromMenu(setFontSize)(clampFontSize(state.fontSizePt - 1))}
      >
        Giảm cỡ chữ
      </MenuItem>
      <MenuItem
        icon={Plus}
        disabled={state.fontSizePt >= MAX_FONT_SIZE_PT}
        onSelect={() => fromMenu(setFontSize)(clampFontSize(state.fontSizePt + 1))}
      >
        Tăng cỡ chữ
      </MenuItem>
      <MenuSeparator />
      <MenuRadioList
        value={sizeLabel}
        options={FONT_SIZE_OPTIONS}
        onChange={fromMenu((value: string) =>
          setFontSize(parseFontSize(value) ?? state.fontSizePt)
        )}
      />
    </MenuSub>,
    <ActionItems actions={marks} onRun={runFromMenu} />,
    <ActionItems actions={formulas} onRun={runFromMenu} />,
    <>
      <ColorMenuSub kind="text" value={state.color} onPick={fromMenu(setColor)} />
      <ColorMenuSub kind="highlight" value={state.highlight} onPick={fromMenu(setHighlight)} />
    </>,
    <>
      <MenuSub icon={AlignIcon} label="Căn lề" hint={align.label} disabled={off}>
        <MenuRadioList
          value={state.textAlign}
          options={ALIGN_OPTIONS}
          onChange={fromMenu(setAlign)}
        />
      </MenuSub>
      <MenuSub icon={ListChevronsUpDown} label="Giãn dòng" hint={lineHeightLabel} disabled={off}>
        <MenuRadioList
          value={lineHeightValue}
          options={LINE_HEIGHT_OPTIONS}
          onChange={fromMenu(setLineHeight)}
        />
      </MenuSub>
    </>,
    <ActionItems actions={lists} onRun={runFromMenu} />,
  ]

  return (
    <div
      role="toolbar"
      aria-label="Công cụ soạn thảo"
      className="flex h-12 w-full min-w-0 items-center overflow-hidden rounded-full bg-background-gray-secondary px-3"
    >
      <div ref={rowRef} className="flex w-full min-w-0 items-center">
        {rowGroups.map((group, index) => (
          <div
            key={index}
            ref={registerGroup}
            data-group={index}
            className={cn('flex shrink-0 items-center gap-0.5', index >= visibleCount && 'hidden')}
          >
            {index > 0 && <ToolbarSeparator />}
            {group}
          </div>
        ))}

        <LinkPopover
          open={linkOpen}
          onOpenChange={setLinkOpen}
          href={state.linkHref}
          onApply={applyLink}
          onDone={focusEditor}
        >
          <div ref={moreRef} className="flex shrink-0 items-center pl-1">
            <Menu.Root modal={false}>
              <Menu.Trigger asChild disabled={!state.ready}>
                <button
                  type="button"
                  aria-label="Thêm công cụ"
                  title="Thêm công cụ"
                  className={cn(controlClass, 'w-8 justify-center')}
                >
                  <EllipsisVertical size={18} strokeWidth={1.75} aria-hidden />
                </button>
              </Menu.Trigger>
              <MenuContent
                align="end"
                className="w-[300px] max-w-[calc(100vw-16px)]"
                onCloseAutoFocus={(event) => {
                  const next = afterMenu.current
                  afterMenu.current = null
                  if (!next) return
                  event.preventDefault()
                  if (next === 'link') setLinkOpen(true)
                  else focusEditor()
                }}
              >
                {menuGroups.slice(visibleCount).map((group, index) => (
                  <Fragment key={visibleCount + index}>
                    {group}
                    <MenuSeparator />
                  </Fragment>
                ))}
                <ActionItems actions={inserts} onRun={runFromMenu} />
                <MenuSeparator />
                <ActionItems actions={textMarks} onRun={runFromMenu} />
                <MenuSeparator />
                <ActionItems actions={[clearFormatting]} onRun={runFromMenu} />
              </MenuContent>
            </Menu.Root>
          </div>
        </LinkPopover>
      </div>

      <input
        ref={imageInput}
        type="file"
        accept="image/*"
        hidden
        tabIndex={-1}
        onChange={(event) => void insertPickedImage(editor, event.currentTarget)}
      />
    </div>
  )
}
