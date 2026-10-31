// Types for the console AI assistant. The screen is a UI preview: nothing here calls the API yet.

export type AiAssistantMode = 'ask' | 'compose' | 'mock-exam'

export type AiTraceState = 'done' | 'running' | 'pending'

/** One tool call or one planned cell inside a trace stage. */
export interface AiTraceItem {
  id: string
  label: string
  detail?: string
  state?: AiTraceState
}

/** A DeepTutor-style stage: explore, plan, write a question, validate and repair. */
export interface AiTraceStage {
  id: string
  title: string
  detail?: string
  items?: AiTraceItem[]
  state?: AiTraceState
}

export type AiDifficulty = 'DE' | 'TB' | 'KHO'

export interface AiQuestionOption {
  id: string
  label: string
}

export interface AiQuestion {
  id: string
  number: number
  prompt: string
  difficulty: AiDifficulty
  options: AiQuestionOption[]
  answerId: string
  explanation: string
}

export interface AiAssistantMessage {
  id: string
  role: 'user' | 'assistant'
  body: string
  createdAt: string
  /** The composer mode the assistant answered in. */
  mode?: AiAssistantMode
  /** Short step list behind the fold-out "Quy trình xử lý" row. */
  trace?: string[]
  /** The structured DeepTutor trace used by compose and mock-exam turns. */
  stages?: AiTraceStage[]
  /** Questions this turn put on the paper; the chat links to them instead of printing them. */
  addedQuestionIds?: string[]
  addedPartTitle?: string
  questions?: AiQuestion[]
}

export interface AiAssistantConversation {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  messages: AiAssistantMessage[]
  /** The hand-written transcript shown on first open; everything else in the screen is a blank thread. */
  demo?: boolean
}

export interface AiQuizSettings {
  subjectId: string
  count: number
  difficulty: AiDifficulty
  questionType: string
}

export interface AiMockExamSettings {
  sourceId: string
  count: number
  difficulty: AiDifficulty
}

// The local exam draft the composer edits. Shapes follow the question-bank detail
// (options carry a label, text and correct flag) so the backend can fill them later.
export interface AiExamOption {
  id: string
  label: string
  text: string
  correct: boolean
}

export interface AiExamQuestion {
  id: string
  partId: string
  groupId: string | null
  prompt: string
  options: AiExamOption[]
  explanation: string
  difficulty: AiDifficulty
  source: 'ai' | 'manual'
  /** AI questions stay unaccepted until the teacher presses Giữ. */
  accepted: boolean
}

export interface AiExamPart {
  id: string
  title: string
  /** Matrix target; only read while the draft has a matrix. */
  targetCount: number | null
}

export interface AiExamGroup {
  id: string
  partId: string
  instruction: string | null
  passage: string | null
}

export interface AiExamMatrix {
  id: string
  name: string
}

export interface AiExamDraft {
  id: string
  title: string
  durationMinutes: number | null
  matrix: AiExamMatrix | null
  parts: AiExamPart[]
  groups: AiExamGroup[]
  questions: AiExamQuestion[]
}
