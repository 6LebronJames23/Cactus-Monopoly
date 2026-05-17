import { BoardSpace, OwnedProperty, Player } from '../types/game';
import { GROUP_COLORS, GROUP_COUNTRIES } from '../data/board';

interface Props {
  space: BoardSpace;
  owned?: OwnedProperty;
  players: Player[];
  myId: string;
  isMyTurn: boolean;
  onBuyHouse: () => void;
  onSellHouse: () => void;
  onMortgage: () => void;
  onUnmortgage: () => void;
  onClose: () => void;
}

export default function PropertyModal({
  space, owned, players, myId, isMyTurn,
  onBuyHouse, onSellHouse, onMortgage, onUnmortgage, onClose,
}: Props) {
  const owner = players.find(p => p.id === owned?.ownerId);
  const isOwner = owned?.ownerId === myId;
  const groupColor = space.group ? GROUP_COLORS[space.group] : undefined;
  const houses = owned?.houses ?? 0;

  const rentLabels = ['Base', '1 House', '2 Houses', '3 Houses', '4 Houses', 'Hotel'];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="property-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        {groupColor && (
          <div className="property-color-header" style={{ background: groupColor }} />
        )}

        <div className="property-modal-icon">{space.flag ?? '🏙️'}</div>
        <h2 className="property-modal-name">{space.name}</h2>
        {space.group && (
          <div style={{ textAlign: 'center', fontSize: 12, color: GROUP_COLORS[space.group], fontWeight: 600, padding: '2px 0 0' }}>
            {GROUP_COUNTRIES[space.group]}
          </div>
        )}

        {space.type === 'property' && space.rents && (
          <>
            <div className="property-price">
              Price: <b>${space.price}</b>
              {space.houseCost && <span> · House: <b>${space.houseCost}</b></span>}
              {space.mortgageValue && <span> · Mortgage: <b>${space.mortgageValue}</b></span>}
            </div>
            <table className="rent-table">
              <tbody>
                {space.rents.map((rent, i) => (
                  <tr key={i} className={houses === i && !owned?.mortgaged ? 'rent-row--active' : ''}>
                    <td>{rentLabels[i]}</td>
                    <td><b>${rent}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {space.type === 'airport' && space.rents && (
          <>
            <div className="property-price">Price: <b>${space.price}</b></div>
            <table className="rent-table">
              <tbody>
                {[1,2,3,4,5,6].map((n, i) => space.rents![i] !== undefined && (
                  <tr key={i}>
                    <td>Own {n} airport{n > 1 ? 's' : ''}</td>
                    <td><b>${space.rents![i]}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {space.type === 'utility' && (
          <>
            <div className="property-price">Price: <b>${space.price}</b></div>
            <div className="utility-note">
              Own 1 utility: pay 4× dice roll<br />
              Own all 3: pay 10× dice roll
            </div>
          </>
        )}

        {owned ? (
          <div className="property-owned-info">
            <div style={{ color: owner?.color }}>
              {owner?.token} Owned by <b>{owner?.name ?? 'Unknown'}</b>
            </div>
            {owned.mortgaged && <div className="mortgaged-label">⚠️ Mortgaged</div>}
            {houses > 0 && (
              <div>
                {houses === 5 ? '🏨 Hotel' : `${'🏠'.repeat(houses)} (${houses} house${houses > 1 ? 's' : ''})`}
              </div>
            )}
          </div>
        ) : (
          <div className="property-owned-info" style={{ opacity: 0.5 }}>Unowned</div>
        )}

        {isOwner && space.type === 'property' && (
          <div className="property-actions">
            <button className="btn-action" onClick={onBuyHouse}>🏠 Buy House</button>
            <button className="btn-action" onClick={onSellHouse}>💰 Sell House</button>
            {!owned?.mortgaged
              ? <button className="btn-action" onClick={onMortgage}>📜 Mortgage</button>
              : <button className="btn-action" onClick={onUnmortgage}>♻️ Unmortgage</button>
            }
          </div>
        )}

        {isOwner && (space.type === 'airport' || space.type === 'utility') && (
          <div className="property-actions">
            {!owned?.mortgaged
              ? <button className="btn-action" onClick={onMortgage}>📜 Mortgage</button>
              : <button className="btn-action" onClick={onUnmortgage}>♻️ Unmortgage</button>
            }
          </div>
        )}
      </div>
    </div>
  );
}
