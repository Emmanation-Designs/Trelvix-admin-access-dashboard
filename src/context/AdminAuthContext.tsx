import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { adminApi } from '../services/adminApi';
import { supabase } from '../lib/supabase';
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
  logout: () => Promise<void>;
  clearAccessDenied: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [adminUser, setAdminUser] = useState<AdminSessionUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAccessDenied, setIsAccessDenied] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const verifyUserRbac = useCallback(async (sessionUser: any, sessionToken: string): Promise<boolean> => {
    try {
      // Direct Authoritative Database-Level Admin Verification
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, is_admin, role, subscription_status')
        .eq('id', sessionUser.id)
        .single();

      if (profileError || !profile) {
        console.warn('[AdminAuth] Unable to verify user profile:', profileError?.message);
        await supabase.auth.signOut().catch(() => {});
        setIsAccessDenied(true);
        setAdminUser(null);
        setToken(null);
        adminApi.setToken(null);
        return false;
      }

      // Strict RBAC Enforcement
      if (!profile.is_admin || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
        console.warn('[AdminAuth] Access Denied: User is not an admin.');
        await supabase.auth.signOut().catch(() => {});
        setIsAccessDenied(true);
        setAdminUser(null);
        setToken(null);
        adminApi.setToken(null);
        return false;
      }

      setAdminUser({
        id: sessionUser.id,
        email: profile.email || sessionUser.email,
        display_name: (profile as any)?.display_name || sessionUser.user_metadata?.full_name || sessionUser.user_metadata?.name || sessionUser.email?.split('@')[0],
        role: profile.role,
        is_admin: true,
      });
      setToken(sessionToken);
      adminApi.setToken(sessionToken);
      setIsAccessDenied(false);
      setErrorMessage(null);
      return true;
    } catch (err: any) {
      console.error('[AdminAuth] RBAC verification exception:', err);
      setIsAccessDenied(true);
      setAdminUser(null);
      setToken(null);
      adminApi.setToken(null);
      return false;
    }
  }, []);

  // Check saved session and listen to Supabase auth events on load
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (session && session.user && mounted) {
          await verifyUserRbac(session.user, session.access_token);
        }
      } catch (e) {
        console.error('[AdminAuth] Error retrieving Supabase session:', e);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    initAuth();

    // Subscribe to real-time auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        await verifyUserRbac(session.user, session.access_token);
      } else if (event === 'SIGNED_OUT') {
        setAdminUser(null);
        setToken(null);
        adminApi.setToken(null);
        setIsAccessDenied(false);
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [verifyUserRbac]);

  const loginWithPassword = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setErrorMessage(null);
    setIsAccessDenied(false);

    try {
      // 1. Direct Supabase Client Login
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !authData.user) {
        throw new Error(authError?.message || 'Invalid email or password');
      }

      // 2. Authoritative Database-Level Admin Verification
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, is_admin, role, subscription_status')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        throw new Error('Unable to verify user profile in database.');
      }

      // 3. Strict RBAC Enforcement
      if (!profile.is_admin || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
        await supabase.auth.signOut();
        throw new Error('Access Denied: Administrative privileges required.');
      }

      // 4. Session State Update
      const sessionToken = authData.session?.access_token || '';
      adminApi.setToken(sessionToken);
      setToken(sessionToken);
      setAdminUser({
        id: authData.user.id,
        email: profile.email || authData.user.email || email,
        display_name: (profile as any)?.display_name || authData.user.user_metadata?.full_name || authData.user.user_metadata?.name || email.split('@')[0],
        role: profile.role,
        is_admin: true,
      });
      setIsAccessDenied(false);
      setErrorMessage(null);
      setIsLoading(false);
      return true;
    } catch (err: any) {
      console.warn('[AdminAuth] Direct Supabase login failed:', err.message);
      if (err.message?.includes('Access Denied')) {
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
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      setIsLoading(false);
      return { success: true, message: `Magic sign-in link dispatched to ${email}. Please check your email inbox.` };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, message: err.message || 'Failed to dispatch magic link.' };
    }
  };

  const logout = async () => {
    setAdminUser(null);
    setToken(null);
    adminApi.setToken(null);
    localStorage.removeItem('trelvix_admin_token');
    setIsAccessDenied(false);
    setErrorMessage(null);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('[AdminAuth] Error signing out of Supabase:', err);
    }
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
