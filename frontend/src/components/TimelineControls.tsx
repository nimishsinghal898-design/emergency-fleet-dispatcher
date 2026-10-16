import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { useEffect, useState } from 'react';

interface TimelineControlsProps {
    currentMinute: number;
    maxMinute: number;
    onChange: (minute: number) => void;
    disabled?: boolean;
}

export function TimelineControls({ currentMinute, maxMinute, onChange, disabled }: TimelineControlsProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState<number>(1); // Speed multiplier

    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | undefined;
        if (isPlaying && !disabled) {
            const delay = 300 / speed;
            interval = setInterval(() => {
                onChange(Math.min(currentMinute + 1, maxMinute));
                if (currentMinute >= maxMinute) {
                    setIsPlaying(false);
                }
            }, delay);
        }
        return () => clearInterval(interval);
    }, [isPlaying, currentMinute, maxMinute, onChange, disabled, speed]);

    return (
        <div className="flex flex-col bg-slate-900 border-t border-slate-800 p-4 sticky bottom-0 w-full z-50">
            <div className="flex items-center space-x-4 max-w-4xl mx-auto w-full">
                <div className="flex items-center space-x-2">
                    <button 
                        onClick={() => onChange(0)}
                        disabled={disabled}
                        title="Reset"
                        className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-50"
                    >
                        <SkipBack className="w-5 h-5" />
                    </button>
                    
                    <button 
                        onClick={() => setIsPlaying(!isPlaying)}
                        disabled={disabled || currentMinute >= maxMinute}
                        title={isPlaying ? "Pause" : "Play"}
                        className="p-2 bg-blue-600 hover:bg-blue-500 rounded-full text-white disabled:opacity-50 disabled:bg-slate-800"
                    >
                        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </button>
                    
                    <button 
                        onClick={() => onChange(Math.min(currentMinute + 1, maxMinute))}
                        disabled={disabled || currentMinute >= maxMinute}
                        title="Step Forward"
                        className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-50"
                    >
                        <SkipForward className="w-5 h-5" />
                    </button>
                    
                    <select
                        value={speed}
                        onChange={(e) => setSpeed(parseFloat(e.target.value))}
                        disabled={disabled}
                        className="ml-2 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 outline-none"
                    >
                        <option value={0.5}>0.5×</option>
                        <option value={1}>1×</option>
                        <option value={2}>2×</option>
                        <option value={4}>4×</option>
                        <option value={8}>8×</option>
                    </select>
                </div>
                
                <div className="flex-1 flex items-center space-x-4">
                    <span className="font-mono text-sm text-slate-400 min-w-[50px]">
                        t = {currentMinute}
                    </span>
                    <input 
                        type="range" 
                        min="0" 
                        max={maxMinute} 
                        value={currentMinute}
                        onChange={(e) => onChange(parseInt(e.target.value))}
                        disabled={disabled}
                        className="flex-1 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    <span className="font-mono text-sm text-slate-400">
                        {maxMinute}
                    </span>
                </div>
            </div>
        </div>
    );
}
