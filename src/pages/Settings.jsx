import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function Settings() {
  const navigate = useNavigate();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-4">
      <div className="max-w-md mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate('/home')}
          className="mb-6 text-white font-bold text-lg flex items-center gap-2 hover:gap-3 transition-all"
        >
          ← Kembali
        </button>

        <div className="bg-white rounded-3xl p-6 shadow-xl space-y-6">
          <h1 className="text-2xl font-bold text-slate-800 text-center">⚙️ Pengaturan</h1>

          {/* Sound Setting */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border-2 border-slate-200">
            <div>
              <div className="font-semibold text-slate-800">🔊 Suara</div>
              <div className="text-sm text-slate-600">Aktifkan efek suara</div>
            </div>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                soundEnabled ? 'bg-green-500' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  soundEnabled ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Notifications Setting */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border-2 border-slate-200">
            <div>
              <div className="font-semibold text-slate-800">🔔 Notifikasi</div>
              <div className="text-sm text-slate-600">Terima notifikasi game</div>
            </div>
            <button
              onClick={() => setNotificationsEnabled(!notificationsEnabled)}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                notificationsEnabled ? 'bg-green-500' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  notificationsEnabled ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* About */}
          <div className="p-4 bg-slate-50 rounded-lg border-2 border-slate-200 text-center">
            <div className="text-sm text-slate-600">
              <div className="font-semibold text-slate-800 mb-1">📱 Tentang Aplikasi</div>
              <div>BOX Card Game v1.0.0</div>
              <div className="text-xs text-slate-500 mt-1">Built with ❤️</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
