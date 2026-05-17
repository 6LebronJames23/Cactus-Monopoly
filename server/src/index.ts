import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { GameRoom } from './game/GameRoom';

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

const rooms = new Map<string, GameRoom>();

function generateRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 5; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

io.on('connection', (socket) => {
  console.log(`+ ${socket.id}`);

  socket.on('create_room', ({ name }: { name: string }, cb) => {
    let roomId = generateRoomId();
    while (rooms.has(roomId)) roomId = generateRoomId();
    const room = new GameRoom(io, roomId, socket.id, name);
    rooms.set(roomId, room);
    socket.join(roomId);
    (socket as any).roomId = roomId;
    (socket as any).playerName = name;
    cb({ ok: true, roomId, state: room.state });
    room.broadcast();
  });

  socket.on('join_room', ({ roomId, name }: { roomId: string; name: string }, cb) => {
    const room = rooms.get(roomId.toUpperCase());
    if (!room) return cb({ ok: false, error: 'Room not found' });
    if (room.state.gamePhase !== 'lobby') return cb({ ok: false, error: 'Game already started' });
    const ok = room.addPlayer(socket.id, name);
    if (!ok) return cb({ ok: false, error: 'Room is full' });
    socket.join(roomId.toUpperCase());
    (socket as any).roomId = roomId.toUpperCase();
    (socket as any).playerName = name;
    cb({ ok: true, state: room.state });
    room.broadcast();
  });

  socket.on('set_ready', ({ ready }: { ready: boolean }) => {
    const room = rooms.get((socket as any).roomId);
    if (!room) return;
    room.setReady(socket.id, ready);
  });

  socket.on('start_game', (_data, cb) => {
    const room = rooms.get((socket as any).roomId);
    if (!room) return cb?.({ ok: false, error: 'Room not found' });
    const err = room.startGame(socket.id);
    cb?.({ ok: !err, error: err });
  });

  socket.on('roll_dice', (_data, cb) => {
    const room = rooms.get((socket as any).roomId);
    if (!room) return cb?.({ ok: false, error: 'Room not found' });
    const err = room.rollDice(socket.id);
    cb?.({ ok: !err, error: err });
  });

  socket.on('buy_property', (_data, cb) => {
    const room = rooms.get((socket as any).roomId);
    if (!room) return cb?.({ ok: false, error: 'Room not found' });
    const err = room.buyProperty(socket.id);
    cb?.({ ok: !err, error: err });
  });

  socket.on('decline_buy', (_data, cb) => {
    const room = rooms.get((socket as any).roomId);
    if (!room) return cb?.({ ok: false, error: 'Room not found' });
    const err = room.declineBuy(socket.id);
    cb?.({ ok: !err, error: err });
  });

  socket.on('resolve_card', (_data, cb) => {
    const room = rooms.get((socket as any).roomId);
    if (!room) return cb?.({ ok: false, error: 'Room not found' });
    const err = room.resolveCard(socket.id);
    cb?.({ ok: !err, error: err });
  });

  socket.on('end_turn', (_data, cb) => {
    const room = rooms.get((socket as any).roomId);
    if (!room) return cb?.({ ok: false, error: 'Room not found' });
    const err = room.endTurn(socket.id);
    cb?.({ ok: !err, error: err });
  });

  socket.on('pay_jail_fine', (_data, cb) => {
    const room = rooms.get((socket as any).roomId);
    if (!room) return cb?.({ ok: false, error: 'Room not found' });
    const err = room.payJailFine(socket.id);
    cb?.({ ok: !err, error: err });
  });

  socket.on('use_jail_card', (_data, cb) => {
    const room = rooms.get((socket as any).roomId);
    if (!room) return cb?.({ ok: false, error: 'Room not found' });
    const err = room.useJailCard(socket.id);
    cb?.({ ok: !err, error: err });
  });

  socket.on('buy_house', ({ spaceIndex }: { spaceIndex: number }, cb) => {
    const room = rooms.get((socket as any).roomId);
    if (!room) return cb?.({ ok: false, error: 'Room not found' });
    const err = room.buyHouse(socket.id, spaceIndex);
    cb?.({ ok: !err, error: err });
  });

  socket.on('sell_house', ({ spaceIndex }: { spaceIndex: number }, cb) => {
    const room = rooms.get((socket as any).roomId);
    if (!room) return cb?.({ ok: false, error: 'Room not found' });
    const err = room.sellHouse(socket.id, spaceIndex);
    cb?.({ ok: !err, error: err });
  });

  socket.on('mortgage_property', ({ spaceIndex }: { spaceIndex: number }, cb) => {
    const room = rooms.get((socket as any).roomId);
    if (!room) return cb?.({ ok: false, error: 'Room not found' });
    const err = room.mortgageProperty(socket.id, spaceIndex);
    cb?.({ ok: !err, error: err });
  });

  socket.on('unmortgage_property', ({ spaceIndex }: { spaceIndex: number }, cb) => {
    const room = rooms.get((socket as any).roomId);
    if (!room) return cb?.({ ok: false, error: 'Room not found' });
    const err = room.unmortgageProperty(socket.id, spaceIndex);
    cb?.({ ok: !err, error: err });
  });

  socket.on('update_settings', (patch, cb) => {
    const room = rooms.get((socket as any).roomId);
    if (!room) return cb?.({ ok: false, error: 'Room not found' });
    const err = room.updateSettings(socket.id, patch);
    cb?.({ ok: !err, error: err });
  });

  socket.on('place_bid', ({ amount }: { amount: number }, cb) => {
    const room = rooms.get((socket as any).roomId);
    if (!room) return cb?.({ ok: false, error: 'Room not found' });
    const err = room.placeBid(socket.id, amount);
    cb?.({ ok: !err, error: err });
  });

  socket.on('pass_auction', (_data, cb) => {
    const room = rooms.get((socket as any).roomId);
    if (!room) return cb?.({ ok: false, error: 'Room not found' });
    const err = room.passAuction(socket.id);
    cb?.({ ok: !err, error: err });
  });

  socket.on('propose_trade', (offer, cb) => {
    const room = rooms.get((socket as any).roomId);
    if (!room) return cb?.({ ok: false, error: 'Room not found' });
    const err = room.proposeTrade(socket.id, offer);
    cb?.({ ok: !err, error: err });
  });

  socket.on('accept_trade', ({ tradeId }: { tradeId: string }, cb) => {
    const room = rooms.get((socket as any).roomId);
    if (!room) return cb?.({ ok: false, error: 'Room not found' });
    const err = room.acceptTrade(socket.id, tradeId);
    cb?.({ ok: !err, error: err });
  });

  socket.on('decline_trade', ({ tradeId }: { tradeId: string }, cb) => {
    const room = rooms.get((socket as any).roomId);
    if (!room) return cb?.({ ok: false, error: 'Room not found' });
    const err = room.declineTrade(socket.id, tradeId);
    cb?.({ ok: !err, error: err });
  });

  socket.on('declare_bankruptcy', (_data, cb) => {
    const room = rooms.get((socket as any).roomId);
    if (!room) return cb?.({ ok: false, error: 'Room not found' });
    const err = room.declareBankruptcy(socket.id);
    cb?.({ ok: !err, error: err });
  });

  socket.on('disconnect', () => {
    console.log(`- ${socket.id}`);
    const roomId = (socket as any).roomId;
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;
    room.removePlayer(socket.id);
    if (room.state.players.filter(p => !p.bankrupt).length === 0) {
      rooms.delete(roomId);
    }
  });
});

// In production, serve the built client
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

const PORT = process.env.PORT ?? 3001;
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
