"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { AuthContextType, User, LoginCredentials, SignupCredentials } from "@/types";
import { AuthService } from "@/lib/auth";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing user on mount
    const currentUser = AuthService.getCurrentUser();
    setUser(currentUser);
    setIsLoading(false);
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      const user = await AuthService.login(credentials.username, credentials.password);
      setUser(user);
      AuthService.saveCurrentUser(user, credentials.rememberMe || false);
    } catch (error) {
      throw error;
    }
  };

  const signup = async (credentials: SignupCredentials) => {
    if (credentials.password !== credentials.confirmPassword) {
      throw new Error("Passwords do not match");
    }
    
    try {
      const user = await AuthService.signup(credentials.username, credentials.password, credentials.confirmPassword);
      setUser(user);
      AuthService.saveCurrentUser(user, false);
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    AuthService.clearCurrentUser();
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    signup,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
