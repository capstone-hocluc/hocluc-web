import { expect, test, type Page } from '@playwright/test'
import { fixtureProblems, IDS, installCrudFixture } from './core-crud-fixture'

/** The teacher's Zoom account as the API holds it, plus the PUT bodies it was given. */
async function installZoomAccount(page: Page, initial: string | null, refuseWith?: string) {
  let zoomEmail = initial
  const written: unknown[] = []
  await page.route(
    (url) => url.pathname === `/api/v1/users/${IDS.teacher}/zoom-account`,
    async (route) => {
      const request = route.request()
      if (request.method() === 'PUT') {
        written.push(request.postDataJSON())
        if (refuseWith) {
          return route.fulfill({
            status: 409,
            json: { success: false, status: 409, code: refuseWith, message: 'This Zoom account is already given to another teacher.' },
          })
        }
        zoomEmail = (request.postDataJSON() as { zoomEmail: string }).zoomEmail || null
      }
      await route.fulfill({ json: { success: true, status: 200, message: 'OK', data: { zoomEmail, zoomEnabled: true } } })
    }
  )
  return { written }
}

async function openZoomTab(page: Page, path = '/admin/users') {
  await page.goto(path)
  await page.getByRole('row', { name: /Giáo viên QA/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Chi tiết tài khoản', exact: true })
  await dialog.getByRole('tab', { name: 'Zoom', exact: true }).click()
  return dialog
}

test.afterEach(async ({ page }) => {
  expect(fixtureProblems(page)).toMatchObject({ unmatchedRequests: [], pageErrors: [] })
})

test('an administrator gives a teacher the Zoom account their classes are hosted on', async ({ page }) => {
  await installCrudFixture(page, 'ADMINISTRATOR')
  const { written } = await installZoomAccount(page, null)
  const dialog = await openZoomTab(page)

  await expect(dialog.getByText('Giáo viên này chưa được cấp tài khoản Zoom.')).toBeVisible()
  await dialog.getByLabel('Email tài khoản Zoom').fill('zoom1@hocluc.test')
  await dialog.getByRole('button', { name: 'Lưu', exact: true }).click()

  await expect(dialog.getByText('Đã lưu tài khoản Zoom.')).toBeVisible()
  await expect(dialog.getByText('Giáo viên này chưa được cấp tài khoản Zoom.')).toBeHidden()
  await expect(dialog.getByLabel('Email tài khoản Zoom')).toHaveValue('zoom1@hocluc.test')
  expect(written).toEqual([{ zoomEmail: 'zoom1@hocluc.test' }])
})

test('a Zoom account already given to another teacher is refused in Vietnamese', async ({ page }) => {
  await installCrudFixture(page, 'ADMINISTRATOR')
  await installZoomAccount(page, null, 'ZOOM_ACCOUNT_TAKEN')
  const dialog = await openZoomTab(page)

  await dialog.getByLabel('Email tài khoản Zoom').fill('zoom1@hocluc.test')
  await dialog.getByRole('button', { name: 'Lưu', exact: true }).click()

  await expect(dialog.getByText('Tài khoản Zoom này đã được cấp cho giáo viên khác.')).toBeVisible()
})

test('staff see the teacher Zoom account but cannot change it', async ({ page }) => {
  await installCrudFixture(page, 'STAFF')
  const { written } = await installZoomAccount(page, 'zoom1@hocluc.test')
  const dialog = await openZoomTab(page, '/console/staff/users')

  await expect(dialog.getByText('zoom1@hocluc.test', { exact: true })).toBeVisible()
  await expect(dialog.getByLabel('Email tài khoản Zoom')).toHaveCount(0)
  expect(written).toEqual([])
})
