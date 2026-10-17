import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CoverageRecord } from '../types/models';
import { Card } from './Card';
import { Activity } from 'lucide-react';

interface PerformanceChartsProps {
    coverage: CoverageRecord[];
}

export function PerformanceCharts({ coverage }: PerformanceChartsProps) {
    if (!coverage || coverage.length === 0) {
        return (
            <Card title="Fleet Availability Over Time">
                <div className="h-60 flex flex-col items-center justify-center text-slate-500 p-6 text-center">
                    <Activity className="w-8 h-8 mb-2 text-slate-600 opacity-60" />
                    <p className="text-xs font-medium text-slate-400">Telemetry Offline</p>
                    <p className="text-[11px] text-slate-500 mt-1">Timeline chart populates after simulation execution.</p>
                </div>
            </Card>
        );
    }

    const outageMinutesCount = coverage.filter(c => c.outage > 0).length;

    return (
        <Card 
            title="Fleet Availability Over Time"
            action={
                <div className="flex items-center space-x-2 text-xs font-mono">
                    <span className="text-slate-400">Total Outages:</span>
                    <span className={outageMinutesCount > 0 ? "text-red-400 font-bold" : "text-emerald-400 font-bold"}>
                        {outageMinutesCount}m
                    </span>
                </div>
            }
        >
            <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={coverage}
                        margin={{ top: 10, right: 20, left: -20, bottom: 0 }}
                    >
                        <defs>
                            <linearGradient id="colorIdles" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0.02}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis 
                            dataKey="minute" 
                            stroke="#64748b" 
                            fontSize={11}
                            fontFamily="monospace"
                            tickFormatter={(v) => `t=${v}m`} 
                        />
                        <YAxis 
                            stroke="#64748b" 
                            fontSize={11} 
                            fontFamily="monospace"
                            domain={[0, 'auto']}
                        />
                        <Tooltip 
                            contentStyle={{ 
                                backgroundColor: '#020617', 
                                borderColor: '#334155',
                                borderRadius: '0.5rem',
                                fontSize: '11px',
                                fontFamily: 'monospace'
                            }}
                            itemStyle={{ color: '#10b981' }}
                            labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                            formatter={(value: unknown) => [`${value} Available Units`, 'Fleet Status']}
                            labelFormatter={(label) => `Simulation Minute: t=${label}m`}
                        />
                        <Area 
                            type="stepAfter" 
                            dataKey={(d) => d.idle_LL + d.idle_LR + d.idle_UL + d.idle_UR} 
                            name="Available Fleet Units"
                            stroke="#10b981" 
                            strokeWidth={1.5}
                            fillOpacity={1} 
                            fill="url(#colorIdles)" 
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
            
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono mt-2 pt-2 border-t border-slate-800/80">
                <span>Metric: Total Regional Available Fleet (Sum of 4 Quadrants)</span>
                <span>Horizon: t = 0 ... 120m</span>
            </div>
        </Card>
    );
}
