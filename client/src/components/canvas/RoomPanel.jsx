import { useState } from 'react';
import { Users, Copy, ChevronRight, ChevronLeft, Wifi, WifiOff } from 'lucide-react';
import Avatar from '../ui/Avatar';
import { cn } from '../../utils/helpers';
import toast from 'react-hot-toast';

const RoomPanel = ({ board, connectedUsers = [], isConnected, currentUserId }) => {
  const [collapsed, setCollapsed] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(board?.roomCode || '');
    toast.success('Room code copied!');
  };

  return (
    <div className={cn(
      'absolute right-3 top-16 z-30 bg-white border border-surface-200 rounded-2xl shadow-card-md',
      'transition-all duration-200',
      collapsed ? 'w-10' : 'w-56',
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-2.5 border-b border-surface-100">
        {!collapsed && (
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn(
              'w-2 h-2 rounded-full shrink-0',
              isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-surface-300'
            )} />
            <span className="text-xs font-medium text-surface-700 truncate">
              {isConnected ? `${connectedUsers.length} online` : 'Connecting…'}
            </span>
          </div>
        )}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="p-1 rounded-lg hover:bg-surface-100 text-surface-400 shrink-0"
        >
          {collapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>
      </div>

      {!collapsed && (
        <>
          {/* Room code */}
          <div className="px-3 py-2.5 border-b border-surface-100">
            <p className="text-xs text-surface-400 mb-1">Room code</p>
            <button
              onClick={copyCode}
              className="flex items-center gap-2 w-full group"
            >
              <span className="font-mono text-sm font-semibold text-surface-800 tracking-widest">
                {board?.roomCode}
              </span>
              <Copy
                size={12}
                className="text-surface-300 group-hover:text-brand-500 transition-colors shrink-0"
              />
            </button>
          </div>

          {/* Users list */}
          <div className="p-2.5">
            <p className="text-xs font-medium text-surface-400 mb-2 px-1">Members</p>
            <div className="space-y-1 max-h-52 overflow-y-auto scrollbar-hide">
              {connectedUsers.map((u) => (
                <div
                  key={u.socketId || u.userId}
                  className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-surface-50"
                >
                  <Avatar
                    name={u.name}
                    color={u.cursorColor}
                    size="xs"
                    showRing
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-surface-700 truncate">
                      {u.name}
                      {u.userId === currentUserId && (
                        <span className="text-surface-400 font-normal ml-1">(you)</span>
                      )}
                    </p>
                  </div>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                </div>
              ))}

              {connectedUsers.length === 0 && (
                <div className="flex flex-col items-center py-4 text-center">
                  <Users size={24} className="text-surface-200 mb-2" />
                  <p className="text-xs text-surface-400">No one else here yet</p>
                  <p className="text-xs text-surface-300 mt-0.5">Share the room code!</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RoomPanel;
