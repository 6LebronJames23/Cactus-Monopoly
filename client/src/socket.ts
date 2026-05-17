import { io, Socket } from 'socket.io-client';

// In dev, point at local server. In production, connect to same origin.
const SERVER_URL = import.meta.env.DEV ? 'http://localhost:3001' : '';

export const socket: Socket = io(SERVER_URL, { autoConnect: false });
