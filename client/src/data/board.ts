import { BoardSpace } from '../types/game';

export const TOTAL_SPACES    = 60;
export const CORNER_INDICES  = [0, 15, 30, 45];
export const JAIL_INDEX      = 15;
export const GO_TO_JAIL_INDEX = 45;
export const GO_INDEX        = 0;
export const GO_SALARY       = 200;
export const STARTING_MONEY  = 2000;

export const BOARD_SPACES: BoardSpace[] = [
  // ── CORNER 0 ────────────────────────────────────
  { index: 0,  name: 'GO',             type: 'go' },

  // ── BOTTOM  1-14  (left → right)  brown(2) + light_blue(3) + pink(4) ──
  { index: 1,  name: 'São Paulo',      type: 'property', group: 'brown',      price:  60, rents: [2,10,30,90,160,250],         houseCost:  50, mortgageValue:  30, flag: '🇧🇷' },
  { index: 2,  name: 'Rio de Janeiro', type: 'property', group: 'brown',      price:  80, rents: [4,20,60,180,320,450],         houseCost:  50, mortgageValue:  40, flag: '🇧🇷' },
  { index: 3,  name: 'Treasure',       type: 'treasure' },
  { index: 4,  name: 'Income Tax',     type: 'tax',      taxPercent: 10 },
  { index: 5,  name: 'JFK Airport',    type: 'airport',  price: 200, rents: [25,50,100,200], mortgageValue: 100, flag: '✈️' },
  { index: 6,  name: 'Mumbai',         type: 'property', group: 'light_blue', price: 100, rents: [6,30,90,270,400,550],         houseCost:  50, mortgageValue:  50, flag: '🇮🇳' },
  { index: 7,  name: 'Delhi',          type: 'property', group: 'light_blue', price: 110, rents: [8,40,100,300,450,600],        houseCost:  50, mortgageValue:  55, flag: '🇮🇳' },
  { index: 8,  name: 'Bangalore',      type: 'property', group: 'light_blue', price: 120, rents: [10,50,150,450,625,750],       houseCost:  50, mortgageValue:  60, flag: '🇮🇳' },
  { index: 9,  name: 'Surprise',       type: 'surprise' },
  { index: 10, name: 'Sydney',         type: 'property', group: 'pink',       price: 140, rents: [12,60,180,500,700,900],       houseCost: 100, mortgageValue:  70, flag: '🇦🇺' },
  { index: 11, name: 'Melbourne',      type: 'property', group: 'pink',       price: 160, rents: [14,70,200,550,750,950],       houseCost: 100, mortgageValue:  80, flag: '🇦🇺' },
  { index: 12, name: 'Brisbane',       type: 'property', group: 'pink',       price: 180, rents: [16,80,220,600,800,1000],      houseCost: 100, mortgageValue:  90, flag: '🇦🇺' },
  { index: 13, name: 'Perth',          type: 'property', group: 'pink',       price: 200, rents: [18,90,250,700,875,1050],      houseCost: 100, mortgageValue: 100, flag: '🇦🇺' },
  { index: 14, name: 'Surprise',       type: 'surprise' },

  // ── CORNER 15 ───────────────────────────────────
  { index: 15, name: 'Jail',           type: 'jail' },

  // ── RIGHT  16-29  (bottom → top)  orange(3) + red(3) ──────────────────
  { index: 16, name: 'Surprise',       type: 'surprise' },
  { index: 17, name: 'Tokyo',          type: 'property', group: 'orange',     price: 220, rents: [18,90,250,700,875,1050],      houseCost: 100, mortgageValue: 110, flag: '🇯🇵' },
  { index: 18, name: 'Osaka',          type: 'property', group: 'orange',     price: 240, rents: [20,100,300,750,925,1100],     houseCost: 100, mortgageValue: 120, flag: '🇯🇵' },
  { index: 19, name: 'Kyoto',          type: 'property', group: 'orange',     price: 260, rents: [22,110,330,800,975,1150],     houseCost: 100, mortgageValue: 130, flag: '🇯🇵' },
  { index: 20, name: 'Narita Airport', type: 'airport',  price: 200, rents: [25,50,100,200], mortgageValue: 100, flag: '✈️' },
  { index: 21, name: 'Treasure',       type: 'treasure' },
  { index: 22, name: 'Berlin',         type: 'property', group: 'red',        price: 280, rents: [24,120,360,850,1025,1200],    houseCost: 150, mortgageValue: 140, flag: '🇩🇪' },
  { index: 23, name: 'Munich',         type: 'property', group: 'red',        price: 300, rents: [26,130,390,900,1100,1275],    houseCost: 150, mortgageValue: 150, flag: '🇩🇪' },
  { index: 24, name: 'Frankfurt',      type: 'property', group: 'red',        price: 320, rents: [28,150,450,1000,1200,1400],   houseCost: 150, mortgageValue: 160, flag: '🇩🇪' },
  { index: 25, name: 'Power Plant',    type: 'utility',  price: 150, rents: [4,10], mortgageValue: 75, flag: '⚡' },
  { index: 26, name: 'Surprise',       type: 'surprise' },
  { index: 27, name: 'Treasure',       type: 'treasure' },
  { index: 28, name: 'Luxury Tax',     type: 'tax',      taxAmount: 100 },
  { index: 29, name: 'Surprise',       type: 'surprise' },

  // ── CORNER 30 ───────────────────────────────────
  { index: 30, name: 'Vacation',       type: 'free_parking' },

  // ── TOP  31-44  (right → left)  yellow(4) + green(3) ──────────────────
  { index: 31, name: 'Paris',          type: 'property', group: 'yellow',     price: 340, rents: [28,150,450,1000,1200,1400],   houseCost: 150, mortgageValue: 170, flag: '🇫🇷' },
  { index: 32, name: 'Lyon',           type: 'property', group: 'yellow',     price: 360, rents: [31,170,500,1100,1300,1500],   houseCost: 150, mortgageValue: 180, flag: '🇫🇷' },
  { index: 33, name: 'Marseille',      type: 'property', group: 'yellow',     price: 380, rents: [34,180,550,1200,1400,1600],   houseCost: 150, mortgageValue: 190, flag: '🇫🇷' },
  { index: 34, name: 'Nice',           type: 'property', group: 'yellow',     price: 400, rents: [36,200,600,1300,1500,1750],   houseCost: 150, mortgageValue: 200, flag: '🇫🇷' },
  { index: 35, name: 'CDG Airport',    type: 'airport',  price: 200, rents: [25,50,100,200], mortgageValue: 100, flag: '✈️' },
  { index: 36, name: 'Surprise',       type: 'surprise' },
  { index: 37, name: 'Rome',           type: 'property', group: 'green',      price: 420, rents: [40,200,600,1400,1700,2000],   houseCost: 200, mortgageValue: 210, flag: '🇮🇹' },
  { index: 38, name: 'Milan',          type: 'property', group: 'green',      price: 440, rents: [42,220,660,1500,1800,2100],   houseCost: 200, mortgageValue: 220, flag: '🇮🇹' },
  { index: 39, name: 'Florence',       type: 'property', group: 'green',      price: 460, rents: [44,240,720,1600,1900,2200],   houseCost: 200, mortgageValue: 230, flag: '🇮🇹' },
  { index: 40, name: 'Heathrow',       type: 'airport',  price: 200, rents: [25,50,100,200], mortgageValue: 100, flag: '✈️' },
  { index: 41, name: 'London',         type: 'property', group: 'teal',       price: 480, rents: [46,250,750,1700,2000,2300],   houseCost: 200, mortgageValue: 240, flag: '🇬🇧' },
  { index: 42, name: 'Manchester',     type: 'property', group: 'teal',       price: 500, rents: [48,260,780,1800,2100,2400],   houseCost: 200, mortgageValue: 250, flag: '🇬🇧' },
  { index: 43, name: 'Edinburgh',      type: 'property', group: 'teal',       price: 520, rents: [50,280,820,1900,2200,2500],   houseCost: 200, mortgageValue: 260, flag: '🇬🇧' },
  { index: 44, name: 'Treasure',       type: 'treasure' },

  // ── CORNER 45 ───────────────────────────────────
  { index: 45, name: 'Go to Jail',     type: 'go_to_jail' },

  // ── LEFT  46-59  (top → bottom)  purple(3) + dark_blue(2) ─────────────
  { index: 46, name: 'Surprise',       type: 'surprise' },
  { index: 47, name: 'Shanghai',       type: 'property', group: 'purple',     price: 540, rents: [52,300,900,2000,2400,2800],   houseCost: 250, mortgageValue: 270, flag: '🇨🇳' },
  { index: 48, name: 'Beijing',        type: 'property', group: 'purple',     price: 580, rents: [56,320,960,2100,2500,2900],   houseCost: 250, mortgageValue: 290, flag: '🇨🇳' },
  { index: 49, name: 'Shenzhen',       type: 'property', group: 'purple',     price: 620, rents: [60,340,1020,2200,2600,3000],  houseCost: 250, mortgageValue: 310, flag: '🇨🇳' },
  { index: 50, name: 'Water Works',    type: 'utility',  price: 150, rents: [4,10], mortgageValue: 75, flag: '💧' },
  { index: 51, name: 'Treasure',       type: 'treasure' },
  { index: 52, name: 'Surprise',       type: 'surprise' },
  { index: 53, name: 'Treasure',       type: 'treasure' },
  { index: 54, name: 'Gas Company',    type: 'utility',  price: 150, rents: [4,10], mortgageValue: 75, flag: '⛽' },
  { index: 55, name: 'Surprise',       type: 'surprise' },
  { index: 56, name: 'Treasure',       type: 'treasure' },
  { index: 57, name: 'Surprise',       type: 'surprise' },
  { index: 58, name: 'New York',       type: 'property', group: 'dark_blue',  price: 680, rents: [65,380,1100,2400,2800,3200],  houseCost: 300, mortgageValue: 340, flag: '🇺🇸' },
  { index: 59, name: 'Los Angeles',    type: 'property', group: 'dark_blue',  price: 750, rents: [75,430,1300,2800,3200,3600],  houseCost: 300, mortgageValue: 375, flag: '🇺🇸' },
];

export const GROUP_COLORS: Record<string, string> = {
  brown:      '#b45309',
  light_blue: '#0ea5e9',
  pink:       '#ec4899',
  orange:     '#f97316',
  red:        '#ef4444',
  yellow:     '#eab308',
  green:      '#22c55e',
  teal:       '#14b8a6',
  purple:     '#a855f7',
  dark_blue:  '#3b82f6',
};

export const GROUP_COUNTRIES: Record<string, string> = {
  brown:      '🇧🇷 Brazil',
  light_blue: '🇮🇳 India',
  pink:       '🇦🇺 Australia',
  orange:     '🇯🇵 Japan',
  red:        '🇩🇪 Germany',
  yellow:     '🇫🇷 France',
  green:      '🇮🇹 Italy',
  teal:       '🇬🇧 UK',
  purple:     '🇨🇳 China',
  dark_blue:  '🇺🇸 USA',
};

export function getGroupSpaces(group: string): number[] {
  return BOARD_SPACES.filter(s => s.group === group).map(s => s.index);
}
export function getAirportSpaces(): number[] {
  return BOARD_SPACES.filter(s => s.type === 'airport').map(s => s.index);
}
export function getUtilitySpaces(): number[] {
  return BOARD_SPACES.filter(s => s.type === 'utility').map(s => s.index);
}
