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

// Must match CSS: 2 * --cs + 14 * --sw  (2*130 + 14*72 = 1268)
const BOARD_PX = 1268;

interface Props {
  gameState: GameState;
  myId: string;
}

export default function Game({ gameState, myId }: Props) {
  const [selectedSpace, setSelectedSpace] = useState<BoardSpace | null>(null);
  const [showTrade, setShowTrade] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const [boardScale, setBoardScale] = useState(1);
  const [rightTab, setRightTab] = useState<'log' | 'trade'>('log');

  const boardAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = boardAreaRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => {
      const w = el.clientWidth - 16;
      const h = el.clientHeight - 68;
      const fit = Math.min(w, h);
      setBoardScale(Math.min(1, fit / BOARD_PX));
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const { visualPositions } = usePlayerMovement(gameState.players);
  const toasts = useToasts(gameState.log);

  const me = gameState.players.find(p => p.id === myId);
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isMyTurn = currentPlayer?.id === myId;
  const { turnPhase, dice, currentCard } = gameState;

  useGameSounds(gameState.log, isMyTurn);

  // Switch to trade tab automatically when a trade is pending and involves me
  const myTrade = gameState.pendingTrade &&
    (gameState.pendingTrade.fromId === myId || gameState.pendingTrade.toId === myId);
  useEffect(() => {
    if (myTrade) setRightTab('trade');
  }, [myTrade]);

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

  return (
    <div className="game-layout">
      {/* LEFT: player cards + log */}
      <aside className="side-panel side-panel--left">
        <PlayerPanel gameState={gameState} myId={myId} onSelectSpace={setSelectedSpace} />
      </aside>

      {/* CENTER: board + controls */}
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
            />
          </div>
        </div>

        {/* ── Action Bar ── */}
        <div className="action-bar">
          {gameState.gamePhase === 'playing' && isMyTurn && me && !me.bankrupt && (
            <div className="action-bar__my-turn">
              <span className="action-bar__label">Your turn</span>

              {/* JAIL controls */}
              {turnPhase === 'roll' && me.inJail && (
                <div className="action-bar__group">
                  <ActionBtn onClick={handleRoll} disabled={isRolling} variant="roll">
                    🎲 Roll for doubles
                  </ActionBtn>
                  {me.getOutOfJailCards > 0 && (
                    <ActionBtn onClick={() => emit('use_jail_card')} variant="secondary">
                      🃏 Use card
                    </ActionBtn>
                  )}
                  <ActionBtn onClick={() => emit('pay_jail_fine')} variant="secondary">
                    💰 Pay $50
                  </ActionBtn>
                </div>
              )}

              {/* Normal roll */}
              {turnPhase === 'roll' && !me.inJail && (
                <ActionBtn onClick={handleRoll} disabled={isRolling} variant="roll">
                  {isRolling ? '🎲 Rolling…' : '🎲 Roll Dice'}
                </ActionBtn>
              )}

              {/* Buy decision */}
              {turnPhase === 'buy_decision' && gameState.pendingBuySpaceIndex !== null && (() => {
                const space = BOARD_SPACES[gameState.pendingBuySpaceIndex];
                const canAfford = (me?.money ?? 0) >= (space.price ?? 0);
                return (
                  <div className="action-bar__group">
                    <span className="action-bar__buy-info">
                      Buy <b>{space.flag} {space.name}</b> for <b>${space.price}</b>?
                      {!canAfford && (
                        <span className="action-bar__cant-afford"> — Not enough money!</span>
                      )}
                    </span>
                    <ActionBtn onClick={() => emit('buy_property')} variant="buy" disabled={!canAfford}>✓ Buy</ActionBtn>
                    <ActionBtn onClick={() => emit('decline_buy')} variant="decline">✗ Pass</ActionBtn>
                  </div>
                );
              })()}

              {/* End turn / Roll Again on doubles */}
              {turnPhase === 'done' && (() => {
                const isDoublesRoll = dice && dice[0] === dice[1];
                return (
                  <ActionBtn onClick={() => emit('end_turn')} variant="end">
                    {isDoublesRoll ? '🎲 Roll Again →' : 'End Turn →'}
                  </ActionBtn>
                );
              })()}
            </div>
          )}

          {gameState.gamePhase === 'playing' && !isMyTurn && (
            <div className="action-bar__waiting">
              <span className="action-bar__waiting-dot" style={{ background: currentPlayer?.color }} />
              Waiting for <b>{currentPlayer?.name}</b>…
            </div>
          )}

          {gameState.gamePhase === 'ended' && (
            <div className="action-bar__winner">
              🏆 {gameState.players.find(p => !p.bankrupt)?.name} wins the game!
            </div>
          )}

          <div className="action-bar__right">
            {me && !me.bankrupt && gameState.gamePhase === 'playing' && (
              <button
                className="btn-bankrupt"
                onClick={() => { if (confirm('Declare bankruptcy?')) emit('declare_bankruptcy'); }}
              >
                💸
              </button>
            )}
          </div>
        </div>
      </main>

      {/* RIGHT: tabbed panel — Log | Trade */}
      <aside className="side-panel side-panel--right">
        <div className="right-tabs">
          <button
            className={`right-tab ${rightTab === 'log' ? 'right-tab--active' : ''}`}
            onClick={() => setRightTab('log')}
          >
            📋 Log
          </button>
          <button
            className={`right-tab ${rightTab === 'trade' ? 'right-tab--active' : ''} ${myTrade ? 'right-tab--alert' : ''}`}
            onClick={() => setRightTab('trade')}
          >
            🤝 Trade{myTrade ? ' ●' : ''}
          </button>
        </div>

        {rightTab === 'log' && (
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

        {rightTab === 'trade' && (
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

      {/* ── Toast notifications ── */}
      <div className="toast-stack">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast--${t.type}`}>{t.message}</div>
        ))}
      </div>

      {/* ── Modals ── */}
      {currentCard && isMyTurn && turnPhase === 'card' && (
        <CardModal card={currentCard} onOk={() => emit('resolve_card')} />
      )}
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
      {gameState.pendingAuction && (
        <AuctionModal auction={gameState.pendingAuction} gameState={gameState} myId={myId} />
      )}
    </div>
  );
}

function ActionBtn({
  children, onClick, disabled, variant,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant: 'roll' | 'secondary' | 'buy' | 'decline' | 'end';
}) {
  return (
    <button
      className={`action-btn action-btn--${variant}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
