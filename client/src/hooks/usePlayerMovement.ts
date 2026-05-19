import { useState, useEffect, useRef } from 'react';
import { Player } from '../types/game';
import { soundStep } from '../utils/sounds';

const TOTAL_SPACES = 60;
const STEP_MS = 90; // ms per space moved
const JAIL_INDEX = 15;

export function usePlayerMovement(players: Player[]) {
  // Visual positions (what's rendered) may lag behind logical positions during animation
  const [visualPositions, setVisualPositions] = useState<Record<string, number>>(() =>
    Object.fromEntries(players.map(p => [p.id, p.position]))
  );
  const [movingPlayerId, setMovingPlayerId] = useState<string | null>(null);

  // Track the last logical position we started animating FROM
  const prevRef = useRef<Record<string, number>>(
    Object.fromEntries(players.map(p => [p.id, p.position]))
  );
  // Queue of pending animations so they don't stack
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    players.forEach(player => {
      const prev = prevRef.current[player.id] ?? player.position;
      const target = player.position;

      // Register new players immediately
      if (!(player.id in prevRef.current)) {
        prevRef.current[player.id] = target;
        setVisualPositions(v => ({ ...v, [player.id]: target }));
        return;
      }

      if (prev === target) return;

      // Update the reference NOW so repeated renders don't re-trigger
      prevRef.current[player.id] = target;

      // Jail teleport: go directly without stepping
      if (player.inJail && target === JAIL_INDEX) {
        setVisualPositions(v => ({ ...v, [player.id]: target }));
        return;
      }

      const dist = (target - prev + TOTAL_SPACES) % TOTAL_SPACES;
      if (dist === 0) return;

      const steps = Array.from({ length: dist }, (_, i) => (prev + i + 1) % TOTAL_SPACES);

      setMovingPlayerId(player.id);

      steps.forEach((pos, i) => {
        const t = setTimeout(() => {
          setVisualPositions(v => ({ ...v, [player.id]: pos }));
          soundStep();
          if (i === steps.length - 1) setMovingPlayerId(null);
        }, i * STEP_MS);
        timersRef.current.push(t);
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players.map(p => `${p.id}:${p.position}`).join('|')]);

  // Cleanup timers on unmount
  useEffect(() => () => { timersRef.current.forEach(clearTimeout); }, []);

  return { visualPositions, movingPlayerId };
}
