# Real-Time Team Chat Application: Project Master Blueprint

## 1. Project Vision & Outcomes

### What You Will Get From This Project
1. **Resume-Ready Full Stack Architecture**: A production-grade distributed real-time application (not a toy single-file chat app).
2. **Deep Interview Readiness**: The ability to explain and defend every architectural decision:
   - Why Redis is used alongside PostgreSQL (caching & ephemeral state vs. persistent relational records).
   - How WebSocket connections scale across multiple server instances via Redis Pub/Sub (Socket.io Redis Adapter).
   - How stateless JWT authentication pairs securely with stateful WebSocket handshakes.
   - How connection lifecycle (disconnect, reconnect, heartbeat) and edge cases are handled.
3. **Hands-on Core Engineering**: You will write the core database queries, authentication controllers, Socket.io event pipelines, and custom React hooks yourself.

---

## 2. Feature Specification

| Category | Feature | Implementation Details |
| :--- | :--- | :--- |
| **Authentication** | Secure Signup & Login | Password hashing (`bcrypt`), JWT issue & verification, Zod input validation schemas. |
| **Chat Rooms** | Room Management | Create public/private channels, join/leave room logic, channel member listing. |
| **Real-Time Engine** | Direct & Channel Messaging | Full duplex WebSocket communication via Socket.io 4, event acknowledgements, optimistic UI updates. |
| **Presence System** | Online / Offline Status | Redis Hash / Sets tracking user socket IDs and active statuses with heartbeat/disconnect hooks. |
| **Typing Indicator** | Transient Typing Events | Debounced keystroke emissions routed through Redis with automatic expiration / timeouts. |
| **Message History** | Persistent Chat Archive | Indexed PostgreSQL relational storage (`messages`, `rooms`, `users`), cursor/limit pagination for smooth scrolling. |
| **Deployment** | Production Build | Multi-stage Docker setup, cloud database integration, reverse proxy configuration. |

---

## 3. Technology Stack & Architectural Roles

```
                      +-----------------------------+
                      |   React 19 + Vite Client    |
                      | (react-router-dom, context) |
                      +--------------+--------------+
                                     |
                       HTTP / REST   |   WebSocket (Socket.io)
                                     v
                      +-----------------------------+
                      |   Node.js + Express 5       |
                      |   (ES Modules, Zod, JWT)    |
                      +--------------+--------------+
                                     |
                   +-----------------+-----------------+
                   |                                   |
                   v                                   v
    +------------------------------+   +-------------------------------+
    |       PostgreSQL 16          |   |            Redis 7            |
    | (Users, Rooms, Message Log)  |   | (Presence, Typing, Pub/Sub)   |
    +------------------------------+   +-------------------------------+
```

- **Frontend (Client)**:
  - **React 19 & Vite**: Fast bundling, modern hooks, and component lifecycle management.
  - **`react-router-dom`**: Protected routes (`/login`, `/register`, `/chat`, `/rooms`).
  - **`socket.io-client` & Custom Hook (`useSocket`)**: Manages socket reconnection, event listeners, and cleanup.
- **Backend (Server)**:
  - **Node.js (LTS) & Express 5**: Clean REST endpoints for authentication and room management.
  - **`pg` (Pure SQL Driver)**: Raw SQL queries with parameterized queries to prevent SQL injection (no ORM abstraction hiding database concepts).
  - **Socket.io 4**: Event-driven bidirectional communication.
  - **`@socket.io/redis-adapter`**: Enables horizontal scaling across multiple Node.js processes.
- **Data & Caching Tier**:
  - **PostgreSQL 16**: Relational integrity, foreign keys, timestamps, indexes on `room_id` and `created_at`.
  - **Redis 7**: Ephemeral presence caching (`user:presence:<id>`) and pub/sub message brokering.

---

## 4. Step-by-Step Implementation Roadmap

Our journey is broken down into structured, isolated parts:

### **Part 1: Project Skeleton & Containerized Infrastructure**
- Scaffolding backend & frontend directory layout.
- `docker-compose.yml` for PostgreSQL 16 and Redis 7.
- Express 5 server initialization with `/api/health` and Vite React client handshake.

### **Part 2: Database Design & Raw SQL Data Access Layer**
- Writing `src/db/schema.sql` (Tables: `users`, `rooms`, `room_members`, `messages`).
- Establishing the `pg` connection pool with reconnection resilience.
- Database migration and seed scripts.

### **Part 3: Authentication & Security (JWT, Bcrypt, Zod)**
- Zod validation schemas for registration and login payloads.
- Password hashing with `bcrypt` (salt rounds, security trade-offs).
- JWT token generation, cookie/bearer extraction, and auth middleware.
- You implement: The auth controller logic.

### **Part 4: Real-Time Engine Setup (Socket.io & Redis Adapter)**
- Attaching Socket.io to the Node HTTP server.
- Configuring the Redis adapter for multi-instance scaling.
- Authenticating WebSocket connections via JWT handshake middleware.
- Client-side `useSocket` hook with cleanup mechanisms.

### **Part 5: Room Management & Access Control**
- REST endpoints & database queries for creating, listing, joining, and leaving rooms.
- Real-time room join/leave broadcast events (`room:joined`, `room:left`).
- You implement: SQL joins for room membership and controller query methods.

### **Part 6: Real-Time Messaging & Message Persistence**
- `message:send` and `message:receive` socket event pipelines.
- Persisting messages to PostgreSQL and broadcasting to room participants.
- Fetching message history with offset/cursor pagination.
- You implement: Socket message handlers and message storage queries.

### **Part 7: Real-Time Presence & Typing Indicators (Redis)**
- Tracking active socket connections per user in Redis Sets.
- Broadcasting `user:online` and `user:offline` events.
- Debounced typing indicators with auto-clearing timers.
- You implement: Redis presence update logic and typing state handlers.

### **Part 8: Frontend UI & State Architecture**
- `AuthContext` for global session management.
- Responsive chat layout: sidebar (rooms & online users), message feed, typing indicators, and message input.
- Handling reconnection toasts, optimistic message sending, and auto-scroll to latest message.

### **Part 9: Testing, Optimization & Error Handling**
- Centralized Express error handler and custom exception classes.
- Socket error handling and reconnect recovery.
- Load testing verification (simulating concurrent connections).

### **Part 10: Production Deployment & Interview Prep**
- Multi-stage Docker builds and environment configurations.
- Comprehensive interview Q&A handbook covering every line of the codebase.

---

## 5. How We Will Operate (Pairing Protocol)

For every single part:
1. **Plan & Breakdown**: I present the exact files to create/modify and what each component does.
2. **Your Approval**: You review and say "go ahead".
3. **Scaffolding & Boilerplate**: I configure the boilerplate and write function signatures with clear `TODO` instructions and hints for the core logic.
4. **Your Turn**: You write the core logic. (If you get stuck, you can ask for hints or say "show solution").
5. **Interactive Review**:
   - Plain-English explanation of what was built and why.
   - End-to-end data flow trace.
   - Exact test commands to verify functionality.
   - 3 Placement Interview Questions & Model Answers.
   - 2 Check-in Questions to test your understanding.
6. **Git Checkpoint**: We verify git status (ensuring no secrets leaked) and commit with a standard message.
