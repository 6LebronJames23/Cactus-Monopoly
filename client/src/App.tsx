import { useState, useEffect } from 'react';
import { socket } from './socket';
import { GameState } from './types/game';
import Lobby from './components/Lobby';
import Game from './components/Game';

type Screen = 'home' | 'lobby' | 'game';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [myId, setMyId] = useState('');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    socket.on('connect', () => setMyId(socket.id!));
    socket.on('game_state', (state: GameState) => {
      setGameState(state);
      if (state.gamePhase === 'playing' || state.gamePhase === 'ended') {
        setScreen('game');
      }
    });
    return () => { socket.off('connect'); socket.off('game_state'); };
  }, []);

  const handleCreate = (name: string) => {
    setPlayerName(name);
    socket.connect();
    socket.once('connect', () => {
      socket.emit('create_room', { name }, (res: any) => {
        if (res.ok) {
          setRoomId(res.roomId);
          setGameState(res.state);
          setScreen('lobby');
        } else {
          setError(res.error);
        }
      });
    });
  };

  const handleJoin = (name: string, room: string) => {
    setPlayerName(name);
    socket.connect();
    socket.once('connect', () => {
      socket.emit('join_room', { name, roomId: room.toUpperCase() }, (res: any) => {
        if (res.ok) {
          setRoomId(room.toUpperCase());
          setGameState(res.state);
          setScreen('lobby');
        } else {
          setError(res.error);
          socket.disconnect();
        }
      });
    });
  };

  if (screen === 'home') {
    return <HomeScreen onCreate={handleCreate} onJoin={handleJoin} error={error} setError={setError} />;
  }
  if (screen === 'lobby' && gameState) {
    return <Lobby gameState={gameState} myId={myId} roomId={roomId} />;
  }
  if (screen === 'game' && gameState) {
    return <Game gameState={gameState} myId={myId} />;
  }
  return null;
}

function HomeScreen({ onCreate, onJoin, error, setError }: {
  onCreate: (name: string) => void;
  onJoin: (name: string, room: string) => void;
  error: string;
  setError: (e: string) => void;
}) {
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [tab, setTab] = useState<'create' | 'join'>('create');

  const submit = () => {
    if (!name.trim()) { setError('Enter your name'); return; }
    setError('');
    if (tab === 'create') onCreate(name.trim());
    else {
      if (!joinCode.trim()) { setError('Enter a room code'); return; }
      onJoin(name.trim(), joinCode.trim());
    }
  };

  return (
    <div className="home-screen">
      <div className="home-card">
        <div className="home-logo">🌍</div>
        <h1 className="home-title">Monopoly Worldwide</h1>
        <p className="home-sub">60 cities · 10 country groups · Up to 9 players</p>

        <div className="tab-row">
          <button className={`tab-btn ${tab === 'create' ? 'active' : ''}`} onClick={() => setTab('create')}>Create Room</button>
          <button className={`tab-btn ${tab === 'join' ? 'active' : ''}`} onClick={() => setTab('join')}>Join Room</button>
        </div>

        <input
          className="input"
          placeholder="Your name"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          maxLength={20}
        />

        {tab === 'join' && (
          <input
            className="input"
            placeholder="Room code (e.g. AB3X7)"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && submit()}
            maxLength={5}
            style={{ letterSpacing: '0.2em', textTransform: 'uppercase' }}
          />
        )}

        {error && <div className="error-msg">{error}</div>}

        <button className="btn-primary" onClick={submit}>
          {tab === 'create' ? '🚀 Create Game' : '🔑 Join Game'}
        </button>
      </div>
    </div>
  );
}
