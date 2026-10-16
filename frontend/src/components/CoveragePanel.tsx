import React from 'react';
import { CoverageRecord } from '../types/models';
import { Card } from './Card';
import { ShieldCheck, ShieldAlert } from 'lucide-react';

interface CoveragePanelProps {
    record: CoverageRecord | null;
}

function QuadrantView({ idles, code }: { idles: number, code: string }) {
    const isOutage = idles === 0;
    
    return (
        <div className={`border rounded-lg p-3 flex flex-col items-center justify-center relative overflow-hidden transition-colors
            ${isOutage ? 'bg-red-950/30 border-red-900/50' : 'bg-slate-900 border-slate-800'}`}>
            
            <div className="text-xs font-semibold text-slate-500 absolute top-2 left-2">{code}</div>
            
            <div className={`text-4xl font-bold my-2 ${isOutage ? 'text-red-500' : 'text-emerald-400'}`}>
                {idles}
            </div>
            <div className="text-xs uppercase tracking-wider text-slate-400 font-medium">Idle</div>
            
            <div className={`mt-2 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider
                ${isOutage ? 'bg-red-900/50 text-red-300' : 'bg-emerald-900/50 text-emerald-300'}`}>
                {isOutage ? 'OUTAGE' : 'COVERED'}
            </div>
        </div>
    );
}

export const CoveragePanel = React.memo(function CoveragePanel({ record }: CoveragePanelProps) {
    if (!record) {
        return (
            <Card title="Coverage Status">
                <div className="flex-1 flex items-center justify-center text-slate-500">
                    No active simulation
                </div>
            </Card>
        );
    }
    
    return (
        <Card 
            title="Coverage Status"
            action={
                record.coverage_healthy 
                    ? <div className="flex items-center text-emerald-500 text-xs font-semibold"><ShieldCheck className="w-4 h-4 mr-1"/> HEALTHY</div>
                    : <div className="flex items-center text-red-500 text-xs font-semibold animate-pulse"><ShieldAlert className="w-4 h-4 mr-1"/> OUTAGE</div>
            }
        >
            <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-2 h-full">
                <QuadrantView code="UL" idles={record.idle_UL} />
                <QuadrantView code="UR" idles={record.idle_UR} />
                <QuadrantView code="LL" idles={record.idle_LL} />
                <QuadrantView code="LR" idles={record.idle_LR} />
            </div>
        </Card>
    );
});
