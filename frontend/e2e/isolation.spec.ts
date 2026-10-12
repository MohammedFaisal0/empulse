import { test, expect } from '@playwright/test'

import {
  DEMO,
  attachCollectors,
  loginViaApi,
} from './helpers'

test.describe('role isolation', () => {
  test('layla cannot open manager/hr routes; redirected home; API 403', async ({
    page,
    request,
  }) => {
    const demo = DEMO.employee
    const collectors = attachCollectors(page)
    collectors.setAllow403(true)
    const token = await loginViaApi(
      page,
      request,
      demo.email,
      demo.password,
      demo.home,
    )

    await page.goto('/manager/overview')
    await page.waitForURL(new RegExp(demo.home.replace(/\//g, '\\/')))
    expect(page.url()).toContain(demo.home)

    await page.goto('/hr/executive')
    await page.waitForURL(new RegExp(demo.home.replace(/\//g, '\\/')))
    expect(page.url()).toContain(demo.home)

    const mgr = await request.get('/api/manager/team/', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(mgr.status()).toBe(403)

    const hr = await request.get('/api/hr/executive-pulse/', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(hr.status()).toBe(403)
  })

  test('yasmin cannot open hr routes; redirected home; API 403', async ({
    page,
    request,
  }) => {
    const demo = DEMO.manager
    const collectors = attachCollectors(page)
    collectors.setAllow403(true)
    const token = await loginViaApi(
      page,
      request,
      demo.email,
      demo.password,
      demo.home,
    )

    await page.goto('/hr/executive')
    await page.waitForURL(new RegExp(demo.home.replace(/\//g, '\\/')))
    expect(page.url()).toContain(demo.home)

    const hr = await request.get('/api/hr/executive-pulse/', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(hr.status()).toBe(403)

    // Manager may access manager APIs
    const team = await request.get('/api/manager/team/', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(team.ok()).toBeTruthy()
  })

  test('rana (hr) can open /hr/* and HR APIs', async ({ page, request }) => {
    const demo = DEMO.hr
    await loginViaApi(page, request, demo.email, demo.password, demo.home)

    await page.goto('/hr/organization')
    await expect(page).toHaveURL(/\/hr\/organization/)
    await expect(page.locator('aside')).toBeVisible()

    const token = await page.evaluate(
      () => localStorage.getItem('empulse.access') || '',
    )
    const pulse = await request.get('/api/hr/executive-pulse/', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(pulse.ok()).toBeTruthy()
  })
})
