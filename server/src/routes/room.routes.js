// server/src/routes/room.routes.js
// Purpose: Room, membership, and DM routing endpoints.

import { Router } from 'express';
import {
  getRooms,
  createRoom,
  joinRoom,
  leaveRoom,
  getRoomMembers,
  getOrCreateDM,
  getUsersDirectory,
  inviteToRoom,
  deleteRoom,
  createRoomSchema,
  createDMSchema,
} from '../controllers/room.controller.js';
import {
  getRoomMessages,
  createMessage,
  createMessageSchema,
} from '../controllers/message.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

// Protect all room endpoints with JWT authentication
router.use(requireAuth);

router.get('/', getRooms);
router.post('/', validateBody(createRoomSchema), createRoom);
router.delete('/:id', deleteRoom);
router.post('/dm', validateBody(createDMSchema), getOrCreateDM);
router.get('/users/directory', getUsersDirectory);
router.post('/:id/join', joinRoom);
router.post('/:id/invite', inviteToRoom);
router.post('/:id/leave', leaveRoom);
router.get('/:id/members', getRoomMembers);

// Messages sub-routes for room
router.get('/:id/messages', getRoomMessages);
router.post('/:id/messages', validateBody(createMessageSchema), createMessage);

export default router;
