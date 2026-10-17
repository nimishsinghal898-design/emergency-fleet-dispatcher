from enum import Enum

# pyrefly: ignore [missing-import]
from pydantic import BaseModel


class Quadrant(str, Enum):
    LOWER_LEFT = "LOWER_LEFT"
    UPPER_LEFT = "UPPER_LEFT"
    LOWER_RIGHT = "LOWER_RIGHT"
    UPPER_RIGHT = "UPPER_RIGHT"

class VehicleStatus(str, Enum):
    IDLE = "IDLE"
    BUSY = "BUSY"

class IncidentStatus(str, Enum):
    WAITING = "WAITING"
    ASSIGNED = "ASSIGNED"
    COMPLETED = "COMPLETED"

class Vehicle(BaseModel):
    id: str
    x: float
    y: float
    status: VehicleStatus = VehicleStatus.IDLE
    current_incident_id: str | None = None
    completion_time: float | None = None

    def get_quadrant(self) -> Quadrant:
        if self.x < 50 and self.y < 50:
            return Quadrant.LOWER_LEFT
        elif self.x < 50 and self.y >= 50:
            return Quadrant.UPPER_LEFT
        elif self.x >= 50 and self.y < 50:
            return Quadrant.LOWER_RIGHT
        else:
            return Quadrant.UPPER_RIGHT

class Incident(BaseModel):
    id: str
    arrival_minute: int
    x: float
    y: float
    priority: int
    status: IncidentStatus = IncidentStatus.WAITING
    assigned_vehicle_id: str | None = None
    dispatch_time: int | None = None
    response_time: float | None = None
    completion_time: float | None = None

class Assignment(BaseModel):
    assignment_id: str
    incident_id: str
    vehicle_id: str
    priority: int
    dispatch_time: int
    vehicle_x_before: float
    vehicle_y_before: float
    incident_x: float
    incident_y: float
    distance: float
    response_time: float
    arrival_time: float
    completion_time: float
    vehicle_quadrant_before: Quadrant
    idle_counts_before: dict[Quadrant, int]
    idle_counts_after: dict[Quadrant, int]

class CoverageRecord(BaseModel):
    minute: int
    idle_LL: int
    idle_UL: int
    idle_LR: int
    idle_UR: int
    coverage_healthy: bool
    outage: int

class Metrics(BaseModel):
    weighted_response_sum: float = 0.0
    weighted_response_mean: float = 0.0
    p3_mean_response: float | None = None
    p3_median_response: float | None = None
    p3_max_response: float | None = None
    p3_min_response: float | None = None
    p3_count: int = 0
    total_outage_minutes: int = 0
    outage_minutes_LL: int = 0
    outage_minutes_UL: int = 0
    outage_minutes_LR: int = 0
    outage_minutes_UR: int = 0

class ScenarioSummary(BaseModel):
    total_vehicles: int
    total_incidents: int
    priority_1_count: int
    priority_2_count: int
    priority_3_count: int

class ValidationResults(BaseModel):
    total_incidents: int
    assigned_incidents: int
    waiting_incidents: int
    invalid_assignment_attempts: int
    duplicate_assignments: int
    assignments_to_busy_vehicles: int
    assignments_before_reveal: int

class RunResult(BaseModel):
    seed: int
    scenario_summary: ScenarioSummary
    assignments: list[Assignment]
    metrics: Metrics
    coverage_timeline: list[CoverageRecord]
    vehicles: list[Vehicle]
    incidents: list[Incident]
    validation_results: ValidationResults
    simulation_runtime: float
    dispatcher_runtime: float
    metrics_runtime: float
    total_runtime: float

class SimulationState(BaseModel):
    t: int
    vehicles: list[Vehicle]
    waiting_incidents: list[Incident]
    revealed_incidents: list[Incident] # Includes waiting, assigned, completed
    past_assignments: list[Assignment]
    coverage_records: list[CoverageRecord]
