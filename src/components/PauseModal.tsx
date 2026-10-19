import React from 'react';
import { Play, RotateCcw, Home, Volume2, VolumeX } from 'lucide-react';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onHome: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onHome,
  soundEnabled,
  onToggleSound,
}) => {
  return (
    <div className="absolute inset-0 bg-slate-950/85 flex items-center justify-center p-4 z-20 pointer-events-auto select-none">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center">
        <h2 className="text-2xl font-extrabold font-display text-white tracking-wide mb-1">
          GAME PAUSED
        </h2>
        <p className="text-xs font-mono text-slate-400 mb-6">
          Press ESC or click Resume to continue
        </p>

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-2.5">
          <button
            onClick={onResume}
            className="w-full py-3 px-4 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-display font-bold text-base rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 transition-all cursor-pointer"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>Resume Game</span>
          </button>

          <button
            onClick={onRestart}
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 active:bg-slate-800 text-slate-200 font-display font-semibold text-sm rounded-xl flex items-center justify-center gap-2 border border-slate-700 transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Restart Run</span>
          </button>

          <button
            onClick={onHome}
            className="w-full py-2.5 px-4 bg-slate-800/60 hover:bg-slate-800 text-slate-300 font-display font-semibold text-sm rounded-xl flex items-center justify-center gap-2 border border-slate-700/50 transition-all cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Title Menu</span>
          </button>
        </div>

        {/* Sound Toggle */}
        <div className="mt-5 pt-4 border-t border-slate-800 w-full flex items-center justify-between text-xs font-mono text-slate-400">
          <span>Audio Effects</span>
          <button
            onClick={onToggleSound}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 rounded-lg text-slate-200 hover:text-white transition-colors"
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
            <span>{soundEnabled ? 'Enabled' : 'Muted'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
