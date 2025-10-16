const { prisma } = require('../lib/prisma');

/**
 * Send a message
 */
async function sendMessage({ tenantId, senderId, recipientId, conversationId, content }) {
  // Generate conversation ID if not provided
  const finalConversationId = conversationId || generateConversationId(senderId, recipientId);

  const message = await prisma.message.create({
    data: {
      tenantId,
      senderId,
      recipientId,
      conversationId: finalConversationId,
      content
    },
    include: {
      sender: {
        select: {
          recordId: true,
          name: true,
          email: true,
          avatarUrl: true
        }
      },
      recipient: recipientId ? {
        select: {
          recordId: true,
          name: true,
          email: true,
          avatarUrl: true
        }
      } : undefined
    }
  });

  // Emit socket event to recipient if exists
  try {
    const { getIO } = require('../lib/socket');
    const io = getIO();
    if (recipientId && io) {
      io.to(`user:${recipientId}`).emit('message:new', message);
    }
  } catch (err) {
    // Socket might not be initialized, log but don't fail
    console.warn('Socket.io not available for message notification');
  }

  return message;
}

/**
 * Get all conversations for a user
 */
async function getConversations(tenantId, userId) {
  // Get all messages where user is sender or recipient
  const messages = await prisma.message.findMany({
    where: {
      tenantId,
      OR: [
        { senderId: userId },
        { recipientId: userId }
      ]
    },
    include: {
      sender: {
        select: {
          recordId: true,
          name: true,
          email: true,
          avatarUrl: true
        }
      },
      recipient: {
        select: {
          recordId: true,
          name: true,
          email: true,
          avatarUrl: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Group messages by conversation
  const conversationsMap = new Map();

  messages.forEach(msg => {
    if (!conversationsMap.has(msg.conversationId)) {
      // Determine the other participant
      const otherUser = msg.senderId === userId ? msg.recipient : msg.sender;

      conversationsMap.set(msg.conversationId, {
        conversationId: msg.conversationId,
        otherUser,
        lastMessage: msg,
        unreadCount: 0,
        messages: []
      });
    }

    const conversation = conversationsMap.get(msg.conversationId);
    
    // Count unread messages (messages sent to this user that aren't read)
    if (msg.recipientId === userId && !msg.isRead) {
      conversation.unreadCount++;
    }

    // Update last message if this one is newer
    if (new Date(msg.createdAt) > new Date(conversation.lastMessage.createdAt)) {
      conversation.lastMessage = msg;
    }
  });

  return Array.from(conversationsMap.values())
    .sort((a, b) => new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt));
}

/**
 * Get messages in a conversation
 */
async function getConversationMessages(tenantId, conversationId, userId, limit = 50, offset = 0) {
  const messages = await prisma.message.findMany({
    where: {
      tenantId,
      conversationId
    },
    include: {
      sender: {
        select: {
          recordId: true,
          name: true,
          email: true,
          avatarUrl: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset
  });

  return messages.reverse(); // Return in chronological order
}

/**
 * Mark messages as read
 */
async function markAsRead(tenantId, messageIds, userId) {
  await prisma.message.updateMany({
    where: {
      recordId: { in: messageIds },
      tenantId,
      recipientId: userId
    },
    data: {
      isRead: true,
      readAt: new Date()
    }
  });

  return { success: true, count: messageIds.length };
}

/**
 * Mark all messages in a conversation as read
 */
async function markConversationAsRead(tenantId, conversationId, userId) {
  const result = await prisma.message.updateMany({
    where: {
      tenantId,
      conversationId,
      recipientId: userId,
      isRead: false
    },
    data: {
      isRead: true,
      readAt: new Date()
    }
  });

  return { success: true, count: result.count };
}

/**
 * Get unread message count for a user
 */
async function getUnreadCount(tenantId, userId) {
  const count = await prisma.message.count({
    where: {
      tenantId,
      recipientId: userId,
      isRead: false
    }
  });

  return count;
}

/**
 * Generate a deterministic conversation ID from two user IDs
 */
function generateConversationId(userId1, userId2) {
  const sorted = [userId1, userId2].sort();
  return `conv:${sorted[0]}:${sorted[1]}`;
}

module.exports = {
  sendMessage,
  getConversations,
  getConversationMessages,
  markAsRead,
  markConversationAsRead,
  getUnreadCount,
  generateConversationId
};

