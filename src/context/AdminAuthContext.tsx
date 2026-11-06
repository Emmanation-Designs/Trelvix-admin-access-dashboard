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
      // Primary: Route via relative /api/admin/auth/login to avoid unresolved client-side DNS domains
      const result = await adminApi.loginWithPassword(email, password);

      if (result.authenticated && result.token) {
        setToken(result.token);
        adminApi.setToken(result.token);
        setAdminUser({
          id: result.user?.id,
          email: result.user?.email,
          display_name: result.user?.display_name || result.user?.email?.split('@')[0],
          role: result.user?.role || 'admin',
          is_admin: true,
        });
        setIsAccessDenied(false);
        setErrorMessage(null);
        setIsLoading(false);
        return true;
      }
      setIsLoading(false);
      return false;
    } catch (err: any) {
      console.warn('[AdminAuth] Login failed:', err.message);
      if (err.status === 403 || err.is_admin === false) {
        setIsAccessDenied(true);
      } else {
        setErrorMessage(err.message || 'Authentication failed. Please check your admin credentials.');
      }
      setIsLoading(false);
      return false;
    }
  };

  const loginWithMagicLink = async (email: string): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Route via relative /api/admin/auth/magic-link
      const res = await adminApi.loginWithMagicLink(email);
      setIsLoading(false);
      return res;
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, message: err.message || 'Failed to dispatch magic link.' };
    }
  };

  const logout = () => {
    setAdminUser(null);
    setToken(null);
    adminApi.setToken(null);
    localStorage.removeItem('trelvix_admin_token');
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
