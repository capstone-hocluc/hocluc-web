import { expect, test } from '@playwright/test'
import { installQuizFixture, QUIZ_IDS } from './quiz-permissions-fixture'

const option = (id: string, label: string, text: string, correct = false) => ({ id, label, sequence: label.charCodeAt(0) - 64, text, correct })
const question = (id: string, sequence: number, text: string, options: ReturnType<typeof option>[], extra: Record<string, unknown> = {}) => ({
  id, sequence, sectionId: 'section-1', groupId: null, questionText: text, questionType: 'SINGLE_CHOICE', categoryId: null,
  categoryName: null, explanation: null, imageUrl: null, sourcePage: null, marks: 1, marksFixed: false, needsReview: false,
  reviewNote: null, correctLabels: 'A', options, ...extra,
})

test('a quiz is read on the A4 sheets of the exam workspace or as a dense list, answers beside the questions', async ({ page }) => {
  const state = await installQuizFixture(page, 'TEACHER')
  await page.route(`**/api/v1/teacher/quizzes/${QUIZ_IDS.quiz}`, async route => {
    if (route.request().method() !== 'GET') return route.fallback()
    return route.fulfill({
      json: {
        success: true, status: 200,
        data: {
          quiz: { ...state.quizzes[0], durationMinutes: 150 },
          sections: [{ id: 'section-1', parentId: null, title: 'Phần 2. Toán học', sequence: 1, categoryId: null, categoryName: null,
            suggestedMinutes: null, questionCount: 2, firstQuestion: 1, lastQuestion: 2, children: [] }],
          groups: [{ id: 'group-1', sectionId: 'section-1', instruction: null, passage: 'Một trường học có 40 học sinh.', imageUrl: null,
            sourcePage: null, sequence: 1, firstQuestion: 2, lastQuestion: 2, questionIds: ['q-2'] }],
          questions: [
            question('q-1', 1, 'Giải phương trình $x^2 = 4$ với $x > 0$.', [option('o1', 'A', '$2$', true), option('o2', 'B', '$-2$'), option('o3', 'C', '$\\pm 2$'), option('o4', 'D', '$4$')],
              { explanation: 'Vì $2^2 = 4$ và $2 > 0$.' }),
            question('q-2', 2, 'Phát biểu nào sau đây đúng?', [
              option('o5', 'A', 'Số học sinh nam nhiều hơn số học sinh nữ trong lớp học này', true),
              option('o6', 'B', 'Số học sinh nữ nhiều hơn số học sinh nam trong lớp học này'),
              option('o7', 'C', 'Số học sinh nam bằng số học sinh nữ trong toàn bộ lớp học'),
              option('o8', 'D', 'Không đủ dữ kiện để kết luận về số học sinh của lớp học'),
            ], { groupId: 'group-1', needsReview: true, reviewNote: 'Kiểm tra lại số liệu' }),
          ],
        },
      },
    })
  })
  await page.goto('/console/teacher/quizzes')
  await page.getByRole('button', { name: 'Xem nội dung', exact: true }).click()

  // The sheets come first: the title, time, part, shared passage and numbered questions as the assistant lays them out.
  await expect(page.getByRole('tab', { name: 'Giấy A4', exact: true })).toHaveAttribute('aria-selected', 'true')
  const sheet = page.getByLabel('Đề Quiz được giao (chỉ đọc)')
  await expect(sheet.getByRole('heading', { name: 'QUIZ ĐƯỢC GIAO' })).toBeVisible()
  await expect(sheet.getByText('Thời gian làm bài: 150 phút')).toBeVisible()
  await expect(sheet.getByRole('heading', { name: 'PHẦN 2. TOÁN HỌC' })).toBeVisible()
  await expect(sheet.getByText('Dựa vào thông tin dưới đây để trả lời câu 2')).toBeVisible()
  await expect(sheet.getByText('Một trường học có 40 học sinh.')).toBeVisible()
  await expect(sheet.locator('strong', { hasText: 'Câu 1.' })).toBeVisible()
  await expect(sheet.locator('strong', { hasText: 'Câu 2.' })).toBeVisible()
  expect(await sheet.evaluate(element => getComputedStyle(element).fontFamily)).toContain('Times New Roman')
  await expect(page.getByText('1 trang A4')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Tải PDF' })).toBeEnabled()

  // A mouse pick does not ring the tab it lands on.
  const listTab = page.getByRole('tab', { name: 'Danh sách', exact: true })
  await listTab.click()
  expect(await listTab.evaluate(element => getComputedStyle(element).outlineStyle)).toBe('none')

  // The list: the question and its options on the left, the answer and its explanation on the right.
  const list = page.getByRole('list', { name: 'Câu hỏi và lời giải' })
  await expect(list.getByText('Phần 2. Toán học')).toBeVisible()
  const first = list.getByRole('listitem', { name: 'Câu 1' })
  await expect(first.getByText('Đáp án: A')).toBeVisible()
  await expect(first.getByText(/^Vì/)).toBeVisible()
  await expect(list.getByText('Dựa vào thông tin dưới đây để trả lời câu 2')).toBeVisible()
  const second = list.getByRole('listitem', { name: 'Câu 2' })
  await expect(second.getByText('Cần rà soát: Kiểm tra lại số liệu')).toBeVisible()
  const [question1, answer1] = await Promise.all([
    first.getByText(/^Giải phương trình/).boundingBox(),
    first.getByText('Đáp án: A').boundingBox(),
  ])
  expect(answer1!.x).toBeGreaterThan(question1!.x + question1!.width)
  // The sheets are not built while the list is shown.
  await expect(page.locator('.exam-doc-sheet')).toHaveCount(0)

  // The choice is kept for the next quiz opened.
  await page.getByRole('button', { name: 'Quay lại danh sách' }).click()
  await page.getByRole('button', { name: 'Xem nội dung', exact: true }).click()
  await expect(page.getByRole('tab', { name: 'Danh sách', exact: true })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('list', { name: 'Câu hỏi và lời giải' })).toBeVisible()
  expect(state.unmatched).toEqual([]); expect(state.pageErrors).toEqual([])
})
