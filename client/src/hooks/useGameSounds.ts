import { useEffect, useRef } from 'react';
import * as S from '../utils/sounds';

export function useGameSounds(log: string[]) {
  const prevTopRef = useRef<string>('');

  useEffect(() => {
    if (!log.length) return;
    const top = log[0];
    if (top === prevTopRef.current) return;
    prevTopRef.current = top;

    if (top.includes('rolled'))                                    S.soundDiceRoll();
    else if (top.includes('passed GO'))                            S.soundPassGo();
    else if (top.includes('Jail') || top.includes('jail'))         S.soundJail();
    else if (top.includes('bought') && !top.includes('house') &&
             !top.includes('hotel') && !top.includes('auction'))   S.soundBuy();
    else if (top.includes('won the auction'))                       S.soundBuy();
    else if (top.includes('rent'))                                  S.soundRent();
    else if (top.includes('house') || top.includes('hotel'))       S.soundBuildHouse();
    else if (top.includes('card') || top.includes('Treasure') ||
             top.includes('Surprise') || top.includes('whisked'))  S.soundCard();
    else if (top.includes('wins'))                                  S.soundWin();
  }, [log]);
}
