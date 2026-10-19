import React from 'react';
import { Play, Volume2, VolumeX, Music, Shield, Sparkles } from 'lucide-react';
import { SKINS } from '../game/skins';
import { PlayerSkin } from '../game/types';

interface TitleScreenProps {
  highScore: number;
  selectedSkinId: string;
  onSelectSkin: (skinId: string) => void;
  onStartGame: () => void;
  soundEnabled: boolean;
  musicEnabled: boolean;
  onToggleSound: () => void;
  onToggleMusic: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  highScore,
  selectedSkinId,
  onSelectSkin,
  onStartGame,
  soundEnabled,
  musicEnabled,
  onToggleSound,
  onToggleMusic,
}) => {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-between p-6 pointer-events-auto select-none">
      {/* Top Bar Status & Controls */}
      <div className="w-full max-w-4xl flex items-center justify-between text-xs tracking-wider">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/80 border border-slate-700/60 rounded-lg text-slate-300 font-mono">
          <span className="text-amber-400">BEST RECORD</span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="text-white font-bold tabular-nums text-sm">{highScore}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleSound}
            aria-label={soundEnabled ? 'Mute sound effects' : 'Unmute sound effects'}
            className="p-2 rounded-lg bg-slate-900/80 border border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>
          <button
            onClick={onToggleMusic}
            aria-label={musicEnabled ? 'Mute music' : 'Unmute music'}
            className="p-2 rounded-lg bg-slate-900/80 border border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <Music className={`w-4 h-4 ${musicEnabled ? 'text-cyan-400' : 'text-slate-500'}`} />
          </button>
        </div>
      </div>

      {/* Center Hero Title Lockup & Primary CTA */}
      <div className="flex flex-col items-center max-w-lg text-center my-auto">
        {/* Bespoke Inline SVG Title Lockup */}
        <div className="mb-4 drop-shadow-[0_8px_24px_rgba(239,68,68,0.35)]">
          <svg viewBox="0 0 460 110" className="w-72 sm:w-96 h-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="titleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="35%" stopColor="#f87171" />
                <stop offset="100%" stopColor="#ef4444" />
              </linearGradient>
              <linearGradient id="strokeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="50%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#38bdf8" />
              </linearGradient>
            </defs>
            {/* Speed trails */}
            <path d="M20 32 L110 32" stroke="url(#strokeGrad)" strokeWidth="4" strokeLinecap="round" opacity="0.8" />
            <path d="M45 44 L130 44" stroke="url(#strokeGrad)" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
            <path d="M310 92 L420 92" stroke="url(#strokeGrad)" strokeWidth="4" strokeLinecap="round" opacity="0.8" />
            <path d="M340 102 L435 102" stroke="url(#strokeGrad)" strokeWidth="3" strokeLinecap="round" opacity="0.5" />

            {/* Angular stylized text */}
            <text
              x="230"
              y="68"
              textAnchor="middle"
              fill="url(#titleGrad)"
              fontFamily="Outfit, sans-serif"
              fontWeight="900"
              fontSize="68"
              letterSpacing="3"
            >
              DASH LEAP
            </text>
            <text
              x="230"
              y="96"
              textAnchor="middle"
              fill="#94a3b8"
              fontFamily="JetBrains Mono, monospace"
              fontWeight="700"
              fontSize="14"
              letterSpacing="6"
            >
              2D ARCADE RUNNER
            </text>
          </svg>
        </div>

        {/* Primary Start Action */}
        <button
          onClick={onStartGame}
          className="group relative flex items-center justify-center gap-3 px-10 py-4 bg-gradient-to-r from-red-500 via-rose-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white font-display font-extrabold text-xl rounded-xl shadow-[0_6px_25px_rgba(239,68,68,0.5)] hover:shadow-[0_8px_32px_rgba(239,68,68,0.7)] hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
        >
          <Play className="w-6 h-6 fill-white" />
          <span>START RUN</span>
          <span className="hidden sm:inline text-xs font-mono px-2 py-0.5 bg-black/25 rounded text-white/90">
            SPACE
          </span>
        </button>

        {/* Skin Selector */}
        <div className="mt-6 flex flex-col items-center">
          <span className="text-xs text-slate-400 font-mono tracking-wider mb-2">CHOOSE RUNNER SKIN</span>
          <div className="flex items-center gap-2 p-1.5 bg-slate-900/80 border border-slate-800 rounded-xl">
            {SKINS.map((skin) => {
              const isLocked = highScore < skin.unlockScore;
              const isSelected = selectedSkinId === skin.id;

              return (
                <button
                  key={skin.id}
                  disabled={isLocked}
                  onClick={() => onSelectSkin(skin.id)}
                  title={isLocked ? `Score ${skin.unlockScore} to unlock` : skin.name}
                  className={`relative p-2 rounded-lg transition-all ${
                    isSelected
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-950 scale-110 shadow-lg'
                      : isLocked
                      ? 'opacity-35 cursor-not-allowed'
                      : 'hover:scale-105 opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: skin.accentColor }}
                >
                  <div
                    className="w-6 h-6 rounded flex items-center justify-end pr-0.5"
                    style={{ backgroundColor: skin.primaryColor }}
                  >
                    <div className="w-1.5 h-2 rounded-sm" style={{ backgroundColor: skin.eyeColor }} />
                  </div>
                  {isLocked && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg text-[9px] font-mono text-white">
                      🔒
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Flat Single Control Hint Line */}
      <div className="w-full max-w-2xl pb-2 text-center text-xs text-slate-300/80 font-mono tracking-wide">
        <span>Space / W / Up Jump</span>
        <span aria-hidden="true" className="mx-2 text-slate-600">·</span>
        <span>Down / S Duck</span>
        <span aria-hidden="true" className="mx-2 text-slate-600">·</span>
        <span>Esc Pause</span>
        <span aria-hidden="true" className="mx-2 text-slate-600">·</span>
        <span>M Mute</span>
      </div>
    </div>
  );
};
