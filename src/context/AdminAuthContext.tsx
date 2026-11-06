import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { adminApi } from '../services/adminApi';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { UserRole } from '../types/admin';

export interface AdminSessionUser {
  id: string;
  email: string;
  display_name?: string;
  role: UserRole;
  is_admin: boolean;
}

interface AdminAuthContextValue {
  adminUser: AdminSessionUser | null;
  token: string | null;
  isLoading: boolean;
  isAccessDenied: boolean;
  errorMessage: string | null;
  loginWithPassword: (email: string, password: string) => Promise<boolean>;
  loginWithMagicLink: (email: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  clearAccessDenied: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [adminUser, setAdminUser] = useState<AdminSessionUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAccessDenied, setIsAccessDenied] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const verifySession = useCallback(async (sessionToken: string) => {
    setIsLoading(true);
    adminApi.setToken(sessionToken);

    try {
      const result = await adminApi.verifyAuth();
      if (result.authenticated && result.is_admin) {
        setAdminUser({
          id: result.user?.id,
          email: result.user?.email,
          display_name: result.user?.display_name || result.user?.email?.split('@')[0],
          role: result.user?.role || 'admin',
          is_admin: true,
        });
        setToken(sessionToken);
        setIsAccessDenied(false);
        setErrorMessage(null);
      } else {
        setIsAccessDenied(true);
        setAdminUser(null);
        setToken(null);
        adminApi.setToken(null);
      }
    } catch (err: any) {
      console.warn('[AdminAuth] Verification check rejected:', err.message);
      if (err.status === 403 || err.is_admin === false) {
        setIsAccessDenied(true);
      } else {
        setErrorMessage(err.message || 'Verification failed');
      }
      setAdminUser(null);
      setToken(null);
      adminApi.setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check saved session and listen to Supabase auth events on load
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      if (supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session && mounted) {
            await verifySession(session.access_token);
            return;
          }
        } catch (e) {
          console.error('[AdminAuth] Error retrieving Supabase session:', e);
        }
      }

      // Check saved token fallback
      const savedToken = adminApi.getToken();
      if (savedToken && mounted) {
        await verifySession(savedToken);
      } else if (mounted) {
        setIsLoading(false);
      }
    }

    initAuth();

    // Subscribe to real-time auth changes
    let subscription: any = null;
    if (supabase) {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          await verifySession(session.access_token);
        } else if (event === 'SIGNED_OUT') {
          setAdminUser(null);
          setToken(null);
          adminApi.setToken(null);
          setIsAccessDenied(false);
          setIsLoading(false);
        }
      });
      subscription = data.subscription;
    }

    return () => {
      mounted = false;
      if (subscription) subscription.unsubscribe();
    };
  }, [verifySession]);

  const loginWithPassword = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setErrorMessage(null);
    setIsAccessDenied(false);

    try {
      if (!supabase) {
        throw new Error('Supabase client is not configured. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.');
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      if (data.session) {
        await verifySession(data.session.access_token);
        return true;
      }
      return false;
    } catch (err: any) {
      if (err.status === 403) {
        setIsAccessDenied(true);
      } else {
        setErrorMessage(err.message || 'Login failed');
      }
      setIsLoading(false);
      return false;
    }
  };

  const loginWithMagicLink = async (email: string): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (!supabase) {
        throw new Error('Supabase client is not configured.');
      }

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      setIsLoading(false);
      return { success: true, message: `Magic sign-in link sent to ${email}. Please check your email inbox.` };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, message: err.message || 'Failed to dispatch magic link' };
    }
  };

  const logout = () => {
    if (supabase) {
      supabase.auth.signOut().catch(() => {});
    }
    setAdminUser(null);
    setToken(null);
    adminApi.setToken(null);
    setIsAccessDenied(false);
    setErrorMessage(null);
  };

  const clearAccessDenied = () => {
    setIsAccessDenied(false);
    logout();
  };

  return (
    <AdminAuthContext.Provider
      value={{
        adminUser,
        token,
        isLoading,
        isAccessDenied,
        errorMessage,
        loginWithPassword,
        loginWithMagicLink,
        logout,
        clearAccessDenied,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};
