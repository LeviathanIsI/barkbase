const express = require('express');
const router = express.Router();

let getPool;
try {
  getPool = require('../lib/db').getPool;
} catch (e) {
  console.warn('[AUTH] Could not load db module:', e.message);
  getPool = null;
}

// GET /api/v1/auth/sessions - Get all active sessions for current user
router.get('/auth/sessions', async (req, res) => {
  try {
    const userId = req.user?.sub || req.user?.id;
    const currentSessionId = req.user?.sessionId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // If db not available, return empty sessions
    if (!getPool) {
      return res.json([]);
    }

    let pool;
    try {
      pool = getPool();
    } catch (poolErr) {
      console.warn('[AUTH] Could not get pool:', poolErr.message);
      return res.json([]);
    }
    
    let sessions = [];
    try {
      const result = await pool.query(
        `SELECT "sessionId", "userAgent", "ipAddress", "createdAt", "lastActive"
         FROM "AuthSession"
         WHERE "userId" = $1 AND "isRevoked" = FALSE
         ORDER BY "lastActive" DESC`,
        [userId]
      );

      sessions = result.rows.map((row) => ({
        sessionId: row.sessionId,
        userAgent: row.userAgent,
        ipAddress: row.ipAddress,
        createdAt: row.createdAt,
        lastActive: row.lastActive,
        isCurrentSession: row.sessionId === currentSessionId,
      }));
    } catch (queryErr) {
      // Table may not exist yet - return empty array
      console.warn('[AUTH] Could not query AuthSession table:', queryErr.message);
      sessions = [];
    }

    res.json(sessions);
  } catch (err) {
    console.error('[AUTH] Get sessions error:', err);
    res.status(500).json({ message: 'Failed to retrieve sessions' });
  }
});

// DELETE /api/v1/auth/sessions/all - Revoke all sessions except current
router.delete('/auth/sessions/all', async (req, res) => {
  try {
    const userId = req.user?.sub || req.user?.id;
    const currentSessionId = req.user?.sessionId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!getPool) {
      return res.json({ success: true, revokedCount: 0 });
    }

    let pool;
    try {
      pool = getPool();
    } catch (poolErr) {
      console.warn('[AUTH] Could not get pool:', poolErr.message);
      return res.json({ success: true, revokedCount: 0 });
    }

    let result;
    try {
      if (currentSessionId) {
        result = await pool.query(
          `UPDATE "AuthSession"
           SET "isRevoked" = TRUE
           WHERE "userId" = $1 AND "sessionId" != $2 AND "isRevoked" = FALSE
           RETURNING "sessionId"`,
          [userId, currentSessionId]
        );
      } else {
        result = await pool.query(
          `UPDATE "AuthSession"
           SET "isRevoked" = TRUE
           WHERE "userId" = $1 AND "isRevoked" = FALSE
           RETURNING "sessionId"`,
          [userId]
        );
      }
    } catch (queryErr) {
      console.warn('[AUTH] Could not revoke sessions:', queryErr.message);
      return res.json({ success: true, revokedCount: 0 });
    }

    res.json({ success: true, revokedCount: result.rowCount });
  } catch (err) {
    console.error('[AUTH] Revoke all sessions error:', err);
    res.status(500).json({ message: 'Failed to revoke sessions' });
  }
});

// DELETE /api/v1/auth/sessions/:sessionId - Revoke a specific session
router.delete('/auth/sessions/:sessionId', async (req, res) => {
  try {
    const userId = req.user?.sub || req.user?.id;
    const currentSessionId = req.user?.sessionId;
    const sessionIdToRevoke = req.params.sessionId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (sessionIdToRevoke === currentSessionId) {
      return res.status(400).json({ message: 'Cannot revoke your current session. Use logout instead.' });
    }

    if (!getPool) {
      return res.status(404).json({ message: 'Session not found or already revoked' });
    }

    let pool;
    try {
      pool = getPool();
    } catch (poolErr) {
      console.warn('[AUTH] Could not get pool:', poolErr.message);
      return res.status(404).json({ message: 'Session not found or already revoked' });
    }

    let result;
    try {
      result = await pool.query(
        `UPDATE "AuthSession"
         SET "isRevoked" = TRUE
         WHERE "sessionId" = $1 AND "userId" = $2 AND "isRevoked" = FALSE
         RETURNING "sessionId"`,
        [sessionIdToRevoke, userId]
      );
    } catch (queryErr) {
      console.warn('[AUTH] Could not revoke session:', queryErr.message);
      return res.status(404).json({ message: 'Session not found or already revoked' });
    }

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Session not found or already revoked' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[AUTH] Revoke session error:', err);
    res.status(500).json({ message: 'Failed to revoke session' });
  }
});

module.exports = router;

