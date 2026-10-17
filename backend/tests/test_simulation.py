import math
import sys
from pathlib import Path

# Add backend directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.models import IncidentStatus, Quadrant, VehicleStatus
from app.simulation import BaselineDispatcher, ScenarioGenerator, SimulationEngine


def test_same_seed_identical_scenario():
    vehicles1, incidents1 = ScenarioGenerator.generate_scenario(20260911)
    vehicles2, incidents2 = ScenarioGenerator.generate_scenario(20260911)
    
    assert [v.model_dump() for v in vehicles1] == [v.model_dump() for v in vehicles2]
    assert [i.model_dump() for i in incidents1] == [i.model_dump() for i in incidents2]

def test_different_seeds_different_scenario():
    vehicles1, incidents1 = ScenarioGenerator.generate_scenario(20260911)
    vehicles2, incidents2 = ScenarioGenerator.generate_scenario(20260912)
    
    assert [v.model_dump() for v in vehicles1] != [v.model_dump() for v in vehicles2]
    assert [i.model_dump() for i in incidents1] != [i.model_dump() for i in incidents2]

def test_counts_and_distributions():
    vehicles, incidents = ScenarioGenerator.generate_scenario(20260911)
    
    assert len(vehicles) == 20
    assert len(incidents) == 100
    
    # 5 per quadrant
    quad_counts = {q: 0 for q in Quadrant}
    for v in vehicles:
        quad_counts[v.get_quadrant()] += 1
        
    for count in quad_counts.values():
        assert count == 5
        
    # Priorities
    p_counts = {1: 0, 2: 0, 3: 0}
    for i in incidents:
        p_counts[i.priority] += 1
        assert 0 <= i.arrival_minute <= 59
        assert 0 <= i.x <= 100
        assert 0 <= i.y <= 100
        
    # Should roughly match 60%, 30%, 10%
    assert p_counts[1] > 0
    assert p_counts[2] > 0

def test_quadrant_classification():
    from app.models import Vehicle
    v = Vehicle(id="1", x=49.9, y=49.9)
    assert v.get_quadrant() == Quadrant.LOWER_LEFT
    
    v.x, v.y = 49.9, 50.0
    assert v.get_quadrant() == Quadrant.UPPER_LEFT
    
    v.x, v.y = 50.0, 49.9
    assert v.get_quadrant() == Quadrant.LOWER_RIGHT
    
    v.x, v.y = 50.0, 50.0
    assert v.get_quadrant() == Quadrant.UPPER_RIGHT

def test_euclidean_distance_and_8min_completion():
    # Setup custom scenario for a deterministic micro-test
    from app.models import Incident, Vehicle
    
    v1 = Vehicle(id="V01", x=0, y=0, status=VehicleStatus.IDLE)
    i1 = Incident(id="I001", arrival_minute=0, x=3, y=4, priority=1, status=IncidentStatus.WAITING)
    
    class MicroGenerator:
        @staticmethod
        def generate_scenario(seed=0):
            return [v1], [i1]
            
    engine = SimulationEngine(seed=0, dispatcher=BaselineDispatcher())
    engine.vehicles = [v1]
    engine.all_incidents = [i1]
    
    # Run a few minutes
    engine.run()
    
    assert len(engine.past_assignments) == 1
    a = engine.past_assignments[0]
    
    # distance from 0,0 to 3,4 is 5
    assert math.isclose(a.distance, 5.0)
    
    # arrival minute = 0, travel time = 5 -> arrival time = 5
    assert math.isclose(a.arrival_time, 5.0)
    
    # 8-minute service -> completion time = 13
    assert math.isclose(a.completion_time, 13.0)
    
    # Vehicle should be idle by minute 13
    # Our evaluation finishes at 120, check the final vehicle state
    assert engine.vehicles[0].status == VehicleStatus.IDLE
    assert engine.vehicles[0].x == 3
    assert engine.vehicles[0].y == 4

def test_causal_boundary():
    # We want to ensure that changing future incidents does not change the assignment at minute t
    # by validating that the dispatcher object only received state up to minute t
    class LeakyDispatcher(BaselineDispatcher):
        def assign(self, state):
            # Check if there's any incident in state with arrival_minute > state.t
            for i in state.revealed_incidents:
                assert i.arrival_minute <= state.t
            for i in state.waiting_incidents:
                assert i.arrival_minute <= state.t
            return super().assign(state)
            
    engine = SimulationEngine(dispatcher=LeakyDispatcher())
    engine.run() # Will assert internally if future is leaked
