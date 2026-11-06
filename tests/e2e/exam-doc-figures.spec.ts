import { readFile } from 'node:fs/promises'
import { expect, test, type Locator, type Page } from '@playwright/test'
import JSZip from 'jszip'
import { installQuizFixture } from './quiz-permissions-fixture'

// A function graph and a variation table edited by hand in the exam editor. The page talks to the AI assistant API
// only to read and save the exam's document; the fixture below answers those calls and keeps every saved document.

const BASE = '/api/v1/ai-assistant'
const stamp = '2026-11-01T08:00:00Z'

type DocNode = Record<string, unknown>

const run = (text: string, bold = false): DocNode => ({ type: 'text', text, ...(bold ? { marks: [{ type: 'bold' }] } : {}) })
const paragraph = (...content: DocNode[]): DocNode => ({ type: 'paragraph', content })
const heading = (text: string): DocNode => ({ type: 'heading', attrs: { level: 1 }, content: [run(text)] })

/** A chart block holding a graph or a table, as the editor stores one: an empty data table and the figure in its spec. */
const figureChart = (title: string, figure: Record<string, unknown>, width = 0.6): DocNode => ({
  type: 'chart',
  attrs: {
    data: { columns: [{ id: 'label', label: 'Nhãn', role: 'label' }, { id: 's1', label: '', role: 'series' }], rows: [['', 0]] },
    spec: { type: figure.type, title, xLabel: '', yLabel: '', legend: true, palette: 'print', width, figure },
  },
})

const cubic = figureChart('Đồ thị bậc ba', {
  type: 'function',
  xMin: -3,
  xMax: 3,
  yMin: -4,
  yMax: 4,
  functions: [{ expression: 'x^3-3x+1' }],
})

const table = figureChart(
  'Bảng biến thiên của f',
  {
    type: 'variation',
    name: 'f',
    xValues: ['-∞', '-1', '1', '+∞'],
    signs: ['', '+', '0', '-', '0', '+', ''],
    values: ['-∞', '3', '-1', '+∞'],
  },
  0.8
)

const QUESTION = 'Câu 1. Hàm số nghịch biến trên khoảng nào?'

const examDocument = {
  mode: 'FREE',
  version: 3,
  updatedAt: stamp,
  content: {
    type: 'doc',
    attrs: { deliveredItems: [] },
    content: [heading('ĐỀ KIỂM TRA TOÁN 12'), paragraph(run(QUESTION)), cubic, table, paragraph(run('--- HẾT ---', true))],
  },
}

const conversation = {
  id: 'conv-9',
  title: 'Đề kiểm tra Toán 12',
  subjectId: 'category-1',
  mode: 'compose',
  createdAt: stamp,
  updatedAt: stamp,
}

/** The running test's fixture; after the test every request must have had a handler and the page must not have thrown. */
let checkedFixture: { unmatched: string[]; pageErrors: string[] } | null = null

test.afterEach(() => {
  const fixture = checkedFixture
  checkedFixture = null
  if (!fixture) return
  expect(fixture.unmatched, 'requests without a fixture handler').toEqual([])
  expect(fixture.pageErrors, 'errors thrown in the page').toEqual([])
})

/** One saved exam holding `document` (the two figures by default); documents are saved over the version they were read at. */
async function installFigureFixture(page: Page, document = examDocument) {
  const quiz = await installQuizFixture(page, 'MANAGER')
  checkedFixture = quiz
  let stored = structuredClone(document) as typeof examDocument
  const saves: Array<Record<string, unknown>> = []
  const reply = (route: import('@playwright/test').Route, data: unknown, status = 200) =>
    route.fulfill({ status, json: { success: status < 400, status, data, message: 'OK' } })

  await page.route('**/api/v1/master-data/categories', (route) =>
    reply(route, [{ categoryId: 'category-1', categoryName: 'Toán', codePrefix: 'MA', versionId: 'version-1', version: '2025' }])
  )
  await page.route('**/api/v1/courses/main', (route) => reply(route, []))
  await page.route('**/api/v1/question-bank/**', (route) => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/v1/question-bank/labelling') return reply(route, { ready: true, reason: null })
    if (path === '/api/v1/question-bank/me/scopes') {
      return reply(route, { administrator: false, authorSubjectIds: [], reviewerSubjectIds: [] })
    }
    if (path === '/api/v1/question-bank/sources') return reply(route, [])
    quiz.unmatched.push(`${route.request().method()} ${path}`)
    return reply(route, null, 501)
  })
  await page.route('**/api/v1/ai-assistant/**', (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const method = request.method()
    if (path === `${BASE}/conversations` && method === 'GET') {
      return reply(route, { content: [conversation], pageNumber: 0, pageSize: 50, totalElements: 1, totalPages: 1, last: true })
    }
    const conversationPath = `${BASE}/conversations/${conversation.id}`
    if (path === `${conversationPath}/document`) {
      if (method === 'GET') return reply(route, stored)
      if (method === 'PUT') {
        const body = request.postDataJSON() as Record<string, unknown>
        if (body.version !== stored.version) return reply(route, stored, 409)
        stored = { ...stored, content: body.content as typeof stored.content, version: stored.version + 1 }
        saves.push(body)
        return reply(route, stored)
      }
    }
    if (path === `${conversationPath}/draft` && method === 'GET') {
      return reply(route, {
        draft: { id: 'draft-conv-9', conversationId: conversation.id, name: conversation.title, examFormat: 'VACT_2025', status: 'DRAFT' },
        items: [],
      })
    }
    if (path === `${conversationPath}/draft/bank` && method === 'GET') return reply(route, { items: [] })
    if (path === `${conversationPath}/messages` && method === 'GET') return reply(route, [])
    if (path === `${conversationPath}/stream`) return route.fulfill({ status: 200, contentType: 'text/event-stream', body: '' })
    quiz.unmatched.push(`${method} ${path}`)
    return reply(route, null, 501)
  })
  return { saves }
}

const docEditor = (page: Page) => page.getByRole('textbox', { name: 'Nội dung đề', exact: true })
const sheetCharts = (sheet: Locator) => sheet.locator('[data-chart-node]')
/** The SVG a chart's picture draws. */
const drawingOf = async (image: Locator) => decodeURIComponent((await image.getAttribute('src')) ?? '')
/** How many curves a function graph's drawing has: each is one path of its own stroke width. */
const curveCount = (svg: string) => svg.split('stroke-width="1.8"').length - 1

/** The figure of each chart of a saved document, in order. */
const savedFigures = (body: Record<string, unknown> | undefined) =>
  ((((body?.content as DocNode | undefined)?.content as DocNode[] | undefined) ?? []).filter((node) => node.type === 'chart')).map(
    (node) => ((node.attrs as DocNode).spec as DocNode).figure as DocNode
  )

async function openExam(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/console/manager/ai-assistant')
  await expect(docEditor(page)).toContainText(QUESTION, { timeout: 15_000 })
}

/** Tệp ▸ Tải xuống ▸ `item`, by keyboard: a Radix submenu closes when the pointer jumps across it. */
async function downloadFromFileMenu(page: Page, item: string) {
  await page.getByRole('menubar', { name: 'Menu đề thi' }).getByRole('menuitem', { name: 'Tệp', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Tải xuống', exact: true }).press('ArrowRight')
  const download = page.waitForEvent('download')
  await page.getByRole('menuitem', { name: item, exact: true }).press('Enter')
  return download
}

test('a function graph is edited by hand: a curve added, a wrong expression refused, the window fitted, a point marked', async ({ page }) => {
  const { saves } = await installFigureFixture(page)
  await openExam(page)
  const sheet = docEditor(page)
  const graph = sheetCharts(sheet).getByRole('img', { name: 'Đồ thị hàm số: Đồ thị bậc ba', exact: true })
  expect(curveCount(await drawingOf(graph))).toBe(1)

  await graph.dblclick()
  const dialog = page.getByRole('dialog', { name: 'Sửa đồ thị', exact: true })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('textbox', { name: 'Tiêu đề', exact: true })).toHaveValue('Đồ thị bậc ba')
  await expect(dialog.getByRole('textbox', { name: 'Hàm số 1', exact: true })).toHaveValue('x^3-3x+1')

  // A second curve, mistyped: the problem shows under it at once and keeps the graph from being saved.
  await dialog.getByRole('button', { name: 'Thêm hàm số', exact: true }).click()
  const second = dialog.getByRole('textbox', { name: 'Hàm số 2', exact: true })
  await expect(second).toBeFocused()
  await second.fill('sqrt(x')
  await expect(second).toHaveAttribute('aria-invalid', 'true')
  await expect(dialog.getByText("Thiếu dấu ')' ở cuối.", { exact: true })).toBeVisible()
  await second.fill('t^2')
  await expect(
    dialog.getByText('Không hiểu "t": chỉ dùng x, số, pi, e và sqrt abs sin cos tan ln log exp.', { exact: true })
  ).toBeVisible()
  await dialog.getByRole('button', { name: 'Lưu', exact: true }).click()
  await expect(dialog).toBeVisible()
  await expect(second).toBeFocused()
  expect(saves).toHaveLength(0)

  await second.fill('sqrt(x)')
  await expect(second).not.toHaveAttribute('aria-invalid', 'true')
  // The preview draws both curves before anything is saved; the sheet still has one.
  await expect.poll(async () => curveCount(await drawingOf(dialog.locator('img')))).toBe(2)
  expect(curveCount(await drawingOf(graph))).toBe(1)

  // A window whose top is under its bottom is refused; "Tự động" fits y to the curves over the new x range.
  await dialog.getByRole('textbox', { name: 'x nhỏ nhất', exact: true }).fill('-2')
  await dialog.getByRole('textbox', { name: 'x lớn nhất', exact: true }).fill('2,5')
  const yMax = dialog.getByRole('textbox', { name: 'y lớn nhất', exact: true })
  await yMax.fill('-5')
  await expect(dialog.getByText('Phải lớn hơn y nhỏ nhất.', { exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'Tự động', exact: true }).click()
  await expect(dialog.getByRole('textbox', { name: 'y nhỏ nhất', exact: true })).toHaveValue('-2')
  await expect(yMax).toHaveValue('10')
  await expect(dialog.getByText('Phải lớn hơn y nhỏ nhất.', { exact: true })).toHaveCount(0)

  // A point outside the window is refused; inside it, it is marked with its label.
  await dialog.getByRole('button', { name: 'Thêm điểm', exact: true }).click()
  await expect(dialog.getByRole('textbox', { name: 'Hoành độ điểm 1', exact: true })).toBeFocused()
  await page.keyboard.type('5')
  await dialog.getByRole('textbox', { name: 'Tung độ điểm 1', exact: true }).fill('-1')
  await expect(dialog.getByText('Điểm nằm ngoài khung nhìn theo x.', { exact: true })).toBeVisible()
  await dialog.getByRole('textbox', { name: 'Hoành độ điểm 1', exact: true }).fill('1')
  await dialog.getByRole('textbox', { name: 'Nhãn điểm 1', exact: true }).fill('A')
  await dialog.getByRole('button', { name: 'Thêm tiệm cận', exact: true }).click()
  await dialog.getByRole('combobox', { name: 'Loại tiệm cận 1', exact: true }).selectOption('y')
  await dialog.getByRole('textbox', { name: 'Vị trí tiệm cận 1', exact: true }).fill('8')
  await dialog.getByRole('button', { name: 'Lưu', exact: true }).click()
  await expect(dialog).toHaveCount(0)

  // The sheet draws what was entered, and the document keeps it.
  const svg = await drawingOf(graph)
  expect(curveCount(svg)).toBe(2)
  expect(svg).toContain('<circle')
  expect(svg).toContain('>A</text>')
  await expect.poll(() => savedFigures(saves.at(-1))[0]).toEqual({
    type: 'function',
    xMin: -2,
    xMax: 2.5,
    yMin: -2,
    yMax: 10,
    functions: [{ expression: 'x^3-3x+1' }, { expression: 'sqrt(x)' }],
    points: [{ x: 1, y: -1, label: 'A' }],
    asymptotes: [{ y: 8 }],
  })

  // Exported to Word, each figure is a picture of its drawing.
  const word = await downloadFromFileMenu(page, 'Word (.docx)')
  const zip = await JSZip.loadAsync(await readFile(await word.path()))
  expect(Object.keys(zip.files).filter((name) => /^word\/media\/.+\.png$/.test(name))).toHaveLength(2)
  const body = await zip.file('word/document.xml')?.async('string')
  expect(body).toContain('descr="Đồ thị hàm số: Đồ thị bậc ba"')
  expect(body).toContain('descr="Bảng biến thiên: Bảng biến thiên của f"')

  // "Xoá" takes the graph out as one undo step; Ctrl+Z brings it back as it was saved.
  await graph.dblclick()
  await expect(dialog).toBeVisible()
  // An edit of the window shows at once the problems it makes on other fields not touched yet: the bottom raised over
  // the top (said under the top), the window narrowed past the point (said under the point).
  const yMin = dialog.getByRole('textbox', { name: 'y nhỏ nhất', exact: true })
  await yMin.fill('20')
  await expect(dialog.getByText('Phải lớn hơn y nhỏ nhất.', { exact: true })).toBeVisible()
  await yMin.fill('-2')
  await dialog.getByRole('textbox', { name: 'x lớn nhất', exact: true }).fill('0,5')
  await expect(dialog.getByText('Điểm nằm ngoài khung nhìn theo x.', { exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'Xoá', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(sheetCharts(sheet)).toHaveCount(1)
  await expect(sheet).toBeFocused()
  await page.keyboard.press('Control+z')
  await expect(sheetCharts(sheet)).toHaveCount(2)
  expect(curveCount(await drawingOf(graph))).toBe(2)
})

test('a variation table is edited by hand: a column added, its signs picked, mistakes said, a value marked undefined', async ({ page }) => {
  const { saves } = await installFigureFixture(page)
  await openExam(page)
  const sheet = docEditor(page)
  const drawing = sheetCharts(sheet).getByRole('img', { name: 'Bảng biến thiên: Bảng biến thiên của f', exact: true })
  expect(await drawingOf(drawing)).not.toContain('>2</text>')

  await drawing.dblclick()
  const dialog = page.getByRole('dialog', { name: 'Sửa bảng biến thiên', exact: true })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('textbox', { name: 'Giá trị x, cột 2', exact: true })).toHaveValue('-1')
  await expect(dialog.getByRole('combobox', { name: "Dấu f'(x) giữa cột 1 và cột 2", exact: true })).toHaveValue('+')

  // A new column goes before +∞; saved empty, every cell it is missing says so and the table stays open.
  await dialog.getByRole('button', { name: 'Thêm cột', exact: true }).click()
  const x = dialog.getByRole('textbox', { name: 'Giá trị x, cột 4', exact: true })
  await expect(x).toBeFocused()
  await expect(dialog.getByRole('textbox', { name: 'Giá trị x, cột 5', exact: true })).toHaveValue('+∞')
  await dialog.getByRole('button', { name: 'Lưu', exact: true }).click()
  await expect(dialog).toBeVisible()
  await expect(x).toBeFocused()
  await expect(dialog.getByText('Nhập giá trị x.', { exact: true })).toBeVisible()
  await expect(dialog.getByText('Chọn dấu trên khoảng (?; +∞).', { exact: true })).toBeVisible()
  expect(saves).toHaveLength(0)

  // An x value out of order is refused.
  await x.fill('0')
  await expect(dialog.getByText('Phải lớn hơn giá trị x bên trái.', { exact: true })).toBeVisible()
  await x.fill('2')
  await dialog.getByRole('textbox', { name: 'Giá trị f(x), cột 4', exact: true }).fill('5')
  await dialog.getByRole('combobox', { name: "Dấu f'(x) tại cột 4", exact: true }).selectOption('0')

  // A sign against the values it joins is pointed out, without keeping the table from being saved.
  const lastSign = dialog.getByRole('combobox', { name: "Dấu f'(x) giữa cột 4 và cột 5", exact: true })
  await lastSign.selectOption('0')
  await expect(dialog.getByText('Trên khoảng (2; +∞) đạo hàm bằng 0 nhưng giá trị hàm số thay đổi.', { exact: true })).toBeVisible()
  await lastSign.selectOption('+')
  await expect(dialog.getByText(/^Trên khoảng/)).toHaveCount(0)
  // The preview shows the new column before anything is saved.
  await expect.poll(async () => drawingOf(dialog.locator('img'))).toContain('>2</text>')
  await dialog.getByRole('button', { name: 'Lưu', exact: true }).click()
  await expect(dialog).toHaveCount(0)

  expect(await drawingOf(drawing)).toContain('>2</text>')
  await expect.poll(() => savedFigures(saves.at(-1))[1]).toEqual({
    type: 'variation',
    name: 'f',
    xValues: ['-∞', '-1', '1', '2', '+∞'],
    signs: ['', '+', '0', '-', '0', '+', '0', '+', ''],
    values: ['-∞', '3', '-1', '5', '+∞'],
  })

  // Undefined at x = 1: a double bar, with the limits either side; a removed column takes one sign with it.
  await drawing.dblclick()
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Xoá cột 4', exact: true }).click()
  await expect(dialog.getByRole('textbox', { name: 'Giá trị x, cột 4', exact: true })).toHaveValue('+∞')
  // The box drawn over the input is what a person clicks; the input itself sits under it.
  await dialog.getByRole('checkbox', { name: 'Không xác định tại cột 3', exact: true }).check({ force: true })
  await dialog.getByRole('textbox', { name: 'Giới hạn bên trái, cột 3', exact: true }).fill('-∞')
  await dialog.getByRole('textbox', { name: 'Giới hạn bên phải, cột 3', exact: true }).fill('-∞')
  await dialog.getByRole('button', { name: 'Lưu', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect.poll(() => savedFigures(saves.at(-1))[1]).toEqual({
    type: 'variation',
    name: 'f',
    xValues: ['-∞', '-1', '1', '+∞'],
    signs: ['', '+', '0', '-', '||', '+', ''],
    values: ['-∞', '3', '-∞||-∞', '+∞'],
  })
  expect(await drawingOf(drawing)).not.toContain('>2</text>')

  // One Ctrl+Z takes the last edit back.
  await expect(sheet).toBeFocused()
  await page.keyboard.press('Control+z')
  await expect.poll(async () => drawingOf(drawing)).toContain('>2</text>')
})

test("a table where only f' is undefined (a cusp) keeps its double bar in the f' row and its value of f", async ({ page }) => {
  // y = |x| at x = 0: f' is undefined, f is 0.
  const cusp = {
    type: 'variation',
    name: 'f',
    xValues: ['-∞', '0', '+∞'],
    signs: ['', '-', '||', '+', ''],
    values: ['+∞', '0', '+∞'],
  }
  const { saves } = await installFigureFixture(page, {
    ...examDocument,
    content: {
      ...examDocument.content,
      content: [heading('ĐỀ KIỂM TRA TOÁN 12'), paragraph(run(QUESTION)), figureChart('Bảng biến thiên của |x|', cusp, 0.8)],
    },
  })
  await openExam(page)
  const drawing = sheetCharts(docEditor(page)).getByRole('img', { name: 'Bảng biến thiên: Bảng biến thiên của |x|', exact: true })
  await drawing.dblclick()
  const dialog = page.getByRole('dialog', { name: 'Sửa bảng biến thiên', exact: true })
  await expect(dialog).toBeVisible()
  const atZero = dialog.getByRole('combobox', { name: "Dấu f'(x) tại cột 2", exact: true })
  await expect(atZero).toHaveValue('||')
  await expect(dialog.getByRole('checkbox', { name: 'Không xác định tại cột 2', exact: true })).not.toBeChecked()
  await expect(dialog.getByRole('textbox', { name: 'Giá trị f(x), cột 2', exact: true })).toHaveValue('0')

  // Saved with only its title changed, the table is the one that was opened.
  await dialog.getByRole('textbox', { name: 'Tiêu đề', exact: true }).fill('Bảng biến thiên của y = |x|')
  await dialog.getByRole('button', { name: 'Lưu', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect.poll(() => savedFigures(saves.at(-1))[0]).toEqual(cusp)

  // The sign at an x value can be set to "||" by hand as well, and back.
  const edited = sheetCharts(docEditor(page)).getByRole('img', { name: 'Bảng biến thiên: Bảng biến thiên của y = |x|', exact: true })
  await edited.dblclick()
  await expect(dialog).toBeVisible()
  // An x value raised past the next one: the problem shows at once under the next one, which was not touched.
  const first = dialog.getByRole('textbox', { name: 'Giá trị x, cột 1', exact: true })
  await first.fill('5')
  await expect(dialog.getByText('Phải lớn hơn giá trị x bên trái.', { exact: true })).toBeVisible()
  await expect(dialog.getByRole('textbox', { name: 'Giá trị x, cột 2', exact: true })).toHaveAttribute('aria-invalid', 'true')
  await first.fill('-∞')
  await expect(dialog.getByText('Phải lớn hơn giá trị x bên trái.', { exact: true })).toHaveCount(0)
  await atZero.selectOption('0')
  await dialog.getByRole('button', { name: 'Lưu', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect.poll(() => savedFigures(saves.at(-1))[0]).toEqual({ ...cusp, signs: ['', '-', '0', '+', ''] })
  await edited.dblclick()
  await atZero.selectOption('||')
  await dialog.getByRole('button', { name: 'Lưu', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect.poll(() => savedFigures(saves.at(-1))[0]).toEqual(cusp)
})
