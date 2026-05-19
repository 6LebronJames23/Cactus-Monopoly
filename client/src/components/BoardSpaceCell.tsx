import { BoardSpace, Player, OwnedProperty } from '../types/game';
import Flag from './Flag';

interface Props {
  space: BoardSpace;
  side: 'bottom' | 'top' | 'left' | 'right';
  isCorner: boolean;
  playersHere: Player[];
  owner?: Player;
  owned?: OwnedProperty;
  groupColor?: string;
  onClick: () => void;
}

const CORNER_ICONS: Record<string, string> = {
  go: '▶▶',
  jail: '🔒',
  free_parking: '🏖️',
  go_to_jail: '👮',
};

const SPACE_ICONS: Record<string, string> = {
  treasure: '📦',
  surprise: '❓',
  tax: '💸',
  airport: '✈️',
};

export default function BoardSpaceCell({
  space, side, isCorner, playersHere, owner, owned, groupColor, onClick,
}: Props) {
  const isMortgaged = owned?.mortgaged ?? false;
  const houses = owned?.houses ?? 0;

  const price = space.price
    ? `$${space.price}`
    : space.taxAmount
    ? `-$${space.taxAmount}`
    : space.taxPercent
    ? `${space.taxPercent}%`
    : '';

  const spaceIcon =
    isCorner
      ? CORNER_ICONS[space.type] ?? ''
      : space.type === 'property' || space.type === 'airport' || space.type === 'utility'
      ? space.flag ?? ''
      : SPACE_ICONS[space.type] ?? '';

  const cls = [
    'bs',
    `bs--${side}`,
    isCorner ? 'bs--corner' : '',
    `bs--${space.type}`,
    owner ? 'bs--owned' : '',
    isMortgaged ? 'bs--mortgaged' : '',
    playersHere.length ? 'bs--occupied' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={cls}
      onClick={onClick}
      style={{
        ...(owner   ? { '--owner-color': owner.color } as React.CSSProperties : {}),
        ...(groupColor && !isCorner ? { '--gc': groupColor } as React.CSSProperties : {}),
      }}
    >
      {/* Color band */}
      {groupColor && !isCorner && (
        <div
          className={`bs__band bs__band--${side}`}
          style={{ background: isMortgaged ? '#333' : groupColor }}
        />
      )}

      {/* Owner avatar — large, centered, absolute so it doesn't rotate with body */}
      {owner && !isCorner && (
        <div
          className={`bs__owner-avatar ${isMortgaged ? 'bs__owner-avatar--mortgaged' : ''}`}
          style={{
            background: owner.color,
            boxShadow: `0 0 0 2px ${owner.color}, 0 0 0 3.5px rgba(255,255,255,0.25), 0 3px 10px rgba(0,0,0,0.6)`,
          }}
          title={`Owned by ${owner.name}${isMortgaged ? ' (mortgaged)' : ''}`}
        >
          {owner.token}
        </div>
      )}

      {/* Houses / hotel */}
      {houses > 0 && !isCorner && (
        <div className={`bs__houses bs__houses--${side}`}>
          {houses === 5
            ? <span className="bs__hotel">🏨</span>
            : Array.from({ length: houses }, (_, i) => (
                <span key={i} className="bs__house">🏠</span>
              ))}
        </div>
      )}

      {/* Main body — rotated for side columns */}
      <div className={`bs__body bs__body--${side}`}>
        {isCorner ? (
          <div className="bs__corner-content">
            <span className="bs__corner-icon">{spaceIcon}</span>
            <span className="bs__corner-name">{space.name}</span>
          </div>
        ) : owner ? (
          <>
            <span className="bs__name bs__name--owned">{space.name}</span>
            {isMortgaged && <span className="bs__mortgaged-label">MTG</span>}
          </>
        ) : (
          <>
            <Flag
              emoji={spaceIcon}
              size={space.type === 'property' ? 24 : 18}
              className={`bs__icon${space.type === 'property' || space.type === 'airport' || space.type === 'utility' ? ' bs__icon--flag' : ''}`}
            />
            <span className="bs__name">{space.name}</span>
            {price && <span className="bs__price-pill">{price}</span>}
          </>
        )}
      </div>

      {/* Player tokens */}
      {playersHere.length > 0 && (
        <div className="bs__tokens">
          {playersHere.map(p => (
            <span
              key={p.id}
              className="bs__token"
              title={p.name}
              style={{
                background: p.color,
                boxShadow: `0 0 0 2.5px #fff, 0 0 0 4.5px ${p.color}, 0 3px 10px rgba(0,0,0,0.7)`,
              }}
            >
              {p.token}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
