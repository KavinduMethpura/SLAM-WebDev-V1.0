# SLAM-WebDev-V1.0

Full-stack multi-robot SLAM dashboard:

- Backend: FastAPI + WebSocket stream
- Frontend: React + Vite

## Prerequisites

- Python 3.10+
- Bun 1.1+ (or Node.js 18+ with npm fallback)
- Optional: GNU Make and Git Bash/WSL for `make`/`start.sh`

## One-Time Setup

### Run via Makefile

```bash
make setup
```

On Windows, `make` automatically uses `.venv/Scripts/python.exe` (if present) and defaults to `npm` for frontend commands.

### Option B: start.sh

```bash
bash start.sh setup
```

If Bun is unavailable, `start.sh` automatically falls back to `npm`.

## Run Both Frontend + Backend

### Option A: Makefile

```bash
make dev
```

Optional override:

```bash
make FRONTEND_PM=npm dev
make FRONTEND_PM=bun dev
```

### Run via Bash mode

```bash
bash start.sh dev
```

### Run via PowerShell window launcher

```bash
bash start.sh pwsh
```

## Run Services Separately

```bash
# Backend only
make backend

# Frontend only
make frontend
```

Or:

```bash
bash start.sh backend
bash start.sh frontend
```

## Frontend Environment Configuration

Copy `front_end/.env.example` to `front_end/.env.local` and adjust if needed.

- `VITE_API_BASE_URL`: Optional full backend URL. Leave empty to use Vite proxy in development.
- `VITE_WS_BASE_URL`: WebSocket base URL, default `ws://127.0.0.1:8000`.

## Default Local Ports

- Frontend: `http://localhost:8080`
- Backend HTTP: `http://127.0.0.1:8000`
- Backend WS: `ws://127.0.0.1:8000/ws`

## Manual PowerShell Run (Two Terminals)

### Terminal 1: Backend (PowerShell)

```powershell
Set-Location D:\my_project\SLAM-WebDev-V1.0
& .\.venv\Scripts\Activate.ps1
python -m uvicorn back_end.server:app --reload --host 127.0.0.1 --port 8000
```

### Terminal 2: Frontend (PowerShell, npm)

```powershell
Set-Location D:\my_project\SLAM-WebDev-V1.0\front_end
npm install
npm run dev
```

This is the manual fallback when Bun is unavailable.

## Troubleshooting

- `make` not found in PowerShell:
  Install GNU Make, open a new PowerShell window, then run `Get-Command make`.

- `make dev` shows `python: command not found` in Bash:
  Use repo root and verify `.venv` exists. Current Makefile auto-picks `.venv/Scripts/python.exe` on Windows.

- Unsure what Makefile resolved:

```bash
make help
```

Check these lines in output:

- `Resolved Python: ...`
- `Resolved frontend package manager: ...`
