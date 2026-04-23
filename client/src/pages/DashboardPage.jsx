import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, Grid3X3, List, Clock, Users,
  MoreHorizontal, Trash2, ExternalLink, Copy, Hash,
} from 'lucide-react';
import { boardApi } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/layout/Navbar';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import { cn, timeAgo, truncate, randomBoardColor } from '../utils/helpers';
import toast from 'react-hot-toast';

// ── Board card ────────────────────────────────────────────────
const BoardCard = ({ board, onDelete, view }) => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const gradient = randomBoardColor();

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!confirm(`Delete "${board.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await boardApi.delete(board._id);
      onDelete(board._id);
      toast.success('Board deleted');
    } catch {
      toast.error('Failed to delete board');
    } finally {
      setDeleting(false);
    }
  };

  const copyCode = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(board.roomCode);
    toast.success('Room code copied!');
    setMenuOpen(false);
  };

  if (view === 'list') {
    return (
      <div
        onClick={() => navigate(`/board/${board._id}`)}
        className="card-hover flex items-center gap-4 px-4 py-3"
      >
        <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br shrink-0', gradient)} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-surface-900 truncate">{board.title}</p>
          <p className="text-xs text-surface-400 mt-0.5">Updated {timeAgo(board.updatedAt)}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="badge badge-gray font-mono text-xs">{board.roomCode}</span>
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            className="btn-ghost p-1.5 rounded-lg"
          >
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => navigate(`/board/${board._id}`)}
      className="card-hover group overflow-hidden"
    >
      {/* Thumbnail area */}
      <div className={cn(
        'h-36 bg-gradient-to-br flex items-center justify-center relative',
        gradient
      )}>
        <div className="absolute inset-0 opacity-20">
          <svg width="100%" height="100%">
            <defs>
              <pattern id={`p-${board._id}`} width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#p-${board._id})`} />
          </svg>
        </div>
        <span className="text-4xl opacity-60"></span>

        {/* Hover actions */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            className="w-8 h-8 bg-white/90 backdrop-blur rounded-lg flex items-center justify-center shadow-sm hover:bg-white transition-colors"
          >
            <MoreHorizontal size={14} />
          </button>

          {menuOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl border border-surface-200 shadow-card-md overflow-hidden z-10 animate-scale-in"
            >
              <button
                onClick={() => { navigate(`/board/${board._id}`); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-surface-700 hover:bg-surface-50"
              >
                <ExternalLink size={14} /> Open board
              </button>
              <button
                onClick={copyCode}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-surface-700 hover:bg-surface-50"
              >
                <Copy size={14} /> Copy room code
              </button>
              <div className="border-t border-surface-100" />
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50"
              >
                {deleting ? <Spinner size="sm" /> : <Trash2 size={14} />}
                Delete board
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <p className="text-sm font-medium text-surface-900 truncate">{board.title}</p>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1 text-xs text-surface-400">
            <Clock size={11} />
            {timeAgo(board.updatedAt)}
          </div>
          <span className="font-mono text-xs text-surface-400">{board.roomCode}</span>
        </div>
      </div>
    </div>
  );
};

// ── Create board modal ────────────────────────────────────────
const CreateModal = ({ onClose, onCreate }) => {
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { data } = await boardApi.create({ title: title.trim() || 'Untitled Board' });
      onCreate(data.data.board);
      toast.success('Board created!');
      onClose();
    } catch {
      toast.error('Failed to create board');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-card-lg w-full max-w-sm p-6 animate-scale-in">
        <h2 className="text-lg font-semibold text-surface-900 mb-1">New board</h2>
        <p className="text-sm text-surface-500 mb-6">Give your board a name to get started</p>
        <form onSubmit={handleCreate} className="space-y-4">
          <input
            autoFocus
            className="input"
            placeholder="e.g. Product roadmap Q3"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
          />
          <div className="flex gap-3">
            <Button variant="secondary" size="md" className="flex-1" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" size="md" className="flex-1" isLoading={isLoading}>
              Create board
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Join modal ────────────────────────────────────────────────
const JoinModal = ({ onClose }) => {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!code.trim()) { setError('Enter a room code'); return; }
    setIsLoading(true);
    setError('');
    try {
      const { data } = await boardApi.joinByCode(code.trim());
      toast.success(`Joined "${data.data.board.title}"!`);
      navigate(`/board/${data.data.board._id}`);
    } catch (err) {
      setError(err?.response?.data?.message || 'Room not found');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-card-lg w-full max-w-sm p-6 animate-scale-in">
        <h2 className="text-lg font-semibold text-surface-900 mb-1">Join a board</h2>
        <p className="text-sm text-surface-500 mb-6">Enter the 6-character room code</p>
        <form onSubmit={handleJoin} className="space-y-4">
          <div className="relative">
            <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
            <input
              autoFocus
              className={cn('input pl-10 font-mono tracking-widest uppercase', error && 'input-error')}
              placeholder="ABC123"
              value={code}
              onChange={(e) => { setCode(e.target.value.toUpperCase().slice(0, 6)); setError(''); }}
              maxLength={6}
            />
          </div>
          {error && <p className="form-error -mt-2">{error}</p>}
          <div className="flex gap-3">
            <Button variant="secondary" size="md" className="flex-1" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" size="md" className="flex-1" isLoading={isLoading}>
              Join board
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Dashboard page ────────────────────────────────────────────
const DashboardPage = () => {
  const { user } = useAuth();
  const [boards, setBoards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState('grid');
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  useEffect(() => {
    const fetchBoards = async () => {
      try {
        const { data } = await boardApi.list();
        setBoards(data.data.boards);
      } catch {
        toast.error('Failed to load boards');
      } finally {
        setIsLoading(false);
      }
    };
    fetchBoards();
  }, []);

  const handleDelete = useCallback((id) => {
    setBoards((prev) => prev.filter((b) => b._id !== id));
  }, []);

  const handleCreate = useCallback((board) => {
    setBoards((prev) => [board, ...prev]);
  }, []);

  const filtered = boards.filter((b) =>
    b.title.toLowerCase().includes(search.toLowerCase())
  );

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="min-h-screen bg-surface-50">
      <Navbar />

      <main className="page-container py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-surface-900">
              {greeting()}, {user?.name?.split(' ')[0]} 
            </h1>
            <p className="text-surface-500 text-sm mt-1">
              {boards.length === 0 ? 'Create your first board to get started' : `${boards.length} board${boards.length !== 1 ? 's' : ''} in your workspace`}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="secondary"
              size="md"
              leftIcon={<Users size={15} />}
              onClick={() => setShowJoin(true)}
            >
              Join board
            </Button>
            <Button
              variant="primary"
              size="md"
              leftIcon={<Plus size={15} />}
              onClick={() => setShowCreate(true)}
            >
              New board
            </Button>
          </div>
        </div>

        {/* Search + view toggle */}
        {boards.length > 0 && (
          <div className="flex items-center gap-3 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
              <input
                className="input pl-9 h-9 text-sm"
                placeholder="Search boards…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-1 bg-surface-100 rounded-lg p-1">
              <button
                onClick={() => setView('grid')}
                className={cn('p-1.5 rounded-md transition-colors', view === 'grid' ? 'bg-white shadow-sm text-brand-600' : 'text-surface-400 hover:text-surface-600')}
              >
                <Grid3X3 size={15} />
              </button>
              <button
                onClick={() => setView('list')}
                className={cn('p-1.5 rounded-md transition-colors', view === 'list' ? 'bg-white shadow-sm text-brand-600' : 'text-surface-400 hover:text-surface-600')}
              >
                <List size={15} />
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Spinner size="lg" />
            <p className="text-sm text-surface-400">Loading boards…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            {search ? (
              <>
                <div className="w-16 h-16 bg-surface-100 rounded-2xl flex items-center justify-center mb-4 text-2xl"></div>
                <p className="text-surface-600 font-medium">No boards match "{search}"</p>
                <p className="text-surface-400 text-sm mt-1">Try a different search term</p>
              </>
            ) : (
              <>
                <div className="w-20 h-20 bg-brand-50 rounded-3xl flex items-center justify-center mb-6 text-4xl"></div>
                <h2 className="text-lg font-semibold text-surface-900 mb-2">Your canvas awaits</h2>
                <p className="text-surface-500 text-sm mb-6 max-w-xs">
                  Create your first board or join an existing one with a room code.
                </p>
                <div className="flex gap-3">
                  <Button variant="secondary" onClick={() => setShowJoin(true)}>
                    Join a board
                  </Button>
                  <Button variant="primary" leftIcon={<Plus size={15} />} onClick={() => setShowCreate(true)}>
                    Create board
                  </Button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className={cn(
            view === 'grid'
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
              : 'flex flex-col gap-2'
          )}>
            {filtered.map((board) => (
              <BoardCard
                key={board._id}
                board={board}
                onDelete={handleDelete}
                view={view}
              />
            ))}
          </div>
        )}
      </main>

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />}
      {showJoin && <JoinModal onClose={() => setShowJoin(false)} />}
    </div>
  );
};

export default DashboardPage;
