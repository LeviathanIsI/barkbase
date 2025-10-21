/**
 * WebSocket functionality is temporarily disabled during the AWS migration.
 * The backend for this has not been implemented yet.
 */
export const getSocket = () => {
  if (import.meta.env.DEV) {
    console.warn('Socket.io connection is temporarily disabled.');
  }
  return null;
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
