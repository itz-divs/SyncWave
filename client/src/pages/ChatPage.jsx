import { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import ChatArea from '../components/ChatArea';
import MembersList from '../components/MembersList';
import CreateRoomModal from '../components/CreateRoomModal';
import NewDMModal from '../components/NewDMModal';
import InviteModal from '../components/InviteModal';
import AdminModal from '../components/AdminModal';
import WindowSizeModal from '../components/WindowSizeModal';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

export default function ChatPage() {
  const { user, updateUser, logout } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [roomMembers, setRoomMembers] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [isMembersOpen, setIsMembersOpen] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDMModalOpen, setIsDMModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isWindowSizeModalOpen, setIsWindowSizeModalOpen] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(true);

  // Window sizing & panel width states
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('syncwave_sidebar_width');
    return saved ? Math.max(180, Math.min(450, parseInt(saved, 10))) : 280;
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const [membersWidth, setMembersWidth] = useState(() => {
    const saved = localStorage.getItem('syncwave_members_width');
    return saved ? Math.max(180, Math.min(380, parseInt(saved, 10))) : 240;
  });

  const [windowMode, setWindowMode] = useState(() => {
    return localStorage.getItem('syncwave_window_mode') || 'full';
  });

  const [uiScale, setUiScale] = useState(() => {
    const saved = localStorage.getItem('syncwave_ui_scale');
    return saved ? parseInt(saved, 10) : 100;
  });

  const [isFullscreen, setIsFullscreen] = useState(false);

  // Splitter dragging states
  const [isDraggingSidebar, setIsDraggingSidebar] = useState(false);
  const [isDraggingMembers, setIsDraggingMembers] = useState(false);

  const activeRoomRef = useRef(null);
  activeRoomRef.current = activeRoom;
  const containerRef = useRef(null);

  const { socket } = useSocket();

  // Fullscreen change listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  // Draggable Splitters
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDraggingSidebar) {
        const containerLeft = containerRef.current?.getBoundingClientRect().left || 0;
        const newWidth = Math.max(180, Math.min(450, e.clientX - containerLeft));
        setSidebarWidth(newWidth);
        localStorage.setItem('syncwave_sidebar_width', newWidth);
      } else if (isDraggingMembers) {
        const containerRight = containerRef.current?.getBoundingClientRect().right || window.innerWidth;
        const newWidth = Math.max(180, Math.min(380, containerRight - e.clientX));
        setMembersWidth(newWidth);
        localStorage.setItem('syncwave_members_width', newWidth);
      }
    };

    const handleMouseUp = () => {
      if (isDraggingSidebar) setIsDraggingSidebar(false);
      if (isDraggingMembers) setIsDraggingMembers(false);
    };

    if (isDraggingSidebar || isDraggingMembers) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDraggingSidebar, isDraggingMembers]);

  // Fetch rooms on mount
  useEffect(() => {
    let isMounted = true;
    api
      .getRooms()
      .then((data) => {
        if (!isMounted) return;
        setRooms(data);
        if (data.length > 0) {
          const defaultRoom = data.find((r) => r.name === 'general') || data[0];
          setActiveRoom(defaultRoom);
        }
        setLoadingRooms(false);
      })
      .catch((err) => {
        console.error('Failed to load rooms:', err);
        if (isMounted) setLoadingRooms(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Listen for real-time room creation, messages, and membership changes
  useEffect(() => {
    if (!socket) return;

    const handleRoomCreated = (newRoom) => {
      setRooms((prev) => {
        if (prev.some((r) => r.id === newRoom.id)) return prev;
        return [...prev, newRoom];
      });
    };

    const handleMemberJoined = async ({ roomId, memberCount }) => {
      setRooms((prev) =>
        prev.map((r) => (r.id === roomId ? { ...r, member_count: memberCount } : r))
      );
      setActiveRoom((prev) => {
        if (prev?.id === roomId) {
          return { ...prev, member_count: memberCount };
        }
        return prev;
      });

      if (activeRoomRef.current?.id === roomId) {
        try {
          const updated = await api.getRoomMembers(roomId);
          setRoomMembers(updated || []);
        } catch (e) {}
      }
    };

    const handleUserRegistered = async () => {
      if (activeRoomRef.current && !activeRoomRef.current.is_dm) {
        try {
          const updated = await api.getRoomMembers(activeRoomRef.current.id);
          setRoomMembers(updated || []);
        } catch (e) {}
      }
    };

    const handlePresenceUpdate = async () => {
      if (activeRoomRef.current) {
        try {
          const updated = await api.getRoomMembers(activeRoomRef.current.id);
          setRoomMembers(updated || []);
        } catch (e) {}
      }
    };

    const handleMessageReceived = (msg) => {
      setRooms((prev) => {
        if (!prev.some((r) => r.id === msg.room_id)) {
          api.getRooms().then((updated) => setRooms(updated));
        }
        return prev;
      });

      if (activeRoomRef.current?.id !== msg.room_id) {
        setUnreadCounts((prev) => ({
          ...prev,
          [msg.room_id]: (prev[msg.room_id] || 0) + 1,
        }));
      }
    };

    const handleRoomDeleted = ({ roomId }) => {
      setRooms((prev) => {
        const remaining = prev.filter((r) => r.id !== roomId);
        if (activeRoomRef.current?.id === roomId) {
          setActiveRoom(remaining.length > 0 ? remaining[0] : null);
        }
        return remaining;
      });
    };

    const handleRoleUpdated = ({ userId, newRole }) => {
      if (user?.id === userId) {
        updateUser({ role: newRole });
      }
      setRoomMembers((prev) =>
        prev.map((m) => (m.id === userId ? { ...m, role: newRole } : m))
      );
    };

    const handleUserRemoved = ({ userId, username }) => {
      if (user?.id === userId) {
        alert('You have been removed from this company workspace by an administrator.');
        logout();
        return;
      }
      setRoomMembers((prev) => prev.filter((m) => m.id !== userId));
    };

    socket.on('room:created', handleRoomCreated);
    socket.on('room:member_joined', handleMemberJoined);
    socket.on('user:registered', handleUserRegistered);
    socket.on('presence:update', handlePresenceUpdate);
    socket.on('message:received', handleMessageReceived);
    socket.on('room:deleted', handleRoomDeleted);
    socket.on('user:role_updated', handleRoleUpdated);
    socket.on('user:removed', handleUserRemoved);

    return () => {
      socket.off('room:created', handleRoomCreated);
      socket.off('room:member_joined', handleMemberJoined);
      socket.off('user:registered', handleUserRegistered);
      socket.off('presence:update', handlePresenceUpdate);
      socket.off('message:received', handleMessageReceived);
      socket.off('room:deleted', handleRoomDeleted);
      socket.off('user:role_updated', handleRoleUpdated);
      socket.off('user:removed', handleUserRemoved);
    };
  }, [socket, user?.id]);

  // Fetch members whenever active room changes
  useEffect(() => {
    if (!activeRoom) return;

    let isMounted = true;
    api
      .getRoomMembers(activeRoom.id)
      .then((members) => {
        if (!isMounted) return;
        setRoomMembers(members || []);
      })
      .catch((err) => {
        console.error('Failed to load members:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [activeRoom?.id]);

  const handleRoomCreated = (newRoom) => {
    setRooms((prev) => {
      if (prev.some((r) => r.id === newRoom.id)) return prev;
      return [...prev, newRoom];
    });
    setActiveRoom(newRoom);
  };

  const handleSelectRoom = (room) => {
    setActiveRoom(room);
    setUnreadCounts((prev) => ({
      ...prev,
      [room.id]: 0,
    }));
  };

  const handleToggleMembers = () => {
    setIsMembersOpen((prev) => !prev);
  };

  const handleJoinRoom = async (roomId) => {
    try {
      await api.joinRoom(roomId);
      setRooms((prev) =>
        prev.map((r) =>
          r.id === roomId ? { ...r, is_member: true, member_count: (r.member_count || 0) + 1 } : r
        )
      );
      setActiveRoom((prev) =>
        prev?.id === roomId
          ? { ...prev, is_member: true, member_count: (prev.member_count || 0) + 1 }
          : prev
      );
      const members = await api.getRoomMembers(roomId);
      setRoomMembers(members || []);
    } catch (err) {
      console.error('Failed to join channel:', err);
    }
  };

  const handleStartDM = async (targetUserId) => {
    try {
      const dmRoom = await api.createDM(targetUserId);
      setRooms((prev) => {
        if (prev.some((r) => r.id === dmRoom.id)) return prev;
        return [...prev, dmRoom];
      });
      setActiveRoom(dmRoom);
    } catch (err) {
      console.error('Failed to start DM:', err);
    }
  };

  const handleResetDefaults = () => {
    setWindowMode('full');
    setSidebarWidth(280);
    setIsSidebarCollapsed(false);
    setMembersWidth(240);
    setIsMembersOpen(true);
    setUiScale(100);
    localStorage.removeItem('syncwave_window_mode');
    localStorage.removeItem('syncwave_sidebar_width');
    localStorage.removeItem('syncwave_members_width');
    localStorage.removeItem('syncwave_ui_scale');
  };

  // Determine window layout dimensions
  const getContainerWidth = () => {
    switch (windowMode) {
      case 'wide':
        return '1440px';
      case 'standard':
        return '1200px';
      case 'compact':
        return '1000px';
      case 'full':
      default:
        return '100vw';
    }
  };

  const isBoxed = windowMode !== 'full';

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: isBoxed ? '#ede4d8' : 'var(--bg-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        transition: 'background-color 0.25s ease',
      }}
    >
      <div
        ref={containerRef}
        style={{
          width: getContainerWidth(),
          maxWidth: '100vw',
          height: isBoxed ? '94vh' : '100vh',
          display: 'flex',
          backgroundColor: 'var(--bg-primary)',
          overflow: 'hidden',
          borderRadius: isBoxed ? '16px' : '0px',
          boxShadow: isBoxed ? '0 20px 60px rgba(60, 80, 65, 0.25), 0 0 0 1px rgba(184, 207, 179, 0.4)' : 'none',
          transition: isDraggingSidebar || isDraggingMembers ? 'none' : 'width 0.2s ease, height 0.2s ease, border-radius 0.2s ease',
          zoom: uiScale !== 100 ? `${uiScale / 100}` : undefined,
          position: 'relative',
        }}
      >
        {/* Left Sidebar with dynamic width */}
        <Sidebar
          rooms={rooms}
          activeRoom={activeRoom}
          onSelectRoom={handleSelectRoom}
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
          onOpenDMModal={() => setIsDMModalOpen(true)}
          onOpenAdminModal={() => setIsAdminModalOpen(true)}
          unreadCounts={unreadCounts}
          width={sidebarWidth}
          isCollapsed={isSidebarCollapsed}
        />

        {/* Draggable Divider between Sidebar & ChatArea */}
        {!isSidebarCollapsed && (
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              setIsDraggingSidebar(true);
            }}
            onDoubleClick={() => {
              setSidebarWidth(280);
              localStorage.setItem('syncwave_sidebar_width', 280);
            }}
            style={{
              width: '4px',
              cursor: 'col-resize',
              backgroundColor: isDraggingSidebar ? '#84A282' : 'transparent',
              transition: 'background-color 0.15s ease',
              zIndex: 25,
              flexShrink: 0,
              position: 'relative',
            }}
            className="resizer-handle"
            title="Drag to resize sidebar • Double-click to reset (280px)"
          />
        )}

        {/* Central Chat Area */}
        <ChatArea
          activeRoom={activeRoom}
          onToggleMembers={handleToggleMembers}
          isMembersOpen={isMembersOpen}
          onJoinRoom={handleJoinRoom}
          onOpenInviteModal={() => setIsInviteModalOpen(true)}
          onOpenWindowSizeModal={() => setIsWindowSizeModalOpen(true)}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
        />

        {/* Draggable Divider between ChatArea & MembersList */}
        {isMembersOpen && (
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              setIsDraggingMembers(true);
            }}
            onDoubleClick={() => {
              setMembersWidth(240);
              localStorage.setItem('syncwave_members_width', 240);
            }}
            style={{
              width: '4px',
              cursor: 'col-resize',
              backgroundColor: isDraggingMembers ? '#84A282' : 'transparent',
              transition: 'background-color 0.15s ease',
              zIndex: 25,
              flexShrink: 0,
              position: 'relative',
            }}
            className="resizer-handle"
            title="Drag to resize members panel • Double-click to reset (240px)"
          />
        )}

        {/* Right Members Panel with dynamic width */}
        <MembersList
          members={roomMembers}
          isOpen={isMembersOpen}
          onClose={() => setIsMembersOpen(false)}
          onStartDM={handleStartDM}
          width={membersWidth}
        />

        {/* Create Room Modal */}
        <CreateRoomModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onRoomCreated={handleRoomCreated}
        />

        {/* New DM Modal */}
        <NewDMModal
          isOpen={isDMModalOpen}
          onClose={() => setIsDMModalOpen(false)}
          onSelectUser={handleStartDM}
        />

        {/* Invite to Channel Modal */}
        <InviteModal
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          activeRoom={activeRoom}
          currentMembers={roomMembers}
          onUserInvited={async () => {
            if (activeRoom) {
              const members = await api.getRoomMembers(activeRoom.id);
              setRoomMembers(members || []);
            }
          }}
        />

        {/* Admin Console Modal */}
        <AdminModal
          isOpen={isAdminModalOpen}
          onClose={() => setIsAdminModalOpen(false)}
          onChannelDeleted={(deletedId) => {
            setRooms((prev) => prev.filter((r) => r.id !== deletedId));
            if (activeRoom?.id === deletedId) {
              setRooms((prev) => {
                const remaining = prev.filter((r) => r.id !== deletedId);
                setActiveRoom(remaining.length > 0 ? remaining[0] : null);
                return remaining;
              });
            }
          }}
        />

        {/* Window Size & Layout Settings Modal */}
        <WindowSizeModal
          isOpen={isWindowSizeModalOpen}
          onClose={() => setIsWindowSizeModalOpen(false)}
          windowMode={windowMode}
          setWindowMode={setWindowMode}
          sidebarWidth={sidebarWidth}
          setSidebarWidth={setSidebarWidth}
          isSidebarCollapsed={isSidebarCollapsed}
          setIsSidebarCollapsed={setIsSidebarCollapsed}
          membersWidth={membersWidth}
          setMembersWidth={setMembersWidth}
          isMembersOpen={isMembersOpen}
          setIsMembersOpen={setIsMembersOpen}
          uiScale={uiScale}
          setUiScale={setUiScale}
          isFullscreen={isFullscreen}
          toggleFullscreen={toggleFullscreen}
          onResetDefaults={handleResetDefaults}
        />
      </div>
    </div>
  );
}
