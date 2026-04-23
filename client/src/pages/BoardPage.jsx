import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState, useCallback, useRef, memo } from 'react';
import { ArrowLeft, Layers, Share2, Users, Wifi, WifiOff } from 'lucide-react';
import { boardApi } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import useCanvas from '../hooks/useCanvas';
import useCollaboration from '../hooks/useCollaboration';
import Toolbar from '../components/canvas/Toolbar';
import CursorOverlay from '../components/canvas/CursorOverlay';
import RoomPanel from '../components/canvas/RoomPanel';
import CanvasStatusBar from '../components/canvas/CanvasStatusBar';
import Spinner from '../components/ui/Spinner';
import Avatar from '../components/ui/Avatar';
import { cn } from '../utils/helpers';
import toast from 'react-hot-toast';
import { getSocket } from '../utils/socket';

const CANVAS_ID = 'main-canvas';

const MemoizedCanvas = memo(() => (
  <div className="absolute inset-0 z-10 pointer-events-auto">
    <canvas id={CANVAS_ID} />
  </div>
), () => true); // Never re-render this node so Fabric stays intact

const BoardPage = () => {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const { user }     = useAuth();
  const titleInputRef = useRef(null);
  const containerRef  = useRef(null);
  const cursorThrottle = useRef(null);
  const hasLoadedRef   = useRef(false);

  const [board,        setBoard]        = useState(null);
  const [isLoading,    setIsLoading]    = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue,   setTitleValue]   = useState('');
  const [objectCount,  setObjectCount]  = useState(0);
  const [isSaving,     setIsSaving]     = useState(false);

  // ── Canvas engine ─────────────────────────────────────────
  // onCanvasChange will be wired up after collab hook is ready
  const canvasChangeRef = useRef(null);

  const handleCanvasChange = useCallback((json) => {
    canvasChangeRef.current?.(json);
    if (json?.objects) setObjectCount(json.objects.length);
  }, []);

  const canvas = useCanvas({
    canvasId: CANVAS_ID,
    onCanvasChange: handleCanvasChange,
    isReady: !isLoading,
  });

  // ── Collaboration hook ────────────────────────────────────
  const handleSave = useCallback((canvasJSON) => {
    setIsSaving(true);
    setTimeout(() => setIsSaving(false), 600);
  }, []);

  const collab = useCollaboration({
    boardId:  id,
    fabricRef: canvas.fabricRef,
    isCanvasReady: canvas.isCanvasReady,
    onSave:   handleSave,
  });

  // Wire canvas changes → collab sync
  useEffect(() => {
    canvasChangeRef.current = collab.pushCanvasChange;
  }, [collab.pushCanvasChange]);

  // Track if Yjs completes its connection before DB fallback runs
  useEffect(() => {
    if (collab.isSynced) hasLoadedRef.current = true;
  }, [collab.isSynced]);

  // ── Load board from API ───────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await boardApi.get(id);
        const b = data.data.board;
        setBoard(b);
        setTitleValue(b.title);

        // If Yjs not synced yet, pre-load from DB canvas data
        if (b.canvasData) {
          const json = typeof b.canvasData === 'string'
            ? JSON.parse(b.canvasData)
            : b.canvasData;
          // Slight delay so canvas element is mounted
          setTimeout(() => {
            if (!hasLoadedRef.current) {
              canvas.loadFromJSON(json);
              hasLoadedRef.current = true;
            }
          }, 250);
        }
      } catch (err) {
        toast.error(err?.response?.data?.message || 'Board not found');
        navigate('/dashboard');
      } finally {
        setIsLoading(false);
      }
    };
    const t = setTimeout(load, 80);
    return () => clearTimeout(t);
  }, [id]); // eslint-disable-line

  // ── Title sync from remote ────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      const { title } = e.detail;
      setBoard((b) => b ? { ...b, title } : b);
      setTitleValue(title);
    };
    document.addEventListener('board:title-updated', handler);
    return () => document.removeEventListener('board:title-updated', handler);
  }, []);

  // ── Cursor tracking ───────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onMove = (e) => {
      if (cursorThrottle.current) return;
      cursorThrottle.current = setTimeout(() => {
        cursorThrottle.current = null;
      }, 33); // ~30fps
      const rect = el.getBoundingClientRect();
      collab.emitCursor(e.clientX - rect.left, e.clientY - rect.top);
    };
    el.addEventListener('mousemove', onMove);
    return () => el.removeEventListener('mousemove', onMove);
  }, [collab.emitCursor]);

  // ── Title editing ─────────────────────────────────────────
  const saveTitle = async () => {
    setEditingTitle(false);
    const trimmed = titleValue.trim();
    if (!trimmed || trimmed === board?.title) return;
    try {
      await boardApi.update(id, { title: trimmed });
      setBoard((b) => ({ ...b, title: trimmed }));
      collab.emitTitleChange(trimmed);
    } catch {
      setTitleValue(board?.title || '');
      toast.error('Failed to rename board');
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(board?.roomCode || '');
    toast.success('Room code copied!');
  };

  // ── Page unload: force save ───────────────────────────────
  useEffect(() => {
    const onUnload = () => {
      const json = canvas.getCanvasJSON();
      if (json && id) {
        const socket = getSocket();
        if (socket?.connected) {
          socket.emit('canvas:save', { canvasJSON: JSON.stringify(json) });
        }
      }
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [id, canvas]);

  // ── Loading screen ────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Spinner size="xl" color="white" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Layers size={16} className="text-white opacity-60" />
            </div>
          </div>
          <p className="text-slate-400 text-sm">Loading board…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-100">

      {/* ══ Header ════════════════════════════════════════════ */}
      <header className="h-12 bg-white border-b border-slate-200 flex items-center
                         px-3 gap-2 shrink-0 z-40 select-none">

        {/* Back */}
        <button
          onClick={() => navigate('/dashboard')}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800
                     hover:bg-slate-100 transition-colors shrink-0"
          title="Back to dashboard"
        >
          <ArrowLeft size={16} />
        </button>

        {/* Logo */}
        <div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center shrink-0">
          <Layers size={12} className="text-white" />
        </div>

        {/* Editable title */}
        {editingTitle ? (
          <input
            ref={titleInputRef}
            className="text-sm font-medium bg-slate-50 border border-indigo-300
                       rounded-lg px-2 py-0.5 focus:outline-none focus:ring-2
                       focus:ring-indigo-500 w-44"
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter')  titleInputRef.current?.blur();
              if (e.key === 'Escape') {
                setTitleValue(board?.title || '');
                setEditingTitle(false);
              }
            }}
            autoFocus
            maxLength={100}
          />
        ) : (
          <button
            onClick={() => setEditingTitle(true)}
            className="text-sm font-medium text-slate-700 hover:text-slate-900
                       hover:bg-slate-100 px-2 py-0.5 rounded-lg transition-colors
                       max-w-[200px] truncate"
            title="Click to rename"
          >
            {board?.title}
          </button>
        )}

        <div className="flex-1" />

        {/* Sync status */}
        <div className={cn(
          'hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all',
          collab.isSynced
            ? 'bg-emerald-50 text-emerald-700'
            : collab.isConnected
              ? 'bg-amber-50 text-amber-700'
              : 'bg-slate-100 text-slate-500'
        )}>
          <span className={cn(
            'w-1.5 h-1.5 rounded-full',
            collab.isSynced    ? 'bg-emerald-500 animate-pulse'
            : collab.isConnected ? 'bg-amber-400 animate-pulse'
            : 'bg-slate-400'
          )} />
          {collab.isSynced
            ? 'Synced'
            : collab.isConnected
              ? 'Syncing…'
              : 'Offline'}
        </div>

        {/* Connected avatars */}
        {collab.connectedUsers.length > 0 && (
          <div className="hidden sm:flex items-center -space-x-1.5">
            {collab.connectedUsers.slice(0, 5).map((u) => (
              <Avatar
                key={u.socketId}
                name={u.name}
                color={u.cursorColor}
                size="xs"
                showRing
              />
            ))}
            {collab.connectedUsers.length > 5 && (
              <div className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white
                              flex items-center justify-center text-xs text-slate-600 font-medium">
                +{collab.connectedUsers.length - 5}
              </div>
            )}
          </div>
        )}

        {/* Room code */}
        <button
          onClick={copyCode}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100
                     hover:bg-slate-200 rounded-lg transition-colors"
          title="Copy room code to invite others"
        >
          <Share2 size={12} className="text-slate-500" />
          <span className="font-mono text-xs font-semibold tracking-widest text-slate-700">
            {board?.roomCode}
          </span>
        </button>

        {/* Own avatar */}
        <Avatar name={user?.name} color={user?.cursorColor} size="sm" showRing />
      </header>

      {/* ══ Canvas workspace ══════════════════════════════════ */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden"
        style={{
          background:
            'radial-gradient(ellipse at 60% 20%, #eef2ff 0%, #e2e8f0 50%, #cbd5e1 100%)',
          minHeight: 0, // Important: flex-col parent needs this for flex-1 to work
        }}
      >
        {/* Dot grid */}
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            backgroundImage: 'radial-gradient(circle, #94a3b8 1px, transparent 1px)',
            backgroundSize:  '28px 28px',
            opacity:          0.28,
          }}
        />

        {/* Fabric.js canvas (Memoized to prevent React DOM interference) */}
        <MemoizedCanvas />

        {/* Remote cursors */}
        <CursorOverlay cursors={collab.remoteCursors} />

        {/* Floating toolbar */}
        <Toolbar
          activeTool={canvas.activeTool}   setActiveTool={canvas.setActiveTool}
          strokeColor={canvas.strokeColor} setStrokeColor={canvas.setStrokeColor}
          fillColor={canvas.fillColor}     setFillColor={canvas.setFillColor}
          strokeWidth={canvas.strokeWidth} setStrokeWidth={canvas.setStrokeWidth}
          zoom={canvas.zoom}               zoomTo={canvas.zoomTo}
          fitToScreen={canvas.fitToScreen}
          canUndo={canvas.canUndo}         canRedo={canvas.canRedo}
          undo={canvas.undo}               redo={canvas.redo}
          clearCanvas={canvas.clearCanvas}
          deleteSelected={canvas.deleteSelected}
          exportPNG={canvas.exportPNG}
          exportSVG={canvas.exportSVG}
        />

        {/* Room panel */}
        <RoomPanel
          board={board}
          connectedUsers={collab.connectedUsers}
          isConnected={collab.isSynced}
          currentUserId={user?._id}
        />

        {/* Status bar */}
        <CanvasStatusBar
          activeTool={canvas.activeTool}
          zoom={canvas.zoom}
          objectCount={objectCount}
          isSaving={isSaving}
        />

        {/* First-load sync overlay */}
        {collab.isConnected && !collab.isSynced && (
          <div className="absolute inset-0 z-50 flex items-center justify-center
                          bg-white/60 backdrop-blur-sm pointer-events-none">
            <div className="flex flex-col items-center gap-3">
              <Spinner size="lg" />
              <p className="text-sm text-slate-600 font-medium">
                Syncing with collaborators…
              </p>
            </div>
          </div>
        )}

        {/* Debug panel (development only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="absolute bottom-20 right-3 z-40 bg-slate-900 text-white text-xs p-3 rounded-lg font-mono max-w-xs">
            <div>Canvas: {canvas.fabricRef.current ? '✓' : '✗'}</div>
            <div>Connected: {collab.isConnected ? '✓' : '✗'}</div>
            <div>Synced: {collab.isSynced ? '✓' : '✗'}</div>
            <div>Users: {collab.connectedUsers.length}</div>
          </div>
        )}
      </div>
    </div>
  );
};



export default BoardPage;
