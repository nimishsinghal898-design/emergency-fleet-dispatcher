import { Download, FileJson, FileSpreadsheet, Check } from 'lucide-react';
import { RunResult } from '../types/models';
import { api } from '../api/client';
import { Modal } from './Modal';

interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    runResult: RunResult | null;
}

export function ExportModal({ isOpen, onClose, runResult }: ExportModalProps) {
    if (!runResult) return null;

    const exports = [
        {
            title: 'Complete Simulation Telemetry (JSON)',
            filename: `results_${runResult.seed}.json`,
            description: 'Full simulation output: scenario parameters, incident telemetry, assignments log, coverage timeline, and validation results.',
            icon: FileJson,
            url: api.getExportJsonUrl(runResult.run_id),
            format: 'JSON',
            details: `${runResult.assignments.length} assignments, ${runResult.coverage_timeline.length} timeline records`
        },
        {
            title: 'Core Evaluation Metrics (CSV)',
            filename: `results_${runResult.seed}.csv`,
            description: 'Flattened summary table containing seed, weighted response mean, outage minutes, runtime, and validation tallies.',
            icon: FileSpreadsheet,
            url: api.getExportCsvUrl(runResult.run_id),
            format: 'CSV',
            details: 'Standard benchmark metrics export'
        }
    ];

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Export Operational Data" 
            subtitle={`Run ID: ${runResult.run_id} · Seed: ${runResult.seed}`}
            maxWidth="lg"
        >
            <div className="space-y-4">
                <p className="text-xs text-slate-400">
                    Download verified simulation datasets for offline auditing, mathematical analysis, or benchmark submissions.
                </p>

                <div className="space-y-3">
                    {exports.map((item, index) => {
                        const Icon = item.icon;
                        return (
                            <div 
                                key={index}
                                className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-colors flex items-center justify-between"
                            >
                                <div className="flex items-start space-x-3.5 pr-4">
                                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-blue-400 shrink-0">
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="flex items-center space-x-2">
                                            <h4 className="text-xs font-bold text-slate-200">
                                                {item.title}
                                            </h4>
                                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                                                {item.format}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                            {item.description}
                                        </p>
                                        <div className="text-[11px] font-mono text-slate-500 mt-1.5 flex items-center space-x-3">
                                            <span>Filename: {item.filename}</span>
                                            <span>•</span>
                                            <span>{item.details}</span>
                                        </div>
                                    </div>
                                </div>

                                <a
                                    href={item.url}
                                    download={item.filename}
                                    className="px-3.5 py-2 text-xs font-semibold uppercase tracking-wider bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center shrink-0 shadow-sm"
                                >
                                    <Download className="w-4 h-4 mr-1.5" />
                                    Download
                                </a>
                            </div>
                        );
                    })}
                </div>

                <div className="pt-3 border-t border-slate-800 text-xs text-slate-500 flex items-center justify-between font-mono">
                    <span className="flex items-center text-emerald-400">
                        <Check className="w-3.5 h-3.5 mr-1" />
                        Deterministic output matches export_script.py
                    </span>
                    <button 
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-200 underline"
                    >
                        Dismiss
                    </button>
                </div>
            </div>
        </Modal>
    );
}
