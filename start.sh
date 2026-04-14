#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

BACKEND_HOST="${BACKEND_HOST:-127.0.0.1}"
BACKEND_PORT="${BACKEND_PORT:-8000}"
PYTHON_BIN="${PYTHON_BIN:-python}"
BUN_BIN="${BUN_BIN:-bun}"
NPM_BIN="${NPM_BIN:-npm}"
FRONTEND_PM="${FRONTEND_PM:-auto}"
FRONTEND_PM_RESOLVED=""
Set-Location D:\my_project\SLAM-WebDev-V1.0
refreshenv
make FRONTEND_PM=npm devSet-Location D:\my_project\SLAM-WebDev-V1.0
refreshenv
make FRONTEND_PM=npm devSet-Location D:\my_project\SLAM-WebDev-V1.0
refreshenv
make FRONTEND_PM=npm devSet-Location D:\my_project\SLAM-WebDev-V1.0
refreshenv
make FRONTEND_PM=npm devSet-Location D:\my_project\SLAM-WebDev-V1.0
refreshenv
make FRONTEND_PM=npm devSet-Location D:\my_project\SLAM-WebDev-V1.0
refreshenv
make FRONTEND_PM=npm devSet-Location D:\my_project\SLAM-WebDev-V1.0
refreshenv
make FRONTEND_PM=npm devSet-Location D:\my_project\SLAM-WebDev-V1.0
refreshenv
make FRONTEND_PM=npm devSet-Location D:\my_project\SLAM-WebDev-V1.0
refreshenv
make FRONTEND_PM=npm devSet-Location D:\my_project\SLAM-WebDev-V1.0
refreshenv
make FRONTEND_PM=npm devSet-Location D:\my_project\SLAM-WebDev-V1.0
refreshenv
make FRONTEND_PM=npm devSet-Location D:\my_project\SLAM-WebDev-V1.0
refreshenv
make FRONTEND_PM=npm devSet-Location D:\my_project\SLAM-WebDev-V1.0
refreshenv
make FRONTEND_PM=npm devSet-Location D:\my_project\SLAM-WebDev-V1.0
refreshenv
make FRONTEND_PM=npm devSet-Location D:\my_project\SLAM-WebDev-V1.0
refreshenv
make FRONTEND_PM=npm devSet-Location D:\my_project\SLAM-WebDev-V1.0
refreshenv
make FRONTEND_PM=npm devSet-Location D:\my_project\SLAM-WebDev-V1.0
refreshenv
make FRONTEND_PM=npm devSet-Location D:\my_project\SLAM-WebDev-V1.0
refreshenv
make FRONTEND_PM=npm devSet-Location D:\my_project\SLAM-WebDev-V1.0
refreshenv
make FRONTEND_PM=npm devSet-Location D:\my_project\SLAM-WebDev-V1.0
refreshenv
make FRONTEND_PM=npm devSet-Location D:\my_project\SLAM-WebDev-V1.0
refreshenv
make FRONTEND_PM=npm devSet-Location D:\my_project\SLAM-WebDev-V1.0
refreshenv
make FRONTEND_PM=npm devPYTHON_BIN_RESOLVED=""

usage() {
	cat <<'EOF'
Usage: ./start.sh [mode]

Modes:
	setup      Install backend/frontend dependencies
	backend    Run only backend
	frontend   Run only frontend
	dev        Run backend + frontend in this shell (default)
	pwsh       Open two PowerShell windows (backend + frontend)
EOF
}

ensure_cmd() {
	local cmd="$1"
	if command -v "$cmd" >/dev/null 2>&1; then
		return 0
	fi

	# Windows shells may expose executables as *.exe only.
	if command -v "${cmd}.exe" >/dev/null 2>&1; then
		return 0
	fi

	if [ "$cmd" = "bun" ] || [ "$cmd" = "$BUN_BIN" ]; then
		cat >&2 <<'EOF'
Missing required command: bun

Install Bun and restart your shell:
	PowerShell: powershell -c "irm bun.sh/install.ps1 | iex"

If Bun is already installed, add it to PATH for Git Bash:
	export PATH="$HOME/.bun/bin:$PATH"
EOF
		exit 1
	fi

	if [ "$cmd" = "python" ] || [ "$cmd" = "$PYTHON_BIN" ]; then
		cat >&2 <<'EOF'
Missing required command: python

Activate your venv first, or set PYTHON_BIN explicitly:
	source .venv/Scripts/activate
	PYTHON_BIN=python bash start.sh dev
EOF
		exit 1
	fi

	if ! command -v "$cmd" >/dev/null 2>&1; then
		echo "Missing required command: $cmd" >&2
		exit 1
	fi
}

resolve_python_bin() {
	if [ -n "$PYTHON_BIN_RESOLVED" ]; then
		return 0
	fi

	if command -v "$PYTHON_BIN" >/dev/null 2>&1; then
		PYTHON_BIN_RESOLVED="$PYTHON_BIN"
		return 0
	fi

	if command -v "${PYTHON_BIN}.exe" >/dev/null 2>&1; then
		PYTHON_BIN_RESOLVED="${PYTHON_BIN}.exe"
		return 0
	fi

	# Common Windows venv location when running from Git Bash.
	if [ -f "$ROOT_DIR/.venv/Scripts/python.exe" ]; then
		PYTHON_BIN_RESOLVED="$ROOT_DIR/.venv/Scripts/python.exe"
		echo "python not found in PATH; using project venv at .venv/Scripts/python.exe"
		return 0
	fi

	if command -v python3 >/dev/null 2>&1; then
		PYTHON_BIN_RESOLVED="python3"
		return 0
	fi

	cat >&2 <<'EOF'
Missing required command: python

Fix one of these and retry:
  1) Activate venv in Bash: source .venv/Scripts/activate
  2) Set explicit Python path: PYTHON_BIN=/d/my_project/SLAM-WebDev-V1.0/.venv/Scripts/python.exe bash start.sh dev
  3) Install python on PATH
EOF
	exit 1
}

resolve_frontend_pm() {
	if [ -n "$FRONTEND_PM_RESOLVED" ]; then
		return 0
	fi

	if [ "$FRONTEND_PM" != "auto" ]; then
		ensure_cmd "$FRONTEND_PM"
		FRONTEND_PM_RESOLVED="$FRONTEND_PM"
		return 0
	fi

	if command -v "$BUN_BIN" >/dev/null 2>&1 || command -v "${BUN_BIN}.exe" >/dev/null 2>&1; then
		FRONTEND_PM_RESOLVED="$BUN_BIN"
		return 0
	fi

	if command -v "$NPM_BIN" >/dev/null 2>&1 || command -v "${NPM_BIN}.exe" >/dev/null 2>&1; then
		FRONTEND_PM_RESOLVED="$NPM_BIN"
		echo "bun not found; falling back to npm"
		return 0
	fi

	cat >&2 <<'EOF'
No frontend package manager found.
Install bun or npm (Node.js), then retry.
EOF
	exit 1
}

frontend_install_cmd() {
	resolve_frontend_pm
	if [ "$FRONTEND_PM_RESOLVED" = "$NPM_BIN" ]; then
		echo "$NPM_BIN install"
	else
		echo "$FRONTEND_PM_RESOLVED install"
	fi
}

frontend_run_cmd() {
	resolve_frontend_pm
	if [ "$FRONTEND_PM_RESOLVED" = "$NPM_BIN" ]; then
		echo "$NPM_BIN run $1"
	else
		echo "$FRONTEND_PM_RESOLVED run $1"
	fi
}

safe_kill_children() {
	# Kill only started child jobs, and suppress harmless errors if none exist.
	local pids
	pids="$(jobs -pr || true)"
	if [ -n "$pids" ]; then
		kill $pids >/dev/null 2>&1 || true
	fi
}

setup_deps() {
	resolve_python_bin
	resolve_frontend_pm
	"$PYTHON_BIN_RESOLVED" -m pip install -r "$ROOT_DIR/back_end/requirements.txt"
	(cd "$ROOT_DIR/front_end" && eval "$(frontend_install_cmd)")
}

run_backend() {
	resolve_python_bin
	cd "$ROOT_DIR"
	"$PYTHON_BIN_RESOLVED" -m uvicorn back_end.server:app --reload --host "$BACKEND_HOST" --port "$BACKEND_PORT"
}

run_frontend() {
	resolve_frontend_pm
	cd "$ROOT_DIR/front_end"
	eval "$(frontend_run_cmd dev)"
}

run_dev_bash() {
	resolve_python_bin
	resolve_frontend_pm
	trap 'safe_kill_children' EXIT INT TERM
	run_backend &
	run_frontend
}

run_dev_pwsh_windows() {
	if ! command -v powershell.exe >/dev/null 2>&1; then
		echo "powershell.exe is required for pwsh mode" >&2
		exit 1
	fi

	local root_win
	if command -v cygpath >/dev/null 2>&1; then
		root_win="$(cygpath -w "$ROOT_DIR")"
	else
		root_win="$ROOT_DIR"
	fi

	powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "& {
		\$root = '${root_win}';
		\$pythonCmd = '${PYTHON_BIN_RESOLVED:-$PYTHON_BIN}';
		\$frontendPm = '${FRONTEND_PM_RESOLVED:-$BUN_BIN}';
		if (Get-Command \$frontendPm -ErrorAction SilentlyContinue -eq \$null) {
			\$frontendPm = '${NPM_BIN}';
		}
		\$frontendCmd = if (\$frontendPm -eq '${NPM_BIN}') { "npm run dev" } else { "\$frontendPm run dev" };
		Start-Process powershell -ArgumentList '-NoExit','-Command',\"Set-Location '\$root'; \$pythonCmd -m uvicorn back_end.server:app --reload --host ${BACKEND_HOST} --port ${BACKEND_PORT}\";
		Start-Process powershell -ArgumentList '-NoExit','-Command',\"Set-Location '\$root\\front_end'; \$frontendCmd\";
	}"
}

MODE="${1:-dev}"

case "$MODE" in
	setup)
		setup_deps
		;;
	backend)
		run_backend
		;;
	frontend)
		run_frontend
		;;
	dev)
		run_dev_bash
		;;
	pwsh)
		run_dev_pwsh_windows
		;;
	help|-h|--help)
		usage
		;;
	*)
		usage
		exit 1
		;;
esac
