import copy

import numpy as np
from app.dispatcher import CoverageAwareDispatcher
from app.models import Incident, IncidentStatus
from app.simulation import SimulationEngine


def test_dispatcher_causality_mutated_future_incidents():
    """
    Proves that altering future incidents (arriving after t) has strictly ZERO impact
    on the decisions made up to and including minute t.
    """
    seed = 20260911
    checkpoint_t = 12

    # Baseline run
    eng1 = SimulationEngine(seed=seed, dispatcher=CoverageAwareDispatcher(), num_vehicles=20, num_incidents=100)
    for _ in range(checkpoint_t + 1):
        eng1.step()
    assignments1 = copy.deepcopy(eng1.past_assignments)

    # Perturbed future run
    eng2 = SimulationEngine(seed=seed, dispatcher=CoverageAwareDispatcher(), num_vehicles=20, num_incidents=100)
    
    # Mutate all future incidents arriving strictly after checkpoint_t
    for inc in eng2.all_incidents:
        if inc.arrival_minute > checkpoint_t:
            inc.priority = 3 if inc.priority == 1 else 1
            inc.x = 99.9
            inc.y = 99.9
            inc.arrival_minute = 119

    for _ in range(checkpoint_t + 1):
        eng2.step()
    assignments2 = eng2.past_assignments

    assert len(assignments1) == len(assignments2), "Causality violated: assignment count changed based on future!"
    for a1, a2 in zip(assignments1, assignments2):
        assert a1.assignment_id == a2.assignment_id
        assert a1.incident_id == a2.incident_id
        assert a1.vehicle_id == a2.vehicle_id
        assert a1.dispatch_time == a2.dispatch_time
        assert a1.response_time == a2.response_time

def test_dispatcher_causality_added_future_incidents():
    """
    Adding 50 synthetic future incidents arriving after t=10 must not alter
    any decisions made up to minute 10.
    """
    seed = 42
    checkpoint_t = 10

    eng1 = SimulationEngine(seed=seed, dispatcher=CoverageAwareDispatcher(), num_vehicles=20, num_incidents=100)
    for _ in range(checkpoint_t + 1):
        eng1.step()
    assignments1 = copy.deepcopy(eng1.past_assignments)

    eng2 = SimulationEngine(seed=seed, dispatcher=CoverageAwareDispatcher(), num_vehicles=20, num_incidents=100)
    # Inject 50 new high-priority future incidents arriving at t=15
    for i in range(50):
        eng2.all_incidents.append(Incident(
            id=f"FUTURE_{i:03d}",
            arrival_minute=15,
            x=10.0,
            y=10.0,
            priority=3,
            status=IncidentStatus.WAITING
        ))

    for _ in range(checkpoint_t + 1):
        eng2.step()
    assignments2 = eng2.past_assignments

    assert len(assignments1) == len(assignments2)
    for a1, a2 in zip(assignments1, assignments2):
        assert a1.incident_id == a2.incident_id
        assert a1.vehicle_id == a2.vehicle_id

def test_dispatcher_causality_multiple_checkpoints():
    """
    Verify causality holds invariant across multiple distinct time horizons: t=5, t=15, t=25.
    """
    for checkpoint in [5, 15, 25]:
        eng_orig = SimulationEngine(seed=999, dispatcher=CoverageAwareDispatcher(), num_vehicles=20, num_incidents=100)
        for _ in range(checkpoint + 1):
            eng_orig.step()
        orig_assignments = copy.deepcopy(eng_orig.past_assignments)

        eng_mod = SimulationEngine(seed=999, dispatcher=CoverageAwareDispatcher(), num_vehicles=20, num_incidents=100)
        # Randomly shuffle future incident priorities
        rng = np.random.default_rng(12345)
        for inc in eng_mod.all_incidents:
            if inc.arrival_minute > checkpoint:
                inc.priority = int(rng.choice([1, 2, 3]))
                inc.x = float(rng.uniform(0, 100))
                inc.y = float(rng.uniform(0, 100))

        for _ in range(checkpoint + 1):
            eng_mod.step()
        mod_assignments = eng_mod.past_assignments

        assert len(orig_assignments) == len(mod_assignments), f"Failed causality at checkpoint t={checkpoint}"
        for a1, a2 in zip(orig_assignments, mod_assignments):
            assert a1.incident_id == a2.incident_id
            assert a1.vehicle_id == a2.vehicle_id
            assert a1.dispatch_time == a2.dispatch_time
