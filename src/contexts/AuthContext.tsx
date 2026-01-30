"use client";

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { User, Role } from '../types/auth';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string; redirectPath?: string }>;
  register: (userData: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    role?: Role;
  }) => Promise<{ success: boolean; message?: string; redirectPath?: string }>;
  logout: () => void;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const userRef = useRef<User | null>(null); // Track user to avoid closure issues

  // Sync ref with state
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Check for existing token on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('auth-token');
    if (storedToken) {
      setToken(storedToken);
      fetchUser(storedToken, true);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async (authToken: string, isInitialLoad = false) => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUser(data.user);
        } else {
          // Token is invalid, clear it only on initial load
          // (to avoid clearing user that was just set from login)
          if (isInitialLoad && !userRef.current) {
            localStorage.removeItem('auth-token');
            setToken(null);
            setUser(null);
          }
        }
      } else {
        // Only clear token on initial load when we don't have a user
        if (isInitialLoad && !userRef.current) {
          localStorage.removeItem('auth-token');
          setToken(null);
          setUser(null);
        }
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      // On errors, don't clear the user if we already have one (from login)
      // Only clear on initial load when we don't have a user yet
      if (isInitialLoad && !userRef.current) {
        // Check if it's a connection error
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('DATABASE_CONNECTION_ERROR') || 
            errorMessage.includes("Can't reach database")) {
          // Database connection error - don't clear user, just log it
          console.warn('Database connection error, but keeping existing user state');
        } else {
          // Other errors - clear on initial load
          localStorage.removeItem('auth-token');
          setToken(null);
          setUser(null);
        }
      } else if (userRef.current) {
        // We have a user, don't clear it even if fetch fails
        console.warn('Failed to refresh user, but keeping existing user state');
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    if (token) {
      await fetchUser(token, false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem('auth-token', data.token);
        return { success: true, redirectPath: data.redirectPath };
      } else {
        return { success: false, message: data.message };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Provide more specific error messages
      if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
        return { success: false, message: 'Network error. Please check your connection and try again.' };
      }
      
      return { success: false, message: 'Login failed. Please try again.' };
    }
  };

  const register = async (userData: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    role?: Role;
  }) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (data.success) {
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem('auth-token', data.token);
        return { success: true };
      } else {
        return { success: false, message: data.message };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: 'Registration failed. Please try again.' };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('auth-token');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      login, 
      register, 
      logout, 
      loading, 
      refreshUser 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
