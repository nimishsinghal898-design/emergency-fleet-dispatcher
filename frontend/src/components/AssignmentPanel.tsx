import React from 'react';
import { Assignment } from '../types/models';
import { Card } from './Card';
import { FileText } from 'lucide-react';

interface AssignmentPanelProps {
    assignments: Assignment[];
    currentMinute: number;
}

export const AssignmentPanel = React.memo(function AssignmentPanel({ assignments, currentMinute }: AssignmentPanelProps) {
    // Show assignments that have been dispatched by currentMinute
    // Reverse sort by dispatch time to show newest first
    const visible = assignments
        .filter(a => a.dispatch_time <= currentMinute)
        .sort((a, b) => b.dispatch_time - a.dispatch_time);

    return (
        <Card title="Recent Assignments" action={<FileText className="w-4 h-4 text-slate-500" />} className="h-full">
            <div className="overflow-y-auto pr-2 h-[400px]">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="sticky top-0 bg-slate-900 z-10 text-xs text-slate-500 uppercase tracking-wider">
                        <tr>
                            <th className="pb-2 font-medium">Incident</th>
                            <th className="pb-2 font-medium">Pri</th>
                            <th className="pb-2 font-medium">Vehicle</th>
                            <th className="pb-2 font-medium">Location</th>
                            <th className="pb-2 font-medium">Dispatch</th>
                            <th className="pb-2 font-medium">Rsp Time</th>
                            <th className="pb-2 font-medium">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {visible.length === 0 ? (
                            <tr><td colSpan={7} className="text-center py-4 text-slate-500">No assignments yet</td></tr>
                        ) : visible.map(a => {
                            const isCompleted = a.completion_time <= currentMinute;
                            return (
                                <tr key={a.assignment_id} className="text-slate-300 hover:bg-slate-800/50">
                                    <td className="py-2 font-mono text-xs">#{a.incident_id}</td>
                                    <td className="py-2 font-mono text-xs text-slate-400">P{a.priority}</td>
                                    <td className="py-2 font-mono text-xs">#{a.vehicle_id}</td>
                                    <td className="py-2 font-mono text-xs text-slate-400">({a.incident_x.toFixed(1)}, {a.incident_y.toFixed(1)})</td>
                                    <td className="py-2">{a.dispatch_time}m</td>
                                    <td className="py-2">{a.response_time.toFixed(1)}m</td>
                                    <td className="py-2 text-xs font-semibold uppercase">
                                        {isCompleted ? (
                                            <span className="text-slate-500">Completed</span>
                                        ) : (
                                            <span className="text-blue-400">En Route</span>
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
