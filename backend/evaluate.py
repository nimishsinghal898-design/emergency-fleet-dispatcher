import argparse
import sys
import time
from pathlib import Path
from statistics import mean

sys.path.insert(0, str(Path(__file__).parent))

from app.dispatcher import CoverageAwareDispatcher
from app.metrics import build_run_result
from app.simulation import BaselineDispatcher, SimulationEngine


def print_comparison_table(results):
    print("\n" + "="*80)
    print("STRATEGY COMPARISON")
    print("="*80)
    
    strategies = ["baseline", "coverage"]
    
    for strategy in strategies:
        strat_results = [r for s, st, r in results if st == strategy]
        
        if not strat_results:
            continue
            
        avg_assigned = mean([r.validation_results.assigned_incidents for r in strat_results])
        avg_weighted = mean([r.metrics.weighted_response_mean for r in strat_results])
        
        p3_means = [r.metrics.p3_mean_response for r in strat_results if r.metrics.p3_mean_response is not None]
        avg_p3_mean = mean(p3_means) if p3_means else 0.0
        
        avg_outage = mean([r.metrics.total_outage_minutes for r in strat_results])
        invalid = sum([r.validation_results.invalid_assignment_attempts for r in strat_results])
        avg_runtime = mean([r.total_runtime for r in strat_results])
        
        print(f"\n--- Strategy: {strategy.upper()} ---")
        print(f"  Assigned Incidents (Avg):  {avg_assigned:.2f}")
        print(f"  Weighted Response (Avg):   {avg_weighted:.2f}")
        print(f"  Priority-3 Response (Avg): {avg_p3_mean:.2f}")
        print(f"  Coverage Outage (Avg Min): {avg_outage:.2f}")
        print(f"  Invalid Attempts (Total):  {invalid}")
        print(f"  Total Runtime (Avg sec):   {avg_runtime:.3f}")

def main():
    parser = argparse.ArgumentParser(description="Evaluate Emergency Fleet Dispatchers")
    parser.add_argument("--seed", type=int, help="Single seed for generation")
    parser.add_argument("--seeds", type=int, nargs="+", help="Multiple seeds for robustness testing")
    args = parser.parse_args()
    
    seeds = []
    if args.seed:
        seeds.append(args.seed)
    if args.seeds:
        seeds.extend(args.seeds)
        
    if not seeds:
        print("Please provide --seed or --seeds. Example: python -m backend.evaluate --seed 20260911")
        sys.exit(1)
        
    # Remove duplicates but preserve order
    seen = set()
    seeds = [x for x in seeds if not (x in seen or seen.add(x))]
        
    results = []
    
    for seed in seeds:
        print(f"\nEvaluating Seed: {seed}")
        
        # 1. Baseline
        t0 = time.time()
        engine_base = SimulationEngine(seed=seed, dispatcher=BaselineDispatcher())
        engine_base.run()
        res_base = build_run_result(engine_base, time.time() - t0)
        results.append((seed, "baseline", res_base))
        print(f"  [Baseline] Outage: {res_base.metrics.total_outage_minutes}m, Weighted Resp: {res_base.metrics.weighted_response_mean:.2f}")
        
        # 2. Coverage
        t0 = time.time()
        engine_cov = SimulationEngine(seed=seed, dispatcher=CoverageAwareDispatcher())
        engine_cov.run()
        res_cov = build_run_result(engine_cov, time.time() - t0)
        results.append((seed, "coverage", res_cov))
        print(f"  [Coverage] Outage: {res_cov.metrics.total_outage_minutes}m, Weighted Resp: {res_cov.metrics.weighted_response_mean:.2f}")
        
    print_comparison_table(results)

if __name__ == "__main__":
    main()
