import { useState, useEffect } from 'react';
import { socket } from './socket';
import { GameState } from './types/game';
import Lobby from './components/Lobby';
import Game from './components/Game';

type Screen = 'home' | 'lobby' | 'game';

const SESSION_KEY = 'mw_session';

function saveSession(roomId: string, playerName: string) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ roomId, playerName }));
}
function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}
function loadSession(): { roomId: string; playerName: string } | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [myId, setMyId] = useState('');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    socket.on('connect', () => {
      setMyId(socket.id!);

      // Auto-rejoin if there's a saved session
      const session = loadSession();
      if (session) {
        socket.emit('rejoin_room', session, (res: any) => {
          if (res.ok && res.state) {
            setRoomId(session.roomId);
            setGameState(res.state);
            setMyId(res.myId ?? socket.id!);
            setScreen(res.state.gamePhase === 'playing' ? 'game' : 'lobby');
          } else {
            // Room gone (server restart, game ended, etc.) — clear stale session
            clearSession();
          }
        });
      }
    });

    socket.on('game_state', (state: GameState) => {
      setGameState(state);
      if (state.gamePhase === 'playing' || state.gamePhase === 'ended') {
        setScreen('game');
      }
    });

    socket.on('kicked', () => {
      socket.disconnect();
      clearSession();
      setScreen('home');
      setGameState(null);
      setError('You were kicked from the room.');
    });

    // If there's a saved session, connect immediately so the handler above can rejoin
    if (loadSession()) {
      socket.connect();
    }

    return () => {
      socket.off('connect');
      socket.off('game_state');
      socket.off('kicked');
    };
  }, []);

  const handleCreate = (name: string) => {
    setPlayerName(name);
    // Clear old session so the connect handler doesn't try to rejoin a stale game
    clearSession();
    const doCreate = () => {
      socket.emit('create_room', { name }, (res: any) => {
        if (res.ok) {
          setRoomId(res.roomId);
          setGameState(res.state);
          setScreen('lobby');
          saveSession(res.roomId, name);
        } else {
          setError(res.error);
        }
      });
    };
    if (socket.connected) {
      doCreate();
    } else {
      socket.connect();
      socket.once('connect', doCreate);
    }
  };

  const handleJoin = (name: string, room: string) => {
    setPlayerName(name);
    // Clear old session so the connect handler doesn't try to rejoin a stale game
    clearSession();
    const doJoin = () => {
      socket.emit('join_room', { name, roomId: room.toUpperCase() }, (res: any) => {
        if (res.ok) {
          setRoomId(room.toUpperCase());
          setGameState(res.state);
          setScreen('lobby');
          saveSession(room.toUpperCase(), name);
        } else {
          setError(res.error);
          socket.disconnect();
        }
      });
    };
    if (socket.connected) {
      doJoin();
    } else {
      socket.connect();
      socket.once('connect', doJoin);
    }
  };

  const handleLeave = () => {
    socket.disconnect();
    clearSession();
    setScreen('home');
    setGameState(null);
    setMyId('');
    setError('');
  };

  if (screen === 'home') {
    return <HomeScreen onCreate={handleCreate} onJoin={handleJoin} error={error} setError={setError} />;
  }
  if (screen === 'lobby' && gameState) {
    return <Lobby gameState={gameState} myId={myId} roomId={roomId} onLeave={handleLeave} />;
  }
  if (screen === 'game' && gameState) {
    return <Game gameState={gameState} myId={myId} onLeave={handleLeave} />;
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

  // Pre-fill name from saved session
  useEffect(() => {
    const session = loadSession();
    if (session?.playerName) setName(session.playerName);
  }, []);

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
        <div className="home-logo">
          <div className="home-logo-cactus">🌵</div>
          <div className="home-logo-coins">🪙🪙🪙</div>
        </div>
        <h1 className="home-title">Cactus Monopoly</h1>
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
