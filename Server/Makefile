PY := $(shell if [ -x .venv/bin/python ]; then echo .venv/bin/python; else echo python3; fi)
PIP := $(PY) -m pip
APP_MODULE := app.main:app
UVICORN := uvicorn
REQ := requirements.txt

.PHONY: help venv install run dev docker-build docker-up docker-down lint format test clean

help: ## Show this help
	@awk 'BEGIN {FS = "[:]"} /^.*:.*##/ { printf "%-15s %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

venv: ## Create a virtualenv named .venv
	python3 -m venv .venv

install: ## Install server requirements into active Python (prefers .venv if present)
	$(PIP) install --upgrade pip setuptools
	$(PIP) install -r $(REQ)

run: ## Run the FastAPI server (development)
	$(PY) -m $(UVICORN) $(APP_MODULE) --reload --host 0.0.0.0 --port 8000

dev: install run ## Install deps then run server

docker-build: ## Build Docker image for server (context: current dir)
	docker build -t autoshare-server .

docker-up-build: ## Build and start services with docker-compose
	docker-compose up --build

docker-up: ## Start services with docker-compose
	docker-compose up

docker-down: ## Stop services started by docker-compose
	docker-compose down

lint: ## Run flake8 on project (install locally if needed)
	$(PIP) install flake8 >/dev/null 2>&1 || true
	flake8 .

format: ## Run black on project (install locally if needed)
	$(PIP) install black >/dev/null 2>&1 || true
	black .

test: ## Run tests (if any)
	pytest -q

clean: ## Cleanup common artifacts
	rm -rf .venv __pycache__ .pytest_cache
