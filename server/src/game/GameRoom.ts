import { Server, Socket } from 'socket.io';
import {
  GameState, Player, OwnedProperty, TurnPhase, CardEvent, TradeOffer,
  GameSettings, DEFAULT_SETTINGS, AuctionState,
} from '../types/game';
import {
  BOARD_SPACES, TOTAL_SPACES, JAIL_INDEX, GO_TO_JAIL_INDEX,
  GO_INDEX, GO_SALARY, STARTING_MONEY, getGroupSpaces,
  getAirportSpaces, getUtilitySpaces,
} from '../data/board';
import { CardDeck } from './Cards';

const PLAYER_COLORS = ['#e74c3c','#3498db','#2ecc71','#f39c12','#9b59b6','#1abc9c','#e67e22','#e91e63','#00bcd4'];
const PLAYER_TOKENS = ['🚀','🚂','🎩','🐶','🦁','🐉','🚁','⚓','🎸'];
const MAX_PLAYERS = 9;
const JAIL_FINE = 50;
const MAX_JAIL_TURNS = 3;
const BOT_NAMES = ['Maxwell', 'Victoria', 'Atlas', 'Zara', 'Neo', 'Luna', 'Kai', 'Iris'];

function rollDie(): number { return Math.floor(Math.random() * 6) + 1; }

export class GameRoom {
  public state: GameState;
  private deck: CardDeck;
  private io: Server;
  private disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private botActionTimer: ReturnType<typeof setTimeout> | null = null;
  private botAuctionTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private botTradeTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(io: Server, roomId: string, hostId: string, hostName: string) {
    this.io = io;
    this.deck = new CardDeck();
    this.state = {
      roomId,
      players: [],
      currentPlayerIndex: 0,
      gamePhase: 'lobby',
      turnPhase: 'roll',
      dice: null,
      doublesCount: 0,
      ownedProperties: {},
      houses: {},
      log: [],
      currentCard: null,
      pendingBuySpaceIndex: null,
      pendingTrade: null,
      pendingAuction: null,
      vacationPot: 0,
      settings: { ...DEFAULT_SETTINGS },
      hostId,
      boardOverrides: {},
      visitCounts: {},
      gameStats: {
        startedAt: 0,
        turnCount: 0,
        totalDoubles: 0,
        totalTrades: 0,
        netWorthHistory: [],
      },
    };
    this.addPlayer(hostId, hostName);
  }

  addPlayer(id: string, name: string): boolean {
    if (this.state.players.length >= MAX_PLAYERS) return false;
    if (this.state.gamePhase !== 'lobby') return false;
    const i = this.state.players.length;
    const usedTokens = new Set(this.state.players.map(p => p.token));
    const token = PLAYER_TOKENS.find(t => !usedTokens.has(t)) ?? PLAYER_TOKENS[i % PLAYER_TOKENS.length];
    this.state.players.push({
      id, name,
      color: PLAYER_COLORS[i],
      token,
      position: 0,
      money: this.state.settings.startingCash,
      properties: [],
      inJail: false,
      jailTurns: 0,
      getOutOfJailCards: 0,
      bankrupt: false,
      isReady: false,
      isBot: false,
    });
    return true;
  }

  removePlayer(id: string) {
    const idx = this.state.players.findIndex(p => p.id === id);
    if (idx === -1) return;

    if (this.state.gamePhase === 'playing') {
      const player = this.state.players[idx];
      if (player.bankrupt) return;
      // Start 2-minute grace period before auto-removing
      this.addLog(`⚠️ ${player.name} disconnected. Removing in 2 minutes if they don't return.`);
      this.broadcast();
      const timer = setTimeout(() => {
        this.disconnectTimers.delete(id);
        const p = this.getPlayer(id);
        if (p && !p.bankrupt) this.forceBankrupt(p, 'was removed after disconnecting.');
      }, 2 * 60 * 1000);
      this.disconnectTimers.set(id, timer);
    } else {
      this.state.players.splice(idx, 1);
      if (this.state.hostId === id && this.state.players.length > 0) {
        this.state.hostId = this.state.players[0].id;
      }
      this.broadcast();
    }
  }

  addBot(requesterId: string): string | null {
    if (requesterId !== this.state.hostId) return 'Only the host can add bots';
    if (this.state.gamePhase !== 'lobby') return 'Cannot add bots after game starts';
    if (this.state.players.length >= MAX_PLAYERS) return 'Room is full';

    const usedNames = new Set(this.state.players.map(p => p.name));
    const available = BOT_NAMES.filter(n => !usedNames.has(n));
    if (!available.length) return 'No more bot names available';

    const botId = `bot_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const ok = this.addPlayer(botId, available[0]);
    if (!ok) return 'Failed to add bot';

    const bot = this.state.players.find(p => p.id === botId)!;
    bot.isBot = true;
    bot.isReady = true;

    this.broadcast();
    return null;
  }

  removeBot(requesterId: string, botId: string): string | null {
    if (requesterId !== this.state.hostId) return 'Only the host can remove bots';
    if (this.state.gamePhase !== 'lobby') return 'Cannot remove bots after game starts';
    const bot = this.state.players.find(p => p.id === botId);
    if (!bot?.isBot) return 'Not a bot';

    const idx = this.state.players.findIndex(p => p.id === botId);
    this.state.players.splice(idx, 1);
    // Re-assign colors after removal, preserve custom tokens for real players
    this.state.players.forEach((p, i) => {
      p.color = PLAYER_COLORS[i];
      if (p.isBot) p.token = PLAYER_TOKENS[i];
    });

    this.broadcast();
    return null;
  }

  kickPlayer(requesterId: string, targetId: string): string | null {
    if (requesterId !== this.state.hostId) return 'Only the host can kick players';
    if (requesterId === targetId) return 'You cannot kick yourself';
    const target = this.getPlayer(targetId);
    if (!target) return 'Player not found';

    // Cancel any pending disconnect timer
    const timer = this.disconnectTimers.get(targetId);
    if (timer) { clearTimeout(timer); this.disconnectTimers.delete(targetId); }

    this.io.to(targetId).emit('kicked');

    if (this.state.gamePhase !== 'playing') {
      const idx = this.state.players.findIndex(p => p.id === targetId);
      this.state.players.splice(idx, 1);
      this.broadcast();
    } else {
      this.forceBankrupt(target, 'was kicked by the host.');
    }
    return null;
  }

  private forceBankrupt(player: Player, reason: string) {
    if (player.bankrupt) return;
    player.bankrupt = true;
    player.properties.forEach(si => { delete this.state.ownedProperties[si]; });
    player.properties = [];
    player.money = 0;
    // Cancel any pending trade involving this player
    if (this.state.pendingTrade &&
        (this.state.pendingTrade.fromId === player.id || this.state.pendingTrade.toId === player.id)) {
      this.state.pendingTrade = null;
    }
    this.addLog(`${player.name} ${reason} 💸`);

    const active = this.state.players.filter(p => !p.bankrupt);
    if (active.length === 1) {
      this.state.gamePhase = 'ended';
      this.addLog(`🏆 ${active[0].name} wins the game!`);
    } else if (this.currentPlayer().id === player.id) {
      // Force-advance turn without normal validation
      this.state.doublesCount = 0;
      this.state.dice = null;
      this.state.pendingBuySpaceIndex = null;
      this.state.currentCard = null;
      this.state.pendingAuction = null;
      let next = (this.state.currentPlayerIndex + 1) % this.state.players.length;
      let tries = 0;
      while (this.state.players[next].bankrupt && tries < this.state.players.length) {
        next = (next + 1) % this.state.players.length;
        tries++;
      }
      this.state.currentPlayerIndex = next;
      this.state.turnPhase = 'roll';
      this.addLog(`It's ${this.state.players[next].name}'s turn.`);
    }
    this.broadcast();
  }

  setReady(playerId: string, ready: boolean) {
    const p = this.getPlayer(playerId);
    if (p) p.isReady = ready;
    this.broadcast();
  }

  chooseToken(playerId: string, token: string): string | null {
    if (this.state.gamePhase !== 'lobby') return 'Cannot change token after game starts';
    const player = this.getPlayer(playerId);
    if (!player) return 'Player not found';
    if (!PLAYER_TOKENS.includes(token)) return 'Invalid token';
    const taken = this.state.players.find(p => p.id !== playerId && p.token === token);
    if (taken) return 'Token already taken by another player';
    player.token = token;
    this.broadcast();
    return null;
  }

  updateSettings(requesterId: string, patch: Partial<GameSettings>): string | null {
    if (requesterId !== this.state.hostId) return 'Only the host can change settings';
    if (this.state.gamePhase !== 'lobby') return 'Cannot change settings after game starts';
    Object.assign(this.state.settings, patch);
    // Apply starting cash to all already-joined players
    if (patch.startingCash !== undefined) {
      this.state.players.forEach(p => { p.money = patch.startingCash!; });
    }
    this.broadcast();
    return null;
  }

  startGame(requesterId: string): string | null {
    if (requesterId !== this.state.hostId) return 'Only the host can start';
    if (this.state.players.length < 2) return 'Need at least 2 players';
    const notReady = this.state.players.filter(p => p.id !== requesterId && !p.isReady);
    if (notReady.length > 0) return `${notReady.map(p => p.name).join(', ')} ${notReady.length === 1 ? 'is' : 'are'} not ready yet`;
    if (this.state.settings.randomizeOrder) {
      // Fisher-Yates shuffle
      const arr = this.state.players;
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      // Re-assign colors to reflect new order; preserve custom token choices
      arr.forEach((p, i) => { p.color = PLAYER_COLORS[i]; });
    }
    this.state.gamePhase = 'playing';
    this.state.turnPhase = 'roll';
    this.state.currentPlayerIndex = 0;

    // Shuffle property city names/flags if enabled
    if (this.state.settings.shuffleProperties) {
      this.state.boardOverrides = this.buildPropertyShuffle();
    }

    this.addLog('Game started! Good luck everyone! 🌵');
    this.state.gameStats.startedAt = Date.now();
    this.broadcast();
    return null;
  }

  rollDice(playerId: string): string | null {
    const err = this.validateTurn(playerId, 'roll');
    if (err) return err;
    const player = this.currentPlayer();
    const d1 = rollDie(), d2 = rollDie();
    this.state.dice = [d1, d2];
    const isDoubles = d1 === d2;

    if (player.inJail) {
      if (isDoubles) {
        player.inJail = false;
        player.jailTurns = 0;
        this.addLog(`${player.name} rolled doubles and got out of jail!`);
        this.movePlayer(player, d1 + d2);
      } else {
        player.jailTurns++;
        if (player.jailTurns >= MAX_JAIL_TURNS) {
          player.inJail = false;
          player.jailTurns = 0;
          this.chargeMoney(player, JAIL_FINE);
          this.addLog(`${player.name} paid $${JAIL_FINE} to get out of jail.`);
          this.movePlayer(player, d1 + d2);
        } else {
          this.addLog(`${player.name} is stuck in jail (turn ${player.jailTurns}/${MAX_JAIL_TURNS}).`);
          this.state.turnPhase = 'done';
        }
      }
      this.broadcast();
      return null;
    }

    if (isDoubles) {
      this.state.doublesCount++;
      this.state.gameStats.totalDoubles++;
      if (this.state.doublesCount >= 3) {
        this.addLog(`${player.name} rolled three doubles! Go to Jail!`);
        this.sendToJail(player);
        this.state.turnPhase = 'done';
        this.broadcast();
        return null;
      }
    } else {
      this.state.doublesCount = 0;
    }

    this.addLog(`${player.name} rolled ${d1}+${d2}=${d1+d2}${isDoubles ? ' (doubles!)' : ''}`);
    this.movePlayer(player, d1 + d2);
    this.broadcast();
    return null;
  }

  private movePlayer(player: Player, steps: number) {
    const oldPos = player.position;
    player.position = (player.position + steps) % TOTAL_SPACES;
    // Collect GO salary if passed or landed on GO
    const crossedGo = player.position < oldPos || player.position === 0;
    if (crossedGo && player.position !== 0) {
      // Passing through GO: $200
      this.addMoney(player, GO_SALARY);
      this.addLog(`${player.name} passed GO — collected $${GO_SALARY}! 💵`);
    }
    this.landOnSpace(player);
  }

  private landOnSpace(player: Player) {
    const space = BOARD_SPACES[player.position];
    this.addLog(`${player.name} landed on ${space.name}`);

    // Track visit counts
    this.state.visitCounts[player.position] = (this.state.visitCounts[player.position] ?? 0) + 1;

    switch (space.type) {
      case 'go':
        // Landing ON Go gives $300 (passing gives $200 separately)
        this.addMoney(player, 300);
        this.addLog(`${player.name} landed on GO — collected $300! 🎉`);
        this.state.turnPhase = 'done';
        break;

      case 'go_to_jail':
        this.sendToJail(player);
        this.state.turnPhase = 'done';
        break;

      case 'jail':
        // Just visiting — no penalty
        this.addLog(`${player.name} is just visiting Jail. 👋`);
        this.state.turnPhase = 'done';
        break;

      case 'free_parking':
        if (this.state.settings.vacationCash && this.state.vacationPot > 0) {
          const pot = this.state.vacationPot;
          this.addMoney(player, pot);
          this.state.vacationPot = 0;
          this.addLog(`${player.name} landed on Vacation and collected $${pot} from the pot! 🏖️`);
        } else {
          this.addLog(`${player.name} is on Vacation. 🏖️`);
        }
        this.state.turnPhase = 'done';
        break;

      case 'tax':
        const taxAmt = space.taxAmount ?? Math.floor(player.money * (space.taxPercent ?? 0) / 100);
        this.chargeMoney(player, taxAmt);
        if (this.state.settings.vacationCash) this.state.vacationPot += taxAmt;
        this.addLog(`${player.name} paid $${taxAmt} in tax.`);
        this.state.turnPhase = 'done';
        break;

      case 'treasure': {
        const card = this.deck.drawTreasure();
        this.state.currentCard = card;
        this.applyCardEffect(player, card);
        if (this.state.turnPhase !== 'buy_decision') {
          this.state.turnPhase = 'done';
        }
        break;
      }

      case 'surprise': {
        const card = this.deck.drawSurprise();
        this.state.currentCard = card;
        this.applyCardEffect(player, card);
        if (this.state.turnPhase !== 'buy_decision') {
          this.state.turnPhase = 'done';
        }
        break;
      }

      case 'property':
      case 'airport':
      case 'utility':
        const owned = this.state.ownedProperties[player.position];
        if (!owned) {
          this.state.pendingBuySpaceIndex = player.position;
          this.state.turnPhase = 'buy_decision';
        } else if (owned.ownerId === player.id) {
          this.state.turnPhase = 'done';
        } else if (owned.mortgaged) {
          this.addLog(`${space.name} is mortgaged. No rent due.`);
          this.state.turnPhase = 'done';
        } else {
          const owner = this.getPlayer(owned.ownerId)!;
          // noRentInJail: owner in jail → skip rent
          if (this.state.settings.noRentInJail && owner.inJail) {
            this.addLog(`${space.name}: ${owner.name} is in jail — no rent collected.`);
            this.state.turnPhase = 'done';
            break;
          }
          const rent = this.calculateRent(player.position, owned);
          this.chargeMoney(player, rent);
          this.addMoney(owner, rent);
          this.addLog(`${player.name} paid $${rent} rent to ${owner.name} for ${space.name}.`);
          this.state.turnPhase = 'done';
        }
        break;
    }
  }

  private calculateRent(spaceIndex: number, owned: OwnedProperty): number {
    const space = BOARD_SPACES[spaceIndex];
    if (!space.rents) return 0;

    if (space.type === 'utility') {
      const allUtils = getUtilitySpaces();
      const ownerUtils = allUtils.filter(i => this.state.ownedProperties[i]?.ownerId === owned.ownerId).length;
      const diceTotal = this.state.dice ? this.state.dice[0] + this.state.dice[1] : 7;
      return diceTotal * space.rents[ownerUtils - 1];
    }

    if (space.type === 'airport') {
      const allAirports = getAirportSpaces();
      const ownerAirports = allAirports.filter(i => this.state.ownedProperties[i]?.ownerId === owned.ownerId).length;
      return space.rents[ownerAirports - 1];
    }

    // Property
    if (owned.houses === 0) {
      const groupSpaces = getGroupSpaces(space.group!);
      const ownsAll = groupSpaces.every(i => this.state.ownedProperties[i]?.ownerId === owned.ownerId);
      const doubleRent = ownsAll && this.state.settings.doubleRentOnMonopoly;
      return doubleRent ? space.rents[0] * 2 : space.rents[0];
    }
    return space.rents[owned.houses];
  }

  buyProperty(playerId: string): string | null {
    const err = this.validateTurn(playerId, 'buy_decision');
    if (err) return err;
    const player = this.currentPlayer();
    const si = this.state.pendingBuySpaceIndex!;
    const space = BOARD_SPACES[si];
    if (!space.price) return 'Not purchasable';
    if (player.money < space.price) return 'Not enough money';

    this.chargeMoney(player, space.price);
    player.properties.push(si);
    this.state.ownedProperties[si] = { spaceIndex: si, ownerId: player.id, houses: 0, mortgaged: false };
    this.addLog(`${player.name} bought ${space.name} for $${space.price}.`);
    this.state.pendingBuySpaceIndex = null;
    this.state.turnPhase = 'done';
    this.broadcast();
    return null;
  }

  declineBuy(playerId: string): string | null {
    const err = this.validateTurn(playerId, 'buy_decision');
    if (err) return err;
    const si = this.state.pendingBuySpaceIndex!;
    this.state.pendingBuySpaceIndex = null;

    if (this.state.settings.auction) {
      // Start auction — all non-bankrupt players can bid
      const space = BOARD_SPACES[si];
      this.state.pendingAuction = {
        spaceIndex: si,
        bids: {},
        highestBidderId: null,
        highestBid: 0,
        passedPlayers: [],
      };
      this.state.turnPhase = 'done'; // current player can still end turn
      this.addLog(`🔨 Auction started for ${space.name}! Minimum bid: $1`);
    } else {
      this.state.turnPhase = 'done';
    }
    this.broadcast();
    return null;
  }

  // ── Auction ──

  placeBid(playerId: string, amount: number): string | null {
    if (!this.state.pendingAuction) return 'No auction in progress';
    const auction = this.state.pendingAuction;
    if (auction.passedPlayers.includes(playerId)) return 'You already passed on this auction';
    const player = this.getPlayer(playerId);
    if (!player || player.bankrupt) return 'Player not found';
    if (amount <= auction.highestBid) return `Bid must be higher than current highest ($${auction.highestBid})`;
    if (amount > player.money) return 'Not enough money';

    auction.bids[playerId] = amount;
    auction.highestBid = amount;
    auction.highestBidderId = playerId;
    const space = BOARD_SPACES[auction.spaceIndex];
    this.addLog(`${player.name} bids $${amount} for ${space.name}.`);
    this.broadcast();
    return null;
  }

  passAuction(playerId: string): string | null {
    if (!this.state.pendingAuction) return 'No auction in progress';
    const auction = this.state.pendingAuction;
    const player = this.getPlayer(playerId);
    if (!player) return 'Player not found';
    if (!auction.passedPlayers.includes(playerId)) {
      auction.passedPlayers.push(playerId);
    }

    const activePlayers = this.state.players.filter(p => !p.bankrupt && !auction.passedPlayers.includes(p.id));

    if (activePlayers.length === 0) {
      // Auction ends — highest bidder wins
      this.finalizeAuction();
    } else {
      this.addLog(`${player.name} passes on the auction.`);
    }
    this.broadcast();
    return null;
  }

  private finalizeAuction() {
    const auction = this.state.pendingAuction!;
    const space = BOARD_SPACES[auction.spaceIndex];
    if (auction.highestBidderId) {
      const winner = this.getPlayer(auction.highestBidderId)!;
      this.chargeMoney(winner, auction.highestBid);
      winner.properties.push(auction.spaceIndex);
      this.state.ownedProperties[auction.spaceIndex] = {
        spaceIndex: auction.spaceIndex,
        ownerId: winner.id,
        houses: 0,
        mortgaged: false,
      };
      this.addLog(`🔨 ${winner.name} won the auction for ${space.name} at $${auction.highestBid}!`);
    } else {
      this.addLog(`🔨 No bids — ${space.name} remains unowned.`);
    }
    this.state.pendingAuction = null;
  }

  resolveCard(playerId: string): string | null {
    const err = this.validateTurn(playerId, 'card');
    if (err) return err;
    const player = this.currentPlayer();
    const card = this.state.currentCard!;
    this.applyCardEffect(player, card);
    this.state.currentCard = null;
    // If the effect didn't change the phase (e.g. moved to unowned property),
    // always finish the card phase. Only preserve buy_decision set by landOnSpace.
    if (this.state.turnPhase === 'card') {
      this.state.turnPhase = 'done';
    }
    this.broadcast();
    return null;
  }

  private applyCardEffect(player: Player, card: CardEvent) {
    const { effect } = card;
    switch (effect.type) {
      case 'gain_money':
        this.addMoney(player, effect.amount!);
        this.addLog(`${player.name} gained $${effect.amount!} (${card.title}).`);
        break;
      case 'lose_money':
        this.chargeMoney(player, effect.amount!);
        if (this.state.settings.vacationCash) this.state.vacationPot += effect.amount!;
        this.addLog(`${player.name} paid $${effect.amount!} (${card.title}).`);
        break;
      case 'get_out_of_jail':
        player.getOutOfJailCards++;
        this.addLog(`${player.name} got a Get Out of Jail Free card!`);
        break;
      case 'go_to_jail':
        this.sendToJail(player);
        break;
      case 'move_to':
        if (effect.position === -1) {
          // Nearest airport
          const airports = getAirportSpaces();
          let nearest = airports[0];
          let minDist = TOTAL_SPACES;
          for (const ai of airports) {
            const dist = (ai - player.position + TOTAL_SPACES) % TOTAL_SPACES;
            if (dist < minDist) { minDist = dist; nearest = ai; }
          }
          const old = player.position;
          player.position = nearest;
          if (nearest < old) this.addMoney(player, GO_SALARY);
          this.addLog(`${player.name} moved to nearest airport: ${BOARD_SPACES[nearest].name}.`);
          this.landOnSpace(player);
        } else {
          const old = player.position;
          player.position = effect.position!;
          if (effect.position! < old) this.addMoney(player, GO_SALARY);
          this.addLog(`${player.name} moved to ${BOARD_SPACES[effect.position!].name}.`);
          this.landOnSpace(player);
        }
        break;
      case 'move_back':
        player.position = (player.position - effect.spaces! + TOTAL_SPACES) % TOTAL_SPACES;
        this.addLog(`${player.name} moved back ${effect.spaces!} spaces.`);
        this.landOnSpace(player);
        break;
      case 'gain_per_player':
        const gain = effect.amount! * (this.state.players.filter(p => !p.bankrupt && p.id !== player.id).length);
        this.addMoney(player, gain);
        this.state.players.forEach(p => {
          if (p.id !== player.id && !p.bankrupt) this.chargeMoney(p, effect.amount!);
        });
        this.addLog(`${player.name} collected $${effect.amount!} from each player.`);
        break;
      case 'pay_per_player':
        const pay = effect.amount! * (this.state.players.filter(p => !p.bankrupt && p.id !== player.id).length);
        this.chargeMoney(player, pay);
        this.state.players.forEach(p => {
          if (p.id !== player.id && !p.bankrupt) this.addMoney(p, effect.amount!);
        });
        this.addLog(`${player.name} paid $${effect.amount!} to each player.`);
        break;
      case 'street_repairs': {
        const houseRate = effect.houseRate ?? 40;
        const hotelRate = effect.hotelRate ?? 115;
        let total = 0;
        for (const idx of player.properties) {
          const owned = this.state.ownedProperties[idx];
          if (owned && !owned.mortgaged) {
            if (owned.houses === 5) total += hotelRate;
            else total += owned.houses * houseRate;
          }
        }
        if (total > 0) {
          this.chargeMoney(player, total);
          this.addLog(`${player.name} paid $${total} for street repairs.`);
        } else {
          this.addLog(`${player.name} drew Street Repairs but owns no buildings.`);
        }
        break;
      }
      case 'random_city': {
        const citySpaces = BOARD_SPACES.filter(s => s.type === 'property');
        const dest = citySpaces[Math.floor(Math.random() * citySpaces.length)];
        const oldPos = player.position;
        player.position = dest.index;
        if (dest.index < oldPos) this.addMoney(player, GO_SALARY);
        this.addLog(`${player.name} is whisked away to ${dest.flag ?? ''} ${dest.name}!`);
        this.landOnSpace(player);
        break;
      }
    }
  }

  payJailFine(playerId: string): string | null {
    if (this.state.gamePhase !== 'playing') return 'Game not in progress';
    const player = this.getPlayer(playerId);
    if (!player) return 'Player not found';
    if (!player.inJail) return 'Not in jail';
    if (player.money < JAIL_FINE) return 'Not enough money';
    this.chargeMoney(player, JAIL_FINE);
    player.inJail = false;
    player.jailTurns = 0;
    this.addLog(`${player.name} paid $${JAIL_FINE} to get out of jail. They'll roll next turn.`);
    this.state.turnPhase = 'done';
    this.broadcast();
    return null;
  }

  useJailCard(playerId: string): string | null {
    if (this.state.gamePhase !== 'playing') return 'Game not in progress';
    const player = this.getPlayer(playerId);
    if (!player) return 'Player not found';
    if (!player.inJail) return 'Not in jail';
    if (player.getOutOfJailCards < 1) return 'No get-out-of-jail cards';
    player.getOutOfJailCards--;
    player.inJail = false;
    player.jailTurns = 0;
    this.addLog(`${player.name} used a Get Out of Jail Free card! They'll roll next turn.`);
    this.state.turnPhase = 'done';
    this.broadcast();
    return null;
  }

  buyHouse(playerId: string, spaceIndex: number): string | null {
    if (this.state.gamePhase !== 'playing') return 'Game not in progress';
    const player = this.getPlayer(playerId);
    if (!player) return 'Player not found';
    const owned = this.state.ownedProperties[spaceIndex];
    if (!owned || owned.ownerId !== playerId) return 'You don\'t own this property';
    const space = BOARD_SPACES[spaceIndex];
    if (space.type !== 'property') return 'Can only build on properties';
    if (!space.houseCost) return 'No house cost defined';
    if (owned.houses >= 5) return 'Already has a hotel';
    if (owned.mortgaged) return 'Property is mortgaged';

    // Must own all in group
    const groupSpaces = getGroupSpaces(space.group!);
    const ownsAll = groupSpaces.every(i => this.state.ownedProperties[i]?.ownerId === playerId);
    if (!ownsAll) return 'Must own all properties in the group';

    // Even building rule (if enabled)
    if (this.state.settings.evenBuild) {
      const minHouses = Math.min(...groupSpaces.map(i => this.state.ownedProperties[i]?.houses ?? 0));
      if (owned.houses > minHouses) return 'Must build evenly across the group';
    }

    if (player.money < space.houseCost) return 'Not enough money';

    this.chargeMoney(player, space.houseCost);
    owned.houses++;
    const label = owned.houses === 5 ? 'hotel' : `${owned.houses} house(s)`;
    this.addLog(`${player.name} built a ${label} on ${space.name}.`);
    this.broadcast();
    return null;
  }

  sellHouse(playerId: string, spaceIndex: number): string | null {
    if (this.state.gamePhase !== 'playing') return 'Game not in progress';
    const player = this.getPlayer(playerId);
    if (!player) return 'Player not found';
    const owned = this.state.ownedProperties[spaceIndex];
    if (!owned || owned.ownerId !== playerId) return 'You don\'t own this property';
    const space = BOARD_SPACES[spaceIndex];
    if (owned.houses === 0) return 'No houses to sell';

    const groupSpaces = getGroupSpaces(space.group!);
    const maxHouses = Math.max(...groupSpaces.map(i => this.state.ownedProperties[i]?.houses ?? 0));
    if (owned.houses < maxHouses) return 'Must sell evenly across the group';

    const sellPrice = Math.floor((space.houseCost ?? 0) / 2);
    owned.houses--;
    this.addMoney(player, sellPrice);
    this.addLog(`${player.name} sold a house on ${space.name} for $${sellPrice}.`);
    this.broadcast();
    return null;
  }

  mortgageProperty(playerId: string, spaceIndex: number): string | null {
    if (!this.state.settings.mortgageEnabled) return 'Mortgaging is disabled for this game';
    if (this.state.gamePhase !== 'playing') return 'Game not in progress';
    const player = this.getPlayer(playerId);
    if (!player) return 'Player not found';
    const owned = this.state.ownedProperties[spaceIndex];
    if (!owned || owned.ownerId !== playerId) return 'You don\'t own this property';
    if (owned.mortgaged) return 'Already mortgaged';
    if (owned.houses > 0) return 'Must sell houses first';
    const space = BOARD_SPACES[spaceIndex];
    this.addMoney(player, space.mortgageValue ?? 0);
    owned.mortgaged = true;
    this.addLog(`${player.name} mortgaged ${space.name} for $${space.mortgageValue}.`);
    this.broadcast();
    return null;
  }

  unmortgageProperty(playerId: string, spaceIndex: number): string | null {
    if (this.state.gamePhase !== 'playing') return 'Game not in progress';
    const player = this.getPlayer(playerId);
    if (!player) return 'Player not found';
    const owned = this.state.ownedProperties[spaceIndex];
    if (!owned || owned.ownerId !== playerId) return 'You don\'t own this property';
    if (!owned.mortgaged) return 'Not mortgaged';
    const space = BOARD_SPACES[spaceIndex];
    const cost = Math.floor((space.mortgageValue ?? 0) * 1.1);
    if (player.money < cost) return 'Not enough money';
    this.chargeMoney(player, cost);
    owned.mortgaged = false;
    this.addLog(`${player.name} unmortgaged ${space.name} for $${cost}.`);
    this.broadcast();
    return null;
  }

  endTurn(playerId: string): string | null {
    const err = this.validateTurn(playerId, 'done');
    if (err) return err;

    this.state.currentCard = null;
    const isDoubles = this.state.dice ? this.state.dice[0] === this.state.dice[1] : false;
    const currentPlayer = this.currentPlayer();

    if (isDoubles && !currentPlayer.inJail && !currentPlayer.bankrupt && this.state.doublesCount > 0) {
      // Player gets another turn
      this.state.turnPhase = 'roll';
      this.state.dice = null;
      this.addLog(`${currentPlayer.name} rolled doubles — rolls again!`);
    } else {
      this.state.doublesCount = 0;
      this.state.gameStats.turnCount++;
      const snapshot: Record<string, number> = {};
      this.state.players.forEach(p => {
        if (p.bankrupt) return;
        const propValue = p.properties.reduce((sum, si) => {
          const space = BOARD_SPACES[si];
          return sum + (space.mortgageValue ?? 0) * 2;
        }, 0);
        snapshot[p.name] = p.money + propValue;
      });
      if (Object.keys(snapshot).length > 0) {
        this.state.gameStats.netWorthHistory.push({
          turn: this.state.gameStats.turnCount,
          values: snapshot,
        });
        if (this.state.gameStats.netWorthHistory.length > 100) {
          this.state.gameStats.netWorthHistory.shift();
        }
      }
      this.state.dice = null;
      // Advance to next non-bankrupt player
      let next = (this.state.currentPlayerIndex + 1) % this.state.players.length;
      let tries = 0;
      while (this.state.players[next].bankrupt && tries < this.state.players.length) {
        next = (next + 1) % this.state.players.length;
        tries++;
      }
      this.state.currentPlayerIndex = next;
      this.state.turnPhase = 'roll';
      const name = this.state.players[next].name;
      this.addLog(`It's ${name}'s turn.`);
    }

    // Check win condition
    const activePlayers = this.state.players.filter(p => !p.bankrupt);
    if (activePlayers.length === 1) {
      this.state.gamePhase = 'ended';
      this.addLog(`🏆 ${activePlayers[0].name} wins!`);
    }

    this.broadcast();
    return null;
  }

  declareBankruptcy(playerId: string): string | null {
    if (this.state.gamePhase !== 'playing') return 'Game not in progress';
    const player = this.getPlayer(playerId);
    if (!player) return 'Player not found';
    player.bankrupt = true;
    player.properties.forEach(si => {
      delete this.state.ownedProperties[si];
    });
    player.properties = [];
    player.money = 0;
    this.addLog(`${player.name} declared bankruptcy. 💸`);

    const active = this.state.players.filter(p => !p.bankrupt);
    if (active.length === 1) {
      this.state.gamePhase = 'ended';
      this.addLog(`🏆 ${active[0].name} wins the game!`);
    } else if (this.currentPlayer().id === playerId) {
      this.endTurn(playerId);
      return null;
    }
    this.broadcast();
    return null;
  }

  // ── Trading ──

  proposeTrade(fromId: string, offer: Omit<TradeOffer, 'id' | 'fromId'>): string | null {
    if (this.state.gamePhase !== 'playing') return 'Game not in progress';
    if (this.state.pendingTrade) return 'A trade is already pending';
    const from = this.getPlayer(fromId);
    const to = this.getPlayer(offer.toId);
    if (!from || !to) return 'Player not found';
    if (from.bankrupt || to.bankrupt) return 'Cannot trade with a bankrupt player';
    if (fromId === offer.toId) return 'Cannot trade with yourself';

    // Validate sender owns offered properties
    for (const si of offer.offerProperties) {
      if (!from.properties.includes(si)) return `You don't own property at index ${si}`;
    }
    // Validate receiver owns requested properties
    for (const si of offer.requestProperties) {
      if (!to.properties.includes(si)) return `${to.name} doesn't own property at index ${si}`;
    }
    if (offer.offerMoney < 0 || offer.requestMoney < 0) return 'Money amounts must be non-negative';
    if (offer.offerMoney > from.money) return 'Not enough money to offer';
    if (offer.offerJailCards > from.getOutOfJailCards) return 'Not enough jail cards to offer';
    if (offer.requestJailCards > to.getOutOfJailCards) return `${to.name} doesn't have that many jail cards`;

    const id = Math.random().toString(36).slice(2, 8);
    this.state.pendingTrade = { id, fromId, ...offer };
    this.addLog(`${from.name} proposed a trade to ${to.name}.`);
    this.broadcast();
    return null;
  }

  acceptTrade(acceptorId: string, tradeId: string): string | null {
    if (!this.state.pendingTrade) return 'No pending trade';
    const trade = this.state.pendingTrade;
    if (trade.id !== tradeId) return 'Trade ID mismatch';
    if (trade.toId !== acceptorId) return 'This trade is not for you';

    const from = this.getPlayer(trade.fromId);
    const to = this.getPlayer(trade.toId);
    if (!from || !to) return 'Player not found';

    // Re-validate everything is still valid
    for (const si of trade.offerProperties) {
      if (!from.properties.includes(si)) { this.state.pendingTrade = null; this.broadcast(); return 'Trade is no longer valid (sender lost a property)'; }
    }
    for (const si of trade.requestProperties) {
      if (!to.properties.includes(si)) { this.state.pendingTrade = null; this.broadcast(); return 'Trade is no longer valid (you lost a property)'; }
    }
    if (from.money < trade.offerMoney) { this.state.pendingTrade = null; this.broadcast(); return 'Trade is no longer valid (sender cannot afford it)'; }
    if (to.money < trade.requestMoney) { this.state.pendingTrade = null; this.broadcast(); return 'You cannot afford this trade'; }

    // Execute transfer
    from.money -= trade.offerMoney;
    to.money   += trade.offerMoney;
    to.money   -= trade.requestMoney;
    from.money += trade.requestMoney;

    from.getOutOfJailCards -= trade.offerJailCards;
    to.getOutOfJailCards   += trade.offerJailCards;
    to.getOutOfJailCards   -= trade.requestJailCards;
    from.getOutOfJailCards += trade.requestJailCards;

    for (const si of trade.offerProperties) {
      from.properties = from.properties.filter(p => p !== si);
      to.properties.push(si);
      this.state.ownedProperties[si].ownerId = to.id;
      // Remove houses — can't keep houses through a trade without owning monopoly
      this.state.ownedProperties[si].houses = 0;
    }
    for (const si of trade.requestProperties) {
      to.properties = to.properties.filter(p => p !== si);
      from.properties.push(si);
      this.state.ownedProperties[si].ownerId = from.id;
      this.state.ownedProperties[si].houses = 0;
    }

    this.addLog(`Trade accepted! ${from.name} ↔ ${to.name}.`);
    this.state.pendingTrade = null;
    this.state.gameStats.totalTrades++;
    this.broadcast();
    return null;
  }

  declineTrade(declinerId: string, tradeId: string): string | null {
    if (!this.state.pendingTrade) return 'No pending trade';
    if (this.state.pendingTrade.id !== tradeId) return 'Trade ID mismatch';
    if (this.state.pendingTrade.toId !== declinerId && this.state.pendingTrade.fromId !== declinerId) {
      return 'Not your trade';
    }
    const decliner = this.getPlayer(declinerId);
    this.addLog(`${decliner?.name ?? declinerId} declined the trade.`);
    this.state.pendingTrade = null;
    this.broadcast();
    return null;
  }

  // ── Helpers ──

  private sendToJail(player: Player) {
    player.position = JAIL_INDEX;
    player.inJail = true;
    player.jailTurns = 0;
    this.addLog(`${player.name} went to Jail! 🚔`);
  }

  private addMoney(player: Player, amount: number) {
    player.money += amount;
  }

  private chargeMoney(player: Player, amount: number) {
    player.money -= amount;
    if (player.money < 0) player.money = 0; // Bankruptcy handled separately
  }

  private addLog(msg: string) {
    this.state.log.unshift(msg);
    if (this.state.log.length > 50) this.state.log.pop();
  }

  private currentPlayer(): Player {
    return this.state.players[this.state.currentPlayerIndex];
  }

  private getPlayer(id: string): Player | undefined {
    return this.state.players.find(p => p.id === id);
  }

  private validateTurn(playerId: string, phase: TurnPhase): string | null {
    if (this.state.gamePhase !== 'playing') return 'Game not in progress';
    if (this.currentPlayer().id !== playerId) return 'Not your turn';
    if (this.state.turnPhase !== phase) return `Wrong phase: expected ${phase}, got ${this.state.turnPhase}`;
    return null;
  }

  rejoinPlayer(newSocketId: string, playerName: string): { ok: boolean; error?: string; state?: GameState; myId?: string } {
    if (this.state.gamePhase !== 'playing') return { ok: false, error: 'Game is not in progress' };
    const player = this.state.players.find(p => p.name === playerName && !p.bankrupt);
    if (!player) return { ok: false, error: 'Player not found in this game' };

    const oldId = player.id;

    // Cancel any pending disconnect timer
    const timer = this.disconnectTimers.get(oldId);
    if (timer) { clearTimeout(timer); this.disconnectTimers.delete(oldId); }

    // Reassign socket ID
    player.id = newSocketId;
    if (this.state.hostId === oldId) this.state.hostId = newSocketId;

    this.addLog(`🔄 ${player.name} reconnected!`);
    this.broadcast();
    return { ok: true, state: this.state, myId: newSocketId };
  }

  broadcast() {
    this.io.to(this.state.roomId).emit('game_state', this.state);
    if (this.state.gamePhase === 'ended') {
      this.clearBotTimers();
      return;
    }
    this.scheduleBotAction();
    this.scheduleBotAuctions();
    this.scheduleBotTradeResponse();
  }

  // ── Bot AI ───────────────────────────────────────────────────────────────

  private clearBotTimers() {
    if (this.botActionTimer) { clearTimeout(this.botActionTimer); this.botActionTimer = null; }
    this.botAuctionTimers.forEach(t => clearTimeout(t));
    this.botAuctionTimers.clear();
    if (this.botTradeTimer) { clearTimeout(this.botTradeTimer); this.botTradeTimer = null; }
  }

  private scheduleBotAction() {
    if (this.botActionTimer) { clearTimeout(this.botActionTimer); this.botActionTimer = null; }
    if (this.state.gamePhase !== 'playing') return;

    const cp = this.currentPlayer();
    if (!cp.isBot || cp.bankrupt) return;

    const phase = this.state.turnPhase;
    const botId = cp.id;

    if (phase === 'roll') {
      // In jail: prefer using card, then paying fine on later turns, then just rolling
      if (cp.inJail) {
        if (cp.getOutOfJailCards > 0) {
          this.botActionTimer = setTimeout(() => { this.botActionTimer = null; this.useJailCard(botId); }, 1200);
          return;
        }
        if (cp.money >= JAIL_FINE && cp.jailTurns >= 1) {
          this.botActionTimer = setTimeout(() => { this.botActionTimer = null; this.payJailFine(botId); }, 1200);
          return;
        }
      }
      this.botActionTimer = setTimeout(() => { this.botActionTimer = null; this.rollDice(botId); }, 1500);

    } else if (phase === 'buy_decision') {
      this.botActionTimer = setTimeout(() => { this.botActionTimer = null; this.botBuyDecision(botId); }, 1000);

    } else if (phase === 'done') {
      this.botActionTimer = setTimeout(() => {
        this.botActionTimer = null;
        this.botBuildHouses(botId);
        // Occasionally propose a trade (20% chance per turn if no trade pending)
        if (!this.state.pendingTrade && Math.random() < 0.20) {
          this.botProposeTrade(botId);
        }
        this.endTurn(botId);
      }, 900);
    }
  }

  private botBuyDecision(botId: string) {
    if (this.state.turnPhase !== 'buy_decision') return;
    const bot = this.state.players.find(p => p.id === botId);
    if (!bot) return;
    const si = this.state.pendingBuySpaceIndex;
    if (si === null) return;
    const space = BOARD_SPACES[si];
    const price = space.price ?? 0;

    let minBuffer = 1.5;

    if (space.type === 'property') {
      const groupSpaces = getGroupSpaces(space.group!);
      const willCompleteMonopoly = groupSpaces.every(i => i === si || this.state.ownedProperties[i]?.ownerId === botId);
      const hasGroupMember = groupSpaces.some(i => i !== si && this.state.ownedProperties[i]?.ownerId === botId);
      minBuffer = willCompleteMonopoly ? 1.0 : hasGroupMember ? 1.2 : 1.5;
    } else if (space.type === 'airport') {
      const ownedAirports = getAirportSpaces().filter(i => this.state.ownedProperties[i]?.ownerId === botId).length;
      minBuffer = ownedAirports >= 1 ? 1.1 : 1.4;
    } else if (space.type === 'utility') {
      const ownedUtils = getUtilitySpaces().filter(i => this.state.ownedProperties[i]?.ownerId === botId).length;
      minBuffer = ownedUtils >= 1 ? 1.1 : 1.4;
    }

    if (bot.money >= price * minBuffer) {
      this.buyProperty(botId);
    } else {
      this.declineBuy(botId);
    }
  }

  private botBuildHouses(botId: string) {
    const bot = this.state.players.find(p => p.id === botId);
    if (!bot) return;
    const BUFFER = 350;
    let keepBuilding = true;
    let safety = 0;
    while (keepBuilding && safety < 30) {
      keepBuilding = false;
      safety++;
      for (const si of [...bot.properties]) {
        const space = BOARD_SPACES[si];
        if (space.type !== 'property') continue;
        const owned = this.state.ownedProperties[si];
        if (!owned || owned.mortgaged || owned.houses >= 5) continue;
        const groupSpaces = getGroupSpaces(space.group!);
        const ownsAll = groupSpaces.every(i => this.state.ownedProperties[i]?.ownerId === botId);
        if (!ownsAll) continue;
        if (bot.money - (space.houseCost ?? 0) < BUFFER) continue;
        const err = this.buyHouse(botId, si);
        if (!err) { keepBuilding = true; break; } // break to re-check even-building
      }
    }
  }

  private scheduleBotAuctions() {
    if (!this.state.pendingAuction) {
      this.botAuctionTimers.forEach(t => clearTimeout(t));
      this.botAuctionTimers.clear();
      return;
    }
    const auction = this.state.pendingAuction;

    this.state.players.forEach(bot => {
      if (!bot.isBot || bot.bankrupt) return;
      if (auction.passedPlayers.includes(bot.id)) return;
      if (auction.highestBidderId === bot.id) return; // already winning
      if (this.botAuctionTimers.has(bot.id)) return;  // already scheduled

      const t = setTimeout(() => {
        this.botAuctionTimers.delete(bot.id);
        if (!this.state.pendingAuction) return;
        const auc = this.state.pendingAuction;
        const space = BOARD_SPACES[auc.spaceIndex];
        const price = space.price ?? 100;

        // Bid higher if completing a monopoly or airport set
        const groupSpaces = space.group ? getGroupSpaces(space.group) : [];
        const willCompleteMonopoly = groupSpaces.length > 0 &&
          groupSpaces.every(i => i === auc.spaceIndex || auc.highestBidderId === bot.id ||
            this.state.ownedProperties[i]?.ownerId === bot.id);
        const hasGroupMember = groupSpaces.some(i => this.state.ownedProperties[i]?.ownerId === bot.id);
        const airports = getAirportSpaces();
        const ownedAirports = airports.filter(i => this.state.ownedProperties[i]?.ownerId === bot.id).length;

        let bidCap = price * (willCompleteMonopoly ? 1.2 : hasGroupMember ? 0.95 : ownedAirports > 0 && space.type === 'airport' ? 0.9 : 0.65);
        bidCap = Math.min(bidCap, bot.money - 200);

        const currentHigh = auc.highestBid;
        const nextBid = Math.max(currentHigh + 5, Math.floor(price * 0.25));
        if (nextBid > bidCap || bot.money < nextBid) {
          this.passAuction(bot.id);
        } else {
          this.placeBid(bot.id, nextBid);
        }
      }, 1200 + Math.random() * 800);

      this.botAuctionTimers.set(bot.id, t);
    });
  }

  private scheduleBotTradeResponse() {
    if (!this.state.pendingTrade) return;
    const trade = this.state.pendingTrade;
    const bot = this.state.players.find(p => p.id === trade.toId);
    if (!bot?.isBot) return;
    if (this.botTradeTimer) clearTimeout(this.botTradeTimer);
    this.botTradeTimer = setTimeout(() => {
      this.botTradeTimer = null;
      if (!this.state.pendingTrade || this.state.pendingTrade.id !== trade.id) return;
      const accept = this.botEvaluateTrade(bot, trade);
      if (accept) {
        this.acceptTrade(bot.id, trade.id);
      } else {
        this.declineTrade(bot.id, trade.id);
      }
    }, 1500 + Math.random() * 1000);
  }

  /** Returns true if the trade is favorable (or neutral) for bot */
  private botEvaluateTrade(bot: Player, trade: TradeOffer): boolean {
    const isReceiver = trade.toId === bot.id;
    const receiving = {
      properties: isReceiver ? trade.requestProperties : trade.offerProperties,
      money: isReceiver ? trade.requestMoney : trade.offerMoney,
      jailCards: isReceiver ? trade.requestJailCards : trade.offerJailCards,
    };
    const giving = {
      properties: isReceiver ? trade.offerProperties : trade.requestProperties,
      money: isReceiver ? trade.offerMoney : trade.requestMoney,
      jailCards: isReceiver ? trade.offerJailCards : trade.requestJailCards,
    };

    const propValue = (indices: number[]) => indices.reduce((sum, si) => {
      const space = BOARD_SPACES[si];
      const base = space.price ?? 0;
      // Bonus if completing a monopoly
      const groupSpaces = space.group ? getGroupSpaces(space.group) : [];
      const alreadyOwned = groupSpaces.filter(i => i !== si && this.state.ownedProperties[i]?.ownerId === bot.id).length;
      const completesGroup = alreadyOwned === groupSpaces.length - 1;
      return sum + base * (completesGroup ? 1.6 : alreadyOwned > 0 ? 1.2 : 1.0);
    }, 0);

    const receiveValue = propValue(receiving.properties) + receiving.money + receiving.jailCards * 50;
    const giveValue    = propValue(giving.properties)    + giving.money    + giving.jailCards * 50;

    // Accept if receiving at least 90% of value given, or completing a monopoly
    const completesMonopoly = receiving.properties.some(si => {
      const space = BOARD_SPACES[si];
      if (!space.group) return false;
      const groupSpaces = getGroupSpaces(space.group);
      return groupSpaces.every(i => i === si || this.state.ownedProperties[i]?.ownerId === bot.id);
    });

    if (completesMonopoly) return receiveValue >= giveValue * 0.75;
    return receiveValue >= giveValue * 0.9;
  }

  /** Bot tries to propose a beneficial trade at end of turn */
  private botProposeTrade(botId: string) {
    if (this.state.pendingTrade) return; // trade already pending
    const bot = this.state.players.find(p => p.id === botId);
    if (!bot || bot.bankrupt) return;

    const activePlayers = this.state.players.filter(p => !p.bankrupt && p.id !== botId);
    if (!activePlayers.length) return;

    // Find the best trade opportunity: bot gives something it doesn't need,
    // gets something that completes/advances a monopoly
    for (const target of activePlayers) {
      for (const wantSi of target.properties) {
        const space = BOARD_SPACES[wantSi];
        if (!space.group) continue;
        const owned = this.state.ownedProperties[wantSi];
        if (owned?.mortgaged) continue;
        const groupSpaces = getGroupSpaces(space.group);
        const botOwnsInGroup = groupSpaces.filter(i => this.state.ownedProperties[i]?.ownerId === botId).length;
        if (botOwnsInGroup === 0) continue; // no stake in this group

        // Find something to offer that target might want
        for (const offerSi of bot.properties) {
          const offerSpace = BOARD_SPACES[offerSi];
          const offerOwned = this.state.ownedProperties[offerSi];
          if (offerOwned?.mortgaged || (offerOwned?.houses ?? 0) > 0) continue;
          if (offerSpace.group === space.group) continue; // don't offer from same group

          // Offer a fair trade: property price parity
          const priceDiff = (offerSpace.price ?? 0) - (space.price ?? 0);
          const offerMoney = priceDiff > 0 ? 0 : Math.min(-priceDiff, Math.floor(bot.money * 0.3));
          const requestMoney = priceDiff > 0 ? Math.min(priceDiff, Math.floor(target.money * 0.3)) : 0;

          const err = this.proposeTrade(botId, {
            toId: target.id,
            offerProperties: [offerSi],
            offerMoney,
            offerJailCards: 0,
            requestProperties: [wantSi],
            requestMoney,
            requestJailCards: 0,
          });
          if (!err) return; // proposed one trade, done
        }
      }
    }
  }

  /** Build a shuffled mapping of property city names & flags */
  private buildPropertyShuffle(): Record<number, { name: string; flag?: string }> {
    const propSpaces = BOARD_SPACES.filter(s => s.type === 'property');
    const overrides: Record<number, { name: string; flag?: string }> = {};
    // Extract city name+flag pairs and shuffle them
    const cities = propSpaces.map(s => ({ name: s.name, flag: s.flag }));
    for (let i = cities.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cities[i], cities[j]] = [cities[j], cities[i]];
    }
    propSpaces.forEach((s, i) => {
      overrides[s.index] = cities[i];
    });
    return overrides;
  }
}
