import fs from 'node:fs'
import path from 'node:path'
import { expect, type APIRequestContext, type Page } from '@playwright/test'

export type DemoRole = 'employee' | 'manager' | 'hr'

export const DEMO = {
  employee: {
    email: 'layla@horizon.demo',
    password: 'empulse123',
    home: '/employee/overview',
    roleFolder: 'layla',
  },
  manager: {
    email: 'yasmin@horizon.demo',
    password: 'empulse123',
    home: '/manager/overview',
    roleFolder: 'yasmin',
  },
  hr: {
    email: 'rana@horizon.demo',
    password: 'empulse123',
    home: '/hr/executive',
    roleFolder: 'rana',
  },
} as const

/** Routes from design/SCREENS.md for each role (parametric ids filled at runtime). */
export const ROLE_SCREENS: Record<
  DemoRole,
  Array<{ id: string; path: string }>
> = {
  employee: [
    { id: 'E01', path: '/employee/overview' },
    { id: 'E02', path: '/employee/performance' },
    { id: 'E03', path: '/employee/twin' },
    { id: 'E04', path: '/employee/innovation-dna' },
    { id: 'E05', path: '/employee/innovation-lab' },
    { id: 'E06', path: '/employee/marketplace' },
    { id: 'E07', path: '/employee/growth' },
    { id: 'E08', path: '/employee/recognition' },
    { id: 'E09', path: '/employee/pulseai' },
    { id: 'E10', path: '/employee/reports' },
    { id: 'E11', path: '/employee/settings' },
  ],
  manager: [
    { id: 'M01', path: '/manager/overview' },
    { id: 'M02', path: '/manager/performance' },
    { id: 'M03', path: '/manager/pulse' },
    { id: 'M04', path: '/manager/members' },
    { id: 'M04b', path: '/manager/members/:id' },
    { id: 'M05', path: '/manager/matrix' },
    { id: 'M06', path: '/manager/burnout' },
    { id: 'M07', path: '/manager/morale' },
    { id: 'M08', path: '/manager/recognition' },
    { id: 'M09', path: '/manager/innovation' },
    { id: 'M10', path: '/manager/interventions' },
    { id: 'M11', path: '/manager/reports' },
    { id: 'M12', path: '/manager/pulseai' },
    { id: 'M13', path: '/manager/settings' },
  ],
  hr: [
    { id: 'H01', path: '/hr/executive' },
    { id: 'H02', path: '/hr/organization' },
    { id: 'H02b', path: '/hr/organization/capability' },
    { id: 'H03', path: '/hr/employees' },
    { id: 'H03b', path: '/hr/employees/:id' },
    { id: 'H04', path: '/hr/teams' },
    { id: 'H05', path: '/hr/performance' },
    { id: 'H06', path: '/hr/burnout' },
    { id: 'H07', path: '/hr/morale' },
    { id: 'H08', path: '/hr/innovation' },
    { id: 'H09', path: '/hr/recognition' },
    { id: 'H10', path: '/hr/interventions' },
    { id: 'H11', path: '/hr/matrix' },
    { id: 'H12', path: '/hr/economic' },
    { id: 'H13', path: '/hr/simulator' },
    { id: 'H14', path: '/hr/reports' },
    { id: 'H15', path: '/hr/governance' },
    { id: 'H16', path: '/hr/pulseai' },
  ],
}

export async function loginViaUi(
  page: Page,
  email: string,
  password: string,
  home: string,
): Promise<void> {
  await page.goto('/login')
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.getByRole('button', { name: /enter empulse|ادخل/i }).click()
  await page.waitForURL(/\/role/, { timeout: 20_000 })
  // Already authenticated — click Continue as for this email's card
  await page.getByRole('button', { name: /continue as|متابعة/i }).first().click()
  await page.waitForURL(new RegExp(home.replace(/\//g, '\\/')), {
    timeout: 20_000,
  })
}

export async function loginViaApi(
  page: Page,
  request: APIRequestContext,
  email: string,
  password: string,
  home: string,
): Promise<string> {
  const res = await request.post('/api/auth/login/', {
    data: { email, password },
  })
  expect(res.ok(), `login ${email}`).toBeTruthy()
  const body = (await res.json()) as { access: string; refresh: string }
  await page.goto('/login')
  await page.evaluate(
    ({ access, refresh, lang }) => {
      localStorage.setItem('empulse.access', access)
      localStorage.setItem('empulse.refresh', refresh)
      localStorage.setItem('empulse.lang', lang)
      document.documentElement.lang = lang
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    },
    { access: body.access, refresh: body.refresh, lang: 'en' },
  )
  await page.goto(home)
  await page.waitForLoadState('domcontentloaded')
  return body.access
}

export async function setLanguage(page: Page, lang: 'en' | 'ar'): Promise<void> {
  await page.evaluate((lng) => {
    localStorage.setItem('empulse.lang', lng)
    document.documentElement.lang = lng
    document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr'
  }, lang)
  await page.reload({ waitUntil: 'domcontentloaded' })
  // Give i18n a tick to re-apply from storage on boot
  await page.waitForTimeout(300)
  await expect(page.locator('html')).toHaveAttribute(
    'dir',
    lang === 'ar' ? 'rtl' : 'ltr',
  )
}

export function attachCollectors(page: Page): {
  consoleErrors: string[]
  failedRequests: string[]
  setAllow403: (v: boolean) => void
} {
  const consoleErrors: string[] = []
  const failedRequests: string[] = []
  let allow403 = false
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text()
      // Vite / React DevTools noise
      if (text.includes('Download the React DevTools')) return
      consoleErrors.push(text)
    }
  })
  page.on('pageerror', (err) => {
    consoleErrors.push(String(err))
  })
  page.on('response', (res) => {
    const status = res.status()
    const url = res.url()
    if (!url.includes('/api/')) return
    if (status >= 400) {
      if (allow403 && status === 403) return
      failedRequests.push(`${status} ${url}`)
    }
  })
  return {
    consoleErrors,
    failedRequests,
    setAllow403: (v: boolean) => {
      allow403 = v
    },
  }
}

export async function assertNoHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement
    return doc.scrollWidth - doc.clientWidth
  })
  expect(overflow, 'horizontal scroll').toBeLessThanOrEqual(1)
}

export async function assertSidebarFixedWhileScroll(page: Page): Promise<void> {
  const aside = page.locator('aside').first()
  if ((await aside.count()) === 0) return
  const before = await aside.boundingBox()
  await page.locator('main').evaluate((el) => {
    el.scrollTop = Math.min(el.scrollHeight, 400)
  })
  await page.waitForTimeout(150)
  const after = await aside.boundingBox()
  expect(before?.y).toBeDefined()
  expect(after?.y).toBe(before?.y)
  await page.locator('main').evaluate((el) => {
    el.scrollTop = 0
  })
}

/**
 * Screens that always render at least one svg/canvas chart on the default view
 * once data is ready (excludes tabbed screens whose default tab has no chart).
 */
export const CHART_SCREEN_IDS = new Set([
  'E01',
  'H01',
  'H05',
  'H06',
  'H08',
  'H10',
  'H12',
  'H14',
  'M02',
  'M03',
  'M05',
  'M06',
  'M07',
])

const LOADING_RE = /Loading|جاري (التحميل|تحميل)/i

/**
 * Wait until the page is truly ready for a screenshot:
 * network idle, no Loading text / skeleton / spinner, and charts rendered
 * when the screen has them. Fails if loading text is still visible after 10s.
 */
export async function waitForPageReady(
  page: Page,
  screenId: string,
): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {
    /* some screens keep long-poll / HMR; continue with content checks */
  })

  const started = Date.now()
  while (Date.now() - started < 10_000) {
    const stillLoading = await page.evaluate((reSource) => {
      const main = document.querySelector('main')
      if (!main) return true
      return new RegExp(reSource, 'i').test(main.innerText || '')
    }, LOADING_RE.source)
    if (!stillLoading) break
    await page.waitForTimeout(100)
  }
  const stillLoading = await page.evaluate((reSource) => {
    const main = document.querySelector('main')
    if (!main) return true
    return new RegExp(reSource, 'i').test(main.innerText || '')
  }, LOADING_RE.source)
  if (stillLoading) {
    throw new Error(
      `${screenId}: loading text still visible after 10 seconds`,
    )
  }

  const busy = page.locator(
    'main [class*="skeleton"], main [class*="animate-spin"], main [aria-busy="true"]',
  )
  await expect(busy).toHaveCount(0, { timeout: 10_000 })

  if (CHART_SCREEN_IDS.has(screenId)) {
    await expect(page.locator('main svg, main canvas').first()).toBeVisible({
      timeout: 15_000,
    })
  }

  await page.waitForTimeout(200)
}

export async function saveShot(
  page: Page,
  roleFolder: string,
  screenId: string,
  lang: string,
): Promise<void> {
  const dir = path.join('e2e', 'shots', roleFolder)
  fs.mkdirSync(dir, { recursive: true })
  const file = path.join(dir, `${screenId}-${lang}.png`)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.screenshot({ path: file, fullPage: true })
}

export async function resolveManagerMemberId(
  request: APIRequestContext,
  token: string,
): Promise<string> {
  const res = await request.get('/api/manager/team/', {
    headers: { Authorization: `Bearer ${token}` },
  })
  expect(res.ok()).toBeTruthy()
  const data = (await res.json()) as { people?: { id: number }[] }
  const id = data.people?.[0]?.id
  expect(id, 'manager team member id').toBeTruthy()
  return String(id)
}

export async function resolveHrEmployeeId(
  request: APIRequestContext,
  token: string,
): Promise<string> {
  const res = await request.get('/api/hr/employees/', {
    headers: { Authorization: `Bearer ${token}` },
  })
  expect(res.ok()).toBeTruthy()
  const data = (await res.json()) as { people?: { id: number }[] }
  const id = data.people?.[0]?.id
  expect(id, 'hr employee id').toBeTruthy()
  return String(id)
}
