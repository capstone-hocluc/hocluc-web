import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { dropPoint } from '@tiptap/pm/transform'
import { contentSlice, SNIPPET_MIME, snippetContent } from '../templates/insert-snippet'
import { findSnippet } from '../templates/snippets'
import { blockInsertRange } from './insert-position'

/** Inserts a snippet dragged from the "Mẫu đề thi" library where it is dropped on the sheet. */
export const SnippetDrop = Extension.create({
  name: 'snippetDrop',

  addProseMirrorPlugins() {
    const editor = this.editor
    return [
      new Plugin({
        key: new PluginKey('snippetDrop'),
        props: {
          handleDrop(view, event) {
            const transfer = event.dataTransfer
            // Anything else (moving text, files, pasted HTML) keeps the default handling.
            if (!transfer || !Array.from(transfer.types).includes(SNIPPET_MIME)) return false
            const snippet = findSnippet(transfer.getData(SNIPPET_MIME))
            const target = view.posAtCoords({ left: event.clientX, top: event.clientY })
            if (!snippet || !target) return true

            const { doc, schema } = view.state
            const content = snippetContent(snippet, doc)
            const slice = contentSlice(schema, content)
            if (!slice) return true
            // The block boundary nearest the drop (the one the drop cursor shows), never inside a line.
            const point = dropPoint(doc, target.pos, slice) ?? target.pos
            editor.chain().insertContentAt(blockInsertRange(doc.resolve(point)), content).focus().run()
            return true
          },
        },
      }),
    ]
  },
})
