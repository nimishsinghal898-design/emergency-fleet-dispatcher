# Quickstart Guide: Emergency Fleet Command System

Get the entire application stack running in under 2 minutes.

---

## Method 1: Docker Compose (Recommended)

Run the backend API, simulation engine, and compiled operations dashboard with a single command:

```bash
# 1. Clone the repository
git clone https://github.com/nimishsinghal898-design/emergency-fleet-assistant.git
cd emergency-fleet-assistant

# 2. Build and launch
docker compose up --build
```

Open your browser to:
### **👉 [http://localhost:8000](http://localhost:8000)**

---

## Method 2: Standalone Docker Container

If you prefer building and running a single self-contained production image:

```bash
# Build multi-stage image
docker build -t emergency-fleet .

# Run on port 8000
docker run -p 8000:8000 emergency-fleet
```

Access the dashboard at:
### **👉 [http://localhost:8000](http://localhost:8000)**

---

## Method 3: Native Local Setup (Without Docker)

### 1. Backend (Terminal 1)
```bash
# Create and activate Python 3.13+ virtual environment
python -m venv .venv

# On Linux/macOS:
source .venv/bin/activate
# On Windows:
.\.venv\Scripts\activate

# Install dependencies & start server
pip install -r backend/requirements.txt
python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```

### 2. Frontend (Terminal 2)
```bash
cd frontend
npm install
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

---

## Running the Benchmark & Generating Exports

To execute the official challenge benchmark (Seed `20260911`) and generate the 4 required output files:

```bash
# Ensure the backend server is running on port 8000, then run:
python export_script.py
```

This immediately creates:
- `results.json` — Complete scenario telemetry and calculated metrics
- `results.csv` — Official challenge metric summary row
- `assignments.csv` — Complete tabular dispatch log
- `coverage.csv` — 120-minute quadrant vehicle tallies and outage telemetry

---

## Running the Test Suites

```bash
# Backend pytest suite (51 tests)
pytest backend -v

# Frontend Vitest suite (4 tests)
cd frontend && npm test -- --run
```
