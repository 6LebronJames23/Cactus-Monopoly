import { CardEvent } from '../types/game';

interface Props {
  card: CardEvent;
  onOk: () => void;
}

export default function CardModal({ card, onOk }: Props) {
  const isTreasure = card.type === 'treasure';

  return (
    <div className="modal-overlay">
      <div className={`card-modal ${isTreasure ? 'card-treasure' : 'card-surprise'}`}>
        <div className="card-type-label">{isTreasure ? '📦 Treasure' : '❓ Surprise'}</div>
        <div className="card-title">{card.title}</div>
        <div className="card-description">{card.description}</div>
        <button className="btn-primary" onClick={onOk} style={{ marginTop: 16 }}>OK</button>
      </div>
    </div>
  );
}
