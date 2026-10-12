import { test, expect } from '@playwright/test'

import {
  DEMO,
  ROLE_SCREENS,
  assertNoHorizontalScroll,
  assertSidebarFixedWhileScroll,
  attachCollectors,
  loginViaApi,
  resolveHrEmployeeId,
  resolveManagerMemberId,
  saveShot,
  setLanguage,
  waitForPageReady,
  type DemoRole,
} from './helpers'

const ROLES: DemoRole[] = ['employee', 'manager', 'hr']
const LANGS: Array<'en' | 'ar'> = ['en', 'ar']

test.describe.configure({ mode: 'serial' })

for (const role of ROLES) {
  test(`smoke ${role}: all SCREENS.md routes EN + AR`, async ({
    page,
    request,
  }) => {
    test.setTimeout(10 * 60_000)
    const demo = DEMO[role]
    const collectors = attachCollectors(page)
    const token = await loginViaApi(
      page,
      request,
      demo.email,
      demo.password,
      demo.home,
    )

    let memberId = '1'
    if (role === 'manager') {
      memberId = await resolveManagerMemberId(request, token)
    } else if (role === 'hr') {
      memberId = await resolveHrEmployeeId(request, token)
    }

    const screens = ROLE_SCREENS[role].map((s) => ({
      ...s,
      path: s.path.replace(':id', memberId),
    }))

    for (const lang of LANGS) {
      collectors.consoleErrors.length = 0
      collectors.failedRequests.length = 0
      await setLanguage(page, lang)
      await expect(page.locator('html')).toHaveAttribute(
        'dir',
        lang === 'ar' ? 'rtl' : 'ltr',
      )

      for (const screen of screens) {
        collectors.consoleErrors.length = 0
        collectors.failedRequests.length = 0
        await page.goto(screen.path, { waitUntil: 'domcontentloaded' })
        await waitForPageReady(page, screen.id)

        // Stay on intended route (no bounce to login)
        expect(page.url()).toContain(screen.path.split('?')[0])

        await assertNoHorizontalScroll(page)
        await assertSidebarFixedWhileScroll(page)
        await saveShot(page, demo.roleFolder, screen.id, lang)

        expect(
          collectors.consoleErrors,
          `${screen.id} ${lang} console`,
        ).toEqual([])
        expect(
          collectors.failedRequests,
          `${screen.id} ${lang} network`,
        ).toEqual([])
      }
    }
  })
}
