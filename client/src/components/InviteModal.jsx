// client/src/components/InviteModal.jsx
// Purpose: Modal to search and invite colleagues into a private or public chat channel.

import { useState, useEffect } from 'react';
import { X, Search, UserPlus, Check } from 'lucide-react';
import { api } from '../api';
import { useSocket } from '../context/SocketContext';

export default function InviteModal({ isOpen, onClose, activeRoom, currentMembers, onUserInvited }) {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [invitingId, setInvitingId] = useState(null);
  const { socket, onlineUserIds } = useSocket();

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    api
      .getUsersDirectory()
      .then((data) => {
        setUsers(data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load users for invitation:', err);
        setLoading(false);
      });

    if (!socket) return;
    const handleUserRegistered = (data) => {
      if (data?.user) {
        setUsers((prev) => {
          if (prev.some((u) => u.id === data.user.id)) return prev;
          return [...prev, data.user];
        });
      }
    };

    socket.on('user:registered', handleUserRegistered);
    return () => {
      socket.off('user:registered', handleUserRegistered);
    };
  }, [isOpen, socket]);

  if (!isOpen || !activeRoom) return null;

  const currentMemberIds = new Set(currentMembers.map((m) => m.id));

  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInvite = async (targetUserId) => {
    setInvitingId(targetUserId);
    try {
      await api.inviteToRoom(activeRoom.id, targetUserId);
      if (onUserInvited) onUserInvited(targetUserId);
    } catch (err) {
      console.error('Failed to invite user:', err);
    } finally {
      setInvitingId(null);
    }
  };

  return (
    <div style={modalOverlayStyle}>
      <div style={modalContentStyle} className="glass-panel">
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={iconBadgeStyle}>
              <UserPlus size={18} color="#84A282" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Invite to #{activeRoom.name}
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Add colleagues to this channel
              </p>
            </div>
          </div>
          <button onClick={onClose} style={closeBtnStyle}>
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: '16px' }}>
          <Search size={16} color="#84A282" style={searchIconStyle} />
          <input
            type="text"
            placeholder="Search colleagues to invite..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ ...searchInputStyle, width: '100%' }}
            autoFocus
          />
        </div>

        {/* User list */}
        <div style={userListStyle}>
          {loading ? (
            <div style={placeholderTextStyle}>Loading colleagues...</div>
          ) : filteredUsers.length === 0 ? (
            <div style={placeholderTextStyle}>No colleagues found</div>
          ) : (
            filteredUsers.map((user) => {
              const isAlreadyMember = currentMemberIds.has(user.id);
              const isOnline = onlineUserIds.has(user.id);
              const isInviting = invitingId === user.id;

              return (
                <div key={user.id} style={userItemStyle}>
                  <div style={{ position: 'relative' }}>
                    <img
                      src={user.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}
                      alt={user.username}
                      style={avatarImgStyle}
                    />
                    <span
                      style={{
                        position: 'absolute',
                        bottom: '-1px',
                        right: '-1px',
                        border: '2px solid #FEFAF3',
                        borderRadius: '50%',
                      }}
                      className={isOnline ? 'online-dot' : 'offline-dot'}
                    />
                  </div>
                  <div style={{ textAlign: 'left', flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      @{user.username}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {user.email}
                    </div>
                  </div>

                  {isAlreadyMember ? (
                    <span style={alreadyMemberBadgeStyle}>
                      <Check size={12} style={{ marginRight: '4px' }} />
                      Joined
                    </span>
                  ) : (
                    <button
                      onClick={() => handleInvite(user.id)}
                      disabled={isInviting}
                      style={inviteBtnStyle}
                    >
                      {isInviting ? 'Adding...' : 'Add'}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

const modalOverlayStyle = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(31, 45, 34, 0.45)',
  backdropFilter: 'blur(6px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
  padding: '16px',
};

const modalContentStyle = {
  width: '100%',
  maxWidth: '440px',
  borderRadius: '16px',
  padding: '24px',
  boxShadow: '0 20px 50px rgba(132, 162, 130, 0.25)',
  backgroundColor: 'rgba(254, 250, 243, 0.98)',
  border: '1px solid rgba(184, 207, 179, 0.6)',
  maxHeight: '85vh',
  display: 'flex',
  flexDirection: 'column',
};

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '16px',
};

const iconBadgeStyle = {
  width: '36px',
  height: '36px',
  borderRadius: '8px',
  backgroundColor: 'rgba(184, 207, 179, 0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const closeBtnStyle = {
  background: 'transparent',
  color: 'var(--text-muted)',
  padding: '6px',
  borderRadius: '6px',
};

const searchInputStyle = {
  paddingLeft: '38px',
  backgroundColor: '#ffffff',
  borderColor: 'rgba(184, 207, 179, 0.6)',
};

const searchIconStyle = {
  position: 'absolute',
  left: '12px',
  top: '50%',
  transform: 'translateY(-50%)',
  pointerEvents: 'none',
};

const userListStyle = {
  flex: 1,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
};

const userItemStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '8px 10px',
  borderRadius: '10px',
  backgroundColor: 'transparent',
  width: '100%',
};

const avatarImgStyle = {
  width: '34px',
  height: '34px',
  borderRadius: '50%',
  backgroundColor: '#B8CFB3',
  objectFit: 'cover',
};

const inviteBtnStyle = {
  fontSize: '0.78rem',
  fontWeight: 700,
  padding: '5px 14px',
  borderRadius: '6px',
  backgroundColor: '#84A282',
  color: '#FEFAF3',
  border: 'none',
  boxShadow: '0 2px 6px rgba(132, 162, 130, 0.3)',
};

const alreadyMemberBadgeStyle = {
  fontSize: '0.72rem',
  fontWeight: 600,
  padding: '4px 10px',
  borderRadius: '6px',
  backgroundColor: 'rgba(184, 207, 179, 0.35)',
  color: 'var(--text-muted)',
  display: 'flex',
  alignItems: 'center',
};

const placeholderTextStyle = {
  padding: '30px',
  textAlign: 'center',
  color: 'var(--text-muted)',
  fontSize: '0.85rem',
};
