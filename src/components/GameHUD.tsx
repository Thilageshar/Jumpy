import React from 'react';
import { Pause, Star, Shield, ArrowUpCircle, Volume2, VolumeX, Flame } from 'lucide-react';
import { GameStats } from '../game/types';

interface GameHUDProps {
  stats: GameStats;
  onPause: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onJumpStart: () => void;
  onJumpEnd: () => void;
  onDuckStart: () => void;
  onDuckEnd: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  stats,
  onPause,
  soundEnabled,
  onToggleSound,
  onJumpStart,
  onJumpEnd,
  onDuckStart,
  onDuckEnd,
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none select-none flex flex-col justify-between p-4 sm:p-6">
      {/* Top Perimeter Status Cluster */}
      <div className="flex items-start justify-between w-full">
        {/* Left: Score & Distance */}
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold font-display text-white tabular-nums drop-shadow-md">
              {stats.score}
            </span>
            <span className="text-xs font-mono uppercase tracking-wider text-slate-300">
              PTS
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
            <span>BEST: <strong className="text-amber-400 tabular-nums">{stats.highScore}</strong></span>
            <span aria-hidden="true" className="text-slate-500">·</span>
            <span>{Math.floor(stats.distanceMeters)}m</span>
          </div>
        </div>

        {/* Center: Combo Multiplier / Status if active */}
        {stats.combo > 1 && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/90 text-slate-950 font-display font-black text-sm rounded-lg shadow-lg animate-bounce">
            <Flame className="w-4 h-4 fill-slate-950" />
            <span>{stats.combo}x COMBO!</span>
          </div>
        )}

        {/* Right: Coins, Powerups, and Actions */}
        <div className="flex items-center gap-2 sm:gap-3 pointer-events-auto">
          {/* Active Buffs */}
          <div className="flex items-center gap-1.5 mr-1">
            {stats.hasShield && (
              <div title="Energy Shield Active" className="flex items-center gap-1 px-2 py-1 bg-sky-500/80 text-white rounded-md text-xs font-mono font-bold animate-pulse">
                <Shield className="w-3.5 h-3.5 fill-white" />
                <span className="hidden sm:inline">SHIELD</span>
              </div>
            )}
            {stats.canDoubleJump && (
              <div title="Double Jump Ready" className="flex items-center gap-1 px-2 py-1 bg-purple-500/80 text-white rounded-md text-xs font-mono font-bold">
                <ArrowUpCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">AIR JUMP</span>
              </div>
            )}
          </div>

          {/* Star Counter */}
          <div className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-900/85 border border-slate-700/60 rounded-lg text-amber-300 font-mono text-xs font-bold shadow-sm">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span className="tabular-nums">{stats.coins}</span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            aria-label={soundEnabled ? 'Mute' : 'Unmute'}
            className="p-2 bg-slate-900/85 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          {/* Pause Button */}
          <button
            onClick={onPause}
            aria-label="Pause game"
            className="p-2 bg-slate-900/85 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile Touch Controls Overlay (visible on touch / small screens, quiet & translucent) */}
      <div className="flex items-center justify-between w-full pointer-events-auto sm:hidden pb-2">
        <button
          onTouchStart={(e) => { e.preventDefault(); onDuckStart(); }}
          onTouchEnd={(e) => { e.preventDefault(); onDuckEnd(); }}
          onMouseDown={onDuckStart}
          onMouseUp={onDuckEnd}
          className="w-20 h-20 rounded-2xl bg-slate-900/40 active:bg-slate-900/80 border border-white/20 text-white font-mono font-bold text-xs flex flex-col items-center justify-center gap-1 select-none active:scale-95 transition-transform"
        >
          <span>▼</span>
          <span>DUCK</span>
        </button>

        <button
          onTouchStart={(e) => { e.preventDefault(); onJumpStart(); }}
          onTouchEnd={(e) => { e.preventDefault(); onJumpEnd(); }}
          onMouseDown={onJumpStart}
          onMouseUp={onJumpEnd}
          className="w-24 h-24 rounded-2xl bg-red-600/50 active:bg-red-600/90 border border-white/30 text-white font-mono font-bold text-sm flex flex-col items-center justify-center gap-1 select-none active:scale-95 transition-transform shadow-lg"
        >
          <span>▲</span>
          <span>JUMP</span>
        </button>
      </div>
    </div>
  );
};
