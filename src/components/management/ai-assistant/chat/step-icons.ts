import {
  ArrowUpDown,
  BookOpen,
  BookOpenText,
  ChartColumn,
  Crop,
  Database,
  Download,
  Eraser,
  FilePlus,
  Files,
  FileText,
  FileUp,
  Heading,
  Hourglass,
  KeyRound,
  LayoutGrid,
  LayoutTemplate,
  List,
  ListPlus,
  PencilLine,
  PenLine,
  Replace,
  ScanText,
  Search,
  Shapes,
  ShieldCheck,
  Sparkles,
  Table,
  Tags,
  TextCursorInput,
  Trash2,
  Type,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { TOOL_LABELS } from '../../../../hooks/ai-run-stages'

/** Each stage of a run by its id: a compose run's, and a paper reading's. */
const STAGE_ICONS: Record<string, LucideIcon> = {
  queue: Hourglass,
  agent: Sparkles,
  explore: Search,
  plan: LayoutGrid,
  write: PenLine,
  lookup: BookOpenText,
  QUEUED: Hourglass,
  STRUCTURE: LayoutTemplate,
  QUESTIONS: ScanText,
  KEY_TABLE: Table,
  REVIEW: ShieldCheck,
  FIGURES: Crop,
  KEY: KeyRound,
  STORE: Database,
  LABEL: Tags,
}

/** Each tool the assistant calls by its name; `slot` is the question a run is writing. */
const TOOL_ICONS: Record<string, LucideIcon> = {
  get_exam_format: LayoutTemplate,
  list_patterns: Shapes,
  get_pattern: BookOpen,
  matrix_stats: ChartColumn,
  search_bank_questions: Search,
  list_draft_questions: List,
  get_draft_question: FileText,
  list_document_questions: List,
  get_document_question: FileText,
  revise_question: PencilLine,
  check_question: ShieldCheck,
  read_exam: BookOpenText,
  read_questions: FileText,
  remove_questions: Trash2,
  move_questions: ArrowUpDown,
  rewrite_questions: PencilLine,
  add_questions: ListPlus,
  compose_exam: FilePlus,
  compose_mock_exam: Files,
  export_exam: Download,
  update_answer_key: KeyRound,
  remove_answer_key: Eraser,
  import_paper: FileUp,
  edit_text: Type,
  insert_text: TextCursorInput,
  remove_text: Eraser,
  add_exam_header: Heading,
  replace_text: Replace,
  slot: PenLine,
  read_part: ScanText,
}

// A step read back as a line of text names its tool only by its label.
const TOOL_BY_LABEL = new Map(Object.entries(TOOL_LABELS).map(([tool, label]) => [label, tool]))

export const stageIcon = (stageId: string | undefined): LucideIcon => (stageId && STAGE_ICONS[stageId]) || Sparkles

export const stepIcon = (tool: string | undefined, label: string): LucideIcon =>
  TOOL_ICONS[tool ?? TOOL_BY_LABEL.get(label) ?? ''] ?? Wrench
