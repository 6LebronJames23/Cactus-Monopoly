import { BoardSpace } from '../types/game';

export const BOARD_SPACES: BoardSpace[] = [
  { index: 0,  name: 'GO',             type: 'go' },

  // ── BOTTOM  1-19 ────────────────────────────────
  { index: 1,  name: 'São Paulo',      type: 'property', group: 'brown',      price:  60, rents: [2,10,30,90,160,250],        houseCost:  50, mortgageValue:  30, flag: '🇧🇷' },
  { index: 2,  name: 'Treasure',       type: 'treasure' },
  { index: 3,  name: 'Rio de Janeiro', type: 'property', group: 'brown',      price:  60, rents: [4,20,60,180,320,450],        houseCost:  50, mortgageValue:  30, flag: '🇧🇷' },
  { index: 4,  name: 'Fortaleza',      type: 'property', group: 'brown',      price:  80, rents: [4,20,60,180,320,450],        houseCost:  50, mortgageValue:  40, flag: '🇧🇷' },
  { index: 5,  name: 'Salvador',       type: 'property', group: 'brown',      price:  80, rents: [4,20,60,180,320,450],        houseCost:  50, mortgageValue:  40, flag: '🇧🇷' },
  { index: 6,  name: 'Income Tax',     type: 'tax',      taxPercent: 10 },
  { index: 7,  name: 'JFK Airport',    type: 'airport',  price: 200, rents: [25,50,100,150,200,250,300,400], mortgageValue: 100, flag: '🇺🇸' },
  { index: 8,  name: 'Mumbai',         type: 'property', group: 'light_blue', price: 100, rents: [6,30,90,270,400,550],         houseCost:  50, mortgageValue:  50, flag: '🇮🇳' },
  { index: 9,  name: 'New Delhi',      type: 'property', group: 'light_blue', price: 100, rents: [6,30,90,270,400,550],         houseCost:  50, mortgageValue:  50, flag: '🇮🇳' },
  { index: 10, name: 'Surprise',       type: 'surprise' },
  { index: 11, name: 'Bangalore',      type: 'property', group: 'light_blue', price: 120, rents: [8,40,100,300,450,600],        houseCost:  50, mortgageValue:  60, flag: '🇮🇳' },
  { index: 12, name: 'Kolkata',        type: 'property', group: 'light_blue', price: 120, rents: [8,40,100,300,450,600],        houseCost:  50, mortgageValue:  60, flag: '🇮🇳' },
  { index: 13, name: 'Chennai',        type: 'property', group: 'light_blue', price: 140, rents: [10,50,150,450,625,750],       houseCost:  50, mortgageValue:  70, flag: '🇮🇳' },
  { index: 14, name: 'Treasure',       type: 'treasure' },
  { index: 15, name: 'Sydney',         type: 'property', group: 'pink',       price: 140, rents: [10,50,150,450,625,750],       houseCost: 100, mortgageValue:  70, flag: '🇦🇺' },
  { index: 16, name: 'Melbourne',      type: 'property', group: 'pink',       price: 160, rents: [12,60,180,500,700,900],       houseCost: 100, mortgageValue:  80, flag: '🇦🇺' },
  { index: 17, name: 'LAX Airport',    type: 'airport',  price: 200, rents: [25,50,100,150,200,250,300,400], mortgageValue: 100, flag: '🇺🇸' },
  { index: 18, name: 'Brisbane',       type: 'property', group: 'pink',       price: 160, rents: [12,60,180,500,700,900],       houseCost: 100, mortgageValue:  80, flag: '🇦🇺' },
  { index: 19, name: 'Perth',          type: 'property', group: 'pink',       price: 180, rents: [14,70,200,550,750,950],       houseCost: 100, mortgageValue:  90, flag: '🇦🇺' },

  { index: 20, name: 'Just Visiting',  type: 'jail' },

  // ── RIGHT  21-39 ────────────────────────────────
  { index: 21, name: 'Adelaide',       type: 'property', group: 'pink',       price: 180, rents: [14,70,200,550,750,950],       houseCost: 100, mortgageValue:  90, flag: '🇦🇺' },
  { index: 22, name: 'Surprise',       type: 'surprise' },
  { index: 23, name: 'Tokyo',          type: 'property', group: 'orange',     price: 200, rents: [16,80,220,600,800,1000],       houseCost: 100, mortgageValue: 100, flag: '🇯🇵' },
  { index: 24, name: 'Osaka',          type: 'property', group: 'orange',     price: 200, rents: [16,80,220,600,800,1000],       houseCost: 100, mortgageValue: 100, flag: '🇯🇵' },
  { index: 25, name: 'Water Co.',      type: 'utility',  price: 150, rents: [4,8,12], mortgageValue: 75, flag: '💧' },
  { index: 26, name: 'Yokohama',       type: 'property', group: 'orange',     price: 220, rents: [18,90,250,700,875,1050],       houseCost: 100, mortgageValue: 110, flag: '🇯🇵' },
  { index: 27, name: 'Kyoto',          type: 'property', group: 'orange',     price: 220, rents: [18,90,250,700,875,1050],       houseCost: 100, mortgageValue: 110, flag: '🇯🇵' },
  { index: 28, name: 'Nagoya',         type: 'property', group: 'orange',     price: 240, rents: [20,100,300,750,925,1100],      houseCost: 100, mortgageValue: 120, flag: '🇯🇵' },
  { index: 29, name: 'NRT Airport',    type: 'airport',  price: 200, rents: [25,50,100,150,200,250,300,400], mortgageValue: 100, flag: '🇯🇵' },
  { index: 30, name: 'Treasure',       type: 'treasure' },
  { index: 31, name: 'Berlin',         type: 'property', group: 'red',        price: 240, rents: [20,100,300,750,925,1100],      houseCost: 150, mortgageValue: 120, flag: '🇩🇪' },
  { index: 32, name: 'Munich',         type: 'property', group: 'red',        price: 260, rents: [22,110,330,800,975,1150],      houseCost: 150, mortgageValue: 130, flag: '🇩🇪' },
  { index: 33, name: 'Hamburg',        type: 'property', group: 'red',        price: 260, rents: [22,110,330,800,975,1150],      houseCost: 150, mortgageValue: 130, flag: '🇩🇪' },
  { index: 34, name: 'Surprise',       type: 'surprise' },
  { index: 35, name: 'Frankfurt',      type: 'property', group: 'red',        price: 280, rents: [24,120,360,850,1025,1200],     houseCost: 150, mortgageValue: 140, flag: '🇩🇪' },
  { index: 36, name: 'Electric Co.',   type: 'utility',  price: 150, rents: [4,8,12], mortgageValue: 75, flag: '⚡' },
  { index: 37, name: 'Cologne',        type: 'property', group: 'red',        price: 280, rents: [24,120,360,850,1025,1200],     houseCost: 150, mortgageValue: 140, flag: '🇩🇪' },
  { index: 38, name: 'FRA Airport',    type: 'airport',  price: 200, rents: [25,50,100,150,200,250,300,400], mortgageValue: 100, flag: '🇩🇪' },
  { index: 39, name: 'Luxury Tax',     type: 'tax',      taxAmount: 100 },

  { index: 40, name: 'Vacation',       type: 'free_parking' },

  // ── TOP  41-59 ──────────────────────────────────
  { index: 41, name: 'Paris',          type: 'property', group: 'yellow',     price: 300, rents: [26,130,390,900,1100,1275],    houseCost: 150, mortgageValue: 150, flag: '🇫🇷' },
  { index: 42, name: 'Lyon',           type: 'property', group: 'yellow',     price: 300, rents: [26,130,390,900,1100,1275],    houseCost: 150, mortgageValue: 150, flag: '🇫🇷' },
  { index: 43, name: 'Treasure',       type: 'treasure' },
  { index: 44, name: 'Marseille',      type: 'property', group: 'yellow',     price: 320, rents: [28,150,450,1000,1200,1400],   houseCost: 150, mortgageValue: 160, flag: '🇫🇷' },
  { index: 45, name: 'CDG Airport',    type: 'airport',  price: 200, rents: [25,50,100,150,200,250,300,400], mortgageValue: 100, flag: '🇫🇷' },
  { index: 46, name: 'Nice',           type: 'property', group: 'yellow',     price: 320, rents: [28,150,450,1000,1200,1400],   houseCost: 150, mortgageValue: 160, flag: '🇫🇷' },
  { index: 47, name: 'Bordeaux',       type: 'property', group: 'yellow',     price: 340, rents: [35,175,500,1100,1300,1500],   houseCost: 150, mortgageValue: 170, flag: '🇫🇷' },
  { index: 48, name: 'Surprise',       type: 'surprise' },
  { index: 49, name: 'Rome',           type: 'property', group: 'green',      price: 340, rents: [35,175,500,1100,1300,1500],   houseCost: 200, mortgageValue: 170, flag: '🇮🇹' },
  { index: 50, name: 'Milan',          type: 'property', group: 'green',      price: 360, rents: [40,200,600,1400,1700,2000],   houseCost: 200, mortgageValue: 180, flag: '🇮🇹' },
  { index: 51, name: 'Venice',         type: 'property', group: 'green',      price: 360, rents: [40,200,600,1400,1700,2000],   houseCost: 200, mortgageValue: 180, flag: '🇮🇹' },
  { index: 52, name: 'MXP Airport',    type: 'airport',  price: 200, rents: [25,50,100,150,200,250,300,400], mortgageValue: 100, flag: '🇮🇹' },
  { index: 53, name: 'Florence',       type: 'property', group: 'green',      price: 380, rents: [45,225,650,1500,1850,2100],   houseCost: 200, mortgageValue: 190, flag: '🇮🇹' },
  { index: 54, name: 'Treasure',       type: 'treasure' },
  { index: 55, name: 'Naples',         type: 'property', group: 'green',      price: 380, rents: [45,225,650,1500,1850,2100],   houseCost: 200, mortgageValue: 190, flag: '🇮🇹' },
  { index: 56, name: 'Gas Company',    type: 'utility',  price: 150, rents: [4,8,12], mortgageValue: 75, flag: '⛽' },
  { index: 57, name: 'London',         type: 'property', group: 'teal',       price: 400, rents: [50,250,700,1600,2000,2200],   houseCost: 200, mortgageValue: 200, flag: '🇬🇧' },
  { index: 58, name: 'Surprise',       type: 'surprise' },
  { index: 59, name: 'Manchester',     type: 'property', group: 'teal',       price: 400, rents: [50,250,700,1600,2000,2200],   houseCost: 200, mortgageValue: 200, flag: '🇬🇧' },

  { index: 60, name: 'Go To Jail',     type: 'go_to_jail' },

  // ── LEFT  61-79 ─────────────────────────────────
  { index: 61, name: 'Birmingham',     type: 'property', group: 'teal',       price: 420, rents: [55,275,750,1700,2100,2500],   houseCost: 200, mortgageValue: 210, flag: '🇬🇧' },
  { index: 62, name: 'Liverpool',      type: 'property', group: 'teal',       price: 420, rents: [55,275,750,1700,2100,2500],   houseCost: 200, mortgageValue: 210, flag: '🇬🇧' },
  { index: 63, name: 'LHR Airport',    type: 'airport',  price: 200, rents: [25,50,100,150,200,250,300,400], mortgageValue: 100, flag: '🇬🇧' },
  { index: 64, name: 'Treasure',       type: 'treasure' },
  { index: 65, name: 'Edinburgh',      type: 'property', group: 'teal',       price: 440, rents: [60,300,800,1800,2200,2600],   houseCost: 200, mortgageValue: 220, flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
  { index: 66, name: 'Surprise',       type: 'surprise' },
  { index: 67, name: 'New York',       type: 'property', group: 'purple',     price: 440, rents: [60,300,800,1800,2200,2600],   houseCost: 200, mortgageValue: 220, flag: '🇺🇸' },
  { index: 68, name: 'Los Angeles',    type: 'property', group: 'purple',     price: 460, rents: [70,350,900,2000,2400,2800],   houseCost: 200, mortgageValue: 230, flag: '🇺🇸' },
  { index: 69, name: 'Treasure',       type: 'treasure' },
  { index: 70, name: 'Chicago',        type: 'property', group: 'purple',     price: 460, rents: [70,350,900,2000,2400,2800],   houseCost: 200, mortgageValue: 230, flag: '🇺🇸' },
  { index: 71, name: 'ORD Airport',    type: 'airport',  price: 200, rents: [25,50,100,150,200,250,300,400], mortgageValue: 100, flag: '🇺🇸' },
  { index: 72, name: 'Las Vegas',      type: 'property', group: 'purple',     price: 480, rents: [80,400,1000,2200,2600,3000],  houseCost: 200, mortgageValue: 240, flag: '🇺🇸' },
  { index: 73, name: 'Surprise',       type: 'surprise' },
  { index: 74, name: 'Miami',          type: 'property', group: 'purple',     price: 480, rents: [80,400,1000,2200,2600,3000],  houseCost: 200, mortgageValue: 240, flag: '🇺🇸' },
  { index: 75, name: 'Shanghai',       type: 'property', group: 'dark_blue',  price: 500, rents: [100,500,1200,2800,3500,4000], houseCost: 200, mortgageValue: 250, flag: '🇨🇳' },
  { index: 76, name: 'Beijing',        type: 'property', group: 'dark_blue',  price: 500, rents: [100,500,1200,2800,3500,4000], houseCost: 200, mortgageValue: 250, flag: '🇨🇳' },
  { index: 77, name: 'Treasure',       type: 'treasure' },
  { index: 78, name: 'Shenzhen',       type: 'property', group: 'dark_blue',  price: 520, rents: [120,600,1400,3200,4000,4500], houseCost: 200, mortgageValue: 260, flag: '🇨🇳' },
  { index: 79, name: 'Hong Kong',      type: 'property', group: 'dark_blue',  price: 520, rents: [120,600,1400,3200,4000,4500], houseCost: 200, mortgageValue: 260, flag: '🇨🇳' },
];

export const TOTAL_SPACES = 80;

export const GROUP_COLORS: Record<string, string> = {
  brown:      '#92400e',
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
  teal:       '🇬🇧 United Kingdom',
  purple:     '🇺🇸 United States',
  dark_blue:  '🇨🇳 China',
};

export function getGroupSpaces(group: string): number[] {
  return BOARD_SPACES.filter(s => s.group === group).map(s => s.index);
}
export function getAirportSpaces(): number[] {
  return BOARD_SPACES.filter(s => s.type === 'airport').map(s => s.index);
}
