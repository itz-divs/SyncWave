// client/src/components/AdminModal.jsx
// Purpose: Enterprise Workspace Administration Console for managing company members, roles, and channels.
// Palette: #F6E2E9, #FEFAF3, #B8CFB3, #84A282

import { useState, useEffect } from 'react';
import {
  X,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Users,
  Hash,
  Lock,
  Trash2,
  UserCheck,
  UserX,
  Search,
  Building,
  Activity,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

export default function AdminModal({ isOpen, onClose, onChannelDeleted }) {
  const { user } = useAuth();
  const { onlineUserIds } = useSocket();

  const [activeTab, setActiveTab] = useState('members'); // 'members' | 'channels' | 'overview'
  const [overview, setOverview] = useState(null);
  const [members, setMembers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [statusMsg, setStatusMsg] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    fetchData();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const fetchData = async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const [overviewData, membersData, roomsData] = await Promise.all([
        api.getAdminOverview().catch(() => null),
        api.getAdminMembers().catch(() => []),
        api.getAdminRooms().catch(() => []),
      ]);
      setOverview(overviewData);
      setMembers(membersData || []);
      setRooms(roomsData || []);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleRoleChange = async (targetUserId, newRole) => {
    setActionLoadingId(`role-${targetUserId}`);
    try {
      await api.updateMemberRole(targetUserId, newRole);
      setMembers((prev) =>
        prev.map((m) => (m.id === targetUserId ? { ...m, role: newRole } : m))
      );
      setStatusMsg({ type: 'success', text: `Role updated to ${newRole}` });
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to update role' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRemoveMember = async (targetUserId, targetUsername) => {
    if (!window.confirm(`Are you sure you want to remove @${targetUsername} from the company workspace?`)) {
      return;
    }
    setActionLoadingId(`remove-${targetUserId}`);
    try {
      await api.removeMember(targetUserId);
      setMembers((prev) => prev.filter((m) => m.id !== targetUserId));
      setStatusMsg({ type: 'success', text: `@${targetUsername} removed from workspace` });
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to remove member' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteChannel = async (roomId, roomName) => {
    if (!window.confirm(`Are you sure you want to delete channel #${roomName}? All messages inside will be permanently deleted.`)) {
      return;
    }
    setActionLoadingId(`room-${roomId}`);
    try {
      await api.deleteRoom(roomId);
      setRooms((prev) => prev.filter((r) => r.id !== roomId));
      if (onChannelDeleted) onChannelDeleted(roomId);
      setStatusMsg({ type: 'success', text: `Channel #${roomName} deleted` });
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to delete channel' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredMembers = members.filter(
    (m) =>
      m.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRooms = rooms.filter((r) =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div
      style={modalOverlayStyle}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={modalContentStyle} className="glass-panel">
        {/* Header */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={iconBadgeStyle}>
              <ShieldCheck size={22} color="#FEFAF3" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  Workspace Administration
                </h3>
                <span style={adminTagStyle}>ADMIN CONSOLE</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {user?.company_name || 'SyncWave Corp'} • Manage team members, roles, and channels
              </p>
            </div>
          </div>
          <button onClick={onClose} style={closeBtnStyle}>
            <X size={20} />
          </button>
        </div>

        {/* Status Notification */}
        {statusMsg && (
          <div
            style={{
              ...statusBannerStyle,
              backgroundColor: statusMsg.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(132, 162, 130, 0.25)',
              borderColor: statusMsg.type === 'error' ? '#ef4444' : '#84A282',
              color: statusMsg.type === 'error' ? '#b91c1c' : '#2d4730',
            }}
          >
            {statusMsg.type === 'error' ? <AlertTriangle size={15} /> : <Check size={15} />}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div style={tabContainerStyle}>
          <button
            onClick={() => setActiveTab('members')}
            style={{
              ...tabBtnStyle,
              backgroundColor: activeTab === 'members' ? '#84A282' : 'transparent',
              color: activeTab === 'members' ? '#FEFAF3' : 'var(--text-main)',
              fontWeight: activeTab === 'members' ? 700 : 500,
            }}
          >
            <Users size={15} style={{ marginRight: '6px' }} />
            Team Members ({members.length})
          </button>
          <button
            onClick={() => setActiveTab('channels')}
            style={{
              ...tabBtnStyle,
              backgroundColor: activeTab === 'channels' ? '#84A282' : 'transparent',
              color: activeTab === 'channels' ? '#FEFAF3' : 'var(--text-main)',
              fontWeight: activeTab === 'channels' ? 700 : 500,
            }}
          >
            <Hash size={15} style={{ marginRight: '6px' }} />
            All Channels ({rooms.length})
          </button>
          <button
            onClick={() => setActiveTab('overview')}
            style={{
              ...tabBtnStyle,
              backgroundColor: activeTab === 'overview' ? '#84A282' : 'transparent',
              color: activeTab === 'overview' ? '#FEFAF3' : 'var(--text-main)',
              fontWeight: activeTab === 'overview' ? 700 : 500,
            }}
          >
            <Activity size={15} style={{ marginRight: '6px' }} />
            Workspace Analytics
          </button>
        </div>

        {/* Search Bar for Members/Channels */}
        {activeTab !== 'overview' && (
          <div style={{ position: 'relative', marginBottom: '14px' }}>
            <Search size={15} color="#84A282" style={searchIconStyle} />
            <input
              type="text"
              placeholder={activeTab === 'members' ? 'Search members by name or email...' : 'Search channels...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={searchInputStyle}
            />
          </div>
        )}

        {/* Content Body */}
        <div style={scrollContentStyle}>
          {loading ? (
            <div style={loadingTextStyle}>Loading workspace data...</div>
          ) : activeTab === 'members' ? (
            /* MEMBERS TAB */
            <div style={listContainerStyle}>
              {filteredMembers.length === 0 ? (
                <div style={emptyTextStyle}>No members found</div>
              ) : (
                filteredMembers.map((m) => {
                  const isCurrentUser = m.id === user?.id;
                  const isAdmin = m.role === 'admin';
                  const isOnline = onlineUserIds.has(m.id);

                  return (
                    <div key={m.id} style={itemCardStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                        <div style={{ position: 'relative' }}>
                          <img
                            src={m.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${m.username}`}
                            alt={m.username}
                            style={avatarStyle}
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
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)' }}>
                              @{m.username}
                            </span>
                            {isCurrentUser && <span style={meTagStyle}>YOU</span>}
                            <span
                              style={{
                                ...roleBadgeStyle,
                                backgroundColor: isAdmin ? 'rgba(132, 162, 130, 0.25)' : 'rgba(184, 207, 179, 0.25)',
                                color: isAdmin ? '#375338' : 'var(--text-muted)',
                              }}
                            >
                              {isAdmin ? 'ADMIN' : 'MEMBER'}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {m.email}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {isAdmin ? (
                          <button
                            onClick={() => handleRoleChange(m.id, 'member')}
                            disabled={actionLoadingId === `role-${m.id}` || isCurrentUser}
                            style={{
                              ...secondaryBtnStyle,
                              opacity: isCurrentUser ? 0.5 : 1,
                              cursor: isCurrentUser ? 'not-allowed' : 'pointer',
                            }}
                            title={isCurrentUser ? 'Cannot demote yourself' : 'Demote to regular member'}
                          >
                            <UserX size={13} style={{ marginRight: '4px' }} />
                            Demote
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRoleChange(m.id, 'admin')}
                            disabled={actionLoadingId === `role-${m.id}`}
                            style={primaryActionBtnStyle}
                            title="Promote to administrator"
                          >
                            <ShieldCheck size={13} style={{ marginRight: '4px' }} />
                            Make Admin
                          </button>
                        )}

                        {!isCurrentUser && (
                          <button
                            onClick={() => handleRemoveMember(m.id, m.username)}
                            disabled={actionLoadingId === `remove-${m.id}`}
                            style={dangerBtnStyle}
                            title="Remove from workspace"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : activeTab === 'channels' ? (
            /* CHANNELS TAB */
            <div style={listContainerStyle}>
              {filteredRooms.length === 0 ? (
                <div style={emptyTextStyle}>No channels found</div>
              ) : (
                filteredRooms.map((r) => {
                  const isGeneral = r.name === 'general';
                  return (
                    <div key={r.id} style={itemCardStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={channelIconBadgeStyle}>
                          {r.is_private ? <Lock size={15} color="#84A282" /> : <Hash size={15} color="#84A282" />}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)' }}>
                              #{r.name}
                            </span>
                            <span
                              style={{
                                ...channelTypeBadgeStyle,
                                backgroundColor: r.is_private ? 'rgba(239, 68, 68, 0.1)' : 'rgba(132, 162, 130, 0.2)',
                                color: r.is_private ? '#b91c1c' : '#375338',
                              }}
                            >
                              {r.is_private ? 'PRIVATE' : 'PUBLIC'}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {r.description || 'No description provided'}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {!isGeneral ? (
                          <button
                            onClick={() => handleDeleteChannel(r.id, r.name)}
                            disabled={actionLoadingId === `room-${r.id}`}
                            style={dangerBtnStyle}
                            title="Permanently delete channel"
                          >
                            <Trash2 size={14} style={{ marginRight: '4px' }} />
                            Delete
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            Default Channel
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* OVERVIEW TAB */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={statsGridStyle}>
                <div style={statCardStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#84A282' }}>
                    <Users size={18} />
                    <span style={statLabelStyle}>TOTAL MEMBERS</span>
                  </div>
                  <div style={statNumberStyle}>{overview?.totalMembers || members.length}</div>
                  <div style={statDescStyle}>Active colleagues in workspace</div>
                </div>

                <div style={statCardStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#84A282' }}>
                    <Shield size={18} />
                    <span style={statLabelStyle}>ADMINISTRATORS</span>
                  </div>
                  <div style={statNumberStyle}>{overview?.totalAdmins || members.filter(m => m.role === 'admin').length}</div>
                  <div style={statDescStyle}>Full workspace managers</div>
                </div>

                <div style={statCardStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#84A282' }}>
                    <Hash size={18} />
                    <span style={statLabelStyle}>TOTAL CHANNELS</span>
                  </div>
                  <div style={statNumberStyle}>{overview?.totalChannels || rooms.length}</div>
                  <div style={statDescStyle}>Active collaboration spaces</div>
                </div>
              </div>

              <div style={companyInfoCardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <Building size={20} color="#84A282" />
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Company Profile
                  </h4>
                </div>
                <div style={infoRowStyle}>
                  <span style={infoLabelStyle}>Workspace Name:</span>
                  <span style={infoValueStyle}>{user?.company_name || 'SyncWave Corp'}</span>
                </div>
                <div style={infoRowStyle}>
                  <span style={infoLabelStyle}>Your Role:</span>
                  <span style={{ ...infoValueStyle, color: '#375338', fontWeight: 800 }}>WORKSPACE ADMINISTRATOR</span>
                </div>
                <div style={infoRowStyle}>
                  <span style={infoLabelStyle}>Isolation Mode:</span>
                  <span style={infoValueStyle}>Enterprise Tenant Isolation Enabled (Zero Cross-Company Leakage)</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const modalOverlayStyle = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(31, 45, 34, 0.55)',
  backdropFilter: 'blur(8px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
  padding: '16px',
};

const modalContentStyle = {
  width: '100%',
  maxWidth: '680px',
  borderRadius: '20px',
  padding: '24px',
  boxShadow: '0 25px 60px rgba(132, 162, 130, 0.3)',
  backgroundColor: 'rgba(254, 250, 243, 0.98)',
  border: '1px solid rgba(184, 207, 179, 0.7)',
  maxHeight: '90vh',
  display: 'flex',
  flexDirection: 'column',
};

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '16px',
  paddingBottom: '12px',
  borderBottom: '1px solid rgba(184, 207, 179, 0.45)',
};

const iconBadgeStyle = {
  width: '42px',
  height: '42px',
  borderRadius: '12px',
  background: 'linear-gradient(135deg, #84A282 0%, #B8CFB3 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 4px 12px rgba(132, 162, 130, 0.3)',
};

const adminTagStyle = {
  fontSize: '0.62rem',
  fontWeight: 800,
  backgroundColor: 'rgba(132, 162, 130, 0.25)',
  color: '#375338',
  padding: '2px 6px',
  borderRadius: '4px',
  letterSpacing: '0.06em',
};

const closeBtnStyle = {
  background: 'transparent',
  color: 'var(--text-muted)',
  padding: '6px',
  borderRadius: '8px',
};

const statusBannerStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 12px',
  borderRadius: '8px',
  fontSize: '0.8rem',
  fontWeight: 600,
  marginBottom: '12px',
  border: '1px solid',
};

const tabContainerStyle = {
  display: 'flex',
  gap: '4px',
  padding: '4px',
  borderRadius: '10px',
  backgroundColor: 'rgba(246, 226, 233, 0.45)',
  border: '1px solid rgba(184, 207, 179, 0.4)',
  marginBottom: '14px',
};

const tabBtnStyle = {
  flex: 1,
  padding: '8px 12px',
  borderRadius: '8px',
  fontSize: '0.82rem',
  border: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.15s ease',
};

const searchInputStyle = {
  width: '100%',
  padding: '8px 12px 8px 34px',
  fontSize: '0.82rem',
  borderRadius: '8px',
  backgroundColor: '#ffffff',
  borderColor: 'rgba(184, 207, 179, 0.6)',
};

const searchIconStyle = {
  position: 'absolute',
  left: '11px',
  top: '50%',
  transform: 'translateY(-50%)',
  pointerEvents: 'none',
};

const scrollContentStyle = {
  flex: 1,
  overflowY: 'auto',
  paddingRight: '4px',
};

const listContainerStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const itemCardStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '10px 14px',
  borderRadius: '10px',
  backgroundColor: '#ffffff',
  border: '1px solid rgba(184, 207, 179, 0.5)',
  boxShadow: '0 2px 5px rgba(132, 162, 130, 0.05)',
};

const avatarStyle = {
  width: '36px',
  height: '36px',
  borderRadius: '50%',
  backgroundColor: '#B8CFB3',
  objectFit: 'cover',
};

const meTagStyle = {
  fontSize: '0.62rem',
  fontWeight: 800,
  padding: '2px 5px',
  borderRadius: '4px',
  backgroundColor: 'rgba(184, 207, 179, 0.4)',
  color: 'var(--text-main)',
};

const roleBadgeStyle = {
  fontSize: '0.66rem',
  fontWeight: 800,
  padding: '2px 7px',
  borderRadius: '6px',
  letterSpacing: '0.04em',
};

const primaryActionBtnStyle = {
  fontSize: '0.74rem',
  fontWeight: 700,
  padding: '5px 10px',
  borderRadius: '6px',
  backgroundColor: '#84A282',
  color: '#FEFAF3',
  border: 'none',
  display: 'flex',
  alignItems: 'center',
};

const secondaryBtnStyle = {
  fontSize: '0.74rem',
  fontWeight: 600,
  padding: '5px 10px',
  borderRadius: '6px',
  backgroundColor: 'rgba(246, 226, 233, 0.6)',
  color: 'var(--text-main)',
  border: '1px solid rgba(184, 207, 179, 0.6)',
  display: 'flex',
  alignItems: 'center',
};

const dangerBtnStyle = {
  fontSize: '0.74rem',
  fontWeight: 600,
  padding: '5px 9px',
  borderRadius: '6px',
  backgroundColor: 'rgba(239, 68, 68, 0.1)',
  color: '#dc2626',
  border: '1px solid rgba(239, 68, 68, 0.3)',
  display: 'flex',
  alignItems: 'center',
};

const channelIconBadgeStyle = {
  width: '32px',
  height: '32px',
  borderRadius: '8px',
  backgroundColor: 'rgba(184, 207, 179, 0.35)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const channelTypeBadgeStyle = {
  fontSize: '0.62rem',
  fontWeight: 800,
  padding: '2px 6px',
  borderRadius: '4px',
};

const statsGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '12px',
};

const statCardStyle = {
  padding: '16px',
  borderRadius: '12px',
  backgroundColor: '#ffffff',
  border: '1px solid rgba(184, 207, 179, 0.6)',
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
};

const statLabelStyle = {
  fontSize: '0.68rem',
  fontWeight: 800,
  letterSpacing: '0.06em',
};

const statNumberStyle = {
  fontSize: '1.6rem',
  fontWeight: 800,
  color: 'var(--text-main)',
};

const statDescStyle = {
  fontSize: '0.72rem',
  color: 'var(--text-muted)',
};

const companyInfoCardStyle = {
  padding: '16px',
  borderRadius: '12px',
  backgroundColor: '#ffffff',
  border: '1px solid rgba(184, 207, 179, 0.6)',
};

const infoRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '8px 0',
  borderBottom: '1px solid rgba(184, 207, 179, 0.25)',
  fontSize: '0.84rem',
};

const infoLabelStyle = {
  color: 'var(--text-muted)',
  fontWeight: 600,
};

const infoValueStyle = {
  fontWeight: 700,
  color: 'var(--text-main)',
};

const loadingTextStyle = {
  padding: '40px',
  textAlign: 'center',
  color: 'var(--text-muted)',
  fontSize: '0.85rem',
};

const emptyTextStyle = {
  padding: '30px',
  textAlign: 'center',
  color: 'var(--text-muted)',
  fontSize: '0.85rem',
};
