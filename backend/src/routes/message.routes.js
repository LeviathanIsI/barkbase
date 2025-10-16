const router = require('express').Router();
const messageService = require('../services/message.service');
const { logger } = require('../lib/logger');

/**
 * Send a message
 * POST /api/v1/messages
 */
router.post('/', async (req, res, next) => {
  try {
    const { tenantId, recordId: senderId } = req.user;
    const { recipientId, conversationId, content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    if (!recipientId && !conversationId) {
      return res.status(400).json({ error: 'Either recipientId or conversationId is required' });
    }

    const message = await messageService.sendMessage({
      tenantId,
      senderId,
      recipientId,
      conversationId,
      content
    });

    logger.info({ messageId: message.recordId, recipientId }, 'Message sent');

    res.status(201).json(message);
  } catch (err) {
    logger.error({ err }, 'Failed to send message');
    next(err);
  }
});

/**
 * Get all conversations for current user
 * GET /api/v1/messages/conversations
 */
router.get('/conversations', async (req, res, next) => {
  try {
    const { tenantId, recordId: userId } = req.user;

    const conversations = await messageService.getConversations(tenantId, userId);

    res.json(conversations);
  } catch (err) {
    logger.error({ err }, 'Failed to get conversations');
    next(err);
  }
});

/**
 * Get messages in a conversation
 * GET /api/v1/messages/:conversationId
 */
router.get('/:conversationId', async (req, res, next) => {
  try {
    const { tenantId, recordId: userId } = req.user;
    const { conversationId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const messages = await messageService.getConversationMessages(
      tenantId,
      conversationId,
      userId,
      limit,
      offset
    );

    res.json(messages);
  } catch (err) {
    logger.error({ err, conversationId: req.params.conversationId }, 'Failed to get conversation messages');
    next(err);
  }
});

/**
 * Mark messages as read
 * PUT /api/v1/messages/read
 */
router.put('/read', async (req, res, next) => {
  try {
    const { tenantId, recordId: userId } = req.user;
    const { messageIds } = req.body;

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ error: 'messageIds array is required' });
    }

    const result = await messageService.markAsRead(tenantId, messageIds, userId);

    logger.info({ count: result.count }, 'Messages marked as read');

    res.json(result);
  } catch (err) {
    logger.error({ err }, 'Failed to mark messages as read');
    next(err);
  }
});

/**
 * Mark all messages in conversation as read
 * PUT /api/v1/messages/:conversationId/read
 */
router.put('/:conversationId/read', async (req, res, next) => {
  try {
    const { tenantId, recordId: userId } = req.user;
    const { conversationId } = req.params;

    const result = await messageService.markConversationAsRead(tenantId, conversationId, userId);

    logger.info({ conversationId, count: result.count }, 'Conversation marked as read');

    res.json(result);
  } catch (err) {
    logger.error({ err, conversationId: req.params.conversationId }, 'Failed to mark conversation as read');
    next(err);
  }
});

/**
 * Get unread message count
 * GET /api/v1/messages/unread/count
 */
router.get('/unread/count', async (req, res, next) => {
  try {
    const { tenantId, recordId: userId } = req.user;

    const count = await messageService.getUnreadCount(tenantId, userId);

    res.json({ count });
  } catch (err) {
    logger.error({ err }, 'Failed to get unread count');
    next(err);
  }
});

module.exports = router;

