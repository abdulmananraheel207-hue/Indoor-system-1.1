import React, { createContext, useState, useContext, useEffect } from "react";

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null);

  useEffect(() => {
    // Check if user is logged in on app load
    const token = localStorage.getItem("token");
    const savedUser =
      localStorage.getItem("user") ||
      localStorage.getItem("owner") ||
      localStorage.getItem("admin") ||
      localStorage.getItem("manager");
    const savedRole = localStorage.getItem("role");

    if (token && savedUser && savedRole) {
      setUser(JSON.parse(savedUser));
      setRole(savedRole);
    }

    setLoading(false);
  }, []);

  const login = (userData, token, role) => {
    localStorage.setItem("token", token);
    localStorage.setItem("role", role);
    localStorage.setItem(role, JSON.stringify(userData));
    setUser(userData);
    setRole(role);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    localStorage.removeItem("owner");
    localStorage.removeItem("admin");
    localStorage.removeItem("manager");
    setUser(null);
    setRole(null);
  };

  const value = {
    user,
    role,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
