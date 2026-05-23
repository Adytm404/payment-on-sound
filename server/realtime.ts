import type { Response } from "express";

type Client = {
  id: string;
  res: Response;
};

const clients = new Map<string, Set<Client>>();

export function subscribe(userId: string, res: Response) {
  const client: Client = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    res,
  };

  if (!clients.has(userId)) clients.set(userId, new Set());
  clients.get(userId)!.add(client);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  send(client, "connected", { ok: true });

  const ping = setInterval(() => {
    send(client, "ping", { at: Date.now() });
  }, 25_000);

  res.on("close", () => {
    clearInterval(ping);
    clients.get(userId)?.delete(client);
    if (clients.get(userId)?.size === 0) clients.delete(userId);
  });
}

export function broadcastToUser(userId: string | bigint, event: string, payload: unknown) {
  const key = String(userId);
  const set = clients.get(key);
  if (!set) return;
  for (const client of set) send(client, event, payload);
}

function send(client: Client, event: string, payload: unknown) {
  client.res.write(`event: ${event}\n`);
  client.res.write(`data: ${JSON.stringify(payload)}\n\n`);
}
