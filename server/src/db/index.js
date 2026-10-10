// server/src/db/index.js
// Purpose: PostgreSQL connection pool management using pg with automatic graceful fallback for instant zero-config execution.

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const connectionString = process.env.DATABASE_URL || 'postgresql://chat_user:chat_pass@localhost:5432/team_chat';

export const pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 3000,
});

let isPostgresAvailable = false;

const dataDir = path.join(__dirname, '../../data');
const dataFilePath = path.join(dataDir, 'syncwave_db.json');

const DEFAULT_SEED = {
  users: [
    {
      id: 1,
      username: 'alice',
      email: 'alice@company.com',
      password_hash: '$2b$10$7MH9eDpwFoS8uDNRiMDox.5zSz4.8n4vjiVhM89gJNbHMtMZWzmmS', // password123
      avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=alice',
      created_at: new Date().toISOString(),
    },
    {
      id: 2,
      username: 'bob',
      email: 'bob@company.com',
      password_hash: '$2b$10$7MH9eDpwFoS8uDNRiMDox.5zSz4.8n4vjiVhM89gJNbHMtMZWzmmS', // password123
      avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=bob',
      created_at: new Date().toISOString(),
    },
  ],
  rooms: [
    { id: 1, name: 'general', description: 'Company-wide general discussions and announcements', is_private: false, created_by: null, created_at: new Date().toISOString() },
    { id: 2, name: 'engineering', description: 'Tech discussions, architecture, and code reviews', is_private: false, created_by: null, created_at: new Date().toISOString() },
    { id: 3, name: 'random', description: 'Casual banter, memes, and coffee break chats', is_private: false, created_by: null, created_at: new Date().toISOString() },
  ],
  room_members: [
    { room_id: 1, user_id: 1, joined_at: new Date().toISOString() },
    { room_id: 1, user_id: 2, joined_at: new Date().toISOString() },
    { room_id: 2, user_id: 1, joined_at: new Date().toISOString() },
    { room_id: 2, user_id: 2, joined_at: new Date().toISOString() },
    { room_id: 3, user_id: 1, joined_at: new Date().toISOString() },
    { room_id: 3, user_id: 2, joined_at: new Date().toISOString() },
  ],
  messages: [
    {
      id: 1,
      room_id: 1,
      sender_id: 1,
      content: 'Welcome to the new SyncWave real-time chat platform! 🚀',
      created_at: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 2,
      room_id: 1,
      sender_id: 2,
      content: 'Excited to be here! The WebSockets and presence synchronization are super snappy.',
      created_at: new Date(Date.now() - 1800000).toISOString(),
    },
  ],
};

const loadMemDb = () => {
  try {
    if (fs.existsSync(dataFilePath)) {
      const raw = fs.readFileSync(dataFilePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed.users && parsed.rooms && parsed.room_members && parsed.messages) {
        parsed.nextUserId = Math.max(...parsed.users.map((u) => u.id), 0) + 1;
        parsed.nextRoomId = Math.max(...parsed.rooms.map((r) => r.id), 0) + 1;
        parsed.nextMessageId = Math.max(...parsed.messages.map((m) => m.id), 0) + 1;
        console.log(`📦 Loaded database state from disk: ${parsed.users.length} users, ${parsed.rooms.length} rooms, ${parsed.messages.length} messages`);
        return parsed;
      }
    }
  } catch (err) {
    console.warn('⚠️ Could not read database file, initializing fresh seed:', err.message);
  }

  const initial = JSON.parse(JSON.stringify(DEFAULT_SEED));
  initial.nextUserId = 3;
  initial.nextRoomId = 4;
  initial.nextMessageId = 3;
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(dataFilePath, JSON.stringify(initial, null, 2), 'utf8');
    console.log('📦 Created fresh persistent database store at server/data/syncwave_db.json');
  } catch (err) {
    console.warn('⚠️ Could not initialize database file on disk:', err.message);
  }
  return initial;
};

// Persistent store initialized from disk
const memDb = loadMemDb();

const saveMemDb = () => {
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(dataFilePath, JSON.stringify(memDb, null, 2), 'utf8');
  } catch (err) {
    console.error('❌ Failed to persist database state to disk:', err.message);
  }
};

pool.on('error', () => {
  isPostgresAvailable = false;
});

/**
 * Execute parameterized query with fallback simulation if PostgreSQL is offline
 */
export const query = async (text, params = []) => {
  if (isPostgresAvailable) {
    try {
      return await pool.query(text, params);
    } catch (err) {
      console.warn('PostgreSQL query error, falling back to memory store:', err.message);
    }
  }

  // --- Fallback Query Handler ---
  const sql = text.trim();

  // Users Queries
  if (/SELECT.*FROM users WHERE username = \$1 OR email = \$2/i.test(sql)) {
    const targetUser = (params[0] || '').toLowerCase();
    const targetEmail = (params[1] || '').toLowerCase();
    const rows = memDb.users.filter((u) => u.username.toLowerCase() === targetUser || u.email.toLowerCase() === targetEmail);
    return { rows, rowCount: rows.length };
  }

  if (/SELECT.*FROM users WHERE email = \$1/i.test(sql)) {
    const targetEmail = (params[0] || '').toLowerCase();
    const rows = memDb.users.filter((u) => u.email.toLowerCase() === targetEmail);
    return { rows, rowCount: rows.length };
  }

  if (/SELECT.*FROM users WHERE id = \$1/i.test(sql)) {
    const rows = memDb.users.filter((u) => u.id === Number(params[0]));
    return { rows, rowCount: rows.length };
  }

  if (/INSERT INTO users/i.test(sql)) {
    const newUser = {
      id: memDb.nextUserId++,
      username: params[0],
      email: params[1],
      password_hash: params[2],
      avatar_url: params[3],
      created_at: new Date().toISOString(),
    };
    memDb.users.push(newUser);
    saveMemDb();
    return { rows: [newUser], rowCount: 1 };
  }

  // Users Directory Query
  if (/SELECT.*FROM users WHERE id != \$1/i.test(sql) || (/SELECT.*FROM users/i.test(sql) && !/WHERE/i.test(sql))) {
    const excludeId = params[0] ? Number(params[0]) : null;
    const rows = memDb.users
      .filter((u) => u.id !== excludeId)
      .map((u) => ({
        id: u.id,
        username: u.username,
        email: u.email,
        avatar_url: u.avatar_url,
      }));
    return { rows, rowCount: rows.length };
  }

  // Rooms Queries
  if (/FROM rooms r/i.test(sql) || /member_count/i.test(sql)) {
    const userId = Number(params[0]);
    const filteredRooms = memDb.rooms.filter((r) => {
      if (!r.is_private) return true;
      return memDb.room_members.some((rm) => rm.room_id === r.id && rm.user_id === userId);
    });

    const rows = filteredRooms.map((r) => {
      const members = memDb.room_members.filter((rm) => rm.room_id === r.id);
      const isMember = members.some((rm) => rm.user_id === userId);
      return {
        ...r,
        member_count: members.length,
        is_member: isMember,
      };
    });
    return { rows, rowCount: rows.length };
  }

  if (/SELECT id FROM rooms WHERE name = \$1/i.test(sql)) {
    const rows = memDb.rooms.filter((r) => r.name === params[0]);
    return { rows, rowCount: rows.length };
  }

  if (/SELECT.*FROM rooms WHERE id = \$1/i.test(sql)) {
    const rows = memDb.rooms.filter((r) => r.id === Number(params[0]));
    return { rows, rowCount: rows.length };
  }

  if (/SELECT id FROM rooms WHERE is_private = FALSE/i.test(sql)) {
    const rows = memDb.rooms.filter((r) => !r.is_private);
    return { rows, rowCount: rows.length };
  }

  if (/INSERT INTO rooms/i.test(sql)) {
    const newRoom = {
      id: memDb.nextRoomId++,
      name: params[0],
      description: params[1] || '',
      is_private: !!params[2],
      created_by: params[3] || null,
      created_at: new Date().toISOString(),
    };
    memDb.rooms.push(newRoom);
    saveMemDb();
    return { rows: [newRoom], rowCount: 1 };
  }

  // Room Members
  if (/INSERT INTO room_members/i.test(sql)) {
    const rId = Number(params[0]);
    const uId = Number(params[1]);
    if (!memDb.room_members.some((rm) => rm.room_id === rId && rm.user_id === uId)) {
      memDb.room_members.push({ room_id: rId, user_id: uId, joined_at: new Date().toISOString() });
      saveMemDb();
    }
    return { rows: [], rowCount: 1 };
  }

  if (/SELECT.*room_id.*FROM room_members WHERE user_id = \$1/i.test(sql)) {
    const uId = Number(params[0]);
    const rows = memDb.room_members.filter((rm) => rm.user_id === uId).map((rm) => ({ room_id: rm.room_id }));
    return { rows, rowCount: rows.length };
  }

  if (/SELECT.*user_id.*FROM room_members WHERE room_id = \$1/i.test(sql)) {
    const rId = Number(params[0]);
    const rows = memDb.room_members.filter((rm) => rm.room_id === rId).map((rm) => ({ user_id: rm.user_id }));
    return { rows, rowCount: rows.length };
  }

  if (/SELECT.*FROM room_members WHERE room_id = \$1 AND user_id = \$2/i.test(sql)) {
    const rId = Number(params[0]);
    const uId = Number(params[1]);
    const isMember = memDb.room_members.some((rm) => rm.room_id === rId && rm.user_id === uId);
    return { rows: isMember ? [{ ok: 1 }] : [], rowCount: isMember ? 1 : 0 };
  }

  if (/COUNT.*FROM room_members WHERE room_id = \$1/i.test(sql)) {
    const rId = Number(params[0]);
    const count = memDb.room_members.filter((rm) => rm.room_id === rId).length;
    return { rows: [{ count }], rowCount: 1 };
  }

  if (/DELETE FROM room_members/i.test(sql)) {
    const rId = Number(params[0]);
    const uId = Number(params[1]);
    memDb.room_members = memDb.room_members.filter(
      (rm) => !(rm.room_id === rId && rm.user_id === uId)
    );
    saveMemDb();
    return { rows: [], rowCount: 1 };
  }

  if (/SELECT.*FROM room_members rm.*JOIN users u/is.test(sql)) {
    const rId = Number(params[0]);
    const memberUserIds = memDb.room_members.filter((rm) => rm.room_id === rId).map((rm) => rm.user_id);
    const rows = memDb.users
      .filter((u) => memberUserIds.includes(u.id))
      .map((u) => ({
        id: u.id,
        username: u.username,
        email: u.email,
        avatar_url: u.avatar_url,
      }));
    return { rows, rowCount: rows.length };
  }

  // Messages
  if (/SELECT.*FROM messages m/is.test(sql)) {
    const rId = Number(params[0]);
    const beforeId = params[1] ? Number(params[1]) : null;
    const limit = Number(params[2]) || 50;

    let filtered = memDb.messages.filter((m) => m.room_id === rId);
    if (beforeId) {
      filtered = filtered.filter((m) => m.id < beforeId);
    }
    filtered.sort((a, b) => b.id - a.id);
    const sliced = filtered.slice(0, limit);

    const rows = sliced.map((m) => {
      const sender = memDb.users.find((u) => u.id === m.sender_id);
      return {
        id: m.id,
        room_id: m.room_id,
        sender_id: m.sender_id,
        content: m.content,
        created_at: m.created_at,
        username: sender ? sender.username : 'Unknown',
        avatar_url: sender ? sender.avatar_url : null,
      };
    });

    return { rows, rowCount: rows.length };
  }

  if (/INSERT INTO messages/i.test(sql)) {
    const newMsg = {
      id: memDb.nextMessageId++,
      room_id: Number(params[0]),
      sender_id: Number(params[1]),
      content: params[2],
      created_at: new Date().toISOString(),
    };
    memDb.messages.push(newMsg);
    saveMemDb();
    return { rows: [newMsg], rowCount: 1 };
  }

  return { rows: [], rowCount: 0 };
};

/**
 * Initialize database schema on startup
 */
export const initDb = async () => {
  try {
    const client = await pool.connect();
    isPostgresAvailable = true;
    console.log('✅ PostgreSQL connected successfully');

    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await client.query(schemaSql);
      console.log('✅ Database schema synchronized successfully');
    }
    client.release();
    return true;
  } catch (err) {
    isPostgresAvailable = false;
    console.log('ℹ️ PostgreSQL offline — active with in-memory persistence store for instant local execution.');
    return false;
  }
};
