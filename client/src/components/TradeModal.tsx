import { useState } from 'react';
import { GameState, Player, TradeOffer } from '../types/game';
import { BOARD_SPACES, GROUP_COLORS } from '../data/board';
import { socket } from '../socket';

interface Props {
  gameState: GameState;
  myId: string;
  onClose: () => void;
}

export default function TradeModal({ gameState, myId, onClose }: Props) {
  const me = gameState.players.find(p => p.id === myId)!;
  const others = gameState.players.filter(p => p.id !== myId && !p.bankrupt);

  const [targetId, setTargetId] = useState(others[0]?.id ?? '');
  const [offerProps, setOfferProps] = useState<number[]>([]);
  const [offerMoney, setOfferMoney] = useState(0);
  const [offerJail, setOfferJail] = useState(0);
  const [wantProps, setWantProps] = useState<number[]>([]);
  const [wantMoney, setWantMoney] = useState(0);
  const [wantJail, setWantJail] = useState(0);
  const [error, setError] = useState('');

  const target = gameState.players.find(p => p.id === targetId);

  const toggleProp = (list: number[], setList: (v: number[]) => void, idx: number) => {
    setList(list.includes(idx) ? list.filter(x => x !== idx) : [...list, idx]);
  };

  const submit = () => {
    if (!targetId) { setError('Select a player'); return; }
    setError('');
    socket.emit('propose_trade', {
      toId: targetId,
      offerProperties: offerProps,
      offerMoney,
      offerJailCards: offerJail,
      requestProperties: wantProps,
      requestMoney: wantMoney,
      requestJailCards: wantJail,
    }, (res: any) => {
      if (res.ok) onClose();
      else setError(res.error ?? 'Error');
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="trade-modal" onClick={e => e.stopPropagation()}>
        <div className="trade-header">
          <h2>🤝 Propose Trade</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Target player */}
        <div className="trade-section">
          <label className="trade-label">Trade with</label>
          <div className="trade-player-select">
            {others.map(p => (
              <button
                key={p.id}
                className={`trade-player-btn ${targetId === p.id ? 'active' : ''}`}
                style={{ borderColor: targetId === p.id ? p.color : undefined }}
                onClick={() => { setTargetId(p.id); setWantProps([]); setWantJail(0); }}
              >
                {p.token} {p.name}
              </button>
            ))}
          </div>
        </div>

        <div className="trade-columns">
          {/* Left — what YOU offer */}
          <div className="trade-col">
            <div className="trade-col-header" style={{ color: me.color }}>
              {me.token} You offer
            </div>

            <label className="trade-label">Properties</label>
            <PropList
              spaceIndices={me.properties}
              selected={offerProps}
              onToggle={idx => toggleProp(offerProps, setOfferProps, idx)}
              ownedProperties={gameState.ownedProperties}
            />

            <label className="trade-label">Cash</label>
            <MoneyInput value={offerMoney} max={me.money} onChange={setOfferMoney} />

            {me.getOutOfJailCards > 0 && (
              <>
                <label className="trade-label">Get Out of Jail cards (have {me.getOutOfJailCards})</label>
                <CountInput value={offerJail} max={me.getOutOfJailCards} onChange={setOfferJail} />
              </>
            )}
          </div>

          <div className="trade-divider">⇌</div>

          {/* Right — what YOU want */}
          <div className="trade-col">
            {target ? (
              <>
                <div className="trade-col-header" style={{ color: target.color }}>
                  {target.token} {target.name} gives
                </div>

                <label className="trade-label">Properties</label>
                <PropList
                  spaceIndices={target.properties}
                  selected={wantProps}
                  onToggle={idx => toggleProp(wantProps, setWantProps, idx)}
                  ownedProperties={gameState.ownedProperties}
                />

                <label className="trade-label">Cash</label>
                <MoneyInput value={wantMoney} max={target.money} onChange={setWantMoney} />

                {target.getOutOfJailCards > 0 && (
                  <>
                    <label className="trade-label">Get Out of Jail cards (they have {target.getOutOfJailCards})</label>
                    <CountInput value={wantJail} max={target.getOutOfJailCards} onChange={setWantJail} />
                  </>
                )}
              </>
            ) : (
              <div style={{ color: 'var(--text2)', fontSize: 13 }}>Select a player</div>
            )}
          </div>
        </div>

        {error && <div className="error-msg" style={{ padding: '0 0 8px' }}>{error}</div>}

        <div className="trade-footer">
          <button className="btn-action" onClick={onClose}>Cancel</button>
          <button className="btn-primary" style={{ width: 'auto', padding: '10px 24px' }} onClick={submit}>
            Send Offer →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Incoming trade modal (shown to the target player) ──
export function IncomingTradeModal({ gameState, myId }: { gameState: GameState; myId: string }) {
  const trade = gameState.pendingTrade!;
  if (trade.toId !== myId) {
    // Show a "waiting" notice to the proposer
    const from = gameState.players.find(p => p.id === trade.fromId);
    const to = gameState.players.find(p => p.id === trade.toId);
    return (
      <div className="modal-overlay" style={{ pointerEvents: 'none' }}>
        <div className="trade-waiting-banner">
          ⏳ Waiting for {to?.name} to respond to your trade offer…
          <button
            style={{ marginLeft: 16, pointerEvents: 'all' }}
            className="btn-action"
            onClick={() => socket.emit('decline_trade', { tradeId: trade.id })}
          >
            Cancel offer
          </button>
        </div>
      </div>
    );
  }

  const from = gameState.players.find(p => p.id === trade.fromId);
  const to = gameState.players.find(p => p.id === myId);

  const accept = () => socket.emit('accept_trade', { tradeId: trade.id });
  const decline = () => socket.emit('decline_trade', { tradeId: trade.id });

  return (
    <div className="modal-overlay">
      <div className="trade-modal">
        <div className="trade-header">
          <h2>🤝 Trade Offer from {from?.token} {from?.name}</h2>
        </div>

        <div className="trade-columns">
          <div className="trade-col">
            <div className="trade-col-header" style={{ color: from?.color }}>
              {from?.token} {from?.name} offers you
            </div>
            {trade.offerProperties.length === 0 && trade.offerMoney === 0 && trade.offerJailCards === 0 && (
              <div className="trade-nothing">Nothing</div>
            )}
            {trade.offerProperties.map(si => {
              const space = BOARD_SPACES[si];
              const color = space.group ? GROUP_COLORS[space.group] : '#888';
              return (
                <div key={si} className="trade-prop-item" style={{ borderColor: color }}>
                  {space.flag} {space.name}
                </div>
              );
            })}
            {trade.offerMoney > 0 && <div className="trade-money-item">💵 ${trade.offerMoney.toLocaleString()}</div>}
            {trade.offerJailCards > 0 && <div className="trade-money-item">🃏 ×{trade.offerJailCards} Jail card</div>}
          </div>

          <div className="trade-divider">⇌</div>

          <div className="trade-col">
            <div className="trade-col-header" style={{ color: to?.color }}>
              You give {from?.name}
            </div>
            {trade.requestProperties.length === 0 && trade.requestMoney === 0 && trade.requestJailCards === 0 && (
              <div className="trade-nothing">Nothing</div>
            )}
            {trade.requestProperties.map(si => {
              const space = BOARD_SPACES[si];
              const color = space.group ? GROUP_COLORS[space.group] : '#888';
              return (
                <div key={si} className="trade-prop-item" style={{ borderColor: color }}>
                  {space.flag} {space.name}
                </div>
              );
            })}
            {trade.requestMoney > 0 && <div className="trade-money-item">💵 ${trade.requestMoney.toLocaleString()}</div>}
            {trade.requestJailCards > 0 && <div className="trade-money-item">🃏 ×{trade.requestJailCards} Jail card</div>}
          </div>
        </div>

        <div className="trade-footer">
          <button className="btn-action btn-decline" onClick={decline}>✗ Decline</button>
          <button className="btn-primary btn-buy" style={{ width: 'auto', padding: '10px 24px' }} onClick={accept}>
            ✓ Accept
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──

function PropList({ spaceIndices, selected, onToggle, ownedProperties }: {
  spaceIndices: number[];
  selected: number[];
  onToggle: (idx: number) => void;
  ownedProperties: GameState['ownedProperties'];
}) {
  if (spaceIndices.length === 0) {
    return <div className="trade-nothing">No properties</div>;
  }
  return (
    <div className="trade-prop-list">
      {spaceIndices.map(si => {
        const space = BOARD_SPACES[si];
        const color = space.group ? GROUP_COLORS[space.group] : '#888';
        const owned = ownedProperties[si];
        const isSelected = selected.includes(si);
        return (
          <button
            key={si}
            className={`trade-prop-btn ${isSelected ? 'selected' : ''}`}
            style={{ borderColor: isSelected ? color : undefined, background: isSelected ? color + '22' : undefined }}
            onClick={() => onToggle(si)}
            title={owned?.mortgaged ? 'Mortgaged' : ''}
          >
            {space.flag} {space.name}
            {owned?.mortgaged && <span style={{ fontSize: 10, opacity: 0.6 }}> 📜</span>}
          </button>
        );
      })}
    </div>
  );
}

function MoneyInput({ value, max, onChange }: { value: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="trade-money-row">
      <input
        type="number"
        min={0}
        max={max}
        value={value}
        onChange={e => onChange(Math.min(max, Math.max(0, Number(e.target.value))))}
        className="input trade-number-input"
      />
      <span className="trade-max-hint">max ${max.toLocaleString()}</span>
    </div>
  );
}

function CountInput({ value, max, onChange }: { value: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="trade-money-row">
      {Array.from({ length: max + 1 }, (_, i) => (
        <button
          key={i}
          className={`trade-count-btn ${value === i ? 'selected' : ''}`}
          onClick={() => onChange(i)}
        >{i}</button>
      ))}
    </div>
  );
}
