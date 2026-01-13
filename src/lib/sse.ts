type SendFn = (data: string) => void;

const clients: Map<number, Set<SendFn>> = new Map();

export function addClient(userId: number, send: SendFn) {
  if (!clients.has(userId)) clients.set(userId, new Set());
  clients.get(userId)!.add(send);
}

export function removeClient(userId: number, send: SendFn) {
  const set = clients.get(userId);
  if (!set) return;
  set.delete(send);
  if (set.size === 0) clients.delete(userId);
}

export function sendEvent(userId: number, event: string, payload: any) {
  const set = clients.get(userId);
  if (!set) return;
  const data = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const fn of set) {
    try {
      fn(data);
    } catch (err) {
      // ignore
    }
  }
}

export default { addClient, removeClient, sendEvent };
