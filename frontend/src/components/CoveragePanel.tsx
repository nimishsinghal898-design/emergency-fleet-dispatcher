import React from 'react';
import { CoverageRecord } from '../types/models';
import { Card } from './Card';
import { ShieldCheck, ShieldAlert, Compass } from 'lucide-react';

interface CoveragePanelProps {
    record: CoverageRecord | null;
}

interface SectorProps {
    code: string;
    label: string;
    coords: string;
    idles: number;
}

function SectorCard({ code, label, coords, idles }: SectorProps) {
    const isOutage = idles === 0;
    
    return (
        <div 
            className={`border rounded-xl p-3 flex flex-col justify-between relative overflow-hidden transition-all shadow-sm ${
                isOutage 
                    ? 'bg-red-950/25 border-red-800/60 ring-1 ring-red-500/20' 
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
        >
            <div className="flex items-center justify-between">
                <div>
                    <span className="text-xs font-mono font-bold text-slate-300">{code}</span>
                    <span className="text-[10px] text-slate-500 block font-medium">{label}</span>
                </div>
                <span className="text-[9px] font-mono text-slate-500">{coords}</span>
            </div>
            
            <div className="my-2 text-center">
                <div className={`text-3xl font-mono font-bold tracking-tight ${isOutage ? 'text-red-400' : 'text-emerald-400'}`}>
                    {idles}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Available Units</div>
            </div>
            
            <div className="flex items-center justify-center">
                <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                    isOutage 
                        ? 'bg-red-900/60 text-red-300 border border-red-700/50' 
                        : 'bg-emerald-950 text-emerald-400 border border-emerald-900/50'
                }`}>
                    {isOutage ? 'SECTOR OUTAGE' : 'COVERED'}
                </span>
            </div>
        </div>
    );
}

export const CoveragePanel = React.memo(function CoveragePanel({ record }: CoveragePanelProps) {
    if (!record) {
        return (
            <Card title="Coverage Health">
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-6 text-center">
                    <Compass className="w-8 h-8 mb-2 text-slate-600 opacity-60" />
                    <p className="text-xs font-medium text-slate-400">Sector Coverage Offline</p>
                    <p className="text-[11px] text-slate-500 mt-1">Start a simulation to inspect quadrant availability in real time.</p>
                </div>
            </Card>
        );
    }

    const totalIdles = record.idle_LL + record.idle_UL + record.idle_LR + record.idle_UR;
    
    return (
        <Card 
            title="Coverage Health"
            action={
                record.coverage_healthy 
                    ? (
                        <div className="flex items-center text-emerald-400 text-xs font-semibold px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/40">
                            <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                            ALL SECTORS SECURE
                        </div>
                    ) : (
                        <div className="flex items-center text-red-400 text-xs font-semibold px-2 py-0.5 rounded bg-red-950/60 border border-red-800/40 animate-pulse">
                            <ShieldAlert className="w-3.5 h-3.5 mr-1 text-red-400" />
                            OUTAGE AT t={record.minute}m
                        </div>
                    )
            }
        >
            <div className="mb-2.5 flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
                <span className="font-mono text-[11px]">Region Grid: 100 × 100</span>
                <span className="font-mono text-emerald-400 font-semibold">{totalIdles} Fleet Units Idle</span>
            </div>

            <div className="grid grid-cols-2 gap-2 flex-1">
                <SectorCard code="UL" label="Upper Left" coords="x<50, y≥50" idles={record.idle_UL} />
                <SectorCard code="UR" label="Upper Right" coords="x≥50, y≥50" idles={record.idle_UR} />
                <SectorCard code="LL" label="Lower Left" coords="x<50, y<50" idles={record.idle_LL} />
                <SectorCard code="LR" label="Lower Right" coords="x≥50, y<50" idles={record.idle_LR} />
            </div>
        </Card>
    );
});
