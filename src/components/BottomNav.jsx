import React from 'react';
import { Link, useLocation } from 'react-router-dom';

/**
 * Bottom navigation bar untuk navigasi antar halaman dalam game
 */
export function BottomNav({ groupCode }) {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const navItems = [
    { path: `/game/${groupCode}`, label: 'Permainan', icon: '🎮' },
    { path: `/game/${groupCode}/round`, label: 'Input', icon: '🃏' },
    { path: `/game/${groupCode}/history`, label: 'Riwayat', icon: '📋' },
    { path: `/game/${groupCode}/stats`, label: 'Stat', icon: '📊' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-slate-900 to-slate-800 border-t-2 border-purple-500 shadow-2xl">
      <div className="flex justify-around items-center px-2">
        {navItems.map(item => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex-1 py-4 px-3 text-center transition-all duration-300 transform hover:scale-110 ${
              isActive(item.path)
                ? 'text-purple-300 border-t-4 border-purple-500 -translate-y-1'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="text-2xl mb-1">{item.icon}</div>
            <div className="text-xs font-semibold uppercase tracking-wide">{item.label}</div>
          </Link>
        ))}
      </div>
    </nav>
  );
}
