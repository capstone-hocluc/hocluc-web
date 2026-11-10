import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { JSONContent } from '@tiptap/react'
import { ApiError } from '../../../lib/api'
import {
  getAiDocument,
  saveAiDocument,
  type AiDocument,
  type AiDocumentMode,
} from '../../../services/aiAssistantService'
import type { ExamPaper } from '../ai-assistant/exam-format'
import { draftToDoc, markTags } from './draft-to-doc'
import type { SaveState } from './exam-doc-context'

const SAVE_DELAY_MS = 800
const RETRY_FIRST_MS = 2_000
const RETRY_MAX_MS = 30_000
/** After its document is left, a saver retries a failed save only this many times. */
const RETRIES_AFTER_LEAVING = 3
/** Opening a document waits at most this long for the previous visit's last save. */
const SETTLE_WAIT_MS = 8_000
const VERSION_CONFLICT = 'AI_DOCUMENT_VERSION_CONFLICT'

/** A failed save worth trying again by itself: the network, a timeout, throttling or a server error. */
const retryable = (error: unknown) =>
  !(error instanceof ApiError) || error.status >= 500 || error.status === 408 || error.status === 429

const messageOf = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback

/** JSON with object keys sorted: the server stores JSONB, which does not keep key order. */
function canonical(value: unknown) {
  return JSON.stringify(value, (_key, item: unknown) =>
    item && typeof item === 'object' && !Array.isArray(item)
      ? Object.fromEntries(
          Object.entries(item as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        )
      : item
  )
}

/** The document title, for the conversation a new exam creates. */
function titleOf(content: JSONContent | null) {
  const heading = content?.content?.find((node) => node.type === 'heading')
  const text = (heading?.content ?? [])
    .map((node) => node.text ?? '')
    .join('')
    .trim()
  return text ? text.slice(0, 120) : 'Đề thi mới'
}

interface SaverReport {
  state: SaveState
  error?: string | null
  /** The newer document another tab saved (only with `conflict`). */
  conflict?: AiDocument
}

/**
 * Autosave for one visit of one conversation's document. Each save names the version it was made on.
 * - 409 with the version-conflict code: if the server already holds exactly what was sent (an answer lost on the
 *   way), its version is taken and saving goes on; otherwise saving stops and the newer document is reported.
 * - network/server errors are retried with a growing delay; a refused save (other 4xx) waits for the next edit.
 */
class DocSaver {
  private pending: { content: JSONContent; mode: AiDocumentMode } | null = null
  private timer: number | null = null
  private saving = false
  private retryDelay = RETRY_FIRST_MS
  private latest: { content: JSONContent; mode: AiDocumentMode }
  private left = false
  private retriesLeft = RETRIES_AFTER_LEAVING
  private waiters: Array<() => void> = []
  readonly conversationId: string
  private version: number
  private readonly report: (report: SaverReport) => void

  constructor(
    conversationId: string,
    version: number,
    content: JSONContent,
    mode: AiDocumentMode,
    report: (report: SaverReport) => void
  ) {
    this.conversationId = conversationId
    this.version = version
    this.latest = { content, mode }
    this.report = report
  }

  change(content: JSONContent, mode: AiDocumentMode) {
    this.latest = { content, mode }
    this.queue()
  }

  /** A mode switch is saved with the content as it is now. */
  changeMode(mode: AiDocumentMode) {
    this.latest = { ...this.latest, mode }
    this.queue()
  }

  /** The teacher keeps their version over a newer one: the next save names the server's version. */
  overwrite(version: number) {
    this.version = version
    this.queue()
  }

  /** The document is shown (again, after React's development re-mount): retries are unlimited. */
  attach() {
    this.left = false
    this.retriesLeft = RETRIES_AFTER_LEAVING
  }

  /** The document is left: what is waiting is saved now, then a few retries at most. */
  leave() {
    this.left = true
    if (this.timer !== null) window.clearTimeout(this.timer)
    this.timer = null
    void this.flush()
  }

  /** Resolves once nothing is waiting or on its way (or saving has stopped), at most after `limit` ms. */
  settled(limit: number): Promise<void> {
    if (this.isSettled()) return Promise.resolve()
    return new Promise((resolve) => {
      const timeout = window.setTimeout(resolve, limit)
      this.waiters.push(() => {
        window.clearTimeout(timeout)
        resolve()
      })
    })
  }

  private isSettled() {
    return this.version < 0 || (!this.pending && !this.saving && this.timer === null)
  }

  private notifySettled() {
    if (!this.isSettled()) return
    const waiters = this.waiters
    this.waiters = []
    for (const waiter of waiters) waiter()
  }

  private queue() {
    if (this.version < 0) return
    this.pending = this.latest
    this.retryDelay = RETRY_FIRST_MS
    this.report({ state: 'saving' })
    this.schedule(SAVE_DELAY_MS)
  }

  private schedule(delay: number) {
    if (this.timer !== null) window.clearTimeout(this.timer)
    this.timer = window.setTimeout(() => void this.flush(), delay)
  }

  private async flush() {
    this.timer = null
    const next = this.pending
    if (!next || this.saving || this.version < 0) return this.notifySettled()
    this.pending = null
    this.saving = true
    let retryIn: number | null = null
    try {
      const saved = await saveAiDocument(this.conversationId, {
        mode: next.mode,
        content: next.content as Record<string, unknown>,
        version: this.version,
      })
      this.version = saved.version
      this.retryDelay = RETRY_FIRST_MS
      if (!this.pending) this.report({ state: 'saved' })
    } catch (error) {
      const server =
        error instanceof ApiError && error.code === VERSION_CONFLICT ? (error.data as AiDocument | undefined) : undefined
      if (server && server.mode === next.mode && canonical(server.content) === canonical(next.content)) {
        // The save went through but its answer was lost; the retry met it. Carry on from the server's version.
        this.version = server.version
        if (!this.pending) this.report({ state: 'saved' })
      } else if (server) {
        this.version = -1
        this.pending = null
        this.report({ state: 'conflict', conflict: server })
      } else {
        this.pending ??= next
        this.report({ state: 'error', error: messageOf(error, 'Không lưu được tài liệu đề.') })
        if (retryable(error) && (!this.left || this.retriesLeft-- > 0)) {
          retryIn = this.retryDelay
          this.retryDelay = Math.min(RETRY_MAX_MS, this.retryDelay * 2)
        }
      }
    } finally {
      this.saving = false
    }
    // An edit made while saving is saved next; a failed save is tried again later or waits for the next edit.
    if (this.version >= 0 && this.pending && this.timer === null) {
      if (retryIn !== null) this.schedule(retryIn)
      else if (this.pending !== next) this.schedule(SAVE_DELAY_MS)
    }
    this.notifySettled()
  }
}

/** One saver per conversation across the page's lifetime, so reopening a document waits for its last save. */
const savers = new Map<string, DocSaver>()

/**
 * One opening of the editor: a conversation picked in the list, or a new exam. A new exam keeps its visit when its
 * conversation is created (first edit or first AI request): the same document simply gets an id to be saved under.
 */
interface Visit {
  n: number
  conversationId: string | null
  startedNew: boolean
}

interface Fetched {
  visit: number
  conversationId: string
  content: JSONContent
  mode: AiDocumentMode
  version: number
}

interface Options {
  /** The conversation this page just created for the open new exam; only it continues the new exam's visit. */
  createdId: string | null
  /** Creates the open exam's conversation. Resolves to null when it was not adopted (another exam was opened). */
  requestConversation: (title: string) => Promise<string | null>
}

/**
 * The editor document of the open exam, read from the server and autosaved. A conversation that has no document yet
 * starts from its AI draft as a free document. A new exam has no conversation: its first edit creates one and the
 * document is saved under it from then on, without being reloaded.
 */
export function useExamDocument(
  conversationId: string | null,
  paper: ExamPaper,
  draftLoading: boolean,
  { createdId, requestConversation }: Options
) {
  const [visit, setVisit] = useState<Visit>({ n: 0, conversationId, startedNew: conversationId === null })
  if (visit.conversationId !== conversationId) {
    const continuing = visit.startedNew && visit.conversationId === null && conversationId !== null && conversationId === createdId
    setVisit(
      continuing
        ? { ...visit, conversationId }
        : { n: visit.n + 1, conversationId, startedNew: conversationId === null }
    )
  }
  const visitKey = String(visit.n)

  const [fetched, setFetched] = useState<Fetched | null>(null)
  const [loadFailure, setLoadFailure] = useState<{ visit: number; message: string } | null>(null)
  const [reload, setReload] = useState(0)
  const [reports, setReports] = useState<Record<string, SaverReport>>({})
  const [modeChoice, setModeChoice] = useState<{ visit: number; mode: AiDocumentMode } | null>(null)
  const [edited, setEdited] = useState<number | null>(null)
  // The new exam's latest content (the editor owns it; this copy seeds the first save under the new conversation).
  const newExamLatest = useRef<JSONContent | null>(null)
  const requesting = useRef(false)
  // Failed attempts to create the new exam's conversation, so they are spaced out instead of made on every keystroke.
  const createAttempts = useRef<{ visit: string | null; failures: number; nextAt: number }>({
    visit: null,
    failures: 0,
    nextAt: 0,
  })
  const retryTimer = useRef<number | null>(null)
  const askAgain = useRef<((content: JSONContent | null) => void) | null>(null)

  // A new exam starts from the draft of its exam format (computed once per visit).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fresh = useMemo(() => (visit.startedNew && !draftLoading ? draftToDoc(paper) : null), [visit.n, visit.startedNew, draftLoading])

  useEffect(() => {
    if (!conversationId || draftLoading || visit.startedNew) return
    const id = conversationId
    const n = visit.n
    let live = true
    let retryTimer: number | null = null
    const load = async (attempt: number) => {
      // A save of the previous visit may still be on its way: read after it, or the reply would be older.
      await savers.get(id)?.settled(SETTLE_WAIT_MS)
      if (!live) return
      try {
        const document = await getAiDocument(id)
        if (!live) return
        setLoadFailure(null)
        setFetched({
          visit: n,
          conversationId: id,
          content: document.content ? markTags(document.content as JSONContent) : draftToDoc(paper),
          mode: document.content ? document.mode : 'FREE',
          version: document.version,
        })
      } catch (error) {
        if (!live) return
        // Nothing is shown editable until the document is read: an edit could not be saved without its version.
        setLoadFailure({ visit: n, message: messageOf(error, 'Không tải được tài liệu đề.') })
        retryTimer = window.setTimeout(
          () => void load(attempt + 1),
          Math.min(RETRY_MAX_MS, RETRY_FIRST_MS * 2 ** attempt)
        )
      }
    }
    void load(0)
    return () => {
      live = false
      if (retryTimer !== null) window.clearTimeout(retryTimer)
    }
    // The draft only seeds a conversation that has no document; later draft changes reach the editor as new questions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, draftLoading, visit.n, visit.startedNew, reload])

  const current = !visit.startedNew && fetched?.visit === visit.n ? fetched : null
  const loaded = useMemo(
    () =>
      visit.startedNew
        ? fresh && { conversationId: null, content: fresh }
        : current && { conversationId: current.conversationId, content: current.content },
    [visit.startedNew, fresh, current]
  )
  const failure = loadFailure?.visit === visit.n ? loadFailure.message : null
  const report = reports[visitKey]
  const conflict = report?.state === 'conflict' ? (report.conflict ?? null) : null
  const mode = modeChoice?.visit === visit.n ? modeChoice.mode : (current?.mode ?? 'FREE')

  // One saver per visit, registered for its conversation so a reopening waits for its last save. A new exam gets
  // one once its conversation exists: version 0, nothing on the server yet.
  const saver = useMemo(() => {
    const report = (next: SaverReport) => setReports((previous) => ({ ...previous, [visitKey]: next }))
    if (visit.startedNew) {
      return conversationId && fresh ? new DocSaver(conversationId, 0, fresh, 'FREE', report) : null
    }
    return current && current.version >= 0
      ? new DocSaver(current.conversationId, current.version, current.content, current.mode, report)
      : null
  }, [visit.startedNew, visitKey, conversationId, fresh, current])

  useEffect(() => {
    if (!saver) return
    saver.attach()
    savers.set(saver.conversationId, saver)
    // A new exam that just got its conversation: store what it holds right away (also when nothing was typed).
    if (visit.startedNew) saver.change(newExamLatest.current ?? fresh ?? { type: 'doc' }, mode)
    return () => {
      saver.leave()
      void saver.settled(SETTLE_WAIT_MS * 4).then(() => {
        if (savers.get(saver.conversationId) === saver) savers.delete(saver.conversationId)
      })
    }
    // Only a new saver starts this; mode changes reach it through setMode.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saver])

  const askForConversation = useCallback(
    (content: JSONContent | null) => {
      if (requesting.current) return
      const attempt = createAttempts.current
      if (attempt.visit === visitKey && Date.now() < attempt.nextAt) return
      requesting.current = true
      const key = visitKey
      setReports((previous) => ({ ...previous, [key]: { state: 'saving' } }))
      requestConversation(titleOf(content))
        .then(() => {
          createAttempts.current = { visit: null, failures: 0, nextAt: 0 }
        })
        .catch((error: unknown) => {
          // Not on every keystroke: the next try waits longer each time, and happens by itself if no edit comes.
          const failures = attempt.visit === key ? attempt.failures + 1 : 1
          const delay = Math.min(RETRY_MAX_MS, RETRY_FIRST_MS * 2 ** (failures - 1))
          createAttempts.current = { visit: key, failures, nextAt: Date.now() + delay }
          setReports((previous) => ({
            ...previous,
            [key]: { state: 'error', error: messageOf(error, 'Không tạo được đề để lưu.') },
          }))
          if (retryTimer.current !== null) window.clearTimeout(retryTimer.current)
          retryTimer.current = window.setTimeout(() => {
            retryTimer.current = null
            if (newExamLatest.current) askAgain.current?.(newExamLatest.current)
          }, delay)
        })
        .finally(() => {
          // Created: the saver takes over. Not adopted: this visit is over. Failed: tried again later.
          requesting.current = false
        })
    },
    [requestConversation, visitKey]
  )
  // The retry timer calls the latest version of the request (it may outlive a render).
  useEffect(() => {
    askAgain.current = askForConversation
  }, [askForConversation])
  useEffect(
    () => () => {
      if (retryTimer.current !== null) window.clearTimeout(retryTimer.current)
    },
    [visitKey]
  )

  const onChange = useCallback(
    (content: JSONContent) => {
      if (saver) {
        saver.change(content, mode)
        return
      }
      if (!visit.startedNew) return
      newExamLatest.current = content
      setEdited(visit.n)
      askForConversation(content)
    },
    [saver, mode, visit.startedNew, visit.n, askForConversation]
  )

  const setMode = useCallback(
    (next: AiDocumentMode) => {
      setModeChoice({ visit: visit.n, mode: next })
      if (saver) {
        saver.changeMode(next)
        return
      }
      if (!visit.startedNew) return
      setEdited(visit.n)
      askForConversation(newExamLatest.current ?? fresh)
    },
    [saver, visit.n, visit.startedNew, fresh, askForConversation]
  )

  const saveState: SaveState = report?.state ?? (failure ? 'error' : visit.startedNew && edited === visit.n && !conversationId ? 'unsaved' : 'saved')
  const saveError = saveState === 'error' ? (report?.error ?? failure) : null

  const retryLoad = useCallback(() => setReload((value) => value + 1), [])

  const resolveConflict = useCallback(
    (choice: 'reload' | 'keep') => {
      if (!conflict) return
      if (choice === 'reload' && conversationId) {
        setFetched({
          visit: visit.n,
          conversationId,
          content: conflict.content ? markTags(conflict.content as JSONContent) : draftToDoc(paper),
          mode: conflict.content ? conflict.mode : 'FREE',
          version: conflict.version,
        })
        setModeChoice(null)
        if (visit.startedNew) setVisit({ ...visit, startedNew: false })
        setReports((previous) => ({ ...previous, [visitKey]: { state: 'saved' } }))
        return
      }
      saver?.overwrite(conflict.version)
    },
    [conflict, conversationId, paper, saver, visit, visitKey]
  )

  return {
    /** Null while loading; the editor is built from this content and owns it afterwards. */
    loaded,
    /** True while the open exam's document is being read (or could not be read yet). */
    loading: loaded === null,
    /** Why the document could not be read; it is read again by itself and by `retryLoad`. */
    loadError: failure,
    retryLoad,
    mode,
    setMode,
    saveState,
    saveError,
    /** The newer document another tab saved; the sheet should be read-only until `resolveConflict`. */
    conflict,
    resolveConflict,
    onChange,
  }
}
