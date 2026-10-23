// client/src/context/AuthContext.jsx
// Purpose: Provides authentication state and session methods across the React tree.

import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('chat_token') || null);
  const [loading, setLoading] = useState(true);

  // Validate existing token on mount
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('chat_token');
      if (storedToken) {
        try {
          const userData = await api.getMe();
          setUser(userData);
          setToken(storedToken);
        } catch (err) {
          console.warn('Session expired or invalid token:', err.message);
          localStorage.removeItem('chat_token');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const data = await api.login({ email, password });
    localStorage.setItem('chat_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async (username, email, password, avatarUrl, companyName) => {
    const payload = { username, email, password };
    if (avatarUrl) payload.avatarUrl = avatarUrl;
    if (companyName) payload.companyName = companyName;
    const data = await api.register(payload);
    localStorage.setItem('chat_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const updateUser = (updatedFields) => {
    setUser((prev) => (prev ? { ...prev, ...updatedFields } : prev));
  };

  const logout = () => {
    localStorage.removeItem('chat_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        loading,
        login,
        register,
        updateUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
