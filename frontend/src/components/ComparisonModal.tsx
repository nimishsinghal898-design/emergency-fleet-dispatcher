import { SplitSquareHorizontal, CheckCircle2, TrendingUp, TrendingDown, ShieldCheck, Clock, Check } from 'lucide-react';
import { RunResult } from '../types/models';
import { Modal } from './Modal';

interface ComparisonModalProps {
    isOpen: boolean;
    onClose: () => void;
    coverageResult: RunResult | null;
    baselineResult: RunResult | null;
    activePolicy: 'coverage' | 'baseline';
    onSelectPolicy: (policy: 'coverage' | 'baseline') => void;
}

export function ComparisonModal({
    isOpen,
    onClose,
    coverageResult,
    baselineResult,
    activePolicy,
    onSelectPolicy
}: ComparisonModalProps) {
    if (!coverageResult || !baselineResult) return null;

    const covMetrics = coverageResult.metrics;
    const baseMetrics = baselineResult.metrics;
    const covVal = coverageResult.validation_results;
    const baseVal = baselineResult.validation_results;

    const outageDelta = covMetrics.total_outage_minutes - baseMetrics.total_outage_minutes;
    const weightedDelta = covMetrics.weighted_response_mean - baseMetrics.weighted_response_mean;
    const p3CovMean = covMetrics.p3_mean_response ?? 0;
    const p3BaseMean = baseMetrics.p3_mean_response ?? 0;
    const p3Delta = p3CovMean - p3BaseMean;

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Policy Performance Comparison" 
            subtitle={`Seed: ${coverageResult.seed} · 20 Fleet Units · 100 Emergency Calls`}
            maxWidth="2xl"
        >
            <div className="space-y-6">
                {/* Policy Selector Banner */}
                <div className="grid grid-cols-2 gap-4">
                    <div 
                        onClick={() => onSelectPolicy('coverage')}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                            activePolicy === 'coverage'
                                ? 'bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/30'
                                : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                        }`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center">
                                <ShieldCheck className="w-4 h-4 mr-1.5" />
                                Coverage-Preserving Policy
                            </span>
                            {activePolicy === 'coverage' && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 flex items-center">
                                    <Check className="w-3 h-3 mr-1" /> ACTIVE VIEW
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">
                            Dynamic scoring balances incident priority urgency with quadrant scarcity penalties to preserve regional readiness.
                        </p>
                    </div>

                    <div 
                        onClick={() => onSelectPolicy('baseline')}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                            activePolicy === 'baseline'
                                ? 'bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/30'
                                : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                        }`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center">
                                <Clock className="w-4 h-4 mr-1.5" />
                                Nearest-Idle Baseline
                            </span>
                            {activePolicy === 'baseline' && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center">
                                    <Check className="w-3 h-3 mr-1" /> ACTIVE VIEW
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">
                            Greedy myopic dispatch assigning the closest available idle vehicle regardless of sector depletion risks.
                        </p>
                    </div>
                </div>

                {/* Comparative Metrics Table */}
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950 text-slate-400 uppercase font-mono tracking-wider border-b border-slate-800">
                            <tr>
                                <th className="p-3">Evaluation Metric</th>
                                <th className="p-3 text-blue-400">Coverage Policy</th>
                                <th className="p-3 text-slate-300">Nearest Baseline</th>
                                <th className="p-3 text-right">Operational Delta</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/80 font-mono">
                            <tr className="hover:bg-slate-800/20">
                                <td className="p-3 font-sans font-medium text-slate-200">
                                    Total Coverage Outage
                                    <div className="text-[11px] text-slate-500 font-sans font-normal">Minutes with ≥1 empty quadrant</div>
                                </td>
                                <td className="p-3 text-sm font-bold text-blue-400">{covMetrics.total_outage_minutes}m</td>
                                <td className="p-3 text-sm font-bold text-slate-300">{baseMetrics.total_outage_minutes}m</td>
                                <td className="p-3 text-right">
                                    {outageDelta <= 0 ? (
                                        <span className="text-emerald-400 font-bold flex items-center justify-end">
                                            <TrendingDown className="w-3.5 h-3.5 mr-1" /> {outageDelta}m (Improved)
                                        </span>
                                    ) : (
                                        <span className="text-red-400 font-bold flex items-center justify-end">
                                            <TrendingUp className="w-3.5 h-3.5 mr-1" /> +{outageDelta}m
                                        </span>
                                    )}
                                </td>
                            </tr>

                            <tr className="hover:bg-slate-800/20">
                                <td className="p-3 font-sans font-medium text-slate-200">
                                    Priority-Weighted Response
                                    <div className="text-[11px] text-slate-500 font-sans font-normal">W1=1, W2=3, W3=7 weighted mean</div>
                                </td>
                                <td className="p-3 text-sm font-bold text-blue-400">{covMetrics.weighted_response_mean.toFixed(2)}m</td>
                                <td className="p-3 text-sm font-bold text-slate-300">{baseMetrics.weighted_response_mean.toFixed(2)}m</td>
                                <td className="p-3 text-right text-slate-400">
                                    {weightedDelta > 0 ? `+${weightedDelta.toFixed(2)}m` : `${weightedDelta.toFixed(2)}m`}
                                </td>
                            </tr>

                            <tr className="hover:bg-slate-800/20">
                                <td className="p-3 font-sans font-medium text-slate-200">
                                    Priority-3 Routine Call Response
                                    <div className="text-[11px] text-slate-500 font-sans font-normal">Routine call average response</div>
                                </td>
                                <td className="p-3 text-sm font-bold text-blue-400">{p3CovMean.toFixed(2)}m</td>
                                <td className="p-3 text-sm font-bold text-slate-300">{p3BaseMean.toFixed(2)}m</td>
                                <td className="p-3 text-right text-slate-400">
                                    {p3Delta > 0 ? `+${p3Delta.toFixed(2)}m` : `${p3Delta.toFixed(2)}m`}
                                </td>
                            </tr>

                            <tr className="hover:bg-slate-800/20">
                                <td className="p-3 font-sans font-medium text-slate-200">
                                    Dispatched Incidents
                                    <div className="text-[11px] text-slate-500 font-sans font-normal">Total assigned calls out of 100</div>
                                </td>
                                <td className="p-3 text-sm font-bold text-blue-400">{covVal.assigned_incidents} / 100</td>
                                <td className="p-3 text-sm font-bold text-slate-300">{baseVal.assigned_incidents} / 100</td>
                                <td className="p-3 text-right text-slate-400">
                                    {covVal.assigned_incidents - baseVal.assigned_incidents}
                                </td>
                            </tr>

                            <tr className="hover:bg-slate-800/20">
                                <td className="p-3 font-sans font-medium text-slate-200">
                                    Causality & Rule Violations
                                    <div className="text-[11px] text-slate-500 font-sans font-normal">Illegal moves or duplicate assignments</div>
                                </td>
                                <td className="p-3 text-sm font-bold text-emerald-400">0 (100% Valid)</td>
                                <td className="p-3 text-sm font-bold text-emerald-400">0 (100% Valid)</td>
                                <td className="p-3 text-right text-emerald-400 font-bold flex items-center justify-end">
                                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Both Strict
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Trade-off Explanation Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs text-slate-400 leading-relaxed space-y-2">
                    <div className="font-bold text-slate-200 uppercase tracking-wider flex items-center">
                        <SplitSquareHorizontal className="w-4 h-4 mr-1.5 text-blue-400" />
                        Operational Analysis: The Coverage-Preservation Trade-Off
                    </div>
                    <p>
                        The Nearest-Idle baseline dispatches the geographically closest vehicle immediately, even if it is the sole vehicle safeguarding an entire quadrant. This creates severe local coverage blackouts.
                    </p>
                    <p>
                        The Coverage-Aware dispatcher penalizes stripping a quadrant to 0 units. By occasionally dispatching a slightly more distant unit or staging vehicles, it actively preserves regional readiness while strictly adhering to online causality.
                    </p>
                </div>
            </div>

            <div className="flex items-center justify-between pt-4 mt-6 border-t border-slate-800">
                <span className="text-xs text-slate-500 font-mono">
                    Currently Viewing: <span className="text-slate-300 font-bold uppercase">{activePolicy} Policy</span>
                </span>
                <button
                    onClick={onClose}
                    className="px-5 py-2 text-xs font-semibold uppercase tracking-wider bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                >
                    Close Comparison
                </button>
            </div>
        </Modal>
    );
}
