// server/src/controllers/message.controller.js
// Purpose: Handles paginated message history fetching and REST-based message creation.

import { z } from 'zod';
import { query } from '../db/index.js';

export const createMessageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(4000, 'Message too long'),
});

/**
 * Fetch paginated message history for a room
 */
export const getRoomMessages = async (req, res) => {
  try {
    const roomId = parseInt(req.params.id, 10);
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const beforeId = req.query.beforeId ? parseInt(req.query.beforeId, 10) : null;

    if (isNaN(roomId)) {
      return res.status(400).json({ error: 'Invalid room ID' });
    }

    const sql = `
      SELECT 
        m.id,
        m.room_id,
        m.sender_id,
        m.content,
        m.created_at,
        u.username,
        u.avatar_url
      FROM messages m
      LEFT JOIN users u ON u.id = m.sender_id
      WHERE m.room_id = $1
        AND ($2::INTEGER IS NULL OR m.id < $2)
      ORDER BY m.created_at DESC, m.id DESC
      LIMIT $3;
    `;

    const result = await query(sql, [roomId, beforeId, limit]);
    
    // Reverse rows so client receives oldest-to-newest order
    const messages = result.rows.reverse();

    return res.status(200).json({
      messages,
      hasMore: result.rows.length === limit,
      nextCursor: messages.length > 0 ? messages[0].id : null,
    });
  } catch (error) {
    console.error('getRoomMessages error:', error);
    return res.status(500).json({ error: 'Failed to retrieve message history' });
  }
};

/**
 * Create message via REST endpoint
 */
export const createMessage = async (req, res) => {
  try {
    const roomId = parseInt(req.params.id, 10);
    const senderId = req.user.id;
    const { content } = req.body;

    if (isNaN(roomId)) {
      return res.status(400).json({ error: 'Invalid room ID' });
    }

    const insertSql = `
      INSERT INTO messages (room_id, sender_id, content)
      VALUES ($1, $2, $3)
      RETURNING id, room_id, sender_id, content, created_at;
    `;

    const result = await query(insertSql, [roomId, senderId, content.trim()]);
    const message = result.rows[0];

    const messageWithSender = {
      ...message,
      username: req.user.username,
      avatar_url: req.user.avatar_url,
    };

    return res.status(201).json({ message: messageWithSender });
  } catch (error) {
    console.error('createMessage error:', error);
    return res.status(500).json({ error: 'Failed to send message' });
  }
};
