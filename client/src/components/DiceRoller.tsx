import { useState, useEffect, useRef } from 'react';

interface Props {
  dice: [number, number] | null;
  isRolling: boolean;
  onRoll?: () => void;
}

export default function DiceRoller({ dice, isRolling, onRoll }: Props) {
  const [displayA, setDisplayA] = useState(6);
  const [displayB, setDisplayB] = useState(5);
  const [settled, setSettled] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (isRolling) {
      setSettled(false);
      intervalRef.current = setInterval(() => {
        setDisplayA(Math.ceil(Math.random() * 6));
        setDisplayB(Math.ceil(Math.random() * 6));
      }, 70);
    } else {
      if (dice) {
        let ticks = 0;
        intervalRef.current = setInterval(() => {
          setDisplayA(Math.ceil(Math.random() * 6));
          setDisplayB(Math.ceil(Math.random() * 6));
          ticks++;
          if (ticks > 5) {
            clearInterval(intervalRef.current!);
            setDisplayA(dice[0]);
            setDisplayB(dice[1]);
            setSettled(true);
          }
        }, 55);
      }
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRolling, dice?.[0], dice?.[1]]);

  const isDoubles = dice && dice[0] === dice[1];

  return (
    <div
      className={`dice-roller ${isRolling ? 'rolling' : ''} ${settled ? 'settled' : ''} ${onRoll ? 'dice-roller--clickable' : ''}`}
      onClick={onRoll}
    >
      <Die value={displayA} rolling={isRolling} delay={0} />
      <Die value={displayB} rolling={isRolling} delay={50} />
      {settled && isDoubles && <span className="doubles-badge">DOUBLES!</span>}
    </div>
  );
}

// Dot positions for each face: array of [col, row] on a 3×3 grid (1-indexed)
const DOT_POSITIONS: Record<number, [number, number][]> = {
  1: [[2,2]],
  2: [[1,1],[3,3]],
  3: [[1,1],[2,2],[3,3]],
  4: [[1,1],[3,1],[1,3],[3,3]],
  5: [[1,1],[3,1],[2,2],[1,3],[3,3]],
  6: [[1,1],[3,1],[1,2],[3,2],[1,3],[3,3]],
};

function Die({ value, rolling, delay }: { value: number; rolling: boolean; delay: number }) {
  return (
    <div
      className={`die-face ${rolling ? 'die-rolling' : 'die-still'}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {(DOT_POSITIONS[value] ?? []).map(([c, r], i) => (
        <span
          key={i}
          className="die-dot"
          style={{ gridColumn: c, gridRow: r }}
        />
      ))}
    </div>
  );
}
