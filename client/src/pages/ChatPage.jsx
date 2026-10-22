import { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import ChatArea from '../components/ChatArea';
import MembersList from '../components/MembersList';
import CreateRoomModal from '../components/CreateRoomModal';
import NewDMModal from '../components/NewDMModal';
import InviteModal from '../components/InviteModal';
import AdminModal from '../components/AdminModal';
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
  const [loadingRooms, setLoadingRooms] = useState(true);

  const activeRoomRef = useRef(null);
  activeRoomRef.current = activeRoom;

  const { socket } = useSocket();

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

      // Instantly reload active room members list live
      if (activeRoomRef.current?.id === roomId) {
        try {
          const updated = await api.getRoomMembers(roomId);
          setRoomMembers(updated || []);
        } catch (e) {}
      }
    };

    const handleUserRegistered = async () => {
      // Reload members if on a public channel
      if (activeRoomRef.current && !activeRoomRef.current.is_dm) {
        try {
          const updated = await api.getRoomMembers(activeRoomRef.current.id);
          setRoomMembers(updated || []);
        } catch (e) {}
      }
    };

    const handlePresenceUpdate = async () => {
      // Sync room members live when someone connects
      if (activeRoomRef.current) {
        try {
          const updated = await api.getRoomMembers(activeRoomRef.current.id);
          setRoomMembers(updated || []);
        } catch (e) {}
      }
    };

    const handleMessageReceived = (msg) => {
      // If we don't have this room yet (e.g. brand new incoming DM from another user), re-fetch rooms
      setRooms((prev) => {
        if (!prev.some((r) => r.id === msg.room_id)) {
          api.getRooms().then((updated) => setRooms(updated));
        }
        return prev;
      });

      // If message is in another room than currently open, increment unread badge
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
    // Clear unread count for opened room
    setUnreadCounts((prev) => ({
      ...prev,
      [room.id]: 0,
    }));
  };

  const handleToggleMembers = () => {
    setIsMembersOpen((prev) => !prev);
  };

  // Join a channel
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
      // Reload room members
      const members = await api.getRoomMembers(roomId);
      setRoomMembers(members || []);
    } catch (err) {
      console.error('Failed to join channel:', err);
    }
  };

  // Start Direct Message with target user
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

  return (
    <div style={dashboardContainerStyle}>
      <Sidebar
        rooms={rooms}
        activeRoom={activeRoom}
        onSelectRoom={handleSelectRoom}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        onOpenDMModal={() => setIsDMModalOpen(true)}
        onOpenAdminModal={() => setIsAdminModalOpen(true)}
        unreadCounts={unreadCounts}
      />

      <ChatArea
        activeRoom={activeRoom}
        onToggleMembers={handleToggleMembers}
        isMembersOpen={isMembersOpen}
        onJoinRoom={handleJoinRoom}
        onOpenInviteModal={() => setIsInviteModalOpen(true)}
      />

      <MembersList
        members={roomMembers}
        isOpen={isMembersOpen}
        onClose={() => setIsMembersOpen(false)}
        onStartDM={handleStartDM}
      />

      <CreateRoomModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onRoomCreated={handleRoomCreated}
      />

      <NewDMModal
        isOpen={isDMModalOpen}
        onClose={() => setIsDMModalOpen(false)}
        onSelectUser={handleStartDM}
      />

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
    </div>
  );
}

const dashboardContainerStyle = {
  width: '100vw',
  height: '100vh',
  display: 'flex',
  backgroundColor: 'var(--bg-primary)',
  overflow: 'hidden',
};
