import React from 'react';
import { Metrics, ValidationResults } from '../types/models';
import { Activity, Clock, ShieldAlert, CheckCircle2, ShieldCheck, LucideIcon } from 'lucide-react';

interface KpiCardsProps {
    metrics: Metrics;
    validation: ValidationResults;
}

interface KpiItemProps {
    title: string;
    value: string | number;
    unit?: string;
    icon: LucideIcon;
    subtext: string;
    alert?: boolean;
    success?: boolean;
    tooltip: string;
    technicalFormula?: string;
}

function Kpi({
    title,
    value,
    unit,
    icon: Icon,
    subtext,
    alert = false,
    success = false,
    tooltip,
    technicalFormula
}: KpiItemProps) {
    return (
        <div 
            className={`bg-slate-900 border rounded-xl p-4 flex flex-col justify-between transition-colors shadow-sm relative group ${
                alert 
                    ? 'border-red-900/40 bg-red-950/10' 
                    : success 
                    ? 'border-emerald-900/40 bg-emerald-950/10' 
                    : 'border-slate-800'
            }`}
        >
            <div className="flex items-start justify-between">
                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                    {title}
                </span>
                <div className={`p-1.5 rounded-lg ${
                    alert 
                        ? 'bg-red-950 text-red-400 border border-red-800/40' 
                        : success 
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40' 
                        : 'bg-slate-800 text-blue-400'
                }`}>
                    <Icon className="w-4 h-4" />
                </div>
            </div>

            <div className="mt-3">
                <div className="flex items-baseline space-x-1.5">
                    <span className={`text-2xl font-bold font-mono tracking-tight ${
                        alert ? 'text-red-400' : success ? 'text-emerald-400' : 'text-slate-100'
                    }`}>
                        {value}
                    </span>
                    {unit && (
                        <span className="text-xs font-mono font-medium text-slate-500 uppercase">
                            {unit}
                        </span>
                    )}
                </div>
                <div className="text-xs text-slate-400 mt-1 font-medium">
                    {subtext}
                </div>
            </div>

            {/* Technical Tooltip on Hover */}
            <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                <span className="truncate" title={tooltip}>{tooltip}</span>
                {technicalFormula && (
                    <span className="font-mono text-[10px] text-slate-400 shrink-0 ml-1">
                        {technicalFormula}
                    </span>
                )}
            </div>
        </div>
    );
}

export const KpiCards = React.memo(function KpiCards({ metrics, validation }: KpiCardsProps) {
    const p3MeanStr = metrics.p3_mean_response !== null ? metrics.p3_mean_response.toFixed(1) : "N/A";
    const invalidCount = validation.invalid_assignment_attempts + validation.assignments_to_busy_vehicles + validation.assignments_before_reveal;
    
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 mb-4">
            <Kpi 
                title="Response Performance" 
                value={metrics.weighted_response_mean.toFixed(2)} 
                unit="min"
                icon={Activity} 
                subtext="Priority-weighted response" 
                tooltip="Weighted mean dispatch-to-arrival latency"
                technicalFormula="Σ(W_p · R) / N"
            />

            <Kpi 
                title="Priority-3 Response" 
                value={p3MeanStr} 
                unit="min"
                icon={Clock} 
                subtext={`Routine call mean (${metrics.p3_count} incidents)`} 
                tooltip="Mean response for Priority 3 (routine) calls"
                technicalFormula="W_3 = 7"
            />

            <Kpi 
                title="Coverage Outage" 
                value={metrics.total_outage_minutes} 
                unit="min"
                icon={ShieldAlert} 
                alert={metrics.total_outage_minutes > 0}
                subtext="Minutes with empty quadrant" 
                tooltip="Total minutes where ≥1 quadrant had 0 idle vehicles"
                technicalFormula="Any(Idle_q == 0)"
            />

            <Kpi 
                title="Assignment Queue" 
                value={`${validation.assigned_incidents} / ${validation.total_incidents}`} 
                unit="units"
                icon={CheckCircle2} 
                success={validation.assigned_incidents === validation.total_incidents}
                subtext={`Waiting: ${validation.waiting_incidents} calls`} 
                tooltip="Total emergency calls dispatched and resolved"
                technicalFormula="Dispatched / Total"
            />

            <Kpi 
                title="Dispatch Integrity" 
                value={invalidCount === 0 ? "100%" : `${invalidCount} Violations`} 
                icon={invalidCount === 0 ? ShieldCheck : ShieldAlert} 
                success={invalidCount === 0}
                alert={invalidCount > 0}
                subtext={invalidCount === 0 ? "Zero causality violations" : "Illegal assignments detected"} 
                tooltip="Verification of causality and single-unit rules"
                technicalFormula="Causal Invariant"
            />
        </div>
    );
});
