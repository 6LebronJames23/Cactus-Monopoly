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
  // rents: [0h, 1h, 2h, 3h, 4h, hotel] for property; [owned1, owned2, owned3, owned4, owned5, owned6] for airport; [diceX4, diceX10] for utility
  rents?: number[];
  houseCost?: number;
  mortgageValue?: number;
  taxAmount?: number;   // flat amount
  taxPercent?: number;  // percent of cash
  flag?: string;        // emoji flag
}

export interface OwnedProperty {
  spaceIndex: number;
  ownerId: string;
  houses: number; // 0-4, 5 = hotel
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
  | 'roll'         // waiting for current player to roll
  | 'action'       // landed on space, waiting for action
  | 'buy_decision' // can buy property
  | 'card'         // showing a card
  | 'jail_decision'// in jail, decide
  | 'done';        // turn over, can end turn

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

export interface CardEvent {
  type: 'treasure' | 'surprise';
  title: string;
  description: string;
  effect: CardEffect;
}

export interface CardEffect {
  type:
    | 'gain_money'
    | 'lose_money'
    | 'move_to'
    | 'move_back'
    | 'get_out_of_jail'
    | 'go_to_jail'
    | 'pay_per_player'
    | 'gain_per_player'
    | 'street_repairs'
    | 'random_city';
  amount?: number;
  position?: number;
  spaces?: number;
  houseRate?: number;
  hotelRate?: number;
}

export interface GameSettings {
  startingCash:         number;   // default 2000
  doubleRentOnMonopoly: boolean;  // x2 base rent when owning full set
  vacationCash:         boolean;  // taxes/fees pool on vacation space
  auction:              boolean;  // auction when player declines to buy
  noRentInJail:         boolean;  // owner in jail → no rent collected
  mortgageEnabled:      boolean;  // allow mortgaging properties
  evenBuild:            boolean;  // must build/sell houses evenly
  randomizeOrder:       boolean;  // shuffle player order at game start
}

export const DEFAULT_SETTINGS: GameSettings = {
  startingCash:         2000,
  doubleRentOnMonopoly: true,
  vacationCash:         false,
  auction:              false,
  noRentInJail:         false,
  mortgageEnabled:      true,
  evenBuild:            true,
  randomizeOrder:       true,
};

export interface AuctionState {
  spaceIndex: number;
  bids: Record<string, number>; // playerId → current bid
  highestBidderId: string | null;
  highestBid: number;
  passedPlayers: string[];       // players who passed
}

export interface TradeOffer {
  id: string;
  fromId: string;
  toId: string;
  offerProperties: number[];   // space indices from sender
  offerMoney: number;
  offerJailCards: number;
  requestProperties: number[]; // space indices from receiver
  requestMoney: number;
  requestJailCards: number;
}

// Socket event payloads
export interface RoomInfo {
  roomId: string;
  players: Pick<Player, 'id' | 'name' | 'color' | 'token' | 'isReady'>[];
  hostId: string;
  gamePhase: GamePhase;
}
