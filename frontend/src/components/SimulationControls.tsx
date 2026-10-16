import { useState } from 'react';
import { Card } from './Card';
import { SimulationRequest } from '../types/models';
import { Play, Settings2 } from 'lucide-react';

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

    return (
        <Card title="Simulation Control">
            <form onSubmit={handleSubmit} className="flex flex-col h-full justify-between">
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Dispatcher Policy</label>
                        <select 
                            value={dispatcher} 
                            onChange={e => setDispatcher(e.target.value as 'coverage' | 'baseline')}
                            className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-200 outline-none focus:border-blue-500"
                        >
                            <option value="coverage">Coverage-Preserving (Phase 1)</option>
                            <option value="baseline">Nearest-Idle Baseline</option>
                        </select>
                    </div>
                    
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Random Seed</label>
                        <input 
                            type="number" 
                            value={seed} 
                            onChange={e => setSeed(parseInt(e.target.value))}
                            className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-200 outline-none focus:border-blue-500"
                        />
                    </div>
                    
                    <div className="pt-2 border-t border-slate-800">
                        <label className="flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={experimental}
                                onChange={e => setExperimental(e.target.checked)}
                                className="form-checkbox bg-slate-950 border-slate-700 rounded text-blue-500"
                            />
                            <span className="ml-2 text-xs font-semibold text-amber-500 flex items-center">
                                <Settings2 className="w-3 h-3 mr-1" />
                                EXPERIMENTAL MODE
                            </span>
                        </label>
                    </div>

                    {experimental && (
                        <div className="grid grid-cols-2 gap-2 mt-2 bg-slate-950/50 p-2 rounded border border-amber-900/30">
                            <div>
                                <label className="block text-xs text-slate-500 mb-1">Vehicles</label>
                                <input 
                                    type="number" min="1" max="100"
                                    value={vehicles} 
                                    onChange={e => setVehicles(parseInt(e.target.value))}
                                    className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-sm text-slate-200"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-500 mb-1">Incidents</label>
                                <input 
                                    type="number" min="1" max="500"
                                    value={incidents} 
                                    onChange={e => setIncidents(parseInt(e.target.value))}
                                    className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-sm text-slate-200"
                                />
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="mt-6">
                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className={`w-full py-2.5 rounded font-semibold text-sm flex items-center justify-center transition-colors
                            ${isLoading 
                                ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                                : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
                    >
                        {isLoading ? (
                            <span className="flex items-center">
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                EXECUTING SIMULATION...
                            </span>
                        ) : (
                            <span className="flex items-center">
                                <Play className="w-4 h-4 mr-2" />
                                EXECUTE SIMULATION
                            </span>
                        )}
                    </button>
                    <button 
                        type="button" 
                        onClick={() => onRunComparison({
                            seed,
                            dispatcher_type: 'coverage', // baseline is forced internally for the second run
                            experimental_mode: experimental,
                            num_vehicles: experimental ? vehicles : undefined,
                            num_incidents: experimental ? incidents : undefined
                        })}
                        disabled={isLoading}
                        className={`w-full mt-2 py-2.5 rounded font-semibold text-sm flex items-center justify-center transition-colors border
                            ${isLoading 
                                ? 'border-slate-700 text-slate-500 cursor-not-allowed' 
                                : 'border-blue-600/50 hover:bg-blue-900/30 text-blue-400'}`}
                    >
                        <Settings2 className="w-4 h-4 mr-2" />
                        COMPARE WITH BASELINE
                    </button>
                </div>
            </form>
        </Card>
    );
}
