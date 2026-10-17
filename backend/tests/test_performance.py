import time

from app.dispatcher import CoverageAwareDispatcher
from app.main import app
from app.simulation import SimulationEngine
from fastapi.testclient import TestClient

client = TestClient(app)

def test_simulation_runtime_benchmark():
    """Verify official simulation run (20 vehicles, 100 incidents) completes well within 0.25s."""
    t0 = time.perf_counter()
    engine = SimulationEngine(seed=20260911, dispatcher=CoverageAwareDispatcher(), num_vehicles=20, num_incidents=100)
    engine.run()
    elapsed = time.perf_counter() - t0
    
    assert elapsed < 0.25, f"Simulation exceeded performance budget: {elapsed:.3f}s"
    assert len(engine.past_assignments) > 0

def test_simulation_stress_scale_benchmark():
    """Verify maximum scale simulation (100 vehicles, 500 incidents) completes in < 1.0s."""
    t0 = time.perf_counter()
    engine = SimulationEngine(seed=999, dispatcher=CoverageAwareDispatcher(), num_vehicles=100, num_incidents=500)
    engine.run()
    elapsed = time.perf_counter() - t0
    
    assert elapsed < 1.0, f"Stress test exceeded performance budget: {elapsed:.3f}s"
    assert len(engine.past_assignments) > 0

def test_api_latency_benchmark():
    """Verify end-to-end API latency for simulation dispatch and data export."""
    # 1. POST simulation latency
    t0 = time.perf_counter()
    resp = client.post("/api/simulations", json={"seed": 2026, "dispatcher_type": "coverage"})
    post_elapsed = time.perf_counter() - t0
    assert resp.status_code == 200
    assert post_elapsed < 0.50, f"API POST latency too high: {post_elapsed:.3f}s"
    
    run_id = resp.json()["run_id"]
    
    # 2. GET run result latency
    t1 = time.perf_counter()
    get_resp = client.get(f"/api/simulations/{run_id}")
    get_elapsed = time.perf_counter() - t1
    assert get_resp.status_code == 200
    assert get_elapsed < 0.10, f"API GET latency too high: {get_elapsed:.3f}s"
    
    # 3. Export latency
    t2 = time.perf_counter()
    exp_resp = client.get(f"/api/simulations/{run_id}/export/json")
    exp_elapsed = time.perf_counter() - t2
    assert exp_resp.status_code == 200
    assert exp_elapsed < 0.10, f"JSON export latency too high: {exp_elapsed:.3f}s"
