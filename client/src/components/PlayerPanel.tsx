import React from 'react';
import { GameState, BoardSpace } from '../types/game';
import Flag from './Flag';
import { BOARD_SPACES, GROUP_COLORS } from '../data/board';

interface Props {
  gameState: GameState;
  myId: string;
  onSelectSpace: (space: BoardSpace) => void;
  actionsSlot?: React.ReactNode;
  recentLog?: string[];
}

function calcNetWorth(player: import('../types/game').Player, ownedProperties: GameState['ownedProperties']): number {
  let worth = player.money;
  for (const si of player.properties) {
    const space = BOARD_SPACES[si];
    const owned = ownedProperties[si];
    if (space.price) worth += space.price;
    if (space.houseCost && owned?.houses && owned.houses > 0) {
      worth += (owned.houses === 5 ? 1 : owned.houses) * space.houseCost;
    }
  }
  return worth;
}

export default function PlayerPanel({ gameState, myId, onSelectSpace, actionsSlot, recentLog }: Props) {
  const { players, ownedProperties, currentPlayerIndex, visitCounts, gamePhase } = gameState;
  const isPlaying = gamePhase === 'playing';

  const activePlayers = players.filter(p => !p.bankrupt);
  const netWorths = activePlayers.map(p => ({
    player: p,
    worth: calcNetWorth(p, ownedProperties),
  })).sort((a, b) => b.worth - a.worth);

  const topVisited = Object.entries(visitCounts ?? {})
    .map(([idx, count]) => ({ space: BOARD_SPACES[Number(idx)], count: count as number }))
    .filter(v => v.space)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <div className="player-panel-wrap">
      {/* Scrollable player cards */}
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

      {/* Actions + log + stats — pinned to bottom */}
      {isPlaying && (
        <div className="stats-section">
          {actionsSlot && <div className="side-actions">{actionsSlot}</div>}

          {recentLog && recentLog.length > 0 && (
            <div className="side-log">
              {recentLog.map((entry, i) => (
                <div key={i} className={`side-log-entry ${i === 0 ? 'side-log-entry--latest' : ''}`}>
                  {entry}
                </div>
              ))}
            </div>
          )}

          {/* Net Worth */}
          {netWorths.length > 0 && (
            <div className="stats-panel">
              <div className="stats-panel__title">💰 Net Worth</div>
              {netWorths.map(({ player, worth }, rank) => (
                <div key={player.id} className="stats-row">
                  <span className="stats-rank">#{rank + 1}</span>
                  <span className="stats-token">{player.token}</span>
                  <span className="stats-name" style={{ color: player.color }}>{player.name}</span>
                  <span className="stats-value">${worth.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}

          {/* Most Visited */}
          {topVisited.length > 0 && (
            <div className="stats-panel">
              <div className="stats-panel__title">📍 Most Visited</div>
              {topVisited.map(({ space, count }) => (
                <div key={space.index} className="stats-row">
                  <span className="stats-token">{space.flag ?? '🏙️'}</span>
                  <span className="stats-name">{space.name}</span>
                  <span className="stats-value stats-value--count">{count}×</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
