import { expect, test } from '@playwright/test'
import { installQuizFixture, QUIZ_IDS } from './quiz-permissions-fixture'

const option = (id: string, label: string, text: string, correct = false) => ({ id, label, sequence: label.charCodeAt(0) - 64, text, correct })
const question = (id: string, sequence: number, text: string, options: ReturnType<typeof option>[], extra: Record<string, unknown> = {}) => ({
  id, sequence, sectionId: 'section-1', groupId: null, questionText: text, questionType: 'SINGLE_CHOICE', categoryId: null,
  categoryName: null, explanation: null, imageUrl: null, sourcePage: null, marks: 1, marksFixed: false, needsReview: false,
  reviewNote: null, correctLabels: 'A', options, ...extra,
})

test('the quiz reads as a printed paper: part title, shared passage, bold question numbers, options laid out by length', async ({ page }) => {
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
            question('q-1', 1, 'Giải phương trình $x^2 = 4$.', [option('o1', 'A', '$2$', true), option('o2', 'B', '$-2$'), option('o3', 'C', '$\\pm 2$'), option('o4', 'D', '$4$')]),
            question('q-2', 2, 'Phát biểu nào sau đây đúng?', [
              option('o5', 'A', 'Số học sinh nam nhiều hơn số học sinh nữ trong lớp học này', true),
              option('o6', 'B', 'Số học sinh nữ nhiều hơn số học sinh nam trong lớp học này'),
              option('o7', 'C', 'Số học sinh nam bằng số học sinh nữ trong toàn bộ lớp học'),
              option('o8', 'D', 'Không đủ dữ kiện để kết luận về số học sinh của lớp học'),
            ], { groupId: 'group-1' }),
          ],
        },
      },
    })
  })
  await page.goto('/console/teacher/quizzes')
  await page.getByRole('button', { name: 'Xem nội dung', exact: true }).click()
  await page.getByRole('tab', { name: 'Bản in' }).click()

  const paper = page.getByRole('article', { name: 'Bản in bài kiểm tra' })
  await expect(paper.getByRole('heading', { name: 'Quiz được giao' })).toBeVisible()
  await expect(paper.getByText('Thời gian làm bài: 150 phút · 2 câu')).toBeVisible()
  await expect(paper.getByRole('heading', { name: 'Phần 2. Toán học' })).toBeVisible()
  await expect(paper.getByText('Dựa vào thông tin dưới đây để trả lời câu 2')).toBeVisible()
  await expect(paper.getByText('Một trường học có 40 học sinh.')).toBeVisible()
  await expect(paper.locator('strong', { hasText: 'Câu 1:' })).toBeVisible()
  const lists = paper.locator('.quiz-paper-options')
  await expect(lists.nth(0)).toHaveAttribute('data-columns', '4')
  await expect(lists.nth(1)).toHaveAttribute('data-columns', '1')
  expect(await paper.evaluate(element => getComputedStyle(element).fontFamily)).toContain('Times New Roman')
  await expect(page.getByRole('button', { name: 'Tải PDF' })).toBeVisible()
  expect(state.unmatched).toEqual([]); expect(state.pageErrors).toEqual([])
})
