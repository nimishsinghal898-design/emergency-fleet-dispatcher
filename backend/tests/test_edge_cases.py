import pytest
import math
from app.simulation import SimulationEngine, BaselineDispatcher
from app.models import VehicleStatus, IncidentStatus, Vehicle, Incident, Quadrant
from app.dispatcher import CoverageAwareDispatcher
from app.metrics import build_run_result

def create_mock_engine(vehicles=None, incidents=None, dispatcher=None):
    disp = dispatcher or CoverageAwareDispatcher()
    engine = SimulationEngine(seed=20260911, dispatcher=disp, num_vehicles=20, num_incidents=0)
    if vehicles is not None:
        engine.vehicles = vehicles
    if incidents is not None:
        engine.all_incidents = incidents
    return engine

# ==============================================================================
# EDGE CASE 1: No idle vehicle
# ==============================================================================
def test_01_no_idle_vehicle():
    vehicles = [Vehicle(id=f"V{i:02d}", x=10.0, y=10.0, status=VehicleStatus.BUSY, completion_time=10.0) for i in range(1, 21)]
    incidents = [Incident(id="I001", arrival_minute=0, x=50.0, y=50.0, priority=1)]
    engine = create_mock_engine(vehicles, incidents)
    engine.step()
    
    assert len(engine.past_assignments) == 0
    assert len(engine._get_waiting_incidents()) == 1
    assert engine._get_waiting_incidents()[0].id == "I001"
    assert engine.invalid_assignment_attempts == 0

# ==============================================================================
# EDGE CASE 2: All vehicles busy
# ==============================================================================
def test_02_all_vehicles_busy():
    vehicles = [Vehicle(id=f"V{i:02d}", x=10.0, y=10.0, status=VehicleStatus.BUSY, completion_time=5.0) for i in range(1, 21)]
    incidents = [
        Incident(id=f"I{i:03d}", arrival_minute=i, x=20.0 + i, y=20.0 + i, priority=2)
        for i in range(4)
    ]
    engine = create_mock_engine(vehicles, incidents)
    
    # Step through minutes 0 to 3
    for _ in range(4):
        engine.step()
    
    assert len(engine.past_assignments) == 0
    assert len(engine._get_waiting_incidents()) == 4
    assert engine.assignments_to_busy_vehicles == 0

# ==============================================================================
# EDGE CASE 3: Multiple incidents at same minute
# ==============================================================================
def test_03_multiple_incidents_same_minute():
    vehicles = [Vehicle(id=f"V{i:02d}", x=10.0 * i, y=10.0 * i, status=VehicleStatus.IDLE) for i in range(1, 5)]
    incidents = [
        Incident(id="I001", arrival_minute=2, x=20.0, y=20.0, priority=2),
        Incident(id="I002", arrival_minute=2, x=30.0, y=30.0, priority=2),
        Incident(id="I003", arrival_minute=2, x=40.0, y=40.0, priority=2),
    ]
    engine = create_mock_engine(vehicles, incidents)
    engine.t = 2
    engine.step()
    
    assert len(engine.past_assignments) == 3
    assigned_ids = {a.incident_id for a in engine.past_assignments}
    assert assigned_ids == {"I001", "I002", "I003"}

# ==============================================================================
# EDGE CASE 4: Same priority incidents
# ==============================================================================
def test_04_same_priority_incidents():
    # Tie breaking among same priority: arrival time ascending, then incident ID ascending
    vehicles = [Vehicle(id="V01", x=10.0, y=10.0, status=VehicleStatus.IDLE)]
    incidents = [
        Incident(id="I005", arrival_minute=1, x=20.0, y=20.0, priority=2),
        Incident(id="I002", arrival_minute=1, x=30.0, y=30.0, priority=2),
    ]
    engine = create_mock_engine(vehicles, incidents)
    engine.t = 1
    engine.step()
    
    # Exactly one vehicle available, should pick I002 because I002 < I005 lexicographically
    assert len(engine.past_assignments) == 1
    assert engine.past_assignments[0].incident_id == "I002"

# ==============================================================================
# EDGE CASE 5: Same arrival time (different priorities)
# ==============================================================================
def test_05_same_arrival_time():
    vehicles = [
        Vehicle(id="V01", x=10.0, y=10.0, status=VehicleStatus.IDLE),
        Vehicle(id="V02", x=20.0, y=20.0, status=VehicleStatus.IDLE)
    ]
    incidents = [
        Incident(id="I001", arrival_minute=0, x=15.0, y=15.0, priority=1),
        Incident(id="I002", arrival_minute=0, x=25.0, y=25.0, priority=3),
        Incident(id="I003", arrival_minute=0, x=35.0, y=35.0, priority=2),
    ]
    engine = create_mock_engine(vehicles, incidents)
    engine.step()
    
    # 2 vehicles, 3 incidents -> P3 first, then P2; P1 waits
    assert len(engine.past_assignments) == 2
    assert engine.past_assignments[0].incident_id == "I002"  # Priority 3
    assert engine.past_assignments[1].incident_id == "I003"  # Priority 2
    waiting = engine._get_waiting_incidents()
    assert len(waiting) == 1
    assert waiting[0].id == "I001"

# ==============================================================================
# EDGE CASE 6: Same coordinates
# ==============================================================================
def test_06_same_coordinates():
    vehicles = [Vehicle(id="V01", x=42.0, y=42.0, status=VehicleStatus.IDLE)]
    incidents = [Incident(id="I001", arrival_minute=0, x=42.0, y=42.0, priority=1)]
    engine = create_mock_engine(vehicles, incidents)
    engine.step()
    
    assert len(engine.past_assignments) == 1
    assignment = engine.past_assignments[0]
    assert assignment.distance == 0.0
    assert assignment.response_time == 0.0
    assert assignment.arrival_time == 0.0
    assert assignment.completion_time == 8.0

# ==============================================================================
# EDGE CASE 7: Vehicle exactly at incident
# ==============================================================================
def test_07_vehicle_exactly_at_incident():
    vehicles = [Vehicle(id="V01", x=75.5, y=25.5, status=VehicleStatus.IDLE)]
    incidents = [Incident(id="I001", arrival_minute=3, x=75.5, y=25.5, priority=2)]
    engine = create_mock_engine(vehicles, incidents)
    engine.t = 3
    engine.step()
    
    assert len(engine.past_assignments) == 1
    a = engine.past_assignments[0]
    assert math.isclose(a.distance, 0.0, abs_tol=1e-9)
    assert a.arrival_time == 3.0
    assert a.completion_time == 11.0

# ==============================================================================
# EDGE CASE 8: x = 50 boundary
# ==============================================================================
def test_08_x_equals_50_boundary():
    # x < 50 is LEFT, x >= 50 is RIGHT
    v_on_boundary_low = Vehicle(id="V1", x=50.0, y=25.0)
    assert v_on_boundary_low.get_quadrant() == Quadrant.LOWER_RIGHT
    
    v_just_left = Vehicle(id="V2", x=49.99999, y=25.0)
    assert v_just_left.get_quadrant() == Quadrant.LOWER_LEFT
    
    v_on_boundary_high = Vehicle(id="V3", x=50.0, y=75.0)
    assert v_on_boundary_high.get_quadrant() == Quadrant.UPPER_RIGHT
    
    v_just_left_high = Vehicle(id="V4", x=49.99999, y=75.0)
    assert v_just_left_high.get_quadrant() == Quadrant.UPPER_LEFT

# ==============================================================================
# EDGE CASE 9: y = 50 boundary
# ==============================================================================
def test_09_y_equals_50_boundary():
    # y < 50 is LOWER, y >= 50 is UPPER
    v_on_boundary_left = Vehicle(id="V1", x=25.0, y=50.0)
    assert v_on_boundary_left.get_quadrant() == Quadrant.UPPER_LEFT
    
    v_just_below_left = Vehicle(id="V2", x=25.0, y=49.99999)
    assert v_just_below_left.get_quadrant() == Quadrant.LOWER_LEFT
    
    v_on_boundary_right = Vehicle(id="V3", x=75.0, y=50.0)
    assert v_on_boundary_right.get_quadrant() == Quadrant.UPPER_RIGHT
    
    v_just_below_right = Vehicle(id="V4", x=75.0, y=49.99999)
    assert v_just_below_right.get_quadrant() == Quadrant.LOWER_RIGHT
    
    # Center point (50.0, 50.0) is UPPER_RIGHT
    assert Vehicle(id="V5", x=50.0, y=50.0).get_quadrant() == Quadrant.UPPER_RIGHT

# ==============================================================================
# EDGE CASE 10: Completion exactly at current minute
# ==============================================================================
def test_10_completion_exactly_current_minute():
    # Vehicle completes at t=4.0
    vehicle = Vehicle(id="V01", x=10.0, y=10.0, status=VehicleStatus.BUSY, completion_time=4.0)
    # Incident arrives at t=4
    incident = Incident(id="I001", arrival_minute=4, x=15.0, y=15.0, priority=2)
    engine = create_mock_engine([vehicle], [incident])
    
    engine.t = 4
    engine.step()
    
    # In step(): phase A frees completion_time <= t BEFORE phase C assigns.
    # Therefore V01 should be assigned to I001 at minute 4.
    assert len(engine.past_assignments) == 1
    assert engine.past_assignments[0].vehicle_id == "V01"
    assert engine.past_assignments[0].dispatch_time == 4

# ==============================================================================
# EDGE CASE 11: Multiple vehicles completing at same minute
# ==============================================================================
def test_11_multiple_vehicles_completing_same_minute():
    vehicles = [
        Vehicle(id=f"V{i:02d}", x=10.0 * i, y=10.0 * i, status=VehicleStatus.BUSY, completion_time=6.0)
        for i in range(1, 6)
    ]
    incidents = [
        Incident(id=f"I{i:03d}", arrival_minute=6, x=10.0 * i, y=10.0 * i, priority=2)
        for i in range(1, 6)
    ]
    engine = create_mock_engine(vehicles, incidents)
    engine.t = 6
    engine.step()
    
    # All 5 should become IDLE and all 5 incidents assigned
    assert len(engine.past_assignments) == 5
    for v in engine.vehicles:
        assert v.status == VehicleStatus.BUSY  # newly re-assigned
        assert v.completion_time is not None

# ==============================================================================
# EDGE CASE 12: Multiple incidents waiting for multiple minutes
# ==============================================================================
def test_12_multiple_incidents_waiting_multiple_minutes():
    # Vehicle busy until minute 5
    vehicle = Vehicle(id="V01", x=10.0, y=10.0, status=VehicleStatus.BUSY, completion_time=5.0)
    incidents = [
        Incident(id="I001", arrival_minute=0, x=20.0, y=20.0, priority=1),
        Incident(id="I002", arrival_minute=2, x=30.0, y=30.0, priority=2),
    ]
    engine = create_mock_engine([vehicle], incidents)
    
    for _ in range(5):
        engine.step()
        
    assert len(engine.past_assignments) == 0
    assert len(engine._get_waiting_incidents()) == 2
    
    # At minute 5, vehicle frees up. P2 should be assigned first.
    engine.step()
    assert len(engine.past_assignments) == 1
    a = engine.past_assignments[0]
    assert a.incident_id == "I002"
    assert a.dispatch_time == 5
    # Wait time was 5 - 2 = 3 minutes. Total response time is 3 + distance.
    expected_dist = math.sqrt((10.0 - 30.0)**2 + (10.0 - 30.0)**2)
    assert math.isclose(a.response_time, 3.0 + expected_dist, rel_tol=1e-5)

# ==============================================================================
# EDGE CASE 13: All vehicles temporarily concentrated in one quadrant
# ==============================================================================
def test_13_all_vehicles_concentrated_in_one_quadrant():
    # All vehicles in LOWER_LEFT (x=15, y=15)
    vehicles = [Vehicle(id=f"V{i:02d}", x=15.0, y=15.0, status=VehicleStatus.IDLE) for i in range(1, 21)]
    engine = create_mock_engine(vehicles, [])
    
    cov = engine._evaluate_coverage()
    assert cov.idle_LL == 20
    assert cov.idle_UL == 0
    assert cov.idle_LR == 0
    assert cov.idle_UR == 0
    assert not cov.coverage_healthy
    assert cov.outage == 1
    
    # Dispatch an incident in UR (x=80, y=80)
    incidents = [Incident(id="I001", arrival_minute=0, x=80.0, y=80.0, priority=2)]
    engine.all_incidents = incidents
    engine.step()
    
    # Should assign without crash
    assert len(engine.past_assignments) == 1
    assert engine.past_assignments[0].vehicle_quadrant_before == Quadrant.LOWER_LEFT

# ==============================================================================
# EDGE CASE 14: Priority-3 incident arrives while all vehicles are busy
# ==============================================================================
def test_14_priority_3_incident_arrives_when_all_busy():
    vehicles = [Vehicle(id=f"V{i:02d}", x=10.0, y=10.0, status=VehicleStatus.BUSY, completion_time=5.0) for i in range(1, 21)]
    # P1 arrives at min 0, P3 arrives at min 2
    incidents = [
        Incident(id="I001", arrival_minute=0, x=15.0, y=15.0, priority=1),
        Incident(id="I002", arrival_minute=2, x=25.0, y=25.0, priority=3),
    ]
    engine = create_mock_engine(vehicles, incidents)
    
    # Step to minute 5
    for _ in range(5):
        engine.step()
    
    assert len(engine.past_assignments) == 0
    
    # At minute 5, vehicles free up. P3 must be assigned before P1 despite later arrival!
    engine.step()
    assert len(engine.past_assignments) == 2
    assert engine.past_assignments[0].incident_id == "I002"  # Priority 3
    assert engine.past_assignments[1].incident_id == "I001"  # Priority 1

# ==============================================================================
# EDGE CASE 15: Different random seeds
# ==============================================================================
def test_15_different_random_seeds():
    seeds = [1, 42, 100, 999, 2026, 12345, 99999, 54321, 77777, 88888]
    weighted_responses = []
    
    for s in seeds:
        eng = SimulationEngine(seed=s, dispatcher=CoverageAwareDispatcher(), num_vehicles=20, num_incidents=100)
        eng.run()
        res = build_run_result(eng, 0.1)
        
        # Must execute cleanly without any validation faults
        assert res.validation_results.invalid_assignment_attempts == 0
        assert res.validation_results.duplicate_assignments == 0
        assert res.validation_results.assignments_to_busy_vehicles == 0
        assert res.validation_results.assignments_before_reveal == 0
        assert res.validation_results.assigned_incidents > 0
        weighted_responses.append(res.metrics.weighted_response_mean)
        
    # Verify non-trivial variance across diverse seeds
    assert len(set(weighted_responses)) == len(seeds)

# ==============================================================================
# EDGE CASE 16: Repeated execution with same seed
# ==============================================================================
def test_16_repeated_execution_same_seed():
    seed = 20260911
    
    eng1 = SimulationEngine(seed=seed, dispatcher=CoverageAwareDispatcher(), num_vehicles=20, num_incidents=100)
    eng1.run()
    res1 = build_run_result(eng1, 0.1)
    
    eng2 = SimulationEngine(seed=seed, dispatcher=CoverageAwareDispatcher(), num_vehicles=20, num_incidents=100)
    eng2.run()
    res2 = build_run_result(eng2, 0.1)
    
    # 1. Identical assignments
    assert len(res1.assignments) == len(res2.assignments)
    for a1, a2 in zip(res1.assignments, res2.assignments):
        assert a1.assignment_id == a2.assignment_id
        assert a1.incident_id == a2.incident_id
        assert a1.vehicle_id == a2.vehicle_id
        assert a1.dispatch_time == a2.dispatch_time
        assert math.isclose(a1.response_time, a2.response_time, abs_tol=1e-9)
        
    # 2. Identical metrics
    assert math.isclose(res1.metrics.weighted_response_mean, res2.metrics.weighted_response_mean, abs_tol=1e-9)
    assert res1.metrics.total_outage_minutes == res2.metrics.total_outage_minutes
    
    # 3. Identical coverage timeline
    assert len(res1.coverage_timeline) == len(res2.coverage_timeline)
    for c1, c2 in zip(res1.coverage_timeline, res2.coverage_timeline):
        assert c1.minute == c2.minute
        assert c1.idle_LL == c2.idle_LL
        assert c1.idle_UL == c2.idle_UL
        assert c1.idle_LR == c2.idle_LR
        assert c1.idle_UR == c2.idle_UR
        assert c1.coverage_healthy == c2.coverage_healthy
