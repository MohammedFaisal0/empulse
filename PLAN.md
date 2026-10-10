# EMPULSE: Build Plan

كيف نشتغل: كل خطوة لها **"Done when"**. ما ننتقل للخطوة اللي بعدها إلا لما تتحقق.
الخطوات المكتوب عليها **[Cursor]** تلصق الأمر حقها في Cursor. الخطوات المكتوب عليها **[Claude]** أسويها أنا. بعد كل خطوة: شغّل، جرّب، ثم `git commit`.

Roles: **Cursor** writes the app code. **Claude** builds data, ML models, reviews Cursor's work against Figma. **You** run, test, commit.

---

## Step 0: Setup [You]
Install (Windows):
- Python 3.12 (tick "Add python.exe to PATH")
- Node.js LTS
- Git
- Cursor

Then in a terminal:
```
cd D:\Projects_all\empulse
git init
git add .
git commit -m "Design pack and plan"
```
Create a **private** repo on GitHub and push (`git remote add origin ...`, `git push -u origin main`).

Design access: Cursor has browsing and access to the Figma design through these links (use them whenever a screen needs to be checked). Each screen's node id is in `design/SCREENS.md`.
- Design file: https://www.figma.com/design/sowTLuN4SOe7KBHfnkBFAm/Final-design?node-id=0-1&t=J2BMjRY7CI0ljF3B-1
- Prototype: https://www.figma.com/proto/sowTLuN4SOe7KBHfnkBFAm/Final-design?node-id=54-1384&p=f&t=8eBViAhCFoY9huNl-1&scaling=min-zoom&content-scaling=fixed&page-id=0%3A1&starting-point-node-id=54%3A1384

PNG export into `design/png/` (see `design/README.md`) is optional. If the PNG exists, Cursor uses it; if not, it opens the Figma link.

**Done when:** `python --version`, `node --version`, `git --version` all print versions, and the Figma links open for Cursor.

---

## Step 1: Scaffold [Cursor]
Open the folder `D:\Projects_all\empulse` in Cursor. Paste:

```
Read .cursor/rules/empulse.mdc, README.md and PLAN.md first.
Do Step 1 only: scaffold the project.

1. backend/: Django 5 project named "config" with apps accounts, org, pulse, innovation, interventions, analytics.
   Install Django, djangorestframework, djangorestframework-simplejwt, drf-spectacular, django-cors-headers, python-dotenv.
   SQLite for dev; read DATABASE_URL from env if set. CORS allow http://localhost:5173.
   Add requirements.txt, .env.example, and a /api/health/ endpoint returning {"status":"ok"}.
   Swagger UI at /api/docs/.
2. frontend/: Vite + React 18 + TypeScript (strict) + Tailwind CSS + react-router-dom + @tanstack/react-query + recharts + lucide-react + @fontsource/dm-sans + @fontsource/dm-mono.
   A single page that calls /api/health/ and shows the result.
   Vite dev proxy: /api -> http://localhost:8000.
3. ml/ and docs/ as empty folders with a .gitkeep.
4. Root .gitignore for Python, Node, .env, db.sqlite3, .venv.
Do not build any screen yet.
When done, tell me exact commands to run both servers.
```

**Done when:** backend runs on :8000, frontend on :5173, and the frontend page shows `ok` from the health endpoint.

---

## Step 2: Design system and app shell [Cursor]
```
Do Step 2 only: design system in code.

1. Read design/tokens.json. Put every color, radius, shadow and font into tailwind.config.ts as named tokens (navy, navy2, teal, tealDark, tealLight, ink, muted, faint, surface, border, coral, amber, violet, tier.gold/silver/bronze/growth, semantic.thriving/burnoutRisk/...). Fonts: sans = DM Sans, mono = DM Mono. Base font size 13px, text color ink, page background surface.
2. Build shared components in frontend/src/components/ui/, matching the Figma look (look at screens E01, M01, H01 in the design to see them):
   Card, Badge (tones: teal, coral, amber, violet, slate), Button (primary navy, secondary outline, accent coral), Stat (label in DM Mono uppercase + big number + delta), Medallion (tier ring with score), Tabs, Table, Avatar (initials), Chip, ProgressBar, SectionHeading.
3. App shell in frontend/src/layout/: Sidebar (three different looks, see design/tokens.json "sidebars": Employee and Manager are white with a light border, 248px; HR is navy, 256px), TopBar (breadcrumb in DM Mono, search "Ask PulseAI" with ⌘K, date range, bell), and three sidebar configs (employee, manager, hr) with the exact item names from design/SCREENS.md.
4. A /design-preview route that shows every component, so I can compare with Figma.
No data fetching yet.
```
**Done when:** `/design-preview` looks like the Figma components, and the three sidebars match the PNGs.

---

## Step 3: Data and schema [Claude] ✅ DONE
I generate (you do nothing but commit):
- `data/generated/`: 1,240 employees, 6 departments, 31 teams, the named demo people, 12 months of weekly history, interventions, ideas, recognitions, outcomes.
- `docs/DATA_SCHEMA.md`: every table and column, so Cursor builds models that match.
- `ml/`: analysis notebook, burnout model, attrition model, SHAP explanations, saved `.pkl` files, accuracy report.

**Done when:** `data/generated/*.csv`, `docs/DATA_SCHEMA.md` and `ml/models/*.pkl` exist. (Done. See `ml/README.md` for how to use the models from Django.)

---

## Step 4: Database models and import [Cursor]
```
Read docs/DATA_SCHEMA.md and ml/README.md and do Step 4 only.
Create Django models for every table in the schema, with migrations, admin registration, and indexes on foreign keys and date columns.
Write a management command `seed_demo` that loads data/generated/*.csv, and creates 3 demo users (password empulse123):
layla@horizon.demo (employee, linked to Layla Haddad), yasmin@horizon.demo (manager of Platform Reliability), rana@horizon.demo (hr).
The command must be idempotent (safe to run twice).
Also add the exact pinned versions from ml/requirements.txt (scikit-learn, numpy, pandas, joblib) to backend/requirements.txt, because the model pickles only load with those versions.
Load CSVs with the standard csv module or pandas; weekly_metrics.csv has 64,480 rows, so use bulk_create in batches.
```
**Done when:** `python manage.py seed_demo` runs clean and the Django admin shows 1,240 employees.

---

## Step 5: Auth and permissions [Cursor]
```
Do Step 5 only.
- JWT login endpoint POST /api/auth/login/, refresh, and GET /api/users/me/ (returns role, employee id, name, team).
- Roles: employee, manager, hr, executive, admin.
- DRF permission classes and queryset filters that enforce the privacy rules in .cursor/rules/empulse.mdc:
  employee -> own record only; manager -> direct reports only; hr -> all, but every individual profile read writes an AuditLog row; executive -> aggregate endpoints only.
- Aggregate helper that suppresses any group with fewer than 5 people.
- Tests (pytest or Django TestCase) proving: an employee cannot read another employee, a manager cannot read someone outside their team, a small group is suppressed.
```
**Done when:** the tests pass.

---

## Step 6: Slice 1, first full vertical slice [Cursor, Claude reviews]
Screens: **A01 Login, A02 Role Routing, M06 Burnout Early Warning, M04b Team Member Profile.**

```
Do Step 6 only. Look at screens A01, A02, M06 and M04b in the design (PNG if present, otherwise the Figma link) and read their rows in design/SCREENS.md.
Build these four screens pixel-faithfully, wired to real data:
- A01 login and A02 role routing with the JWT endpoints; after login redirect to the role's home.
- M06: list of at-risk team members from GET /api/manager/burnout/ (risk %, change in 6 weeks, "Explain this risk" panel using the model's top drivers, "Start Intervention" and "Simulate Impact" buttons wired to stubs).
- M04b: profile tabs Who, Why, Strengths, Risks, Grow, Did it work?, with the data for the selected person.
Create the needed API endpoints and TanStack Query hooks. Use the ml/ model output (precomputed risk + drivers stored in the database) rather than training anything.
```
After Cursor finishes: tell me, and I open the running app in the browser, compare it with Figma, and send you the list of differences.

**Done when:** you log in as `yasmin@horizon.demo`, see Khalid Mansour at 72% on M06, and open his profile.

---

## Step 7: Frontend batches [Cursor, Claude reviews each batch]
Use the same prompt pattern as Step 6 with a list of screen IDs.

- **Batch 1, Manager:** M04, M01, M05, M10, M03, M02, M07, M08, M09, M11, M12, M13
- **Batch 2, Employee:** E01, E02, E03, E04, E05, E06, E07, E08, E09, E10, E11
- **Batch 3, HR/Exec:** H03, H03b, H01, H02, H02b, H04, H05, H06, H07, H08, H09, H10, H11, H12, H14, H15, H16

Template:
```
Do the following screens only: <IDs>.
For each: look at the screen in the design (PNG if present, otherwise the Figma link) and read its row in design/SCREENS.md, build it faithfully, reuse components from components/ui, add the API endpoints it needs with the right permissions (see Step 5), and add the route from SCREENS.md.
Do not touch screens outside this list. When finished, list each screen with its route and anything you could not match.
```

---

## Step 8: Smart features [Cursor + Claude]
- H13 What-if Simulator: backend endpoint `POST /api/simulate/` that re-runs the burnout and attrition models on adjusted inputs (Claude provides the function in `ml/`).
- PulseAI (E09, M12, H16): chat endpoint calling the Gemini API (free tier) with tool calls to the internal API; answers show the data used, findings, recommendation. The assistant only sees data the user's role may see.
- Intervention workflow (M10, H10): propose, approve, follow-up, measure.
- Economic impact (H12): formulas from the practical plan.

## Step 9: Test and deploy
Permission tests per role, one end-to-end run per role, then deploy backend (Render) and frontend (Vercel), and create demo accounts.
