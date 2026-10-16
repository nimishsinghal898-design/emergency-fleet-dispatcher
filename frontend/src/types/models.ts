export type Quadrant = "LOWER_LEFT" | "UPPER_LEFT" | "LOWER_RIGHT" | "UPPER_RIGHT";
export type VehicleStatus = "IDLE" | "BUSY";
export type IncidentStatus = "WAITING" | "ASSIGNED" | "COMPLETED";

export interface Vehicle {
    id: string;
    x: number;
    y: number;
    status: VehicleStatus;
    current_incident_id: string | null;
    completion_time: number | null;
}

export interface Incident {
    id: string;
    arrival_minute: number;
    x: number;
    y: number;
    priority: number;
    status: IncidentStatus;
    assigned_vehicle_id: string | null;
    dispatch_time: number | null;
    response_time: number | null;
    completion_time: number | null;
}

export interface Assignment {
    assignment_id: string;
    incident_id: string;
    vehicle_id: string;
    priority: number;
    dispatch_time: number;
    vehicle_x_before: number;
    vehicle_y_before: number;
    incident_x: number;
    incident_y: number;
    distance: number;
    response_time: number;
    arrival_time: number;
    completion_time: number;
    vehicle_quadrant_before: Quadrant;
    idle_counts_before: Record<Quadrant, number>;
    idle_counts_after: Record<Quadrant, number>;
}

export interface CoverageRecord {
    minute: number;
    idle_LL: number;
    idle_UL: number;
    idle_LR: number;
    idle_UR: number;
    coverage_healthy: boolean;
    outage: number;
}

export interface Metrics {
    weighted_response_sum: number;
    weighted_response_mean: number;
    p3_mean_response: number | null;
    p3_median_response: number | null;
    p3_max_response: number | null;
    p3_min_response: number | null;
    p3_count: number;
    total_outage_minutes: number;
    outage_minutes_LL: number;
    outage_minutes_UL: number;
    outage_minutes_LR: number;
    outage_minutes_UR: number;
}

export interface ScenarioSummary {
    total_vehicles: number;
    total_incidents: number;
    priority_1_count: number;
    priority_2_count: number;
    priority_3_count: number;
}

export interface ValidationResults {
    total_incidents: number;
    assigned_incidents: number;
    waiting_incidents: number;
    invalid_assignment_attempts: number;
    duplicate_assignments: number;
    assignments_to_busy_vehicles: number;
    assignments_before_reveal: number;
}

export interface RunResult {
    run_id: string;
    seed: number;
    scenario_summary: ScenarioSummary;
    assignments: Assignment[];
    metrics: Metrics;
    coverage_timeline: CoverageRecord[];
    vehicles: Vehicle[];
    incidents: Incident[];
    validation_results: ValidationResults;
    simulation_runtime: number;
    dispatcher_runtime: number;
    metrics_runtime: number;
    total_runtime: number;
}

export interface SimulationRequest {
    seed?: number;
    dispatcher_type?: string;
    experimental_mode?: boolean;
    num_vehicles?: number;
    num_incidents?: number;
}

export interface SimulationResponse {
    run_id: string;
    message: string;
}

export interface TimelineEvent {
    type: 'assignment' | 'coverage';
    time: number;
    data: Assignment | CoverageRecord;
}

export interface MetricsResponse {
    metrics: Metrics;
    validation_results: ValidationResults;
    scenario_summary: ScenarioSummary;
    runtime: {
        simulation: number;
        dispatcher: number;
        metrics: number;
        total: number;
    };
}
