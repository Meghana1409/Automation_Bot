# Care & Cure Clinic - Monorepo

A modern full-stack monorepo featuring a **FastAPI** backend (SQLAlchemy ORM, Pydantic schemas, dual SQLite/PostgreSQL support, and an AI-powered WhatsApp receptionist bot) and a **React + Vite + Tailwind CSS** frontend management dashboard.

---

## Architecture Overview

```
whatsappbot/
├── backend/                               # FastAPI Application
│   ├── app/
│   │   ├── main.py                        # FastAPI app factory, CORS, routers & lifespan
│   │   ├── core/
│   │   │   ├── config.py                  # Pydantic Settings (loads .env, API keys)
│   │   │   └── database.py                # SQLAlchemy dual SQLite & PostgreSQL engine
│   │   ├── models/
│   │   │   └── appointment.py             # SQLAlchemy Appointment model
│   │   ├── schemas/
│   │   │   └── appointment.py             # Pydantic validation schemas
│   │   ├── services/
│   │   │   ├── appointment_service.py     # Appointment DB business logic
│   │   │   ├── whatsapp_service.py        # Meta Graph API sender
│   │   │   └── bot_agent.py               # LangChain Groq AI medical receptionist
│   │   └── api/
│   │       └── v1/
│   │           ├── router.py              # Aggregated v1 router
│   │           └── endpoints/
│   │               ├── appointments.py    # REST CRUD + slot check endpoints
│   │               ├── webhook.py         # WhatsApp webhook & bot simulator
│   │               └── health.py          # Database & service health checks
│   ├── requirements.txt                   # Backend dependencies
│   ├── .env.example                       # Environment template
│   ├── run.py                             # Backend startup script
│   └── test_backend.py                    # Automated backend test suite
│
├── frontend/                              # React + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx                 # Clinic header & DB status indicator
│   │   │   ├── StatsOverview.jsx          # Metrics & Doctor booking stats
│   │   │   ├── AppointmentTable.jsx       # Real-time filterable appointments table
│   │   │   ├── BookModal.jsx              # Manual appointment booking dialog
│   │   │   ├── SlotChecker.jsx            # Interactive slot availability tool
│   │   │   └── BotSimulator.jsx           # Multilingual WhatsApp chat simulator
│   │   ├── services/
│   │   │   └── api.js                     # Axios client connecting to FastAPI
│   │   ├── App.jsx                        # Main clinic dashboard
│   │   └── index.css                      # Tailwind CSS directives
│   ├── vite.config.js                     # Vite dev configuration
│   ├── tailwind.config.js                 # Tailwind styling rules
│   └── package.json                       # Frontend dependencies & scripts
│
├── package.json                           # Root scripts to orchestrate frontend & backend
├── .gitignore                             # Monorepo git ignore rules
└── README.md                              # Project documentation
```

---

## Getting Started

### 1. Prerequisites
- **Python 3.10+** (Python 3.12 recommended)
- **Node.js 18+** & **npm**

---

### 2. Environment Variables Configuration

Create or update `.env` in the root (or `backend/.env`):

```bash
# Database Configuration
# Use local SQLite:
DATABASE_URL=sqlite:///./clinic.db

# Or use PostgreSQL (e.g., Supabase, Neon, AWS RDS, Render):
# DATABASE_URL=postgresql://postgres:password@db.supabase.co:5432/postgres

# Meta / WhatsApp Cloud API
META_ACCESS_TOKEN=your_meta_system_user_token
MY_WEBHOOK_VERIFY_TOKEN=your_custom_webhook_secret_verify_token
WHATSAPP_PHONE_ID=1118016721403625

# AI Receptionist (Groq Cloud)
GROQ_API_KEY=gsk_your_groq_api_key_here

# Frontend CORS
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

> **Note on Database Switching**:
> The database layer dynamically inspects `DATABASE_URL`. If set to `sqlite:///...`, it configures SQLite with multithreading support. If set to a `postgresql://` URL, it connects with connection pooling. If the remote PostgreSQL is paused or unreachable, it gracefully falls back to local SQLite to ensure uninterrupted uptime.

---

### 3. Installation

#### Backend (Python virtualenv):
```bash
# From workspace root
python -m venv backend/.venv
.\backend\.venv\Scripts\pip install -r backend/requirements.txt
```

#### Frontend (Node modules):
```bash
cd frontend
npm install
cd ..
```

#### Root Tools (for concurrent dev):
```bash
npm install
```

---

### 4. Running the Monorepo

#### Option A: Run Both Concurrently (Recommended)
From the root directory:
```bash
npm run dev
```
- **Backend API**: `http://localhost:8000`
- **Frontend Dashboard**: `http://localhost:5173`
- **Interactive Swagger Docs**: `http://localhost:8000/docs`

#### Option B: Run Individually

**Backend**:
```bash
cd backend
.\.venv\Scripts\python.exe run.py
```

**Frontend**:
```bash
cd frontend
npm run dev
```

---

## API Endpoints (`/api/v1`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/health` | Health check & active database dialect |
| `GET` | `/api/v1/appointments` | List appointments (with filters by doctor/date) |
| `POST` | `/api/v1/appointments` | Book new appointment |
| `GET` | `/api/v1/appointments/check-slot` | Check slot availability |
| `GET` | `/api/v1/appointments/stats` | Clinic stats & counts per doctor |
| `DELETE` | `/api/v1/appointments/{id}` | Cancel/delete appointment |
| `GET` | `/api/v1/webhook` | Meta WhatsApp verification endpoint |
| `POST` | `/api/v1/webhook` | Meta WhatsApp incoming message handler |
| `POST` | `/api/v1/webhook/simulate` | Test AI bot receptionist without live Meta |

---

## Running Verification Tests

To verify backend tables, routes, and appointments workflow:
```bash
npm run test:backend
# or
.\backend\.venv\Scripts\python.exe backend/test_backend.py
```
To build frontend for production:
```bash
npm run build:frontend
```
