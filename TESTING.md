# Testing Strategy & Automated Verification Suite

## 1. Overview
The Emergency Fleet Command System is verified by an automated test suite comprising **55 tests across backend and frontend stacks**. The tests validate algorithmic correctness, temporal causality, deterministic reproducibility, security boundaries, and execution performance.

---

## 2. Test Execution Commands

### Running All Backend Tests (51 Tests)
```bash
# In repository root with active virtual environment:
pytest backend -v
```

### Running Frontend Vitest Suite (4 Tests)
```bash
cd frontend
npm test -- --run
```

### Running Static Linters & Type Checks
```bash
# Backend linting (Ruff)
ruff check backend export_script.py

# Frontend linting (ESLint)
cd frontend && npm run lint

# TypeScript compilation check
cd frontend && npx tsc -b
```

---

## 3. Test Topology & Detailed Coverage

```
backend/tests/
├── test_api.py                 # Integration: HTTP endpoints, schemas, CSV formats
├── test_causality_strict.py    # Challenge Integrity: Temporal boundary & future-event isolation
├── test_dispatcher.py          # Unit: Scoring, priority weighting, scarcity, tie-breaking
├── test_edge_cases.py          # Edge Cases: Fleet exhaustion, zero distance, boundaries
├── test_metrics.py             # Unit: Mathematical verification of WRS, WRM, P3, outages
├── test_performance.py         # Performance: Execution latency budgets (<200ms)
├── test_reproducibility.py     # Determinism: Bit-for-bit repeatability with PCG64
├── test_security.py            # Security: Path traversal, payload limits, CORS, headers
└── test_simulation.py          # State Machine: Tick loop, vehicle release, 8-min service
frontend/src/__tests__/
├── IncidentQueue.test.tsx      # Component: Priority badges, queue filtering, latency tags
└── App.test.tsx                # E2E View: Health ping, compliance cards, simulation launch
```

---

## 4. Deep-Dive by Test Category

### 4.1 Causality Tests (`test_causality_strict.py`)
These tests guarantee compliance with the challenge mandate: **the dispatcher must not have access to future events**.
- **Structural Isolation**: Asserts that `SimulationState` passed to `assign()` contains only incidents revealed at or before current time $t$. The engine's private master incident list is verified to be unreachable.
- **Future Dispatch Rejection**: Injects an adversarial dispatcher that attempts to return an incident with `arrival_minute > t`. Verifies the engine rejects the dispatch and flags an `assignment_before_reveal` violation.
- **Timeline Immutability**: Verifies that mutations made to objects in `SimulationState` do not bleed into the engine's internal ground-truth state.

### 4.2 Reproducibility Tests (`test_reproducibility.py`)
- **Bit-for-Bit Determinism**: Executes two separate `SimulationEngine` instances with the official benchmark seed `20260911`. Asserts that:
  - Incident coordinates and arrival minutes match across all 100 incidents.
  - Assignment pairing logs (vehicle, incident, dispatch minute) are identical.
  - All calculated metrics (`weighted_response_sum`, `p3_mean_response`, `total_outage_minutes`) match to 10 decimal places.
- **Divergence on Seed Variation**: Confirms that changing the seed to `20260912` produces distinct incident distributions and trajectories.

### 4.3 Algorithmic Unit Tests (`test_dispatcher.py`)
- **Priority Scaling**: Validates that Priority 3 ($W_3 = 7$) discounts coverage penalties by a factor of 7, allowing critical incidents to take the closest available vehicle.
- **Scarcity Penalty Ramp**: Verifies that scarcity penalties increase from $4.0$ to $20.0$ as quadrant idle vehicles drop from 5 down to 1.
- **Coverage Barrier**: Proves that when taking a vehicle would drop a quadrant's idle tally to 0, an additional $+100.0$ penalty is applied.
- **Deterministic Tie-Breaking**: Constructs test cases with equidistant vehicles and verifies resolution by lexicographical vehicle ID.

### 4.4 Edge Cases & Stress Scenarios (`test_edge_cases.py`)
- **Fleet Depletion**: 0 idle vehicles available. Asserts the dispatcher gracefully yields an empty assignment list without throwing exceptions.
- **Zero-Distance Spawns**: An incident spawns exactly at $(x, y)$ of an idle vehicle. Asserts transit time is $0.0$, arrival time equals dispatch time, and completion occurs at $t + 8.0$.
- **Simultaneous Arrivals**: Multiple incidents arriving in the exact same minute tick. Asserts correct priority-first queue sorting.
- **Quadrant Boundary Points**: Vehicles located exactly on $x = 50.0$ or $y = 50.0$. Verifies boundary classification rules ($x < 50 \implies \text{Left}, x \ge 50 \implies \text{Right}, y < 50 \implies \text{Lower}, y \ge 50 \implies \text{Upper}$).
- **Exhausted Incidents**: When all waiting incidents have been served, the tick loop advances cleanly with idle fleet tracking.

### 4.5 Performance & Latency Budgets (`test_performance.py`)
- **Standard Benchmark Budget**: Full 120-minute simulation with 20 vehicles and 100 incidents must complete in **under 200 milliseconds** (actual: $\approx 40$ ms).
- **Stress Scale Budget**: Experimental 500-incident stress test must execute in **under 1,000 milliseconds** (actual: $\approx 220$ ms).
- **Dispatcher Budget**: Single `assign()` call must execute in under 2 milliseconds.

### 4.6 Security & Hardening Tests (`test_security.py`)
- **Path Traversal Rejection**: Requests for `/../etc/passwd`, `/%2e%2e/file`, and subpath escapes are asserted to return HTTP 403.
- **Payload Size Enforcement**: Requests with `Content-Length > 1,048,576` bytes are asserted to return HTTP 413.
- **Input Boundary Bounds**: Requests with `seed < 0`, `num_vehicles > 100`, or `num_incidents > 500` return HTTP 422.
- **Security Headers Presence**: Asserts that `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, and `Referrer-Policy` are present on all responses.

---

## 5. Continuous Integration Summary

| Test Module | Tests | Execution Time | Result |
| :--- | :---: | :---: | :---: |
| `test_api.py` | 4 | 0.12s | PASS |
| `test_causality_strict.py` | 3 | 0.08s | PASS |
| `test_dispatcher.py` | 6 | 0.09s | PASS |
| `test_edge_cases.py` | 16 | 0.22s | PASS |
| `test_metrics.py` | 3 | 0.06s | PASS |
| `test_performance.py` | 3 | 0.35s | PASS |
| `test_reproducibility.py` | 1 | 0.08s | PASS |
| `test_security.py` | 9 | 0.15s | PASS |
| `test_simulation.py` | 6 | 0.11s | PASS |
| `IncidentQueue.test.tsx` | 2 | 0.06s | PASS |
| `App.test.tsx` | 2 | 0.10s | PASS |
| **Total** | **55** | **< 2.5s** | **100% PASS** |
