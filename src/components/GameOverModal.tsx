import React from 'react';
import { RotateCcw, Trophy, Star, Zap, Home } from 'lucide-react';
import { GameStats } from '../game/types';

interface GameOverModalProps {
  stats: GameStats;
  onRestart: () => void;
  onHome: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  stats,
  onRestart,
  onHome,
}) => {
  const isNewHighScore = stats.score > 0 && stats.score >= stats.highScore;

  return (
    <div className="absolute inset-0 bg-slate-950/85 flex items-center justify-center p-4 z-20 pointer-events-auto select-none">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center">
        {/* Header */}
        <span className="text-xs font-mono font-bold tracking-widest text-red-400 uppercase mb-1">
          RUN COMPLETED
        </span>
        <h2 className="text-3xl font-extrabold font-display text-white tracking-tight mb-2">
          Game Over
        </h2>

        {/* Score Display */}
        <div className="my-3 flex flex-col items-center">
          <span className="text-5xl font-black font-display text-white tabular-nums drop-shadow-md">
            {stats.score}
          </span>
          <span className="text-xs font-mono text-slate-400 mt-1">FINAL SCORE</span>
        </div>

        {/* High Score Notification */}
        {isNewHighScore ? (
          <div className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-300 text-xs font-mono font-bold mb-4">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>NEW PERSONAL BEST!</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-4">
            <span>High Score:</span>
            <strong className="text-slate-200 tabular-nums">{stats.highScore}</strong>
          </div>
        )}

        {/* Performance Breakdown Grid */}
        <div className="w-full grid grid-cols-3 gap-2 py-3 px-3 bg-slate-800/60 border border-slate-700/40 rounded-xl text-left mb-6 font-mono text-xs">
          <div>
            <div className="text-slate-400 text-[10px]">DISTANCE</div>
            <div className="text-white font-bold tabular-nums text-sm">
              {Math.floor(stats.distanceMeters)}m
            </div>
          </div>
          <div>
            <div className="text-slate-400 text-[10px]">OBSTACLES</div>
            <div className="text-white font-bold tabular-nums text-sm">
              {stats.obstaclesCleared}
            </div>
          </div>
          <div>
            <div className="text-slate-400 text-[10px]">MAX COMBO</div>
            <div className="text-amber-400 font-bold tabular-nums text-sm flex items-center gap-1">
              <Zap className="w-3 h-3" />
              <span>{stats.maxCombo}x</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-2.5">
          <button
            onClick={onRestart}
            className="w-full py-3 px-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 active:from-red-700 active:to-rose-700 text-white font-display font-bold text-base rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 transition-all cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Play Again</span>
            <span className="hidden sm:inline text-xs font-mono px-1.5 py-0.5 bg-black/30 rounded text-white/90">
              SPACE
            </span>
          </button>

          <button
            onClick={onHome}
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-display font-semibold text-sm rounded-xl flex items-center justify-center gap-2 border border-slate-700 transition-all cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Title Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
};
