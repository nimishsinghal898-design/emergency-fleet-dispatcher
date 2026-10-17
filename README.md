# Emergency Fleet Command System (AI-01)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3+-61DAFB?style=flat&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5+-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org)
[![Python](https://img.shields.io/badge/Python-3.13+-3776AB?style=flat&logo=python)](https://www.python.org)
[![Docker](https://img.shields.io/badge/Docker-Multi--Stage-2496ED?style=flat&logo=docker)](https://www.docker.com)
[![Tests](https://img.shields.io/badge/Tests-55%20Passed-brightgreen?style=flat&logo=pytest)](https://docs.pytest.org)

An operational simulation engine and decision-support command center for **Emergency Fleet Assignment with Coverage Preservation**. The system couples a strict, causal online dispatcher with an industrial emergency management dashboard to minimize priority-weighted response latency while protecting geographic sectors from critical coverage outages.

---

## 1. Project Overview

The Emergency Fleet Command System is an end-to-end operational software suite designed for metropolitan emergency dispatch. It models a dynamic urban emergency environment where emergency calls arrive stochastically across a two-dimensional grid and must be serviced by a constrained fleet of emergency vehicles.

Unlike traditional nearest-idle dispatch systems that operate with myopic greedy heuristics, this platform deploys a **Coverage-Aware Dispatcher**. The dispatcher balances immediate travel time against the risk of spatial fleet depletion, ensuring that responding to routine incidents does not starve sectors of life-saving coverage for urgent future emergencies.

---

## 2. Problem Statement

Emergency medical and fire dispatchers face a critical operational trade-off:
1. **Immediate Response**: Dispatching the closest idle unit minimizes response latency for the current incident.
2. **Spatial Readiness**: If all idle units in a sector are dispatched, subsequent high-priority life-threatening incidents in that sector suffer severe dispatch delays while vehicles travel across town.

In a closed system with $N = 20$ emergency vehicles and $M = 100$ dynamic incidents across a $100 \times 100$ urban grid, unconstrained nearest-neighbor assignment rapidly empties entire quadrants. When a Priority 3 (Critical) incident strikes a depleted quadrant, the resulting response delay is catastrophic. The challenge requires a **causal online dispatcher** that maintains multi-sector readiness without any foreknowledge of future incident coordinates or arrival times.

---

## 3. System Architecture

The application is structured into decoupled, modular tiers enforcing a strict **Causal Information Boundary**:

```mermaid
flowchart TD
    subgraph Client["Frontend Operations Dashboard (React 18 + Vite + TS)"]
        UI[Command Header & Controls]
        Map[Tactical 2D Grid & Route Vectors]
        KPI[Real-Time KPI & Outage Panels]
        Tables[Fleet Table & Incident Queue]
        CompModal[Policy Comparison Modal]
        ExpModal[Telemetry Export Modal]
    end

    subgraph Server["FastAPI Application Server (Port 8000)"]
        API[FastAPI Router /api/simulations]
        Static[Static SPA Middleware /]
        SecMW[Security & Payload Limit Middleware]
    end

    subgraph Engine["Deterministic Simulation Engine"]
        PCG[NumPy PCG64 Seed Generator]
        Causal[Causal Event Buffer (t = 0..120)]
        StateSnap[Immutable SimulationState Snapshot]
        EngineLoop[Minute-by-Minute Tick Loop]
    end

    subgraph Dispatchers["Pluggable Dispatch Strategies"]
        CovAware["Coverage-Aware Dispatcher\n(Urgency + Scarcity Penalty)"]
        GreedyBase["Nearest-Idle Baseline\n(Euclidean Greedy)"]
    end

    subgraph Persistence["In-Memory Store & Export Pipeline"]
        Store[Simulation Memory Store]
        JSONOut[JSON Telemetry Generator]
        CSVOut[RFC 4180 CSV Generator]
    end

    UI -->|HTTP POST /api/simulations| API
    API --> SecMW --> EngineLoop
    PCG --> EngineLoop
    EngineLoop --> Causal
    Causal -->|Strict Temporal Filter| StateSnap
    StateSnap -->|Read-Only Causal State| CovAware
    StateSnap -.->|Benchmark Mode| GreedyBase
    CovAware -->|Assigned Pairs| EngineLoop
    EngineLoop --> Store
    Store --> JSONOut & CSVOut
    Store -->|Telemetry Payload| API
    API --> UI
    Static --> UI
```

---

## 4. Technology Stack

- **Backend**:
  - **Python 3.13** runtime
  - **FastAPI 0.115+** with ASGI Uvicorn server
  - **Pydantic v2** for strict data validation and boundary enforcement
  - **NumPy 2.x** with the `PCG64` bit generator for bit-for-bit reproducibility
- **Frontend**:
  - **React 18** with **TypeScript 5.5+**
  - **Vite 5.4+** build system with code splitting and manual chunking (`charts`, `icons`, `vendor`)
  - **Tailwind CSS** for responsive industrial dark-mode styling
  - **Lucide React** for accessible iconography
- **Testing & Quality Assurance**:
  - **Pytest 9.x** with `pytest-asyncio` (51 backend tests)
  - **Vitest 2.x** with React Testing Library (4 frontend tests)
  - **Ruff** for Python static analysis and formatting
  - **ESLint** for TypeScript linting
- **Deployment**:
  - Multi-stage production `Dockerfile` (Node 20 builder + Python 3.13 slim runner)
  - `docker-compose.yml` for unified development and production orchestration

---

## 5. One-Command Execution & Setup

### Option A: Docker Compose (Recommended)
Clone the repository and run the entire platform with one command:
```bash
git clone https://github.com/nimishsinghal898-design/emergency-fleet-assistant.git
cd emergency-fleet-assistant
docker compose up --build
```
Navigate to **`http://localhost:8000`** in your browser.

### Option B: Standalone Docker Run
```bash
docker build -t emergency-fleet .
docker run -p 8000:8000 emergency-fleet
```
Navigate to **`http://localhost:8000`**.

### Option C: Native Local Development

#### 1. Backend Setup
```bash
# Create and activate Python virtual environment
python -m venv .venv
# Linux/macOS:
source .venv/bin/activate
# Windows:
.\.venv\Scripts\activate

# Install backend dependencies
pip install -r backend/requirements.txt

# Launch FastAPI server
python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```

#### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Access the development UI at **`http://localhost:5173`** (proxied to API on port `8000`).

---

## 6. Simulation Rules & Challenge Semantics

The simulation environment strictly mirrors the operational challenge specifications:
1. **Grid Geometry**: A continuous 2D plane spanning $X \in [0, 100]$ and $Y \in [0, 100]$.
2. **Four Spatial Quadrants**:
   - **Lower-Left (LL)**: $x < 50, y < 50$
   - **Upper-Left (UL)**: $x < 50, y \ge 50$
   - **Lower-Right (LR)**: $x \ge 50, y < 50$
   - **Upper-Right (UR)**: $x \ge 50, y \ge 50$
3. **Fleet Deployment**: Exactly $N = 20$ emergency vehicles initialized at $t = 0$, distributed across all quadrants (5 vehicles per quadrant).
4. **Incident Arrivals**: $M = 100$ total incidents arriving dynamically between $t = 0$ and $t = 120$ minutes.
5. **Vehicle Dynamics**:
   - Vehicles travel at a constant velocity of $1.0\text{ distance unit / minute}$.
   - Response time equals Euclidean distance: $T_{\text{resp}} = \sqrt{(v_x - i_x)^2 + (v_y - i_y)^2}$.
   - Upon arrival at the incident site, a mandatory **8-minute on-scene service duration** is required before the vehicle returns to `IDLE` status at that location.
6. **Strict Temporal Horizon**: 120 integer minutes ($t = 0, 1, 2, \dots, 120$).
7. **No Future-Event Access**: The dispatcher is called at each minute $t$ and can only observe currently idle vehicles and waiting incidents that have arrived at or before $t$.

---

## 7. Dispatcher Methodology

The **Coverage-Aware Dispatcher** evaluates an assignment score for every eligible vehicle $v$ against each waiting incident $i$.

### Incident Urgency Weighting
In accordance with challenge criteria, higher priority corresponds to higher urgency and higher evaluation weight:
- **Priority 1 (Routine)**: $W_1 = 1$
- **Priority 2 (Urgent)**: $W_2 = 3$
- **Priority 3 (Critical)**: $W_3 = 7$

Waiting incidents are processed in a priority queue sorted by:
1. Priority descending ($P_3 \to P_2 \to P_1$)
2. Arrival minute ascending (FIFO within priority tier)
3. Incident ID ascending (deterministic tie-breaking)

### Assignment Cost Function
For incident $i$ and vehicle $v$, the effective cost is:
$$C(i, v) = \text{ResponseCost} + \frac{\text{CoveragePenalty} + \text{ScarcityPenalty}}{W_p}$$

Where:
- $\text{ResponseCost} = \sqrt{(v_x - i_x)^2 + (v_y - i_y)^2} \times 1.0$
- $\text{CoveragePenalty} = \begin{cases} 100.0 & \text{if taking } v \text{ leaves its quadrant with 0 idle vehicles} \\ 0.0 & \text{otherwise} \end{cases}$
- $\text{ScarcityPenalty} = \frac{20.0}{\max(1, \text{Idle}_{\text{before}})}$

### Mathematical Intuition
- **Critical Incidents ($P_3, W_3 = 7$)**: The penalty term is divided by $7$, significantly diminishing coverage inhibitions so the system dispatches the closest vehicle immediately to save lives.
- **Routine Incidents ($P_1, W_1 = 1$)**: The full penalty applies, preventing routine dispatches from depleting the last remaining vehicle in a quadrant.
- **Deterministic Tie-Breaking**: If two vehicles have identical scores (within $\epsilon = 10^{-6}$), the tie is broken by:
  1. Lower estimated travel distance.
  2. Lexicographically lower vehicle ID (`V01` < `V02`).

---

## 8. Coverage Preservation Strategy

A **Coverage Outage** occurs during any minute where at least one of the four quadrants has $0$ idle vehicles available.

1. **Intra-Minute State Tracking**: When multiple assignments occur within the same minute $t$, the dispatcher updates its local quadrant idle tally after each assignment, preventing race conditions where multiple dispatches simultaneously strip the same quadrant.
2. **Proactive Scarcity Damping**: As a quadrant's idle vehicle count drops ($5 \to 3 \to 2 \to 1$), the scarcity penalty rises asymptotically ($4 \to 6.7 \to 10 \to 20$), steering non-critical dispatches to adjacent sectors that have vehicle surpluses.

---

## 9. Performance Metrics

All metrics are computed objectively from the simulation event log:
1. **Weighted Response Sum**:
   $$\text{WRS} = \sum_{a \in \text{Assignments}} W_{\text{priority}}(a) \times T_{\text{resp}}(a)$$
2. **Weighted Response Mean**:
   $$\text{WRM} = \frac{\text{WRS}}{|\text{Assignments}|}$$
3. **Priority 3 Performance**:
   - $P_3$ mean, median, min, and max response times.
4. **Coverage Outage Minutes**:
   $$\text{Total Outage} = \sum_{t=0}^{120} \mathbf{1}\left(\exists q \in \{\text{LL, UL, LR, UR}\} : \text{Idle}(q, t) = 0\right)$$
   Along with sector-specific outage counts ($\text{Outage}_{\text{LL}}$, $\text{Outage}_{\text{UL}}$, $\text{Outage}_{\text{LR}}$, $\text{Outage}_{\text{UR}}$).
5. **Operational Verification**:
   - Counts of invalid assignment attempts, duplicate dispatches, busy-vehicle assignments, and future-reveal violations (all must equal $0$).

---

## 10. API Specification

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/health` | `GET` | Server liveness and health ping. |
| `/api/simulations` | `POST` | Executes a complete simulation run with specified seed and dispatcher. |
| `/api/simulations/{id}` | `GET` | Fetches full timeline, telemetry, vehicle states, and metrics. |
| `/api/simulations/{id}/assignments` | `GET` | Fetches chronologically ordered assignment records. |
| `/api/simulations/{id}/coverage` | `GET` | Fetches minute-by-minute quadrant vehicle tallies and outage flags. |
| `/api/simulations/{id}/export/json` | `GET` | Downloads complete raw simulation telemetry as JSON. |
| `/api/simulations/{id}/export/csv` | `GET` | Downloads RFC 4180 compliant metrics summary CSV. |

---

## 11. Automated Testing & Verification

The test suite validates every layer of the system:
```bash
# Run backend pytest suite (51 tests)
pytest backend -v

# Run frontend Vitest suite (4 tests)
cd frontend && npm test -- --run

# Run static linting
ruff check backend export_script.py
cd frontend && npm run lint
```

### Test Coverage Highlights:
- **`test_causality_strict.py`**: Asserts that unrevealed incidents cannot be dispatched and that the `SimulationState` contains no future events.
- **`test_reproducibility.py`**: Proves that seed `20260911` produces identical event logs and metrics across independent runs.
- **`test_dispatcher.py`**: Validates priority sorting, scarcity penalties, and coverage penalty enforcement.
- **`test_edge_cases.py`**: Verifies behavior with 0 idle vehicles, zero-distance incidents, boundary coordinates, and simultaneous arrivals.
- **`test_performance.py`**: Enforces a strict execution budget (<200ms per simulation run).
- **`test_security.py`**: Tests input boundary enforcement, path traversal rejection, and 1MB payload limits.

---

## 12. Security Architecture

- **Path Traversal Protection (CWE-22)**: Static file serving checks all incoming paths against canonical base roots and rejects parent references (`..`) and encoded `%2e` sequences with HTTP 403.
- **Request Size Limiting**: Middleware rejects payloads exceeding 1MB with HTTP 413.
- **Hardened Security Headers**: Injects `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, and `Referrer-Policy: strict-origin-when-cross-origin`.
- **CORS Whitelisting**: Restricted explicitly to `localhost:5173`, `127.0.0.1:5173`, `localhost:8000`, and `127.0.0.1:8000`.
- **Zero Exposed Secrets**: Fully deterministic, in-memory execution requiring no external credentials.

---

## 13. Challenge Compliance Checklist

The platform implements and verifies all challenge mandates:
- [x] **PCG64 Deterministic Simulation**: NumPy PCG64 bit generator with identical seed reproduction.
- [x] **Causal Online Dispatcher**: State transitions depend exclusively on history up to minute $t$.
- [x] **No Future-Event Access**: Structurally quarantined data models.
- [x] **Priority-Aware Assignment**: Objective weights $W_1 = 1, W_2 = 3, W_3 = 7$.
- [x] **Coverage Preservation**: Multi-quadrant scarcity damping preventing sector blackouts.
- [x] **Reproducible Results**: Verified bit-for-bit repeatability on benchmark seed `20260911`.
- [x] **Automated Validation**: 55 passing unit, integration, and security tests.

---

## 14. License & Submission Details

- **Challenge**: AI-01: Emergency Fleet Assignment with Coverage Preservation
- **Repository**: [nimishsinghal898-design/emergency-fleet-assistant](https://github.com/nimishsinghal898-design/emergency-fleet-assistant)
- **Benchmark Seed**: `20260911`
