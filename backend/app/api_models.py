from typing import Literal

from pydantic import BaseModel, Field


class SimulationRequest(BaseModel):
    seed: int = Field(default=20260911, ge=0, le=2_147_483_647, description="Random seed for deterministic simulation.")
    experimental_mode: bool = Field(default=False, description="Set to True to override official challenge defaults.")
    num_vehicles: int | None = Field(default=None, ge=1, le=100, description="Number of vehicles (only respected if experimental_mode=True)")
    num_incidents: int | None = Field(default=None, ge=1, le=500, description="Number of incidents (only respected if experimental_mode=True)")
    dispatcher_type: Literal["coverage", "baseline"] = Field(default="coverage", description="Dispatcher policy: 'coverage' or 'baseline'.")

class SimulationResponse(BaseModel):
    run_id: str
    message: str
