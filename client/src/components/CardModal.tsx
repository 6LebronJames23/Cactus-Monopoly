import { CardEvent } from '../types/game';

interface Props {
  card: CardEvent;
  onOk: () => void;
  inline?: boolean;
}

export default function CardModal({ card, onOk, inline }: Props) {
  const isTreasure = card.type === 'treasure';

  const body = (
    <div className={`card-modal ${isTreasure ? 'card-treasure' : 'card-surprise'} ${inline ? 'card-modal--inline' : ''}`}>
      <div className="card-type-label">{isTreasure ? '📦 Treasure' : '❓ Surprise'}</div>
      <div className="card-title">{card.title}</div>
      <div className="card-description">{card.description}</div>
      <button className="btn-primary" onClick={onOk} style={{ marginTop: 16 }}>OK</button>
    </div>
  );

  if (inline) return body;

  return <div className="modal-overlay">{body}</div>;
}
