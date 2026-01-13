"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

type UserContextType = {
  currentUser: string | null;
  setCurrentUser: (user: string) => void;
  clearUser: () => void;
  isIdentified: boolean;
  isLoading: boolean;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUserState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar usuario del localStorage al montar
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedUser = localStorage.getItem("farmacia-user");
      if (savedUser) {
        setCurrentUserState(savedUser);
      }
      setIsLoading(false);
    }
  }, []);

  const setCurrentUser = useCallback((user: string) => {
    const trimmedUser = user.trim();
    if (trimmedUser) {
      setCurrentUserState(trimmedUser);
      if (typeof window !== "undefined") {
        localStorage.setItem("farmacia-user", trimmedUser);
      }
    }
  }, []);

  const clearUser = useCallback(() => {
    setCurrentUserState(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("farmacia-user");
    }
  }, []);

  return (
    <UserContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        clearUser,
        isIdentified: currentUser !== null,
        isLoading,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser debe usarse dentro de UserProvider");
  }
  return context;
}
