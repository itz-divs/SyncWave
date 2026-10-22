// client/src/components/ChatArea.jsx
// Purpose: Core chat interface styled with palette #F6E2E9, #FEFAF3, #B8CFB3, #84A282.

import { useState, useEffect, useRef } from 'react';
import {
  Hash,
  Lock,
  Send,
  Users,
  Smile,
  Sparkles,
  Clock,
  UserPlus,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { api } from '../api';

export default function ChatArea({
  activeRoom,
  onToggleMembers,
  isMembersOpen,
  onJoinRoom,
  onOpenInviteModal,
}) {
  const { user } = useAuth();
  const { socket, joinRoom, leaveRoom, startTyping, stopTyping, typingState, onlineUserIds } = useSocket();

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);

  // Quick emojis
  const quickEmojis = ['👍', '🚀', '🔥', '❤️', '🎉', '😄', '💯', '✨'];

  // Load room messages, join socket room, and auto-focus cursor
  useEffect(() => {
    if (!activeRoom) return;

    // Direct cursor focus into input box
    setTimeout(() => {
      inputRef.current?.focus();
    }, 60);

    let isMounted = true;
    setLoading(true);
    setMessages([]);

    // Fetch initial message history
    api
      .getRoomMessages(activeRoom.id)
      .then((data) => {
        if (!isMounted) return;
        setMessages(data.messages || []);
        setHasMore(data.hasMore || false);
        setNextCursor(data.nextCursor || null);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching room messages:', err);
        if (isMounted) setLoading(false);
      });

    // Join Socket.io room channel
    joinRoom(activeRoom.id);

    return () => {
      isMounted = false;
      leaveRoom(activeRoom.id);
    };
  }, [activeRoom?.id]);

  // Listen for real-time messages
  useEffect(() => {
    if (!socket || !activeRoom) return;

    const handleMessageReceived = (newMessage) => {
      if (newMessage.room_id === activeRoom.id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMessage.id)) return prev;
          return [...prev, newMessage];
        });
      }
    };

    socket.on('message:received', handleMessageReceived);

    return () => {
      socket.off('message:received', handleMessageReceived);
    };
  }, [socket, activeRoom?.id]);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      const isNearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight < 150;
      if (isNearBottom || messages.length <= 50) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [messages]);

  // Load older messages (Pagination via Cursor)
  const handleLoadOlder = async () => {
    if (!activeRoom || !nextCursor || loadingOlder) return;

    setLoadingOlder(true);
    try {
      const scrollPosBefore = messagesContainerRef.current?.scrollHeight || 0;
      const data = await api.getRoomMessages(activeRoom.id, nextCursor);

      setMessages((prev) => [...(data.messages || []), ...prev]);
      setHasMore(data.hasMore || false);
      setNextCursor(data.nextCursor || null);

      setTimeout(() => {
        if (messagesContainerRef.current) {
          const scrollPosAfter = messagesContainerRef.current.scrollHeight;
          messagesContainerRef.current.scrollTop = scrollPosAfter - scrollPosBefore;
        }
      }, 50);
    } catch (err) {
      console.error('Error loading older messages:', err);
    } finally {
      setLoadingOlder(false);
    }
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    if (activeRoom) {
      startTyping(activeRoom.id);
    }
  };

  const handleSendMessage = (e) => {
    e?.preventDefault();
    if (!inputText.trim() || !activeRoom) return;

    const content = inputText.trim();
    setInputText('');
    stopTyping(activeRoom.id);
    setShowEmojiPicker(false);

    if (socket && socket.connected) {
      socket.emit('message:send', {
        roomId: activeRoom.id,
        content,
      });
    } else {
      api.sendMessage(activeRoom.id, content).then((msg) => {
        setMessages((prev) => [...prev, msg]);
      });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const addEmoji = (emoji) => {
    setInputText((prev) => prev + emoji);
  };

  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const currentTypingUsers = (typingState[activeRoom?.id] || []).filter(
    (u) => u !== user?.username
  );

  if (!activeRoom) {
    return (
      <div style={emptyRoomContainerStyle}>
        <div style={emptyCardStyle} className="glass-panel">
          <div style={emptyIconCircleStyle}>
            <Sparkles size={32} color="#84A282" />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-main)' }}>
            Welcome to SyncWave Chat
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '380px' }}>
            Select a channel from the left sidebar or create a new one to start collaborating with your team in real-time.
          </p>
        </div>
      </div>
    );
  }

  const isDM = !!activeRoom.is_dm;
  const dmUser = activeRoom.dm_user;
  const isOnline = dmUser ? onlineUserIds.has(dmUser.id) : false;

  return (
    <main style={chatContainerStyle}>
      {/* Room Header */}
      <header style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <div style={roomIconBadgeStyle}>
            {isDM ? (
              <div style={{ position: 'relative' }}>
                <img
                  src={dmUser?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${dmUser?.username || 'user'}`}
                  alt={dmUser?.username}
                  style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <span
                  style={{
                    position: 'absolute',
                    bottom: '-1px',
                    right: '-1px',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    border: '1px solid #FEFAF3',
                    backgroundColor: isOnline ? '#84A282' : 'var(--text-subtle)',
                  }}
                />
              </div>
            ) : activeRoom.is_private ? (
              <Lock size={18} color="#84A282" />
            ) : (
              <Hash size={18} color="#84A282" />
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {isDM ? `@${dmUser?.username || 'Direct Message'}` : activeRoom.name}
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {isDM ? (isOnline ? 'Active Now' : 'Offline') : activeRoom.description || 'Public Channel'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {!isDM && activeRoom.is_member && (
            <button
              onClick={onOpenInviteModal}
              style={{
                ...memberToggleBtnStyle,
                backgroundColor: 'rgba(184, 207, 179, 0.35)',
                color: 'var(--text-main)',
              }}
              title="Invite colleagues to channel"
            >
              <UserPlus size={15} color="#84A282" />
              <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Invite</span>
            </button>
          )}

          {!isDM && activeRoom.name !== 'general' && (user?.role === 'admin' || activeRoom.created_by === user?.id) && (
            <button
              onClick={async () => {
                if (window.confirm(`Delete channel #${activeRoom.name}? This will permanently remove all messages.`)) {
                  try {
                    await api.deleteRoom(activeRoom.id);
                  } catch (e) {
                    alert(e.message || 'Failed to delete room');
                  }
                }
              }}
              style={{
                ...memberToggleBtnStyle,
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                color: '#dc2626',
                border: '1px solid rgba(239, 68, 68, 0.25)',
              }}
              title="Delete this channel"
            >
              <Trash2 size={15} />
            </button>
          )}

          {!isDM && (
            <button
              onClick={onToggleMembers}
              style={{
                ...memberToggleBtnStyle,
                backgroundColor: isMembersOpen ? '#84A282' : 'rgba(184, 207, 179, 0.35)',
                color: isMembersOpen ? '#FEFAF3' : 'var(--text-main)',
              }}
              title="Toggle Members List"
            >
              <Users size={16} />
              <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>
                {activeRoom.member_count || 1}
              </span>
            </button>
          )}
        </div>
      </header>

      {/* Join Channel Preview Banner */}
      {!isDM && activeRoom.is_member === false && (
        <div style={joinBannerStyle}>
          <div>
            <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>You are previewing #{activeRoom.name}. </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Join this channel to post messages and participate.
            </span>
          </div>
          <button
            onClick={() => onJoinRoom(activeRoom.id)}
            className="btn-primary"
            style={{ padding: '6px 16px', fontSize: '0.82rem' }}
          >
            Join Channel
          </button>
        </div>
      )}

      {/* Messages Feed */}
      <div
        ref={messagesContainerRef}
        style={messagesFeedStyle}
        onClick={(e) => {
          if (e.target.tagName !== 'BUTTON' && !window.getSelection()?.toString()) {
            inputRef.current?.focus();
          }
        }}
      >
        {hasMore && (
          <div style={{ textAlign: 'center', margin: '8px 0' }}>
            <button
              onClick={handleLoadOlder}
              disabled={loadingOlder}
              className="btn-secondary"
              style={{ fontSize: '0.8rem', padding: '6px 14px' }}
            >
              {loadingOlder ? 'Loading older history...' : 'Load earlier messages'}
            </button>
          </div>
        )}

        {loading ? (
          <div style={feedPlaceholderStyle}>
            <Clock size={24} color="#84A282" className="animate-spin" />
            <span>Loading messages...</span>
          </div>
        ) : messages.length === 0 ? (
          <div style={feedPlaceholderStyle}>
            <div style={firstMessageBannerStyle}>
              <div style={emptyIconCircleStyle}>
                <Hash size={24} color="#84A282" />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>Welcome to #{activeRoom.name}!</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                This is the beginning of the #{activeRoom.name} channel. Be the first to drop a message!
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.sender_id === user?.id || msg.username === user?.username;
            return (
              <div
                key={msg.id || index}
                style={{
                  ...messageRowStyle,
                  flexDirection: isMe ? 'row-reverse' : 'row',
                }}
              >
                <img
                  src={
                    msg.avatar_url ||
                    `https://api.dicebear.com/7.x/bottts/svg?seed=${msg.username || 'User'}`
                  }
                  alt={msg.username}
                  style={messageAvatarStyle}
                />
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isMe ? 'flex-end' : 'flex-start',
                    maxWidth: '70%',
                  }}
                >
                  <div style={messageMetaStyle}>
                    <span style={{ fontWeight: 700, fontSize: '0.82rem', color: isMe ? '#84A282' : 'var(--text-main)' }}>
                      {isMe ? 'You' : msg.username}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)' }}>
                      {formatTime(msg.created_at)}
                    </span>
                  </div>
                  <div
                    style={{
                      ...messageBubbleStyle,
                      backgroundColor: isMe ? '#84A282' : '#F6E2E9',
                      color: isMe ? '#FEFAF3' : '#1f2d22',
                      borderRadius: isMe ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                      border: isMe ? 'none' : '1px solid rgba(184, 207, 179, 0.5)',
                      boxShadow: isMe ? '0 2px 8px rgba(132, 162, 130, 0.25)' : '0 2px 6px rgba(132, 162, 130, 0.08)',
                    }}
                  >
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicators & Composer Container */}
      <div style={composerContainerStyle}>
        {/* Active Typing Indicator */}
        <div style={typingBarStyle}>
          {currentTypingUsers.length > 0 ? (
            <div style={typingTextActiveStyle}>
              <span className="online-dot" style={{ width: '6px', height: '6px', marginRight: '6px' }} />
              {currentTypingUsers.length === 1
                ? `${currentTypingUsers[0]} is typing...`
                : `${currentTypingUsers.join(', ')} are typing...`}
            </div>
          ) : (
            <div style={{ height: '18px' }} />
          )}
        </div>

        {/* Quick Emoji Bar Popover */}
        {showEmojiPicker && (
          <div style={emojiPickerBarStyle}>
            {quickEmojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => addEmoji(emoji)}
                style={emojiButtonStyle}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSendMessage} style={composerFormStyle}>
          <button
            type="button"
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            style={emojiToggleBtnStyle}
            title="Insert Emoji"
          >
            <Smile size={18} />
          </button>

          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={isDM ? `Message @${dmUser?.username || 'user'}...` : `Message #${activeRoom.name}...`}
            style={messageInputStyle}
            autoFocus
          />

          <button
            type="submit"
            disabled={!inputText.trim()}
            style={{
              ...sendBtnStyle,
              opacity: inputText.trim() ? 1 : 0.45,
              cursor: inputText.trim() ? 'pointer' : 'default',
            }}
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </main>
  );
}

const chatContainerStyle = {
  flex: 1,
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: '#FEFAF3',
  minWidth: 0,
};

const headerStyle = {
  padding: '12px 20px',
  borderBottom: '1px solid rgba(184, 207, 179, 0.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  backgroundColor: '#FEFAF3',
  zIndex: 10,
};

const joinBannerStyle = {
  backgroundColor: 'rgba(246, 226, 233, 0.65)',
  borderBottom: '1px solid rgba(184, 207, 179, 0.5)',
  padding: '10px 20px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
};

const roomIconBadgeStyle = {
  width: '34px',
  height: '34px',
  borderRadius: '8px',
  backgroundColor: 'rgba(184, 207, 179, 0.35)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const memberToggleBtnStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '6px 12px',
  borderRadius: '8px',
  border: '1px solid rgba(184, 207, 179, 0.5)',
  transition: 'all 0.15s ease',
};

const messagesFeedStyle = {
  flex: 1,
  overflowY: 'auto',
  padding: '20px',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  backgroundColor: '#FEFAF3',
};

const messageRowStyle = {
  display: 'flex',
  gap: '12px',
  alignItems: 'flex-start',
  animation: 'fadeIn 0.2s ease-in',
};

const messageAvatarStyle = {
  width: '36px',
  height: '36px',
  borderRadius: '50%',
  backgroundColor: '#B8CFB3',
  objectFit: 'cover',
  flexShrink: 0,
};

const messageMetaStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginBottom: '4px',
};

const messageBubbleStyle = {
  padding: '10px 16px',
  fontSize: '0.92rem',
  lineHeight: 1.45,
  wordBreak: 'break-word',
};

const composerContainerStyle = {
  padding: '0 20px 16px 20px',
  backgroundColor: 'transparent',
  position: 'relative',
};

const typingBarStyle = {
  minHeight: '20px',
  padding: '0 4px',
  marginBottom: '4px',
};

const typingTextActiveStyle = {
  fontSize: '0.75rem',
  color: '#84A282',
  display: 'flex',
  alignItems: 'center',
  fontWeight: 600,
};

const composerFormStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  backgroundColor: '#ffffff',
  border: '1px solid rgba(184, 207, 179, 0.65)',
  borderRadius: '14px',
  padding: '6px 12px',
  boxShadow: '0 2px 10px rgba(132, 162, 130, 0.08)',
};

const messageInputStyle = {
  flex: 1,
  background: 'transparent',
  border: 'none',
  boxShadow: 'none',
  padding: '8px 4px',
  fontSize: '0.92rem',
  color: 'var(--text-main)',
};

const emojiToggleBtnStyle = {
  background: 'transparent',
  color: '#84A282',
  padding: '6px',
  borderRadius: '8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const emojiPickerBarStyle = {
  position: 'absolute',
  bottom: '68px',
  left: '20px',
  borderRadius: '12px',
  padding: '6px 10px',
  display: 'flex',
  gap: '6px',
  backgroundColor: '#FEFAF3',
  border: '1px solid rgba(184, 207, 179, 0.6)',
  boxShadow: '0 8px 24px rgba(132, 162, 130, 0.15)',
};

const emojiButtonStyle = {
  background: 'transparent',
  fontSize: '1.2rem',
  padding: '4px 6px',
  borderRadius: '6px',
  transition: 'transform 0.15s',
};

const sendBtnStyle = {
  background: '#84A282',
  color: '#FEFAF3',
  width: '36px',
  height: '36px',
  borderRadius: '10px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 2px 8px rgba(132, 162, 130, 0.3)',
};

const emptyRoomContainerStyle = {
  flex: 1,
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#FEFAF3',
  padding: '24px',
};

const emptyCardStyle = {
  maxWidth: '480px',
  padding: '36px',
  borderRadius: '20px',
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  backgroundColor: 'rgba(254, 250, 243, 0.9)',
  border: '1px solid rgba(184, 207, 179, 0.5)',
  boxShadow: '0 10px 30px rgba(132, 162, 130, 0.1)',
};

const emptyIconCircleStyle = {
  width: '64px',
  height: '64px',
  borderRadius: '50%',
  backgroundColor: 'rgba(184, 207, 179, 0.35)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: '16px',
};

const feedPlaceholderStyle = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--text-muted)',
  gap: '12px',
  padding: '40px',
};

const firstMessageBannerStyle = {
  textAlign: 'center',
  maxWidth: '400px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '8px',
};
