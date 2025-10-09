import { io } from 'socket.io-client';
import { useTenantStore } from '@/stores/tenant';
import { useAuthStore } from '@/stores/auth';

let socketInstance;
let unsubscribeAuth;

export const getSocket = () => {
  if (socketInstance) {
    return socketInstance;
  }

  const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

  // Get authentication token for socket connection
  const initialToken = useAuthStore.getState().accessToken;

  if (!initialToken) {
    if (import.meta.env.DEV) {
      console.warn('Cannot initialize socket: no access token available');
    }
    return null;
  }

  socketInstance = io(apiUrl, {
    withCredentials: true,
    transports: ['websocket'],
    auth: {
      token: initialToken, // Backend validates this token and auto-joins tenant room
    },
  });

  socketInstance.on('connect', () => {
    if (import.meta.env.DEV) {
      console.log('Socket connected successfully');
    }
    // Backend automatically joins user to their tenant room based on authenticated token
    // No need to manually emit tenant:join
  });

  socketInstance.on('connect_error', (error) => {
    if (import.meta.env.DEV) {
      console.error('Socket connection error:', error.message);
    }
  });

  // Reconnect with fresh token if auth changes
  unsubscribeAuth = useAuthStore.subscribe(
    (state) => state.accessToken,
    (newToken) => {
      if (!newToken && socketInstance?.connected) {
        // Token removed, disconnect socket
        if (import.meta.env.DEV) {
          console.log('Access token removed, disconnecting socket');
        }
        socketInstance.disconnect();
      } else if (newToken && !socketInstance?.connected) {
        // New token available, attempt to reconnect
        socketInstance.auth = { token: newToken };
        socketInstance.connect();
      }
    },
  );

  return socketInstance;
};

export const disconnectSocket = () => {
  if (unsubscribeAuth) {
    unsubscribeAuth();
    unsubscribeAuth = undefined;
  }

  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = undefined;
  }
};
