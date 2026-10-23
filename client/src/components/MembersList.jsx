// client/src/components/MembersList.jsx
// Purpose: Displays channel members with direct click-to-DM triggers.

import { Users, X, MessageSquare } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

export default function MembersList({ members, isOpen, onClose, onStartDM, width = 240 }) {
  const { user } = useAuth();
  const { onlineUserIds } = useSocket();

  if (!isOpen) return null;

  const onlineMembers = members.filter((m) => onlineUserIds.has(m.id));
  const offlineMembers = members.filter((m) => !onlineUserIds.has(m.id));

  const renderMember = (member, isOnline) => {
    const isMe = member.id === user?.id;

    return (
      <div key={member.id} style={memberItemStyle}>
        <div style={{ position: 'relative' }}>
          <img
            src={member.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${member.username}`}
            alt={member.username}
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
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {member.username} {isMe && '(You)'}
            </span>
            {member.role === 'admin' && (
              <span
                style={{
                  fontSize: '0.58rem',
                  fontWeight: 800,
                  backgroundColor: 'rgba(132, 162, 130, 0.25)',
                  color: '#375338',
                  padding: '1px 5px',
                  borderRadius: '4px',
                  letterSpacing: '0.04em',
                }}
              >
                ADMIN
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.7rem', color: isOnline ? '#84A282' : 'var(--text-subtle)', fontWeight: isOnline ? 600 : 400 }}>
            {isOnline ? 'Active' : 'Offline'}
          </div>
        </div>

        {!isMe && (
          <button
            onClick={() => onStartDM(member.id)}
            style={dmActionBtnStyle}
            title={`Direct message @${member.username}`}
          >
            <MessageSquare size={13} />
          </button>
        )}
      </div>
    );
  };

  return (
    <aside style={{ ...containerStyle, width: `${width}px`, minWidth: `${width}px` }}>
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={16} color="#84A282" />
          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Room Members ({members.length})
          </span>
        </div>
        <button onClick={onClose} style={closeBtnStyle}>
          <X size={16} />
        </button>
      </div>

      <div style={scrollContentStyle}>
        {/* ONLINE MEMBERS */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>
            ONLINE — {onlineMembers.length}
          </div>
          {onlineMembers.map((m) => renderMember(m, true))}
        </div>

        {/* OFFLINE MEMBERS */}
        {offlineMembers.length > 0 && (
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>
              OFFLINE — {offlineMembers.length}
            </div>
            {offlineMembers.map((m) => renderMember(m, false))}
          </div>
        )}
      </div>
    </aside>
  );
}

const containerStyle = {
  width: '240px',
  height: '100%',
  backgroundColor: '#FEFAF3',
  borderLeft: '1px solid rgba(184, 207, 179, 0.45)',
  display: 'flex',
  flexDirection: 'column',
  flexShrink: 0,
};

const headerStyle = {
  padding: '16px',
  borderBottom: '1px solid rgba(184, 207, 179, 0.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

const closeBtnStyle = {
  background: 'transparent',
  color: 'var(--text-muted)',
  padding: '4px',
  borderRadius: '6px',
};

const scrollContentStyle = {
  flex: 1,
  overflowY: 'auto',
  padding: '12px 14px',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
};

const sectionStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
};

const sectionTitleStyle = {
  fontSize: '0.68rem',
  fontWeight: 800,
  color: '#84A282',
  letterSpacing: '0.06em',
  marginBottom: '2px',
};

const memberItemStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '6px 8px',
  borderRadius: '8px',
  transition: 'background 0.15s',
};

const avatarImgStyle = {
  width: '30px',
  height: '30px',
  borderRadius: '50%',
  backgroundColor: '#B8CFB3',
  objectFit: 'cover',
};

const dmActionBtnStyle = {
  background: 'rgba(184, 207, 179, 0.3)',
  color: '#84A282',
  padding: '5px',
  borderRadius: '6px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
