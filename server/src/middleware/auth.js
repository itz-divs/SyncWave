// server/src/middleware/auth.js
// Purpose: Protects endpoints by verifying JSON Web Tokens (JWT).

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'production_grade_super_secret_jwt_key_987654321';

export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required: missing Bearer token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, username, email }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired authentication token' });
  }
};
