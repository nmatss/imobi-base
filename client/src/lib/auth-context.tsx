import React from "react";
// @ts-nocheck
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useLocation } from "wouter";

// ==================== TYPES ====================

export type User = {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: string;
  avatar: string | null;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
};

// ==================== CONTEXT ====================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ==================== PROVIDER ====================

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();

  /**
   * Verifica autenticação do usuário
   */
  const checkAuth = useCallback(async () => {
    let mounted = true;

    try {
      const res = await fetch("/api/auth/me", {
        credentials: "include",
      });

      if (!mounted) return;

      if (res.ok) {
        const data = await res.json();
        if (mounted) {
          setUser(data.user);
        }
      } else if (res.status === 401) {
        if (mounted) {
          setUser(null);
        }
      }
    } catch (error) {
      console.error("Auth check failed:", error);
    } finally {
      if (mounted) {
        setLoading(false);
      }
    }

    return () => {
      mounted = false;
    };
  }, []);

  /**
   * Realiza login do usuário
   */
  async function login(email: string, password: string) {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Login failed");
    }

    const data = await res.json();
    setUser(data.user);
    setLocation("/dashboard");
  }

  /**
   * Realiza logout do usuário
   */
  async function logout() {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    setUser(null);
    setLocation("/login");
  }

  // Verifica auth na montagem do componente
  useEffect(() => {
    const cleanup = checkAuth();
    return () => {
      if (cleanup instanceof Promise) {
        cleanup.then((fn) => fn && fn());
      }
    };
  }, [checkAuth]);

  const value = {
    user,
    loading,
    login,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ==================== HOOK ====================

/**
 * Hook para acessar o contexto de autenticação
 * @throws Error se usado fora do AuthProvider
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
