// server/src/controllers/admin.controller.js
// Purpose: Handles enterprise workspace administration, user roles, member management, and channel governance.

import { query } from '../db/index.js';

/**
 * Get workspace administration overview and analytics
 */
export const getAdminOverview = async (req, res) => {
  try {
    const companyId = req.user.company_id || 1;

    // Get company details
    const compRes = await query('SELECT * FROM companies WHERE id = $1', [companyId]);
    const company = compRes.rows[0] || { id: companyId, name: req.user.company_name || 'SyncWave Corp' };

    // Members count and admins count
    const membersRes = await query('SELECT id, role FROM users WHERE company_id = $1', [companyId]);
    const totalMembers = membersRes.rowCount;
    const totalAdmins = membersRes.rows.filter((m) => m.role === 'admin').length;

    // Channels count
    const roomsRes = await query('SELECT id FROM rooms WHERE company_id = $1', [companyId]);
    const totalChannels = roomsRes.rowCount;

    return res.status(200).json({
      company,
      totalMembers,
      totalAdmins,
      totalChannels,
    });
  } catch (error) {
    console.error('getAdminOverview error:', error);
    return res.status(500).json({ error: 'Failed to fetch admin overview' });
  }
};

/**
 * Get all members in the company workspace
 */
export const getCompanyMembers = async (req, res) => {
  try {
    const companyId = req.user.company_id || 1;

    const result = await query(
      'SELECT id, username, email, avatar_url, role, company_id, created_at FROM users WHERE company_id = $1 ORDER BY role DESC, username ASC',
      [companyId]
    );

    return res.status(200).json({ members: result.rows });
  } catch (error) {
    console.error('getCompanyMembers error:', error);
    return res.status(500).json({ error: 'Failed to fetch company members' });
  }
};

/**
 * Update member role (admin <-> member)
 */
export const updateMemberRole = async (req, res) => {
  try {
    const companyId = req.user.company_id || 1;
    const currentUserId = req.user.id;
    const targetUserId = parseInt(req.params.id, 10);
    const { role } = req.body;

    if (!['admin', 'member'].includes(role)) {
      return res.status(400).json({ error: 'Role must be either "admin" or "member"' });
    }

    // Verify target user belongs to same company
    const userRes = await query('SELECT id, company_id, username, role FROM users WHERE id = $1', [targetUserId]);
    if (userRes.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const targetUser = userRes.rows[0];

    if ((targetUser.company_id || 1) !== companyId) {
      return res.status(403).json({ error: 'Cannot manage users outside your company workspace' });
    }

    // Prevent demoting oneself if the last admin
    if (targetUserId === currentUserId && role === 'member') {
      const allAdmins = await query("SELECT id FROM users WHERE company_id = $1 AND role = 'admin'", [companyId]);
      if (allAdmins.rowCount <= 1) {
        return res.status(400).json({ error: 'Cannot demote the sole administrator of the workspace' });
      }
    }

    await query('UPDATE users SET role = $1 WHERE id = $2', [role, targetUserId]);

    const io = req.app.get('io');
    if (io) {
      io.emit('user:role_updated', {
        userId: targetUserId,
        companyId,
        newRole: role,
      });
    }

    return res.status(200).json({
      message: `User role successfully updated to ${role}`,
      userId: targetUserId,
      role,
    });
  } catch (error) {
    console.error('updateMemberRole error:', error);
    return res.status(500).json({ error: 'Failed to update user role' });
  }
};

/**
 * Remove a member from the workspace
 */
export const removeMember = async (req, res) => {
  try {
    const companyId = req.user.company_id || 1;
    const currentUserId = req.user.id;
    const targetUserId = parseInt(req.params.id, 10);

    if (targetUserId === currentUserId) {
      return res.status(400).json({ error: 'Cannot remove your own admin account' });
    }

    const userRes = await query('SELECT id, company_id, username FROM users WHERE id = $1', [targetUserId]);
    if (userRes.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const targetUser = userRes.rows[0];

    if ((targetUser.company_id || 1) !== companyId) {
      return res.status(403).json({ error: 'Cannot remove users outside your workspace' });
    }

    await query('DELETE FROM users WHERE id = $1', [targetUserId]);

    const io = req.app.get('io');
    if (io) {
      io.emit('user:removed', {
        userId: targetUserId,
        companyId,
        username: targetUser.username,
      });
    }

    return res.status(200).json({ message: 'User removed from workspace', userId: targetUserId });
  } catch (error) {
    console.error('removeMember error:', error);
    return res.status(500).json({ error: 'Failed to remove member' });
  }
};

/**
 * Get all channels in company for admin governance
 */
export const getCompanyRooms = async (req, res) => {
  try {
    const companyId = req.user.company_id || 1;
    const result = await query('SELECT * FROM rooms WHERE company_id = $1 ORDER BY created_at ASC', [companyId]);
    return res.status(200).json({ rooms: result.rows });
  } catch (error) {
    console.error('getCompanyRooms error:', error);
    return res.status(500).json({ error: 'Failed to fetch company channels' });
  }
};
