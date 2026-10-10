// server/src/controllers/auth.controller.js
// Purpose: Handles user registration, login authentication, password hashing, and token generation.

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { query } from '../db/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'production_grade_super_secret_jwt_key_987654321';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(50),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  avatarUrl: z.string().url().optional().or(z.literal('')),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

export const register = async (req, res) => {
  try {
    const { username, email, password, avatarUrl } = req.body;

    // Check if username or email already exists
    const existing = await query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existing.rowCount > 0) {
      return res.status(409).json({ error: 'Username or Email is already registered' });
    }

    // Salt and hash password (work factor 10)
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Default avatar if none provided
    const avatar = avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`;

    const result = await query(
      `INSERT INTO users (username, email, password_hash, avatar_url)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, email, avatar_url, created_at`,
      [username, email, passwordHash, avatar]
    );

    const user = result.rows[0];
    const token = generateToken(user);

    // Auto-join default public channels
    try {
      const publicRooms = await query('SELECT id FROM rooms WHERE is_private = FALSE');
      for (const room of publicRooms.rows) {
        await query(
          'INSERT INTO room_members (room_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [room.id, user.id]
        );
      }
    } catch (e) {
      console.error('Error auto-joining default rooms:', e.message);
    }

    return res.status(201).json({
      message: 'User registered successfully',
      user,
      token,
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ error: 'Internal server error during registration' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await query(
      'SELECT id, username, email, password_hash, avatar_url, created_at FROM users WHERE email = $1',
      [email]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const userRecord = result.rows[0];
    const isMatch = await bcrypt.compare(password, userRecord.password_hash);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = {
      id: userRecord.id,
      username: userRecord.username,
      email: userRecord.email,
      avatar_url: userRecord.avatar_url,
      created_at: userRecord.created_at,
    };

    const token = generateToken(user);

    return res.status(200).json({
      message: 'Login successful',
      user,
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error during login' });
  }
};

export const getMe = async (req, res) => {
  try {
    const result = await query(
      'SELECT id, username, email, avatar_url, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({ user: result.rows[0] });
  } catch (error) {
    console.error('getMe error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
