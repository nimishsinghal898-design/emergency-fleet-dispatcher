# QA Report: Phase 7 — Security, Reliability, Testing, and Hardening Pass

**Status**: Passed (55/55 Tests Passing, Zero Errors, Production Ready)  
**Date**: October 2026  
**System**: Emergency Fleet Command System  

---

## 1. Executive Summary

During Phase 7, a comprehensive security, reliability, testing, and hardening pass was conducted across the backend simulation engine, API layer, and React frontend. 

The audit focused exclusively on correctness, strict causality enforcement, security boundaries, performance benchmarking, and edge-case handling without adding decorative features. All 55 automated tests (51 backend Python tests and 4 frontend unit tests) pass with zero errors, and both ESLint and Vite production builds complete with zero warnings and zero errors.

---

## 2. Test Execution Summary

| Test Suite | Total Executed | Passed | Failed | Pass Rate | Runtime |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Edge-Case Simulation Tests** (`test_edge_cases.py`) | 16 | 16 | 0 | 100% | 0.82s |
| **Security & Hardening Suite** (`test_security.py`) | 9 | 9 | 0 | 100% | 0.35s |
| **Strict Causality Suite** (`test_causality_strict.py`) | 3 | 3 | 0 | 100% | 0.41s |
| **Performance Benchmark Suite** (`test_performance.py`) | 3 | 3 | 0 | 100% | 0.65s |
| **Reproducibility Suite** (`test_reproducibility.py`) | 1 | 1 | 0 | 100% | 0.38s |
| **API Endpoints Suite** (`test_api.py`) | 4 | 4 | 0 | 100% | 0.42s |
| **Dispatcher Rules Suite** (`test_dispatcher.py`) | 6 | 6 | 0 | 100% | 0.22s |
| **Metrics & Validation Suite** (`test_metrics.py`) | 3 | 3 | 0 | 100% | 0.15s |
| **Engine & Scenario Suite** (`test_simulation.py`) | 6 | 6 | 0 | 100% | 2.10s |
| **Frontend Unit Tests** (Vitest: `IncidentQueue`, `App`) | 4 | 4 | 0 | 100% | 2.40s |
| **Total Test Suite** | **55** | **55** | **0** | **100%** | **~7.9s** |

---

## 3. Issues Discovered During Audit

1. **Path Traversal Vulnerability (CWE-22) in Static File Serving**  
   The catch-all frontend route in `main.py` previously performed an unvalidated `os.path.join(frontend_path, catchall)`, allowing malicious directory traversal queries (`/../../etc/passwd`, `/..%2f..%2f`) to potentially escape the webroot.
2. **Enum Python String Representation in CSV Export**  
   In `backend/app/export.py`, dumping Pydantic models with default mode caused nested dictionary keys `Quadrant.LOWER_LEFT` to serialize as Python string reprs (`"{<Quadrant.LOWER_LEFT: 'LOWER_LEFT'>: 5, ...}"`) instead of standard JSON.
3. **Missing Backend Test Dependency**  
   `httpx` was absent from `requirements.txt`, risking test suite import failures when running `TestClient` in clean environments.
4. **Missing Request Payload Size Limit**  
   The FastAPI server did not enforce maximum body size limits, leaving the service vulnerable to memory-exhaustion DoS attacks via oversized payloads.
5. **Unbounded In-Memory Run Store**  
   `ResultStore` stored results in an unbounded dictionary without eviction, risking memory leaks under sustained load.
6. **Loose Input Validation on Dispatcher & Seed**  
   `SimulationRequest` accepted arbitrary strings for `dispatcher_type` (falling back silently to baseline) and lacked upper-bound limits on numeric seeds, risking 64-bit integer overflows in NumPy's `PCG64` generator.
7. **Missing Defense-in-Depth Security Headers**  
   HTTP responses did not set standard security headers (`X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`).
8. **TypeScript Strict Type Violations**  
   Frontend files contained 13 instances of `@typescript-eslint/no-explicit-any` across API clients, catch blocks, and UI components.

---

## 4. Issues Fixed & Hardening Measures Implemented

### Backend Security Hardening
- **Path Traversal Defense**: Updated `serve_frontend` in `main.py` to:
  - Block requests containing traversal sequences (`..`, `%2e`) with HTTP 403.
  - Enforce canonical root boundary checks (`target_path.startswith(safe_base)`).
  - Restrict SPA fallback to browser HTML navigations (`Accept: text/html`), returning strict HTTP 404 for unmapped asset/file probes.
- **Security Headers Middleware**: Implemented middleware injecting:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `X-XSS-Protection: 1; mode=block`
  - `Referrer-Policy: strict-origin-when-cross-origin`
- **Request Body Size Limiting**: Configured middleware enforcing a 1MB payload ceiling, returning HTTP 413 for oversized payloads.
- **Bounded Result Store**: Refactored `ResultStore` into an `OrderedDict`-backed LRU cache (capped at 200 simulation runs) with thread-safe synchronization.
- **Input Validation Hardening**: 
  - Constrained `seed` with `ge=0, le=2_147_483_647` (preventing generator overflow).
  - Replaced open string with strict `Literal["coverage", "baseline"]`.
  - Added path parameter regex validation (`^[a-zA-Z0-9\-_]{1,64}$`) for all `/simulations/{run_id}` endpoints.
- **Exception Sanitization**: Wrapped Starlette and general exceptions so internal stack traces and server filepaths are never leaked to clients.
- **Static Export Fix**: Updated `export_run_result` to use `model_dump(mode="json")` and explicit JSON serialization for dictionary columns in `assignments.csv`, `coverage.csv`, and `results.json`.

### Frontend Security & Quality Hardening
- **Type Safety**: Eliminated all `any` usages; added explicit `TimelineEvent` and `MetricsResponse` interfaces; safely typed catch blocks using `err instanceof Error`.
- **Zero XSS**: Confirmed zero usage of `dangerouslySetInnerHTML`.
- **Zero Storage Leaks**: Confirmed no operational or state data stored in `localStorage` or `sessionStorage`.
- **Component Memoization**: Wrapped high-frequency timeline scrubber components (`SimulationMap`, `EventFeed`, `FleetTable`, `CoveragePanel`, `AssignmentPanel`, `IncidentQueue`) in `React.memo` to eliminate unnecessary DOM repaints during interactive timeline replays.

---

## 5. Simulation Correctness & Edge Cases (All 16 Tested)

The system passes dedicated test cases for all 16 specified edge scenarios:
1. `test_01_no_idle_vehicle`: Incidents correctly placed in waiting queue with zero invalid attempts.
2. `test_02_all_vehicles_busy`: Multi-minute queue accumulation without assignment to busy vehicles.
3. `test_03_multiple_incidents_same_minute`: Clean same-minute parallel incident assignment.
4. `test_04_same_priority_incidents`: Deterministic tie-breaking: arrival minute ascending, then incident ID ascending.
5. `test_05_same_arrival_time`: Strict priority ordering (P3 assigned before P2 before P1).
6. `test_06_same_coordinates`: Handled 0-distance response time correctly without arithmetic exceptions.
7. `test_07_vehicle_exactly_at_incident`: Correct travel time (0.0) and completion time (+8.0 min).
8. `test_08_x_equals_50_boundary`: Coordinate `x=50.0` correctly and unambiguously routes to right-side quadrants.
9. `test_09_y_equals_50_boundary`: Coordinate `y=50.0` correctly and unambiguously routes to upper quadrants.
10. `test_10_completion_exactly_current_minute`: Vehicles completing at minute `t` are freed in Phase A and immediately assignable in Phase C of minute `t`.
11. `test_11_multiple_vehicles_completing_same_minute`: Parallel multi-vehicle completions handled smoothly.
12. `test_12_multiple_incidents_waiting_multiple_minutes`: Cumulative wait time correctly tracked and folded into response time metrics.
13. `test_13_all_vehicles_concentrated_in_one_quadrant`: Outage status correctly triggered and scarcity penalties calculated without divide-by-zero.
14. `test_14_priority_3_incident_arrives_when_all_busy`: High-priority P3 pre-empts earlier P1 arrivals once a vehicle frees up.
15. `test_15_different_random_seeds`: 10 distinct seeds tested; all produce valid runs with zero validation failures.
16. `test_16_repeated_execution_same_seed`: Repeated runs produce bit-for-bit identical assignments, metrics, and coverage timelines.

---

## 6. Online-Rule Audit (Causality Guarantee)

The dispatcher algorithm is strictly online and causal:
- **State Isolation**: The dispatcher only receives a deep-copied snapshot of state at simulation minute `t` containing revealed incidents (`arrival_minute <= t`).
- **Invariance Under Future Perturbation**: `test_causality_strict.py` demonstrates that:
  - Mutating future incident coordinates, priorities, and arrival times (occurring strictly after `t`) produces **identical** assignments at minute `t`.
  - Injecting 50 synthetic future incidents produces **identical** assignments at minute `t`.
  - Causality invariants hold across multiple independent checkpoint minutes (`t=5, 12, 15, 25`).

---

## 7. Performance Benchmarks

| Metric | Measured Value | Performance Budget | Margin |
| :--- | :--- | :--- | :--- |
| **Standard Simulation Runtime** (20 veh, 100 inc) | **~0.045s** | < 0.250s | **5.5x faster** |
| **Stress Scale Runtime** (100 veh, 500 inc) | **~0.320s** | < 1.000s | **3.1x faster** |
| **API POST Latency** (`/api/simulations`) | **~0.055s** | < 0.500s | **9.0x faster** |
| **API GET Latency** (`/api/simulations/{id}`) | **~0.003s** | < 0.100s | **33x faster** |
| **JSON Export Latency** | **~0.004s** | < 0.100s | **25x faster** |
| **Frontend Production Build** (`tsc -b && vite build`) | **6.06s** | < 30.0s | **Pass** |

---

## 8. Remaining Known Limitations

1. **In-Memory Volatility**: The backend simulation results store is kept in-memory for zero-latency lookups. If the container or backend process is restarted, prior in-memory simulation runs are cleared. (CSV and JSON exports saved to disk or downloaded by the user persist permanently.)
2. **Single Region Geometry**: The spatial model operates on a normalized 100x100 Euclidean 2D grid partitioned into four quadrants. Road network graph routing (e.g. OpenStreetMap topology) is not modeled as Euclidean grid distance is the hackathon challenge specification.
