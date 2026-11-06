import { useCallback, useEffect, useState } from 'react'
import {
  getAiDraftBankLinks,
  saveAiDraftToBank,
  type AiBankItem,
  type AiBankLink,
} from '../../../services/aiAssistantService'
import { getBankScopes, type BankScopes } from '../../../services/questionBankService'

const NO_SCOPES: BankScopes = { administrator: false, authorSubjectIds: [], reviewerSubjectIds: [] }

/**
 * Where the open exam's questions stand with the question bank, and which of them the viewer may save there: those of
 * a subject they author, as the bank reads its scopes. The lookup runs again when `refreshKey` changes (the draft's
 * questions changed), so new questions are placed too. When not `enabled` (a viewer who may not write into the bank)
 * nothing is looked up and nothing is saveable.
 */
export function useDraftBank(conversationId: string | null, refreshKey: string, enabled: boolean) {
  const [scopes, setScopes] = useState<BankScopes | null>(null)
  const [links, setLinks] = useState<{ conversationId: string; byItem: Map<string, AiBankLink> } | null>(null)
  const [saving, setSaving] = useState<ReadonlySet<string>>(new Set())

  useEffect(() => {
    if (!enabled) return
    let active = true
    getBankScopes().then(
      (value) => {
        if (active) setScopes(value)
      },
      () => {
        if (active) setScopes(NO_SCOPES)
      }
    )
    return () => {
      active = false
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled || !conversationId) return
    let active = true
    getAiDraftBankLinks(conversationId).then(
      (items) => {
        if (active) setLinks({ conversationId, byItem: new Map(items.map((link) => [link.itemId, link])) })
      },
      () => {
        if (active) setLinks({ conversationId, byItem: new Map() })
      }
    )
    return () => {
      active = false
    }
  }, [enabled, conversationId, refreshKey])

  const byItem = enabled && conversationId && links?.conversationId === conversationId ? links.byItem : null
  const ready = Boolean(enabled && scopes && byItem)

  /** The question's subject is one the viewer authors in the bank (saved there or not). */
  const authorable = useCallback(
    (itemId: string) => {
      const subjectId = byItem?.get(itemId)?.subjectId
      if (!scopes || !subjectId) return false
      return scopes.administrator || scopes.authorSubjectIds.includes(subjectId)
    },
    [byItem, scopes]
  )

  const savedQuestionId = useCallback((itemId: string) => byItem?.get(itemId)?.questionId ?? null, [byItem])

  /** The viewer may save the question now: its subject is theirs and it is not in the bank yet. */
  const canSave = useCallback(
    (itemId: string) => authorable(itemId) && !savedQuestionId(itemId),
    [authorable, savedQuestionId]
  )

  const isSaving = useCallback((itemId: string) => saving.has(itemId), [saving])

  /** Saves the questions; each one comes back saved, saved before, or left out with why. */
  const save = useCallback(
    async (itemIds: string[]): Promise<AiBankItem[]> => {
      if (!enabled || !conversationId || itemIds.length === 0) return []
      setSaving((current) => new Set([...current, ...itemIds]))
      try {
        const results = await saveAiDraftToBank(conversationId, itemIds)
        setLinks((current) => {
          if (!current || current.conversationId !== conversationId) return current
          const next = new Map(current.byItem)
          for (const result of results) {
            const link = next.get(result.itemId)
            if (link && result.questionId) next.set(result.itemId, { ...link, questionId: result.questionId })
          }
          return { conversationId, byItem: next }
        })
        return results
      } finally {
        setSaving((current) => new Set([...current].filter((id) => !itemIds.includes(id))))
      }
    },
    [enabled, conversationId]
  )

  return { ready, authorable, savedQuestionId, canSave, isSaving, save }
}

export type DraftBank = ReturnType<typeof useDraftBank>
