import { useState, useEffect } from 'react';
import { GameState, TradeOffer } from '../types/game';
import { BOARD_SPACES, GROUP_COLORS } from '../data/board';
import { socket } from '../socket';

// ── Propose trade (inline panel or modal) ───────────────────────────────────

interface ProposeProps {
  gameState: GameState;
  myId: string;
  onClose: () => void;
  inline?: boolean;
}

export default function TradeModal({ gameState, myId, onClose, inline }: ProposeProps) {
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

  const body = (
    <>
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
    </>
  );

  if (inline) {
    return (
      <div className="trade-inline">
        <div className="trade-header">
          <h2>🤝 Propose Trade</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {body}
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="trade-modal" onClick={e => e.stopPropagation()}>
        <div className="trade-header">
          <h2>🤝 Propose Trade</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {body}
      </div>
    </div>
  );
}

// ── Incoming / waiting trade view ────────────────────────────────────────────

export function IncomingTradeModal({
  gameState, myId, inline,
}: {
  gameState: GameState;
  myId: string;
  inline?: boolean;
}) {
  const trade = gameState.pendingTrade!;
  const from = gameState.players.find(p => p.id === trade.fromId);
  const to   = gameState.players.find(p => p.id === trade.toId);
  const me   = gameState.players.find(p => p.id === myId)!;

  const [countering, setCountering] = useState(false);
  // Pre-fill counter with the original offer flipped
  const [cOfferProps,   setCOfferProps]   = useState<number[]>(trade.requestProperties);
  const [cOfferMoney,   setCOfferMoney]   = useState(trade.requestMoney);
  const [cOfferJail,    setCOfferJail]    = useState(trade.requestJailCards);
  const [cRequestProps, setCRequestProps] = useState<number[]>(trade.offerProperties);
  const [cRequestMoney, setCRequestMoney] = useState(trade.offerMoney);
  const [cRequestJail,  setCRequestJail]  = useState(trade.offerJailCards);

  // Reset counter form if trade changes
  useEffect(() => {
    setCOfferProps(trade.requestProperties);
    setCOfferMoney(trade.requestMoney);
    setCOfferJail(trade.requestJailCards);
    setCRequestProps(trade.offerProperties);
    setCRequestMoney(trade.offerMoney);
    setCRequestJail(trade.offerJailCards);
    setCountering(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trade.id]);

  const accept  = () => socket.emit('accept_trade',  { tradeId: trade.id });
  const decline = () => socket.emit('decline_trade', { tradeId: trade.id });
  const cancel  = () => socket.emit('decline_trade', { tradeId: trade.id });

  const sendCounter = () => {
    socket.emit('counter_trade', {
      tradeId: trade.id,
      counter: {
        toId: trade.fromId,
        offerProperties: cOfferProps,
        offerMoney: cOfferMoney,
        offerJailCards: cOfferJail,
        requestProperties: cRequestProps,
        requestMoney: cRequestMoney,
        requestJailCards: cRequestJail,
      },
    });
    setCountering(false);
  };

  const isProposer = trade.fromId === myId;
  const isRecipient = trade.toId === myId;
  const isObserver = !isProposer && !isRecipient;

  // Shared trade detail columns (reused by proposer + recipient + observer)
  const tradeColumns = (
    <div className="trade-columns">
      <div className="trade-col">
        <div className="trade-col-header" style={{ color: from?.color }}>
          {from?.token} {from?.name} offers
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
          {to?.token} {to?.name} gives
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
  );

  // Proposer waiting for response — show full trade details + cancel
  if (isProposer) {
    const waitBody = (
      <>
        <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 10 }}>
          ⏳ Waiting for <b>{to?.name}</b> to respond…
        </div>
        {tradeColumns}
        <div className="trade-footer" style={{ marginTop: 10 }}>
          <button className="btn-action" style={{ width: '100%' }} onClick={cancel}>
            Cancel offer
          </button>
        </div>
      </>
    );
    if (inline) return <div className="trade-inline">{waitBody}</div>;
    return (
      <div className="modal-overlay" style={{ pointerEvents: 'none' }}>
        <div className="trade-waiting-banner" style={{ pointerEvents: 'all' }}>
          ⏳ Waiting for {to?.name} to respond to your trade offer…
          <button style={{ marginLeft: 16 }} className="btn-action" onClick={cancel}>
            Cancel offer
          </button>
        </div>
      </div>
    );
  }

  // Observer: read-only view
  if (isObserver) {
    const observerBody = (
      <>
        <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 8 }}>
          👀 Trade in progress
        </div>
        {tradeColumns}
      </>
    );
    if (inline) return <div className="trade-inline">{observerBody}</div>;
    return null;
  }

  // Counter offer form
  const counterForm = countering && (
    <>
      <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8, fontStyle: 'italic' }}>
        ↩ Sending counter to {from?.token} <b>{from?.name}</b>
      </div>
      <div className="trade-columns">
        <div className="trade-col">
          <div className="trade-col-header" style={{ color: me?.color }}>You offer</div>
          <PropList
            spaceIndices={me?.properties ?? []}
            selected={cOfferProps}
            onToggle={si => setCOfferProps(p => p.includes(si) ? p.filter(x => x !== si) : [...p, si])}
            ownedProperties={gameState.ownedProperties}
          />
          <MoneyInput value={cOfferMoney} max={me?.money ?? 0} onChange={setCOfferMoney} />
          {(me?.getOutOfJailCards ?? 0) > 0 && (
            <CountInput value={cOfferJail} max={me?.getOutOfJailCards ?? 0} onChange={setCOfferJail} />
          )}
        </div>
        <div className="trade-divider">⇌</div>
        <div className="trade-col">
          <div className="trade-col-header" style={{ color: from?.color }}>You want</div>
          <PropList
            spaceIndices={from?.properties ?? []}
            selected={cRequestProps}
            onToggle={si => setCRequestProps(p => p.includes(si) ? p.filter(x => x !== si) : [...p, si])}
            ownedProperties={gameState.ownedProperties}
          />
          <MoneyInput value={cRequestMoney} max={from?.money ?? 0} onChange={setCRequestMoney} />
          {(from?.getOutOfJailCards ?? 0) > 0 && (
            <CountInput value={cRequestJail} max={from?.getOutOfJailCards ?? 0} onChange={setCRequestJail} />
          )}
        </div>
      </div>
      <div className="trade-footer">
        <button className="btn-action" onClick={() => setCountering(false)}>← Back</button>
        <button className="btn-primary" style={{ width: 'auto', padding: '10px 20px' }} onClick={sendCounter}>
          ↩ Send Counter
        </button>
      </div>
    </>
  );

  // Recipient reviewing offer
  const reviewBody = (
    <>
      <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 8 }}>
        Offer from {from?.token} <b>{from?.name}</b>
      </div>
      {countering ? counterForm : tradeColumns}
      {!countering && (
        <div className="trade-footer">
          <button className="btn-action btn-decline" onClick={decline}>✗ Decline</button>
          <button className="btn-action" onClick={() => setCountering(true)}>↩ Counter</button>
          <button className="btn-primary btn-buy" style={{ width: 'auto', padding: '10px 24px' }} onClick={accept}>
            ✓ Accept
          </button>
        </div>
      )}
    </>
  );

  if (inline) {
    return (
      <div className="trade-inline">
        <div className="trade-header">
          <h2>🤝 Trade Offer</h2>
        </div>
        {reviewBody}
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="trade-modal">
        <div className="trade-header">
          <h2>🤝 Trade Offer from {from?.token} {from?.name}</h2>
        </div>
        {reviewBody}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PropList({ spaceIndices, selected, onToggle, ownedProperties }: {
  spaceIndices: number[];
  selected: number[];
  onToggle: (idx: number) => void;
  ownedProperties: GameState['ownedProperties'];
}) {
  if (spaceIndices.length === 0) return <div className="trade-nothing">No properties</div>;
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
        type="number" min={0} max={max} value={value}
        onChange={e => onChange(Math.min(max, Math.max(0, Number(e.target.value))))}
        onFocus={e => e.target.select()}
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
        <button key={i} className={`trade-count-btn ${value === i ? 'selected' : ''}`} onClick={() => onChange(i)}>{i}</button>
      ))}
    </div>
  );
}
