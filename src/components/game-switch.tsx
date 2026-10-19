'use client';
import { gameLabels } from '@/lib/catalog';
import { useApp } from './providers';
export function GameSwitch() {
  const { game, setGame } = useApp();
  return (
    <div className="game-switch" role="group" aria-label="Escolher jogo">
      {(['yugioh', 'pokemon'] as const).map((value) => (
        <button
          type="button"
          key={value}
          className={game === value ? 'active' : ''}
          aria-pressed={game === value}
          onClick={() => setGame(value)}
        >
          <span className={`game-dot game-${value}`} />
          {gameLabels[value]}
        </button>
      ))}
    </div>
  );
}
