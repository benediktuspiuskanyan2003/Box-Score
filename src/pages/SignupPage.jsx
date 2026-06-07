import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { EnvelopeIcon, LockClosedIcon, UserIcon } from '@heroicons/react/24/outline';

export function SignupPage() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const { register, handleSubmit, watch, getValues, formState: { errors, isSubmitting } } = useForm();
  const [showPassword, setShowPassword] = useState(false);
  const [emailSent, setEmailSent] = useState(false); // ✅ state baru
  const password = watch('password');

  const onSubmit = async (data) => {
    try {
      const result = await signup(data.email, data.password, data.displayName);
      
      if (result.needsEmailConfirmation) {
        setEmailSent(true); // ✅ tampilkan pesan cek email, bukan navigate
      } else {
        toast.success('Daftar berhasil!');
        navigate('/login');
      }
    } catch (err) {
      toast.error(err.message || 'Daftar gagal');
    }
  };

  // ✅ Tampilan setelah signup berhasil — menunggu konfirmasi email
  if (emailSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>

        <div className="relative w-full max-w-md bg-slate-800 rounded-2xl shadow-2xl p-10 flex flex-col items-center text-center">
          <div className="text-6xl mb-4">📧</div>
          <h2 className="text-2xl font-bold text-white mb-2">Cek Email Kamu!</h2>
          <p className="text-slate-400 mb-2">
            Link konfirmasi sudah dikirim ke:
          </p>
          <p className="text-emerald-400 font-semibold mb-6">
            {getValues('email')}
          </p>
          <p className="text-slate-400 text-sm mb-8">
            Buka email tersebut dan klik link konfirmasi untuk mengaktifkan akun kamu. Setelah dikonfirmasi, kamu bisa langsung login.
          </p>

          <button
            onClick={() => navigate('/login')}
            className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
          >
            Ke Halaman Login
          </button>

          <p className="text-slate-500 text-xs mt-4">
            Tidak menerima email? Cek folder spam atau{' '}
            <button
              onClick={() => setEmailSent(false)}
              className="text-emerald-400 hover:text-emerald-300 underline"
            >
              daftar ulang
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>

      {/* Main container */}
      <div className="relative w-full max-w-md lg:max-w-4xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-0 items-center">
          
          {/* Left side - Logo & Welcome */}
          <div className="hidden lg:flex flex-col justify-center items-center bg-gradient-to-br from-emerald-600 to-emerald-800 p-12 rounded-l-2xl">
            <div className="text-6xl mb-6">🃏</div>
            <h1 className="text-4xl font-bold text-white mb-4 text-center">BOX</h1>
            <p className="text-emerald-100 text-center text-lg">
              Bergabunglah dengan komunitas pemain kartu
            </p>
            <div className="mt-8 text-emerald-200 text-sm text-center">
              <p>🎮 Main bersama teman</p>
              <p>📊 Kelola grup</p>
              <p>🏆 Kompetisi seru</p>
            </div>
          </div>

          {/* Right side - Signup Form */}
          <div className="bg-slate-800 p-6 lg:p-12 rounded-2xl lg:rounded-r-2xl lg:rounded-l-none shadow-2xl">
            
            {/* Mobile header */}
            <div className="lg:hidden text-center mb-6">
              <div className="text-5xl mb-3">🃏</div>
              <h1 className="text-3xl font-bold text-white mb-2">BOX Card Game</h1>
              <p className="text-slate-400">Buat akun baru</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <h2 className="text-2xl font-bold text-white mb-6 hidden lg:block">Daftar</h2>

              {/* Display name field */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nama Pemain
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                  <input
                    {...register('displayName', {
                      required: 'Nama pemain wajib diisi',
                      minLength: { value: 3, message: 'Nama minimal 3 karakter' }
                    })}
                    type="text"
                    placeholder="Nama pemain Anda"
                    className="w-full pl-10 pr-4 py-2 bg-slate-700 text-white placeholder-slate-400 rounded-lg border border-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition"
                  />
                </div>
                {errors.displayName && <p className="text-red-400 text-xs mt-1">{errors.displayName.message}</p>}
              </div>

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
                      pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Email tidak valid' }
                    })}
                    type="email"
                    placeholder="masukkan@email.com"
                    className="w-full pl-10 pr-4 py-2 bg-slate-700 text-white placeholder-slate-400 rounded-lg border border-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition"
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
                      minLength: { value: 6, message: 'Password minimal 6 karakter' }
                    })}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-12 py-2 bg-slate-700 text-white placeholder-slate-400 rounded-lg border border-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition"
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

              {/* Confirm password field */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Konfirmasi Password
                </label>
                <div className="relative">
                  <LockClosedIcon className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                  <input
                    {...register('confirmPassword', {
                      required: 'Konfirmasi password wajib diisi',
                      validate: (value) => value === password || 'Password tidak cocok'
                    })}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2 bg-slate-700 text-white placeholder-slate-400 rounded-lg border border-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition"
                  />
                </div>
                {errors.confirmPassword && <p className="text-red-400 text-xs mt-1">{errors.confirmPassword.message}</p>}
              </div>

              {/* Signup button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 disabled:from-slate-600 disabled:to-slate-600 text-white font-bold py-2 px-4 rounded-lg transition duration-300 mt-6"
              >
                {isSubmitting ? 'Membuat akun...' : 'Daftar'}
              </button>

              {/* Login link */}
              <div className="text-center pt-4 border-t border-slate-700">
                <p className="text-slate-400 text-sm">
                  Sudah punya akun?{' '}
                  <Link to="/login" className="text-emerald-400 hover:text-emerald-300 font-semibold">
                    Login di sini
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