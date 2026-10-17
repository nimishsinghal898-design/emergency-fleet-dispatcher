import React from 'react';
import { Vehicle, Incident } from '../types/models';
import { Card } from './Card';
import { Crosshair } from 'lucide-react';

interface SimulationMapProps {
    vehicles: Vehicle[];
    incidents: Incident[];
    selectedVehicleId?: string | null;
    onSelectVehicle?: (id: string | null) => void;
}

export const SimulationMap = React.memo(function SimulationMap({
    vehicles,
    incidents,
    selectedVehicleId,
    onSelectVehicle
}: SimulationMapProps) {
    // Transform coordinates from 0-100 (where 0,0 is lower left per PRD)
    // to SVG viewBox 0-100 (where 0,0 is upper left)
    const tx = (x: number) => Math.max(0, Math.min(100, x));
    const ty = (y: number) => Math.max(0, Math.min(100, 100 - y));

    const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
    const assignedIncident = selectedVehicle?.current_incident_id 
        ? incidents.find(i => i.id === selectedVehicle.current_incident_id)
        : null;

    return (
        <Card 
            title="Operational Region Map" 
            action={
                <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
                    <Crosshair className="w-3.5 h-3.5 text-blue-400" />
                    <span>100 × 100 Grid</span>
                </div>
            }
        >
            <div className="w-full aspect-square relative bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-inner">
                <svg viewBox="0 0 100 100" className="w-full h-full select-none">
                    {/* Grid Lines */}
                    <g className="text-slate-800/80" strokeWidth="0.35" stroke="currentColor">
                        {[25, 75].map(v => (
                            <line key={`v-${v}`} x1={v} y1="0" x2={v} y2="100" strokeDasharray="1,2" />
                        ))}
                        {[25, 75].map(v => (
                            <line key={`h-${v}`} x1="0" y1={v} x2="100" y2={v} strokeDasharray="1,2" />
                        ))}
                        {/* Major Quadrant Dividing Lines (x=50, y=50) */}
                        <line x1="50" y1="0" x2="50" y2="100" stroke="#334155" strokeWidth="0.75" />
                        <line x1="0" y1="50" x2="100" y2="50" stroke="#334155" strokeWidth="0.75" />
                    </g>
                    
                    {/* Quadrant Sector Watermarks */}
                    <g className="text-slate-800 text-[5px] font-bold fill-current font-mono" opacity="0.6">
                        <text x="4" y="8">Q2: UPPER LEFT (x&lt;50, y≥50)</text>
                        <text x="54" y="8">Q4: UPPER RIGHT (x≥50, y≥50)</text>
                        <text x="4" y="96">Q1: LOWER LEFT (x&lt;50, y&lt;50)</text>
                        <text x="54" y="96">Q3: LOWER RIGHT (x≥50, y&lt;50)</text>
                    </g>

                    {/* Vector Line to Assigned Incident (if selected unit is busy) */}
                    {selectedVehicle && assignedIncident && (
                        <g>
                            <line
                                x1={tx(selectedVehicle.x)}
                                y1={ty(selectedVehicle.y)}
                                x2={tx(assignedIncident.x)}
                                y2={ty(assignedIncident.y)}
                                stroke="#38bdf8"
                                strokeWidth="0.6"
                                strokeDasharray="2,1.5"
                                opacity="0.9"
                            />
                            <circle
                                cx={tx(assignedIncident.x)}
                                cy={ty(assignedIncident.y)}
                                r="3.5"
                                className="fill-none stroke-blue-400 opacity-60"
                                strokeWidth="0.5"
                            />
                        </g>
                    )}

                    {/* Incidents Layer */}
                    {incidents.map(inc => {
                        let fill = '#3b82f6'; // P1 Routine
                        let r = 1.3;
                        if (inc.priority === 3) {
                            fill = '#ef4444'; // P3 Critical
                            r = 2.0;
                        } else if (inc.priority === 2) {
                            fill = '#f59e0b'; // P2 Urgent
                            r = 1.6;
                        }

                        if (inc.status === 'COMPLETED') {
                            fill = '#475569';
                            r = 1.1;
                        } else if (inc.status === 'ASSIGNED') {
                            fill = '#0284c7';
                        }

                        const isTargetOfSelected = selectedVehicle?.current_incident_id === inc.id;

                        return (
                            <circle 
                                key={inc.id}
                                cx={tx(inc.x)}
                                cy={ty(inc.y)}
                                r={isTargetOfSelected ? r + 0.8 : r}
                                fill={fill}
                                opacity={inc.status === 'COMPLETED' ? 0.35 : 0.9}
                                className="cursor-pointer transition-all hover:scale-125"
                                onClick={() => inc.assigned_vehicle_id && onSelectVehicle?.(inc.assigned_vehicle_id)}
                            >
                                <title>{`Incident #${inc.id} [P${inc.priority} ${inc.priority === 3 ? 'Critical' : inc.priority === 2 ? 'Urgent' : 'Routine'}] | Status: ${inc.status} | Loc: (${inc.x.toFixed(1)}, ${inc.y.toFixed(1)})`}</title>
                            </circle>
                        );
                    })}

                    {/* Vehicles Layer */}
                    {vehicles.map(v => {
                        const isSelected = selectedVehicleId === v.id;
                        const isBusy = v.status === 'BUSY';
                        
                        return (
                            <g 
                                key={v.id} 
                                transform={`translate(${tx(v.x)}, ${ty(v.y)})`}
                                onClick={() => onSelectVehicle?.(isSelected ? null : v.id)}
                                className="cursor-pointer"
                            >
                                {/* Selected Vehicle Highlight Ring */}
                                {isSelected && (
                                    <circle 
                                        cx="0" cy="0" r="4.5" 
                                        className="fill-none stroke-blue-400 opacity-80" 
                                        strokeWidth="0.75" 
                                    />
                                )}
                                
                                {/* Vehicle Marker */}
                                <rect 
                                    x="-1.6" y="-1.6" 
                                    width="3.2" height="3.2" 
                                    rx="0.5"
                                    className={isBusy ? "fill-amber-400" : "fill-emerald-400"} 
                                    stroke="#020617"
                                    strokeWidth="0.4"
                                />
                                
                                {/* Unit ID label on hover or selection */}
                                {isSelected && (
                                    <text 
                                        x="2.5" y="-2" 
                                        className="text-[3.8px] font-mono font-bold fill-slate-100"
                                    >
                                        {v.id}
                                    </text>
                                )}
                                <title>{`Unit #${v.id} [${v.status}] | Pos: (${v.x.toFixed(1)}, ${v.y.toFixed(1)}) | ${v.completion_time ? `Busy until m${v.completion_time.toFixed(1)}` : 'Idle'}`}</title>
                            </g>
                        );
                    })}
                </svg>
            </div>
            
            {/* Legend */}
            <div className="flex flex-wrap items-center justify-between gap-2 mt-3 text-[11px] text-slate-400 px-1 font-mono">
                <div className="flex items-center">
                    <span className="w-2.5 h-2.5 bg-emerald-400 rounded-sm mr-1.5 inline-block"></span>
                    <span>Idle Unit</span>
                </div>
                <div className="flex items-center">
                    <span className="w-2.5 h-2.5 bg-amber-400 rounded-sm mr-1.5 inline-block"></span>
                    <span>Busy Unit</span>
                </div>
                <div className="flex items-center">
                    <span className="w-2.5 h-2.5 bg-red-500 rounded-full mr-1.5 inline-block animate-pulse"></span>
                    <span>P3 Critical</span>
                </div>
                <div className="flex items-center">
                    <span className="w-2.5 h-2.5 bg-amber-500 rounded-full mr-1.5 inline-block"></span>
                    <span>P2 Urgent</span>
                </div>
                <div className="flex items-center">
                    <span className="w-2.5 h-2.5 bg-blue-500 rounded-full mr-1.5 inline-block"></span>
                    <span>P1 Routine</span>
                </div>
            </div>
        </Card>
    );
});
