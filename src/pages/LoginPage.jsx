import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { EnvelopeIcon, LockClosedIcon } from '@heroicons/react/24/outline';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, loginAsGuest } = useAuth();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const [showPassword, setShowPassword] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);

  const onSubmit = async (data) => {
    try {
      await login(data.email, data.password);
      toast.success('Login berhasil!');
      navigate('/home');
    } catch (err) {
      toast.error(err.message || 'Login gagal');
    }
  };

  const handleGuestLogin = async () => {
    setGuestLoading(true);
    try {
      await loginAsGuest();
      toast.success('Masuk sebagai Guest!');
      navigate('/home');
    } catch (err) {
      toast.error(err.message || 'Gagal masuk sebagai guest');
    } finally {
      setGuestLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>

      {/* Main container - landscape & portrait friendly */}
      <div className="relative w-full max-w-md lg:max-w-4xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-0 items-center">
          
          {/* Left side - Logo & Welcome (Hidden on small, shows on landscape) */}
          <div className="hidden lg:flex flex-col justify-center items-center bg-gradient-to-br from-blue-600 to-blue-800 p-12 rounded-l-2xl">
            <div className="text-6xl mb-6">🃏</div>
            <h1 className="text-4xl font-bold text-white mb-4 text-center">BOX</h1>
            <p className="text-blue-100 text-center text-lg">
              Card Game Online
            </p>
            <div className="mt-8 text-blue-200 text-sm text-center">
              <p>🎮 Multiplayer</p>
              <p>📊 Track Score</p>
              <p>🏆 Leaderboard</p>
            </div>
          </div>

          {/* Right side - Login Form */}
          <div className="bg-slate-800 lg:bg-slate-800 p-6 lg:p-12 rounded-2xl lg:rounded-r-2xl lg:rounded-l-none shadow-2xl">
            
            {/* Mobile header */}
            <div className="lg:hidden text-center mb-6">
              <div className="text-5xl mb-3">🃏</div>
              <h1 className="text-3xl font-bold text-white mb-2">BOX Card Game</h1>
              <p className="text-slate-400">Play Online</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <h2 className="text-2xl font-bold text-white mb-6 hidden lg:block">Login</h2>

              {/* Email field */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Email
                </label>
                <div className="relative">
                  <EnvelopeIcon className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                  <input
                    {...register('email', {
                      required: 'Email wajib diisi',
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: 'Email tidak valid'
                      }
                    })}
                    type="email"
                    placeholder="masukkan@email.com"
                    className="w-full pl-10 pr-4 py-2 bg-slate-700 text-white placeholder-slate-400 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition"
                  />
                </div>
                {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
              </div>

              {/* Password field */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <LockClosedIcon className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                  <input
                    {...register('password', {
                      required: 'Password wajib diisi',
                      minLength: {
                        value: 6,
                        message: 'Password minimal 6 karakter'
                      }
                    })}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-12 py-2 bg-slate-700 text-white placeholder-slate-400 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-300"
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
              </div>

              {/* Login button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 disabled:from-slate-600 disabled:to-slate-600 text-white font-bold py-2 px-4 rounded-lg transition duration-300 mt-6"
              >
                {isSubmitting ? 'Login...' : 'Login'}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 pt-2">
                <div className="flex-1 h-px bg-slate-700"></div>
                <span className="text-slate-500 text-xs font-medium">ATAU</span>
                <div className="flex-1 h-px bg-slate-700"></div>
              </div>

              {/* Guest login button */}
              <button
                type="button"
                onClick={handleGuestLogin}
                disabled={guestLoading}
                className="w-full bg-slate-700 hover:bg-slate-600 disabled:bg-slate-700/50 disabled:cursor-not-allowed text-slate-200 font-semibold py-2 px-4 rounded-lg transition duration-300 border border-slate-600 flex items-center justify-center gap-2"
              >
                {guestLoading ? (
                  'Masuk...'
                ) : (
                  <>
                    <span>👤</span> Main sebagai Guest
                  </>
                )}
              </button>
              <p className="text-slate-500 text-xs text-center -mt-1">
                Progress tidak tersimpan permanen, bisa didaftarkan nanti
              </p>

              {/* Signup link */}
              <div className="text-center pt-4 border-t border-slate-700">
                <p className="text-slate-400 text-sm">
                  Belum punya akun?{' '}
                  <Link to="/signup" className="text-blue-400 hover:text-blue-300 font-semibold">
                    Daftar sekarang
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}