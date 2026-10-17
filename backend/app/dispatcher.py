import math

from app.models import Quadrant, SimulationState, VehicleStatus
from app.simulation import DispatcherInterface


class DispatcherConfig:
    def __init__(self, response_weight: float = 1.0, coverage_weight: float = 100.0, scarcity_weight: float = 20.0):
        self.response_weight = response_weight
        self.coverage_weight = coverage_weight
        self.scarcity_weight = scarcity_weight

class CoverageAwareDispatcher(DispatcherInterface):
    """
    Coverage-Aware Priority Dispatcher.
    Optimizes a combination of priority urgency, response time, coverage preservation, and vehicle scarcity.
    """
    def __init__(self, config: DispatcherConfig = None):
        self.config = config or DispatcherConfig()
        
    def assign(self, state: SimulationState) -> list[tuple[str, str]]:
        assignments = []
        assigned_vehicles = set()
        
        # Track idle counts dynamically as we make assignments within the same minute
        idle_counts = {q: 0 for q in Quadrant}
        for v in state.vehicles:
            if v.status == VehicleStatus.IDLE and v.id not in assigned_vehicles:
                idle_counts[v.get_quadrant()] += 1
                
        # Incidents are already sorted in the waiting queue by:
        # Priority descending, arrival time ascending, incident ID ascending
        for incident in state.waiting_incidents:
            idle_vehicles = [
                v for v in state.vehicles 
                if v.status == VehicleStatus.IDLE and v.id not in assigned_vehicles
            ]
            if not idle_vehicles:
                break
                
            priority_weights = {1: 1, 2: 3, 3: 7}
            w_p = priority_weights.get(incident.priority, 1)
            
            best_vehicle = None
            best_score = -float('inf')
            best_dist = float('inf')
            
            for v in idle_vehicles:
                dist = math.sqrt((v.x - incident.x)**2 + (v.y - incident.y)**2)
                
                # Response time component
                response_cost = dist * self.config.response_weight
                
                quad = v.get_quadrant()
                count_before = idle_counts[quad]
                count_after = count_before - 1
                
                # Coverage risk penalty (if taking this vehicle leaves the quadrant empty)
                coverage_penalty = self.config.coverage_weight if count_after == 0 else 0
                
                # Vehicle scarcity penalty (fewer vehicles in quadrant = higher penalty)
                scarcity_penalty = self.config.scarcity_weight / max(1, count_before)
                
                # Combine penalties, scaled inversely by priority weight.
                # Higher priority emergencies discount the coverage and scarcity penalties.
                effective_cost = response_cost + (coverage_penalty + scarcity_penalty) / w_p
                
                # We want to minimize cost, which is equivalent to maximizing the negative cost
                score = -effective_cost
                
                # Deterministic Tie-Breaking
                # 4. Lower estimated response time (dist)
                # 5. Lower vehicle ID
                is_better = False
                epsilon = 1e-6
                
                if (
                    best_vehicle is None
                    or score > best_score + epsilon
                    or (abs(score - best_score) <= epsilon and (dist < best_dist - epsilon or (abs(dist - best_dist) <= epsilon and v.id < best_vehicle.id)))
                ):
                    is_better = True
                                
                if is_better:
                    best_score = score
                    best_vehicle = v
                    best_dist = dist
                    
            if best_vehicle:
                assignments.append((incident.id, best_vehicle.id))
                assigned_vehicles.add(best_vehicle.id)
                idle_counts[best_vehicle.get_quadrant()] -= 1
                
        return assignments
