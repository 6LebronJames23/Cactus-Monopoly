import { useState } from 'react';
import { socket } from '../socket';
import { GameState } from '../types/game';
import SettingsPanel from './SettingsPanel';

interface Props {
  gameState: GameState;
  myId: string;
  roomId: string;
}

export default function Lobby({ gameState, myId, roomId }: Props) {
  const [copied, setCopied] = useState(false);
  const isHost = gameState.hostId === myId;
  const me = gameState.players.find(p => p.id === myId);

  const copyCode = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleReady = () => {
    socket.emit('set_ready', { ready: !me?.isReady });
  };

  const startGame = () => {
    socket.emit('start_game', {}, (res: any) => {
      if (!res.ok) alert(res.error);
    });
  };

  return (
    <div className="lobby-screen">
      <div className="lobby-layout">
        {/* Left — players */}
        <div className="lobby-card lobby-card--players">
          <div className="lobby-header">
            <span style={{ fontSize: 40 }}>🌍</span>
            <div>
              <h2 style={{ margin: 0, fontSize: 20 }}>Monopoly Worldwide</h2>
              <p style={{ margin: 0, opacity: 0.5, fontSize: 13 }}>Waiting for players…</p>
            </div>
          </div>

          <div className="room-code-box">
            <div>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Room Code</div>
              <div className="room-code">{roomId}</div>
            </div>
            <button className="btn-copy" onClick={copyCode}>{copied ? '✓ Copied!' : '📋 Copy'}</button>
          </div>

          <div className="player-list">
            {gameState.players.map(p => (
              <div key={p.id} className="player-row" style={{ borderLeftColor: p.color }}>
                <span className="player-token-lg">{p.token}</span>
                <span className="player-name-lg">
                  {p.name}
                  {p.id === gameState.hostId && <span style={{ marginLeft: 6, fontSize: 13 }}>👑</span>}
                  {p.id === myId && <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--accent)', fontWeight: 700 }}>YOU</span>}
                </span>
                <span className={`ready-badge ${p.isReady || p.id === gameState.hostId ? 'ready' : 'not-ready'}`}>
                  {p.id === gameState.hostId ? 'host' : p.isReady ? '✓ Ready' : 'Not ready'}
                </span>
              </div>
            ))}
            {gameState.players.length < 9 && (
              <div className="player-row player-row--empty">
                <span style={{ color: 'var(--text3)', fontSize: 13 }}>Waiting for players…</span>
              </div>
            )}
          </div>

          <div className="lobby-actions">
            {!isHost && (
              <button
                className={`btn-primary ${me?.isReady ? 'btn-secondary' : ''}`}
                onClick={toggleReady}
              >
                {me?.isReady ? '✗ Not Ready' : '✓ Ready Up'}
              </button>
            )}
            {isHost && (
              <button
                className="btn-primary"
                onClick={startGame}
                disabled={gameState.players.length < 2}
              >
                🎲 Start Game
              </button>
            )}
          </div>
        </div>

        {/* Right — settings */}
        <div className="lobby-card lobby-card--settings">
          <div className="lobby-settings-header">
            ⚙️ Game Settings
            {!isHost && <span style={{ fontSize: 12, color: 'var(--text3)', marginLeft: 8 }}>Only the host can change settings</span>}
          </div>
          <SettingsPanel settings={gameState.settings} isHost={isHost} />
        </div>
      </div>
    </div>
  );
}
