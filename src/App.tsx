/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './game/engine';
import { GameState, GameStats } from './game/types';
import { soundEngine } from './game/sound';
import { TitleScreen } from './components/TitleScreen';
import { GameHUD } from './components/GameHUD';
import { PauseModal } from './components/PauseModal';
import { GameOverModal } from './components/GameOverModal';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [gameState, setGameState] = useState<GameState>('TITLE');
  const [stats, setStats] = useState<GameStats>({
    score: 0,
    highScore: 0,
    distanceMeters: 0,
    coins: 0,
    combo: 1,
    maxCombo: 1,
    obstaclesCleared: 0,
    speed: 6.2,
    hasShield: false,
    canDoubleJump: false,
  });

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => soundEngine.getSoundEnabled());
  const [musicEnabled, setMusicEnabled] = useState<boolean>(() => soundEngine.getMusicEnabled());
  const [selectedSkinId, setSelectedSkinId] = useState<string>('classic_red');

  // Throttled HUD update ref to keep React render load ultra light
  const lastHudUpdateRef = useRef<number>(0);

  // Initialize Game Engine on mount
  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new GameEngine(canvasRef.current);
    engineRef.current = engine;

    // Load initial high score
    setStats(prev => ({ ...prev, highScore: engine.stats.highScore }));

    // Listen to state changes
    engine.onStateChange = (nextState: GameState) => {
      setGameState(nextState);
    };

    // Listen to stats updates (throttled for 60fps canvas isolation)
    engine.onStatsUpdate = (newStats: GameStats) => {
      const now = performance.now();
      if (now - lastHudUpdateRef.current > 66) { // ~15Hz UI sync is silky smooth and leaves main thread completely free
        lastHudUpdateRef.current = now;
        setStats(newStats);
      }
    };

    // Start background loop
    engine.startLoop();

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  // Sync skin selection
  const handleSelectSkin = useCallback((skinId: string) => {
    setSelectedSkinId(skinId);
    if (engineRef.current) {
      engineRef.current.setSkin(skinId);
      soundEngine.playClick();
    }
  }, []);

  const handleStartGame = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.startGame();
    }
  }, []);

  const handlePause = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.pauseGame();
    }
  }, []);

  const handleResume = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.resumeGame();
    }
  }, []);

  const handleRestart = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.restartGame();
    }
  }, []);

  const handleHome = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.returnToTitle();
    }
  }, []);

  const handleToggleSound = useCallback(() => {
    const nextVal = !soundEnabled;
    soundEngine.setSoundEnabled(nextVal);
    setSoundEnabled(nextVal);
  }, [soundEnabled]);

  const handleToggleMusic = useCallback(() => {
    const nextVal = !musicEnabled;
    soundEngine.setMusicEnabled(nextVal);
    setMusicEnabled(nextVal);
  }, [musicEnabled]);

  // Touch handlers for mobile
  const handleJumpStart = useCallback(() => {
    if (engineRef.current) engineRef.current.triggerJumpPress();
  }, []);

  const handleJumpEnd = useCallback(() => {
    if (engineRef.current) engineRef.current.triggerJumpRelease();
  }, []);

  const handleDuckStart = useCallback(() => {
    if (engineRef.current) engineRef.current.triggerDuckPress();
  }, []);

  const handleDuckEnd = useCallback(() => {
    if (engineRef.current) engineRef.current.triggerDuckRelease();
  }, []);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-950 flex items-center justify-center select-none">
      {/* Isolated High-DPI 60fps Game Canvas */}
      <div className="relative w-full h-full flex items-center justify-center">
        <canvas
          ref={canvasRef}
          className="block w-full h-full cursor-pointer touch-none"
          onClick={() => {
            if (gameState === 'TITLE') {
              handleStartGame();
            } else if (gameState === 'PLAYING') {
              handleJumpStart();
              setTimeout(handleJumpEnd, 120);
            }
          }}
        />

        {/* State Machine Overlays */}
        {gameState === 'TITLE' && (
          <TitleScreen
            highScore={stats.highScore}
            selectedSkinId={selectedSkinId}
            onSelectSkin={handleSelectSkin}
            onStartGame={handleStartGame}
            soundEnabled={soundEnabled}
            musicEnabled={musicEnabled}
            onToggleSound={handleToggleSound}
            onToggleMusic={handleToggleMusic}
          />
        )}

        {gameState === 'PLAYING' && (
          <GameHUD
            stats={stats}
            onPause={handlePause}
            soundEnabled={soundEnabled}
            onToggleSound={handleToggleSound}
            onJumpStart={handleJumpStart}
            onJumpEnd={handleJumpEnd}
            onDuckStart={handleDuckStart}
            onDuckEnd={handleDuckEnd}
          />
        )}

        {gameState === 'PAUSED' && (
          <PauseModal
            onResume={handleResume}
            onRestart={handleRestart}
            onHome={handleHome}
            soundEnabled={soundEnabled}
            onToggleSound={handleToggleSound}
          />
        )}

        {gameState === 'GAME_OVER' && (
          <GameOverModal
            stats={stats}
            onRestart={handleRestart}
            onHome={handleHome}
          />
        )}
      </div>
    </main>
  );
}
