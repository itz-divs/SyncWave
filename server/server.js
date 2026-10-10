// server/server.js
// Purpose: Entry point of the backend. Loads environment variables, creates the Node HTTP server, initializes DB, and attaches Socket.io.

import 'dotenv/config';
import http from 'http';
import app from './src/app.js';
import { initDb } from './src/db/index.js';
import { setupSockets } from './src/sockets/index.js';

const PORT = process.env.PORT || 5000;

// Create standard Node.js HTTP server wrapping the Express app
const server = http.createServer(app);

// Attach Socket.io server
const io = setupSockets(server);
app.set('io', io);

// Initialize database schema and start server
async function startServer() {
  await initDb();

  server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`⚡ WebSocket server active and ready`);
  });
}

startServer();
