# Step 9a QA report

Date: 2026-10-12

## Backend
- `python manage.py test`: **70 tests OK** (~170s)
- Fixed: PulseAI stub assertions → real engine; `no_people_ranking` on PulseAI answers
- Fixed: sklearn feature-name warnings via DataFrame columns in `ml/empulse_ml.py`

## Frontend
- `npm run build` (tsc + vite): **OK**
- Fixed: `MiniSparkline` SVG `dir` → `style.direction`; E03 optional `wellbeing_score`

## E2E (Playwright, system Chrome channel)
- Isolation: **3 passed**
- Smoke: **3 passed** (employee / manager / hr × EN + AR)
- Screenshots: `frontend/e2e/shots/<role>/<ID>-<lang>.png`

### Routes covered (from design/SCREENS.md)
- **layla (employee):** E01–E11 (11 × en/ar)
- **yasmin (manager):** M01–M13 incl. M04b (14 × en/ar)
- **rana (hr):** H01–H16 incl. H02b, H03b (18 × en/ar)

Per visit: no console errors, no failed `/api` calls, no horizontal overflow, sidebar `y` fixed while `main` scrolls, `html[dir]` = `rtl` in Arabic.

### Isolation
- Layla → `/manager/*`, `/hr/*` redirects to `/employee/overview`; API 403 on manager/hr
- Yasmin → `/hr/*` redirects to `/manager/overview`; API 403 on HR pulse
- Rana → `/hr/*` OK; HR API 200

## Failures found (fixed during harness)
1. `test_pulseai_org_stub_aggregates_only` expected `stub: true`
2. `test_executive_can_access_batch3d_aggregates` missing `no_people_ranking` on PulseAI
3. TS build: MiniSparkline `dir`, E03 `wellbeing_score | undefined`
