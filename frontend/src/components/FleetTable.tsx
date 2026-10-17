import React, { useState } from 'react';
import { Vehicle } from '../types/models';
import { Card } from './Card';
import { Radio } from 'lucide-react';

interface FleetTableProps {
    vehicles: Vehicle[];
    selectedId?: string | null;
    onSelect: (id: string | null) => void;
}

export const FleetTable = React.memo(function FleetTable({ vehicles, selectedId, onSelect }: FleetTableProps) {
    const [filter, setFilter] = useState<'ALL' | 'IDLE' | 'BUSY'>('ALL');

    const filtered = vehicles.filter(v => {
        if (filter === 'IDLE') return v.status === 'IDLE';
        if (filter === 'BUSY') return v.status === 'BUSY';
        return true;
    });

    const idleCount = vehicles.filter(v => v.status === 'IDLE').length;
    const busyCount = vehicles.filter(v => v.status === 'BUSY').length;

    return (
        <Card 
            title="Fleet Availability" 
            className="h-full flex-1"
            action={
                <div className="flex items-center space-x-1.5 text-[11px] font-mono">
                    <button 
                        onClick={() => setFilter('ALL')}
                        className={`px-2 py-0.5 rounded transition-colors ${filter === 'ALL' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        ALL ({vehicles.length})
                    </button>
                    <button 
                        onClick={() => setFilter('IDLE')}
                        className={`px-2 py-0.5 rounded transition-colors ${filter === 'IDLE' ? 'bg-emerald-900/60 text-emerald-300' : 'text-emerald-500 hover:text-emerald-300'}`}
                    >
                        IDLE ({idleCount})
                    </button>
                    <button 
                        onClick={() => setFilter('BUSY')}
                        className={`px-2 py-0.5 rounded transition-colors ${filter === 'BUSY' ? 'bg-amber-900/60 text-amber-300' : 'text-amber-500 hover:text-amber-300'}`}
                    >
                        BUSY ({busyCount})
                    </button>
                </div>
            }
        >
            <div className="overflow-y-auto pr-1" style={{ maxHeight: '360px' }}>
                <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="sticky top-0 bg-slate-900 z-10 text-[10px] text-slate-400 uppercase font-mono tracking-wider border-b border-slate-800">
                        <tr>
                            <th className="pb-2 font-medium">Unit</th>
                            <th className="pb-2 font-medium">Status</th>
                            <th className="pb-2 font-medium">Sector</th>
                            <th className="pb-2 font-medium">Position</th>
                            <th className="pb-2 font-medium">Availability</th>
                            <th className="pb-2 font-medium">Incident</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 font-mono">
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="text-center py-6 text-slate-500 font-sans text-xs">
                                    No units match the selected filter.
                                </td>
                            </tr>
                        ) : filtered.map(v => {
                            const isSelected = selectedId === v.id;
                            
                            // Deterministic quadrant boundary computation matching PRD
                            let quad = 'UR';
                            if (v.x < 50 && v.y < 50) quad = 'LL';
                            else if (v.x < 50 && v.y >= 50) quad = 'UL';
                            else if (v.x >= 50 && v.y < 50) quad = 'LR';
                            
                            return (
                                <tr 
                                    key={v.id} 
                                    onClick={() => onSelect(isSelected ? null : v.id)}
                                    className={`cursor-pointer transition-colors ${
                                        isSelected 
                                            ? 'bg-blue-950/60 border-l-2 border-blue-500 text-blue-200' 
                                            : 'hover:bg-slate-800/50 text-slate-300'
                                    }`}
                                >
                                    <td className="py-2 font-bold text-xs flex items-center space-x-1.5">
                                        <Radio className={`w-3 h-3 ${isSelected ? 'text-blue-400' : 'text-slate-500'}`} />
                                        <span>{v.id}</span>
                                    </td>
                                    <td className="py-2">
                                        {v.status === 'IDLE' ? (
                                            <span className="inline-flex items-center text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-900/60 px-1.5 py-0.5 rounded uppercase">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1"></span>
                                                Idle
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center text-[10px] font-bold text-amber-400 bg-amber-950/60 border border-amber-900/60 px-1.5 py-0.5 rounded uppercase">
                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1 animate-pulse"></span>
                                                Busy
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-2 text-slate-400 font-semibold">{quad}</td>
                                    <td className="py-2 text-slate-400">({v.x.toFixed(1)}, {v.y.toFixed(1)})</td>
                                    <td className="py-2">
                                        {v.completion_time !== null && v.completion_time !== undefined 
                                            ? <span className="text-amber-400 font-semibold">m{v.completion_time.toFixed(1)}</span> 
                                            : <span className="text-emerald-400 font-semibold">Ready Now</span>
                                        }
                                    </td>
                                    <td className="py-2 text-slate-400">
                                        {v.current_incident_id ? `#${v.current_incident_id}` : '—'}
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
