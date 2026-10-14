// Illustration of a multiple-choice answer sheet, drawn after the printed sheet. It is decorative:
// the numbers and bubbles are sample data, not the exact layout of the V-ACT sheet.

const SHEET_X = 40
const SHEET_WIDTH = 390
const COLUMN_X = [58, 176, 294]
const ROW_Y = [156, 190, 224, 258, 292, 326]
const OPTIONS = ['A', 'B', 'C', 'D']
// Selected option per question, 1-based question number.
const MARKED = 'BDACBDCADBACDBCABD'

const CORNERS: [number, number][] = [
  [SHEET_X + 12, 36],
  [SHEET_X + SHEET_WIDTH - 22, 36],
  [SHEET_X + 12, 354],
  [SHEET_X + SHEET_WIDTH - 22, 354],
]

interface Bubble {
  key: string
  cx: number
  cy: number
  marked: boolean
}

function buildQuestions() {
  const numbers: { key: string; x: number; y: number; label: number }[] = []
  const bubbles: Bubble[] = []
  let question = 1
  COLUMN_X.forEach((columnX) => {
    ROW_Y.forEach((rowY) => {
      numbers.push({ key: `n${question}`, x: columnX + 14, y: rowY + 4, label: question })
      OPTIONS.forEach((option, index) => {
        bubbles.push({
          key: `b${question}${option}`,
          cx: columnX + 34 + index * 22,
          cy: rowY,
          marked: MARKED[question - 1] === option,
        })
      })
      question += 1
    })
  })
  return { numbers, bubbles }
}

const { numbers, bubbles } = buildQuestions()

function AnswerSheet() {
  return (
    <svg
      className="exam-sheet"
      viewBox="0 0 520 400"
      role="img"
      aria-label="Minh họa phiếu trả lời trắc nghiệm với các đáp án A, B, C, D đã được tô, cạnh bút chì và đồng hồ bấm giờ"
      focusable="false"
    >
      <circle cx="430" cy="90" r="110" fill="#fff" opacity="0.6" />
      <circle cx="60" cy="350" r="70" fill="#fff" opacity="0.45" />
      <rect x={SHEET_X + 8} y="32" width={SHEET_WIDTH} height="348" rx="16" fill="#a9d8f2" />
      <rect
        x={SHEET_X}
        y="24"
        width={SHEET_WIDTH}
        height="348"
        rx="16"
        fill="#fff"
        stroke="#173555"
        strokeWidth="3"
      />
      <g fill="#173555">
        {CORNERS.map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="10" height="10" rx="1.5" />
        ))}
      </g>
      <text x={SHEET_X + SHEET_WIDTH / 2} y="58" fontSize="14" fill="#173555" textAnchor="middle">
        PHIẾU TRẢ LỜI TRẮC NGHIỆM
      </text>
      <g fill="none" stroke="#9fb6c8" strokeWidth="2">
        <rect x={SHEET_X + 20} y="68" width="150" height="20" rx="6" />
        <rect x={SHEET_X + SHEET_WIDTH - 150} y="68" width="130" height="20" rx="6" />
      </g>
      <g fontSize="9" fill="#7b93a6">
        <text x={SHEET_X + 28} y="82">
          Số báo danh
        </text>
        <text x={SHEET_X + SHEET_WIDTH - 142} y="82">
          Mã đề thi
        </text>
      </g>
      <rect x={SHEET_X + 20} y="98" width="66" height="18" rx="9" fill="#e1f4ff" />
      <text x={SHEET_X + 53} y="111" fontSize="10" fill="#007db5" textAnchor="middle">
        PHẦN I
      </text>
      <g fontSize="9" fill="#7b93a6">
        {COLUMN_X.flatMap((columnX) =>
          OPTIONS.map((option, index) => (
            <text
              key={`${columnX}${option}`}
              x={columnX + 34 + index * 22}
              y="138"
              textAnchor="middle"
            >
              {option}
            </text>
          ))
        )}
      </g>
      <g fontSize="11" fill="#173555">
        {numbers.map((item) => (
          <text key={item.key} x={item.x} y={item.y} textAnchor="end">
            {item.label}
          </text>
        ))}
      </g>
      <g fill="none" stroke="#9fb6c8" strokeWidth="2">
        {bubbles
          .filter((bubble) => !bubble.marked)
          .map((bubble) => (
            <circle key={bubble.key} cx={bubble.cx} cy={bubble.cy} r="8" />
          ))}
      </g>
      <g fill="#1cb0f6" stroke="#173555" strokeWidth="2">
        {bubbles
          .filter((bubble) => bubble.marked)
          .map((bubble) => (
            <circle key={bubble.key} cx={bubble.cx} cy={bubble.cy} r="8" />
          ))}
      </g>
      <g transform="translate(396 356) rotate(-38)">
        <rect
          x="-16"
          y="0"
          width="22"
          height="22"
          rx="6"
          fill="#f08aa6"
          stroke="#173555"
          strokeWidth="3"
        />
        <rect x="6" y="0" width="104" height="22" fill="#ffc933" stroke="#173555" strokeWidth="3" />
        <polygon
          points="110,0 142,11 110,22"
          fill="#f6dcb4"
          stroke="#173555"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <polygon points="132,7 142,11 132,15" fill="#173555" />
      </g>
      <g transform="translate(452 64)">
        <rect x="-8" y="-48" width="16" height="11" rx="3" fill="#173555" />
        <circle r="34" fill="#fff" stroke="#173555" strokeWidth="4" />
        <circle r="25" fill="#e1f4ff" />
        <path
          d="M0 -16V0l11 7"
          fill="none"
          stroke="#173555"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  )
}

export default AnswerSheet
