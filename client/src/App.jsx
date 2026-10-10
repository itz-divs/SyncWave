// client/src/App.jsx
// Purpose: Main React root provider connecting AuthContext, SocketContext, and Page Router.

import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import AuthPage from './pages/AuthPage';
import ChatPage from './pages/ChatPage';
import { Sparkles } from 'lucide-react';
import './App.css';

function MainApp() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={loadingContainerStyle}>
        <div style={loadingCardStyle} className="glass-panel">
          <div style={spinnerStyle}>
            <Sparkles size={28} color="#84A282" />
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>
            Initializing SyncWave...
          </p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? (
    <SocketProvider>
      <ChatPage />
    </SocketProvider>
  ) : (
    <AuthPage />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

const loadingContainerStyle = {
  width: '100vw',
  height: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#FEFAF3',
};

const loadingCardStyle = {
  padding: '32px 48px',
  borderRadius: '20px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '16px',
  backgroundColor: 'rgba(254, 250, 243, 0.95)',
  border: '1px solid rgba(184, 207, 179, 0.6)',
  boxShadow: '0 10px 30px rgba(132, 162, 130, 0.15)',
};

const spinnerStyle = {
  animation: 'pulse 1.5s infinite',
};
