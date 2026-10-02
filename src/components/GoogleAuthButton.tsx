import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { googleSignIn, logout } from '../services/firebaseAuth';
import { LogOut, Cloud, HardDrive, CheckCircle2, ChevronDown, User as UserIcon } from 'lucide-react';

interface GoogleAuthButtonProps {
  user: User | null;
  onOpenDriveHub?: () => void;
  isConnecting?: boolean;
}

export const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({
  user,
  onOpenDriveHub,
  isConnecting = false,
}) => {
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignIn = async () => {
    try {
      setLoading(true);
      await googleSignIn();
    } catch (err: any) {
      console.error('Google Sign-in failed', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setLoading(true);
      await logout();
      setMenuOpen(false);
    } catch (err: any) {
      console.error('Google Sign-out failed', err);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <button
        onClick={handleSignIn}
        disabled={loading || isConnecting}
        className="relative inline-flex items-center justify-center p-0.5 overflow-hidden text-xs font-medium rounded-xl group bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 group-hover:from-indigo-500 group-hover:to-pink-500 hover:text-white text-white shadow-md shadow-indigo-500/20 active:scale-95 transition"
      >
        <span className="relative px-3 py-1.5 transition-all ease-in duration-75 bg-slate-900 rounded-[10px] group-hover:bg-opacity-0 flex items-center gap-2">
          {/* Official Google Icon SVG from SKILL.md */}
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
            <path
              fill="#EA4335"
              d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
            />
            <path
              fill="#4285F4"
              d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
            />
            <path
              fill="#FBBC05"
              d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
            />
            <path
              fill="#34A853"
              d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
            />
          </svg>
          <span className="font-semibold tracking-wide">
            {loading ? 'Connecting...' : 'Connect Google Drive'}
          </span>
        </span>
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="flex items-center gap-2 p-1.5 pr-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-xl transition text-xs shadow-sm cursor-pointer"
      >
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt={user.displayName || 'Google User'}
            className="w-6 h-6 rounded-full border border-indigo-500/50 object-cover"
          />
        ) : (
          <div className="w-6 h-6 rounded-full bg-indigo-600/30 flex items-center justify-center text-indigo-300">
            <UserIcon className="w-3.5 h-3.5" />
          </div>
        )}

        <div className="text-left hidden sm:block">
          <div className="text-xs font-semibold text-slate-200 leading-tight max-w-[110px] truncate">
            {user.displayName || 'Connected'}
          </div>
          <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Drive Active
          </div>
        </div>

        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {/* User Dropdown Menu */}
      {menuOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl p-3 z-50 backdrop-blur-xl">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt=""
                className="w-10 h-10 rounded-full border border-indigo-500/40"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-indigo-600/40 flex items-center justify-center text-indigo-300">
                <UserIcon className="w-5 h-5" />
              </div>
            )}
            <div className="overflow-hidden">
              <div className="font-semibold text-xs text-white truncate">
                {user.displayName || 'Google Account'}
              </div>
              <div className="text-[11px] text-slate-400 font-mono truncate">
                {user.email}
              </div>
            </div>
          </div>

          <div className="py-2 space-y-1">
            {onOpenDriveHub && (
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onOpenDriveHub();
                }}
                className="w-full text-left px-2.5 py-2 rounded-xl text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-2 transition"
              >
                <HardDrive className="w-4 h-4 text-indigo-400" />
                <span>Open Google Drive Hub</span>
              </button>
            )}

            <div className="px-2.5 py-1.5 text-[11px] text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                Cloud Sync Status
              </span>
              <span className="text-emerald-400 font-semibold font-mono">Ready</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800">
            <button
              onClick={handleSignOut}
              className="w-full text-left px-2.5 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-950/30 flex items-center gap-2 transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
