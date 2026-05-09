"use client";

export type RealtimeHandlers = Record<string, (payload: unknown) => void>;

type AppSyncEventsClientOptions = {
  realtimeEndpoint: string;
  httpEndpoint: string;
  token: string;
  channels: string[];
  handlers: RealtimeHandlers;
  onError?: (message: string) => void;
};

type AppSyncDataMessage = {
  type: "data";
  id: string;
  event: string[];
};

const APPSYNC_PROTOCOL = "aws-appsync-event-ws";
const BASE64_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export function createAppSyncEventsClient({
  realtimeEndpoint,
  httpEndpoint,
  token,
  channels,
  handlers,
  onError,
}: AppSyncEventsClientOptions) {
  let socket: WebSocket | null = null;
  let stopped = false;
  let reconnectAttempt = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let keepAliveTimer: ReturnType<typeof setTimeout> | null = null;
  let connectionTimeoutMs = 300_000;
  const subscriptions = new Map<string, string>();
  const httpHost = new URL(httpEndpoint).host;

  const authorization = {
    Authorization: `Bearer ${token}`,
    host: httpHost,
  };

  const connect = () => {
    if (stopped) return;

    socket = new WebSocket(realtimeEndpoint, [
      APPSYNC_PROTOCOL,
      getAuthProtocol(authorization),
    ]);

    socket.onopen = () => {
      reconnectAttempt = 0;
      socket?.send(JSON.stringify({ type: "connection_init" }));
      resetKeepAliveTimer();
    };

    socket.onmessage = (message) => {
      const payload = parseSocketMessage(message.data);
      if (!payload || typeof payload.type !== "string") return;

      if (payload.type === "connection_ack") {
        connectionTimeoutMs =
          typeof payload.connectionTimeoutMs === "number"
            ? payload.connectionTimeoutMs
            : connectionTimeoutMs;
        resetKeepAliveTimer();
        subscribeToChannels();
        return;
      }

      if (payload.type === "ka") {
        resetKeepAliveTimer();
        return;
      }

      if (payload.type === "data") {
        dispatchEvents(payload as AppSyncDataMessage);
        return;
      }

      if (payload.type.endsWith("_error")) {
        onError?.(`${payload.type}: ${JSON.stringify(payload.errors ?? [])}`);
      }
    };

    socket.onerror = () => {
      onError?.("AppSync realtime socket error");
    };

    socket.onclose = () => {
      clearKeepAliveTimer();
      subscriptions.clear();
      if (!stopped) scheduleReconnect();
    };
  };

  const subscribeToChannels = () => {
    for (const [index, channel] of normalizeChannels(channels).entries()) {
      const id = `sub_${index}_${Date.now().toString(36)}`;
      subscriptions.set(id, channel);
      socket?.send(
        JSON.stringify({
          type: "subscribe",
          id,
          channel,
          authorization,
        }),
      );
    }
  };

  const dispatchEvents = (message: AppSyncDataMessage) => {
    for (const rawEvent of message.event) {
      const envelope = parseRealtimeEvent(rawEvent);
      if (!envelope) continue;

      handlers[envelope.event]?.(envelope.payload);
    }
  };

  const resetKeepAliveTimer = () => {
    clearKeepAliveTimer();
    keepAliveTimer = setTimeout(() => {
      socket?.close();
    }, connectionTimeoutMs + 5_000);
  };

  const clearKeepAliveTimer = () => {
    if (keepAliveTimer) clearTimeout(keepAliveTimer);
    keepAliveTimer = null;
  };

  const scheduleReconnect = () => {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    const baseDelay = Math.min(30_000, 1_000 * 2 ** reconnectAttempt);
    const jitter = Math.floor(Math.random() * 750);
    reconnectAttempt += 1;
    reconnectTimer = setTimeout(connect, baseDelay + jitter);
  };

  connect();

  return {
    disconnect() {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      clearKeepAliveTimer();

      if (socket?.readyState === WebSocket.OPEN) {
        for (const id of subscriptions.keys()) {
          socket.send(JSON.stringify({ type: "unsubscribe", id }));
        }
      }

      socket?.close();
    },
  };
}

export function isAppSyncRealtimeConfigured() {
  return Boolean(getAppSyncRealtimeConfig());
}

export function getAppSyncRealtimeConfig() {
  const realtimeEndpoint = validEndpoint(
    process.env.NEXT_PUBLIC_APPSYNC_EVENTS_REALTIME_ENDPOINT?.trim(),
    ["ws:", "wss:"],
  );
  const httpEndpoint = validEndpoint(
    process.env.NEXT_PUBLIC_APPSYNC_EVENTS_HTTP_ENDPOINT?.trim(),
    ["http:", "https:"],
  );

  if (!realtimeEndpoint || !httpEndpoint) return null;
  return { realtimeEndpoint, httpEndpoint };
}

function validEndpoint(value: string | undefined, protocols: string[]) {
  if (!value) return null;

  try {
    const endpoint = new URL(value);
    return protocols.includes(endpoint.protocol) ? value : null;
  } catch {
    return null;
  }
}

function getAuthProtocol(authorization: Record<string, string>) {
  return `header-${base64UrlEncode(JSON.stringify(authorization))}`;
}

function base64UrlEncode(value: string) {
  return asciiToBase64(value)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function asciiToBase64(value: string) {
  let output = "";
  let index = 0;

  while (index < value.length) {
    const byte1 = value.charCodeAt(index++) & 0xff;
    const byte2 = index < value.length ? value.charCodeAt(index++) & 0xff : NaN;
    const byte3 = index < value.length ? value.charCodeAt(index++) & 0xff : NaN;

    output += BASE64_CHARS[byte1 >> 2];
    output += BASE64_CHARS[((byte1 & 3) << 4) | (byte2 >> 4)];
    output += Number.isNaN(byte2)
      ? "="
      : BASE64_CHARS[((byte2 & 15) << 2) | (byte3 >> 6)];
    output += Number.isNaN(byte3) ? "=" : BASE64_CHARS[byte3 & 63];
  }

  return output;
}

function parseSocketMessage(data: unknown) {
  if (typeof data !== "string") return null;

  try {
    return JSON.parse(data) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function parseRealtimeEvent(rawEvent: string) {
  try {
    const parsed = JSON.parse(rawEvent) as unknown;
    if (!parsed || typeof parsed !== "object") return null;

    const envelope = parsed as { event?: unknown; payload?: unknown };
    if (typeof envelope.event !== "string") return null;

    return {
      event: envelope.event,
      payload: envelope.payload,
    };
  } catch {
    return null;
  }
}

function normalizeChannels(channels: string[]) {
  return Array.from(
    new Set(
      channels
        .map((channel) => channel.trim())
        .filter(Boolean)
        .map((channel) => (channel.startsWith("/") ? channel : `/${channel}`)),
    ),
  );
}
