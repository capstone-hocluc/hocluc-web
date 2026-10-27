import ConsoleDialog from '../../console/dialog'
import Button from '../../console/button'

// Abbreviations and terms used on the "Phân tích văn bản" page, grouped as the page's panels are.
const GLOSSARY: { group: string; terms: { term: string; full?: string; meaning: string }[] }[] = [
  {
    group: 'Mức độ & từ vựng',
    terms: [
      {
        term: 'CEFR',
        full: 'Common European Framework of Reference',
        meaning:
          'Khung tham chiếu ngôn ngữ chung châu Âu, 6 bậc từ A1 (mới bắt đầu) đến C2 (thành thạo), tương ứng Bậc 1–6 của khung năng lực ngoại ngữ Việt Nam (VSTEP).',
      },
      {
        term: 'A1 · A2 · B1 · B2 · C1 · C2',
        meaning: 'Các bậc CEFR: A = cơ bản, B = trung cấp, C = cao cấp. Mỗi từ được gán bậc theo danh sách CEFR-J và Octanove.',
      },
      {
        term: 'Ngoài DS',
        full: 'off-list',
        meaning: 'Từ không có trong danh sách CEFR (thường là từ chuyên ngành, học thuật hoặc từ hiếm).',
      },
      {
        term: 'Độ phủ 95% / 98%',
        full: 'lexical coverage',
        meaning:
          'Mức thấp nhất mà người học biết ≥ 95% số từ trong bài (đọc được khi có hỗ trợ) hoặc ≥ 98% (tự đọc được). Hiển thị dạng khoảng: cận dưới bỏ qua từ ngoài danh sách, cận trên coi chúng là từ chưa biết.',
      },
      { term: 'Lượt từ', full: 'token', meaning: 'Mỗi lần một từ xuất hiện trong bài; từ lặp lại được đếm nhiều lần.' },
      { term: 'Từ gốc', full: 'lemma', meaning: 'Dạng gốc của từ, ví dụ "rising" → "rise", "went" → "go".' },
    ],
  },
  {
    group: 'Độ dễ đọc',
    terms: [
      {
        term: 'FRE',
        full: 'Flesch Reading Ease',
        meaning: 'Điểm 0–100 dựa trên độ dài câu và số âm tiết mỗi từ; càng cao càng dễ đọc.',
      },
      {
        term: 'FKGL',
        full: 'Flesch–Kincaid Grade Level',
        meaning: 'Quy đổi độ khó sang lớp học ở Mỹ, cùng dữ liệu với FRE.',
      },
      {
        term: 'Fog',
        full: 'Gunning Fog Index',
        meaning: 'Lớp học Mỹ, dựa trên độ dài câu và tỷ lệ "từ khó" (từ ≥ 3 âm tiết).',
      },
      {
        term: 'SMOG',
        full: 'Simple Measure of Gobbledygook',
        meaning: 'Lớp học Mỹ, dựa trên số từ ≥ 3 âm tiết; đáng tin cậy nhất với văn bản ≥ 30 câu.',
      },
      {
        term: 'CLI',
        full: 'Coleman–Liau Index',
        meaning: 'Lớp học Mỹ, dựa trên số chữ cái (thay vì âm tiết) và số câu trên 100 từ.',
      },
      {
        term: 'ARI',
        full: 'Automated Readability Index',
        meaning: 'Lớp học Mỹ, dựa trên số ký tự mỗi từ và số từ mỗi câu.',
      },
      {
        term: 'Lớp Mỹ',
        full: 'US grade level',
        meaning: 'Số năm học cần để đọc hiểu: 6 ≈ lớp 6, 12 ≈ hết THPT, 13+ ≈ đại học. Thiết kế cho người bản xứ.',
      },
    ],
  },
  {
    group: 'Tần suất',
    terms: [
      {
        term: 'Zipf',
        full: 'Zipf frequency scale',
        meaning:
          'Độ phổ biến của từ trong tiếng Anh thực tế (log₁₀ số lần xuất hiện trên một tỷ từ): 7 ≈ "the", 5 = rất phổ biến, dưới 3 = hiếm.',
      },
      {
        term: 'Từ nội dung',
        full: 'content word',
        meaning: 'Danh từ, động từ, tính từ, trạng từ mang nghĩa; khác với từ chức năng như "the", "of", "and".',
      },
    ],
  },
  {
    group: 'Đa dạng từ vựng',
    terms: [
      {
        term: 'TTR',
        full: 'Type–Token Ratio',
        meaning: 'Số từ khác nhau ÷ tổng số từ. Bài càng dài, TTR càng giảm.',
      },
      {
        term: 'Root TTR',
        full: "Guiraud's index",
        meaning: 'Số từ khác nhau ÷ căn bậc hai tổng số từ; ít phụ thuộc độ dài bài hơn TTR.',
      },
      {
        term: 'MATTR',
        full: 'Moving-Average Type–Token Ratio',
        meaning: 'TTR trung bình trên mọi đoạn 50 từ liên tiếp.',
      },
      {
        term: 'MTLD',
        full: 'Measure of Textual Lexical Diversity',
        meaning: 'Độ dài trung bình của đoạn văn trước khi TTR giảm xuống 0,72; càng cao càng ít lặp từ.',
      },
      {
        term: 'HD-D',
        full: 'Hypergeometric Distribution D',
        meaning: 'Khả năng gặp từ mới khi rút ngẫu nhiên 42 từ trong bài (0–1); càng cao càng đa dạng.',
      },
      {
        term: 'Mật độ từ vựng',
        full: 'lexical density',
        meaning: 'Tỷ lệ từ nội dung trên tổng số từ.',
      },
    ],
  },
]

/** Mount only while shown, like the other console dialogs. */
export default function TextProfileGlossary({ onClose }: { onClose: () => void }) {
  return (
    <ConsoleDialog
      open
      onClose={onClose}
      title="Giải thích thuật ngữ"
      description="Các chữ viết tắt và thuật ngữ dùng trong trang Phân tích văn bản."
      maxWidth={680}
      footer={
        <Button appearance="outline" onClick={onClose}>
          Đóng
        </Button>
      }
    >
      <div className="flex flex-col gap-6">
        {GLOSSARY.map((section) => (
          <section key={section.group}>
            <h3 className="mb-2 text-sm font-semibold text-text-primary">{section.group}</h3>
            <dl className="divide-y divide-card-border rounded-lg border border-card-border">
              {section.terms.map((entry) => (
                <div key={entry.term} className="grid gap-1 px-4 py-3 sm:grid-cols-[180px_1fr] sm:gap-4">
                  <dt className="text-sm font-semibold text-text-primary">
                    {entry.term}
                    {entry.full && <span className="block text-xs font-normal text-text-tertiary">{entry.full}</span>}
                  </dt>
                  <dd className="text-sm leading-6 text-text-secondary">{entry.meaning}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </ConsoleDialog>
  )
}
