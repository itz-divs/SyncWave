// server/src/sockets/index.js
// Purpose: Socket.io 4 Engine configuration, Handshake JWT authentication, Presence synchronization, and Real-time event handling.

import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { createAdapter } from '@socket.io/redis-adapter';
import { redisPubClient, redisSubClient, isRedisAvailable, presence } from '../config/redis.js';
import { query } from '../db/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'production_grade_super_secret_jwt_key_987654321';

export const setupSockets = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
    },
    pingTimeout: 20000,
    pingInterval: 25000,
  });

  // Attach Redis Adapter if available for distributed horizontal scaling
  if (isRedisAvailable && redisPubClient && redisSubClient) {
    try {
      io.adapter(createAdapter(redisPubClient, redisSubClient));
      console.log('✅ Socket.io Redis Adapter attached successfully');
    } catch (err) {
      console.warn('⚠️ Could not attach Redis Adapter for Socket.io:', err.message);
    }
  }

  // 1. Handshake Authentication Middleware
  io.use((socket, next) => {
    let token = socket.handshake.auth?.token || socket.handshake.headers?.authorization;

    if (!token) {
      return next(new Error('Authentication error: Missing token'));
    }

    if (token.startsWith('Bearer ')) {
      token = token.slice(7).trim();
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.user = decoded; // { id, username, email }
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid or expired token'));
    }
  });

  // 2. Connection Handler
  io.on('connection', async (socket) => {
    const user = socket.user;
    const socketId = socket.id;

    console.log(`🔌 User connected: ${user.username} (ID: ${user.id}, Socket: ${socketId})`);

    // Track presence
    const isFirstConnection = await presence.addSocket(user.id, socketId);
    
    // Join personal user channel for direct alerts/DMs
    socket.join(`user:${user.id}`);
    socket.join(`company:${user.company_id || 1}`);

    // Auto-join all rooms user is a member of so they always receive incoming messages
    try {
      const userRooms = await query('SELECT room_id FROM room_members WHERE user_id = $1', [user.id]);
      userRooms.rows.forEach((r) => {
        socket.join(`room:${r.room_id}`);
      });
    } catch (e) {
      console.error('Error auto-joining user rooms on socket connect:', e);
    }
    
    // Broadcast presence update if user just came online
    if (isFirstConnection) {
      io.emit('presence:update', {
        userId: user.id,
        username: user.username,
        status: 'online',
      });
    }

    // Send current online user IDs to the connected client
    const onlineUsers = await presence.getOnlineUsers();
    socket.emit('presence:initial', { onlineUsers });

    // Room Joining
    socket.on('room:join', async ({ roomId }) => {
      const parsedRoomId = parseInt(roomId, 10);
      if (isNaN(parsedRoomId)) return;

      const roomChannel = `room:${parsedRoomId}`;
      socket.join(roomChannel);

      // Send initial typing status in this room
      const typingUsers = await presence.getTyping(parsedRoomId);
      socket.emit('typing:update', { roomId: parsedRoomId, typingUsers });
    });

    // Room Leaving
    socket.on('room:leave', async ({ roomId }) => {
      const parsedRoomId = parseInt(roomId, 10);
      if (isNaN(parsedRoomId)) return;

      const roomChannel = `room:${parsedRoomId}`;
      socket.leave(roomChannel);

      const typingUsers = await presence.removeTyping(parsedRoomId, user.id);
      socket.to(roomChannel).emit('typing:update', { roomId: parsedRoomId, typingUsers });
    });

    // Message Sending & Broadcasting
    socket.on('message:send', async ({ roomId, content }, callback) => {
      try {
        const parsedRoomId = parseInt(roomId, 10);
        if (isNaN(parsedRoomId) || !content || !content.trim()) {
          if (callback) callback({ error: 'Invalid message payload' });
          return;
        }

        const trimmedContent = content.trim();

        // 1. Persist to PostgreSQL
        const insertSql = `
          INSERT INTO messages (room_id, sender_id, content)
          VALUES ($1, $2, $3)
          RETURNING id, room_id, sender_id, content, created_at;
        `;
        const result = await query(insertSql, [parsedRoomId, user.id, trimmedContent]);
        const savedMessage = result.rows[0];

        // 2. Fetch sender avatar details
        const userRes = await query('SELECT avatar_url FROM users WHERE id = $1', [user.id]);
        const avatarUrl = userRes.rows[0]?.avatar_url || null;

        const messagePayload = {
          id: savedMessage.id,
          room_id: savedMessage.room_id,
          sender_id: savedMessage.sender_id,
          username: user.username,
          avatar_url: avatarUrl,
          content: savedMessage.content,
          created_at: savedMessage.created_at,
        };

        // 3. Broadcast to all sockets in room channel
        io.to(`room:${parsedRoomId}`).emit('message:received', messagePayload);

        // 4. Also broadcast to member user channels in case socket hasn't joined room yet
        try {
          const memberRes = await query('SELECT user_id FROM room_members WHERE room_id = $1', [parsedRoomId]);
          memberRes.rows.forEach((m) => {
            io.to(`user:${m.user_id}`).emit('message:received', messagePayload);
          });
        } catch (e) {}

        // 5. Remove user from typing state in this room
        const updatedTyping = await presence.removeTyping(parsedRoomId, user.id);
        io.to(`room:${parsedRoomId}`).emit('typing:update', { roomId: parsedRoomId, typingUsers: updatedTyping });

        if (callback) callback({ success: true, message: messagePayload });
      } catch (err) {
        console.error('Error sending message:', err);
        if (callback) callback({ error: 'Failed to send message' });
      }
    });

    // Typing Indicators
    socket.on('typing:start', async ({ roomId }) => {
      const parsedRoomId = parseInt(roomId, 10);
      if (isNaN(parsedRoomId)) return;

      const typingUsers = await presence.setTyping(parsedRoomId, user.id, user.username);
      socket.to(`room:${parsedRoomId}`).emit('typing:update', {
        roomId: parsedRoomId,
        typingUsers,
      });
    });

    socket.on('typing:stop', async ({ roomId }) => {
      const parsedRoomId = parseInt(roomId, 10);
      if (isNaN(parsedRoomId)) return;

      const typingUsers = await presence.removeTyping(parsedRoomId, user.id);
      socket.to(`room:${parsedRoomId}`).emit('typing:update', {
        roomId: parsedRoomId,
        typingUsers,
      });
    });

    // Disconnect Handler
    socket.on('disconnect', async () => {
      console.log(`❌ User disconnected: ${user.username} (${socketId})`);
      const isCompletelyOffline = await presence.removeSocket(user.id, socketId);

      if (isCompletelyOffline) {
        io.emit('presence:update', {
          userId: user.id,
          username: user.username,
          status: 'offline',
        });
      }
    });
  });

  return io;
};
