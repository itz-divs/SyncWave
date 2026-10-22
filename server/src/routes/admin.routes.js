// server/src/routes/admin.routes.js
// Purpose: Workspace governance and administration routes protected by requireAuth & requireAdmin.

import { Router } from 'express';
import {
  getAdminOverview,
  getCompanyMembers,
  updateMemberRole,
  removeMember,
  getCompanyRooms,
} from '../controllers/admin.controller.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Require both authentication and admin role for all routes in this router
router.use(requireAuth, requireAdmin);

router.get('/overview', getAdminOverview);
router.get('/members', getCompanyMembers);
router.patch('/members/:id/role', updateMemberRole);
router.delete('/members/:id', removeMember);
router.get('/rooms', getCompanyRooms);

export default router;
