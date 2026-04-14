PYTHON ?= python
FRONTEND_PM ?= auto
BUN_BIN ?= bun
NPM_BIN ?= npm
BACKEND_HOST ?= 127.0.0.1
BACKEND_PORT ?= 8000

ifneq ($(origin PYTHON),command line)
ifneq ($(wildcard .venv/Scripts/python.exe),)
PYTHON := .venv/Scripts/python.exe
endif
endif

ifeq ($(FRONTEND_PM),auto)
ifeq ($(OS),Windows_NT)
FRONTEND_PM_RESOLVED := $(NPM_BIN)
else
HAS_BUN := $(shell command -v $(BUN_BIN) >/dev/null 2>&1 && echo 1 || echo 0)
ifeq ($(HAS_BUN),1)
FRONTEND_PM_RESOLVED := $(BUN_BIN)
else
FRONTEND_PM_RESOLVED := $(NPM_BIN)
endif
endif
else
FRONTEND_PM_RESOLVED := $(FRONTEND_PM)
endif

ifeq ($(FRONTEND_PM_RESOLVED),$(NPM_BIN))
FRONTEND_INSTALL_CMD := $(NPM_BIN) install
FRONTEND_DEV_CMD := $(NPM_BIN) run dev
FRONTEND_TEST_CMD := $(NPM_BIN) run test
else
FRONTEND_INSTALL_CMD := $(FRONTEND_PM_RESOLVED) install
FRONTEND_DEV_CMD := $(FRONTEND_PM_RESOLVED) run dev
FRONTEND_TEST_CMD := $(FRONTEND_PM_RESOLVED) run test
endif

.PHONY: help setup backend frontend dev test clean

help:
	@echo "Targets:"
	@echo "  setup    Install backend and frontend dependencies"
	@echo "  backend  Run FastAPI backend on $(BACKEND_HOST):$(BACKEND_PORT)"
	@echo "  frontend Run Vite frontend dev server"
	@echo "  dev      Run backend and frontend together (bash-compatible)"
	@echo "  test     Run frontend test suite"
	@echo "  clean    Remove frontend build output"
	@echo ""
	@echo "Resolved Python: $(PYTHON)"
	@echo "Resolved frontend package manager: $(FRONTEND_PM_RESOLVED)"
	@echo "Override frontend package manager: make FRONTEND_PM=npm <target>"

setup:
	$(PYTHON) -m pip install -r back_end/requirements.txt
	cd front_end && $(FRONTEND_INSTALL_CMD)

backend:
	$(PYTHON) -m uvicorn back_end.server:app --reload --host $(BACKEND_HOST) --port $(BACKEND_PORT)

frontend:
	cd front_end && $(FRONTEND_DEV_CMD)

dev:
	@bash -c 'set -eo pipefail; trap "jobs -pr | xargs -r kill >/dev/null 2>&1 || true" EXIT INT TERM; $(PYTHON) -m uvicorn back_end.server:app --reload --host $(BACKEND_HOST) --port $(BACKEND_PORT) & cd front_end; $(FRONTEND_DEV_CMD)'

test:
	cd front_end && $(FRONTEND_TEST_CMD)

clean:
	@if [ -d "front_end/dist" ]; then rm -rf front_end/dist; fi
