import { useState, useEffect, useRef } from 'react';

const FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

interface Props {
  dice: [number, number] | null;
  isRolling: boolean;
}

export default function DiceRoller({ dice, isRolling }: Props) {
  const [displayA, setDisplayA] = useState('⚅');
  const [displayB, setDisplayB] = useState('⚄');
  const [settled, setSettled] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isRolling) {
      setSettled(false);
      // Spin rapidly
      intervalRef.current = setInterval(() => {
        setDisplayA(FACES[Math.floor(Math.random() * 6)]);
        setDisplayB(FACES[Math.floor(Math.random() * 6)]);
      }, 80);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (dice) {
        // Brief extra spin then settle
        let ticks = 0;
        const spin = setInterval(() => {
          setDisplayA(FACES[Math.floor(Math.random() * 6)]);
          setDisplayB(FACES[Math.floor(Math.random() * 6)]);
          ticks++;
          if (ticks > 6) {
            clearInterval(spin);
            setDisplayA(FACES[dice[0] - 1]);
            setDisplayB(FACES[dice[1] - 1]);
            setSettled(true);
          }
        }, 60);
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isRolling, dice?.[0], dice?.[1]]);

  const isDoubles = dice && dice[0] === dice[1];

  return (
    <div className={`dice-roller ${isRolling ? 'rolling' : ''} ${settled ? 'settled' : ''}`}>
      <Die face={displayA} rolling={isRolling} delay={0} />
      <Die face={displayB} rolling={isRolling} delay={40} />
      {settled && isDoubles && (
        <span className="doubles-badge">DOUBLES!</span>
      )}
    </div>
  );
}

function Die({ face, rolling, delay }: { face: string; rolling: boolean; delay: number }) {
  return (
    <div
      className={`die-face ${rolling ? 'die-rolling' : 'die-still'}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {face}
    </div>
  );
}
