import React, { useState } from 'react';
import { Incident } from '../types/models';
import { Card } from './Card';
import { AlertCircle } from 'lucide-react';

interface IncidentQueueProps {
    incidents: Incident[];
}

export const IncidentQueue = React.memo(function IncidentQueue({ incidents }: IncidentQueueProps) {
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'WAITING' | 'ASSIGNED' | 'COMPLETED'>('ALL');

    // Counts
    const waitingCount = incidents.filter(i => i.status === 'WAITING').length;
    const assignedCount = incidents.filter(i => i.status === 'ASSIGNED').length;
    const completedCount = incidents.filter(i => i.status === 'COMPLETED').length;

    // Filter
    const filtered = incidents.filter(i => {
        if (statusFilter === 'ALL') return true;
        return i.status === statusFilter;
    });

    // Priority sorting: WAITING first (P3 > P2 > P1, then arrival ascending), then ASSIGNED, then COMPLETED
    const sorted = [...filtered].sort((a, b) => {
        const order = { 'WAITING': 0, 'ASSIGNED': 1, 'COMPLETED': 2 };
        if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
        if (a.status === 'WAITING') {
            if (a.priority !== b.priority) return b.priority - a.priority; // P3 > P2 > P1
            return a.arrival_minute - b.arrival_minute;
        }
        return b.arrival_minute - a.arrival_minute;
    });

    const getPriorityBadge = (p: number) => {
        if (p === 3) {
            return (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-950 text-red-400 border border-red-800/60 flex items-center w-fit">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1 animate-pulse"></span>
                    P3 Critical
                </span>
            );
        }
        if (p === 2) {
            return (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-800/60 flex items-center w-fit">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1"></span>
                    P2 Urgent
                </span>
            );
        }
        return (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-950 text-blue-400 border border-blue-800/60 flex items-center w-fit">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1"></span>
                P1 Routine
            </span>
        );
    };
    
    const getStatusBadge = (s: string) => {
        if (s === 'WAITING') {
            return (
                <span className="text-amber-400 font-semibold text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-950/40 border border-amber-900/40">
                    In Queue
                </span>
            );
        }
        if (s === 'ASSIGNED') {
            return (
                <span className="text-blue-400 font-semibold text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-950/40 border border-blue-900/40">
                    Dispatched
                </span>
            );
        }
        return (
            <span className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-800/40 border border-slate-700/40">
                Cleared
            </span>
        );
    };

    return (
        <Card 
            title="Active Incidents & Queue" 
            className="h-full flex-1"
            action={
                <div className="flex items-center space-x-1.5 text-[11px] font-mono">
                    <button 
                        onClick={() => setStatusFilter('ALL')}
                        className={`px-2 py-0.5 rounded transition-colors ${statusFilter === 'ALL' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        ALL ({incidents.length})
                    </button>
                    <button 
                        onClick={() => setStatusFilter('WAITING')}
                        className={`px-2 py-0.5 rounded transition-colors ${statusFilter === 'WAITING' ? 'bg-amber-900/60 text-amber-300' : 'text-amber-400 hover:text-amber-300'}`}
                    >
                        QUEUE ({waitingCount})
                    </button>
                    <button 
                        onClick={() => setStatusFilter('ASSIGNED')}
                        className={`px-2 py-0.5 rounded transition-colors ${statusFilter === 'ASSIGNED' ? 'bg-blue-900/60 text-blue-300' : 'text-blue-400 hover:text-blue-300'}`}
                    >
                        DISPATCHED ({assignedCount})
                    </button>
                    <button 
                        onClick={() => setStatusFilter('COMPLETED')}
                        className={`px-2 py-0.5 rounded transition-colors ${statusFilter === 'COMPLETED' ? 'bg-slate-700 text-slate-300' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        CLEARED ({completedCount})
                    </button>
                </div>
            }
        >
            <div className="overflow-y-auto pr-1" style={{ maxHeight: '360px' }}>
                <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="sticky top-0 bg-slate-900 z-10 text-[10px] text-slate-400 uppercase font-mono tracking-wider border-b border-slate-800">
                        <tr>
                            <th className="pb-2 font-medium">Incident</th>
                            <th className="pb-2 font-medium">Priority</th>
                            <th className="pb-2 font-medium">Status</th>
                            <th className="pb-2 font-medium">Location</th>
                            <th className="pb-2 font-medium">Arrival</th>
                            <th className="pb-2 font-medium">Queue Latency</th>
                            <th className="pb-2 font-medium">Response Latency</th>
                            <th className="pb-2 font-medium">Unit</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 font-mono">
                        {sorted.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="text-center py-6 text-slate-500 font-sans text-xs">
                                    <div className="flex flex-col items-center justify-center space-y-1">
                                        <AlertCircle className="w-5 h-5 text-slate-600" />
                                        <span className="font-semibold text-slate-400 uppercase tracking-wider">NO INCIDENTS WAITING</span>
                                        <span className="text-[11px] text-slate-500 font-normal">All revealed incidents have been dispatched or cleared.</span>
                                    </div>
                                </td>
                            </tr>
                        ) : sorted.map(inc => {
                            let waitLatency = '—';
                            if (inc.dispatch_time !== null) {
                                waitLatency = `${inc.dispatch_time - inc.arrival_minute}m`;
                            } else if (inc.status === 'WAITING') {
                                waitLatency = 'Awaiting Unit';
                            }

                            return (
                                <tr key={inc.id} className="text-slate-300 hover:bg-slate-800/40">
                                    <td className="py-2 font-bold text-xs">#{inc.id}</td>
                                    <td className="py-2">{getPriorityBadge(inc.priority)}</td>
                                    <td className="py-2">{getStatusBadge(inc.status)}</td>
                                    <td className="py-2 text-slate-400">({inc.x.toFixed(1)}, {inc.y.toFixed(1)})</td>
                                    <td className="py-2 text-slate-400">t={inc.arrival_minute}m</td>
                                    <td className="py-2">
                                        {inc.dispatch_time !== null ? (
                                            <span className="text-slate-300">{waitLatency}</span>
                                        ) : (
                                            <span className="text-amber-400 font-sans text-[11px] font-semibold">{waitLatency}</span>
                                        )}
                                    </td>
                                    <td className="py-2">
                                        {inc.response_time !== null 
                                            ? <span className="text-blue-400 font-bold">{inc.response_time.toFixed(1)}m</span> 
                                            : <span className="text-slate-600">—</span>
                                        }
                                    </td>
                                    <td className="py-2 text-slate-300 font-bold">
                                        {inc.assigned_vehicle_id ? (
                                            <span className="text-emerald-400">#{inc.assigned_vehicle_id}</span>
                                        ) : (
                                            <span className="text-slate-600">—</span>
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
