# pyrefly: ignore [missing-import]
import math
import time

import numpy as np
from app.models import (
    Assignment,
    CoverageRecord,
    Incident,
    IncidentStatus,
    Quadrant,
    SimulationState,
    Vehicle,
    VehicleStatus,
)


class ScenarioGenerator:
    @staticmethod
    def generate_scenario(seed: int = 20260911, num_vehicles: int = 20, num_incidents: int = 100) -> tuple[list[Vehicle], list[Incident]]:
        rng = np.random.Generator(np.random.PCG64(seed))
        
        vehicles = []
        v_idx = 1
        
        # Quadrant boundaries for uniform sampling
        # LL: x in [0, 50), y in [0, 50)
        # UL: x in [0, 50), y in [50, 100]
        # LR: x in [50, 100], y in [0, 50)
        # UR: x in [50, 100], y in [50, 100]
        
        quadrant_bounds = [
            (Quadrant.LOWER_LEFT, 0, 50, 0, 50),
            (Quadrant.UPPER_LEFT, 0, 50, 50, 100),
            (Quadrant.LOWER_RIGHT, 50, 100, 0, 50),
            (Quadrant.UPPER_RIGHT, 50, 100, 50, 100)
        ]
        
        vehicles_per_quad = num_vehicles // 4
        remainder = num_vehicles % 4
        
        for i, (quad, x_min, x_max, y_min, y_max) in enumerate(quadrant_bounds):
            count = vehicles_per_quad + (1 if i < remainder else 0)
            for _ in range(count):
                # Using rng.uniform(low, high)
                x = rng.uniform(x_min, x_max)
                y = rng.uniform(y_min, y_max)
                # To strictly satisfy the bounds if high is inclusive/exclusive, uniform is [low, high). 
                # Since x<50 is LL, x=50 goes to LR. This is fine with uniform.
                vehicles.append(Vehicle(
                    id=f"V{v_idx:02d}",
                    x=x,
                    y=y,
                    status=VehicleStatus.IDLE
                ))
                v_idx += 1
                
        incidents = []
        for i_idx in range(1, num_incidents + 1):
            arrival = int(rng.integers(0, 60)) # [0, 59]
            x = rng.uniform(0, 100)
            y = rng.uniform(0, 100)
            priority = int(rng.choice([1, 2, 3], p=[0.60, 0.30, 0.10]))
            
            incidents.append(Incident(
                id=f"I{i_idx:03d}",
                arrival_minute=arrival,
                x=x,
                y=y,
                priority=priority,
                status=IncidentStatus.WAITING
            ))
            
        return vehicles, incidents

class DispatcherInterface:
    def assign(self, state: SimulationState) -> list[tuple[str, str]]:
        """
        Must return a list of (incident_id, vehicle_id) assignments.
        """
        raise NotImplementedError

class BaselineDispatcher(DispatcherInterface):
    """
    Nearest Idle Vehicle baseline dispatcher for testing.
    """
    def assign(self, state: SimulationState) -> list[tuple[str, str]]:
        assignments = []
        assigned_vehicles = set()
        
        for incident in state.waiting_incidents:
            idle_vehicles = [
                v for v in state.vehicles 
                if v.status == VehicleStatus.IDLE and v.id not in assigned_vehicles
            ]
            if not idle_vehicles:
                break # No more vehicles available
            
            # Tie breaking: distance, then vehicle ID
            def sort_key(v, inc=incident):
                dist = math.sqrt((v.x - inc.x)**2 + (v.y - inc.y)**2)
                return (dist, v.id)
                
            idle_vehicles.sort(key=sort_key)
            best_vehicle = idle_vehicles[0]
            
            assignments.append((incident.id, best_vehicle.id))
            assigned_vehicles.add(best_vehicle.id)
            
        return assignments

class SimulationEngine:
    def __init__(self, seed: int = 20260911, dispatcher: DispatcherInterface = None, num_vehicles: int = 20, num_incidents: int = 100):
        self.seed = seed
        self.vehicles, self.all_incidents = ScenarioGenerator.generate_scenario(seed, num_vehicles, num_incidents)
        self.dispatcher = dispatcher or BaselineDispatcher()
        
        self.t = 0
        self.revealed_incidents: list[Incident] = []
        self.past_assignments: list[Assignment] = []
        self.coverage_records: list[CoverageRecord] = []
        
        self.invalid_assignment_attempts = 0
        self.duplicate_assignments = 0
        self.assignments_to_busy_vehicles = 0
        self.assignments_before_reveal = 0
        
        self.dispatcher_time_sum = 0.0
        
    def _get_waiting_incidents(self) -> list[Incident]:
        waiting = [i for i in self.revealed_incidents if i.status == IncidentStatus.WAITING]
        # Sort by: priority desc, arrival_time asc, incident_id asc
        waiting.sort(key=lambda i: (-i.priority, i.arrival_minute, i.id))
        return waiting
        
    def _evaluate_coverage(self) -> CoverageRecord:
        idle_counts = {q: 0 for q in Quadrant}
        for v in self.vehicles:
            if v.status == VehicleStatus.IDLE:
                idle_counts[v.get_quadrant()] += 1
                
        outage = 1 if any(c == 0 for c in idle_counts.values()) else 0
        healthy = outage == 0
        
        return CoverageRecord.model_construct(
            minute=self.t,
            idle_LL=idle_counts[Quadrant.LOWER_LEFT],
            idle_UL=idle_counts[Quadrant.UPPER_LEFT],
            idle_LR=idle_counts[Quadrant.LOWER_RIGHT],
            idle_UR=idle_counts[Quadrant.UPPER_RIGHT],
            coverage_healthy=healthy,
            outage=outage,
        )
        
    def _get_idle_counts(self) -> dict[Quadrant, int]:
        counts = {q: 0 for q in Quadrant}
        for v in self.vehicles:
            if v.status == VehicleStatus.IDLE:
                counts[v.get_quadrant()] += 1
        return counts

    def run(self):
        start_time = time.time()
        while self.t <= 120:
            self.step()
        self.total_runtime = time.time() - start_time

    def step(self):
        # A. Process vehicle completions where completion_time <= t
        for v in self.vehicles:
            if v.status == VehicleStatus.BUSY and v.completion_time is not None and v.completion_time <= self.t:
                v.status = VehicleStatus.IDLE
                v.current_incident_id = None
                v.completion_time = None
                
        # B. Reveal incidents arriving at t in ascending incident ID
        arriving_now = [i for i in self.all_incidents if i.arrival_minute == self.t]
        arriving_now.sort(key=lambda i: i.id)
        self.revealed_incidents.extend(arriving_now)
        
        # C. Process waiting incidents
        waiting_incidents = self._get_waiting_incidents()
        
        # Create a safe snapshot for the dispatcher (Causal constraint)
        # Copying necessary state to prevent accidental mutation or lookahead
        state_snapshot = SimulationState.model_construct(
            t=self.t,
            vehicles=[v.model_copy() for v in self.vehicles],
            waiting_incidents=[i.model_copy() for i in waiting_incidents],
            revealed_incidents=[i.model_copy() for i in self.revealed_incidents],
            past_assignments=list(self.past_assignments),
            coverage_records=list(self.coverage_records),
        )
        
        t_disp_start = time.time()
        assignments = self.dispatcher.assign(state_snapshot)
        self.dispatcher_time_sum += (time.time() - t_disp_start)
        
        # D. Apply assignments
        assigned_this_minute_incidents = set()
        assigned_this_minute_vehicles = set()
        
        for inc_id, veh_id in assignments:
            # Validation checks
            incident = next((i for i in self.revealed_incidents if i.id == inc_id), None)
            vehicle = next((v for v in self.vehicles if v.id == veh_id), None)
            
            if not incident or not vehicle:
                self.invalid_assignment_attempts += 1
                continue
                
            if incident.arrival_minute > self.t:
                self.assignments_before_reveal += 1
                continue
                
            if incident.status != IncidentStatus.WAITING:
                self.invalid_assignment_attempts += 1
                continue
                
            if incident.id in assigned_this_minute_incidents or vehicle.id in assigned_this_minute_vehicles:
                self.duplicate_assignments += 1
                continue
                
            if vehicle.status != VehicleStatus.IDLE:
                self.assignments_to_busy_vehicles += 1
                continue
                
            # Valid assignment
            assigned_this_minute_incidents.add(incident.id)
            assigned_this_minute_vehicles.add(vehicle.id)
            
            idle_counts_before = self._get_idle_counts()
            quadrant_before = vehicle.get_quadrant()
            vehicle_x_before = vehicle.x
            vehicle_y_before = vehicle.y
            
            dist = math.sqrt((vehicle.x - incident.x)**2 + (vehicle.y - incident.y)**2)
            travel_time = dist # Speed is 1 unit/min
            
            vehicle.status = VehicleStatus.BUSY
            vehicle.current_incident_id = incident.id
            vehicle.x = incident.x
            vehicle.y = incident.y
            
            arrival_time = self.t + travel_time
            completion_time = arrival_time + 8
            vehicle.completion_time = completion_time
            
            incident.status = IncidentStatus.ASSIGNED
            incident.assigned_vehicle_id = vehicle.id
            incident.dispatch_time = self.t
            incident.response_time = (self.t - incident.arrival_minute) + travel_time
            incident.completion_time = completion_time
            
            # We need to temporarily evaluate idle counts after this single assignment
            idle_counts_after = self._get_idle_counts()
            
            assignment_record = Assignment.model_construct(
                assignment_id=f"A{len(self.past_assignments)+1:04d}",
                incident_id=incident.id,
                vehicle_id=vehicle.id,
                priority=incident.priority,
                dispatch_time=self.t,
                vehicle_x_before=vehicle_x_before,
                vehicle_y_before=vehicle_y_before,
                incident_x=incident.x,
                incident_y=incident.y,
                distance=dist,
                response_time=incident.response_time,
                arrival_time=arrival_time,
                completion_time=completion_time,
                vehicle_quadrant_before=quadrant_before,
                idle_counts_before=idle_counts_before,
                idle_counts_after=idle_counts_after,
            )
            self.past_assignments.append(assignment_record)
                
        # E. Calculate coverage immediately after assignments
        cov_record = self._evaluate_coverage()
        self.coverage_records.append(cov_record)
        
        self.t += 1
