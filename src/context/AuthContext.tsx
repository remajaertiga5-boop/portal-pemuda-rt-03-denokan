import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { AuthSession } from "../types";
import { getAuthSession, clearAuthSession } from "../utils/auth";

interface AuthContextType {
  session: AuthSession;
  setSession: (session: AuthSession) => void;
  isGuestExploring: boolean;
  setIsGuestExploring: (explore: boolean) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession>(() => {
    try {
      return getAuthSession();
    } catch {
      return { role: "TAMU", timestamp: Date.now() };
    }
  });

  const [isGuestExploring, setIsGuestExploring] = useState<boolean>(false);

  const logout = () => {
    const cleared = clearAuthSession();
    setSession(cleared);
    setIsGuestExploring(false);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        setSession,
        isGuestExploring,
        setIsGuestExploring,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
