import React, { createContext, useContext, useEffect, useState } from "react";
import type { Role } from "../types";
import * as authService from "../api/authService";

interface AuthState {
  token: string | null;
  role: Role | null;
  userId: number | null;
  fullName: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem("skagata_token"));
  const [role, setRole] = useState<Role | null>((localStorage.getItem("skagata_role") as Role) || null);
  const [userId, setUserId] = useState<number | null>(() => {
    const raw = localStorage.getItem("skagata_user_id");
    return raw ? Number(raw) : null;
  });
  const [fullName, setFullName] = useState<string | null>(localStorage.getItem("skagata_name"));
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Keep state in sync if the token was set/cleared in another tab.
    const handler = () => {
      setToken(localStorage.getItem("skagata_token"));
      setRole((localStorage.getItem("skagata_role") as Role) || null);
      const raw = localStorage.getItem("skagata_user_id");
      setUserId(raw ? Number(raw) : null);
      setFullName(localStorage.getItem("skagata_name"));
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  useEffect(() => {
    if (token && !userId) {
      authService.fetchMe()
        .then((me) => {
          if (me?.id) {
            localStorage.setItem("skagata_user_id", String(me.id));
            setUserId(me.id);
          }
        })
        .catch(() => {});
    }
  }, [token, userId]);

  async function login(username: string, password: string) {
    setIsLoading(true);
    try {
      const result = await authService.login(username, password);
      localStorage.setItem("skagata_token", result.access_token);
      localStorage.setItem("skagata_role", result.role);
      localStorage.setItem("skagata_name", result.full_name);
      if (result.user_id) {
        localStorage.setItem("skagata_user_id", String(result.user_id));
        setUserId(result.user_id);
      }
      setToken(result.access_token);
      setRole(result.role);
      setFullName(result.full_name);
    } finally {
      setIsLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("skagata_token");
    localStorage.removeItem("skagata_role");
    localStorage.removeItem("skagata_user_id");
    localStorage.removeItem("skagata_name");
    setToken(null);
    setRole(null);
    setUserId(null);
    setFullName(null);
  }

  return (
    <AuthContext.Provider value={{ token, role, userId, fullName, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
