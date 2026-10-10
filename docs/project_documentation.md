# Production Real-Time Team Chat Application: Full Technical Documentation & Architecture Specification

---

## 1. Executive Summary
This document provides complete technical documentation for the **Real-Time Team Chat Application**, designed with a modern, high-concurrency micro-architecture. The application demonstrates production full-stack engineering principles, including distributed real-time messaging, state synchronization, relational persistence without ORMs, and caching strategies.

---

## 2. System Architecture

```
                                    +-----------------------------------------+
                                    |         Client Browser Tier             |
                                    |  React 19 + Vite (Single Page App)      |
                                    +--------------------+--------------------+
                                                         |
                                 +-----------------------+-----------------------+
                                 | HTTP / REST (5000)                            | WebSockets (WSS)
                                 v                                               v
        +-----------------------------------------------------------------------------------------+
        |                                Node.js / Express 5 API Server                            |
        |  - Auth Middleware (JWT)               - Socket.io 4 Engine                            |
        |  - Zod Request Validators              - Event Dispatchers (Chat, Presence, Typing)     |
        |  - REST Controllers                    - Socket Handshake JWT Auth                      |
        +----------------------------+--------------------------------------------+---------------+
                                     |                                            |
                                     v (pg pool)                                  v (ioredis / redis adapter)
                  +----------------------------------+        +-----------------------------------+
                  |          PostgreSQL 16           |        |              Redis 7              |
                  |  - Persistent Users Storage      |        |  - Socket.io Pub/Sub Adapter      |
                  |  - Rooms & Membership Relational |        |  - Ephemeral Presence (Sets)      |
                  |  - Indexed Message History       |        |  - Ephemeral Typing Timers        |
                  +----------------------------------+        +-----------------------------------+
```

---

## 3. Database Schema Design (PostgreSQL 16)

The relational schema is implemented with raw SQL to demonstrate deep relational database fundamentals:

```sql
-- 1. Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Chat Rooms Table
CREATE TABLE rooms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_private BOOLEAN DEFAULT FALSE,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Room Membership (Many-to-Many Join Table)
CREATE TABLE room_members (
    room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (room_id, user_id)
);

-- 4. Messages Table
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
    sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fast query execution
CREATE INDEX idx_messages_room_created_at ON messages(room_id, created_at DESC);
CREATE INDEX idx_room_members_user_id ON room_members(user_id);
```

---

## 4. Redis Key Design & Ephemeral Data Patterns

Redis is utilized for fast, ephemeral state changes that would create unnecessary write locks and bloat in a relational database:

| Key Pattern | Data Structure | Purpose | Expiration / Eviction Policy |
| :--- | :--- | :--- | :--- |
| `presence:online_users` | **Set** | Holds active `user_id`s | Maintained on socket connect/disconnect |
| `presence:user:<user_id>:sockets` | **Set** | Sockets associated with one user (multi-tab support) | Cleared when set becomes empty |
| `typing:room:<room_id>` | **Set** | Current users typing in a specific room | Members expire via Redis TTL / client event |

---

## 5. Real-Time Socket.io Event Dictionary

### Handshake Authentication
Client connects with:
```javascript
const socket = io(SERVER_URL, {
  auth: { token: "Bearer <JWT_TOKEN>" }
});
```

### Event Contracts
| Event Name | Direction | Payload | Description |
| :--- | :--- | :--- | :--- |
| `room:join` | Client $\rightarrow$ Server | `{ roomId: number }` | Adds socket to room channel |
| `room:leave` | Client $\rightarrow$ Server | `{ roomId: number }` | Removes socket from room channel |
| `message:send` | Client $\rightarrow$ Server | `{ roomId: number, content: string }` | Sends a message to be saved and broadcasted |
| `message:received` | Server $\rightarrow$ Client | `{ id, roomId, senderId, username, content, createdAt }` | Broadcasted to all sockets in the room |
| `typing:start` | Client $\rightarrow$ Server | `{ roomId: number }` | Signals user started typing in a room |
| `typing:stop` | Client $\rightarrow$ Server | `{ roomId: number }` | Signals user stopped typing in a room |
| `typing:update` | Server $\rightarrow$ Client | `{ roomId: number, typingUsers: string[] }` | Broadcasted typing status updates |
| `presence:update` | Server $\rightarrow$ Client | `{ userId: number, status: 'online' \| 'offline' }` | Broadcasted when user connects/disconnects |

---

## 6. REST API Specification

### Authentication
- `POST /api/auth/register` - Create account (validates email, username, password with Zod, hashes with `bcrypt`).
- `POST /api/auth/login` - Authenticate credentials and receive signed JWT.
- `GET /api/auth/me` - Validate session and retrieve current authenticated user details.

### Room Management
- `GET /api/rooms` - List available rooms and joined status.
- `POST /api/rooms` - Create a new channel.
- `GET /api/rooms/:id/messages` - Fetch paginated message history (`limit`, `cursor`).
- `POST /api/rooms/:id/join` - Join a room.
- `POST /api/rooms/:id/leave` - Leave a room.

---

## 7. Key Placement Interview Talking Points

1. **Why Pure `pg` instead of Prisma / TypeORM / Sequelize?**
   - *Explanation*: ORMs abstract SQL generation, introducing query overhead, N+1 query traps, and masking underlying relational concepts. Using raw parameterized SQL demonstrates mastery of indexing, joins, connection pooling, and SQL injection prevention.

2. **Why Redis Adapter for Socket.io?**
   - *Explanation*: By default, Socket.io manages connections in local server memory. In a distributed multi-instance deployment, Client A connected to Server 1 cannot communicate with Client B connected to Server 2. The Redis Pub/Sub adapter broadcasts events across all server nodes seamlessly.

3. **Handling Multi-Tab Presence**:
   - *Explanation*: If a user opens 3 tabs, they have 3 active socket connections. Marking them offline on a single tab disconnect would be a bug. We store socket IDs in a Redis set per user (`presence:user:<id>:sockets`). The user is only marked offline when the set size drops to 0.

4. **Security & Validation**:
   - Input validation at runtime using **Zod**.
   - Password hashing with salted **bcrypt** (work factor 10-12).
   - Stateless **JWT** authentication with tamper-proof signatures.
