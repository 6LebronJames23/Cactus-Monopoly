import { useState, useEffect, useRef } from 'react';
import { AuctionState, GameState } from '../types/game';
import { BOARD_SPACES, GROUP_COLORS } from '../data/board';
import { socket } from '../socket';
import { soundBid, soundAuctionWin } from '../utils/sounds';

interface Props {
  auction: AuctionState;
  gameState: GameState;
  myId: string;
  inline?: boolean;
}

const QUICK_BIDS = [1, 5, 10, 25, 50, 100];

export default function AuctionModal({ auction, gameState, myId, inline }: Props) {
  const [customAmount, setCustomAmount] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const prevHighestRef = useRef(auction.highestBid);
  const prevDeadlineRef = useRef(auction.deadlineMs);

  const space = BOARD_SPACES[auction.spaceIndex];
  const me = gameState.players.find(p => p.id === myId);
  const hasPassed = auction.passedPlayers.includes(myId);
  const highestBidder = gameState.players.find(p => p.id === auction.highestBidderId);
  const groupColor = space.group ? GROUP_COLORS[space.group] : '#888';
  const iAmWinning = auction.highestBidderId === myId;

  // Countdown timer
  useEffect(() => {
    const tick = () => {
      const rem = Math.max(0, Math.ceil((auction.deadlineMs - Date.now()) / 1000));
      setSecondsLeft(rem);
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [auction.deadlineMs]);

  // Play bid sound when highest bid changes
  useEffect(() => {
    if (auction.highestBid > prevHighestRef.current) {
      soundBid();
      prevHighestRef.current = auction.highestBid;
    }
  }, [auction.highestBid]);

  // Play win sound when auction ends and I won (detected by auction disappearing while I was winning)
  useEffect(() => {
    if (!gameState.pendingAuction && prevHighestRef.current > 0) {
      // auction just closed — check log for win
      const lastLog = gameState.log[0] ?? '';
      if (lastLog.includes('won the auction') && me && lastLog.includes(me.name)) {
        soundAuctionWin();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.pendingAuction]);

  // Timer warning class
  const timerDanger = secondsLeft <= 5 && secondsLeft > 0;
  const timerWarn = secondsLeft <= 10 && secondsLeft > 5;

  const quickBid = (inc: number) => {
    const amount = auction.highestBid + inc;
    if (!me || amount > me.money) return;
    socket.emit('place_bid', { amount }, (res: any) => {
      if (res && !res.ok) alert(res.error);
    });
  };

  const customBid = () => {
    const amount = parseInt(customAmount, 10);
    if (isNaN(amount) || !me || amount > me.money || amount <= auction.highestBid) return;
    socket.emit('place_bid', { amount }, (res: any) => {
      if (res && !res.ok) alert(res.error);
      else setCustomAmount('');
    });
  };

  const pass = () => socket.emit('pass_auction', {});

  // Deadline changed externally (bid placed by someone else)
  useEffect(() => {
    prevDeadlineRef.current = auction.deadlineMs;
  }, [auction.deadlineMs]);

  const activePlayers = gameState.players.filter(
    p => !p.bankrupt && !auction.passedPlayers.includes(p.id)
  );

  const canBidInc = (inc: number) => me && !hasPassed && auction.highestBid + inc <= me.money;

  const inner = (
    <div className={`auction-modal ${inline ? 'auction-modal--inline' : ''}`}>

      {/* Header row: gavel + title + timer */}
      <div className="auction-header">
        <span className="auction-gavel">🔨</span>
        <h2>Auction</h2>
        <div className={`auction-timer ${timerDanger ? 'auction-timer--danger' : timerWarn ? 'auction-timer--warn' : ''}`}>
          <svg className="auction-timer-ring" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
            <circle
              cx="18" cy="18" r="15.9" fill="none"
              stroke={timerDanger ? '#ef4444' : timerWarn ? '#f59e0b' : '#4ade80'}
              strokeWidth="3"
              strokeDasharray={`${(secondsLeft / 15) * 100} 100`}
              strokeLinecap="round"
              style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dasharray 0.25s, stroke 0.4s' }}
            />
          </svg>
          <span className="auction-timer-num">{secondsLeft}</span>
        </div>
      </div>

      {space.group && <div className="auction-color-bar" style={{ background: groupColor }} />}

      {/* Property */}
      <div className="auction-property">
        <span className="auction-flag">{space.flag ?? '🏙️'}</span>
        <div>
          <div className="auction-name">{space.name}</div>
          <div className="auction-market">Market value: <b>${space.price?.toLocaleString()}</b></div>
        </div>
      </div>

      {/* Current bid */}
      <div className="auction-current-bid">
        <span className="auction-bid-label">Current bid</span>
        <span className="auction-bid-amount">
          {auction.highestBid > 0 ? `$${auction.highestBid.toLocaleString()}` : '—'}
        </span>
        {highestBidder ? (
          <span className="auction-bid-by" style={{ color: highestBidder.color }}>
            {highestBidder.token} {highestBidder.name}
            {iAmWinning && ' (you)'}
          </span>
        ) : (
          <span className="auction-bid-by" style={{ opacity: 0.4 }}>No bids yet</span>
        )}
      </div>

      {/* Active players */}
      <div className="auction-players">
        {gameState.players.filter(p => !p.bankrupt).map(p => {
          const passed = auction.passedPlayers.includes(p.id);
          const isLeading = p.id === auction.highestBidderId;
          return (
            <div
              key={p.id}
              className={`auction-player-chip ${passed ? 'passed' : ''} ${isLeading ? 'leading' : ''}`}
              style={{ borderColor: passed ? undefined : p.color }}
            >
              {p.token} {p.name}
              {passed && <span className="chip-status">passed</span>}
              {isLeading && !passed && <span className="chip-status leading-label">●</span>}
            </div>
          );
        })}
      </div>

      {/* Bidding actions */}
      {me && !me.bankrupt && !hasPassed ? (
        <div className="auction-actions">
          <div className="auction-balance">
            <span style={{ opacity: 0.55 }}>Your balance:</span> <b>${me.money.toLocaleString()}</b>
            {iAmWinning && <span className="auction-winning-tag">🏆 winning</span>}
          </div>

          {/* Quick-bid buttons — instant, no extra click needed */}
          <div className="auction-quick-bids">
            {QUICK_BIDS.map(inc => (
              <button
                key={inc}
                className={`auction-quick-btn ${!canBidInc(inc) ? 'auction-quick-btn--disabled' : ''}`}
                onClick={() => quickBid(inc)}
                disabled={!canBidInc(inc)}
              >
                +${inc}
              </button>
            ))}
          </div>

          {/* Custom amount row */}
          <div className="auction-bid-row">
            <span className="auction-dollar">$</span>
            <input
              type="number"
              className="input auction-bid-input"
              placeholder={`> ${auction.highestBid}`}
              min={auction.highestBid + 1}
              max={me.money}
              value={customAmount}
              onChange={e => setCustomAmount(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && customBid()}
            />
            <button
              className="action-btn action-btn--buy"
              onClick={customBid}
              disabled={
                !customAmount ||
                parseInt(customAmount, 10) <= auction.highestBid ||
                parseInt(customAmount, 10) > me.money
              }
            >
              Bid
            </button>
          </div>

          <button className="action-btn action-btn--decline auction-pass-btn" onClick={pass}>
            Pass
          </button>
        </div>
      ) : hasPassed ? (
        <div className="auction-passed-msg">
          {iAmWinning
            ? '🏆 You\'re the highest bidder!'
            : 'You passed on this auction.'}
        </div>
      ) : null}
    </div>
  );

  if (inline) return inner;
  return <div className="modal-overlay">{inner}</div>;
}
