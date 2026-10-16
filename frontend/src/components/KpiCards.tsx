import { Metrics, ValidationResults } from '../types/models';
import { Activity, Clock, ShieldAlert, CheckCircle2, AlertTriangle, LucideIcon } from 'lucide-react';

interface KpiCardsProps {
    metrics: Metrics;
    validation: ValidationResults;
}

function Kpi({ title, value, icon: Icon, subtext, alert = false, tooltip }: { title: string, value: string | number, icon: LucideIcon, subtext?: string, alert?: boolean, tooltip?: string }) {
    return (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col" title={tooltip}>
            <div className="flex items-start justify-between">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{title}</span>
                <Icon className={`w-4 h-4 ${alert ? 'text-red-500' : 'text-blue-500'}`} />
            </div>
            <div className={`text-3xl font-bold mt-2 ${alert ? 'text-red-400' : 'text-slate-100'}`}>
                {value}
            </div>
            {subtext && <div className="text-xs text-slate-500 mt-1">{subtext}</div>}
        </div>
    );
}

export function KpiCards({ metrics, validation }: KpiCardsProps) {
    const p3MeanStr = metrics.p3_mean_response ? metrics.p3_mean_response.toFixed(1) : "N/A";
    const invalidCount = validation.invalid_assignment_attempts + validation.assignments_to_busy_vehicles + validation.assignments_before_reveal;
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
            <Kpi 
                title="Response Performance" 
                value={`${metrics.weighted_response_mean.toFixed(2)}`} 
                icon={Activity} 
                subtext="Weighted average (min)" 
                tooltip="Priority-weighted average response time across all assignments"
            />
            <Kpi 
                title="Priority-3 Response" 
                value={p3MeanStr} 
                icon={Clock} 
                subtext={`Mean over ${metrics.p3_count} incidents`} 
                tooltip="Average response time specifically for Priority 3 (lowest urgency) incidents"
            />
            <Kpi 
                title="Coverage Outage" 
                value={`${metrics.total_outage_minutes}m`} 
                icon={ShieldAlert} 
                alert={metrics.total_outage_minutes > 0}
                subtext="Minutes with empty quadrant" 
                tooltip="Total simulation minutes where at least one quadrant had zero idle vehicles available"
            />
            <Kpi 
                title="Assignment Queue" 
                value={`${validation.assigned_incidents} / ${validation.total_incidents}`} 
                icon={CheckCircle2} 
                subtext="Total fulfilled" 
                tooltip="Number of successfully assigned incidents versus total incidents"
            />
            <Kpi 
                title="Dispatch Errors" 
                value={invalidCount} 
                icon={AlertTriangle} 
                alert={invalidCount > 0}
                subtext="Invalid attempts" 
                tooltip="Count of illegal or invalid assignments attempted by the dispatcher policy"
            />
        </div>
    );
}
