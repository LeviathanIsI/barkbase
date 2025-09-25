import { io } from 'socket.io-client';
import { useTenantStore } from '@/stores/tenant';

let socketInstance;
let unsubscribeTenant;

const joinTenantRoom = (socket, tenantId) => {
  if (!socket || !tenantId) {
    return;
  }
  socket.emit('tenant:join', { tenantId });
};

export const getSocket = () => {
  if (socketInstance) {
    return socketInstance;
  }

  const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

  const initialTenantId = useTenantStore.getState().tenant?.id;

  socketInstance = io(apiUrl, {
    withCredentials: true,
    transports: ['websocket'],
    auth: initialTenantId ? { tenantId: initialTenantId } : undefined,
  });

  socketInstance.on('connect', () => {
    const tenantId = useTenantStore.getState().tenant?.id;
    joinTenantRoom(socketInstance, tenantId);
  });

  unsubscribeTenant = useTenantStore.subscribe(
    (state) => state.tenant?.id,
    (tenantId) => {
      if (!socketInstance?.connected) {
        return;
      }
      joinTenantRoom(socketInstance, tenantId);
    },
  );

  return socketInstance;
};

export const disconnectSocket = () => {
  if (unsubscribeTenant) {
    unsubscribeTenant();
    unsubscribeTenant = undefined;
  }

  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = undefined;
  }
};
