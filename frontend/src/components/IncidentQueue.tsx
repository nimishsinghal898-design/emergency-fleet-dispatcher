import React from 'react';
import { Incident } from '../types/models';
import { Card } from './Card';

interface IncidentQueueProps {
    incidents: Incident[];
}

export const IncidentQueue = React.memo(function IncidentQueue({ incidents }: IncidentQueueProps) {
    // Sort logically: Waiting first (P3 then P2 then P1), then Assigned, then Completed (reverse chrono)
    const sorted = [...incidents].sort((a, b) => {
        const order = { 'WAITING': 0, 'ASSIGNED': 1, 'COMPLETED': 2 };
        if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
        if (a.status === 'WAITING') {
            if (a.priority !== b.priority) return b.priority - a.priority; // P3 > P2 > P1
            return a.arrival_minute - b.arrival_minute;
        }
        return b.arrival_minute - a.arrival_minute; // newest assigned/completed first
    });

    const getPriorityBadge = (p: number) => {
        if (p === 3) return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-900/50 text-red-400">P3</span>;
        if (p === 2) return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-900/50 text-amber-400">P2</span>;
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-900/50 text-blue-400">P1</span>;
    };
    
    const getStatusBadge = (s: string) => {
        if (s === 'WAITING') return <span className="text-amber-500">Waiting</span>;
        if (s === 'ASSIGNED') return <span className="text-blue-400">Assigned</span>;
        return <span className="text-slate-500">Completed</span>;
    };

    return (
        <Card title="Incident Queue" className="h-full flex-1">
            <div className="overflow-y-auto pr-2" style={{ maxHeight: '400px' }}>
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="sticky top-0 bg-slate-900 z-10 text-xs text-slate-500 uppercase tracking-wider">
                        <tr>
                            <th className="pb-2 font-medium">ID</th>
                            <th className="pb-2 font-medium">Pri</th>
                            <th className="pb-2 font-medium">Status</th>
                            <th className="pb-2 font-medium">Loc</th>
                            <th className="pb-2 font-medium">Arr</th>
                            <th className="pb-2 font-medium">Wait</th>
                            <th className="pb-2 font-medium">Rsp</th>
                            <th className="pb-2 font-medium">Unit</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {sorted.length === 0 ? (
                            <tr><td colSpan={7} className="text-center py-4 text-slate-500 font-bold tracking-wider">NO INCIDENTS WAITING</td></tr>
                        ) : sorted.map(inc => {
                            let waitTime = '-';
                            if (inc.dispatch_time !== null) {
                                waitTime = `${(inc.dispatch_time - inc.arrival_minute).toFixed(1)}m`;
                            } else if (inc.status === 'WAITING') {
                                // Calculate dynamic wait time if we wanted to pass currentMinute, but let's just show 'Waiting' 
                                waitTime = '...';
                            }

                            return (
                            <tr key={inc.id} className="text-slate-300 hover:bg-slate-800/50">
                                <td className="py-2 font-mono text-xs">{inc.id}</td>
                                <td className="py-2">{getPriorityBadge(inc.priority)}</td>
                                <td className="py-2 text-xs font-semibold uppercase">{getStatusBadge(inc.status)}</td>
                                <td className="py-2 font-mono text-xs text-slate-400">({inc.x.toFixed(0)},{inc.y.toFixed(0)})</td>
                                <td className="py-2">{inc.arrival_minute}m</td>
                                <td className="py-2">{waitTime}</td>
                                <td className="py-2">{inc.response_time !== null ? `${inc.response_time.toFixed(1)}m` : '-'}</td>
                                <td className="py-2 font-mono text-xs">{inc.assigned_vehicle_id || '-'}</td>
                            </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </Card>
    );
});
