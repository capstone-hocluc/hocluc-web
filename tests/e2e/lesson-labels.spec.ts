import { expect, test } from '@playwright/test'
import type { LessonLabelsResponse, LessonSuggestionResponse } from '../../src/types/lessonLabels'

type LabelService = typeof import('../../src/services/lessonLabelService')
type AdminService = typeof import('../../src/services/lessonAdminService')

const labels: LessonLabelsResponse = {
  lessonId: 'lesson-1', lessonTitle: 'Bài học', chapterId: 'chapter-1', chapterTitle: 'Chương 1',
  subjectCategoryId: null, subjectName: null, labelSetVersion: null, chapterDomainCodes: [],
  skills: [{
    code: 'TV.S01', primary: true, nameVi: 'Kỹ năng', domainCodes: ['TV.D01'],
    prerequisiteSkillCode: null, inActiveSet: true,
    microSkills: [{ code: 'TV.M01', nameVi: 'Kỹ năng nhỏ', suggestedDrill: null }],
  }],
  videos: [{
    videoId: 'video-1', title: 'Video', durationSeconds: null, sequence: 1,
    microSkills: [{ code: 'TV.M01', nameVi: null, skillCode: null, inActiveSet: false }],
  }],
  markers: [{
    id: 'marker-1', videoId: null, videoTitle: null, second: 530, time: '08:50',
    title: 'Mốc cũ', microSkillCode: 'TV.M01',
  }],
  microSkillCodes: ['TV.M01'], domainCodes: ['TV.D01'], patternCodes: [], prerequisiteSkillCodes: [],
}

const suggestions: LessonSuggestionResponse[] = ['MARKER', 'VIDEO', 'SKILL'].map((matchedBy) => ({
  lessonId: 'lesson-1', lessonTitle: 'Bài học', chapterId: 'chapter-1', chapterTitle: 'Chương 1',
  courseId: 'course-1', courseTitle: 'Khóa học',
  matchedBy: matchedBy as LessonSuggestionResponse['matchedBy'], primary: true,
  videoId: matchedBy === 'VIDEO' ? 'video-1' : null,
  videoTitle: matchedBy === 'VIDEO' ? 'Video' : null,
  second: matchedBy === 'SKILL' ? null : matchedBy === 'VIDEO' ? 0 : 530,
  marker: matchedBy === 'MARKER' ? labels.markers[0] : null,
}))

test('lesson label services send the new contract and preserve nullable fields and match order', async ({ page }) => {
  const calls: { path: string; query: string; method: string; body: unknown; auth: string | undefined }[] = []
  await page.route('**/api/**', async (route) => {
    const req = route.request()
    const url = new URL(req.url())
    calls.push({
      path: url.pathname, query: url.search, method: req.method(),
      body: req.postDataJSON(), auth: req.headers().authorization,
    })
    const data = url.pathname.endsWith('/by-label') || url.pathname.endsWith('/suggestions')
      ? suggestions
      : url.pathname.startsWith('/api/v1/chapters/') ? { id: 'lesson-1', labels } : labels
    await route.fulfill({ json: { success: true, data } })
  })
  await page.goto('/')
  calls.length = 0
  const result = await page.evaluate(async () => {
    localStorage.setItem('hocluc.accessToken', 'label-service-test')
    const servicePath = '/src/services/lessonLabelService.ts'
    const adminPath = '/src/services/lessonAdminService.ts'
    const service: LabelService = await import(/* @vite-ignore */ servicePath)
    const admin: AdminService = await import(/* @vite-ignore */ adminPath)
    return {
      labels: await service.getLessonLabels('lesson/1'),
      skills: await service.replaceLessonSkills('lesson/1', { skills: [{ code: 'TV.S01', primary: true }] }),
      video: await service.replaceVideoMicroSkills('lesson/1', 'video/1', { microSkills: ['TV.M01'] }),
      markers: await service.replaceMarkers('lesson/1', {
        markers: [{ videoId: 'video-1', second: 530, title: 'Ôn lại', microSkillCode: 'TV.M01' }],
      }),
      bySkill: await service.findByLabel({ skillCode: 'TV.S01 & test' }),
      byMicro: await service.findByLabel({ microSkillCode: 'TV.M01' }),
      suggestions: await service.getLessonSuggestions({ microSkillCode: 'TV.M01', skillCode: 'TV.S01' }),
      lesson: await admin.getAdminLesson('chapter/1', 'lesson/1'),
    }
  })
  expect(result.labels).toEqual(labels)
  for (const key of ['skills', 'video', 'markers'] as const) expect(result[key]).toEqual(labels)
  expect(result.bySkill).toEqual(suggestions)
  expect(result.byMicro).toEqual(suggestions)
  expect(result.suggestions).toEqual(suggestions)
  expect(result.lesson.labels).toEqual(labels)
  expect(calls).toEqual([
    { path: '/api/v1/authoring/lessons/lesson%2F1/labels', query: '', method: 'GET', body: null, auth: 'Bearer label-service-test' },
    { path: '/api/v1/authoring/lessons/lesson%2F1/labels', query: '', method: 'PUT', body: { skills: [{ code: 'TV.S01', primary: true }] }, auth: 'Bearer label-service-test' },
    { path: '/api/v1/authoring/lessons/lesson%2F1/videos/video%2F1/labels', query: '', method: 'PUT', body: { microSkills: ['TV.M01'] }, auth: 'Bearer label-service-test' },
    { path: '/api/v1/authoring/lessons/lesson%2F1/markers', query: '', method: 'PUT', body: { markers: [{ videoId: 'video-1', second: 530, title: 'Ôn lại', microSkillCode: 'TV.M01' }] }, auth: 'Bearer label-service-test' },
    { path: '/api/v1/authoring/lessons/by-label', query: '?skillCode=TV.S01+%26+test', method: 'GET', body: null, auth: 'Bearer label-service-test' },
    { path: '/api/v1/authoring/lessons/by-label', query: '?microSkillCode=TV.M01', method: 'GET', body: null, auth: 'Bearer label-service-test' },
    { path: '/api/v1/lessons/suggestions', query: '?skillCode=TV.S01&microSkillCode=TV.M01', method: 'GET', body: null, auth: 'Bearer label-service-test' },
    { path: '/api/v1/chapters/chapter%2F1/lessons/lesson%2F1', query: '', method: 'GET', body: null, auth: 'Bearer label-service-test' },
  ])
})

test('empty replacements and suggestions with a single code are supported', async ({ page }) => {
  const bodies: unknown[] = []
  const queries: string[] = []
  await page.route('**/api/**', async (route) => {
    const req = route.request()
    if (req.method() === 'PUT') bodies.push(req.postDataJSON())
    const url = new URL(req.url())
    if (url.pathname.endsWith('/suggestions')) queries.push(url.search)
    await route.fulfill({ json: { success: true, data: req.method() === 'PUT' ? labels : [] } })
  })
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const servicePath = '/src/services/lessonLabelService.ts'
    const service: LabelService = await import(/* @vite-ignore */ servicePath)
    await service.replaceLessonSkills('lesson-1', { skills: [] })
    await service.replaceVideoMicroSkills('lesson-1', 'video-1', { microSkills: [] })
    await service.replaceMarkers('lesson-1', { markers: [] })
    return [
      await service.getLessonSuggestions({ skillCode: 'TV.S01' }),
      await service.getLessonSuggestions({ microSkillCode: 'TV.M01' }),
      await service.findByLabel({ skillCode: 'TV.S01' }),
    ]
  })
  expect(bodies).toEqual([{ skills: [] }, { microSkills: [] }, { markers: [] }])
  expect(queries).toEqual(['?skillCode=TV.S01', '?microSkillCode=TV.M01'])
  expect(result).toEqual([[], [], []])
})

test('backend validation errors retain ApiError metadata and missing data fails', async ({ page }) => {
  await page.route('**/api/**', async (route) => {
    if (route.request().method() === 'PUT') {
      await route.fulfill({ status: 400, json: {
        success: false, message: 'The lesson labels are invalid.', code: 'LESSON_LABEL_INVALID',
        errors: { skills: 'Give exactly one primary skill.' },
      } })
    } else {
      await route.fulfill({ json: { success: true } })
    }
  })
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const servicePath = '/src/services/lessonLabelService.ts'
    const apiPath = '/src/lib/api.ts'
    const service: LabelService = await import(/* @vite-ignore */ servicePath)
    const { ApiError }: typeof import('../../src/lib/api') = await import(/* @vite-ignore */ apiPath)
    let validation: unknown
    let missing: unknown
    try { await service.replaceLessonSkills('lesson-1', { skills: [] }) } catch (error) {
      if (error instanceof ApiError) {
        validation = { status: error.status, code: error.code, message: error.message, errors: error.errors }
      }
    }
    try { await service.getLessonLabels('lesson-1') } catch (error) {
      missing = error instanceof Error ? error.message : null
    }
    return { validation, missing }
  })
  expect(result.validation).toEqual({
    status: 400, code: 'LESSON_LABEL_INVALID', message: 'The lesson labels are invalid.',
    errors: { skills: 'Give exactly one primary skill.' },
  })
  expect(result.missing).toBe('Không nhận được dữ liệu nhãn bài học.')
})
