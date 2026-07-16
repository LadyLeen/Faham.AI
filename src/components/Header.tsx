import React from 'react';
import { BookOpen, LogOut, Sun, Moon, User as UserIcon, ShieldAlert } from 'lucide-react';
import { User } from '../types';

interface HeaderProps {
  user: User | null;
  onLogout: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onNavigateToProfile?: () => void;
  currentTab?: string;
  onSetTab?: (tab: string) => void;
}

export default function Header({
  user,
  onLogout,
  darkMode,
  onToggleDarkMode,
  onNavigateToProfile,
  currentTab,
  onSetTab,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md transition-colors dark:border-slate-800 dark:bg-slate-900/80 no-print">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <div 
          className="flex cursor-pointer items-center gap-2.5" 
          onClick={() => onSetTab && onSetTab('home')}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 shadow-md shadow-indigo-500/20">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-600 to-indigo-600 bg-clip-text text-transparent dark:from-cyan-400 dark:to-indigo-400">
              FahamAI
            </span>
            <span className="hidden sm:inline-block ml-1.5 text-[10px] font-semibold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
              Pintar
            </span>
          </div>
        </div>

        {/* Action Items */}
        <div className="flex items-center gap-4">
          {/* Dark Mode Toggle */}
          <button
            onClick={onToggleDarkMode}
            id="toggle-dark-mode"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Tukar Tema"
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {user && (
            <div className="flex items-center gap-3">
              {/* User badge */}
              <div className="hidden md:flex flex-col text-right">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Log masuk sebagai
                </span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {user.email}
                </span>
              </div>

              {/* Navigation Tabs (Dynamic Based on Role) */}
              {onSetTab && currentTab && (
                <div className="flex gap-1.5 mr-2">
                  {user.role === 'admin' ? (
                    <button
                      onClick={() => onSetTab('admin-dashboard')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        currentTab === 'admin-dashboard'
                          ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400'
                          : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'
                      }`}
                    >
                      Dashboard Admin
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => onSetTab('student-dashboard')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          currentTab === 'student-dashboard'
                            ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400'
                            : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'
                        }`}
                      >
                        Portal Pelajar
                      </button>
                      <button
                        onClick={onNavigateToProfile}
                        className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
                      >
                        <UserIcon className="h-3.5 w-3.5" /> Profil
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Role Indicator Tag */}
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold tracking-wider uppercase ${
                user.role === 'admin' 
                  ? 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400' 
                  : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400'
              }`}>
                {user.role === 'admin' ? 'Admin' : 'Pelajar'}
              </span>

              {/* Logout Button */}
              <button
                onClick={onLogout}
                id="logout-btn"
                className="flex items-center gap-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/20 transition-all cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
