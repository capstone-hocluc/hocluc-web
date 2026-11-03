// Symbols the formula dialog offers, following the palette of soandethi.com.
// `#?` and `#@` are MathLive placeholders; `latex` may carry a trailing space so the
// next character does not fuse with the command.

export interface FormulaSymbol {
  latex: string
  title: string
  preview: string
}

export interface FormulaGroup {
  id: string
  label: string
  symbols: FormulaSymbol[]
}

function symbol(latex: string, title: string, preview = latex.trimEnd()): FormulaSymbol {
  return { latex, title, preview }
}

const GREEK_NAMES = [
  'alpha', 'beta', 'gamma', 'delta', 'varepsilon', 'theta', 'lambda', 'mu',
  'pi', 'rho', 'sigma', 'varphi', 'omega', 'Delta', 'Sigma', 'Omega',
]

export const FORMULA_GROUPS: FormulaGroup[] = [
  {
    id: 'basic',
    label: 'Cơ bản',
    symbols: [
      symbol('\\frac{#@}{#?}', 'Phân số', '\\frac{a}{b}'),
      symbol('\\sqrt{#?}', 'Căn bậc hai', '\\sqrt{x}'),
      symbol('\\sqrt[#?]{#?}', 'Căn bậc n', '\\sqrt[n]{x}'),
      symbol('^{#?}', 'Luỹ thừa', 'x^{n}'),
      symbol('_{#?}', 'Chỉ số dưới', 'x_{n}'),
      symbol('^{2}', 'Bình phương', 'x^{2}'),
      symbol('\\left|#?\\right|', 'Giá trị tuyệt đối', '|x|'),
      symbol('\\left(#?\\right)', 'Ngoặc tròn', '(\\ )'),
      symbol('\\cdot ', 'Nhân', '\\cdot'),
      symbol('\\times ', 'Nhân chéo', '\\times'),
      symbol('\\div ', 'Chia', '\\div'),
      symbol('\\pm ', 'Cộng trừ', '\\pm'),
      symbol('\\infty ', 'Vô cùng', '\\infty'),
      symbol('\\%', 'Phần trăm', '\\%'),
    ],
  },
  {
    id: 'relation',
    label: 'So sánh',
    symbols: [
      symbol('\\ne ', 'Khác', '\\ne'),
      symbol('\\le ', 'Nhỏ hơn hoặc bằng', '\\le'),
      symbol('\\ge ', 'Lớn hơn hoặc bằng', '\\ge'),
      symbol('\\approx ', 'Xấp xỉ', '\\approx'),
      symbol('\\equiv ', 'Đồng dư', '\\equiv'),
      symbol('\\Rightarrow ', 'Suy ra', '\\Rightarrow'),
      symbol('\\Leftrightarrow ', 'Tương đương', '\\Leftrightarrow'),
      symbol('\\rightarrow ', 'Mũi tên', '\\rightarrow'),
      symbol('\\in ', 'Thuộc', '\\in'),
      symbol('\\notin ', 'Không thuộc', '\\notin'),
      symbol('\\subset ', 'Tập con', '\\subset'),
      symbol('\\cup ', 'Hợp', '\\cup'),
      symbol('\\cap ', 'Giao', '\\cap'),
      symbol('\\emptyset ', 'Tập rỗng', '\\emptyset'),
      symbol('\\forall ', 'Với mọi', '\\forall'),
      symbol('\\exists ', 'Tồn tại', '\\exists'),
    ],
  },
  {
    id: 'calculus',
    label: 'Hàm & giải tích',
    symbols: [
      symbol('\\sin\\left(#?\\right)', 'Sin', '\\sin'),
      symbol('\\cos\\left(#?\\right)', 'Cos', '\\cos'),
      symbol('\\tan\\left(#?\\right)', 'Tan', '\\tan'),
      symbol('\\log_{#?}\\left(#?\\right)', 'Logarit', '\\log_a'),
      symbol('\\ln\\left(#?\\right)', 'Logarit tự nhiên', '\\ln'),
      symbol('\\lim_{x\\to #?}', 'Giới hạn', '\\lim'),
      symbol('\\sum_{i=#?}^{#?}', 'Tổng', '\\sum'),
      symbol('\\prod_{i=#?}^{#?}', 'Tích', '\\prod'),
      symbol('\\int_{#?}^{#?}', 'Tích phân', '\\int'),
      symbol('\\frac{d}{dx}', 'Đạo hàm', '\\frac{d}{dx}'),
      symbol("f'\\left(x\\right)", 'f phẩy', "f'"),
      symbol('C_{#?}^{#?}', 'Tổ hợp chập k của n', 'C_n^k'),
      symbol('A_{#?}^{#?}', 'Chỉnh hợp chập k của n', 'A_n^k'),
      symbol('!', 'Giai thừa', 'n!'),
      symbol('\\binom{#?}{#?}', 'Nhị thức', '\\binom{n}{k}'),
    ],
  },
  {
    id: 'greek',
    label: 'Chữ Hy Lạp',
    symbols: GREEK_NAMES.map((name) => symbol(`\\${name} `, name, `\\${name}`)),
  },
  {
    id: 'geometry',
    label: 'Hình học',
    symbols: [
      symbol('\\widehat{#?}', 'Góc', '\\widehat{A}'),
      symbol('\\angle ', 'Ký hiệu góc', '\\angle'),
      symbol('\\overrightarrow{#?}', 'Vectơ', '\\vec{v}'),
      symbol('\\overline{#?}', 'Đoạn thẳng', '\\overline{AB}'),
      symbol('^{\\circ}', 'Độ', '^{\\circ}'),
      symbol('\\perp ', 'Vuông góc', '\\perp'),
      symbol('\\parallel ', 'Song song', '\\parallel'),
      symbol('\\triangle ', 'Tam giác', '\\triangle'),
      symbol('\\cong ', 'Bằng nhau', '\\cong'),
      symbol('\\sim ', 'Đồng dạng', '\\sim'),
    ],
  },
]
