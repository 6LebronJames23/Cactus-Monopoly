import { CardEvent } from '../types/game';

const TREASURE_CARDS: CardEvent[] = [
  { type: 'treasure', title: 'Bank Error!', description: 'Bank error in your favor. Collect $200.', effect: { type: 'gain_money', amount: 200 } },
  { type: 'treasure', title: 'Birthday!', description: 'It\'s your birthday! Collect $10 from each player.', effect: { type: 'gain_per_player', amount: 10 } },
  { type: 'treasure', title: 'Stock Dividend', description: 'You receive a stock dividend. Collect $50.', effect: { type: 'gain_money', amount: 50 } },
  { type: 'treasure', title: 'Tax Refund', description: 'Income tax refund. Collect $20.', effect: { type: 'gain_money', amount: 20 } },
  { type: 'treasure', title: 'Holiday Fund', description: 'Holiday fund matures. Collect $100.', effect: { type: 'gain_money', amount: 100 } },
  { type: 'treasure', title: 'Prize Money', description: 'You win second prize in a beauty contest. Collect $10.', effect: { type: 'gain_money', amount: 10 } },
  { type: 'treasure', title: 'Get Out of Jail', description: 'Get out of jail free. Keep this card.', effect: { type: 'get_out_of_jail' } },
  { type: 'treasure', title: 'Go to GO', description: 'Advance to GO. Collect $200.', effect: { type: 'move_to', position: 0 } },
  { type: 'treasure', title: 'Doctor\'s Fee', description: 'Doctor\'s fee. Pay $50.', effect: { type: 'lose_money', amount: 50 } },
  { type: 'treasure', title: 'School Fee', description: 'Pay school fees of $50.', effect: { type: 'lose_money', amount: 50 } },
  { type: 'treasure', title: 'Inheritance', description: 'You inherit $100.', effect: { type: 'gain_money', amount: 100 } },
  { type: 'treasure', title: 'Life Insurance', description: 'Life insurance matures. Collect $100.', effect: { type: 'gain_money', amount: 100 } },
  { type: 'treasure', title: 'Hospital Fee', description: 'Hospital fees. Pay $100.', effect: { type: 'lose_money', amount: 100 } },
  { type: 'treasure', title: 'Street Repairs', description: 'You are assessed for street repairs: $40/house, $115/hotel.', effect: { type: 'street_repairs', houseRate: 40, hotelRate: 115 } },
  { type: 'treasure', title: 'Consultancy Fee', description: 'You receive a consultancy fee. Collect $25.', effect: { type: 'gain_money', amount: 25 } },
  { type: 'treasure', title: 'Award', description: 'You win a crossword competition. Collect $100.', effect: { type: 'gain_money', amount: 100 } },
];

const SURPRISE_CARDS: CardEvent[] = [
  { type: 'surprise', title: 'Go to Jail!', description: 'Go directly to Jail. Do not pass GO. Do not collect $200.', effect: { type: 'go_to_jail' } },
  { type: 'surprise', title: 'Advance to GO', description: 'Advance to GO. Collect $200.', effect: { type: 'move_to', position: 0 } },
  { type: 'surprise', title: 'Speeding Fine', description: 'Speeding fine. Pay $15.', effect: { type: 'lose_money', amount: 15 } },
  { type: 'surprise', title: 'Poor Tax', description: 'Pay poor tax of $15.', effect: { type: 'lose_money', amount: 15 } },
  { type: 'surprise', title: 'Street Repairs', description: 'Make general repairs on your properties: $25/house, $100/hotel.', effect: { type: 'street_repairs', houseRate: 25, hotelRate: 100 } },
  { type: 'surprise', title: 'Get Out of Jail', description: 'Get out of jail free. Keep this card.', effect: { type: 'get_out_of_jail' } },
  { type: 'surprise', title: 'Go Back 3 Spaces', description: 'Go back 3 spaces.', effect: { type: 'move_back', spaces: 3 } },
  { type: 'surprise', title: 'Bank Dividend', description: 'Your building loan matures. Collect $150.', effect: { type: 'gain_money', amount: 150 } },
  { type: 'surprise', title: 'Chairman', description: 'You have been elected Chairman. Pay each player $50.', effect: { type: 'pay_per_player', amount: 50 } },
  { type: 'surprise', title: 'Travel Bonus', description: 'Advance token to nearest Airport.', effect: { type: 'move_to', position: -1 } }, // handled specially
  { type: 'surprise', title: 'Drunk Driving', description: 'You are caught drunk driving. Go directly to Jail.', effect: { type: 'go_to_jail' } },
  { type: 'surprise', title: 'Lottery', description: 'You win a small lottery. Collect $100.', effect: { type: 'gain_money', amount: 100 } },
  { type: 'surprise', title: 'Tax Return', description: 'Receive a tax return. Collect $75.', effect: { type: 'gain_money', amount: 75 } },
  { type: 'surprise', title: 'Construction Fee', description: 'You are assessed for road works. Pay $50.', effect: { type: 'lose_money', amount: 50 } },
  { type: 'surprise', title: 'Bonus Dividend', description: 'Dividend from investments. Collect $50.', effect: { type: 'gain_money', amount: 50 } },
  { type: 'surprise', title: 'Fine', description: 'Parking fine. Pay $30.', effect: { type: 'lose_money', amount: 30 } },
  { type: 'surprise', title: 'World Tour', description: 'Take a trip to a random city! Move there now.', effect: { type: 'random_city' } },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export class CardDeck {
  private treasureDeck: CardEvent[];
  private surpriseDeck: CardEvent[];
  private treasureIndex = 0;
  private surpriseIndex = 0;

  constructor() {
    this.treasureDeck = shuffle(TREASURE_CARDS);
    this.surpriseDeck = shuffle(SURPRISE_CARDS);
  }

  drawTreasure(): CardEvent {
    const card = this.treasureDeck[this.treasureIndex % this.treasureDeck.length];
    this.treasureIndex++;
    return card;
  }

  drawSurprise(): CardEvent {
    const card = this.surpriseDeck[this.surpriseIndex % this.surpriseDeck.length];
    this.surpriseIndex++;
    return card;
  }
}
