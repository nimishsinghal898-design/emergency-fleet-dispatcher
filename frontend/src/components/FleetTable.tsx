import React from 'react';
import { Vehicle } from '../types/models';
import { Card } from './Card';

interface FleetTableProps {
    vehicles: Vehicle[];
    selectedId?: string | null;
    onSelect: (id: string | null) => void;
}

export const FleetTable = React.memo(function FleetTable({ vehicles, selectedId, onSelect }: FleetTableProps) {
    return (
        <Card title="Fleet Status" className="h-full flex-1">
            <div className="overflow-y-auto pr-2" style={{ maxHeight: '400px' }}>
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="sticky top-0 bg-slate-900 z-10 text-xs text-slate-500 uppercase tracking-wider">
                        <tr>
                            <th className="pb-2 font-medium">Unit</th>
                            <th className="pb-2 font-medium">Status</th>
                            <th className="pb-2 font-medium">Sector</th>
                            <th className="pb-2 font-medium">Avail</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {vehicles.map(v => {
                            const isSelected = selectedId === v.id;
                            
                            // Calculate quadrant 
                            let quad = 'UR';
                            if (v.x < 50 && v.y < 50) quad = 'LL';
                            else if (v.x < 50 && v.y >= 50) quad = 'UL';
                            else if (v.x >= 50 && v.y < 50) quad = 'LR';
                            
                            return (
                                <tr 
                                    key={v.id} 
                                    onClick={() => onSelect(isSelected ? null : v.id)}
                                    className={`cursor-pointer transition-colors ${isSelected ? 'bg-blue-900/30' : 'hover:bg-slate-800/50 text-slate-300'}`}
                                >
                                    <td className="py-2 font-mono text-xs">{v.id}</td>
                                    <td className="py-2">
                                        {v.status === 'IDLE' 
                                            ? <span className="text-emerald-500 font-semibold text-xs uppercase tracking-wider">Idle</span>
                                            : <span className="text-amber-500 font-semibold text-xs uppercase tracking-wider">Busy</span>
                                        }
                                    </td>
                                    <td className="py-2 font-mono text-xs text-slate-400">{quad}</td>
                                    <td className="py-2 text-xs">
                                        {v.completion_time ? `m${v.completion_time}` : 'Now'}
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
