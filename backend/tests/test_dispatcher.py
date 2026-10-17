import sys
from pathlib import Path

# Add backend directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.dispatcher import CoverageAwareDispatcher
from app.models import (
    Incident,
    IncidentStatus,
    SimulationState,
    Vehicle,
    VehicleStatus,
)
from app.simulation import SimulationEngine


def test_causality_boundary():
    """
    Test that modifying a future incident does not change the current dispatcher decision.
    """
    engine1 = SimulationEngine(seed=123, dispatcher=CoverageAwareDispatcher())
    engine2 = SimulationEngine(seed=123, dispatcher=CoverageAwareDispatcher())
    
    # In engine2, modify an incident that arrives at t=10
    future_incident = next(i for i in engine2.all_incidents if i.arrival_minute > 5)
    future_incident.priority = 3
    future_incident.x = 99.9
    future_incident.y = 99.9
    
    # Step both engines to t=5
    for t in range(6):
        engine1.t = t
        engine2.t = t
        
        # Step B: Reveal
        arriving_now1 = [i for i in engine1.all_incidents if i.arrival_minute == t]
        engine1.revealed_incidents.extend(arriving_now1)
        
        arriving_now2 = [i for i in engine2.all_incidents if i.arrival_minute == t]
        engine2.revealed_incidents.extend(arriving_now2)
        
        # We only need to check if the dispatcher produces the exact same assignments
        waiting1 = engine1._get_waiting_incidents()
        state1 = SimulationState(
            t=t,
            vehicles=[Vehicle(**v.model_dump()) for v in engine1.vehicles],
            waiting_incidents=[Incident(**i.model_dump()) for i in waiting1],
            revealed_incidents=[],
            past_assignments=[],
            coverage_records=[]
        )
        
        waiting2 = engine2._get_waiting_incidents()
        state2 = SimulationState(
            t=t,
            vehicles=[Vehicle(**v.model_dump()) for v in engine2.vehicles],
            waiting_incidents=[Incident(**i.model_dump()) for i in waiting2],
            revealed_incidents=[],
            past_assignments=[],
            coverage_records=[]
        )
        
        assign1 = engine1.dispatcher.assign(state1)
        assign2 = engine2.dispatcher.assign(state2)
        
        assert assign1 == assign2, "Causality leak: Future incident changed current assignment!"

def test_coverage_preservation():
    """
    Dispatcher should pick a slightly further vehicle to avoid dropping a quadrant's coverage to 0.
    """
    dispatcher = CoverageAwareDispatcher()
    
    # 1 idle vehicle in LL
    v1 = Vehicle(id="V1", x=25, y=25, status=VehicleStatus.IDLE)
    # 5 idle vehicles in LR
    v2 = Vehicle(id="V2", x=75, y=25, status=VehicleStatus.IDLE)
    v3 = Vehicle(id="V3", x=76, y=25, status=VehicleStatus.IDLE)
    v4 = Vehicle(id="V4", x=77, y=25, status=VehicleStatus.IDLE)
    v5 = Vehicle(id="V5", x=78, y=25, status=VehicleStatus.IDLE)
    v6 = Vehicle(id="V6", x=79, y=25, status=VehicleStatus.IDLE)
    
    # Incident at x=45, y=25 (dist to V1 = 20, dist to V2 = 30)
    inc = Incident(id="I1", arrival_minute=0, x=45, y=25, priority=1, status=IncidentStatus.WAITING)
    
    state = SimulationState(
        t=0,
        vehicles=[v1, v2, v3, v4, v5, v6],
        waiting_incidents=[inc],
        revealed_incidents=[inc],
        past_assignments=[],
        coverage_records=[]
    )
    
    assignments = dispatcher.assign(state)
    assert len(assignments) == 1
    # Even though V1 is closer (20 vs 30), picking V1 empties LL quadrant.
    # Cost V1: 20 + 100/1 = 120
    # Cost V2: 30 + 0 + 20/5 = 34
    assert assignments[0] == ("I1", "V2")

def test_priority_urgency():
    """
    Priority 3 incident justifies taking the last vehicle in a quadrant, even if it's far.
    """
    dispatcher = CoverageAwareDispatcher()
    
    v1 = Vehicle(id="V1", x=25, y=25, status=VehicleStatus.IDLE) # Last in LL
    v2 = Vehicle(id="V2", x=75, y=25, status=VehicleStatus.IDLE) # Last in LR
    
    # P3 Incident
    inc = Incident(id="I1", arrival_minute=0, x=25, y=75, priority=3, status=IncidentStatus.WAITING)
    
    state = SimulationState(
        t=0,
        vehicles=[v1, v2],
        waiting_incidents=[inc],
        revealed_incidents=[inc],
        past_assignments=[],
        coverage_records=[]
    )
    
    assignments = dispatcher.assign(state)
    assert len(assignments) == 1
    # Both V1 and V2 are the last in their quadrants. 
    # V1 is at (25,25), inc at (25,75). Dist = 50.
    # Cost V1 = 50 + 100/7 = 64.2
    assert assignments[0] == ("I1", "V1")

def test_deterministic_tie_breaking():
    dispatcher = CoverageAwareDispatcher()
    
    # Two vehicles perfectly identical in distance and quadrant context
    v1 = Vehicle(id="V2", x=25, y=25, status=VehicleStatus.IDLE)
    v2 = Vehicle(id="V1", x=25, y=25, status=VehicleStatus.IDLE)
    
    inc = Incident(id="I1", arrival_minute=0, x=25, y=30, priority=1, status=IncidentStatus.WAITING)
    
    state = SimulationState(
        t=0,
        vehicles=[v1, v2],
        waiting_incidents=[inc],
        revealed_incidents=[inc],
        past_assignments=[],
        coverage_records=[]
    )
    
    assignments = dispatcher.assign(state)
    assert len(assignments) == 1
    # Should pick V1 because of lower ID
    assert assignments[0] == ("I1", "V1")

def test_busy_vehicles_ignored():
    dispatcher = CoverageAwareDispatcher()
    
    v1 = Vehicle(id="V1", x=25, y=25, status=VehicleStatus.BUSY)
    v2 = Vehicle(id="V2", x=75, y=75, status=VehicleStatus.IDLE)
    
    inc = Incident(id="I1", arrival_minute=0, x=25, y=30, priority=1, status=IncidentStatus.WAITING)
    
    state = SimulationState(
        t=0,
        vehicles=[v1, v2],
        waiting_incidents=[inc],
        revealed_incidents=[inc],
        past_assignments=[],
        coverage_records=[]
    )
    
    assignments = dispatcher.assign(state)
    assert len(assignments) == 1
    # Must pick V2 even though V1 is closer, because V1 is busy
    assert assignments[0] == ("I1", "V2")

def test_queue_behavior_no_vehicles():
    dispatcher = CoverageAwareDispatcher()
    
    inc = Incident(id="I1", arrival_minute=0, x=25, y=30, priority=1, status=IncidentStatus.WAITING)
    
    state = SimulationState(
        t=0,
        vehicles=[],
        waiting_incidents=[inc],
        revealed_incidents=[inc],
        past_assignments=[],
        coverage_records=[]
    )
    
    assignments = dispatcher.assign(state)
    # Should return empty assignments, leaving incident in queue
    assert len(assignments) == 0
