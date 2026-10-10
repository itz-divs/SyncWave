// client/src/context/SocketContext.jsx
// Purpose: Provides centralized real-time WebSocket connection, presence state, and event dispatchers.

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { API_BASE_URL } from '../api';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());
  const [typingState, setTypingState] = useState({}); // { [roomId]: string[] }
  const typingTimersRef = useRef({});

  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setConnected(false);
      }
      return;
    }

    // Initialize Socket connection with Handshake JWT Auth
    const newSocket = io(API_BASE_URL, {
      auth: { token: `Bearer ${token}` },
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('⚡ Connected to WebSocket server (ID:', newSocket.id, ')');
      setConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected from WebSocket server:', reason);
      setConnected(false);
    });

    // Handle initial online user set from server
    newSocket.on('presence:initial', ({ onlineUsers }) => {
      setOnlineUserIds(new Set(onlineUsers));
    });

    // Handle presence updates (user joins or leaves)
    newSocket.on('presence:update', ({ userId, status }) => {
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        if (status === 'online') {
          next.add(userId);
        } else {
          next.delete(userId);
        }
        return next;
      });
    });

    // Handle typing status updates
    newSocket.on('typing:update', ({ roomId, typingUsers }) => {
      setTypingState((prev) => ({
        ...prev,
        [roomId]: typingUsers,
      }));
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [isAuthenticated, token]);

  const joinRoom = (roomId) => {
    if (socket && connected) {
      socket.emit('room:join', { roomId });
    }
  };

  const leaveRoom = (roomId) => {
    if (socket && connected) {
      socket.emit('room:leave', { roomId });
    }
  };

  const startTyping = (roomId) => {
    if (!socket || !connected) return;

    socket.emit('typing:start', { roomId });

    // Auto-stop typing after 3 seconds of inactivity
    if (typingTimersRef.current[roomId]) {
      clearTimeout(typingTimersRef.current[roomId]);
    }

    typingTimersRef.current[roomId] = setTimeout(() => {
      stopTyping(roomId);
    }, 3000);
  };

  const stopTyping = (roomId) => {
    if (!socket || !connected) return;
    if (typingTimersRef.current[roomId]) {
      clearTimeout(typingTimersRef.current[roomId]);
      delete typingTimersRef.current[roomId];
    }
    socket.emit('typing:stop', { roomId });
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        connected,
        onlineUserIds,
        typingState,
        joinRoom,
        leaveRoom,
        startTyping,
        stopTyping,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
