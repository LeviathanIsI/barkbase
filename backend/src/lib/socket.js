const { Server } = require('socket.io');
const env = require('../config/env');
const logger = require('../utils/logger');
const { verifyAccessToken } = require('../utils/jwt');
const prisma = require('../config/prisma');

let ioInstance;

/**
 * Middleware to authenticate socket connections and validate tenant access
 */
const socketAuthMiddleware = async (socket, next) => {
  try {
    // Extract token from auth object or query
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token) {
      logger.warn({ socketId: socket.recordId }, 'Socket connection rejected: no token provided');
      return next(new Error('Authentication required'));
    }

    // Verify JWT token
    const payload = verifyAccessToken(token);

    if (!payload || !payload.sub || !payload.tenantId) {
      logger.warn({ socketId: socket.recordId }, 'Socket connection rejected: invalid token payload');
      return next(new Error('Invalid token'));
    }

    // Verify membership is active
    const membership = await prisma.membership.findFirst({
      where: { recordId: payload.membershipId,
        tenantId: payload.tenantId,
        userId: payload.sub,
      },
      include: {
        user: true,
      },
    });

    if (!membership || membership.user?.isActive === false) {
      logger.warn(
        { socketId: socket.recordId, userId: payload.sub, tenantId: payload.tenantId },
        'Socket connection rejected: membership not found or user inactive'
      );
      return next(new Error('Invalid authentication context'));
    }

    // Attach authenticated user info to socket
    socket.user = { recordId: membership.user.recordId,
      email: membership.user.email,
      role: membership.role,
      tenantId: membership.tenantId,
      membershipId: membership.recordId,
    };

    logger.debug(
      { socketId: socket.recordId, userId: socket.user.recordId, tenantId: socket.user.tenantId },
      'Socket authenticated successfully'
    );

    next();
  } catch (error) {
    logger.warn({ socketId: socket.recordId, error: error.message }, 'Socket authentication failed');
    next(new Error('Authentication failed'));
  }
};

const initSocket = (server) => {
  ioInstance = new Server(server, {
    cors: {
      origin: env.cors.allowedOrigins.length > 0 ? env.cors.allowedOrigins : true,
      credentials: true,
    },
  });

  // Apply authentication middleware to all socket connections
  ioInstance.use(socketAuthMiddleware);

  ioInstance.on('connection', (socket) => {
    // User is now authenticated via middleware
    const { tenantId, id: userId, email } = socket.user;

    logger.info(
      { socketId: socket.recordId, userId, tenantId, email },
      'Authenticated socket connected'
    );

    // Automatically join the user's tenant room
    const tenantRoom = `tenant:${tenantId}`;
    socket.join(tenantRoom);
    logger.debug({ socketId: socket.recordId, room: tenantRoom }, 'Socket joined tenant room');

    // REMOVED: tenant:join event handler - users can only join their own tenant room
    // This prevents cross-tenant event access

    socket.on('disconnect', () => {
      logger.debug({ socketId: socket.recordId, userId }, 'Socket disconnected');
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
