// client/src/components/Sidebar.jsx
// Purpose: Main sidebar displaying application branding, channels, direct messages (DMs), and user card.

import { useState } from 'react';
import {
  Hash,
  Lock,
  Plus,
  Search,
  LogOut,
  MessageSquare,
  Users,
  Sparkles,
  MessageCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

export default function Sidebar({
  rooms,
  activeRoom,
  onSelectRoom,
  onOpenCreateModal,
  onOpenDMModal,
  unreadCounts,
}) {
  const { user, logout } = useAuth();
  const { connected, onlineUserIds } = useSocket();
  const [searchTerm, setSearchTerm] = useState('');

  const channels = rooms.filter((r) => !r.is_dm);
  const directMessages = rooms.filter((r) => r.is_dm);

  const filteredChannels = channels.filter((room) =>
    room.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDMs = directMessages.filter((room) =>
    (room.dm_user?.username || room.name).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <aside style={sidebarStyle}>
      {/* Brand Header */}
      <div style={brandHeaderStyle}>
        <div style={logoContainerStyle}>
          <div style={logoIconStyle}>
            <MessageSquare size={20} color="#FEFAF3" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="gradient-text">SyncWave</span>
              <span style={badgeStyle}>PRO</span>
            </h1>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Real-Time Team Platform</p>
          </div>
        </div>
      </div>

      {/* User Profile Card */}
      <div style={userCardStyle}>
        <div style={{ position: 'relative' }}>
          <img
            src={user?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.username}`}
            alt={user?.username}
            style={avatarImgStyle}
          />
          <span
            style={{
              position: 'absolute',
              bottom: '-2px',
              right: '-2px',
              border: '2px solid #FEFAF3',
              borderRadius: '50%',
            }}
            className={connected ? 'online-dot' : 'offline-dot'}
            title={connected ? 'Connected (Real-Time)' : 'Connecting...'}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user?.username}
          </div>
          <div style={{ fontSize: '0.75rem', color: connected ? '#84A282' : '#d97706', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
            {connected ? 'Active Now' : 'Connecting...'}
          </div>
        </div>
        <button
          onClick={logout}
          style={logoutBtnStyle}
          title="Sign Out"
        >
          <LogOut size={16} />
        </button>
      </div>

      {/* Search Input */}
      <div style={{ padding: '0 16px 10px 16px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} color="#84A282" style={searchIconStyle} />
          <input
            type="text"
            placeholder="Search channels or DMs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={searchInputStyle}
          />
        </div>
      </div>

      <div style={scrollContentStyle}>
        {/* CHANNELS SECTION */}
        <div style={sectionHeaderStyle}>
          <span style={sectionTitleStyle}>CHANNELS ({channels.length})</span>
          <button
            onClick={onOpenCreateModal}
            style={addBtnStyle}
            title="Create New Channel"
          >
            <Plus size={15} />
          </button>
        </div>

        <div style={listContainerStyle}>
          {filteredChannels.length === 0 ? (
            <div style={emptyTextStyle}>No channels found</div>
          ) : (
            filteredChannels.map((room) => {
              const isActive = activeRoom?.id === room.id;
              return (
                <button
                  key={room.id}
                  onClick={() => onSelectRoom(room)}
                  style={{
                    ...itemButtonStyle,
                    backgroundColor: isActive ? '#84A282' : 'transparent',
                    color: isActive ? '#FEFAF3' : 'var(--text-main)',
                    fontWeight: isActive ? 700 : 500,
                    boxShadow: isActive ? '0 2px 8px rgba(132, 162, 130, 0.25)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    {room.is_private ? (
                      <Lock size={15} color={isActive ? '#FEFAF3' : '#84A282'} />
                    ) : (
                      <Hash size={15} color={isActive ? '#FEFAF3' : '#84A282'} />
                    )}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {room.name}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {unreadCounts?.[room.id] > 0 && (
                      <span style={unreadBadgeStyle}>
                        {unreadCounts[room.id]}
                      </span>
                    )}
                    {room.member_count > 0 && (
                      <span
                        style={{
                          ...memberBadgeStyle,
                          backgroundColor: isActive ? 'rgba(254, 250, 243, 0.25)' : 'rgba(184, 207, 179, 0.35)',
                          color: isActive ? '#FEFAF3' : 'var(--text-muted)',
                        }}
                      >
                        <Users size={11} style={{ marginRight: '3px' }} />
                        {room.member_count}
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* DIRECT MESSAGES SECTION */}
        <div style={{ ...sectionHeaderStyle, marginTop: '16px' }}>
          <span style={sectionTitleStyle}>DIRECT MESSAGES ({directMessages.length})</span>
          <button
            onClick={onOpenDMModal}
            style={addBtnStyle}
            title="Start Direct Message"
          >
            <Plus size={15} />
          </button>
        </div>

        <div style={listContainerStyle}>
          {filteredDMs.length === 0 ? (
            <div style={emptyTextStyle}>No direct messages yet. Click + to chat!</div>
          ) : (
            filteredDMs.map((room) => {
              const isActive = activeRoom?.id === room.id;
              const dmUser = room.dm_user;
              const isOnline = dmUser ? onlineUserIds.has(dmUser.id) : false;
              const unread = unreadCounts?.[room.id] || 0;

              return (
                <button
                  key={room.id}
                  onClick={() => onSelectRoom(room)}
                  style={{
                    ...itemButtonStyle,
                    backgroundColor: isActive ? '#84A282' : 'transparent',
                    color: isActive ? '#FEFAF3' : 'var(--text-main)',
                    fontWeight: isActive || unread > 0 ? 700 : 500,
                    boxShadow: isActive ? '0 2px 8px rgba(132, 162, 130, 0.25)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <div style={{ position: 'relative' }}>
                      <img
                        src={dmUser?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${dmUser?.username || 'user'}`}
                        alt={dmUser?.username}
                        style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#B8CFB3' }}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          bottom: '-1px',
                          right: '-1px',
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          border: '1px solid #FEFAF3',
                          backgroundColor: isOnline ? '#84A282' : 'var(--text-subtle)',
                        }}
                      />
                    </div>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      @{dmUser?.username || 'User'}
                    </span>
                  </div>

                  {unread > 0 && (
                    <span style={unreadBadgeStyle}>
                      {unread}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Bottom Footer Info */}
      <div style={footerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <Sparkles size={13} color="#84A282" />
          <span>PostgreSQL + Redis + Socket.io</span>
        </div>
      </div>
    </aside>
  );
}

const sidebarStyle = {
  width: '280px',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: '#F6E2E9',
  borderRight: '1px solid rgba(184, 207, 179, 0.5)',
  flexShrink: 0,
};

const brandHeaderStyle = {
  padding: '16px',
  borderBottom: '1px solid rgba(184, 207, 179, 0.4)',
};

const logoContainerStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
};

const logoIconStyle = {
  width: '36px',
  height: '36px',
  borderRadius: '10px',
  background: 'linear-gradient(135deg, #84A282 0%, #B8CFB3 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 4px 12px rgba(132, 162, 130, 0.3)',
};

const badgeStyle = {
  fontSize: '0.62rem',
  padding: '2px 6px',
  borderRadius: '4px',
  background: 'rgba(132, 162, 130, 0.2)',
  color: '#84A282',
  fontWeight: 800,
  letterSpacing: '0.05em',
};

const userCardStyle = {
  margin: '12px 16px',
  padding: '10px 12px',
  borderRadius: '12px',
  backgroundColor: '#FEFAF3',
  border: '1px solid rgba(184, 207, 179, 0.6)',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  boxShadow: '0 2px 6px rgba(132, 162, 130, 0.08)',
};

const avatarImgStyle = {
  width: '36px',
  height: '36px',
  borderRadius: '50%',
  backgroundColor: '#B8CFB3',
  objectFit: 'cover',
};

const logoutBtnStyle = {
  background: 'transparent',
  color: 'var(--text-muted)',
  padding: '6px',
  borderRadius: '6px',
};

const searchInputStyle = {
  width: '100%',
  padding: '8px 12px 8px 32px',
  fontSize: '0.82rem',
  borderRadius: '8px',
  backgroundColor: '#FEFAF3',
  borderColor: 'rgba(184, 207, 179, 0.6)',
};

const searchIconStyle = {
  position: 'absolute',
  left: '10px',
  top: '50%',
  transform: 'translateY(-50%)',
  pointerEvents: 'none',
};

const scrollContentStyle = {
  flex: 1,
  overflowY: 'auto',
  padding: '0 8px 12px 8px',
};

const sectionHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '6px 8px 6px 8px',
};

const sectionTitleStyle = {
  fontSize: '0.7rem',
  fontWeight: 800,
  color: '#84A282',
  letterSpacing: '0.08em',
};

const addBtnStyle = {
  background: 'rgba(132, 162, 130, 0.2)',
  color: '#84A282',
  padding: '4px',
  borderRadius: '6px',
};

const listContainerStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '3px',
};

const itemButtonStyle = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '7px 10px',
  borderRadius: '8px',
  border: 'none',
  textAlign: 'left',
  fontSize: '0.86rem',
  transition: 'all 0.15s ease',
};

const memberBadgeStyle = {
  fontSize: '0.72rem',
  display: 'flex',
  alignItems: 'center',
  padding: '2px 6px',
  borderRadius: '10px',
};

const unreadBadgeStyle = {
  fontSize: '0.7rem',
  fontWeight: 800,
  backgroundColor: '#84A282',
  color: '#FEFAF3',
  padding: '2px 7px',
  borderRadius: '10px',
  boxShadow: '0 2px 6px rgba(132, 162, 130, 0.4)',
};

const emptyTextStyle = {
  padding: '12px 8px',
  textAlign: 'center',
  color: 'var(--text-muted)',
  fontSize: '0.78rem',
};

const footerStyle = {
  padding: '12px 16px',
  borderTop: '1px solid rgba(184, 207, 179, 0.4)',
  backgroundColor: 'rgba(254, 250, 243, 0.5)',
};
