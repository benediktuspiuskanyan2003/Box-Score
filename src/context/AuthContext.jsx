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

  const value = {
    user,
    userProfile,
    loading,
    error,
    signup,
    login,
    logout,
    refreshProfile,
    isAuthenticated: !!user
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