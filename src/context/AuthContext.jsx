import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    let timeoutId;

    timeoutId = setTimeout(() => {
      if (isMounted) {
        console.warn('Auth initialization timeout - setting loading to false');
        setLoading(false);
      }
    }, 10000);

    const initializeAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session check error:', sessionError);
          if (isMounted) setLoading(false);
          clearTimeout(timeoutId);
          return;
        }

        if (session?.user && isMounted) {
          setUser(session.user);
          try {
            const { data: profile, error: err } = await supabase
              .from('users')
              .select('*')
              .eq('auth_id', session.user.id)
              .single();
            
            if (err) {
              console.warn('Profile fetch error:', err.message);
              if (isMounted) setUserProfile(null);
            } else if (profile && isMounted) {
              setUserProfile(profile);
            }
          } catch (err) {
            console.error('Error fetching profile:', err);
            if (isMounted) setUserProfile(null);
          }
        } else {
          if (isMounted) {
            setUser(null);
            setUserProfile(null);
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        if (isMounted) {
          setUser(null);
          setUserProfile(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          clearTimeout(timeoutId);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email || 'no user');
        
        if (session?.user) {
          if (isMounted) setUser(session.user);
        } else {
          if (isMounted) {
            setUser(null);
            setUserProfile(null);
          }
        }
      }
    );

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      subscription?.unsubscribe();
    };
  }, []);

  // ✅ Signup — insert ke DB ditangani trigger Supabase
const signup = async (email, password, displayName) => {
  try {
    setError(null);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName }
      }
    });

    if (authError) throw authError;

    // Email sudah terdaftar sebelumnya
    if (authData.user?.identities?.length === 0) {
      throw new Error('Email sudah terdaftar. Silakan login.');
    }

    // ✅ Return info apakah perlu konfirmasi email
    return {
      user: authData.user,
      needsEmailConfirmation: !authData.session
    };

  } catch (err) {
    const errorMsg = err.message || 'Signup gagal';
    setError(errorMsg);
    throw err;
  }
};

  // Login
  const login = async (email, password) => {
    try {
      setError(null);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      return data.user;
    } catch (err) {
      const errorMsg = err.message || 'Login gagal';
      setError(errorMsg);
      throw err;
    }
  };

  // ✅ Login sebagai Guest — anonymous sign-in, profil dibuat otomatis
  // lewat trigger handle_new_user() (sudah di-update untuk handle email null)
  const loginAsGuest = async () => {
    try {
      setError(null);
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;

      // Beri sedikit delay supaya trigger handle_new_user() selesai
      // insert row ke public.users sebelum kita fetch profile-nya.
      // onAuthStateChange akan set `user`, tapi userProfile butuh fetch manual
      // karena initializeAuth hanya jalan sekali di awal mount.
      if (data.user) {
        const profile = await fetchProfileWithRetry(data.user.id);
        if (profile) setUserProfile(profile);
      }

      return data.user;
    } catch (err) {
      const errorMsg = err.message || 'Gagal masuk sebagai guest';
      setError(errorMsg);
      throw err;
    }
  };

  // Helper: fetch profile dengan retry, karena trigger INSERT
  // mungkin butuh sedikit waktu untuk commit setelah signInAnonymously resolve.
  const fetchProfileWithRetry = async (authId, attempts = 3, delayMs = 400) => {
    for (let i = 0; i < attempts; i++) {
      const { data: profile, error: err } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', authId)
        .single();

      if (profile && !err) return profile;
      if (i < attempts - 1) await new Promise(res => setTimeout(res, delayMs));
    }
    console.warn('fetchProfileWithRetry: profile belum tersedia setelah beberapa percobaan');
    return null;
  };

  // ✅ Upgrade akun Guest → akun permanen (email + password)
  // Memakai supabase.auth.updateUser, yang akan mengubah baris auth.users
  // yang SAMA (auth_id tetap sama), sehingga semua data game/room/score
  // yang sudah terhubung ke auth_id ini tetap utuh — tidak ada migrasi data.
  const upgradeGuestAccount = async (email, password, displayName) => {
    try {
      setError(null);

      if (!user) throw new Error('Tidak ada sesi guest yang aktif');

      const { data, error: updateError } = await supabase.auth.updateUser({
        email,
        password,
        data: { display_name: displayName }
      });

      if (updateError) throw updateError;

      // Update juga row di public.users — trigger handle_new_user()
      // TIDAK terpanggil lagi di sini (itu hanya untuk INSERT baru),
      // jadi email & display_name perlu di-update manual.
      const { error: profileError } = await supabase
        .from('users')
        .update({ email, display_name: displayName })
        .eq('auth_id', user.id);

      if (profileError) throw profileError;

      await refreshProfile();

      return data.user;
    } catch (err) {
      const errorMsg = err.message || 'Gagal upgrade akun';
      setError(errorMsg);
      throw err;
    }
  };

  // Logout
  const logout = async () => {
    try {
      setError(null);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Refresh profile (fetch latest data from DB)
  const refreshProfile = async () => {
    if (!user) return;
    try {
      const { data: profile, error: err } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', user.id)
        .single();
      
      if (err) {
        console.error('Error refreshing profile:', err);
      } else if (profile) {
        setUserProfile(profile);
      }
    } catch (err) {
      console.error('Refresh profile error:', err);
    }
  };

  // ✅ Helper: apakah user saat ini adalah guest (anonymous)
  // Supabase menandai anonymous user lewat field `is_anonymous` di auth user object.
  const isGuest = !!user?.is_anonymous;

  const value = {
    user,
    userProfile,
    loading,
    error,
    signup,
    login,
    loginAsGuest,
    upgradeGuestAccount,
    logout,
    refreshProfile,
    isAuthenticated: !!user,
    isGuest
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth harus digunakan dalam AuthProvider');
  }
  return context;
}