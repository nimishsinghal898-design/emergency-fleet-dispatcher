import { Play, Pause, SkipBack, SkipForward, RotateCcw, FastForward } from 'lucide-react';
import { useEffect, useState } from 'react';

interface TimelineControlsProps {
    currentMinute: number;
    maxMinute: number;
    onChange: (minute: number) => void;
    disabled?: boolean;
}

export function TimelineControls({ currentMinute, maxMinute, onChange, disabled }: TimelineControlsProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState<number>(1);

    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | undefined;
        if (isPlaying && !disabled) {
            const delay = 350 / speed;
            interval = setInterval(() => {
                const next = Math.min(currentMinute + 1, maxMinute);
                onChange(next);
                if (next >= maxMinute) {
                    setIsPlaying(false);
                }
            }, delay);
        }
        return () => clearInterval(interval);
    }, [isPlaying, currentMinute, maxMinute, onChange, disabled, speed]);

    const percentage = Math.round((currentMinute / maxMinute) * 100);

    return (
        <div className="bg-slate-950/95 border-t border-slate-800 p-3 sticky bottom-0 w-full z-40 backdrop-blur-md shadow-2xl">
            <div className="max-w-6xl mx-auto w-full flex flex-col space-y-2">
                {/* Timeline Header Details */}
                <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
                    <div className="flex items-center space-x-3">
                        <span className="font-bold uppercase tracking-wider text-slate-300">
                            Dispatch Timeline
                        </span>
                        <span className="text-slate-600">|</span>
                        <span className="text-blue-400 font-bold">
                            t = {currentMinute.toString().padStart(3, '0')} min
                        </span>
                        <span className="text-slate-500">
                            ({currentMinute < 60 ? 'Incident Influx Window' : 'Service Resolution Window'})
                        </span>
                    </div>

                    <div className="flex items-center space-x-3">
                        <span className="text-slate-400">{percentage}% Complete</span>
                        <span className="text-slate-600">|</span>
                        <span className="text-slate-500">Horizon: {maxMinute}m</span>
                    </div>
                </div>

                {/* Controls Bar */}
                <div className="flex items-center space-x-4">
                    {/* Buttons Group */}
                    <div className="flex items-center space-x-1.5 shrink-0">
                        <button 
                            onClick={() => onChange(0)}
                            disabled={disabled || currentMinute === 0}
                            title="Reset to minute 0"
                            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-40 transition-colors"
                        >
                            <RotateCcw className="w-4 h-4" />
                        </button>

                        <button 
                            onClick={() => onChange(Math.max(0, currentMinute - 1))}
                            disabled={disabled || currentMinute === 0}
                            title="Step backward 1 minute"
                            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-40 transition-colors"
                        >
                            <SkipBack className="w-4 h-4" />
                        </button>
                        
                        <button 
                            onClick={() => setIsPlaying(!isPlaying)}
                            disabled={disabled || currentMinute >= maxMinute}
                            title={isPlaying ? "Pause simulation replay" : "Play simulation replay"}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-bold text-xs flex items-center space-x-1 disabled:opacity-40 disabled:bg-slate-800 transition-colors shadow-sm"
                        >
                            {isPlaying ? (
                                <>
                                    <Pause className="w-3.5 h-3.5 fill-current" />
                                    <span>PAUSE</span>
                                </>
                            ) : (
                                <>
                                    <Play className="w-3.5 h-3.5 fill-current" />
                                    <span>PLAY</span>
                                </>
                            )}
                        </button>
                        
                        <button 
                            onClick={() => onChange(Math.min(currentMinute + 1, maxMinute))}
                            disabled={disabled || currentMinute >= maxMinute}
                            title="Step forward 1 minute"
                            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-40 transition-colors"
                        >
                            <SkipForward className="w-4 h-4" />
                        </button>

                        <button 
                            onClick={() => onChange(maxMinute)}
                            disabled={disabled || currentMinute >= maxMinute}
                            title="Jump to minute 120"
                            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-40 transition-colors"
                        >
                            <FastForward className="w-4 h-4" />
                        </button>
                        
                        <select
                            value={speed}
                            onChange={(e) => setSpeed(parseFloat(e.target.value))}
                            disabled={disabled}
                            className="ml-2 bg-slate-900 border border-slate-700/80 rounded px-2 py-1 text-xs font-mono text-slate-300 outline-none hover:border-slate-600 cursor-pointer"
                        >
                            <option value={0.5}>0.5×</option>
                            <option value={1}>1.0×</option>
                            <option value={2}>2.0×</option>
                            <option value={4}>4.0×</option>
                            <option value={8}>8.0×</option>
                        </select>
                    </div>
                    
                    {/* Scrubber Range */}
                    <div className="flex-1 flex items-center space-x-3">
                        <input 
                            type="range" 
                            min="0" 
                            max={maxMinute} 
                            value={currentMinute}
                            onChange={(e) => onChange(parseInt(e.target.value, 10))}
                            disabled={disabled}
                            className="flex-1 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
