// server/src/controllers/room.controller.js
// Purpose: Handles chat room CRUD operations, memberships, direct messaging (DMs), and real-time room broadcasting.

import { z } from 'zod';
import { query } from '../db/index.js';

export const createRoomSchema = z.object({
  name: z
    .string()
    .min(2, 'Room name must be at least 2 characters')
    .max(50, 'Room name cannot exceed 50 characters')
    .regex(/^[a-zA-Z0-9-_ ]+$/, 'Room name can only contain letters, numbers, spaces, hyphens and underscores'),
  description: z.string().max(255).optional().default(''),
  isPrivate: z.boolean().optional().default(false),
});

export const createDMSchema = z.object({
  targetUserId: z.number().int().positive('Valid target user ID required'),
});

/**
 * Get all rooms (channels & active DMs) for the current user
 */
export const getRooms = async (req, res) => {
  try {
    const userId = req.user.id;

    const sql = `
      SELECT 
        r.id,
        r.name,
        r.description,
        r.is_private,
        r.created_by,
        r.created_at,
        COUNT(DISTINCT rm.user_id)::INTEGER AS member_count,
        EXISTS (
          SELECT 1 FROM room_members rm_user 
          WHERE rm_user.room_id = r.id AND rm_user.user_id = $1
        ) AS is_member
      FROM rooms r
      LEFT JOIN room_members rm ON rm.room_id = r.id
      WHERE r.is_private = FALSE OR EXISTS (
        SELECT 1 FROM room_members rm_priv 
        WHERE rm_priv.room_id = r.id AND rm_priv.user_id = $1
      )
      GROUP BY r.id
      ORDER BY r.created_at ASC;
    `;

    const result = await query(sql, [userId]);
    const rooms = await Promise.all(
      result.rows.map(async (room) => {
        // Handle Direct Messages
        if (room.name.startsWith('dm:')) {
          const parts = room.name.split(':');
          const otherUserId = Number(parts[1]) === userId ? Number(parts[2]) : Number(parts[1]);
          const userRes = await query('SELECT id, username, avatar_url FROM users WHERE id = $1', [otherUserId]);
          const otherUser = userRes.rows[0];

          return {
            ...room,
            is_dm: true,
            dm_user: otherUser || { id: otherUserId, username: 'Unknown User' },
            display_name: otherUser ? `@${otherUser.username}` : room.name,
          };
        }

        return {
          ...room,
          is_dm: false,
          display_name: `#${room.name}`,
        };
      })
    );

    return res.status(200).json({ rooms });
  } catch (error) {
    console.error('getRooms error:', error);
    return res.status(500).json({ error: 'Failed to retrieve rooms' });
  }
};

/**
 * Create a new public or private room and broadcast to all users
 */
export const createRoom = async (req, res) => {
  try {
    const userId = req.user.id;
    const companyId = req.user.company_id || 1;
    const { name, description, isPrivate } = req.body;

    const formattedName = name.trim().toLowerCase().replace(/\s+/g, '-');

    if (formattedName.startsWith('dm:')) {
      return res.status(400).json({ error: 'Room name cannot start with dm:' });
    }

    const existing = await query('SELECT id FROM rooms WHERE company_id = $1 AND name = $2', [companyId, formattedName]);
    if (existing.rowCount > 0) {
      return res.status(409).json({ error: 'A room with this name already exists in your workspace' });
    }

    const roomResult = await query(
      `INSERT INTO rooms (company_id, name, description, is_private, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, company_id, name, description, is_private, created_by, created_at`,
      [companyId, formattedName, description, isPrivate || false, userId]
    );

    const newRoom = roomResult.rows[0];

    // Add creator as member
    await query(
      'INSERT INTO room_members (room_id, user_id) VALUES ($1, $2)',
      [newRoom.id, userId]
    );

    const roomPayload = {
      ...newRoom,
      member_count: 1,
      is_member: true,
      is_dm: false,
      display_name: `#${newRoom.name}`,
    };

    // Broadcast new channel to all connected sockets in company if public
    const io = req.app.get('io');
    if (io && !newRoom.is_private) {
      io.emit('room:created', {
        ...roomPayload,
        is_member: false, // For other users initially
      });
    }

    return res.status(201).json({ room: roomPayload });
  } catch (error) {
    console.error('createRoom error:', error);
    return res.status(500).json({ error: 'Failed to create room' });
  }
};

/**
 * Get or create a 1-on-1 Direct Message conversation
 */
export const getOrCreateDM = async (req, res) => {
  try {
    const userId = req.user.id;
    const targetUserId = req.body.targetUserId;

    if (userId === targetUserId) {
      return res.status(400).json({ error: 'Cannot start a direct message with yourself' });
    }

    // Verify target user exists and belongs to same workspace
    const targetUserRes = await query('SELECT id, company_id, username, avatar_url FROM users WHERE id = $1', [targetUserId]);
    if (targetUserRes.rowCount === 0) {
      return res.status(404).json({ error: 'Target user not found' });
    }
    const targetUser = targetUserRes.rows[0];

    const userCompId = req.user.company_id || 1;
    const targetCompId = targetUser.company_id || 1;
    if (userCompId !== targetCompId) {
      return res.status(403).json({ error: 'Cannot direct message users outside your company workspace' });
    }

    // Deterministic room name for pair
    const minId = Math.min(userId, targetUserId);
    const maxId = Math.max(userId, targetUserId);
    const dmRoomName = `dm:${minId}:${maxId}`;

    const existingRoom = await query('SELECT * FROM rooms WHERE name = $1', [dmRoomName]);

    let roomId;
    let roomRecord;

    if (existingRoom.rowCount > 0) {
      roomRecord = existingRoom.rows[0];
      roomId = roomRecord.id;
    } else {
      // Create new private DM room in company
      const insertResult = await query(
        `INSERT INTO rooms (company_id, name, description, is_private, created_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, company_id, name, description, is_private, created_by, created_at`,
        [userCompId, dmRoomName, `Direct Message between user ${userId} and ${targetUserId}`, true, userId]
      );
      roomRecord = insertResult.rows[0];
      roomId = roomRecord.id;

      // Add both users as members
      await query('INSERT INTO room_members (room_id, user_id) VALUES ($1, $2)', [roomId, userId]);
      await query('INSERT INTO room_members (room_id, user_id) VALUES ($1, $2)', [roomId, targetUserId]);
    }

    const dmPayload = {
      ...roomRecord,
      member_count: 2,
      is_member: true,
      is_dm: true,
      dm_user: targetUser,
      display_name: `@${targetUser.username}`,
    };

    // Real-time synchronization for recipient
    const io = req.app.get('io');
    if (io) {
      try {
        // Automatically attach both users' sockets to this room channel
        io.in(`user:${userId}`).socketsJoin(`room:${roomId}`);
        io.in(`user:${targetUserId}`).socketsJoin(`room:${roomId}`);

        // Notify recipient with their DM perspective
        const userRes = await query('SELECT id, username, avatar_url FROM users WHERE id = $1', [userId]);
        const senderUser = userRes.rows[0];

        const targetPayload = {
          ...roomRecord,
          member_count: 2,
          is_member: true,
          is_dm: true,
          dm_user: senderUser,
          display_name: `@${senderUser?.username || 'User'}`,
        };
        io.to(`user:${targetUserId}`).emit('room:created', targetPayload);
      } catch (err) {
        console.error('Socket DM notification error:', err);
      }
    }

    return res.status(200).json({ room: dmPayload });
  } catch (error) {
    console.error('getOrCreateDM error:', error);
    return res.status(500).json({ error: 'Failed to initialize direct message' });
  }
};

/**
 * Join an existing channel
 */
export const joinRoom = async (req, res) => {
  try {
    const userId = req.user.id;
    const roomId = parseInt(req.params.id, 10);

    if (isNaN(roomId)) {
      return res.status(400).json({ error: 'Invalid room ID' });
    }

    const roomCheck = await query('SELECT id, name, is_private FROM rooms WHERE id = $1', [roomId]);
    if (roomCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    await query(
      `INSERT INTO room_members (room_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (room_id, user_id) DO NOTHING`,
      [roomId, userId]
    );

    // Calculate new member count
    const membersRes = await query('SELECT COUNT(*)::INTEGER as count FROM room_members WHERE room_id = $1', [roomId]);
    const memberCount = membersRes.rows[0]?.count || 1;

    // Broadcast member count update
    const io = req.app.get('io');
    if (io) {
      io.emit('room:member_joined', {
        roomId,
        userId,
        username: req.user.username,
        memberCount,
      });
    }

    return res.status(200).json({ message: 'Successfully joined room', roomId, memberCount });
  } catch (error) {
    console.error('joinRoom error:', error);
    return res.status(500).json({ error: 'Failed to join room' });
  }
};

/**
 * Invite / add a user to a private or public channel
 */
export const inviteToRoom = async (req, res) => {
  try {
    const userId = req.user.id;
    const roomId = parseInt(req.params.id, 10);
    const targetUserId = parseInt(req.body.targetUserId, 10);

    if (isNaN(roomId) || isNaN(targetUserId)) {
      return res.status(400).json({ error: 'Invalid room or user ID' });
    }

    // Verify room exists
    const roomRes = await query('SELECT * FROM rooms WHERE id = $1', [roomId]);
    if (roomRes.rowCount === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    const room = roomRes.rows[0];

    // Check if requester is a member
    const memberCheck = await query('SELECT 1 FROM room_members WHERE room_id = $1 AND user_id = $2', [roomId, userId]);
    if (memberCheck.rowCount === 0) {
      return res.status(403).json({ error: 'You must be a member of this channel to invite others' });
    }

    // Add target user to room_members
    await query(
      `INSERT INTO room_members (room_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (room_id, user_id) DO NOTHING`,
      [roomId, targetUserId]
    );

    // Get updated member count
    const countRes = await query('SELECT COUNT(*)::INTEGER as count FROM room_members WHERE room_id = $1', [roomId]);
    const memberCount = countRes.rows[0]?.count || 1;

    // Get target user details
    const targetUserRes = await query('SELECT id, username, avatar_url FROM users WHERE id = $1', [targetUserId]);
    const targetUser = targetUserRes.rows[0];

    const io = req.app.get('io');
    if (io) {
      // 1. Join invited user's sockets to the room channel
      io.in(`user:${targetUserId}`).socketsJoin(`room:${roomId}`);

      // 2. Notify the invited user so the channel appears on their sidebar immediately
      const invitedPayload = {
        ...room,
        member_count: memberCount,
        is_member: true,
        is_dm: false,
        display_name: `#${room.name}`,
      };
      io.to(`user:${targetUserId}`).emit('room:created', invitedPayload);

      // 3. Notify everyone in room about the new member
      io.to(`room:${roomId}`).emit('room:member_joined', {
        roomId,
        userId: targetUserId,
        username: targetUser?.username,
        memberCount,
      });

      // 4. Post announcement message in room
      const sysMsgRes = await query(
        `INSERT INTO messages (room_id, sender_id, content)
         VALUES ($1, $2, $3)
         RETURNING id, room_id, sender_id, content, created_at;`,
        [roomId, userId, `added @${targetUser?.username || 'colleague'} to the channel.`]
      );
      const savedMsg = sysMsgRes.rows[0];
      io.to(`room:${roomId}`).emit('message:received', {
        ...savedMsg,
        username: req.user.username,
        avatar_url: req.user.avatar_url,
      });
    }

    return res.status(200).json({ message: 'User successfully invited', memberCount });
  } catch (error) {
    console.error('inviteToRoom error:', error);
    return res.status(500).json({ error: 'Failed to invite user' });
  }
};

/**
 * Leave a room
 */
export const leaveRoom = async (req, res) => {
  try {
    const userId = req.user.id;
    const roomId = parseInt(req.params.id, 10);

    if (isNaN(roomId)) {
      return res.status(400).json({ error: 'Invalid room ID' });
    }

    await query(
      'DELETE FROM room_members WHERE room_id = $1 AND user_id = $2',
      [roomId, userId]
    );

    const membersRes = await query('SELECT COUNT(*)::INTEGER as count FROM room_members WHERE room_id = $1', [roomId]);
    const memberCount = membersRes.rows[0]?.count || 0;

    const io = req.app.get('io');
    if (io) {
      io.emit('room:member_left', {
        roomId,
        userId,
        memberCount,
      });
    }

    return res.status(200).json({ message: 'Successfully left room', roomId, memberCount });
  } catch (error) {
    console.error('leaveRoom error:', error);
    return res.status(500).json({ error: 'Failed to leave room' });
  }
};

/**
 * Get members of a room
 */
export const getRoomMembers = async (req, res) => {
  try {
    const roomId = parseInt(req.params.id, 10);
    if (isNaN(roomId)) {
      return res.status(400).json({ error: 'Invalid room ID' });
    }

    const sql = `
      SELECT u.id, u.username, u.email, u.avatar_url, rm.joined_at
      FROM room_members rm
      JOIN users u ON u.id = rm.user_id
      WHERE rm.room_id = $1
      ORDER BY u.username ASC;
    `;

    const result = await query(sql, [roomId]);
    return res.status(200).json({ members: result.rows });
  } catch (error) {
    console.error('getRoomMembers error:', error);
    return res.status(500).json({ error: 'Failed to fetch members' });
  }
};

/**
 * Get all users in the same company for starting DMs and discovering colleagues
 */
export const getUsersDirectory = async (req, res) => {
  try {
    const userId = req.user.id;
    const companyId = req.user.company_id || 1;
    const result = await query(
      'SELECT id, username, email, avatar_url, role, company_id, created_at FROM users WHERE company_id = $1 AND id != $2',
      [companyId, userId]
    );
    return res.status(200).json({ users: result.rows });
  } catch (error) {
    console.error('getUsersDirectory error:', error);
    return res.status(500).json({ error: 'Failed to fetch users directory' });
  }
};

/**
 * Delete a room (channel) - Allowed for Company Admins or Channel Creator
 */
export const deleteRoom = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const roomId = parseInt(req.params.id, 10);

    if (isNaN(roomId)) {
      return res.status(400).json({ error: 'Invalid room ID' });
    }

    const roomRes = await query('SELECT * FROM rooms WHERE id = $1', [roomId]);
    if (roomRes.rowCount === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    const room = roomRes.rows[0];

    // Only workspace admins or the channel creator can delete
    if (userRole !== 'admin' && room.created_by !== userId) {
      return res.status(403).json({ error: 'Forbidden: Only workspace admins or channel creators can delete channels' });
    }

    await query('DELETE FROM rooms WHERE id = $1', [roomId]);

    const io = req.app.get('io');
    if (io) {
      io.emit('room:deleted', { roomId });
    }

    return res.status(200).json({ message: 'Channel deleted successfully', roomId });
  } catch (error) {
    console.error('deleteRoom error:', error);
    return res.status(500).json({ error: 'Failed to delete channel' });
  }
};
