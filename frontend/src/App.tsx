import { useState, useEffect, useCallback } from 'react';
import { 
    SimulationRequest, 
    RunResult, 
    Vehicle, 
    Incident, 
    CoverageRecord
} from './types/models';
import { api } from './api/client';
import { KpiCards } from './components/KpiCards';
import { CoveragePanel } from './components/CoveragePanel';
import { SimulationMap } from './components/SimulationMap';
import { FleetTable } from './components/FleetTable';
import { IncidentQueue } from './components/IncidentQueue';
import { EventFeed } from './components/EventFeed';
import { AssignmentPanel } from './components/AssignmentPanel';
import { SimulationControls } from './components/SimulationControls';
import { TimelineControls } from './components/TimelineControls';
import { PerformanceCharts } from './components/PerformanceCharts';
import { ChallengeCompliance } from './components/ChallengeCompliance';
import { ComparisonModal } from './components/ComparisonModal';
import { ExportModal } from './components/ExportModal';
import { ConfirmationModal } from './components/ConfirmationModal';
import { 
    Activity, 
    Download, 
    ServerCrash, 
    SplitSquareHorizontal, 
    RotateCcw, 
    Play, 
    CheckCircle2, 
    Zap
} from 'lucide-react';

function App() {
    // Backend health state
    const [systemOnline, setSystemOnline] = useState<boolean | null>(null);

    // Simulation run state
    const [isLoading, setIsLoading] = useState(false);
    const [loadingStage, setLoadingStage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [runResult, setRunResult] = useState<RunResult | null>(null);
    const [baselineResult, setBaselineResult] = useState<RunResult | null>(null);
    const [activePolicy, setActivePolicy] = useState<'coverage' | 'baseline'>('coverage');

    // Modals
    const [isComparisonOpen, setIsComparisonOpen] = useState(false);
    const [isExportOpen, setIsExportOpen] = useState(false);
    const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
    
    // Timeline state
    const [currentMinute, setCurrentMinute] = useState(0);
    const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
    const [timelineVehicles, setTimelineVehicles] = useState<Vehicle[]>([]);
    const [timelineIncidents, setTimelineIncidents] = useState<Incident[]>([]);
    const [currentCoverage, setCurrentCoverage] = useState<CoverageRecord | null>(null);

    // Initial Health Check on Mount
    useEffect(() => {
        let isMounted = true;
        api.checkHealth()
            .then(res => {
                if (isMounted) setSystemOnline(res.status === 'ok');
            })
            .catch(() => {
                if (isMounted) setSystemOnline(false);
            });
        return () => {
            isMounted = false;
        };
    }, []);

    // Calculate the state of the world at a specific minute t
    const updateTimelineState = useCallback((t: number, data: RunResult | null = (activePolicy === 'coverage' ? runResult : (baselineResult || runResult))) => {
        if (!data) return;
        
        // Find coverage record at minute t
        const cov = data.coverage_timeline.find(c => c.minute === t) || data.coverage_timeline[data.coverage_timeline.length - 1];
        setCurrentCoverage(cov);

        // Find incidents revealed up to minute t
        const activeIncidents = data.incidents.filter(i => i.arrival_minute <= t).map(inc => {
            let currentStatus = inc.status;
            let assigned_vehicle_id = inc.assigned_vehicle_id;
            
            if (inc.dispatch_time !== null && inc.dispatch_time > t) {
                currentStatus = 'WAITING';
                assigned_vehicle_id = null;
            } else if (inc.completion_time !== null && inc.completion_time <= t) {
                currentStatus = 'COMPLETED';
            } else if (inc.dispatch_time !== null && inc.dispatch_time <= t) {
                currentStatus = 'ASSIGNED';
            }
            return { ...inc, status: currentStatus, assigned_vehicle_id };
        });
        setTimelineIncidents(activeIncidents as Incident[]);

        // Reconstruct vehicle positions accurately based on assignments:
        // Initial positions come from first assignment's vehicle_x_before/vehicle_y_before,
        // or data.vehicles for unassigned vehicles.
        const initialPositions = new Map<string, { x: number; y: number }>();
        const sortedAssignments = [...data.assignments].sort((a, b) => a.dispatch_time - b.dispatch_time);
        for (const a of sortedAssignments) {
            if (!initialPositions.has(a.vehicle_id)) {
                initialPositions.set(a.vehicle_id, { x: a.vehicle_x_before, y: a.vehicle_y_before });
            }
        }

        const vehiclesCopy: Vehicle[] = data.vehicles.map(v => {
            const initPos = initialPositions.get(v.id);
            return {
                ...v,
                x: initPos ? initPos.x : v.x,
                y: initPos ? initPos.y : v.y,
                status: 'IDLE',
                current_incident_id: null,
                completion_time: null
            };
        });
        
        const pastAssignments = sortedAssignments.filter(a => a.dispatch_time <= t);
        
        for (const a of pastAssignments) {
            const vIndex = vehiclesCopy.findIndex(v => v.id === a.vehicle_id);
            if (vIndex !== -1) {
                vehiclesCopy[vIndex].x = a.incident_x;
                vehiclesCopy[vIndex].y = a.incident_y;
                if (a.completion_time > t) {
                    vehiclesCopy[vIndex].status = 'BUSY';
                    vehiclesCopy[vIndex].current_incident_id = a.incident_id;
                    vehiclesCopy[vIndex].completion_time = a.completion_time;
                } else {
                    vehiclesCopy[vIndex].status = 'IDLE';
                    vehiclesCopy[vIndex].current_incident_id = null;
                    vehiclesCopy[vIndex].completion_time = null;
                }
            }
        }
        setTimelineVehicles(vehiclesCopy);
    }, [runResult, baselineResult, activePolicy]);

    const handleTimelineChange = (t: number) => {
        setCurrentMinute(t);
        updateTimelineState(t);
    };

    // Run official or custom simulation
    const handleRunSimulation = async (req: SimulationRequest) => {
        setIsLoading(true);
        setLoadingStage('Initializing PCG64 Generator & Loading Service Region...');
        setError(null);
        setActivePolicy('coverage');
        setBaselineResult(null);

        try {
            setLoadingStage('Simulating Online Incident Influx & Dispatch Queue...');
            const { run_id } = await api.runSimulation(req);
            
            setLoadingStage('Computing Priority Metrics & Coverage Telemetry...');
            const result = await api.getRun(run_id);
            
            setRunResult(result);
            setCurrentMinute(0);
            updateTimelineState(0, result);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to connect to simulation engine.');
        } finally {
            setIsLoading(false);
            setLoadingStage('');
        }
    };

    // Run dual comparison (Coverage Policy vs Baseline Policy)
    const handleRunComparison = async (req: SimulationRequest) => {
        setIsLoading(true);
        setLoadingStage('Executing Coverage-Preserving Dispatcher...');
        setError(null);

        try {
            // 1. Coverage Run
            const resCov = await api.runSimulation({ ...req, dispatcher_type: 'coverage' });
            const covData = await api.getRun(resCov.run_id);
            
            // 2. Baseline Run
            setLoadingStage('Executing Nearest-Idle Baseline Dispatcher...');
            const resBase = await api.runSimulation({ ...req, dispatcher_type: 'baseline' });
            const baseData = await api.getRun(resBase.run_id);
            
            setRunResult(covData);
            setBaselineResult(baseData);
            setActivePolicy('coverage');
            setIsComparisonOpen(true);
            
            setCurrentMinute(0);
            updateTimelineState(0, covData);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to execute comparative simulation.');
        } finally {
            setIsLoading(false);
            setLoadingStage('');
        }
    };

    const handleResetSession = () => {
        setRunResult(null);
        setBaselineResult(null);
        setCurrentMinute(0);
        setSelectedVehicle(null);
        setTimelineVehicles([]);
        setTimelineIncidents([]);
        setCurrentCoverage(null);
    };

    const activeDisplayResult = activePolicy === 'coverage' ? runResult : (baselineResult || runResult);

    return (
        <div className="min-h-screen flex flex-col font-sans bg-slate-950 text-slate-200">
            {/* Top Operations Header */}
            <header className="bg-slate-950/90 border-b border-slate-800 px-6 py-3.5 flex items-center justify-between sticky top-0 z-50 backdrop-blur-md">
                <div className="flex items-center space-x-3.5">
                    <div className="bg-blue-600 p-2 rounded-xl shadow-md shadow-blue-500/20">
                        <Activity className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center space-x-2">
                            <h1 className="text-base font-extrabold tracking-wider text-slate-100 uppercase">
                                Emergency Fleet Command
                            </h1>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">
                                AI-01 PRODUCTION
                            </span>
                        </div>
                        <p className="text-[11px] font-medium text-slate-400 font-mono">
                            Causal Fleet Assignment &amp; Coverage Preservation Engine
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center space-x-3">
                    {/* Active Run Telemetry Badge */}
                    {runResult && (
                        <div className="hidden md:flex items-center space-x-2 font-mono text-xs px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
                            <span className="text-slate-500">SEED:</span>
                            <span className="text-blue-400 font-bold">{runResult.seed}</span>
                            <span className="text-slate-700">|</span>
                            <span className="text-slate-500">FLEET:</span>
                            <span className="text-slate-300">{runResult.scenario_summary.total_vehicles}</span>
                            <span className="text-slate-700">|</span>
                            <span className="text-slate-500">CALLS:</span>
                            <span className="text-slate-300">{runResult.scenario_summary.total_incidents}</span>
                        </div>
                    )}

                    {/* Action Buttons */}
                    {runResult && (
                        <div className="flex items-center space-x-2">
                            {baselineResult && (
                                <button
                                    onClick={() => setIsComparisonOpen(true)}
                                    className="text-xs bg-slate-900 hover:bg-slate-800 text-blue-400 border border-blue-900/60 px-3 py-1.5 rounded-lg flex items-center transition-colors font-bold shadow-sm"
                                >
                                    <SplitSquareHorizontal className="w-3.5 h-3.5 mr-1.5" />
                                    Compare
                                </button>
                            )}

                            <button 
                                onClick={() => setIsExportOpen(true)}
                                className="text-xs bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 px-3 py-1.5 rounded-lg flex items-center transition-colors font-semibold shadow-sm"
                            >
                                <Download className="w-3.5 h-3.5 mr-1.5" />
                                Export
                            </button>

                            <button 
                                onClick={() => setIsResetConfirmOpen(true)}
                                className="text-xs bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-red-400 border border-slate-800 px-2.5 py-1.5 rounded-lg flex items-center transition-colors"
                                title="Reset Simulation Session"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}

                    {/* Live System Status Indicator */}
                    <div className="flex items-center text-xs font-mono font-bold px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
                        {systemOnline === true ? (
                            <span className="flex items-center text-emerald-400">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
                                SYSTEM ONLINE
                            </span>
                        ) : systemOnline === false ? (
                            <span className="flex items-center text-red-400">
                                <span className="w-2 h-2 rounded-full bg-red-500 mr-2"></span>
                                SERVICE OFFLINE
                            </span>
                        ) : (
                            <span className="flex items-center text-slate-400">
                                <span className="w-2 h-2 rounded-full bg-slate-500 mr-2 animate-ping"></span>
                                CONNECTING...
                            </span>
                        )}
                    </div>
                </div>
            </header>

            {/* Error Notification Banner */}
            {error && (
                <div className="bg-red-950/80 border-b border-red-900 px-6 py-3 flex items-center justify-between text-xs text-red-300">
                    <div className="flex items-center space-x-2">
                        <ServerCrash className="w-4 h-4 text-red-400 shrink-0" />
                        <span className="font-bold">ENGINE EXECUTION ERROR:</span>
                        <span>{error}</span>
                    </div>
                    <button 
                        onClick={() => setError(null)}
                        className="text-xs underline text-red-400 hover:text-red-200"
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {/* Main Operational Dashboard */}
            <main className="flex-1 p-5 max-w-[1720px] mx-auto w-full flex flex-col space-y-4 mb-24">
                
                {/* Upper Deck: Controls & High-Level Telemetry */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    {/* Column 1: Controls */}
                    <div className="lg:col-span-1 h-full">
                        <SimulationControls 
                            onRun={handleRunSimulation} 
                            onRunComparison={handleRunComparison} 
                            isLoading={isLoading} 
                        />
                    </div>
                    
                    {/* Column 2-4: KPIs, Overview, or Guided Empty State */}
                    <div className="lg:col-span-3 flex flex-col justify-between">
                        {isLoading ? (
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 flex flex-col items-center justify-center text-center shadow-lg h-full min-h-[340px]">
                                <div className="p-4 rounded-full bg-blue-950/80 border border-blue-800/60 mb-4 animate-spin text-blue-400">
                                    <Activity className="w-8 h-8" />
                                </div>
                                <h3 className="text-base font-bold text-slate-100 uppercase tracking-wide">
                                    Executing Deterministic Simulation
                                </h3>
                                <p className="text-xs text-slate-400 font-mono mt-1">
                                    {loadingStage || 'Processing causality and coverage preservation matrix...'}
                                </p>
                            </div>
                        ) : activeDisplayResult ? (
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center space-x-2">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                            Operational Performance Telemetry
                                        </span>
                                        {baselineResult && (
                                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800/60 font-bold uppercase">
                                                Active View: {activePolicy} policy
                                            </span>
                                        )}
                                    </div>
                                    {baselineResult && (
                                        <button
                                            onClick={() => setIsComparisonOpen(true)}
                                            className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center underline"
                                        >
                                            <SplitSquareHorizontal className="w-3.5 h-3.5 mr-1" />
                                            View Side-by-Side Comparison
                                        </button>
                                    )}
                                </div>
                                <KpiCards 
                                    metrics={activeDisplayResult.metrics} 
                                    validation={activeDisplayResult.validation_results} 
                                />
                            </div>
                        ) : (
                            /* First-Time User Guided Quickstart */
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between shadow-lg h-full">
                                <div>
                                    <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                                        <div className="flex items-center space-x-2">
                                            <Zap className="w-4 h-4 text-amber-400" />
                                            <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                                                Operations Quickstart: Guided Verification
                                            </h2>
                                        </div>
                                        <span className="text-[11px] font-mono text-emerald-400 font-semibold">
                                            System Ready · Seed 20260911
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                                        <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800">
                                            <div className="text-[10px] font-mono text-blue-400 font-bold mb-1">01 / SPECIFICATION</div>
                                            <h3 className="text-xs font-bold text-slate-200">Official Scenario</h3>
                                            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                                                NumPy PCG64 seed 20260911 initialized with 20 vehicles uniformly partitioned (5 per quadrant) and 100 arrivals.
                                            </p>
                                        </div>

                                        <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800">
                                            <div className="text-[10px] font-mono text-blue-400 font-bold mb-1">02 / DISPATCH ENGINE</div>
                                            <h3 className="text-xs font-bold text-slate-200">Online Causality</h3>
                                            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                                                Zero knowledge of future arrivals. The dispatcher optimizes effective response cost while actively safeguarding regional coverage.
                                            </p>
                                        </div>

                                        <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800">
                                            <div className="text-[10px] font-mono text-blue-400 font-bold mb-1">03 / AUDITABILITY</div>
                                            <h3 className="text-xs font-bold text-slate-200">Deterministic Results</h3>
                                            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                                                Bit-for-bit reproducible assignments, coverage timelines, and JSON/CSV outputs verifiable via automated test suites.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
                                    <div className="flex items-center space-x-2 text-xs text-slate-400">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        <span>Click below to execute the official challenge run with single-click verification:</span>
                                    </div>

                                    <button
                                        onClick={() => handleRunSimulation({ seed: 20260911, dispatcher_type: 'coverage', experimental_mode: false })}
                                        disabled={isLoading}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center transition-colors shadow-md"
                                    >
                                        <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
                                        Initialize Official Development Simulation (Seed 20260911)
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Mid-Row: Coverage Health & Timeline Chart */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                            <div className="md:col-span-1">
                                <CoveragePanel record={currentCoverage} />
                            </div>
                            <div className="md:col-span-2">
                                <PerformanceCharts coverage={activeDisplayResult?.coverage_timeline || []} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Challenge Compliance Section */}
                <ChallengeCompliance defaultExpanded={false} />

                {/* Lower Deck: Operational Map, Incident Queue, Dispatches & Fleet Telemetry */}
                {activeDisplayResult && (
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[520px]">
                        {/* Event Feed */}
                        <div className="lg:col-span-1 h-full">
                            <EventFeed 
                                runResult={activeDisplayResult} 
                                currentMinute={currentMinute} 
                            />
                        </div>

                        {/* Simulation Map */}
                        <div className="lg:col-span-1 h-full">
                            <SimulationMap 
                                vehicles={timelineVehicles} 
                                incidents={timelineIncidents} 
                                selectedVehicleId={selectedVehicle}
                                onSelectVehicle={setSelectedVehicle}
                            />
                        </div>

                        {/* Incident Queue */}
                        <div className="lg:col-span-1 h-full">
                            <IncidentQueue incidents={timelineIncidents} />
                        </div>

                        {/* Split Deck: Assignments & Fleet Availability */}
                        <div className="lg:col-span-1 h-full flex flex-col space-y-4">
                            <div className="h-1/2">
                                <AssignmentPanel 
                                    assignments={activeDisplayResult.assignments} 
                                    currentMinute={currentMinute} 
                                />
                            </div>
                            <div className="h-1/2">
                                <FleetTable 
                                    vehicles={timelineVehicles} 
                                    selectedId={selectedVehicle} 
                                    onSelect={setSelectedVehicle} 
                                />
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Bottom Scrubber Timeline Bar */}
            {activeDisplayResult && (
                <TimelineControls 
                    currentMinute={currentMinute} 
                    maxMinute={120} 
                    onChange={handleTimelineChange} 
                />
            )}

            {/* Strategy Comparison Modal Dialog */}
            <ComparisonModal
                isOpen={isComparisonOpen}
                onClose={() => setIsComparisonOpen(false)}
                coverageResult={runResult}
                baselineResult={baselineResult}
                activePolicy={activePolicy}
                onSelectPolicy={(policy) => {
                    setActivePolicy(policy);
                    updateTimelineState(currentMinute, policy === 'coverage' ? runResult : baselineResult);
                }}
            />

            {/* Export Telemetry Modal Dialog */}
            <ExportModal
                isOpen={isExportOpen}
                onClose={() => setIsExportOpen(false)}
                runResult={activeDisplayResult}
            />

            {/* Session Reset Confirmation Modal */}
            <ConfirmationModal
                isOpen={isResetConfirmOpen}
                onClose={() => setIsResetConfirmOpen(false)}
                onConfirm={handleResetSession}
                title="Reset Active Operations Session?"
                message="This will clear the current simulation telemetry and rewind the operational clock to minute 0. You can run a new simulation at any time."
                confirmText="Reset Session"
                variant="warning"
            />
        </div>
    );
}

export default App;
