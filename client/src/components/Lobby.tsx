import { useState } from 'react';
import { socket } from '../socket';
import { GameState } from '../types/game';
import SettingsPanel from './SettingsPanel';

const ALL_TOKENS = [
  '🚀','🚂','🎩','🐶','🦁','🐉','🚁','⚓','🎸',
  '🏎️','🦊','🐼','🎯','🌵','🦄','💎','🏆','🤖',
  '🎭','🍀','🦋','🐬','🦅','🎪','🧲','🪄','🦈',
];

interface Props {
  gameState: GameState;
  myId: string;
  roomId: string;
  onLeave: () => void;
}

export default function Lobby({ gameState, myId, roomId, onLeave }: Props) {
  const [copied, setCopied] = useState(false);
  const [showTokenPicker, setShowTokenPicker] = useState(false);

  const isHost = gameState.hostId === myId;
  const me = gameState.players.find(p => p.id === myId);
  const nonHostPlayers = gameState.players.filter(p => p.id !== gameState.hostId);
  const allReady = nonHostPlayers.length === 0 || nonHostPlayers.every(p => p.isReady);
  const notReadyNames = nonHostPlayers.filter(p => !p.isReady).map(p => p.name);

  const takenTokens = new Set(
    gameState.players.filter(p => p.id !== myId).map(p => p.token)
  );

  const copyCode = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleReady = () => {
    socket.emit('set_ready', { ready: !me?.isReady });
  };

  const kickPlayer = (targetId: string) => {
    socket.emit('kick_player', { targetId });
  };

  const startGame = () => {
    socket.emit('start_game', {}, (res: any) => {
      if (!res.ok) alert(res.error);
    });
  };

  const addBot = () => {
    socket.emit('add_bot', {}, (res: any) => {
      if (!res.ok) alert(res.error);
    });
  };

  const removeBot = (botId: string) => {
    socket.emit('remove_bot', { botId }, (res: any) => {
      if (!res.ok) alert(res.error);
    });
  };

  const pickToken = (token: string) => {
    if (takenTokens.has(token)) return;
    socket.emit('choose_token', { token }, (res: any) => {
      if (!res.ok) alert(res.error);
    });
    setShowTokenPicker(false);
  };

  return (
    <div className="lobby-screen">
      <div className="lobby-layout">
        {/* Left — players */}
        <div className="lobby-card lobby-card--players">
          <div className="lobby-header">
            <span style={{ fontSize: 40 }}>🌵</span>
            <div>
              <h2 style={{ margin: 0, fontSize: 20 }}>Cactus Monopoly</h2>
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
                {/* Token — clickable for own row */}
                {p.id === myId && !p.isBot ? (
                  <button
                    className="player-token-lg player-token-lg--pick"
                    onClick={() => setShowTokenPicker(v => !v)}
                    title="Change token"
                  >
                    {p.token}
                    <span className="token-pick-hint">✏️</span>
                  </button>
                ) : (
                  <span className="player-token-lg">{p.token}</span>
                )}
                <span className="player-name-lg">
                  {p.name}
                  {p.id === gameState.hostId && <span style={{ marginLeft: 6, fontSize: 13 }}>👑</span>}
                  {p.isBot && <span style={{ marginLeft: 6, fontSize: 13 }}>🤖</span>}
                  {p.id === myId && <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--accent)', fontWeight: 700 }}>YOU</span>}
                </span>
                <span className={`ready-badge ${p.isReady || p.id === gameState.hostId || p.isBot ? 'ready' : 'not-ready'}`}>
                  {p.id === gameState.hostId ? 'host' : p.isBot ? '🤖 Bot' : p.isReady ? '✓ Ready' : 'Not ready'}
                </span>
                {isHost && p.id !== myId && !p.isBot && (
                  <button className="btn-kick" onClick={() => kickPlayer(p.id)} title="Kick player">✕</button>
                )}
                {isHost && p.isBot && (
                  <button className="btn-kick" onClick={() => removeBot(p.id)} title="Remove bot">✕</button>
                )}
              </div>
            ))}
            {gameState.players.length < 9 && (
              <div className="player-row player-row--empty">
                <span style={{ color: 'var(--text3)', fontSize: 13 }}>Waiting for players…</span>
              </div>
            )}
          </div>

          {/* Token picker */}
          {showTokenPicker && (
            <div className="token-picker">
              <div className="token-picker__label">Choose your token</div>
              <div className="token-picker__grid">
                {ALL_TOKENS.map(tok => {
                  const isTaken = takenTokens.has(tok);
                  const isMine = me?.token === tok;
                  return (
                    <button
                      key={tok}
                      className={`token-option ${isMine ? 'token-option--active' : ''} ${isTaken ? 'token-option--taken' : ''}`}
                      onClick={() => pickToken(tok)}
                      disabled={isTaken}
                      title={isTaken ? 'Taken' : tok}
                    >
                      {tok}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

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
              <>
                {gameState.players.length < 9 && (
                  <button className="btn-secondary" onClick={addBot} style={{ marginRight: 8 }}>
                    🤖 Add Bot
                  </button>
                )}
                <button
                  className="btn-primary"
                  onClick={startGame}
                  disabled={gameState.players.length < 2 || !allReady}
                  title={!allReady ? `Waiting for: ${notReadyNames.join(', ')}` : ''}
                >
                  🎲 Start Game
                </button>
                {!allReady && gameState.players.length >= 2 && (
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6, textAlign: 'center' }}>
                    Waiting for {notReadyNames.join(', ')} to ready up
                  </div>
                )}
              </>
            )}
            <button className="btn-leave" onClick={onLeave}>
              ← Leave
            </button>
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
