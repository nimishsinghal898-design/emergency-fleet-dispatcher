import sys
from pathlib import Path

from fastapi.testclient import TestClient

# Add backend directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.main import app

client = TestClient(app)

def test_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_simulation_workflow():
    # 1. Post a simulation (Official mode defaults to 20 vehicles, 100 incidents)
    response = client.post("/api/simulations", json={
        "seed": 2026,
        "experimental_mode": False
    })
    
    assert response.status_code == 200
    data = response.json()
    assert "run_id" in data
    assert "message" in data
    run_id = data["run_id"]
    
    # 2. Get the simulation result
    response = client.get(f"/api/simulations/{run_id}")
    assert response.status_code == 200
    sim_data = response.json()
    assert sim_data["seed"] == 2026
    assert sim_data["scenario_summary"]["total_vehicles"] == 20
    assert sim_data["scenario_summary"]["total_incidents"] == 100
    assert "metrics" in sim_data
    assert "vehicles" in sim_data
    assert "incidents" in sim_data
    
    # 3. Get specific endpoints
    assert client.get(f"/api/simulations/{run_id}/metrics").status_code == 200
    assert client.get(f"/api/simulations/{run_id}/coverage").status_code == 200
    assert client.get(f"/api/simulations/{run_id}/assignments").status_code == 200
    
    # 4. Check JSON export
    export_resp = client.get(f"/api/simulations/{run_id}/export/json")
    assert export_resp.status_code == 200
    assert export_resp.headers["content-type"] == "application/json"
    
def test_experimental_mode_constraints():
    # Experimental mode allows overriding defaults
    response = client.post("/api/simulations", json={
        "seed": 42,
        "experimental_mode": True,
        "num_vehicles": 10,
        "num_incidents": 50
    })
    assert response.status_code == 200
    run_id = response.json()["run_id"]
    
    sim_data = client.get(f"/api/simulations/{run_id}").json()
    assert sim_data["scenario_summary"]["total_vehicles"] == 10
    assert sim_data["scenario_summary"]["total_incidents"] == 50

def test_invalid_run_id():
    response = client.get("/api/simulations/invalid-uuid-1234")
    assert response.status_code == 404
