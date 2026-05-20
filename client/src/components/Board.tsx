import { GameState, BoardSpace } from '../types/game';
import { BOARD_SPACES, GROUP_COLORS } from '../data/board';
import BoardSpaceCell from './BoardSpaceCell';
import DiceRoller from './DiceRoller';

interface Props {
  gameState: GameState;
  myId: string;
  visualPositions: Record<string, number>;
  isRolling: boolean;
  onSpaceClick: (space: BoardSpace) => void;
  onRoll?: () => void;
  actionsSlot?: React.ReactNode;
  recentLog?: string[];
}

export default function Board({ gameState, myId, visualPositions, isRolling, onSpaceClick, onRoll, actionsSlot, recentLog }: Props) {
  const { players, ownedProperties } = gameState;

  const getPlayersAt = (index: number) =>
    players.filter(p => !p.bankrupt && (visualPositions[p.id] ?? p.position) === index);

  const getOwner = (index: number) =>
    players.find(p => p.id === ownedProperties[index]?.ownerId);

  const renderSpace = (index: number, side: 'bottom' | 'top' | 'left' | 'right', isCorner: boolean) => {
    const base = BOARD_SPACES[index];
    const override = gameState.boardOverrides?.[index];
    const space = override ? { ...base, ...override } : base;
    const isCornerSpace = index === 0 || index === 15 || index === 30 || index === 45;
    return (
      <BoardSpaceCell
        key={`${side}-${index}`}
        space={space}
        side={side}
        isCorner={isCornerSpace}
        playersHere={getPlayersAt(index)}
        owner={getOwner(index)}
        owned={ownedProperties[index]}
        groupColor={space.group ? GROUP_COLORS[space.group] : undefined}
        vacationPot={isCornerSpace && index === 30 ? gameState.vacationPot : undefined}
        onClick={() => onSpaceClick(space)}
      />
    );
  };

  // 60-space board: corners at 0, 15, 30, 45
  const bottomRow = Array.from({ length: 16 }, (_, i) => i);            // 0..15  left→right
  const rightCol  = Array.from({ length: 14 }, (_, i) => i + 16);       // 16..29 bottom→top
  const topRow    = Array.from({ length: 16 }, (_, i) => 30 + i);       // 30..45 right→left
  const leftCol   = Array.from({ length: 14 }, (_, i) => 46 + i);       // 46..59 top→bottom

  return (
    <div className="board-wrap">
      <div className="board">

        {/* TOP ROW */}
        <div className="board__row board__row--top">
          {[...topRow].reverse().map(i =>
            renderSpace(i, 'top', i === 30 || i === 45)
          )}
        </div>

        {/* MIDDLE */}
        <div className="board__middle">
          <div className="board__col board__col--left">
            {leftCol.map(i => renderSpace(i, 'left', false))}
          </div>

          {/* CENTER */}
          <div className="board__center">
            <div className="bc__brand">
              <div className="bc__globe">🌵</div>
              <div className="bc__title">CACTUS</div>
              <div className="bc__subtitle">MONOPOLY</div>
            </div>

            <div className="bc__dice-area">
              <DiceRoller dice={gameState.dice} isRolling={isRolling} onRoll={onRoll} />
            </div>

            {actionsSlot && (
              <div className="bc__actions">{actionsSlot}</div>
            )}

            {recentLog && recentLog.length > 0 && (
              <div className="bc__log">
                {recentLog.slice(0, 4).map((entry, i) => (
                  <div key={i} className={`bc__log-entry ${i === 0 ? 'bc__log-entry--latest' : ''}`}>
                    {entry}
                  </div>
                ))}
              </div>
            )}

            <div className="bc__legend">
              {players.filter(p => !p.bankrupt).map(p => (
                <div key={p.id} className="bc__legend-item" title={`${p.name}: $${p.money}`}>
                  <span style={{ filter: `drop-shadow(0 0 3px ${p.color})` }}>{p.token}</span>
                  <span style={{ color: p.color, fontSize: 10 }}>${(p.money / 1000).toFixed(1)}k</span>
                </div>
              ))}
            </div>
          </div>

          <div className="board__col board__col--right">
            {[...rightCol].reverse().map(i => renderSpace(i, 'right', false))}
          </div>
        </div>

        {/* BOTTOM ROW */}
        <div className="board__row board__row--bottom">
          {bottomRow.map(i => renderSpace(i, 'bottom', i === 0 || i === 15))}
        </div>

      </div>
    </div>
  );
}
