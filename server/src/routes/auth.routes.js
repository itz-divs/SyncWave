// server/src/routes/auth.routes.js
// Purpose: Defines authentication endpoints.

import { Router } from 'express';
import { register, login, getMe, registerSchema, loginSchema } from '../controllers/auth.controller.js';
import { validateBody } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/register', validateBody(registerSchema), register);
router.post('/login', validateBody(loginSchema), login);
router.get('/me', requireAuth, getMe);

export default router;
