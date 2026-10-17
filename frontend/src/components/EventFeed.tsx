import React, { useMemo, useState } from 'react';
import { RunResult } from '../types/models';
import { Card } from './Card';
import { Radio, AlertCircle, CheckCircle2, Navigation } from 'lucide-react';

interface EventFeedProps {
    runResult: RunResult | null;
    currentMinute: number;
}

interface SimEvent {
    minute: number;
    type: 'REVEAL' | 'ASSIGN' | 'COMPLETE';
    priority: number;
    text: string;
    id: string;
    details?: string;
}

export const EventFeed = React.memo(function EventFeed({ runResult, currentMinute }: EventFeedProps) {
    const [filter, setFilter] = useState<'ALL' | 'ASSIGN' | 'REVEAL' | 'COMPLETE'>('ALL');

    const allEvents = useMemo(() => {
        if (!runResult) return [];
        const events: SimEvent[] = [];

        // 1. Reveal events
        for (const inc of runResult.incidents) {
            events.push({
                minute: inc.arrival_minute,
                type: 'REVEAL',
                priority: inc.priority,
                text: `${inc.priority === 3 ? 'Priority 3 (Critical)' : inc.priority === 2 ? 'Priority 2 (Urgent)' : 'Priority 1 (Routine)'} Call #${inc.id} reported`,
                details: `Location: (${inc.x.toFixed(1)}, ${inc.y.toFixed(1)})`,
                id: `reveal-${inc.id}`
            });
        }

        // 2. Assign & Complete events
        for (const a of runResult.assignments) {
            events.push({
                minute: a.dispatch_time,
                type: 'ASSIGN',
                priority: a.priority,
                text: `Unit #${a.vehicle_id} dispatched to Call #${a.incident_id}`,
                details: `Response latency: ${a.response_time.toFixed(1)}m · ${a.vehicle_quadrant_before.replace('_', ' ')}`,
                id: `assign-${a.assignment_id}`
            });
            events.push({
                minute: a.completion_time,
                type: 'COMPLETE',
                priority: a.priority,
                text: `Unit #${a.vehicle_id} cleared Call #${a.incident_id} (Available)`,
                details: `Service finished at destination (${a.incident_x.toFixed(1)}, ${a.incident_y.toFixed(1)})`,
                id: `complete-${a.assignment_id}`
            });
        }

        // Sort: minute asc, then REVEAL before ASSIGN before COMPLETE for same minute
        const typeOrder = { 'REVEAL': 1, 'ASSIGN': 2, 'COMPLETE': 3 };
        events.sort((a, b) => {
            if (a.minute !== b.minute) return a.minute - b.minute;
            if (typeOrder[a.type] !== typeOrder[b.type]) return typeOrder[a.type] - typeOrder[b.type];
            return a.id.localeCompare(b.id);
        });

        return events;
    }, [runResult]);

    // Filter by current minute and selected filter, reverse to show newest first
    const visibleEvents = allEvents
        .filter(e => e.minute <= currentMinute)
        .filter(e => filter === 'ALL' || e.type === filter)
        .reverse();

    return (
        <Card 
            title="Operational Event Feed" 
            action={
                <div className="flex items-center space-x-1 text-[10px] font-mono">
                    <button 
                        onClick={() => setFilter('ALL')}
                        className={`px-1.5 py-0.5 rounded transition-colors ${filter === 'ALL' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        ALL
                    </button>
                    <button 
                        onClick={() => setFilter('ASSIGN')}
                        className={`px-1.5 py-0.5 rounded transition-colors ${filter === 'ASSIGN' ? 'bg-blue-900/60 text-blue-300' : 'text-blue-400 hover:text-blue-300'}`}
                    >
                        DISPATCH
                    </button>
                    <button 
                        onClick={() => setFilter('COMPLETE')}
                        className={`px-1.5 py-0.5 rounded transition-colors ${filter === 'COMPLETE' ? 'bg-emerald-900/60 text-emerald-300' : 'text-emerald-400 hover:text-emerald-300'}`}
                    >
                        CLEARED
                    </button>
                </div>
            }
            className="h-full"
        >
            <div className="overflow-y-auto pr-1" style={{ maxHeight: '360px' }}>
                {visibleEvents.length === 0 ? (
                    <div className="text-center py-6 text-slate-500 text-xs">
                        No events logged at or prior to minute t={currentMinute}.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {visibleEvents.map(ev => {
                            let badgeClass = 'text-slate-400 bg-slate-800';
                            let icon = <Radio className="w-3.5 h-3.5 text-slate-400" />;
                            
                            if (ev.type === 'REVEAL') {
                                if (ev.priority === 3) {
                                    badgeClass = 'text-red-400 bg-red-950/60 border border-red-800/40';
                                    icon = <AlertCircle className="w-3.5 h-3.5 text-red-400 animate-pulse" />;
                                } else if (ev.priority === 2) {
                                    badgeClass = 'text-amber-400 bg-amber-950/60 border border-amber-800/40';
                                    icon = <AlertCircle className="w-3.5 h-3.5 text-amber-400" />;
                                } else {
                                    badgeClass = 'text-blue-400 bg-blue-950/60 border border-blue-800/40';
                                    icon = <AlertCircle className="w-3.5 h-3.5 text-blue-400" />;
                                }
                            } else if (ev.type === 'ASSIGN') {
                                badgeClass = 'text-blue-300 bg-blue-950/60 border border-blue-800/40';
                                icon = <Navigation className="w-3.5 h-3.5 text-blue-400" />;
                            } else if (ev.type === 'COMPLETE') {
                                badgeClass = 'text-emerald-300 bg-emerald-950/60 border border-emerald-800/40';
                                icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
                            }

                            return (
                                <div 
                                    key={ev.id} 
                                    className="text-xs p-2 rounded-lg bg-slate-950/40 border border-slate-800/60 hover:border-slate-700/80 transition-colors flex items-start space-x-2.5"
                                >
                                    <div className="mt-0.5 shrink-0">
                                        {icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded uppercase ${badgeClass}`}>
                                                {ev.type}
                                            </span>
                                            <span className="font-mono text-[10px] text-slate-500">
                                                t={Number.isInteger(ev.minute) ? ev.minute.toString().padStart(3, '0') : ev.minute.toFixed(1)}m
                                            </span>
                                        </div>
                                        <div className="text-slate-200 font-medium leading-snug">
                                            {ev.text}
                                        </div>
                                        {ev.details && (
                                            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                                                {ev.details}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </Card>
    );
});
