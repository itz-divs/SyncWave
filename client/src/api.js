// client/src/api.js
// Purpose: Base API configuration, token management, and HTTP REST request helpers.

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const getAuthHeaders = () => {
  const token = localStorage.getItem('chat_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const api = {
  // Authentication
  async register(data) {
    const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || result.details?.[0]?.message || 'Registration failed');
    return result;
  },

  async login(data) {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || result.details?.[0]?.message || 'Login failed');
    return result;
  },

  async getMe() {
    const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Session expired');
    return result.user;
  },

  // Rooms
  async getRooms() {
    const res = await fetch(`${API_BASE_URL}/api/rooms`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to fetch rooms');
    return result.rooms;
  },

  async createRoom(data) {
    const res = await fetch(`${API_BASE_URL}/api/rooms`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to create room');
    return result.room;
  },

  async joinRoom(roomId) {
    const res = await fetch(`${API_BASE_URL}/api/rooms/${roomId}/join`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to join room');
    return result;
  },

  async leaveRoom(roomId) {
    const res = await fetch(`${API_BASE_URL}/api/rooms/${roomId}/leave`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to leave room');
    return result;
  },

  async getRoomMembers(roomId) {
    const res = await fetch(`${API_BASE_URL}/api/rooms/${roomId}/members`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to fetch members');
    return result.members;
  },

  async createDM(targetUserId) {
    const res = await fetch(`${API_BASE_URL}/api/rooms/dm`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ targetUserId }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to start direct message');
    return result.room;
  },

  async getUsersDirectory() {
    const res = await fetch(`${API_BASE_URL}/api/rooms/users/directory`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to fetch users directory');
    return result.users;
  },

  async inviteToRoom(roomId, targetUserId) {
    const res = await fetch(`${API_BASE_URL}/api/rooms/${roomId}/invite`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ targetUserId }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to invite user');
    return result;
  },

  async deleteRoom(roomId) {
    const res = await fetch(`${API_BASE_URL}/api/rooms/${roomId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to delete room');
    return result;
  },

  // Messages
  async getRoomMessages(roomId, beforeId = null) {
    const url = new URL(`${API_BASE_URL}/api/rooms/${roomId}/messages`);
    url.searchParams.append('limit', '50');
    if (beforeId) url.searchParams.append('beforeId', beforeId);

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to fetch messages');
    return result;
  },

  async sendMessage(roomId, content) {
    const res = await fetch(`${API_BASE_URL}/api/rooms/${roomId}/messages`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ content }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to send message');
    return result.message;
  },

  // Workspace Administration
  async getAdminOverview() {
    const res = await fetch(`${API_BASE_URL}/api/admin/overview`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to fetch admin overview');
    return result;
  },

  async getAdminMembers() {
    const res = await fetch(`${API_BASE_URL}/api/admin/members`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to fetch members');
    return result.members;
  },

  async updateMemberRole(userId, role) {
    const res = await fetch(`${API_BASE_URL}/api/admin/members/${userId}/role`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ role }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to update member role');
    return result;
  },

  async removeMember(userId) {
    const res = await fetch(`${API_BASE_URL}/api/admin/members/${userId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to remove member');
    return result;
  },

  async getAdminRooms() {
    const res = await fetch(`${API_BASE_URL}/api/admin/rooms`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to fetch workspace rooms');
    return result.rooms;
  },
};
