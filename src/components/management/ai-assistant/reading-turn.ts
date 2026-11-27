// A loaded paper being read (or already read) beside the chat, shown in the thread as the assistant's own turn: its
// stages and the steps under them, timed like any run's. The page owns the reading; the chat only shows it.
import { createContext, useContext } from 'react'
import type { BankIngestStatus } from '../../../services/questionBankService'
import type { ValueStore } from '../../../lib/value-store'
import type { AiTraceStage } from './exam-format'

/** The id of the reading's turn; it is never a message of the conversation. */
export const READING_ID = 'paper-reading'

export interface ReadingTurn {
  title: string
  running: boolean
  /** Where the reading is: "AI đang đọc đề", "Đã nạp vào ngân hàng". */
  status: string
  /** What it does now ("Đang đọc phần 2"), while it runs. */
  progress: string | null
  /** Why it stopped, in the teacher's words. */
  error: string | null
  stages: AiTraceStage[]
  /** The whole reading, from when the paper was loaded until it was read. */
  runTime: { startedAt: number; completedAt?: number } | undefined
  /** Why Jev cannot label the questions still without a label. */
  labellingBlocker: string | null
  /** The live stream could not open, so the reading is read again every few seconds. */
  polling: boolean
}

export type ReadingTurnStore = ValueStore<ReadingTurn | null>

/** What the reading's turn can do: load a failed paper again, and go back to the exam being written. */
export interface ReadingActions {
  onLoadAgain?: () => void
  onClose: () => void
}

export const ReadingActionsContext = createContext<ReadingActions | null>(null)

export const useReadingActions = () => useContext(ReadingActionsContext)

/** Where a reading is, in the teacher's words. */
export function readingStatus(status: BankIngestStatus, failed: boolean) {
  if (status === 'PENDING') return 'Đề đang chờ AI đọc'
  if (status === 'RUNNING') return 'AI đang đọc đề'
  return failed ? 'Chưa nạp xong' : 'Đã nạp vào ngân hàng'
}
