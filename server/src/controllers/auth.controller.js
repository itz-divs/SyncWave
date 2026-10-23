// server/src/controllers/auth.controller.js
// Purpose: Handles user registration, login authentication, password hashing, and token generation with multi-tenant company isolation and admin roles.

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
  avatarUrl: z.string().url('Invalid avatar URL').optional().nullable().or(z.literal('')).or(z.null()),
  companyName: z.string().max(100).optional().nullable(),
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
      company_id: user.company_id,
      company_name: user.company_name,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

export const register = async (req, res) => {
  try {
    const { username, email, password, avatarUrl, companyName } = req.body;

    // Check if username or email already exists
    const existing = await query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existing.rowCount > 0) {
      return res.status(409).json({ error: 'Username or Email is already registered' });
    }

    // Determine target company name
    let targetCompany = (companyName || '').trim();
    if (!targetCompany) {
      // Derive from email domain (e.g., alex@stark.com -> Stark) or fallback to SyncWave Corp
      const domain = email.split('@')[1] || '';
      const domainName = domain.split('.')[0] || '';
      if (domainName && domainName.toLowerCase() !== 'gmail' && domainName.toLowerCase() !== 'yahoo') {
        targetCompany = domainName.charAt(0).toUpperCase() + domainName.slice(1) + ' Corp';
      } else {
        targetCompany = 'SyncWave Corp';
      }
    }

    // Find or create company
    let companyId;
    let companyOfficialName;
    let userRole = 'member';

    const companyCheck = await query('SELECT id, name FROM companies WHERE LOWER(name) = LOWER($1)', [targetCompany]);
    if (companyCheck.rowCount > 0) {
      companyId = companyCheck.rows[0].id;
      companyOfficialName = companyCheck.rows[0].name;

      // Check if this company already has an admin
      const existingMembers = await query('SELECT id FROM users WHERE company_id = $1', [companyId]);
      if (existingMembers.rowCount === 0) {
        userRole = 'admin'; // First user in this company becomes admin
      }
    } else {
      // Create new company
      const compInsert = await query('INSERT INTO companies (name) VALUES ($1)', [targetCompany]);
      companyId = compInsert.rows[0].id;
      companyOfficialName = compInsert.rows[0].name;
      userRole = 'admin'; // Founder of the company becomes admin

      // Create default channels for this company
      await query('INSERT INTO rooms (company_id, name, description, is_private) VALUES ($1, $2, $3, $4)', [
        companyId,
        'general',
        `Company-wide general discussions for ${companyOfficialName}`,
        false,
      ]);
      await query('INSERT INTO rooms (company_id, name, description, is_private) VALUES ($1, $2, $3, $4)', [
        companyId,
        'engineering',
        `Technical and product engineering for ${companyOfficialName}`,
        false,
      ]);
      await query('INSERT INTO rooms (company_id, name, description, is_private) VALUES ($1, $2, $3, $4)', [
        companyId,
        'random',
        `Casual conversations and team banter for ${companyOfficialName}`,
        false,
      ]);
    }

    // Salt and hash password (work factor 10)
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Default avatar if none provided
    const avatar = avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`;

    const result = await query(
      `INSERT INTO users (company_id, username, email, password_hash, avatar_url, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, company_id, username, email, avatar_url, role, created_at`,
      [companyId, username, email, passwordHash, avatar, userRole]
    );

    const user = {
      ...result.rows[0],
      company_name: companyOfficialName,
    };
    const token = generateToken(user);

    // Auto-join default public channels for this company and notify all connected clients
    try {
      const publicRooms = await query('SELECT id FROM rooms WHERE company_id = $1 AND is_private = FALSE', [companyId]);
      const io = req.app.get('io');

      for (const room of publicRooms.rows) {
        await query(
          'INSERT INTO room_members (room_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [room.id, user.id]
        );

        if (io) {
          const countRes = await query('SELECT COUNT(*)::INTEGER as count FROM room_members WHERE room_id = $1', [room.id]);
          const memberCount = countRes.rows[0]?.count || 1;

          io.emit('room:member_joined', {
            roomId: room.id,
            userId: user.id,
            username: user.username,
            avatar_url: user.avatar_url,
            company_id: companyId,
            memberCount,
          });
        }
      }

      if (io) {
        io.emit('user:registered', {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            avatar_url: user.avatar_url,
            role: user.role,
            company_id: user.company_id,
            company_name: user.company_name,
          },
        });
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
      'SELECT id, company_id, username, email, password_hash, avatar_url, role, created_at FROM users WHERE email = $1',
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

    const compRes = await query('SELECT name FROM companies WHERE id = $1', [userRecord.company_id || 1]);
    const company_name = compRes.rows[0]?.name || userRecord.company_name || 'SyncWave Corp';

    const user = {
      id: userRecord.id,
      company_id: userRecord.company_id || 1,
      company_name,
      username: userRecord.username,
      email: userRecord.email,
      avatar_url: userRecord.avatar_url,
      role: userRecord.role || 'member',
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
      'SELECT id, company_id, username, email, avatar_url, role, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userRecord = result.rows[0];
    const compRes = await query('SELECT name FROM companies WHERE id = $1', [userRecord.company_id || 1]);
    const company_name = compRes.rows[0]?.name || userRecord.company_name || 'SyncWave Corp';

    return res.status(200).json({
      user: {
        ...userRecord,
        company_name,
        role: userRecord.role || 'member',
      },
    });
  } catch (error) {
    console.error('getMe error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
