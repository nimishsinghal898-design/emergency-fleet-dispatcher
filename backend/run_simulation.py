import argparse
import sys
import time
from pathlib import Path

# Need to ensure backend is in sys.path if run directly
sys.path.insert(0, str(Path(__file__).parent))

from app.dispatcher import CoverageAwareDispatcher
from app.export import export_run_result
from app.metrics import build_run_result
from app.simulation import BaselineDispatcher, SimulationEngine


def main():
    parser = argparse.ArgumentParser(description="Run Emergency Fleet Simulation")
    parser.add_argument("--seed", type=int, default=20260911, help="Random seed for generation")
    parser.add_argument("--outdir", type=str, default=".", help="Directory to save output files")
    parser.add_argument("--dispatcher", type=str, choices=["baseline", "coverage"], default="coverage", help="Dispatcher to use")
    args = parser.parse_args()
    
    print(f"Starting simulation with seed {args.seed} using {args.dispatcher} dispatcher...")
    
    if args.dispatcher == "baseline":
        dispatcher = BaselineDispatcher()
    else:
        dispatcher = CoverageAwareDispatcher()
        
    t0 = time.time()
    engine = SimulationEngine(seed=args.seed, dispatcher=dispatcher)
    engine.run()
    
    print("Simulation complete. Calculating metrics...")
    total_time = time.time() - t0
    run_result = build_run_result(engine, total_runtime=total_time)
    
    print("Metrics summary:")
    print(f"  Assigned: {run_result.validation_results.assigned_incidents}/{run_result.scenario_summary.total_incidents}")
    print(f"  Weighted Mean Response: {run_result.metrics.weighted_response_mean:.2f}")
    print(f"  Total Outage Minutes: {run_result.metrics.total_outage_minutes}")
    
    print(f"Exporting results to {args.outdir}...")
    export_run_result(run_result, args.outdir)
    print("Done.")

if __name__ == "__main__":
    main()
