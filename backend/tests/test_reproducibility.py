import json
import math
import tempfile
from pathlib import Path

from app.dispatcher import CoverageAwareDispatcher
from app.export import export_run_result
from app.metrics import build_run_result
from app.simulation import SimulationEngine


def test_reproducibility():
    """
    Proves that running the engine multiple times with the same seed
    produces perfectly identical scenarios, assignments, metrics, and exports.
    """
    seed = 20260911
    
    # Run 1
    engine1 = SimulationEngine(seed=seed, dispatcher=CoverageAwareDispatcher(), num_vehicles=20, num_incidents=100)
    engine1.run()
    res1 = build_run_result(engine1, total_runtime=1.0)
    
    # Run 2
    engine2 = SimulationEngine(seed=seed, dispatcher=CoverageAwareDispatcher(), num_vehicles=20, num_incidents=100)
    engine2.run()
    res2 = build_run_result(engine2, total_runtime=1.0)
    
    # Run 3 (different seed to ensure it does change)
    engine3 = SimulationEngine(seed=12345, dispatcher=CoverageAwareDispatcher(), num_vehicles=20, num_incidents=100)
    engine3.run()
    res3 = build_run_result(engine3, total_runtime=1.0)
    
    # 1. Assert identical scenarios
    assert len(res1.incidents) == len(res2.incidents)
    for i1, i2 in zip(res1.incidents, res2.incidents):
        assert i1.x == i2.x and i1.y == i2.y and i1.arrival_minute == i2.arrival_minute and i1.priority == i2.priority
    assert len(res1.vehicles) == len(res2.vehicles)
    for v1, v2 in zip(res1.vehicles, res2.vehicles):
        assert v1.x == v2.x and v1.y == v2.y and v1.id == v2.id

    # 2. Assert identical metrics
    assert math.isclose(res1.metrics.weighted_response_mean, res2.metrics.weighted_response_mean, abs_tol=1e-9)
    assert math.isclose(res1.metrics.p3_mean_response, res2.metrics.p3_mean_response, abs_tol=1e-9)
    assert res1.metrics.total_outage_minutes == res2.metrics.total_outage_minutes
    assert res1.validation_results.assigned_incidents == res2.validation_results.assigned_incidents

    # 3. Assert identical assignments
    assert len(res1.assignments) == len(res2.assignments)
    for a1, a2 in zip(res1.assignments, res2.assignments):
        assert a1.incident_id == a2.incident_id
        assert a1.vehicle_id == a2.vehicle_id
        assert a1.dispatch_time == a2.dispatch_time
        assert math.isclose(a1.response_time, a2.response_time, abs_tol=1e-9)

    # 4. Assert identical exports (JSON and CSV)
    with tempfile.TemporaryDirectory() as tmp1, tempfile.TemporaryDirectory() as tmp2:
        export_run_result(res1, tmp1)
        export_run_result(res2, tmp2)
        
        # Compare results.json (excluding wall-clock runtime fields that vary by nanoseconds)
        d1 = json.loads(Path(tmp1, "results.json").read_text(encoding="utf-8"))
        d2 = json.loads(Path(tmp2, "results.json").read_text(encoding="utf-8"))
        for k in ["simulation_runtime", "dispatcher_runtime", "metrics_runtime", "total_runtime"]:
            d1.pop(k, None)
            d2.pop(k, None)
        assert d1 == d2, "Exported results.json simulation payload differs between identical seed runs!"
        
        # Compare assignments.csv
        csv1 = Path(tmp1, "assignments.csv").read_text(encoding="utf-8")
        csv2 = Path(tmp2, "assignments.csv").read_text(encoding="utf-8")
        assert csv1 == csv2, "Exported assignments.csv differs between identical seed runs!"
        
        # Compare coverage.csv
        cov1 = Path(tmp1, "coverage.csv").read_text(encoding="utf-8")
        cov2 = Path(tmp2, "coverage.csv").read_text(encoding="utf-8")
        assert cov1 == cov2, "Exported coverage.csv differs between identical seed runs!"

    # 5. Assert variance across distinct seeds
    assert not math.isclose(res1.metrics.weighted_response_mean, res3.metrics.weighted_response_mean, abs_tol=1e-4)
