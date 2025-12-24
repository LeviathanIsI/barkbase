/*
  Lightweight realtime client with WebSocket + SSE fallback and BroadcastChannel fanout
*/
import { useEffect, useRef } from 'react';

type RealtimeEvent = {
  type: string; // e.g., booking.updated
  payload: any;
};

type Handler = (evt: RealtimeEvent) => void;

export class RealtimeClient {
  private url: string;
  private token: string;
  private tenant: string;
  private ws: WebSocket | null = null;
  private sse: EventSource | null = null;
  private handlers = new Set<Handler>();
  private bc: BroadcastChannel | null = null;
  private backoff = 1000;
  private maxBackoff = 15000;
  private heartbeat?: number;

  constructor(url: string, token: string, tenant: string) {
    this.url = url;
    this.token = token;
    this.tenant = tenant;
    if ('BroadcastChannel' in window) {
      this.bc = new BroadcastChannel('bb-realtime');
      this.bc.onmessage = (e) => this.dispatch(e.data as RealtimeEvent);
    }
  }

  connect() {
    // If no URL provided or disabled, quietly no-op
    if (!this.url || this.url === 'disabled') return;

    const baseUrl = this.url.replace(/\/+$/, '');
    const stageUrl = `${baseUrl}/dev`;
    const wsUrl = `${stageUrl}?tenantId=${encodeURIComponent(this.tenant)}&userId=${encodeURIComponent(
      this.token || 'anonymous',
    )}`;

    try {
      this.ws = new WebSocket(wsUrl);
      this.ws.onopen = () => {
        this.backoff = 1000;
        this.startHeartbeat();
      };
      this.ws.onmessage = (m) => this.onMessage(m.data);
      this.ws.onclose = () => {
        this.scheduleReconnect();
      };
      this.ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        this.scheduleReconnect();
      };
    } catch (error) {
      console.warn('WebSocket not available, using polling fallback');
    }
  }

  private connectSSE() {
    if (!this.url) return;
    try {
      this.sse = new EventSource(`${this.url.replace('ws', 'http')}/sse?tenant=${this.tenant}`);
      this.sse.onmessage = (e) => this.onMessage(e.data);
      this.sse.onerror = () => this.scheduleReconnect();
    } catch {
      this.scheduleReconnect();
    }
  }

  private onMessage(raw: any) {
    try {
      const evt: RealtimeEvent = JSON.parse(raw);
      this.dispatch(evt);
      if (this.bc) this.bc.postMessage(evt);
    } catch {}
  }

  private dispatch(evt: RealtimeEvent) {
    this.handlers.forEach((h) => h(evt));
  }

  on(handler: Handler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  send(obj: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj));
    }
  }

  disconnect() {
    if (this.ws) this.ws.close();
    if (this.sse) this.sse.close();
    this.stopHeartbeat();
  }

  private scheduleReconnect() {
    this.stopHeartbeat();
    const delay = this.backoff + Math.floor(Math.random() * 500);
    this.backoff = Math.min(this.backoff * 2, this.maxBackoff);
    setTimeout(() => this.connect(), delay);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeat = window.setInterval(() => {
      this.send({ type: 'ping', payload: Date.now() });
    }, 15000);
  }
  private stopHeartbeat() {
    if (this.heartbeat) window.clearInterval(this.heartbeat);
  }
}

export function useRealtime(client: RealtimeClient | null, handler: Handler | null) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!client || !handler) return;
    return client.on((evt) => ref.current && ref.current(evt));
  }, [client, handler]);
}


