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
}

export default function Board({ gameState, myId, visualPositions, isRolling, onSpaceClick }: Props) {
  const { players, ownedProperties } = gameState;

  const getPlayersAt = (index: number) =>
    players.filter(p => !p.bankrupt && (visualPositions[p.id] ?? p.position) === index);

  const getOwner = (index: number) =>
    players.find(p => p.id === ownedProperties[index]?.ownerId);

  const renderSpace = (index: number, side: 'bottom' | 'top' | 'left' | 'right', isCorner: boolean) => {
    const space = BOARD_SPACES[index];
    return (
      <BoardSpaceCell
        key={`${side}-${index}`}
        space={space}
        side={side}
        isCorner={index === 0 || index === 15 || index === 30 || index === 45}
        playersHere={getPlayersAt(index)}
        owner={getOwner(index)}
        owned={ownedProperties[index]}
        groupColor={space.group ? GROUP_COLORS[space.group] : undefined}
        onClick={() => onSpaceClick(space)}
      />
    );
  };

  // 60-space board: corners at 0, 15, 30, 45
  const bottomRow = Array.from({ length: 16 }, (_, i) => i);            // 0..15  left→right
  const rightCol  = Array.from({ length: 14 }, (_, i) => i + 16);       // 16..29 bottom→top
  const topRow    = Array.from({ length: 16 }, (_, i) => 30 + i);       // 30..45 right→left
  const leftCol   = Array.from({ length: 14 }, (_, i) => 46 + i);       // 46..59 top→bottom

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];

  return (
    <div className="board-wrap">
      <div className="board">

        {/* TOP ROW: 60 → 40 left→right */}
        <div className="board__row board__row--top">
          {[...topRow].reverse().map(i =>
            renderSpace(i, 'top', i === 30 || i === 45)
          )}
        </div>

        {/* MIDDLE */}
        <div className="board__middle">
          {/* LEFT COL: 61 → 79, top→bottom */}
          <div className="board__col board__col--left">
            {leftCol.map(i => renderSpace(i, 'left', false))}
          </div>

          {/* CENTER */}
          <div className="board__center">
            <div className="bc__globe">🌍</div>
            <div className="bc__title">MONOPOLY</div>
            <div className="bc__subtitle">WORLDWIDE</div>

            <div className="bc__dice-area">
              <DiceRoller dice={gameState.dice} isRolling={isRolling} />
            </div>

            {gameState.gamePhase === 'playing' && currentPlayer && (
              <div className="bc__turn" style={{ color: currentPlayer.color }}>
                <span className="bc__turn-token">{currentPlayer.token}</span>
                <span className="bc__turn-name">{currentPlayer.name}</span>
              </div>
            )}

            {gameState.gamePhase === 'ended' && (
              <div className="bc__winner">
                🏆 {gameState.players.find(p => !p.bankrupt)?.name} wins!
              </div>
            )}

            {/* Mini player legend */}
            <div className="bc__legend">
              {players.filter(p => !p.bankrupt).map(p => (
                <div key={p.id} className="bc__legend-item" title={`${p.name}: $${p.money}`}>
                  <span style={{ filter: `drop-shadow(0 0 3px ${p.color})` }}>{p.token}</span>
                  <span style={{ color: p.color, fontSize: 10 }}>${(p.money / 1000).toFixed(1)}k</span>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT COL: 39 → 21, top→bottom */}
          <div className="board__col board__col--right">
            {[...rightCol].reverse().map(i => renderSpace(i, 'right', false))}
          </div>
        </div>

        {/* BOTTOM ROW: 0 → 20 */}
        <div className="board__row board__row--bottom">
          {bottomRow.map(i => renderSpace(i, 'bottom', i === 0 || i === 15))}
        </div>

      </div>
    </div>
  );
}
