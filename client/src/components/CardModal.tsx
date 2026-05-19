import { CardEvent } from '../types/game';

interface Props {
  card: CardEvent;
  onOk?: () => void;  // kept for compatibility but no longer rendered
  inline?: boolean;
}

export default function CardModal({ card, inline }: Props) {
  const isTreasure = card.type === 'treasure';

  const body = (
    <div className={`card-modal ${isTreasure ? 'card-treasure' : 'card-surprise'} ${inline ? 'card-modal--inline' : ''}`}>
      <div className="card-type-label">{isTreasure ? '📦 Treasure' : '❓ Surprise'}</div>
      <div className="card-title">{card.title}</div>
      <div className="card-description">{card.description}</div>
    </div>
  );

  if (inline) return body;

  return <div className="modal-overlay">{body}</div>;
}
