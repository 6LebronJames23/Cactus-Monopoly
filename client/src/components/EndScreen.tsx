import { useEffect, useState } from 'react';
import { GameState } from '../types/game';

interface Props {
  gameState: GameState;
  myId: string;
  onBack: () => void;
}

export default function EndScreen({ gameState, myId, onBack }: Props) {
  const winner = gameState.players.find(p => !p.bankrupt);
  const stats = gameState.gameStats;
  const [confetti, setConfetti] = useState<{ x: number; y: number; color: string; rot: number; size: number; dx: number; speed: number }[]>([]);

  useEffect(() => {
    const colors = ['#f59e0b','#3b82f6','#ec4899','#22c55e','#a855f7','#ef4444','#14b8a6','#f97316'];
    setConfetti(Array.from({ length: 60 }, () => ({
      x: Math.random() * 100,
      y: -10 - Math.random() * 20,
      color: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * 360,
      size: 6 + Math.random() * 8,
      dx: (Math.random() - 0.5) * 0.8,
      speed: 0.4 + Math.random() * 0.6,
    })));
  }, []);

  const duration = stats.startedAt
    ? (() => {
        const s = Math.floor((Date.now() - stats.startedAt) / 1000);
        if (s < 60) return `${s}s`;
        if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
        return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
      })()
    : '—';

  // Sort players by net worth for final standings
  // Use the last netWorthHistory entry if available, otherwise fall back to cash
  const lastHistory = stats.netWorthHistory[stats.netWorthHistory.length - 1];
  const standings = [...gameState.players].sort((a, b) => {
    if (!a.bankrupt && b.bankrupt) return -1;
    if (a.bankrupt && !b.bankrupt) return 1;
    const nwA = lastHistory?.values[a.name] ?? a.money;
    const nwB = lastHistory?.values[b.name] ?? b.money;
    return nwB - nwA;
  });

  return (
    <div className="end-screen">
      {/* Confetti */}
      <div className="end-confetti" aria-hidden>
        {confetti.map((c, i) => (
          <div
            key={i}
            className="end-confetti__piece"
            style={{
              left: `${c.x}%`,
              top: `${c.y}%`,
              background: c.color,
              width: c.size,
              height: c.size * 0.5,
              transform: `rotate(${c.rot}deg)`,
              animationDuration: `${3 / c.speed}s`,
              animationDelay: `${i * 0.04}s`,
            } as React.CSSProperties}
          />
        ))}
      </div>

      <div className="end-layout">
        {/* LEFT: Winner + Stats */}
        <div className="end-left">
          {/* Winner banner */}
          <div className="end-winner-card">
            <div className="end-trophy">🏆</div>
            <div className="end-winner-label">Winner</div>
            <div className="end-winner-name" style={{ color: winner?.color }}>
              <span className="end-winner-token">{winner?.token}</span>
              {winner?.name}
            </div>
          </div>

          {/* Stats */}
          <div className="end-stats-card">
            <StatRow icon="⏱️" label="Duration" value={duration} />
            <StatRow icon="🎲" label="Turns" value={String(stats.turnCount)} />
            <StatRow icon="🎯" label="Doubles" value={String(stats.totalDoubles)} />
            <StatRow icon="🤝" label="Trades" value={String(stats.totalTrades)} />
          </div>

          {/* Final standings */}
          <div className="end-standings-card">
            <div className="end-section-title">Final Standings</div>
            {standings.map((p, rank) => (
              <div key={p.id} className="end-standing-row" style={{ opacity: p.bankrupt ? 0.5 : 1 }}>
                <span className="end-standing-rank">{rank + 1}</span>
                <span style={{ color: p.color }}>{p.token}</span>
                <span className="end-standing-name">{p.name}{p.id === myId ? ' (you)' : ''}</span>
                <span className="end-standing-money">${p.money.toLocaleString()}</span>
                {p.bankrupt && <span className="end-bankrupt-badge">💀</span>}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: Net worth chart */}
        <div className="end-right">
          <div className="end-chart-card">
            <div className="end-section-title">Net Worth Over Time</div>
            <NetWorthChart history={stats.netWorthHistory} players={gameState.players} />
          </div>

          <button className="end-back-btn" onClick={onBack}>
            ✕ Back to Board
          </button>
        </div>
      </div>
    </div>
  );
}

function StatRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="end-stat-row">
      <span className="end-stat-icon">{icon}</span>
      <span className="end-stat-label">{label}</span>
      <span className="end-stat-value">{value}</span>
    </div>
  );
}

function NetWorthChart({
  history,
  players,
}: {
  history: { turn: number; values: Record<string, number> }[];
  players: GameState['players'];
}) {
  if (history.length < 2) {
    return (
      <div style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>
        Not enough data to show chart
      </div>
    );
  }

  const W = 480, H = 240, PAD = { top: 16, right: 16, bottom: 36, left: 56 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const activePlayers = players.filter(p => !p.bankrupt);
  const allValues = history.flatMap(h => Object.values(h.values));
  const minV = Math.min(...allValues) * 0.9;
  const maxV = Math.max(...allValues) * 1.05;
  const turns = history.map(h => h.turn);
  const minT = turns[0], maxT = turns[turns.length - 1];

  const xScale = (t: number) => maxT === minT ? PAD.left : PAD.left + ((t - minT) / (maxT - minT)) * chartW;
  const yScale = (v: number) => PAD.top + chartH - ((v - minV) / (maxV - minV)) * chartH;

  const yTicks = 5;
  const yStep = (maxV - minV) / yTicks;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
      {/* Grid lines */}
      {Array.from({ length: yTicks + 1 }, (_, i) => {
        const v = minV + i * yStep;
        const y = yScale(v);
        return (
          <g key={i}>
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
            <text x={PAD.left - 6} y={y + 4} textAnchor="end" fill="rgba(255,255,255,0.35)" fontSize="9">
              ${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : Math.round(v)}
            </text>
          </g>
        );
      })}

      {/* X axis label */}
      <text x={W / 2} y={H - 4} textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="9">Turn #</text>

      {/* Lines per player */}
      {activePlayers.map(p => {
        const points = history
          .filter(h => h.values[p.name] !== undefined)
          .map(h => `${xScale(h.turn)},${yScale(h.values[p.name])}`)
          .join(' ');
        if (!points) return null;
        return (
          <polyline
            key={p.id}
            points={points}
            fill="none"
            stroke={p.color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.9"
          />
        );
      })}

      {/* Dots at last data point */}
      {activePlayers.map(p => {
        const last = [...history].reverse().find(h => h.values[p.name] !== undefined);
        if (!last) return null;
        return (
          <circle
            key={p.id}
            cx={xScale(last.turn)}
            cy={yScale(last.values[p.name])}
            r="4"
            fill={p.color}
          />
        );
      })}
    </svg>
  );
}
