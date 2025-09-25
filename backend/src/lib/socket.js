const { Server } = require('socket.io');
const env = require('../config/env');
const logger = require('../utils/logger');

let ioInstance;

const initSocket = (server) => {
  ioInstance = new Server(server, {
    cors: {
      origin: env.cors.allowedOrigins.length > 0 ? env.cors.allowedOrigins : true,
      credentials: true,
    },
  });

  ioInstance.on('connection', (socket) => {
    logger.debug({ id: socket.id }, 'Socket connected');
    const tenantId = socket.handshake.auth?.tenantId;
    if (tenantId) {
      socket.join(`tenant:${tenantId}`);
    }

    socket.on('tenant:join', (payload) => {
      const requestedTenant =
        typeof payload === 'string' ? payload : payload?.tenantId ?? payload?.id;
      if (requestedTenant) {
        socket.join(`tenant:${requestedTenant}`);
      }
    });
    socket.on('disconnect', () => {
      logger.debug({ id: socket.id }, 'Socket disconnected');
    });
  });

  return ioInstance;
};

const getIO = () => {
  if (!ioInstance) {
    throw new Error('Socket.io has not been initialized');
  }
  return ioInstance;
};

module.exports = {
  initSocket,
  getIO,
};
