import { useState, useEffect, useRef } from 'react';
import { GameState, BoardSpace } from '../types/game';
import { socket } from '../socket';
import { BOARD_SPACES } from '../data/board';
import { usePlayerMovement } from '../hooks/usePlayerMovement';
import { useToasts } from '../hooks/useToasts';
import { useGameSounds } from '../hooks/useGameSounds';
import Board from './Board';
import PlayerPanel from './PlayerPanel';
import CardModal from './CardModal';
import PropertyModal from './PropertyModal';
import TradeModal, { IncomingTradeModal } from './TradeModal';
import AuctionModal from './AuctionModal';
import EndScreen from './EndScreen';

// Must match CSS: 2 * --cs + 14 * --sw  (2*140 + 14*78 = 1372)
const BOARD_PX = 1372;

interface Props {
  gameState: GameState;
  myId: string;
  onLeave: () => void;
}

export default function Game({ gameState, myId, onLeave }: Props) {
  const [selectedSpace, setSelectedSpace] = useState<BoardSpace | null>(null);
  const [showTrade, setShowTrade] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const [fitScale, setFitScale] = useState(1);
  const [userZoom, setUserZoom] = useState(1);
  const [userTab, setUserTab] = useState<'log' | 'trade'>('log');
  const [showEndScreen, setShowEndScreen] = useState(true);

  // Final scale = fit-to-container × user zoom level
  const boardScale = fitScale * userZoom;

  const boardAreaRef = useRef<HTMLDivElement>(null);
  const userZoomRef = useRef(userZoom);
  useEffect(() => { userZoomRef.current = userZoom; }, [userZoom]);

  // Clamp zoom and update state
  const adjustZoom = (delta: number) => {
    setUserZoom(z => Math.max(0.4, Math.min(2.5, parseFloat((z + delta).toFixed(2)))));
  };
  const resetZoom = () => setUserZoom(1);

  useEffect(() => {
    const el = boardAreaRef.current;
    if (!el) return;

    // Recompute fit-scale whenever the container resizes — no cap, fills large screens too
    const recompute = () => {
      const w = el.clientWidth - 16;
      const h = el.clientHeight - 16;
      setFitScale(Math.min(w, h) / BOARD_PX);
    };

    const obs = new ResizeObserver(recompute);
    obs.observe(el);
    recompute();

    // Scroll-to-zoom: Ctrl+wheel or pinch-trackpad zooms the board
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        adjustZoom(-e.deltaY * 0.001);
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      obs.disconnect();
      el.removeEventListener('wheel', onWheel);
    };
  }, []);

  const { visualPositions } = usePlayerMovement(gameState.players);
  const toasts = useToasts(gameState.log);

  const me = gameState.players.find(p => p.id === myId);
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isMyTurn = currentPlayer?.id === myId;
  const { turnPhase, dice, currentCard } = gameState;

  useGameSounds(gameState.log, isMyTurn);

  const myTrade = gameState.pendingTrade &&
    (gameState.pendingTrade.fromId === myId || gameState.pendingTrade.toId === myId);

  // Auto-selected right panel content (priority order)
  const showAuctionPanel = !!gameState.pendingAuction;
  const showCardPanel = !!currentCard && !showAuctionPanel;
  const showTradePanel = !!myTrade || (userTab === 'trade' && !showAuctionPanel && !showCardPanel);
  const showLogPanel = !showAuctionPanel && !showCardPanel && !showTradePanel;

  useEffect(() => {
    if (gameState.gamePhase === 'ended') setShowEndScreen(true);
  }, [gameState.gamePhase]);

  const emit = (event: string, data: any = {}, onDone?: () => void) => {
    socket.emit(event, data, (res: any) => {
      if (res && !res.ok) console.warn(res.error);
      onDone?.();
    });
  };

  const handleRoll = () => {
    setIsRolling(true);
    setTimeout(() => {
      emit('roll_dice', {}, () => setIsRolling(false));
    }, 200);
  };

  // Build the actions slot rendered inside the board center
  const actionsSlot = (() => {
    if (gameState.gamePhase === 'ended') {
      const winner = gameState.players.find(p => !p.bankrupt);
      return (
        <div className="bc__ended-msg">
          🏆 {winner?.token} <b>{winner?.name}</b> wins!
        </div>
      );
    }

    if (gameState.gamePhase !== 'playing') return null;

    return (
      <div className="bc__action-group">
        {isMyTurn && me && !me.bankrupt ? (
          <>
            {/* JAIL controls */}
            {turnPhase === 'roll' && me.inJail && (
              <div className="bc__action-row">
                <button className="bc__action-btn bc__action-btn--roll" onClick={handleRoll} disabled={isRolling}>
                  🎲 Roll for doubles
                </button>
                {me.getOutOfJailCards > 0 && (
                  <button className="bc__action-btn bc__action-btn--secondary" onClick={() => emit('use_jail_card')}>
                    🃏 Use card
                  </button>
                )}
                <button className="bc__action-btn bc__action-btn--secondary" onClick={() => emit('pay_jail_fine')}>
                  💰 Pay $50
                </button>
              </div>
            )}

            {/* Normal roll */}
            {turnPhase === 'roll' && !me.inJail && (
              <button className="bc__action-btn bc__action-btn--roll" onClick={handleRoll} disabled={isRolling}>
                {isRolling ? '🎲 Rolling…' : '🎲 Roll Dice'}
              </button>
            )}

            {/* Buy decision */}
            {turnPhase === 'buy_decision' && gameState.pendingBuySpaceIndex !== null && (() => {
              const space = BOARD_SPACES[gameState.pendingBuySpaceIndex];
              const canAfford = (me?.money ?? 0) >= (space.price ?? 0);
              return (
                <div className="bc__action-row">
                  <button className="bc__action-btn bc__action-btn--end" onClick={() => emit('decline_buy')}>
                    ✗ Pass
                  </button>
                  <button className="bc__action-btn bc__action-btn--buy" onClick={() => emit('buy_property')} disabled={!canAfford}>
                    🏠 Buy {space.flag} {space.name} ${space.price}
                    {!canAfford && <span className="bc__cant-afford"> — not enough!</span>}
                  </button>
                </div>
              );
            })()}

            {/* End turn / Roll again */}
            {turnPhase === 'done' && (() => {
              const isDoublesRoll = dice && dice[0] === dice[1];
              return (
                <button className="bc__action-btn bc__action-btn--end" onClick={() => emit('end_turn')}>
                  {isDoublesRoll ? '🎲 Roll Again →' : '✓ End Turn'}
                </button>
              );
            })()}

          </>
        ) : (
          <div className="bc__waiting">
            <span className="bc__waiting-dot" style={{ background: currentPlayer?.color }} />
            Waiting for <b>{currentPlayer?.name}</b>…
          </div>
        )}

        {me && !me.bankrupt && (
          <button
            className="bc__bankrupt-btn"
            onClick={() => { if (confirm('Declare bankruptcy?')) emit('declare_bankruptcy'); }}
          >
            💸 Declare bankruptcy
          </button>
        )}
        <button className="bc__leave-btn" onClick={() => { if (confirm('Leave the game?')) onLeave(); }}>
          ← Leave
        </button>
      </div>
    );
  })();

  return (
    <div className="game-layout">
      {/* LEFT: player cards */}
      <aside className="side-panel side-panel--left">
        <PlayerPanel gameState={gameState} myId={myId} onSelectSpace={setSelectedSpace} />
      </aside>

      {/* CENTER: board (actions embedded inside board center) */}
      <main className="board-area" ref={boardAreaRef}>
        <div
          className="board-scale-outer"
          style={{ width: BOARD_PX * boardScale, height: BOARD_PX * boardScale }}
        >
          <div
            className="board-scale-inner"
            style={{ transform: `scale(${boardScale})`, transformOrigin: 'top left' }}
          >
            <Board
              gameState={gameState}
              myId={myId}
              visualPositions={visualPositions}
              isRolling={isRolling}
              onSpaceClick={setSelectedSpace}
              onRoll={isMyTurn && turnPhase === 'roll' && !isRolling && !me?.inJail ? handleRoll : undefined}
              actionsSlot={actionsSlot}
              recentLog={gameState.log.slice(0, 4)}
            />
          </div>
        </div>

        {/* Zoom controls — bottom-right corner of board area */}
        <div className="zoom-controls">
          <button className="zoom-btn" onClick={() => adjustZoom(-0.1)} title="Zoom out">−</button>
          <button className="zoom-pct" onClick={resetZoom} title="Reset zoom">
            {Math.round(userZoom * 100)}%
          </button>
          <button className="zoom-btn" onClick={() => adjustZoom(0.1)} title="Zoom in">+</button>
        </div>
      </main>

      {/* RIGHT: auto-switching panel — Auction > Card > Trade > Log */}
      <aside className="side-panel side-panel--right">
        <div className="right-tabs">
          {showAuctionPanel && <div className="right-tab right-tab--active right-tab--alert">🔨 Auction</div>}
          {!showAuctionPanel && showCardPanel && (
            <div className="right-tab right-tab--active right-tab--alert">
              {currentCard!.type === 'treasure' ? '📦 Treasure' : '❓ Surprise'}
            </div>
          )}
          {!showAuctionPanel && !showCardPanel && (
            <>
              <button
                className={`right-tab ${showLogPanel ? 'right-tab--active' : ''}`}
                onClick={() => setUserTab('log')}
              >
                📋 Log
              </button>
              <button
                className={`right-tab ${showTradePanel ? 'right-tab--active' : ''} ${myTrade ? 'right-tab--alert' : ''}`}
                onClick={() => setUserTab('trade')}
              >
                🤝 Trade{myTrade ? ' ●' : ''}
              </button>
            </>
          )}
        </div>

        {showAuctionPanel && (
          <div className="side-content-pane">
            <AuctionModal auction={gameState.pendingAuction!} gameState={gameState} myId={myId} inline />
          </div>
        )}

        {showCardPanel && (
          <div className="side-content-pane">
            <CardModal card={currentCard!} inline />
          </div>
        )}

        {!showAuctionPanel && !showCardPanel && showLogPanel && (
          <div className="game-log">
            <div className="log-entries">
              {gameState.log.map((entry, i) => (
                <div key={i} className={`log-entry ${i === 0 ? 'log-entry--latest' : ''}`}>
                  {entry}
                </div>
              ))}
            </div>
          </div>
        )}

        {!showAuctionPanel && !showCardPanel && showTradePanel && (
          <div className="trade-panel">
            {gameState.gamePhase !== 'playing' || me?.bankrupt ? (
              <div className="trade-panel__empty">Trading not available</div>
            ) : gameState.pendingTrade ? (
              <IncomingTradeModal gameState={gameState} myId={myId} inline />
            ) : showTrade ? (
              <TradeModal gameState={gameState} myId={myId} onClose={() => setShowTrade(false)} inline />
            ) : (
              <div className="trade-panel__idle">
                <p style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', marginBottom: 12 }}>
                  No active trade
                </p>
                <button className="btn-primary" style={{ width: '100%' }} onClick={() => setShowTrade(true)}>
                  🤝 Propose Trade
                </button>
              </div>
            )}
          </div>
        )}
      </aside>

      {/* Toasts */}
      <div className="toast-stack">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast--${t.type}`}>{t.message}</div>
        ))}
      </div>

      {gameState.gamePhase === 'ended' && showEndScreen && (
        <EndScreen gameState={gameState} myId={myId} onBack={() => setShowEndScreen(false)} />
      )}

      {/* PropertyModal stays as overlay (per-tile click) */}
      {selectedSpace && (
        <PropertyModal
          space={selectedSpace}
          owned={gameState.ownedProperties[selectedSpace.index]}
          players={gameState.players}
          myId={myId}
          isMyTurn={isMyTurn}
          onBuyHouse={() => emit('buy_house', { spaceIndex: selectedSpace.index })}
          onSellHouse={() => emit('sell_house', { spaceIndex: selectedSpace.index })}
          onMortgage={() => emit('mortgage_property', { spaceIndex: selectedSpace.index })}
          onUnmortgage={() => emit('unmortgage_property', { spaceIndex: selectedSpace.index })}
          onClose={() => setSelectedSpace(null)}
        />
      )}
    </div>
  );
}
