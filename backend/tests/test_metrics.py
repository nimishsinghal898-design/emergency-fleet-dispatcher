import sys
from pathlib import Path

# Add backend directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))


from app.metrics import calculate_metrics, validate_assignments
from app.models import Assignment, CoverageRecord, Incident, IncidentStatus, Quadrant


class MockSimulationEngine:
    def __init__(self):
        self.past_assignments: list[Assignment] = []
        self.coverage_records: list[CoverageRecord] = []
        self.all_incidents: list[Incident] = []
        self.revealed_incidents: list[Incident] = []
        self.invalid_assignment_attempts = 0
        self.duplicate_assignments = 0
        self.assignments_to_busy_vehicles = 0
        self.assignments_before_reveal = 0

def test_priority_weighted_response_and_p3():
    engine = MockSimulationEngine()
    
    # Hand-craft assignments
    # A1: P1, response = 10. Weight = 1 * 10 = 10
    a1 = Assignment(
        assignment_id="A1", incident_id="I1", vehicle_id="V1", priority=1,
        dispatch_time=0, vehicle_x_before=0, vehicle_y_before=0,
        incident_x=10, incident_y=0, distance=10,
        response_time=10.0, arrival_time=10, completion_time=18,
        vehicle_quadrant_before=Quadrant.LOWER_LEFT,
        idle_counts_before={q: 1 for q in Quadrant}, idle_counts_after={q: 1 for q in Quadrant}
    )
    # A2: P2, response = 20. Weight = 3 * 20 = 60
    a2 = Assignment(
        assignment_id="A2", incident_id="I2", vehicle_id="V2", priority=2,
        dispatch_time=0, vehicle_x_before=0, vehicle_y_before=0,
        incident_x=0, incident_y=0, distance=0,
        response_time=20.0, arrival_time=20, completion_time=28,
        vehicle_quadrant_before=Quadrant.LOWER_LEFT,
        idle_counts_before={q: 1 for q in Quadrant}, idle_counts_after={q: 1 for q in Quadrant}
    )
    # A3: P3, response = 30. Weight = 7 * 30 = 210
    a3 = Assignment(
        assignment_id="A3", incident_id="I3", vehicle_id="V3", priority=3,
        dispatch_time=0, vehicle_x_before=0, vehicle_y_before=0,
        incident_x=0, incident_y=0, distance=0,
        response_time=30.0, arrival_time=30, completion_time=38,
        vehicle_quadrant_before=Quadrant.LOWER_LEFT,
        idle_counts_before={q: 1 for q in Quadrant}, idle_counts_after={q: 1 for q in Quadrant}
    )
    # A4: P3, response = 10. Weight = 7 * 10 = 70
    a4 = Assignment(
        assignment_id="A4", incident_id="I4", vehicle_id="V4", priority=3,
        dispatch_time=0, vehicle_x_before=0, vehicle_y_before=0,
        incident_x=0, incident_y=0, distance=0,
        response_time=10.0, arrival_time=10, completion_time=18,
        vehicle_quadrant_before=Quadrant.LOWER_LEFT,
        idle_counts_before={q: 1 for q in Quadrant}, idle_counts_after={q: 1 for q in Quadrant}
    )
    
    engine.past_assignments = [a1, a2, a3, a4]
    
    metrics = calculate_metrics(engine)
    
    # 1. Check priority weighted response
    # Sum = 10 + 60 + 210 + 70 = 350
    # Mean = 350 / 4 = 87.5
    assert metrics.weighted_response_sum == 350.0
    assert metrics.weighted_response_mean == 87.5
    
    # 2. Check P3 stats
    # P3 responses: [30, 10] -> count 2
    # mean: 20
    # max: 30
    # min: 10
    # median: 20
    assert metrics.p3_count == 2
    assert metrics.p3_mean_response == 20.0
    assert metrics.p3_max_response == 30.0
    assert metrics.p3_min_response == 10.0
    assert metrics.p3_median_response == 20.0

def test_coverage_outage_minutes():
    engine = MockSimulationEngine()
    
    # Healthy record
    r1 = CoverageRecord(minute=0, idle_LL=1, idle_UL=1, idle_LR=1, idle_UR=1, coverage_healthy=True, outage=0)
    # Outage in LL
    r2 = CoverageRecord(minute=1, idle_LL=0, idle_UL=1, idle_LR=1, idle_UR=1, coverage_healthy=False, outage=1)
    # Outage in LL and UR
    r3 = CoverageRecord(minute=2, idle_LL=0, idle_UL=1, idle_LR=1, idle_UR=0, coverage_healthy=False, outage=1)
    
    engine.coverage_records = [r1, r2, r3]
    
    metrics = calculate_metrics(engine)
    
    assert metrics.total_outage_minutes == 2
    assert metrics.outage_minutes_LL == 2
    assert metrics.outage_minutes_UR == 1
    assert metrics.outage_minutes_LR == 0

def test_validation_counts():
    engine = MockSimulationEngine()
    
    engine.all_incidents = [
        Incident(id="I1", arrival_minute=0, x=0, y=0, priority=1),
        Incident(id="I2", arrival_minute=0, x=0, y=0, priority=1),
        Incident(id="I3", arrival_minute=0, x=0, y=0, priority=1)
    ]
    
    engine.all_incidents[0].status = IncidentStatus.COMPLETED
    engine.all_incidents[1].status = IncidentStatus.ASSIGNED
    engine.all_incidents[2].status = IncidentStatus.WAITING
    
    engine.revealed_incidents = engine.all_incidents
    
    engine.invalid_assignment_attempts = 5
    engine.duplicate_assignments = 2
    
    results = validate_assignments(engine)
    
    assert results.total_incidents == 3
    assert results.assigned_incidents == 2
    assert results.waiting_incidents == 1
    assert results.invalid_assignment_attempts == 5
    assert results.duplicate_assignments == 2
