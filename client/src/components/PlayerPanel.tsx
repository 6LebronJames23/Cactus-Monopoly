import { GameState, BoardSpace } from '../types/game';
import Flag from './Flag';
import { BOARD_SPACES, GROUP_COLORS } from '../data/board';

interface Props {
  gameState: GameState;
  myId: string;
  onSelectSpace: (space: BoardSpace) => void;
}

export default function PlayerPanel({ gameState, myId, onSelectSpace }: Props) {
  const { players, ownedProperties, currentPlayerIndex } = gameState;

  return (
    <div className="player-panel">
      <h3 className="panel-title">Players</h3>
      {players.map((player, i) => {
        const isMe = player.id === myId;
        const isCurrent = i === currentPlayerIndex;
        const ownedSpaces = player.properties.map(si => BOARD_SPACES[si]);

        return (
          <div
            key={player.id}
            className={[
              'player-card',
              isCurrent ? 'player-card--active' : '',
              player.bankrupt ? 'player-card--bankrupt' : '',
              isMe ? 'player-card--me' : '',
            ].filter(Boolean).join(' ')}
            style={{ borderColor: player.color }}
          >
            <div className="pc-header">
              <span className="pc-token">{player.token}</span>
              <div className="pc-info">
                <span className="pc-name">{player.name}{isMe ? ' (you)' : ''}</span>
                <span className="pc-status">
                  {player.bankrupt ? '💀 Bankrupt' :
                   player.inJail ? '🔒 Jail' :
                   isCurrent ? '🎲 Playing' : ''}
                </span>
              </div>
              <span className="pc-money">${player.money.toLocaleString()}</span>
            </div>

            {player.getOutOfJailCards > 0 && (
              <div className="jail-card-badge">🃏 ×{player.getOutOfJailCards} Get out of Jail</div>
            )}

            {ownedSpaces.length > 0 && (
              <div className="pc-properties">
                {ownedSpaces.map(space => {
                  const owned = ownedProperties[space.index];
                  const color = space.group ? GROUP_COLORS[space.group] : '#888';
                  return (
                    <div
                      key={space.index}
                      className={`pc-prop ${owned?.mortgaged ? 'pc-prop--mortgaged' : ''}`}
                      style={{ borderColor: color }}
                      onClick={() => onSelectSpace(space)}
                      title={`${space.name}${owned?.houses ? ` (${owned.houses === 5 ? 'hotel' : owned.houses + ' houses'})` : ''}${owned?.mortgaged ? ' [mortgaged]' : ''}`}
                    >
                      <Flag emoji={space.flag ?? '🏙️'} size={18} className="pc-prop-flag" />
                      <span className="pc-prop-name">{space.name}</span>
                      {owned?.houses === 5 && <span className="pc-prop-hotel">🏨</span>}
                      {owned?.houses > 0 && owned.houses < 5 && (
                        <span className="pc-prop-houses">{'🏠'.repeat(owned.houses)}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
