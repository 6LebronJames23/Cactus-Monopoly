import { useState } from 'react';
import { AuctionState, GameState } from '../types/game';
import { BOARD_SPACES, GROUP_COLORS } from '../data/board';
import { socket } from '../socket';

interface Props {
  auction: AuctionState;
  gameState: GameState;
  myId: string;
}

export default function AuctionModal({ auction, gameState, myId }: Props) {
  const [bidInput, setBidInput] = useState(auction.highestBid + 1);
  const space = BOARD_SPACES[auction.spaceIndex];
  const me = gameState.players.find(p => p.id === myId);
  const hasPassed = auction.passedPlayers.includes(myId);
  const highestBidder = gameState.players.find(p => p.id === auction.highestBidderId);
  const groupColor = space.group ? GROUP_COLORS[space.group] : '#888';

  const activePlayers = gameState.players.filter(
    p => !p.bankrupt && !auction.passedPlayers.includes(p.id)
  );

  const placeBid = () => {
    socket.emit('place_bid', { amount: bidInput }, (res: any) => {
      if (!res.ok) alert(res.error);
      else setBidInput(bidInput + 1);
    });
  };

  const pass = () => {
    socket.emit('pass_auction', {});
  };

  return (
    <div className="modal-overlay">
      <div className="auction-modal">
        <div className="auction-header">
          <span className="auction-gavel">🔨</span>
          <h2>Auction</h2>
        </div>

        {space.group && (
          <div className="auction-color-bar" style={{ background: groupColor }} />
        )}

        <div className="auction-property">
          <span className="auction-flag">{space.flag ?? '🏙️'}</span>
          <div>
            <div className="auction-name">{space.name}</div>
            <div className="auction-market">Market price: ${space.price?.toLocaleString()}</div>
          </div>
        </div>

        <div className="auction-current-bid">
          {highestBidder ? (
            <>
              <span className="auction-bid-amount">${auction.highestBid.toLocaleString()}</span>
              <span className="auction-bid-by" style={{ color: highestBidder.color }}>
                {highestBidder.token} {highestBidder.name}
              </span>
            </>
          ) : (
            <span className="auction-bid-amount" style={{ opacity: 0.4 }}>No bids yet</span>
          )}
          <span className="auction-bid-label">Current bid</span>
        </div>

        {/* Still-active players */}
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
                {isLeading && !passed && <span className="chip-status leading-label">leading</span>}
              </div>
            );
          })}
        </div>

        {me && !me.bankrupt && !hasPassed && (
          <div className="auction-actions">
            <div className="auction-bid-row">
              <span className="auction-dollar">$</span>
              <input
                type="number"
                className="input auction-bid-input"
                min={auction.highestBid + 1}
                max={me.money}
                value={bidInput}
                onChange={e => setBidInput(Math.max(auction.highestBid + 1, Math.min(me.money, Number(e.target.value))))}
              />
              <button
                className="action-btn action-btn--buy"
                onClick={placeBid}
                disabled={bidInput > me.money}
              >
                Bid
              </button>
            </div>
            <div className="auction-quick-bids">
              {[1, 10, 50, 100].map(inc => {
                const val = auction.highestBid + inc;
                if (val > me.money) return null;
                return (
                  <button
                    key={inc}
                    className="action-btn action-btn--secondary"
                    onClick={() => setBidInput(val)}
                  >
                    +${inc}
                  </button>
                );
              })}
            </div>
            <button className="action-btn action-btn--decline" onClick={pass}>
              Pass
            </button>
            <div className="auction-balance">Your balance: ${me.money.toLocaleString()}</div>
          </div>
        )}

        {hasPassed && (
          <div className="auction-passed-msg">You passed on this auction.</div>
        )}
      </div>
    </div>
  );
}
