import { EventStreamContentType, fetchEventSource } from '@microsoft/fetch-event-source'
import { API_BASE_URL, getAccessToken, refreshAfterUnauthorized } from '../lib/api'
import type { BankIngestStatus } from './questionBankService'

export type BankIngestStage =
  | 'QUEUED'
  | 'STRUCTURE'
  | 'QUESTIONS'
  | 'KEY_TABLE'
  | 'REVIEW'
  | 'FIGURES'
  | 'KEY'
  | 'STORE'
  | 'LABEL'
  | 'DONE'

export type BankPartStatus = 'WAITING' | 'READING' | 'DONE'

/** One part of the paper the AI reads in one call (a few pages); parts are read one after another, in the paper's order. */
export interface BankStreamPart {
  id: string
  title: string | null
  fromQuestion: number
  toQuestion: number
  firstPage: number
  lastPage: number
  /** Goes up when the part is read again; text of an older attempt is thrown away. */
  attempt: number
  status: BankPartStatus
  /** What the AI has written for this part so far: JSON, half-finished while it writes. */
  text: string
  questions: number
}

export interface BankStreamSnapshot {
  sourceId: string
  /** False for a paper not being read on this server: what is stored of it. */
  live: boolean
  status: BankIngestStatus
  stage: BankIngestStage | null
  progress: string | null
  error: string | null
  parts: BankStreamPart[]
  labelled: number
  labelTotal: number
  /** Questions the reviewer model has checked of those read so far. */
  reviewed: number
  reviewTotal: number
  /** Being read again after the reviewer found a difference. */
  rereading: number
  /** Waiting for a person to settle the reading. */
  needsPerson: number
  /** The question the reviewer model is checking now, and the one the reading model is reading again. */
  checking?: number | null
  rewriting?: number | null
}

export type BankStreamEvent =
  | { type: 'snapshot'; data: BankStreamSnapshot }
  | { type: 'stage'; data: { stage: BankIngestStage; progress: string | null } }
  | { type: 'plan'; data: BankStreamPart[] }
  | { type: 'part'; data: BankStreamPart }
  | { type: 'text'; data: { partId: string; attempt: number; text: string } }
  | { type: 'label'; data: { labelled: number; labelTotal: number } }
  | {
      type: 'review'
      data: { reviewed: number; reviewTotal: number; rereading: number; needsPerson: number; checking: number | null; rewriting: number | null }
    }
  | { type: 'end'; data: { status: BankIngestStatus; error: string | null } }

const EVENT_TYPES = new Set(['snapshot', 'stage', 'plan', 'part', 'text', 'review', 'label', 'end'])
const MAX_RETRIES = 5
const RETRY_MS = 2000

/** The stream cannot be followed (forbidden, gone, or kept failing): the caller falls back to asking now and then. */
export class BankStreamUnavailable extends Error {}
class Ended extends Error {}
class TryAgain extends Error {}

/**
 * Follows a paper's reading as server-sent events until its `end`, connecting again after a dropped connection (each
 * connection starts with a `snapshot`, so nothing is missed). Resolves at the end or when `signal` aborts; rejects
 * with {@link BankStreamUnavailable} when the stream cannot be followed.
 */
export async function followBankReading(
  sourceId: string,
  onEvent: (event: BankStreamEvent) => void,
  signal: AbortSignal
): Promise<void> {
  let retries = 0
  try {
    await fetchEventSource(`${API_BASE_URL}/api/v1/question-bank/sources/${encodeURIComponent(sourceId)}/stream`, {
      signal,
      openWhenHidden: true,
      // the token is read at each connection, so one refreshed meanwhile is used
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          credentials: 'same-origin',
          headers: { ...(init?.headers as Record<string, string>), Authorization: `Bearer ${getAccessToken() ?? ''}` },
        }),
      async onopen(response) {
        if (response.ok && response.headers.get('content-type')?.startsWith(EventStreamContentType)) {
          retries = 0
          return
        }
        if (response.status === 401 && (await refreshAfterUnauthorized())) throw new TryAgain()
        throw new BankStreamUnavailable(`stream answered ${response.status}`)
      },
      onmessage(message) {
        if (!EVENT_TYPES.has(message.event) || !message.data) return
        const event = { type: message.event, data: JSON.parse(message.data) } as BankStreamEvent
        onEvent(event)
        if (event.type === 'end') throw new Ended()
      },
      onclose() {
        // the server closed without an end (its time limit): connect again, a snapshot follows
        throw new TryAgain()
      },
      onerror(error) {
        if (error instanceof Ended || error instanceof BankStreamUnavailable) throw error
        retries += 1
        if (retries > MAX_RETRIES) throw new BankStreamUnavailable('the stream kept failing')
        return RETRY_MS
      },
    })
  } catch (error) {
    if (error instanceof Ended || signal.aborted) return
    throw error instanceof BankStreamUnavailable ? error : new BankStreamUnavailable(String(error))
  }
}
