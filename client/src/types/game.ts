export type SpaceType =
  | 'property'
  | 'airport'
  | 'utility'
  | 'tax'
  | 'treasure'
  | 'surprise'
  | 'go'
  | 'jail'
  | 'free_parking'
  | 'go_to_jail';

export type ColorGroup =
  | 'brown'
  | 'light_blue'
  | 'pink'
  | 'orange'
  | 'red'
  | 'yellow'
  | 'green'
  | 'purple'
  | 'dark_blue'
  | 'teal';

export interface BoardSpace {
  index: number;
  name: string;
  type: SpaceType;
  price?: number;
  group?: ColorGroup;
  rents?: number[];
  houseCost?: number;
  mortgageValue?: number;
  taxAmount?: number;
  taxPercent?: number;
  flag?: string;
}

export interface OwnedProperty {
  spaceIndex: number;
  ownerId: string;
  houses: number;
  mortgaged: boolean;
}

export interface Player {
  id: string;
  name: string;
  color: string;
  token: string;
  position: number;
  money: number;
  properties: number[];
  inJail: boolean;
  jailTurns: number;
  getOutOfJailCards: number;
  bankrupt: boolean;
  isReady: boolean;
}

export type GamePhase = 'lobby' | 'playing' | 'ended';

export type TurnPhase =
  | 'roll'
  | 'action'
  | 'buy_decision'
  | 'card'
  | 'jail_decision'
  | 'done';

export interface CardEvent {
  type: 'treasure' | 'surprise';
  title: string;
  description: string;
  effect: {
    type: string;
    amount?: number;
    position?: number;
    spaces?: number;
  };
}

export interface GameSettings {
  startingCash:         number;
  doubleRentOnMonopoly: boolean;
  vacationCash:         boolean;
  auction:              boolean;
  noRentInJail:         boolean;
  mortgageEnabled:      boolean;
  evenBuild:            boolean;
  randomizeOrder:       boolean;
}

export interface AuctionState {
  spaceIndex: number;
  bids: Record<string, number>;
  highestBidderId: string | null;
  highestBid: number;
  passedPlayers: string[];
}

export interface TradeOffer {
  id: string;
  fromId: string;
  toId: string;
  offerProperties: number[];
  offerMoney: number;
  offerJailCards: number;
  requestProperties: number[];
  requestMoney: number;
  requestJailCards: number;
}

export interface GameState {
  roomId: string;
  players: Player[];
  currentPlayerIndex: number;
  gamePhase: GamePhase;
  turnPhase: TurnPhase;
  dice: [number, number] | null;
  doublesCount: number;
  ownedProperties: Record<number, OwnedProperty>;
  houses: Record<number, number>;
  log: string[];
  currentCard: CardEvent | null;
  pendingBuySpaceIndex: number | null;
  pendingTrade: TradeOffer | null;
  pendingAuction: AuctionState | null;
  vacationPot: number;
  settings: GameSettings;
  hostId: string;
}
