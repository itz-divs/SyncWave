// client/src/pages/AuthPage.jsx
// Purpose: Authentication view styled with palette #F6E2E9, #FEFAF3, #B8CFB3, #84A282.

import { useState } from 'react';
import { MessageSquare, Lock, Mail, User, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isRegister) {
        await register(username.trim(), email.trim(), password);
      } else {
        await login(email.trim(), password);
      }
    } catch (err) {
      setError(err.message || 'Authentication error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = (demoUser) => {
    if (demoUser === 'alice') {
      setEmail('alice@company.com');
      setPassword('password123');
      setUsername('alice');
    } else {
      setEmail('bob@company.com');
      setPassword('password123');
      setUsername('bob');
    }
  };

  return (
    <div style={pageContainerStyle}>
      {/* Background ambient lighting effects with palette colors */}
      <div style={glowCircle1Style} />
      <div style={glowCircle2Style} />

      <div style={cardWrapperStyle} className="glass-panel">
        {/* Brand Header */}
        <div style={brandHeaderStyle}>
          <div style={logoIconStyle}>
            <MessageSquare size={26} color="#FEFAF3" />
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.03em', marginTop: '12px' }}>
            <span className="gradient-text">SyncWave</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '4px' }}>
            Enterprise Real-Time Team Collaboration
          </p>
        </div>

        {/* Tab Toggle */}
        <div style={tabContainerStyle}>
          <button
            type="button"
            onClick={() => {
              setIsRegister(false);
              setError(null);
            }}
            style={{
              ...tabButtonStyle,
              backgroundColor: !isRegister ? '#84A282' : 'transparent',
              color: !isRegister ? '#FEFAF3' : 'var(--text-muted)',
              fontWeight: !isRegister ? 700 : 500,
              boxShadow: !isRegister ? '0 2px 8px rgba(132, 162, 130, 0.3)' : 'none',
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegister(true);
              setError(null);
            }}
            style={{
              ...tabButtonStyle,
              backgroundColor: isRegister ? '#84A282' : 'transparent',
              color: isRegister ? '#FEFAF3' : 'var(--text-muted)',
              fontWeight: isRegister ? 700 : 500,
              boxShadow: isRegister ? '0 2px 8px rgba(132, 162, 130, 0.3)' : 'none',
            }}
          >
            Create Account
          </button>
        </div>

        {error && <div style={errorBannerStyle}>{error}</div>}

        {/* Form */}
        <form onSubmit={handleSubmit} style={formStyle}>
          {isRegister && (
            <div>
              <label style={labelStyle}>Username</label>
              <div style={{ position: 'relative' }}>
                <User size={16} color="#84A282" style={inputIconStyle} />
                <input
                  type="text"
                  placeholder="e.g. alex_rivera"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  style={{ ...inputWithIconStyle, width: '100%' }}
                />
              </div>
            </div>
          )}

          <div>
            <label style={labelStyle}>Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} color="#84A282" style={inputIconStyle} />
              <input
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ ...inputWithIconStyle, width: '100%' }}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="#84A282" style={inputIconStyle} />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ ...inputWithIconStyle, width: '100%' }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ width: '100%', marginTop: '8px', height: '44px' }}
          >
            <span>{loading ? 'Please wait...' : isRegister ? 'Create Account' : 'Sign In'}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Quick Demo Presets */}
        <div style={demoSectionStyle}>
          <div style={demoDividerStyle}>
            <span style={demoDividerTextStyle}>QUICK DEMO ACCOUNTS</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button
              type="button"
              onClick={() => handleQuickDemo('alice')}
              style={demoBtnStyle}
            >
              <ShieldCheck size={14} color="#84A282" />
              <span>Fill Alice</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo('bob')}
              style={demoBtnStyle}
            >
              <ShieldCheck size={14} color="#84A282" />
              <span>Fill Bob</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const pageContainerStyle = {
  width: '100vw',
  height: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'var(--bg-primary)',
  position: 'relative',
  overflow: 'hidden',
  padding: '16px',
};

const glowCircle1Style = {
  position: 'absolute',
  top: '10%',
  left: '20%',
  width: '450px',
  height: '450px',
  borderRadius: '50%',
  background: 'radial-gradient(circle, rgba(184, 207, 179, 0.45) 0%, rgba(254, 250, 243, 0) 70%)',
  filter: 'blur(50px)',
  pointerEvents: 'none',
};

const glowCircle2Style = {
  position: 'absolute',
  bottom: '10%',
  right: '20%',
  width: '450px',
  height: '450px',
  borderRadius: '50%',
  background: 'radial-gradient(circle, rgba(246, 226, 233, 0.6) 0%, rgba(254, 250, 243, 0) 70%)',
  filter: 'blur(50px)',
  pointerEvents: 'none',
};

const cardWrapperStyle = {
  width: '100%',
  maxWidth: '440px',
  borderRadius: '24px',
  padding: '36px 32px',
  boxShadow: '0 20px 45px rgba(132, 162, 130, 0.15)',
  backgroundColor: 'rgba(254, 250, 243, 0.92)',
  border: '1px solid rgba(184, 207, 179, 0.5)',
  zIndex: 10,
};

const brandHeaderStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
  marginBottom: '24px',
};

const logoIconStyle = {
  width: '52px',
  height: '52px',
  borderRadius: '14px',
  background: 'linear-gradient(135deg, #84A282 0%, #B8CFB3 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 8px 20px rgba(132, 162, 130, 0.35)',
};

const tabContainerStyle = {
  display: 'flex',
  backgroundColor: 'rgba(246, 226, 233, 0.45)',
  border: '1px solid rgba(184, 207, 179, 0.4)',
  borderRadius: '12px',
  padding: '4px',
  marginBottom: '20px',
};

const tabButtonStyle = {
  flex: 1,
  padding: '8px',
  borderRadius: '8px',
  fontSize: '0.85rem',
  border: 'none',
  transition: 'all 0.2s ease',
};

const formStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
};

const labelStyle = {
  display: 'block',
  fontSize: '0.82rem',
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

const demoSectionStyle = {
  marginTop: '24px',
  paddingTop: '16px',
  borderTop: '1px solid rgba(184, 207, 179, 0.4)',
};

const demoDividerStyle = {
  textAlign: 'center',
};

const demoDividerTextStyle = {
  fontSize: '0.68rem',
  fontWeight: 700,
  color: '#84A282',
  letterSpacing: '0.08em',
};

const demoBtnStyle = {
  flex: 1,
  backgroundColor: 'rgba(246, 226, 233, 0.4)',
  border: '1px solid rgba(184, 207, 179, 0.6)',
  color: 'var(--text-main)',
  padding: '8px 12px',
  borderRadius: '8px',
  fontSize: '0.8rem',
  fontWeight: 600,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
};
