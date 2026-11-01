import type { JSONContent } from '@tiptap/core'
import { choiceGridContent, type ChoiceColumns } from '../nodes/choice-grid'
import { examHeaderContent } from '../nodes/exam-header'

export interface SnippetContext {
  /** Number for the snippet's "Câu n" line: the one after the last question of the document. */
  nextQuestion: number
}

/** An insertable block of the "Mẫu đề thi" library. */
export interface ExamSnippet {
  id: string
  title: string
  /** The blocks to insert, as Tiptap JSON. */
  build: (context: SnippetContext) => JSONContent[]
}

export interface SnippetGroup {
  id: string
  title: string
  snippets: ExamSnippet[]
}

type Align = 'left' | 'center' | 'right' | 'justify'
type MarkName = 'bold' | 'italic' | 'boxed'
type Cell = string | JSONContent[]

const BLANK = '……'

const text = (value: string, ...marks: MarkName[]): JSONContent => ({
  type: 'text',
  text: value,
  ...(marks.length ? { marks: marks.map((type) => ({ type })) } : {}),
})

const math = (latex: string, display = false): JSONContent => ({ type: 'math', attrs: { latex, display } })

const lineBreak: JSONContent = { type: 'hardBreak' }

function line(content: Cell, align?: Align): JSONContent {
  const inline = typeof content === 'string' ? (content ? [text(content)] : []) : content
  return {
    type: 'paragraph',
    ...(align ? { attrs: { textAlign: align } } : {}),
    ...(inline.length ? { content: inline } : {}),
  }
}

const heading = (level: 1 | 2, value: string, align: Align = 'left'): JSONContent => ({
  type: 'heading',
  attrs: { level, textAlign: align },
  content: [text(value)],
})

/** "Câu n." in bold then the stem; with points, "Câu n (… điểm)." as an essay question starts. */
function question(number: number, stem: string, withPoints = false): JSONContent {
  return withPoints
    ? line([text(`Câu ${number}`, 'bold'), text(` (… điểm). ${stem}`)])
    : line([text(`Câu ${number}.`, 'bold'), text(` ${stem}`)])
}

/** A sub-item line: bold "a)" then a blank. */
const item = (label: string, rest = BLANK) => line([text(`${label} `, 'bold'), text(rest)])

function choices(columns: ChoiceColumns): JSONContent {
  return choiceGridContent(Array.from({ length: 4 }, () => [text(BLANK)]), columns)
}

interface TableOptions {
  /** The first row is a header row. */
  header?: boolean
  /** Column widths in px; all columns need one (the content width is 661px). */
  widths?: number[]
  align?: Align
}

function table(rows: Cell[][], { header = false, widths, align }: TableOptions = {}): JSONContent {
  return {
    type: 'table',
    content: rows.map((row, rowIndex) => ({
      type: 'tableRow',
      content: row.map((value, column) => ({
        type: header && rowIndex === 0 ? 'tableHeader' : 'tableCell',
        ...(widths ? { attrs: { colwidth: [widths[column]] } } : {}),
        content: [line(value, align)],
      })),
    })),
  }
}

/** A bordered box with room for a drawing or a pasted picture. */
const frame = (lines = 7): JSONContent => ({
  type: 'table',
  content: [{ type: 'tableRow', content: [{ type: 'tableCell', content: Array.from({ length: lines }, () => line('')) }] }],
})

const caption = (value = 'Hình …') => line([text(value, 'italic')], 'center')

export const SNIPPET_GROUPS: SnippetGroup[] = [
  {
    id: 'heading',
    title: 'Tiêu đề & thông tin',
    snippets: [
      { id: 'exam-header', title: 'Đầu đề hai cột', build: () => [examHeaderContent()] },
      {
        id: 'centred-title',
        title: 'Tên đề căn giữa',
        build: () => [
          heading(1, 'ĐỀ KIỂM TRA ………………', 'center'),
          line([text('Môn: ……… – Thời gian làm bài: … phút', 'italic')], 'center'),
        ],
      },
      {
        id: 'candidate',
        title: 'Họ tên, số báo danh',
        build: () => [
          line(
            [text('Họ và tên thí sinh: ', 'bold'), text('……………………………………'), text('    Số báo danh: ', 'bold'), text('……………')],
            'left'
          ),
        ],
      },
      {
        id: 'instructions',
        title: 'Hướng dẫn làm bài',
        build: () => [
          line([text('Hướng dẫn làm bài:', 'bold', 'italic')]),
          {
            type: 'bulletList',
            content: [
              'Ghi mã đề vào phiếu trả lời trước khi làm bài.',
              'Phần trắc nghiệm: mỗi câu chọn một phương án.',
              'Phần tự luận: trình bày lời giải vào giấy kiểm tra.',
            ].map((value) => ({ type: 'listItem', content: [line([text(value, 'italic')])] })),
          },
        ],
      },
      { id: 'part-heading', title: 'Tiêu đề phần', build: () => [heading(2, 'PHẦN I. ……………… (… điểm)')] },
    ],
  },
  {
    id: 'choice',
    title: 'Trắc nghiệm',
    snippets: [
      {
        id: 'choice-auto',
        title: 'Bốn phương án, tự xếp hàng',
        build: ({ nextQuestion }) => [question(nextQuestion, 'Viết câu dẫn.'), choices('auto')],
      },
      {
        id: 'choice-two-per-row',
        title: 'Bốn phương án, hai mỗi hàng',
        build: ({ nextQuestion }) => [question(nextQuestion, 'Viết câu dẫn.'), choices(2)],
      },
      {
        id: 'true-false',
        title: 'Đúng/sai bốn ý a–d',
        build: ({ nextQuestion }) => [
          question(nextQuestion, 'Viết phần dẫn chung cho bốn ý.'),
          item('a)'),
          item('b)'),
          item('c)'),
          item('d)'),
        ],
      },
      {
        id: 'short-answer',
        title: 'Trả lời ngắn',
        build: ({ nextQuestion }) => [
          question(nextQuestion, 'Viết đề bài.'),
          line([text('Trả lời: ', 'bold'), text('……………')]),
        ],
      },
      {
        id: 'matching',
        title: 'Ghép cặp',
        build: ({ nextQuestion }) => [
          question(nextQuestion, 'Ghép mỗi ý ở cột trái với một ý phù hợp ở cột phải.'),
          table(
            [
              ['Cột trái', 'Cột phải'],
              ...[1, 2, 3, 4].map((index) => [`${index}. ${BLANK}`, `${'abcd'[index - 1]}) ${BLANK}`]),
            ],
            { header: true }
          ),
          line([text('Trả lời: ', 'bold'), text('1 – …;  2 – …;  3 – …;  4 – …')]),
        ],
      },
    ],
  },
  {
    id: 'essay',
    title: 'Tự luận',
    snippets: [
      {
        id: 'essay-parts',
        title: 'Câu tự luận có ý a, b',
        build: ({ nextQuestion }) => [question(nextQuestion, 'Viết đề bài.', true), item('a)'), item('b)')],
      },
      {
        id: 'essay-figure',
        title: 'Bài toán có hình vẽ',
        build: ({ nextQuestion }) => [
          question(nextQuestion, 'Viết đề bài.', true),
          frame(),
          caption(),
          item('a)'),
          item('b)'),
        ],
      },
      {
        id: 'passage',
        title: 'Đoạn trích kèm câu hỏi',
        build: ({ nextQuestion }) => [
          line([text('Đọc đoạn trích sau và trả lời câu hỏi:', 'bold', 'italic')]),
          line(
            [
              text('……………………………………', 'italic'),
              lineBreak,
              text('……………………………………', 'italic'),
              lineBreak,
              text('……………………………………', 'italic'),
            ],
            'center'
          ),
          line([text('(Trích ………, ………)', 'italic')], 'right'),
          question(nextQuestion, 'Viết câu hỏi.'),
        ],
      },
    ],
  },
  {
    id: 'table',
    title: 'Bảng & hình',
    snippets: [
      {
        id: 'table-two-columns',
        title: 'Bảng hai cột',
        build: () => [table([['Cột 1', 'Cột 2'], ['', ''], ['', ''], ['', '']], { header: true })],
      },
      {
        id: 'variation-table',
        title: 'Bảng biến thiên',
        build: () => [
          table(
            [
              [[math('x')], [math('-\\infty')], '', [math('x_0')], '', [math('+\\infty')]],
              [[math("y'")], '', '+', '0', '−', ''],
              [[math('y')], '', '↗', [math('y_0')], '↘', ''],
            ],
            { widths: [61, 120, 120, 120, 120, 120], align: 'center' }
          ),
        ],
      },
      { id: 'figure-frame', title: 'Khung hình', build: () => [frame(), caption()] },
      {
        id: 'display-formula',
        title: 'Công thức riêng dòng',
        build: () => [line([math('f(x) = ax^2 + bx + c', true)], 'center')],
      },
    ],
  },
  {
    id: 'ending',
    title: 'Kết thúc',
    snippets: [
      { id: 'end-line', title: 'Dòng HẾT', build: () => [line([text('--- HẾT ---', 'bold')], 'center')] },
      {
        id: 'proctor-note',
        title: 'Ghi chú giám thị',
        build: () => [
          line(
            [text('Thí sinh không được sử dụng tài liệu. Giám thị coi thi không giải thích gì thêm.', 'italic')],
            'center'
          ),
        ],
      },
      {
        id: 'answer-key',
        title: 'Bảng đáp án trắc nghiệm',
        build: () => [
          line([text('BẢNG ĐÁP ÁN', 'bold')], 'center'),
          table(
            [
              ['Câu', ...Array.from({ length: 10 }, (_, index) => String(index + 1))],
              ['Đáp án', ...Array.from({ length: 10 }, () => '')],
            ],
            { header: true, align: 'center' }
          ),
        ],
      },
      {
        id: 'marking-scheme',
        title: 'Đáp án và thang điểm',
        build: () => [
          { type: 'pageBreak' },
          heading(1, 'ĐÁP ÁN VÀ THANG ĐIỂM', 'center'),
          table(
            [
              ['Câu', 'Nội dung', 'Điểm'],
              ['1', BLANK, '0,5'],
              ['2', BLANK, '0,5'],
              ['', 'Tổng', '…'],
            ],
            { header: true, widths: [64, 517, 80] }
          ),
        ],
      },
    ],
  },
]

const SNIPPETS_BY_ID = new Map(
  SNIPPET_GROUPS.flatMap((group) => group.snippets.map((snippet) => [snippet.id, snippet] as const))
)

export function findSnippet(id: string): ExamSnippet | undefined {
  return SNIPPETS_BY_ID.get(id)
}
