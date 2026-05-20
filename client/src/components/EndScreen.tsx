import { useEffect, useRef, useState } from 'react';
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
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (history.length < 2) {
    return (
      <div style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>
        Not enough data — play a few more turns!
      </div>
    );
  }

  const W = 520, H = 280;
  const PAD = { top: 20, right: 24, bottom: 40, left: 60 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  // Include ALL players (bankrupt ones disappear from history naturally)
  const allValues = history.flatMap(h => Object.values(h.values));
  const minV = Math.max(0, Math.min(...allValues) * 0.85);
  const maxV = Math.max(...allValues) * 1.08;
  const turns = history.map(h => h.turn);
  const minT = turns[0], maxT = turns[turns.length - 1];

  const xScale = (t: number) =>
    maxT === minT ? PAD.left + chartW / 2 : PAD.left + ((t - minT) / (maxT - minT)) * chartW;
  const yScale = (v: number) =>
    PAD.top + chartH - ((v - minV) / (maxV - minV || 1)) * chartH;

  // Y-axis ticks
  const yTicks = 5;
  const rawStep = (maxV - minV) / yTicks;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const niceStep = Math.ceil(rawStep / magnitude) * magnitude;
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) => minV + i * niceStep);

  // X-axis ticks — at most 8, pick evenly spaced turns
  const xTickCount = Math.min(8, history.length);
  const xTickStep = Math.max(1, Math.floor((history.length - 1) / (xTickCount - 1)));
  const xTickIndices = Array.from({ length: xTickCount }, (_, i) =>
    Math.min(i * xTickStep, history.length - 1)
  );

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svgEl = svgRef.current;
    if (!svgEl || history.length === 0) return;
    const rect = svgEl.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0, bestDx = Infinity;
    history.forEach((h, i) => {
      const dx = Math.abs(xScale(h.turn) - mouseX);
      if (dx < bestDx) { bestDx = dx; best = i; }
    });
    setHoverIdx(best);
  };

  const hoverEntry = hoverIdx !== null ? history[hoverIdx] : null;

  // Build tooltip rows sorted by net worth descending
  const tooltipRows = hoverEntry
    ? players
        .filter(p => hoverEntry.values[p.name] !== undefined)
        .map(p => ({ player: p, worth: hoverEntry.values[p.name] }))
        .sort((a, b) => b.worth - a.worth)
    : [];

  // Position tooltip: flip left if too close to right edge
  const hoverX = hoverEntry ? xScale(hoverEntry.turn) : 0;
  const tooltipOnLeft = hoverX > W * 0.6;

  return (
    <div ref={wrapRef} className="nw-chart-wrap">
      {/* Legend */}
      <div className="nw-chart-legend">
        {players.map(p => (
          <div key={p.id} className="nw-legend-item">
            <span className="nw-legend-dot" style={{ background: p.color }} />
            <span className="nw-legend-name" style={{ color: p.color }}>
              {p.token} {p.name}
            </span>
            {p.bankrupt && <span className="nw-legend-bankrupt">💀</span>}
          </div>
        ))}
      </div>

      {/* Chart SVG */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="nw-chart-svg"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIdx(null)}
      >
        {/* Y grid + labels */}
        {yTickValues.map((v, i) => {
          const y = yScale(v);
          if (y < PAD.top - 4 || y > PAD.top + chartH + 4) return null;
          return (
            <g key={i}>
              <line
                x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
                stroke="rgba(255,255,255,0.07)" strokeWidth="1"
              />
              <text x={PAD.left - 8} y={y + 4} textAnchor="end" fill="rgba(255,255,255,0.4)" fontSize="10">
                {v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${Math.round(v)}`}
              </text>
            </g>
          );
        })}

        {/* X tick labels */}
        {xTickIndices.map(i => {
          const h = history[i];
          const x = xScale(h.turn);
          return (
            <text key={i} x={x} y={PAD.top + chartH + 16} textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="10">
              {h.turn}
            </text>
          );
        })}

        {/* X axis label */}
        <text
          x={PAD.left + chartW / 2} y={H - 4}
          textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize="9"
        >
          Turn
        </text>

        {/* Axes border */}
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + chartH}
          stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
        <line x1={PAD.left} y1={PAD.top + chartH} x2={W - PAD.right} y2={PAD.top + chartH}
          stroke="rgba(255,255,255,0.12)" strokeWidth="1" />

        {/* Lines per player */}
        {players.map(p => {
          const pts = history
            .filter(h => h.values[p.name] !== undefined)
            .map(h => `${xScale(h.turn).toFixed(1)},${yScale(h.values[p.name]).toFixed(1)}`)
            .join(' ');
          if (!pts) return null;
          return (
            <polyline
              key={p.id}
              points={pts}
              fill="none"
              stroke={p.color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={hoverIdx !== null ? 0.45 : 0.9}
              style={{ transition: 'opacity 0.1s' }}
            />
          );
        })}

        {/* Hover: vertical crosshair */}
        {hoverEntry && (
          <line
            x1={xScale(hoverEntry.turn)} y1={PAD.top}
            x2={xScale(hoverEntry.turn)} y2={PAD.top + chartH}
            stroke="rgba(255,255,255,0.35)" strokeWidth="1" strokeDasharray="3 3"
          />
        )}

        {/* Hover: bright lines */}
        {hoverIdx !== null && players.map(p => {
          const pts = history
            .filter(h => h.values[p.name] !== undefined)
            .map(h => `${xScale(h.turn).toFixed(1)},${yScale(h.values[p.name]).toFixed(1)}`)
            .join(' ');
          if (!pts) return null;
          return (
            <polyline
              key={`h-${p.id}`}
              points={pts}
              fill="none"
              stroke={p.color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.95"
              clipPath={`inset(0 ${W - xScale(hoverEntry!.turn)}px 0 0)`}
            />
          );
        })}

        {/* Hover: dots at crosshair intersection */}
        {hoverEntry && players.map(p => {
          const v = hoverEntry.values[p.name];
          if (v === undefined) return null;
          return (
            <circle
              key={`dot-${p.id}`}
              cx={xScale(hoverEntry.turn)}
              cy={yScale(v)}
              r="5"
              fill={p.color}
              stroke="#0d0f14"
              strokeWidth="2"
            />
          );
        })}

        {/* Hover tooltip (SVG foreignObject for rich HTML) */}
        {hoverEntry && tooltipRows.length > 0 && (() => {
          const tx = tooltipOnLeft
            ? xScale(hoverEntry.turn) - 12
            : xScale(hoverEntry.turn) + 12;
          const ty = PAD.top;
          const tooltipW = 160;
          const tooltipH = 26 + tooltipRows.length * 22;
          const fx = tooltipOnLeft ? tx - tooltipW : tx;
          return (
            <g>
              <rect
                x={fx} y={ty}
                width={tooltipW} height={tooltipH}
                rx="6" ry="6"
                fill="#1e2535" stroke="rgba(255,255,255,0.15)" strokeWidth="1"
              />
              {/* Turn label */}
              <text x={fx + tooltipW / 2} y={ty + 16} textAnchor="middle" fill="rgba(255,255,255,0.55)" fontSize="10" fontWeight="600">
                Turn {hoverEntry.turn}
              </text>
              {/* Player rows */}
              {tooltipRows.map(({ player, worth }, i) => (
                <g key={player.id}>
                  <text
                    x={fx + 10} y={ty + 32 + i * 22}
                    fill={player.color} fontSize="11" fontWeight="700"
                  >
                    {player.token} {player.name}
                  </text>
                  <text
                    x={fx + tooltipW - 10} y={ty + 32 + i * 22}
                    textAnchor="end" fill="rgba(255,255,255,0.85)" fontSize="11" fontWeight="800"
                  >
                    ${worth.toLocaleString()}
                  </text>
                </g>
              ))}
            </g>
          );
        })()}

        {/* End dots (last known value per player) */}
        {hoverIdx === null && players.map(p => {
          const last = [...history].reverse().find(h => h.values[p.name] !== undefined);
          if (!last) return null;
          return (
            <circle key={`end-${p.id}`}
              cx={xScale(last.turn)} cy={yScale(last.values[p.name])}
              r="4" fill={p.color} stroke="#0d0f14" strokeWidth="1.5"
            />
          );
        })}
      </svg>
    </div>
  );
}
