import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Settings, ChevronDown, Layers } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../ui/Avatar';
import { cn } from '../../utils/helpers';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (!menuRef.current?.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="h-14 bg-white border-b border-surface-200 flex items-center px-4 sm:px-6 sticky top-0 z-40">
      {/* Logo */}
      <Link to="/dashboard" className="flex items-center gap-2 mr-8 shrink-0">
        <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
          <Layers size={14} className="text-white" />
        </div>
        <span className="font-semibold text-surface-900 text-sm tracking-tight">
          CollabBoard
        </span>
      </Link>

      {/* Spacer */}
      <div className="flex-1" />

      {/* User menu */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className={cn(
            'flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl',
            'hover:bg-surface-100 transition-colors duration-150',
            menuOpen && 'bg-surface-100'
          )}
        >
          <Avatar
            name={user?.name}
            color={user?.cursorColor}
            size="sm"
          />
          <span className="text-sm font-medium text-surface-700 hidden sm:block max-w-[120px] truncate">
            {user?.name}
          </span>
          <ChevronDown
            size={14}
            className={cn(
              'text-surface-400 transition-transform duration-200 hidden sm:block',
              menuOpen && 'rotate-180'
            )}
          />
        </button>

        {/* Dropdown */}
        {menuOpen && (
          <div className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-xl border border-surface-200 shadow-card-md overflow-hidden animate-scale-in z-50">
            {/* User info header */}
            <div className="px-4 py-3 border-b border-surface-100">
              <p className="text-sm font-medium text-surface-900 truncate">{user?.name}</p>
              <p className="text-xs text-surface-400 truncate mt-0.5">{user?.email}</p>
            </div>

            {/* Menu items */}
            <div className="py-1">
              <button
                onClick={() => { setMenuOpen(false); navigate('/settings'); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-surface-700 hover:bg-surface-50 transition-colors"
              >
                <Settings size={15} className="text-surface-400" />
                Settings
              </button>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut size={15} />
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
