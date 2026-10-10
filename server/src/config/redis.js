// server/src/config/redis.js
// Purpose: Redis client management for Socket.io adapter, presence sets, and ephemeral typing state.

import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

let redisClient = null;
let redisPubClient = null;
let redisSubClient = null;
let isRedisAvailable = false;

// Fallback in-memory presence store if Redis is unavailable
const memoryPresence = {
  onlineUsers: new Set(),
  userSockets: new Map(), // userId -> Set(socketId)
  roomTyping: new Map(), // roomId -> Map(userId -> { username, timer })
};

try {
  redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    retryStrategy: (times) => {
      if (times > 3) {
        console.warn('⚠️ Redis offline. Using in-memory fallback for presence & typing.');
        return null; // stop reconnecting
      }
      return Math.min(times * 200, 2000);
    },
    lazyConnect: true,
  });

  redisClient.on('connect', () => {
    isRedisAvailable = true;
    console.log('✅ Redis connected successfully');
  });

  redisClient.on('error', (err) => {
    isRedisAvailable = false;
  });

  redisClient.connect().catch(() => {
    isRedisAvailable = false;
  });

  redisPubClient = redisClient.duplicate();
  redisSubClient = redisClient.duplicate();
} catch (e) {
  isRedisAvailable = false;
}

// Presence Helpers
export const presence = {
  /**
   * Add a socket connection for a user. Returns true if user just came online (first socket)
   */
  async addSocket(userId, socketId) {
    const uid = String(userId);
    if (isRedisAvailable && redisClient.status === 'ready') {
      try {
        const added = await redisClient.sadd(`presence:user:${uid}:sockets`, socketId);
        await redisClient.sadd('presence:online_users', uid);
        const count = await redisClient.scard(`presence:user:${uid}:sockets`);
        return count === 1; // True if this is the first active connection for this user
      } catch (e) {
        // Fallback to memory
      }
    }
    
    // In-memory fallback
    if (!memoryPresence.userSockets.has(uid)) {
      memoryPresence.userSockets.set(uid, new Set());
    }
    const sockets = memoryPresence.userSockets.get(uid);
    const wasEmpty = sockets.size === 0;
    sockets.add(socketId);
    memoryPresence.onlineUsers.add(uid);
    return wasEmpty;
  },

  /**
   * Remove a socket connection for a user. Returns true if user went completely offline (0 sockets left)
   */
  async removeSocket(userId, socketId) {
    const uid = String(userId);
    if (isRedisAvailable && redisClient.status === 'ready') {
      try {
        await redisClient.srem(`presence:user:${uid}:sockets`, socketId);
        const count = await redisClient.scard(`presence:user:${uid}:sockets`);
        if (count === 0) {
          await redisClient.srem('presence:online_users', uid);
          await redisClient.del(`presence:user:${uid}:sockets`);
          return true; // User is now fully offline
        }
        return false;
      } catch (e) {
        // Fallback to memory
      }
    }

    // In-memory fallback
    if (memoryPresence.userSockets.has(uid)) {
      const sockets = memoryPresence.userSockets.get(uid);
      sockets.delete(socketId);
      if (sockets.size === 0) {
        memoryPresence.userSockets.delete(uid);
        memoryPresence.onlineUsers.delete(uid);
        return true;
      }
    }
    return false;
  },

  /**
   * Get all currently online user IDs
   */
  async getOnlineUsers() {
    if (isRedisAvailable && redisClient.status === 'ready') {
      try {
        const users = await redisClient.smembers('presence:online_users');
        return users.map((id) => Number(id));
      } catch (e) {
        // Fallback
      }
    }
    return Array.from(memoryPresence.onlineUsers).map((id) => Number(id));
  },

  /**
   * Set user typing in room
   */
  async setTyping(roomId, userId, username) {
    const rKey = `typing:room:${roomId}`;
    if (isRedisAvailable && redisClient.status === 'ready') {
      try {
        await redisClient.hset(rKey, String(userId), username);
        await redisClient.expire(rKey, 5); // 5s TTL
        const raw = await redisClient.hgetall(rKey);
        return Object.values(raw);
      } catch (e) {
        // Fallback
      }
    }

    if (!memoryPresence.roomTyping.has(roomId)) {
      memoryPresence.roomTyping.set(roomId, new Map());
    }
    const map = memoryPresence.roomTyping.get(roomId);
    map.set(userId, username);
    return Array.from(map.values());
  },

  /**
   * Remove user typing in room
   */
  async removeTyping(roomId, userId) {
    const rKey = `typing:room:${roomId}`;
    if (isRedisAvailable && redisClient.status === 'ready') {
      try {
        await redisClient.hdel(rKey, String(userId));
        const raw = await redisClient.hgetall(rKey);
        return Object.values(raw);
      } catch (e) {
        // Fallback
      }
    }

    if (memoryPresence.roomTyping.has(roomId)) {
      const map = memoryPresence.roomTyping.get(roomId);
      map.delete(userId);
      return Array.from(map.values());
    }
    return [];
  },

  /**
   * Get currently typing users in a room
   */
  async getTyping(roomId) {
    const rKey = `typing:room:${roomId}`;
    if (isRedisAvailable && redisClient.status === 'ready') {
      try {
        const raw = await redisClient.hgetall(rKey);
        return Object.values(raw);
      } catch (e) {
        // Fallback
      }
    }
    if (memoryPresence.roomTyping.has(roomId)) {
      return Array.from(memoryPresence.roomTyping.get(roomId).values());
    }
    return [];
  },
};

export { redisClient, redisPubClient, redisSubClient, isRedisAvailable };
