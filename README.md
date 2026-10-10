# EMPULSE

AI-powered employee performance, wellbeing and innovation platform.
Smart Burnout Management System for Administrative Decision Support.

## Folders
| Folder | What |
|---|---|
| `design/` | Figma design pack: tokens, screen index, PNG per screen |
| `data/raw/` | EMPULSE synthetic dataset (1,000 employees) and IBM HR Attrition dataset |
| `ml/` | Data generation, analysis notebooks, model training (Claude builds this) |
| `backend/` | Django REST API |
| `frontend/` | React + TypeScript app |
| `docs/` | Notes |
| `PLAN.md` | Step-by-step build plan with a prompt for each step |
| `.cursor/rules/` | Rules Cursor follows in every chat |

## Run (after the build steps are done)
```
# backend
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo
python manage.py runserver

# frontend (new terminal)
cd frontend
npm install
npm run dev
```

Demo accounts (password `empulse123`): `layla@horizon.demo` (employee), `yasmin@horizon.demo` (manager), `rana@horizon.demo` (HR / executive).
