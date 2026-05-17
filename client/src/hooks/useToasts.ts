import { useState, useEffect, useRef } from 'react';

export interface Toast {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export function useToasts(log: string[]) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const prevLogRef = useRef<string[]>([]);

  useEffect(() => {
    const prev = prevLogRef.current;
    // New entries are prepended (log[0] is newest)
    const newEntries = log.slice(0, log.length - prev.length);
    if (newEntries.length === 0 || prev.length === 0) {
      prevLogRef.current = log;
      return;
    }

    newEntries.forEach(msg => {
      const id = Math.random().toString(36).slice(2);
      const type = getType(msg);
      const toast: Toast = { id, message: msg, type };
      setToasts(t => [toast, ...t].slice(0, 4));
      setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
    });
    prevLogRef.current = log;
  }, [log]);

  return toasts;
}

function getType(msg: string): Toast['type'] {
  if (msg.includes('won') || msg.includes('wins') || msg.includes('🏆')) return 'success';
  if (msg.includes('Jail') || msg.includes('jail') || msg.includes('🚔')) return 'warning';
  if (msg.includes('paid') || msg.includes('tax') || msg.includes('bankrupt') || msg.includes('💸')) return 'error';
  if (msg.includes('bought') || msg.includes('passed GO') || msg.includes('gained') || msg.includes('🎉')) return 'success';
  return 'info';
}
