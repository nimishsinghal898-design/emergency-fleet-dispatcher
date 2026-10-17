import React from 'react';
import { Assignment } from '../types/models';
import { Card } from './Card';
import { FileText, CheckCircle2, Navigation } from 'lucide-react';

interface AssignmentPanelProps {
    assignments: Assignment[];
    currentMinute: number;
}

export const AssignmentPanel = React.memo(function AssignmentPanel({ assignments, currentMinute }: AssignmentPanelProps) {
    const visible = assignments
        .filter(a => a.dispatch_time <= currentMinute)
        .sort((a, b) => b.dispatch_time - a.dispatch_time);

    return (
        <Card 
            title="Dispatch Records" 
            action={
                <div className="flex items-center space-x-1.5 text-xs text-slate-400 font-mono">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>{visible.length} Logged</span>
                </div>
            } 
            className="h-full"
        >
            <div className="overflow-y-auto pr-1" style={{ maxHeight: '360px' }}>
                <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="sticky top-0 bg-slate-900 z-10 text-[10px] text-slate-400 uppercase font-mono tracking-wider border-b border-slate-800">
                        <tr>
                            <th className="pb-2 font-medium">Call</th>
                            <th className="pb-2 font-medium">Pri</th>
                            <th className="pb-2 font-medium">Unit</th>
                            <th className="pb-2 font-medium">Sector</th>
                            <th className="pb-2 font-medium">Destination</th>
                            <th className="pb-2 font-medium">Dispatch</th>
                            <th className="pb-2 font-medium">Response</th>
                            <th className="pb-2 font-medium">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 font-mono">
                        {visible.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="text-center py-6 text-slate-500 font-sans text-xs">
                                    No dispatches recorded at or prior to minute t={currentMinute}.
                                </td>
                            </tr>
                        ) : visible.map(a => {
                            const isCompleted = a.completion_time <= currentMinute;
                            return (
                                <tr key={a.assignment_id} className="text-slate-300 hover:bg-slate-800/40">
                                    <td className="py-2 font-bold text-xs">#{a.incident_id}</td>
                                    <td className="py-2">
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                            a.priority === 3 
                                                ? 'bg-red-950 text-red-400 border border-red-800/40' 
                                                : a.priority === 2 
                                                ? 'bg-amber-950 text-amber-400 border border-amber-800/40' 
                                                : 'bg-blue-950 text-blue-400 border border-blue-800/40'
                                        }`}>
                                            P{a.priority}
                                        </span>
                                    </td>
                                    <td className="py-2 font-bold text-emerald-400">#{a.vehicle_id}</td>
                                    <td className="py-2 text-slate-400">{a.vehicle_quadrant_before.replace('_', ' ')}</td>
                                    <td className="py-2 text-slate-400">({a.incident_x.toFixed(1)}, {a.incident_y.toFixed(1)})</td>
                                    <td className="py-2 text-slate-300">t={a.dispatch_time}m</td>
                                    <td className="py-2 text-blue-400 font-bold">{a.response_time.toFixed(1)}m</td>
                                    <td className="py-2">
                                        {isCompleted ? (
                                            <span className="inline-flex items-center text-[10px] text-slate-400 bg-slate-800/60 px-1.5 py-0.5 rounded font-sans font-semibold uppercase">
                                                <CheckCircle2 className="w-3 h-3 mr-1 text-slate-500" />
                                                Cleared
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center text-[10px] text-blue-300 bg-blue-950/60 border border-blue-800/40 px-1.5 py-0.5 rounded font-sans font-semibold uppercase">
                                                <Navigation className="w-3 h-3 mr-1 text-blue-400 animate-pulse" />
                                                En Route
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </Card>
    );
});
