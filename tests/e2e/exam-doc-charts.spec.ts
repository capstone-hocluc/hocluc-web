import { expect, test, type Locator, type Page } from '@playwright/test'
import { heading, installChartsFixture, paragraph, run, tiptapDoc, type DocNode } from './exam-doc-charts-fixture'

// Charts of the exam editor as a docs app has them: Chèn ▸ Biểu đồ ▸ <kind>, the chart editor's "Thiết lập" and
// "Tùy chỉnh" tabs, every kind of data chart drawn (in print greys too), and the width dragged on the sheet.

let checkedFixture: { unmatched: string[]; pageErrors: string[] } | null = null

test.afterEach(() => {
  const fixture = checkedFixture
  checkedFixture = null
  if (!fixture) return
  expect(fixture.unmatched, 'requests without a fixture handler').toEqual([])
  expect(fixture.pageErrors, 'errors thrown in the page').toEqual([])
})

const NOTE = 'Ghi chú: làm bài trong 45 phút.'

/** A chart block as the editor stores it: a table (labels, then one column per series) and its settings. */
function chartNode(type: string, title: string, series: string[], rows: (string | number)[][], spec: Record<string, unknown> = {}): DocNode {
  return {
    type: 'chart',
    attrs: {
      data: {
        columns: [{ id: 'label', label: String(spec.xLabel ?? ''), role: 'label' }, ...series.map((label, index) => ({ id: `s${index + 1}`, label, role: 'series' }))],
        rows,
      },
      spec: { type, title, xLabel: '', yLabel: '', legend: true, palette: 'print', width: 0.85, ...spec },
    },
  }
}

/** A line chart saved before charts had options: exactly what such a document holds. */
const OLD_LINE = chartNode('line', 'Nhiệt độ trung bình', ['Hà Nội'], [['1', 16.5], ['2', 18], ['3', 21]], { xLabel: 'Tháng', yLabel: '°C' })

const CITIES = chartNode('bar', 'Lượng mưa', ['Hà Nội', 'Huế'], [['Tháng 1', 18, 160], ['Tháng 2', 26, 62], ['Tháng 3', 43, 47]])

const documentOf = (...charts: DocNode[]) =>
  tiptapDoc(heading(1, 'ĐỀ KIỂM TRA'), paragraph(run(NOTE)), ...charts, paragraph(run('--- HẾT ---', 'bold')))

const docEditor = (page: Page) => page.getByRole('textbox', { name: 'Nội dung đề', exact: true })
const sheetCharts = (page: Page) => docEditor(page).locator('[data-chart-node]')
const chartDialog = (page: Page) => page.getByRole('dialog', { name: 'Sửa biểu đồ', exact: true })

/** The SVG a picture draws. */
const drawingOf = async (image: Locator) => decodeURIComponent((await image.getAttribute('src')) ?? '')
const count = (svg: string, pattern: RegExp) => (svg.match(pattern) ?? []).length
/** The numbers written on the marks. */
const dataLabels = (svg: string) => [...svg.matchAll(/<text [^>]*data-label=""[^>]*>([^<]*)<\/text>/g)].map((match) => match[1])

async function openDocument(page: Page, content: Record<string, unknown>) {
  const fixture = await installChartsFixture(page, content)
  checkedFixture = fixture.quiz
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/console/manager/ai-assistant')
  await expect(docEditor(page)).toContainText(NOTE, { timeout: 15_000 })
  await expect(docEditor(page)).toHaveAttribute('contenteditable', 'true')
  return fixture.state
}

const savedCharts = (saves: Record<string, unknown>[]) =>
  (((saves.at(-1)?.content as DocNode | undefined)?.content as DocNode[] | undefined) ?? []).filter((node) => node.type === 'chart')

async function caretAtEndOfNote(page: Page) {
  await docEditor(page).locator(':scope > p', { hasText: NOTE }).click()
  await page.keyboard.press('End')
}

async function insertFromMenu(page: Page, kind: string) {
  await page.getByRole('menubar', { name: 'Menu đề thi' }).getByRole('menuitem', { name: 'Chèn', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Biểu đồ', exact: true }).click()
  await page.getByRole('menuitem', { name: kind, exact: true }).click()
}

/** Every colour a drawing uses is a grey: its red, green and blue lie within a few steps of each other. */
function nonGreys(svg: string): string[] {
  const colours = new Set((svg.match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g) ?? []).map((colour) => colour.toLowerCase()))
  return [...colours].filter((colour) => {
    const hex = colour.length === 4 ? colour.slice(1).split('').map((digit) => digit + digit).join('') : colour.slice(1)
    const [r, g, b] = [0, 2, 4].map((at) => parseInt(hex.slice(at, at + 2), 16))
    return Math.max(r, g, b) - Math.min(r, g, b) > 24
  })
}

test('Chèn ▸ Biểu đồ offers each kind; each puts its sample chart in and opens its editor', async ({ page }) => {
  await openDocument(page, documentOf())
  const kinds = [
    { menu: 'Cột', alt: 'Biểu đồ cột', mark: /data-mark="bar"/g, marks: 3 },
    { menu: 'Thanh', alt: 'Biểu đồ thanh', mark: /data-mark="bar"/g, marks: 3 },
    { menu: 'Đường', alt: 'Biểu đồ đường', mark: /data-mark="point"/g, marks: 4 },
    { menu: 'Tròn', alt: 'Biểu đồ tròn', mark: /data-mark="slice"/g, marks: 4 },
  ]
  for (const [index, kind] of kinds.entries()) {
    await caretAtEndOfNote(page)
    await insertFromMenu(page, kind.menu)
    const dialog = chartDialog(page)
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('tab', { name: 'Thiết lập', exact: true })).toHaveAttribute('aria-selected', 'true')
    await expect(dialog.getByRole('button', { name: kind.menu, exact: true })).toHaveAttribute('aria-pressed', 'true')
    const preview = dialog.getByRole('img', { name: kind.alt, exact: true })
    await expect(preview).toBeVisible()
    expect(count(await drawingOf(preview), kind.mark)).toBe(kind.marks)
    await dialog.getByRole('button', { name: 'Lưu', exact: true }).click()
    await expect(dialog).toHaveCount(0)
    await expect(sheetCharts(page)).toHaveCount(index + 1)
    await expect(sheetCharts(page).getByRole('img', { name: kind.alt, exact: true })).toHaveCount(1)
  }

  // A function's graph and a variation table go in drawn, and open the editor of figures.
  for (const [index, figure] of ['Đồ thị hàm số', 'Bảng biến thiên'].entries()) {
    await caretAtEndOfNote(page)
    await insertFromMenu(page, figure)
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(sheetCharts(page)).toHaveCount(kinds.length + index + 1)
    const drawing = sheetCharts(page).getByRole('img', { name: figure, exact: true })
    await expect(drawing).toHaveCount(1)
    const svg = await drawingOf(drawing)
    expect(svg).toContain(figure === 'Bảng biến thiên' ? '+∞' : '<path')
  }

  // Inserting is one undo step.
  await expect(docEditor(page)).toBeFocused()
  await page.keyboard.press('Control+z')
  await expect(sheetCharts(page)).toHaveCount(kinds.length + 1)
})

test('the chart editor sets the kind and data, then titles, legend, labels, gridlines, axis and colours, previewed and saved', async ({ page }) => {
  const state = await openDocument(page, documentOf(CITIES))
  const drawing = sheetCharts(page).getByRole('img')
  await drawing.dblclick()
  const dialog = chartDialog(page)
  await expect(dialog).toBeVisible()
  const preview = dialog.locator('img[alt^="Biểu đồ"]')
  // Two series of three months, side by side, numbered (one or two series are).
  let svg = await drawingOf(preview)
  expect(count(svg, /data-mark="bar"/g)).toBe(6)
  expect(dataLabels(svg)).toEqual(['18', '26', '43', '160', '62', '47'])
  expect(svg).toContain('data-legend="row"')

  // "Thiết lập": stacked columns, and a fourth month.
  await dialog.getByRole('button', { name: 'Cột chồng', exact: true }).click()
  await expect(dialog.getByRole('img', { name: 'Biểu đồ cột chồng: Lượng mưa', exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'Thêm dòng', exact: true }).click()
  await dialog.getByRole('textbox', { name: 'Nhãn dòng 4', exact: true }).fill('Tháng 4')
  await dialog.getByRole('textbox', { name: 'Hà Nội, dòng 4', exact: true }).fill('90,5')
  await dialog.getByRole('textbox', { name: 'Huế, dòng 4', exact: true }).fill('58')
  await expect.poll(async () => count(await drawingOf(preview), /data-mark="bar"/g)).toBe(8)
  // A stack has no numbers until they are asked for.
  expect(dataLabels(await drawingOf(preview))).toEqual([])

  // "Tùy chỉnh".
  await dialog.getByRole('tab', { name: 'Tùy chỉnh', exact: true }).click()
  await dialog.getByRole('textbox', { name: 'Tiêu đề', exact: true }).fill('Lượng mưa theo tháng')
  await dialog.getByRole('textbox', { name: 'Trục dọc', exact: true }).fill('mm')
  const legend = dialog.getByRole('group', { name: 'Chú giải', exact: true })
  await legend.getByRole('button', { name: 'Phải', exact: true }).click()
  await expect.poll(async () => await drawingOf(preview)).toContain('data-legend="column"')
  await legend.getByRole('button', { name: 'Trên', exact: true }).click()
  await expect.poll(async () => await drawingOf(preview)).toContain('data-legend="row"')
  svg = await drawingOf(preview)
  // Above the plot: under the title, over the highest gridline.
  const legendY = Number(svg.match(/<g data-legend="row">.*?<text x="[\d.]+" y="([\d.]+)"/)?.[1])
  expect(legendY).toBeLessThan(50)
  await legend.getByRole('button', { name: 'Không', exact: true }).click()
  await expect.poll(async () => await drawingOf(preview)).not.toContain('data-legend')

  await dialog.getByText('Nhãn dữ liệu', { exact: true }).click()
  await expect(dialog.getByRole('checkbox', { name: 'Nhãn dữ liệu', exact: true })).toBeChecked()
  await expect.poll(async () => dataLabels(await drawingOf(preview))).toContain('90,5')
  await dialog.getByText('Đường lưới', { exact: true }).click()
  await expect(dialog.getByRole('checkbox', { name: 'Đường lưới', exact: true })).not.toBeChecked()
  await expect.poll(async () => await drawingOf(preview)).not.toContain('#d0d4da')

  // An axis that ends before it starts is refused, and "Lưu" goes to it.
  const lowest = dialog.getByRole('textbox', { name: 'Giá trị nhỏ nhất', exact: true })
  const highest = dialog.getByRole('textbox', { name: 'Giá trị lớn nhất', exact: true })
  await lowest.fill('300')
  await highest.fill('100')
  await dialog.getByRole('tab', { name: 'Thiết lập', exact: true }).click()
  await dialog.getByRole('button', { name: 'Lưu', exact: true }).click()
  await expect(dialog.getByText('Giá trị nhỏ nhất của trục phải nhỏ hơn giá trị lớn nhất.', { exact: true })).toBeVisible()
  await expect(lowest).toBeFocused()
  await expect(lowest).toHaveAttribute('aria-invalid', 'true')
  await lowest.fill('0')
  await highest.fill('250')
  await expect.poll(async () => await drawingOf(preview)).toContain('>250</text>')

  // Colours: each series its own hue, the first changed to orange.
  await dialog.getByRole('group', { name: 'Màu', exact: true }).getByRole('button', { name: 'Màu', exact: true }).click()
  await dialog.getByRole('group', { name: 'Hà Nội', exact: true }).getByRole('button', { name: 'Cam', exact: true }).click()
  await expect.poll(async () => await drawingOf(preview)).toContain('#eb6834')

  await dialog.getByRole('button', { name: 'Lưu', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(drawing).toHaveAttribute('alt', 'Biểu đồ cột chồng: Lượng mưa theo tháng')
  svg = await drawingOf(drawing)
  expect(count(svg, /data-mark="bar"/g)).toBe(8)
  expect(svg).toContain('#eb6834')
  expect(svg).not.toContain('data-legend')
  await expect
    .poll(() => savedCharts(state.saves)[0]?.attrs)
    .toMatchObject({
      spec: {
        type: 'stackedBar',
        title: 'Lượng mưa theo tháng',
        yLabel: 'mm',
        legend: false,
        legendPosition: 'top',
        dataLabels: true,
        gridlines: false,
        yMin: 0,
        yMax: 250,
        palette: 'color',
        colors: { s1: '#eb6834' },
      },
      data: { rows: [['Tháng 1', 18, 160], ['Tháng 2', 26, 62], ['Tháng 3', 43, 47], ['Tháng 4', 90.5, 58]] },
    })

  // One undo step takes the whole edit back.
  await expect(docEditor(page)).toBeFocused()
  await page.keyboard.press('Control+z')
  await expect(drawing).toHaveAttribute('alt', 'Biểu đồ cột: Lượng mưa')
})

test('switching rows and columns turns the table over', async ({ page }) => {
  await openDocument(page, documentOf(CITIES))
  await sheetCharts(page).getByRole('img').dblclick()
  const dialog = chartDialog(page)
  await dialog.getByRole('button', { name: 'Chuyển đổi hàng/cột', exact: true }).click()
  // Three months as series, two cities as rows.
  await expect(dialog.getByRole('textbox', { name: 'Tên dãy số 3', exact: true })).toHaveValue('Tháng 3')
  await expect(dialog.getByRole('textbox', { name: 'Nhãn dòng 2', exact: true })).toHaveValue('Huế')
  await expect(dialog.getByRole('textbox', { name: 'Nhãn dòng 3', exact: true })).toHaveCount(0)
  await expect(dialog.getByRole('textbox', { name: 'Tháng 1, dòng 2', exact: true })).toHaveValue('160')
  const svg = await drawingOf(dialog.locator('img[alt^="Biểu đồ"]'))
  expect(count(svg, /data-mark="bar"/g)).toBe(6)
  // Three series take the colours of the first three; nothing is numbered with three series.
  expect(dataLabels(svg)).toEqual([])
  // Back again, as it was.
  await dialog.getByRole('button', { name: 'Chuyển đổi hàng/cột', exact: true }).click()
  await expect(dialog.getByRole('textbox', { name: 'Tên dãy số 2', exact: true })).toHaveValue('Huế')
  await expect(dialog.getByRole('textbox', { name: 'Hà Nội, dòng 3', exact: true })).toHaveValue('43')
  await page.keyboard.press('Escape')
})

test('a selected chart\'s handle drags its width, and Ctrl+Z puts it back', async ({ page }) => {
  const state = await openDocument(page, documentOf(OLD_LINE))
  const chart = sheetCharts(page)
  await expect(chart).toHaveAttribute('style', /width: 85%/)
  const handle = chart.locator('[data-chart-resize="corner"]')
  await expect(handle).toBeHidden()
  await chart.getByRole('img').click()
  await expect(handle).toBeVisible()

  const box = (await handle.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x - 60, box.y + box.height / 2, { steps: 4 })
  await page.mouse.move(box.x - 120, box.y + box.height / 2, { steps: 4 })
  await page.mouse.up()

  await expect(chart).not.toHaveAttribute('style', /width: 85%/)
  const width = Number((await chart.getAttribute('style'))?.match(/width: (\d+)%/)?.[1])
  expect(width).toBeLessThan(85)
  expect(width).toBeGreaterThanOrEqual(30)
  await expect.poll(() => (savedCharts(state.saves)[0]?.attrs as DocNode | undefined)?.spec).toMatchObject({ width: width / 100 })
  // The chart stays selected and the edit is one undo step.
  await expect(chart).toHaveClass(/ProseMirror-selectednode/)
  await page.keyboard.press('Control+z')
  await expect(chart).toHaveAttribute('style', /width: 85%/)
})

// Its marks, labels and titles are as before; only the print greys have replaced the old blue-greys.
test('a chart saved before charts had options keeps its marks and settings and opens in the editor unchanged', async ({ page }) => {
  const state = await openDocument(page, documentOf(OLD_LINE))
  const drawing = sheetCharts(page).getByRole('img', { name: 'Biểu đồ đường: Nhiệt độ trung bình', exact: true })
  await expect(drawing).toHaveCount(1)
  const svg = await drawingOf(drawing)
  expect(count(svg, /<polyline /g)).toBe(1)
  expect(count(svg, /data-mark="point"/g)).toBe(3)
  // One series: its points are numbered, its legend left out; the axes are titled.
  expect(dataLabels(svg)).toEqual(['16,5', '18', '21'])
  expect(svg).not.toContain('data-legend')
  expect(svg).toContain('>°C</text>')
  expect(svg).toContain('>Tháng</text>')
  expect(nonGreys(svg)).toEqual([])

  // "Lưu" without a change changes nothing: no undo step, nothing saved.
  await drawing.dblclick()
  const dialog = chartDialog(page)
  await dialog.getByRole('tab', { name: 'Tùy chỉnh', exact: true }).click()
  await expect(dialog.getByRole('checkbox', { name: 'Nhãn dữ liệu', exact: true })).toBeChecked()
  await expect(dialog.getByRole('checkbox', { name: 'Đường lưới', exact: true })).toBeChecked()
  // Its one series has no legend drawn, so none is the choice pressed.
  await expect(dialog.getByRole('group', { name: 'Chú giải', exact: true }).getByRole('button', { name: 'Không', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await dialog.getByRole('button', { name: 'Lưu', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await page.waitForTimeout(1500)
  expect(state.saves).toEqual([])
})

test('a chart of one series shows its legend where the teacher places it', async ({ page }) => {
  await openDocument(page, documentOf(OLD_LINE))
  await sheetCharts(page).getByRole('img', { name: 'Biểu đồ đường: Nhiệt độ trung bình', exact: true }).dblclick()
  const dialog = chartDialog(page)
  await dialog.getByRole('tab', { name: 'Tùy chỉnh', exact: true }).click()
  const preview = dialog.getByRole('img', { name: 'Biểu đồ đường: Nhiệt độ trung bình', exact: true })
  const legend = dialog.getByRole('group', { name: 'Chú giải', exact: true })
  await legend.getByRole('button', { name: 'Phải', exact: true }).click()
  await expect(legend.getByRole('button', { name: 'Phải', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(async () => await drawingOf(preview)).toContain('data-legend="column"')
  expect(await drawingOf(preview)).toContain('>Hà Nội</text>')
  await legend.getByRole('button', { name: 'Trên', exact: true }).click()
  await expect.poll(async () => await drawingOf(preview)).toContain('data-legend="row"')
  await dialog.getByRole('button', { name: 'Lưu', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  expect(await drawingOf(sheetCharts(page).getByRole('img', { name: 'Biểu đồ đường: Nhiệt độ trung bình', exact: true }))).toContain('data-legend="row"')
})

test('every kind of data chart draws, in greys only when printed, negative values under zero', async ({ page }) => {
  const months = ['Tháng 1', 'Tháng 2', 'Tháng 3']
  const twoSeries = (values: [number, number][]) => months.map((month, index) => [month, ...values[index]])
  const charts = [
    chartNode('bar', 'Cột', ['A', 'B'], twoSeries([[12, -5], [18, 9], [15, 11]])),
    chartNode('horizontalBar', 'Thanh', ['A', 'B'], twoSeries([[12, -5], [18, 9], [15, 11]])),
    chartNode('stackedBar', 'Cột chồng', ['A', 'B'], twoSeries([[12, 5], [18, 9], [15, 11]])),
    chartNode('stackedHorizontalBar', 'Thanh chồng', ['A', 'B'], twoSeries([[12, 5], [18, 9], [15, 11]])),
    chartNode('line', 'Đường', ['A', 'B'], twoSeries([[12, -5], [18, 9], [15, 11]])),
    chartNode('area', 'Vùng', ['A', 'B'], twoSeries([[12, -5], [18, 9], [15, 11]])),
    chartNode('scatter', 'Phân tán', ['y'], [['1', 2], ['2,5', 4], ['ba', 7], ['4', 3]]),
    chartNode('pie', 'Tròn', ['Số học sinh'], [['Giỏi', 8], ['Khá', 15], ['Trung bình', 12]], { dataLabels: true }),
    chartNode('donut', 'Vành khuyên', ['Số học sinh'], [['Giỏi', 8], ['Khá', 15], ['Trung bình', 12]], { dataLabels: true, sliceLabels: 'value' }),
    chartNode('combo', 'Kết hợp', ['A', 'B', 'C'], months.map((month, index) => [month, 10 + index, 4 + index, 7 - index])),
  ]
  await openDocument(page, documentOf(...charts))
  await expect(sheetCharts(page)).toHaveCount(charts.length)
  const svgOf = async (alt: string) => {
    const drawing = sheetCharts(page).getByRole('img', { name: alt, exact: true })
    await expect(drawing).toHaveCount(1)
    const svg = await drawingOf(drawing)
    expect(nonGreys(svg), `colours of ${alt}`).toEqual([])
    return svg
  }

  let svg = await svgOf('Biểu đồ tròn: Tròn')
  // A number on a slice is ringed by an unfilled white copy drawn under it, which SVG 1.1 renderers (the PDF export)
  // draw as well as browsers do, not by paint-order.
  expect(svg).not.toContain('paint-order')
  const halos = [...svg.matchAll(/<text [^>]*fill="none" stroke="#fff"[^>]*>([^<]*)<\/text>/g)].map((match) => match[1])
  expect(halos.length).toBeGreaterThan(0)
  expect(dataLabels(svg)).toEqual(expect.arrayContaining(halos))
  expect(svg).not.toMatch(/<text [^>]*fill="none"[^>]*data-label=""/)

  svg = await svgOf('Biểu đồ cột: Cột')
  expect(count(svg, /data-mark="bar"/g)).toBe(6)
  expect(dataLabels(svg)).toContain('-5')
  // The negative column hangs from the zero line: its top is where the zero line is.
  const zeroY = svg.match(/<line x1="[\d.]+" y1="([\d.]+)" x2="[\d.]+" y2="[\d.]+" stroke="#1f2328" stroke-width="1"\/>/)?.[1]
  const negative = svg.match(/<rect x="[\d.]+" y="([\d.]+)" width="[\d.]+" height="[\d.]+" fill="#[0-9a-f]+" data-mark="bar" data-series="1"\/>/)?.[1]
  expect(Number(negative)).toBeCloseTo(Number(zeroY), 0)
  expect(svg).toContain('>-5</text>')

  svg = await svgOf('Biểu đồ thanh: Thanh')
  expect(count(svg, /data-mark="bar"/g)).toBe(6)
  svg = await svgOf('Biểu đồ cột chồng: Cột chồng')
  expect(count(svg, /data-mark="bar"/g)).toBe(6)
  svg = await svgOf('Biểu đồ thanh chồng: Thanh chồng')
  expect(count(svg, /data-mark="bar"/g)).toBe(6)
  svg = await svgOf('Biểu đồ đường: Đường')
  expect(count(svg, /data-mark="line"/g)).toBe(2)
  // The second line is dashed in black and white.
  expect(svg).toMatch(/data-mark="line" data-series="0"/)
  expect(svg).toMatch(/stroke-dasharray="7 4" data-mark="line" data-series="1"/)
  svg = await svgOf('Biểu đồ vùng: Vùng')
  expect(count(svg, /data-mark="area"/g)).toBe(2)
  // Scatter: the row whose label is no number is left out.
  svg = await svgOf('Biểu đồ phân tán: Phân tán')
  expect(count(svg, /data-mark="point"/g)).toBe(3)
  svg = await svgOf('Biểu đồ tròn: Tròn')
  expect(count(svg, /data-mark="slice"/g)).toBe(3)
  expect(dataLabels(svg)).toEqual(['22,86%', '42,86%', '34,29%'])
  svg = await svgOf('Biểu đồ vành khuyên: Vành khuyên')
  expect(count(svg, /data-mark="slice"/g)).toBe(3)
  // Each slice of a donut is a ring piece: two arcs, the outer and the hole's.
  const slice = svg.match(/<path d="([^"]+)"[^>]*data-mark="slice"/)?.[1] ?? ''
  expect(count(slice, /A/g)).toBe(2)
  expect(dataLabels(svg)).toEqual(['8', '15', '12'])
  svg = await svgOf('Biểu đồ kết hợp cột và đường: Kết hợp')
  expect(count(svg, /data-mark="bar"/g)).toBe(3)
  expect(count(svg, /data-mark="line"/g)).toBe(2)

  // The editor says which scatter rows are left out.
  await sheetCharts(page).getByRole('img', { name: 'Biểu đồ phân tán: Phân tán', exact: true }).dblclick()
  await expect(chartDialog(page).getByText('Biểu đồ phân tán bỏ qua các dòng có nhãn không phải là số.', { exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
})
