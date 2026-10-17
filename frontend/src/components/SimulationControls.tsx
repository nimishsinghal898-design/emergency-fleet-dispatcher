import { useState } from 'react';
import { Card } from './Card';
import { SimulationRequest } from '../types/models';
import { Play, Settings2, Sliders } from 'lucide-react';

interface SimulationControlsProps {
    onRun: (req: SimulationRequest) => void;
    onRunComparison: (req: SimulationRequest) => void;
    isLoading: boolean;
}

export function SimulationControls({ onRun, onRunComparison, isLoading }: SimulationControlsProps) {
    const [seed, setSeed] = useState(20260911);
    const [dispatcher, setDispatcher] = useState<'coverage' | 'baseline'>('coverage');
    const [experimental, setExperimental] = useState(false);
    const [vehicles, setVehicles] = useState(20);
    const [incidents, setIncidents] = useState(100);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onRun({
            seed,
            dispatcher_type: dispatcher,
            experimental_mode: experimental,
            num_vehicles: experimental ? vehicles : undefined,
            num_incidents: experimental ? incidents : undefined
        });
    };

    const setOfficialPreset = () => {
        setSeed(20260911);
        setDispatcher('coverage');
        setExperimental(false);
        setVehicles(20);
        setIncidents(100);
    };

    return (
        <Card title="Simulation Parameters">
            <form onSubmit={handleSubmit} className="flex flex-col h-full justify-between space-y-4">
                <div className="space-y-4">
                    {/* Dispatcher Policy Selector */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                                Dispatcher Policy
                            </label>
                            <span className="text-[10px] font-mono text-slate-500">Online/Causal</span>
                        </div>
                        <select 
                            value={dispatcher} 
                            onChange={e => setDispatcher(e.target.value as 'coverage' | 'baseline')}
                            disabled={isLoading}
                            className="w-full bg-slate-950 border border-slate-700/80 rounded-lg p-2.5 text-xs text-slate-200 outline-none focus:border-blue-500 transition-colors cursor-pointer"
                        >
                            <option value="coverage">Coverage-Preserving Policy (Official)</option>
                            <option value="baseline">Nearest-Idle Baseline (Greedy)</option>
                        </select>
                        <p className="text-[11px] text-slate-500 mt-1">
                            {dispatcher === 'coverage' 
                                ? 'Applies dynamic scarcity penalties to preserve regional readiness across all 4 quadrants.' 
                                : 'Selects the nearest idle vehicle without considering quadrant depletion risk.'}
                        </p>
                    </div>
                    
                    {/* Random Seed Control with Presets */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                                Random Seed (PCG64)
                            </label>
                            <span className="text-[10px] font-mono text-blue-400 font-semibold">
                                {seed === 20260911 ? 'OFFICIAL DEV' : 'CUSTOM'}
                            </span>
                        </div>
                        <input 
                            type="number" 
                            value={seed} 
                            disabled={isLoading}
                            onChange={e => {
                                const val = parseInt(e.target.value, 10);
                                setSeed(isNaN(val) ? 0 : val);
                            }}
                            className="w-full bg-slate-950 border border-slate-700/80 rounded-lg p-2.5 text-xs text-slate-200 font-mono outline-none focus:border-blue-500 transition-colors"
                        />
                        <div className="flex items-center space-x-1.5 mt-1.5">
                            <button
                                type="button"
                                onClick={setOfficialPreset}
                                disabled={isLoading}
                                className={`text-[10px] font-mono px-2 py-0.5 rounded transition-colors ${
                                    seed === 20260911 
                                        ? 'bg-blue-950 text-blue-400 border border-blue-800/60 font-bold' 
                                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                Official 20260911
                            </button>
                            <button
                                type="button"
                                onClick={() => setSeed(42)}
                                disabled={isLoading}
                                className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                            >
                                Seed 42
                            </button>
                            <button
                                type="button"
                                onClick={() => setSeed(999)}
                                disabled={isLoading}
                                className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                            >
                                Seed 999
                            </button>
                        </div>
                    </div>
                    
                    {/* Experimental Mode Toggle */}
                    <div className="pt-3 border-t border-slate-800/80">
                        <label className="flex items-center justify-between cursor-pointer p-2 rounded-lg bg-slate-950/40 border border-slate-800/80 hover:border-slate-700 transition-colors">
                            <div className="flex items-center space-x-2">
                                <Sliders className="w-3.5 h-3.5 text-amber-500" />
                                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                                    Experimental Scale
                                </span>
                            </div>
                            <input 
                                type="checkbox" 
                                checked={experimental}
                                disabled={isLoading}
                                onChange={e => setExperimental(e.target.checked)}
                                className="form-checkbox bg-slate-900 border-slate-700 rounded text-blue-600 focus:ring-0 cursor-pointer"
                            />
                        </label>
                        <p className="text-[10px] text-slate-500 mt-1 pl-1">
                            Override default 20 vehicles and 100 incidents for stress testing.
                        </p>
                    </div>

                    {experimental && (
                        <div className="grid grid-cols-2 gap-2 p-3 bg-amber-950/10 rounded-lg border border-amber-900/30">
                            <div>
                                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                                    Units (1–100)
                                </label>
                                <input 
                                    type="number" min="1" max="100"
                                    value={vehicles} 
                                    disabled={isLoading}
                                    onChange={e => {
                                        const val = parseInt(e.target.value, 10);
                                        setVehicles(isNaN(val) ? 20 : val);
                                    }}
                                    className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-slate-200 font-mono"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                                    Calls (1–500)
                                </label>
                                <input 
                                    type="number" min="1" max="500"
                                    value={incidents} 
                                    disabled={isLoading}
                                    onChange={e => {
                                        const val = parseInt(e.target.value, 10);
                                        setIncidents(isNaN(val) ? 100 : val);
                                    }}
                                    className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-slate-200 font-mono"
                                />
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Action Buttons */}
                <div className="pt-4 border-t border-slate-800/80 space-y-2">
                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className={`w-full py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center transition-all shadow-md ${
                            isLoading 
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                                : 'bg-blue-600 hover:bg-blue-500 text-white active:scale-[0.99]'
                        }`}
                    >
                        {isLoading ? (
                            <span className="flex items-center">
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                EXECUTING ENGINE...
                            </span>
                        ) : (
                            <span className="flex items-center">
                                <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
                                EXECUTE SIMULATION
                            </span>
                        )}
                    </button>

                    <button 
                        type="button" 
                        onClick={() => onRunComparison({
                            seed,
                            dispatcher_type: 'coverage',
                            experimental_mode: experimental,
                            num_vehicles: experimental ? vehicles : undefined,
                            num_incidents: experimental ? incidents : undefined
                        })}
                        disabled={isLoading}
                        className={`w-full py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center transition-colors border ${
                            isLoading 
                                ? 'border-slate-800 text-slate-600 cursor-not-allowed' 
                                : 'border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-300'
                        }`}
                    >
                        <Settings2 className="w-3.5 h-3.5 mr-1.5 text-blue-400" />
                        COMPARE POLICIES
                    </button>
                </div>
            </form>
        </Card>
    );
}
