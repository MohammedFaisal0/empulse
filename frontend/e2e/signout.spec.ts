import { test, expect } from '@playwright/test'

import { DEMO, loginViaApi, setLanguage } from './helpers'

test.describe('sign out', () => {
  test('layla signs out, private routes redirect, yasmin can login', async ({
    page,
    request,
  }) => {
    test.setTimeout(120_000)
    const layla = DEMO.employee
    const yasmin = DEMO.manager

    await loginViaApi(
      page,
      request,
      layla.email,
      layla.password,
      layla.home,
    )
    await expect(page).toHaveURL(new RegExp(layla.home.replace(/\//g, '\\/')))

    // EN: open account menu and sign out
    await setLanguage(page, 'en')
    await page.getByRole('button', { name: /account menu/i }).click()
    await expect(page.getByRole('menuitem', { name: /sign out/i })).toBeVisible()
    await expect(
      page.getByRole('menuitem', { name: /switch account/i }),
    ).toBeVisible()
    await page.getByRole('menuitem', { name: /sign out/i }).click()
    await page.waitForURL(/\/login/)
    await expect(page).toHaveURL(/\/login/)

    const tokensAfter = await page.evaluate(() => ({
      access: localStorage.getItem('empulse.access'),
      refresh: localStorage.getItem('empulse.refresh'),
    }))
    expect(tokensAfter.access).toBeNull()
    expect(tokensAfter.refresh).toBeNull()

    // Back must not restore a private session
    await page.goto(layla.home)
    await page.waitForURL(/\/login/)
    await expect(page).toHaveURL(/\/login/)

    // AR labels on a fresh employee session
    await loginViaApi(
      page,
      request,
      layla.email,
      layla.password,
      layla.home,
    )
    await setLanguage(page, 'ar')
    await page.getByRole('button', { name: /قائمة الحساب/i }).click()
    await expect(
      page.getByRole('menuitem', { name: 'تسجيل الخروج' }),
    ).toBeVisible()
    await expect(
      page.getByRole('menuitem', { name: 'تبديل الحساب' }),
    ).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(
      page.getByRole('menuitem', { name: 'تسجيل الخروج' }),
    ).toHaveCount(0)

    // Switch account → /role
    await page.getByRole('button', { name: /قائمة الحساب/i }).click()
    await page.getByRole('menuitem', { name: 'تبديل الحساب' }).click()
    await page.waitForURL(/\/role/)
    await expect(page).toHaveURL(/\/role/)

    // Yasmin login works after sign-out
    await loginViaApi(
      page,
      request,
      yasmin.email,
      yasmin.password,
      yasmin.home,
    )
    await expect(page).toHaveURL(new RegExp(yasmin.home.replace(/\//g, '\\/')))
    await expect(page.locator('aside')).toBeVisible()
  })
})
