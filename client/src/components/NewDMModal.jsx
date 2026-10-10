// client/src/components/NewDMModal.jsx
// Purpose: Modal to discover users and start 1-on-1 Direct Messages.

import { useState, useEffect } from 'react';
import { X, Search, MessageSquare, ShieldCheck, UserCheck } from 'lucide-react';
import { api } from '../api';
import { useSocket } from '../context/SocketContext';

export default function NewDMModal({ isOpen, onClose, onSelectUser }) {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
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
        console.error('Failed to load users:', err);
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

  if (!isOpen) return null;

  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={modalOverlayStyle}>
      <div style={modalContentStyle} className="glass-panel">
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={iconBadgeStyle}>
              <MessageSquare size={18} color="#84A282" />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>
              New Direct Message
            </h3>
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
            placeholder="Search by username or email..."
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
            <div style={placeholderTextStyle}>No users found</div>
          ) : (
            filteredUsers.map((user) => {
              const isOnline = onlineUserIds.has(user.id);
              return (
                <button
                  key={user.id}
                  onClick={() => {
                    onSelectUser(user.id);
                    onClose();
                  }}
                  style={userItemStyle}
                >
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
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      @{user.username}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {user.email}
                    </div>
                  </div>
                  <span style={chatBadgeStyle}>
                    Chat
                  </span>
                </button>
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
  width: '32px',
  height: '32px',
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
  borderRadius: '8px',
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
  padding: '10px 12px',
  borderRadius: '10px',
  backgroundColor: 'transparent',
  border: '1px solid transparent',
  transition: 'all 0.15s ease',
  width: '100%',
};

const avatarImgStyle = {
  width: '36px',
  height: '36px',
  borderRadius: '50%',
  backgroundColor: '#B8CFB3',
  objectFit: 'cover',
};

const chatBadgeStyle = {
  fontSize: '0.78rem',
  fontWeight: 700,
  padding: '4px 10px',
  borderRadius: '6px',
  backgroundColor: '#84A282',
  color: '#FEFAF3',
};

const placeholderTextStyle = {
  padding: '30px',
  textAlign: 'center',
  color: 'var(--text-muted)',
  fontSize: '0.85rem',
};
