// client/src/components/CreateRoomModal.jsx
// Purpose: Modal dialog styled with palette #F6E2E9, #FEFAF3, #B8CFB3, #84A282.

import { useState, useEffect, useRef } from 'react';
import { X, Hash, Lock, Plus } from 'lucide-react';
import { api } from '../api';

export default function CreateRoomModal({ isOpen, onClose, onRoomCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const nameInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setTimeout(() => nameInputRef.current?.focus(), 50);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const newRoom = await api.createRoom({
        name: name.trim(),
        description: description.trim(),
        isPrivate,
      });
      setName('');
      setDescription('');
      setIsPrivate(false);
      onRoomCreated(newRoom);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create channel');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={modalOverlayStyle}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={modalContentStyle} className="glass-panel">
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={iconBadgeStyle}>
              <Plus size={18} color="#84A282" />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>Create New Channel</h3>
          </div>
          <button onClick={onClose} style={closeBtnStyle}>
            <X size={18} />
          </button>
        </div>

        {error && <div style={errorBannerStyle}>{error}</div>}

        <form onSubmit={handleSubmit} style={formStyle}>
          <div>
            <label style={labelStyle}>Channel Name</label>
            <div style={{ position: 'relative' }}>
              <div style={inputIconStyle}>
                <Hash size={16} color="#84A282" />
              </div>
              <input
                ref={nameInputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. project-apollo"
                required
                style={{ ...inputWithIconStyle, width: '100%' }}
              />
            </div>
            <p style={helpTextStyle}>Names must be lowercase with hyphens (e.g. dev-team)</p>
          </div>

          <div>
            <label style={labelStyle}>Description (Optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this channel about?"
              style={{ width: '100%', backgroundColor: '#ffffff', borderColor: 'rgba(184, 207, 179, 0.6)' }}
            />
          </div>

          <div style={checkboxWrapperStyle}>
            <input
              type="checkbox"
              id="isPrivateCheck"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              style={{ accentColor: '#84A282', width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <label htmlFor="isPrivateCheck" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Lock size={14} color="#84A282" />
              <span style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>Make Channel Private</span>
            </label>
          </div>

          <div style={actionRowStyle}>
            <button type="button" onClick={onClose} className="btn-secondary" style={{ flex: 1 }}>
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary" style={{ flex: 1 }}>
              {loading ? 'Creating...' : 'Create Channel'}
            </button>
          </div>
        </form>
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
  maxWidth: '460px',
  borderRadius: '16px',
  padding: '24px',
  boxShadow: '0 20px 50px rgba(132, 162, 130, 0.25)',
  backgroundColor: 'rgba(254, 250, 243, 0.96)',
  border: '1px solid rgba(184, 207, 179, 0.6)',
};

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '20px',
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

const formStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
};

const labelStyle = {
  display: 'block',
  fontSize: '0.85rem',
  fontWeight: 600,
  color: 'var(--text-main)',
  marginBottom: '6px',
};

const inputWithIconStyle = {
  paddingLeft: '38px',
  backgroundColor: '#ffffff',
  borderColor: 'rgba(184, 207, 179, 0.6)',
};

const inputIconStyle = {
  position: 'absolute',
  left: '12px',
  top: '50%',
  transform: 'translateY(-50%)',
  pointerEvents: 'none',
};

const helpTextStyle = {
  fontSize: '0.75rem',
  color: 'var(--text-subtle)',
  marginTop: '4px',
};

const checkboxWrapperStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '8px 0',
};

const actionRowStyle = {
  display: 'flex',
  gap: '12px',
  marginTop: '8px',
};

const errorBannerStyle = {
  backgroundColor: 'rgba(246, 226, 233, 0.85)',
  border: '1px solid #e28a9d',
  color: '#9e223b',
  padding: '10px 14px',
  borderRadius: '8px',
  fontSize: '0.85rem',
  marginBottom: '16px',
  fontWeight: 500,
};
