import { useEditorState, type Editor } from '@tiptap/react'
import {
  ALIGN_OPTIONS,
  DEFAULT_FONT_FAMILY,
  cssToPt,
  normalizeColor,
  normalizeFontFamily,
  type BlockStyle,
  type TextAlignValue,
} from './toolbar-options'
import { DEFAULT_FONT_SIZE_PT } from '../exam-doc-context'

/** What the toolbar shows for the current selection. Primitives only, so the default deep compare stays cheap. */
export interface ToolbarState {
  /** An editor exists (print and zoom work even before it is editable). */
  ready: boolean
  /** The document can be edited; every formatting control depends on it. */
  editable: boolean
  canUndo: boolean
  canRedo: boolean
  block: BlockStyle
  fontFamily: string
  fontSizePt: number
  bold: boolean
  italic: boolean
  underline: boolean
  strike: boolean
  superscript: boolean
  subscript: boolean
  boxed: boolean
  link: boolean
  linkHref: string
  color: string | null
  highlight: string | null
  textAlign: TextAlignValue
  lineHeight: string | null
  bulletList: boolean
  orderedList: boolean
  canIndent: boolean
  canOutdent: boolean
}

const IDLE: ToolbarState = {
  ready: false,
  editable: false,
  canUndo: false,
  canRedo: false,
  block: 'paragraph',
  fontFamily: DEFAULT_FONT_FAMILY,
  fontSizePt: DEFAULT_FONT_SIZE_PT,
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  superscript: false,
  subscript: false,
  boxed: false,
  link: false,
  linkHref: '',
  color: null,
  highlight: null,
  textAlign: 'justify',
  lineHeight: null,
  bulletList: false,
  orderedList: false,
  canIndent: false,
  canOutdent: false,
}

function readBlock(editor: Editor): BlockStyle {
  if (editor.isActive('heading', { level: 1 })) return 'h1'
  if (editor.isActive('heading', { level: 2 })) return 'h2'
  if (editor.isActive('heading', { level: 3 })) return 'h3'
  if (editor.isActive('heading', { level: 4 })) return 'h4'
  if (editor.isActive('paragraph', { paragraphStyle: 'title' })) return 'title'
  if (editor.isActive('paragraph', { paragraphStyle: 'subtitle' })) return 'subtitle'
  return 'paragraph'
}

/**
 * Size the caret's text is drawn at when no size mark is set (headings have their own size in the sheet CSS).
 * Measured against the editor root, which is set in the default size, so the sheet's zoom cancels out.
 */
function renderedSizePt(editor: Editor): number {
  try {
    const { node } = editor.view.domAtPos(editor.state.selection.from)
    const element = node instanceof Element ? node : node.parentElement
    const root = editor.view.dom
    if (!element || !root.contains(element)) return DEFAULT_FONT_SIZE_PT
    const size = Number.parseFloat(getComputedStyle(element).fontSize)
    const base = Number.parseFloat(getComputedStyle(root).fontSize)
    if (!size || !base) return DEFAULT_FONT_SIZE_PT
    return Math.round(DEFAULT_FONT_SIZE_PT * (size / base) * 10) / 10
  } catch {
    // The view is not mounted yet.
    return DEFAULT_FONT_SIZE_PT
  }
}

function readState(editor: Editor | null): ToolbarState {
  if (!editor || editor.isDestroyed) return IDLE
  if (!editor.isEditable) return { ...IDLE, ready: true }
  const textStyle = editor.getAttributes('textStyle')
  return {
    ready: true,
    editable: true,
    canUndo: editor.can().undo(),
    canRedo: editor.can().redo(),
    block: readBlock(editor),
    fontFamily: normalizeFontFamily(textStyle.fontFamily) ?? DEFAULT_FONT_FAMILY,
    fontSizePt: textStyle.fontSize ? cssToPt(textStyle.fontSize) : renderedSizePt(editor),
    bold: editor.isActive('bold'),
    italic: editor.isActive('italic'),
    underline: editor.isActive('underline'),
    strike: editor.isActive('strike'),
    superscript: editor.isActive('superscript'),
    subscript: editor.isActive('subscript'),
    boxed: editor.isActive('boxed'),
    link: editor.isActive('link'),
    linkHref: String(editor.getAttributes('link').href ?? ''),
    color: normalizeColor(textStyle.color),
    highlight: normalizeColor(textStyle.backgroundColor),
    textAlign:
      ALIGN_OPTIONS.find((option) => editor.isActive({ textAlign: option.value }))?.value ??
      'justify',
    lineHeight: (editor.state.selection.$from.parent.attrs.lineSpacing as string | null) ?? null,
    bulletList: editor.isActive('bulletList'),
    orderedList: editor.isActive('orderedList'),
    // In a list: whether the item can move a level; elsewhere: whether a selected paragraph can move a step.
    canIndent: editor.can().indent(),
    canOutdent: editor.can().outdent(),
  }
}

/** Re-renders the toolbar when the selection's formatting changes, not on every keystroke. */
export function useToolbarState(editor: Editor | null): ToolbarState {
  // Reads the `editor` argument, not the snapshot's: when the editor first mounts, useEditorState keeps
  // handing out the old snapshot (editor: null) until the first transaction, which left the row disabled.
  return useEditorState({ editor, selector: () => readState(editor) }) ?? IDLE
}
