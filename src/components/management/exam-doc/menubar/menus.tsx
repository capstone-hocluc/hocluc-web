import type { Editor } from '@tiptap/react'
import {
  Atom,
  BoxArchive1,
  Code1,
  Download1,
  FileFormatPdf,
  FileText,
  FileTextMultiple,
  Folder1,
  Gallery,
  Link1AngularRight,
  Page,
  Printer,
  SearchPlus,
  Table2,
} from '@tailgrids/icons'
import { BarChart3, Calculator, NotebookPen } from '../../../console/icons'
import { LINE_HEIGHTS, ZOOM_LEVELS, useExamDoc, type DocMode } from '../exam-doc-context'
import { downloadDocument, downloadVariants, openDocumentFile, type DownloadFormat } from '../export'
import { insertChartAndEdit } from '../nodes/chart'
import {
  MenuCheckboxItem,
  MenuItem,
  MenuLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuSub,
} from './menu-ui'

/**
 * Runs an action from a menu item that moves focus on (into the editor, a dialog or the file
 * picker), so the closing menu does not pull focus back to its trigger.
 */
export type RunCommand = (command: (editor: Editor) => unknown) => void

const TEXT_ALIGNS = [
  { value: 'left', label: 'Căn trái' },
  { value: 'center', label: 'Căn giữa' },
  { value: 'right', label: 'Căn phải' },
  { value: 'justify', label: 'Căn đều hai bên' },
] as const

const DEFAULT_LINE_HEIGHT = 'default'

/** Why a control that only works on the free document is off in the structured mode. */
const FREE_MODE_ONLY = 'Chỉ có ở chế độ Văn bản tự do'

function canEdit(editor: Editor | null): editor is Editor {
  return Boolean(editor && !editor.isDestroyed && editor.isEditable)
}

function percent(zoom: number) {
  return `${Math.round(zoom * 100)}%`
}

function lineHeightLabel(value: string) {
  return Number(value).toLocaleString('vi-VN')
}

/** Line spacing belongs to the paragraphs the selection touches (null: back to the sheet default). */
function setBlockLineHeight(editor: Editor, value: string | null) {
  editor.chain().focus().setLineSpacing(value).run()
}

export function FileMenu({ onNew }: { onNew: () => void }) {
  const { editor, sourceEditor, activeVariant, variantDocs, mode, setMode } = useExamDoc()
  // Files are written from and read into the free document, so in the structured mode only printing is left.
  const structured = mode === 'STRUCTURED'
  const freeOnly = structured ? FREE_MODE_ONLY : undefined
  // Downloads take what the sheet shows (the original or the code being viewed); a file opens into the original.
  const download = (format: DownloadFormat) => {
    if (editor) void downloadDocument(editor, format, activeVariant)
  }
  return (
    <>
      <MenuItem label="Đề mới" icon={NotebookPen} onSelect={onNew} />
      <MenuItem
        label="Mở file (Word, Markdown, JSON)…"
        icon={Folder1}
        disabled={structured || activeVariant !== null || !canEdit(sourceEditor)}
        title={freeOnly}
        onSelect={() => {
          if (sourceEditor) openDocumentFile(sourceEditor)
        }}
      />
      <MenuSeparator />
      <MenuSub label="Tải xuống" icon={Download1} disabled={!editor}>
        <MenuItem
          label="Word (.docx)"
          icon={FileText}
          disabled={structured}
          title={freeOnly}
          onSelect={() => download('docx')}
        />
        <MenuItem
          label="PDF (in ra PDF)"
          icon={FileFormatPdf}
          onSelect={() => window.setTimeout(() => window.print(), 0)}
        />
        <MenuItem
          label="Markdown (.md)"
          icon={FileTextMultiple}
          disabled={structured}
          title={freeOnly}
          onSelect={() => download('md')}
        />
        <MenuItem
          label="JSON (.json)"
          icon={Code1}
          disabled={structured}
          title={freeOnly}
          onSelect={() => download('json')}
        />
        {variantDocs.length > 0 && (
          <>
            <MenuSeparator />
            <MenuItem
              label="Tất cả mã đề (.docx)"
              icon={BoxArchive1}
              disabled={structured}
              title={freeOnly}
              onSelect={() => void downloadVariants(variantDocs)}
            />
          </>
        )}
      </MenuSub>
      <MenuSeparator />
      <MenuLabel>Chế độ đề</MenuLabel>
      {/* On whenever there is an editor, also while it is read-only in the structured mode, so the mode can switch back. */}
      <MenuRadioGroup value={mode} onValueChange={(value) => setMode(value as DocMode)}>
        <MenuRadioItem label="Giữ cấu trúc câu hỏi" value="STRUCTURED" disabled={!editor} />
        <MenuRadioItem label="Văn bản tự do" value="FREE" disabled={!editor} />
      </MenuRadioGroup>
      <MenuSeparator />
      <MenuItem
        label="In"
        icon={Printer}
        shortcut="Ctrl+P"
        keys="Control+P"
        disabled={!editor}
        // Printing once the menu has closed keeps the menu out of the printout.
        onSelect={() => window.setTimeout(() => window.print(), 0)}
      />
    </>
  )
}

export function EditMenu({ run }: { run: RunCommand }) {
  const { editor } = useExamDoc()
  const editable = canEdit(editor)
  return (
    <>
      <MenuItem
        label="Hoàn tác"
        shortcut="Ctrl+Z"
        keys="Control+Z"
        disabled={!editable || !editor.can().undo()}
        onSelect={() => run((target) => target.chain().focus().undo().run())}
      />
      <MenuItem
        label="Làm lại"
        shortcut="Ctrl+Y"
        keys="Control+Y"
        disabled={!editable || !editor.can().redo()}
        onSelect={() => run((target) => target.chain().focus().redo().run())}
      />
      <MenuSeparator />
      <MenuItem
        label="Chọn tất cả"
        shortcut="Ctrl+A"
        keys="Control+A"
        disabled={!editor}
        onSelect={() => run((target) => target.chain().focus().selectAll().run())}
      />
    </>
  )
}

interface ViewMenuProps {
  outlineOpen: boolean
  onToggleOutline: () => void
  chatOpen: boolean
  onToggleChat: () => void
}

export function ViewMenu({ outlineOpen, onToggleOutline, chatOpen, onToggleChat }: ViewMenuProps) {
  const { zoom, setZoom, showRuler, setShowRuler } = useExamDoc()
  return (
    <>
      <MenuSub label="Thu phóng" icon={SearchPlus} value={percent(zoom)}>
        <MenuRadioGroup value={String(zoom)} onValueChange={(value) => setZoom(Number(value))}>
          {ZOOM_LEVELS.map((level) => (
            <MenuRadioItem key={level} label={percent(level)} value={String(level)} />
          ))}
        </MenuRadioGroup>
      </MenuSub>
      <MenuSeparator />
      <MenuCheckboxItem
        label="Hiện thước kẻ"
        checked={showRuler}
        onCheckedChange={(checked) => setShowRuler(checked === true)}
      />
      <MenuCheckboxItem
        label="Hiện dàn ý và mẫu chèn"
        checked={outlineOpen}
        onCheckedChange={onToggleOutline}
      />
      <MenuCheckboxItem label="Trợ lý AI" checked={chatOpen} onCheckedChange={onToggleChat} />
    </>
  )
}

interface InsertMenuProps {
  run: RunCommand
  /** Opens the image file picker. */
  onPickImage: () => void
  onOpenLink: () => void
}

export function InsertMenu({ run, onPickImage, onOpenLink }: InsertMenuProps) {
  const { editor, openFormula } = useExamDoc()
  const editable = canEdit(editor)
  return (
    <>
      <MenuItem
        label="Công thức toán"
        icon={Calculator}
        disabled={!editable}
        onSelect={() => run(() => openFormula('math'))}
      />
      <MenuItem
        label="Công thức hoá học"
        icon={Atom}
        disabled={!editable}
        onSelect={() => run(() => openFormula('chem'))}
      />
      <MenuSeparator />
      <MenuItem
        label="Bảng"
        icon={Table2}
        disabled={!editable}
        onSelect={() =>
          run((target) =>
            target.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: false }).run()
          )
        }
      />
      <MenuItem label="Hình" icon={Gallery} disabled={!editable} onSelect={onPickImage} />
      <MenuItem
        label="Biểu đồ"
        icon={BarChart3}
        disabled={!editable}
        onSelect={() => run((target) => insertChartAndEdit(target))}
      />
      <MenuSeparator />
      <MenuItem
        label="Liên kết"
        icon={Link1AngularRight}
        disabled={!editable}
        onSelect={onOpenLink}
      />
      <MenuItem
        label="Ngắt trang"
        icon={Page}
        shortcut="Ctrl+Enter"
        keys="Control+Enter"
        disabled={!editable}
        onSelect={() => run((target) => target.chain().focus().setPageBreak().run())}
      />
    </>
  )
}

export function FormatMenu({ run }: { run: RunCommand }) {
  const { editor } = useExamDoc()
  const editable = canEdit(editor)
  // The menu mounts when it opens, so reading the selection here is current enough.
  const align = editable
    ? (TEXT_ALIGNS.find((item) => editor.isActive({ textAlign: item.value }))?.value ?? 'justify')
    : 'justify'
  const lineHeight = editable
    ? ((editor.state.selection.$from.parent.attrs.lineSpacing as string | null | undefined) ??
      DEFAULT_LINE_HEIGHT)
    : DEFAULT_LINE_HEIGHT

  return (
    <>
      <MenuItem
        label="Đậm"
        shortcut="Ctrl+B"
        keys="Control+B"
        disabled={!editable}
        onSelect={() => run((target) => target.chain().focus().toggleBold().run())}
      />
      <MenuItem
        label="Nghiêng"
        shortcut="Ctrl+I"
        keys="Control+I"
        disabled={!editable}
        onSelect={() => run((target) => target.chain().focus().toggleItalic().run())}
      />
      <MenuItem
        label="Gạch chân"
        shortcut="Ctrl+U"
        keys="Control+U"
        disabled={!editable}
        onSelect={() => run((target) => target.chain().focus().toggleUnderline().run())}
      />
      <MenuItem
        label="Gạch ngang"
        shortcut="Ctrl+Shift+S"
        keys="Control+Shift+S"
        disabled={!editable}
        onSelect={() => run((target) => target.chain().focus().toggleStrike().run())}
      />
      <MenuItem
        label="Chỉ số trên"
        shortcut="Ctrl+."
        keys="Control+."
        disabled={!editable}
        onSelect={() => run((target) => target.chain().focus().toggleSuperscript().run())}
      />
      <MenuItem
        label="Chỉ số dưới"
        shortcut="Ctrl+,"
        keys="Control+,"
        disabled={!editable}
        onSelect={() => run((target) => target.chain().focus().toggleSubscript().run())}
      />
      <MenuItem
        label="Chữ đóng khung"
        disabled={!editable}
        onSelect={() => run((target) => target.chain().focus().toggleBoxed().run())}
      />
      <MenuSeparator />
      <MenuSub label="Căn lề" disabled={!editable}>
        <MenuRadioGroup
          value={align}
          onValueChange={(value) =>
            run((target) => target.chain().focus().setTextAlign(value).run())
          }
        >
          {TEXT_ALIGNS.map((item) => (
            <MenuRadioItem key={item.value} label={item.label} value={item.value} />
          ))}
        </MenuRadioGroup>
      </MenuSub>
      <MenuSub label="Giãn dòng" disabled={!editable}>
        <MenuRadioGroup
          value={lineHeight}
          onValueChange={(value) =>
            run((target) =>
              setBlockLineHeight(target, value === DEFAULT_LINE_HEIGHT ? null : value)
            )
          }
        >
          <MenuRadioItem label="Mặc định" value={DEFAULT_LINE_HEIGHT} />
          {LINE_HEIGHTS.map((value) => (
            <MenuRadioItem key={value} label={lineHeightLabel(value)} value={value} />
          ))}
        </MenuRadioGroup>
      </MenuSub>
      <MenuSeparator />
      <MenuItem
        label="Xoá định dạng"
        disabled={!editable}
        onSelect={() => run((target) => target.chain().focus().unsetAllMarks().clearNodes().run())}
      />
    </>
  )
}

export function ToolsMenu({ onOpenWordCount }: { onOpenWordCount: () => void }) {
  const { editor } = useExamDoc()
  return <MenuItem label="Đếm từ" disabled={!editor} onSelect={onOpenWordCount} />
}
