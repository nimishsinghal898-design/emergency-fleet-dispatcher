import csv
import io
import time
import uuid

from app.api_models import SimulationRequest, SimulationResponse
from app.dispatcher import CoverageAwareDispatcher
from app.metrics import build_run_result
from app.services.store import store
from app.simulation import BaselineDispatcher, SimulationEngine
from fastapi import APIRouter, HTTPException, Path
from fastapi.responses import Response

router = APIRouter(prefix="/api", tags=["simulation"])

RUN_ID_REGEX = r"^[a-zA-Z0-9\-_]{1,64}$"

@router.get("/health")
def health_check():
    return {"status": "ok"}

@router.post("/simulations", response_model=SimulationResponse)
def run_simulation(req: SimulationRequest):
    # Enforce constraints
    if not req.experimental_mode:
        num_vehicles = 20
        num_incidents = 100
    else:
        num_vehicles = req.num_vehicles if req.num_vehicles is not None else 20
        num_incidents = req.num_incidents if req.num_incidents is not None else 100
        
    dispatcher = CoverageAwareDispatcher() if req.dispatcher_type == "coverage" else BaselineDispatcher()
    
    t0 = time.time()
    engine = SimulationEngine(
        seed=req.seed, 
        dispatcher=dispatcher, 
        num_vehicles=num_vehicles, 
        num_incidents=num_incidents
    )
    engine.run()
    
    total_time = time.time() - t0
    run_result = build_run_result(engine, total_runtime=total_time)
    
    run_id = str(uuid.uuid4())
    store.save(run_id, run_result)
    
    return SimulationResponse(
        run_id=run_id,
        message=f"Simulation complete. Metrics: {run_result.metrics.weighted_response_mean:.2f} mean weighted response."
    )

@router.get("/simulations/{run_id}")
def get_simulation(run_id: str = Path(..., pattern=RUN_ID_REGEX)):
    result = store.get(run_id)
    if not result:
        raise HTTPException(status_code=404, detail="Simulation run not found")
    return result

@router.get("/simulations/{run_id}/timeline")
def get_timeline(run_id: str = Path(..., pattern=RUN_ID_REGEX)):
    result = store.get(run_id)
    if not result:
        raise HTTPException(status_code=404, detail="Simulation run not found")
    
    # Combine assignments and coverage records into a timeline
    events = []
    for a in result.assignments:
        events.append({"type": "assignment", "time": a.dispatch_time, "data": a})
    for c in result.coverage_timeline:
        events.append({"type": "coverage", "time": c.minute, "data": c})
        
    events.sort(key=lambda x: x["time"])
    return events

@router.get("/simulations/{run_id}/vehicles")
def get_vehicles(run_id: str = Path(..., pattern=RUN_ID_REGEX)):
    result = store.get(run_id)
    if not result:
        raise HTTPException(status_code=404, detail="Simulation run not found")
    return result.vehicles

@router.get("/simulations/{run_id}/incidents")
def get_incidents(run_id: str = Path(..., pattern=RUN_ID_REGEX)):
    result = store.get(run_id)
    if not result:
        raise HTTPException(status_code=404, detail="Simulation run not found")
    return result.incidents

@router.get("/simulations/{run_id}/assignments")
def get_assignments(run_id: str = Path(..., pattern=RUN_ID_REGEX)):
    result = store.get(run_id)
    if not result:
        raise HTTPException(status_code=404, detail="Simulation run not found")
    return result.assignments

@router.get("/simulations/{run_id}/metrics")
def get_metrics(run_id: str = Path(..., pattern=RUN_ID_REGEX)):
    result = store.get(run_id)
    if not result:
        raise HTTPException(status_code=404, detail="Simulation run not found")
    return {
        "metrics": result.metrics,
        "validation_results": result.validation_results,
        "scenario_summary": result.scenario_summary,
        "runtime": {
            "simulation": result.simulation_runtime,
            "dispatcher": result.dispatcher_runtime,
            "metrics": result.metrics_runtime,
            "total": result.total_runtime
        }
    }

@router.get("/simulations/{run_id}/coverage")
def get_coverage(run_id: str = Path(..., pattern=RUN_ID_REGEX)):
    result = store.get(run_id)
    if not result:
        raise HTTPException(status_code=404, detail="Simulation run not found")
    return result.coverage_timeline

@router.get("/simulations/{run_id}/export/json")
def export_json(run_id: str = Path(..., pattern=RUN_ID_REGEX)):
    result = store.get(run_id)
    if not result:
        raise HTTPException(status_code=404, detail="Simulation run not found")
    
    content = result.model_dump_json(indent=2)
    return Response(content=content, media_type="application/json")

@router.get("/simulations/{run_id}/export/csv")
def export_csv(run_id: str = Path(..., pattern=RUN_ID_REGEX)):
    result = store.get(run_id)
    if not result:
        raise HTTPException(status_code=404, detail="Simulation run not found")
    
    flat_metrics = {
        "seed": result.seed,
        **result.scenario_summary.model_dump(mode="json"),
        **result.validation_results.model_dump(mode="json"),
        **result.metrics.model_dump(mode="json"),
        "simulation_runtime": result.simulation_runtime,
        "dispatcher_runtime": result.dispatcher_runtime,
        "metrics_runtime": result.metrics_runtime,
        "total_runtime": result.total_runtime
    }
    
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=list(flat_metrics.keys()))
    writer.writeheader()
    writer.writerow(flat_metrics)
    
    return Response(
        content=output.getvalue(), 
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=results_{run_id}.csv"}
    )
