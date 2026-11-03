import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Editor, JSONContent } from '@tiptap/react'
import { buildVariants, type VariantDoc } from './build-variants'
import { parseExam, type ParsedExam } from './parse-exam'
import {
  loadVariants,
  newSalt,
  normalizeSettings,
  saveVariants,
  type StoredVariants,
  type VariantSettings,
} from './variant-settings'

/** The original is read again this long after the last change. */
const READ_DELAY_MS = 300

export interface ExamVariants {
  /** The original as exam structure; null until it was first read. */
  parsed: ParsedExam | null
  /** The settings in the form. */
  settings: VariantSettings
  setSettings: (patch: Partial<VariantSettings>) => void
  /** The settings the codes are made with; null until they are created. */
  applied: VariantSettings | null
  /** Makes the codes with the form's settings (drawing the set's salt the first time). */
  create: () => void
  /** Draws a new salt: every code gets new orders. */
  reshuffle: () => void
  /** Removes the codes (the settings and the salt stay, so making them again gives the same codes). */
  clear: () => void
  /** The variants of the current original: rebuilt whenever it changes, so they are never stale. */
  variantDocs: VariantDoc[]
  activeVariant: string | null
  setActiveVariant: (code: string | null) => void
  /** The variant shown instead of the original, if any. */
  activeDoc: VariantDoc | null
}

/**
 * The exam variants of the open conversation. Settings are kept per conversation in localStorage; the original is
 * read from `editor` (debounced) while the panel is open or codes exist.
 */
export function useExamVariants(editor: Editor | null, conversationId: string | null, watching: boolean): ExamVariants {
  const loaded = useMemo(() => loadVariants(conversationId), [conversationId])
  const [stored, setStored] = useState<{ conversationId: string | null; value: StoredVariants } | null>(null)
  const value = stored?.conversationId === conversationId ? stored.value : loaded
  const [active, setActive] = useState<{ conversationId: string | null; code: string | null } | null>(null)
  const activeVariant = active?.conversationId === conversationId ? active.code : null

  const update = useCallback(
    (next: StoredVariants) => {
      setStored({ conversationId, value: next })
      saveVariants(conversationId, next)
    },
    [conversationId]
  )
  const setSettings = useCallback(
    (patch: Partial<VariantSettings>) => update({ ...value, settings: normalizeSettings({ ...value.settings, ...patch }) }),
    [update, value]
  )
  const create = useCallback(() => {
    // The salt is drawn once per set: changing the count or the flags later keeps the codes that stay as they were.
    const settings = value.settings.salt ? value.settings : { ...value.settings, salt: newSalt() }
    update({ settings, applied: settings })
  }, [update, value])
  const reshuffle = useCallback(() => {
    const salt = newSalt()
    update({ settings: { ...value.settings, salt }, applied: value.applied ? { ...value.applied, salt } : null })
  }, [update, value])
  const clear = useCallback(() => {
    update({ ...value, applied: null })
    setActive({ conversationId, code: null })
  }, [update, value, conversationId])
  const setActiveVariant = useCallback((code: string | null) => setActive({ conversationId, code }), [conversationId])

  const enabled = watching || value.applied !== null
  const [snapshot, setSnapshot] = useState<{ editor: Editor; doc: JSONContent } | null>(null)
  useEffect(() => {
    if (!editor || !enabled) return
    const read = () => {
      if (!editor.isDestroyed) setSnapshot({ editor, doc: editor.getJSON() })
    }
    let timer = window.setTimeout(read, 0)
    const onUpdate = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(read, READ_DELAY_MS)
    }
    editor.on('update', onUpdate)
    return () => {
      window.clearTimeout(timer)
      editor.off('update', onUpdate)
    }
  }, [editor, enabled])

  const doc = snapshot && snapshot.editor === editor ? snapshot.doc : null
  const parsed = useMemo(() => (doc ? parseExam(doc) : null), [doc])
  const variantDocs = useMemo(
    () => (parsed && value.applied ? buildVariants(parsed, value.applied) : []),
    [parsed, value.applied]
  )
  const activeDoc = useMemo(() => variantDocs.find((variant) => variant.code === activeVariant) ?? null, [variantDocs, activeVariant])

  return {
    parsed,
    settings: value.settings,
    setSettings,
    applied: value.applied,
    create,
    reshuffle,
    clear,
    variantDocs,
    activeVariant: activeDoc ? activeVariant : null,
    setActiveVariant,
    activeDoc,
  }
}
