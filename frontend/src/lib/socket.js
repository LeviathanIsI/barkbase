/**
 * WebSocket Manager
 * Real-time connection for live updates
 * Phase 3: Real-time features
 */

import { websocketEnabled, websocketUrl } from '@/config/env';

let socketInstance = null;
let reconnectAttempts = 0;
let reconnectTimer = null;
let eventHandlers = new Map();
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000;

/**
 * Initialize WebSocket connection
 */
export const initSocket = (token) => {
  if (!websocketEnabled) {
    return null;
  }

  if (socketInstance && socketInstance.readyState === WebSocket.OPEN) {
    return socketInstance;
  }

  try {
    const wsUrl = websocketUrl || `wss://${window.location.host}/ws`;
    socketInstance = new WebSocket(wsUrl);

    socketInstance.onopen = () => {
      reconnectAttempts = 0;

      // Send authentication
      if (token) {
        sendMessage('auth', { token });
      }

      // Trigger reconnect handlers
      triggerEvent('connect');
    };

    socketInstance.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleMessage(message);
      } catch (error) {
        console.error('[WebSocket] Failed to parse message:', error);
      }
    };

    socketInstance.onerror = (error) => {
      console.error('[WebSocket] Error:', error);
      triggerEvent('error', error);
    };

    socketInstance.onclose = () => {
      triggerEvent('disconnect');
      socketInstance = null;

      // Attempt reconnection
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        reconnectTimer = setTimeout(() => {
          initSocket(token);
        }, RECONNECT_DELAY);
      } else {
        console.error('[WebSocket] Max reconnection attempts reached');
        triggerEvent('reconnect_failed');
      }
    };

    return socketInstance;
  } catch (error) {
    console.error('[WebSocket] Failed to initialize:', error);
    return null;
  }
};

/**
 * Get current socket instance
 */
export const getSocket = () => {
  return socketInstance;
};

/**
 * Send message through WebSocket
 */
export const sendMessage = (type, data) => {
  if (!socketInstance || socketInstance.readyState !== WebSocket.OPEN) {
    return false;
  }

  try {
    socketInstance.send(JSON.stringify({ type, data, timestamp: Date.now() }));
    return true;
  } catch (error) {
    console.error('[WebSocket] Failed to send message:', error);
    return false;
  }
};

/**
 * Handle incoming messages
 */
const handleMessage = (message) => {
  const { type, data } = message;

  // Trigger event handlers for this message type
  triggerEvent(type, data);

  // Handle specific message types
  switch (type) {
    case 'booking_updated':
      triggerEvent('booking:update', data);
      break;
    case 'booking_created':
      triggerEvent('booking:create', data);
      break;
    case 'booking_deleted':
      triggerEvent('booking:delete', data);
      break;
    case 'pet_updated':
      triggerEvent('pet:update', data);
      break;
    case 'owner_updated':
      triggerEvent('owner:update', data);
      break;
    case 'check_in':
      triggerEvent('checkin', data);
      break;
    case 'check_out':
      triggerEvent('checkout', data);
      break;
    case 'conflict':
      triggerEvent('conflict', data);
      break;
    default:
      // Unhandled message type
      break;
  }
};

/**
 * Subscribe to WebSocket events
 */
export const on = (event, handler) => {
  if (!eventHandlers.has(event)) {
    eventHandlers.set(event, new Set());
  }
  eventHandlers.get(event).add(handler);

  // Return unsubscribe function
  return () => off(event, handler);
};

/**
 * Unsubscribe from WebSocket events
 */
export const off = (event, handler) => {
  if (eventHandlers.has(event)) {
    eventHandlers.get(event).delete(handler);
  }
};

/**
 * Trigger event handlers
 */
const triggerEvent = (event, data) => {
  if (eventHandlers.has(event)) {
    eventHandlers.get(event).forEach((handler) => {
      try {
        handler(data);
      } catch (error) {
        console.error(`[WebSocket] Error in event handler for ${event}:`, error);
      }
    });
  }
};

/**
 * Disconnect WebSocket
 */
export const disconnectSocket = () => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  if (socketInstance) {
    socketInstance.close();
    socketInstance = null;
  }

  eventHandlers.clear();
  reconnectAttempts = 0;
};

/**
 * Check if WebSocket is connected
 */
export const isConnected = () => {
  return socketInstance && socketInstance.readyState === WebSocket.OPEN;
};

/**
 * React hook for WebSocket events
 */
export const useSocket = (event, handler) => {
  if (typeof window === 'undefined') return;

  const { useEffect } = require('react');

  useEffect(() => {
    if (!handler) return;

    const unsubscribe = on(event, handler);
    return unsubscribe;
  }, [event, handler]);
};

// Legacy compatibility
export { initSocket as connectSocket };
