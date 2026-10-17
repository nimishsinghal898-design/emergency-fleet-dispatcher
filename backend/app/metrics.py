import time

from app.models import (
    Incident,
    IncidentStatus,
    Metrics,
    RunResult,
    ScenarioSummary,
    ValidationResults,
    Vehicle,
)
from app.simulation import SimulationEngine


def calculate_metrics(engine: SimulationEngine) -> Metrics:
    """
    Calculates the evaluation metrics based on the simulation events.
    """
    m = Metrics()
    
    # Priority weighted response
    weighted_sum = 0.0
    p3_responses = []
    
    for a in engine.past_assignments:
        weight = {1: 1, 2: 3, 3: 7}.get(a.priority, 1)
        # 1. Priority-weighted response time
        # weighted contribution = priority_weight * response_time
        weighted_sum += weight * a.response_time
        
        # 2. Priority-3 response time
        if a.priority == 3:
            p3_responses.append(a.response_time)
            
    m.weighted_response_sum = weighted_sum
    # Use normalized weighted mean to ensure comparability
    m.weighted_response_mean = weighted_sum / len(engine.past_assignments) if engine.past_assignments else 0.0
    
    if p3_responses:
        m.p3_count = len(p3_responses)
        m.p3_mean_response = sum(p3_responses) / len(p3_responses)
        m.p3_max_response = max(p3_responses)
        m.p3_min_response = min(p3_responses)
        p3_sorted = sorted(p3_responses)
        mid = len(p3_sorted) // 2
        m.p3_median_response = (p3_sorted[mid] + p3_sorted[~mid]) / 2.0
        
    # 3. Coverage-outage minutes
    for c in engine.coverage_records:
        if c.outage > 0:
            m.total_outage_minutes += 1
            if c.idle_LL == 0: m.outage_minutes_LL += 1
            if c.idle_UL == 0: m.outage_minutes_UL += 1
            if c.idle_LR == 0: m.outage_minutes_LR += 1
            if c.idle_UR == 0: m.outage_minutes_UR += 1
            
    return m

def validate_assignments(engine: SimulationEngine) -> ValidationResults:
    """
    Calculates the assignment validation counts.
    """
    total = len(engine.all_incidents)
    assigned = len([i for i in engine.revealed_incidents if i.status in (IncidentStatus.COMPLETED, IncidentStatus.ASSIGNED)])
    waiting = len([i for i in engine.revealed_incidents if i.status == IncidentStatus.WAITING])
    
    return ValidationResults(
        total_incidents=total,
        assigned_incidents=assigned,
        waiting_incidents=waiting,
        invalid_assignment_attempts=engine.invalid_assignment_attempts,
        duplicate_assignments=engine.duplicate_assignments,
        assignments_to_busy_vehicles=engine.assignments_to_busy_vehicles,
        assignments_before_reveal=engine.assignments_before_reveal
    )

def generate_scenario_summary(engine: SimulationEngine) -> ScenarioSummary:
    """
    Generates a high level summary of the simulation scenario.
    """
    p1 = sum(1 for i in engine.all_incidents if i.priority == 1)
    p2 = sum(1 for i in engine.all_incidents if i.priority == 2)
    p3 = sum(1 for i in engine.all_incidents if i.priority == 3)
    
    return ScenarioSummary(
        total_vehicles=len(engine.vehicles),
        total_incidents=len(engine.all_incidents),
        priority_1_count=p1,
        priority_2_count=p2,
        priority_3_count=p3
    )

def build_run_result(engine: SimulationEngine, total_runtime: float) -> RunResult:
    """
    Constructs the complete RunResult object.
    """
    t0 = time.time()
    
    scenario_summary = generate_scenario_summary(engine)
    metrics = calculate_metrics(engine)
    validation = validate_assignments(engine)
    
    metrics_time = time.time() - t0
    
    return RunResult(
        seed=engine.seed,
        scenario_summary=scenario_summary,
        assignments=engine.past_assignments,
        metrics=metrics,
        coverage_timeline=engine.coverage_records,
        vehicles=[Vehicle(**v.model_dump()) for v in engine.vehicles],
        incidents=[Incident(**i.model_dump()) for i in engine.all_incidents],
        validation_results=validation,
        simulation_runtime=engine.total_runtime,
        dispatcher_runtime=engine.dispatcher_time_sum,
        metrics_runtime=metrics_time,
        total_runtime=total_runtime
    )
