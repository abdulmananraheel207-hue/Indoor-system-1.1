import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../api/auth';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = () => {
    try {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');
      const ownerData = localStorage.getItem('owner');
      const adminData = localStorage.getItem('admin');
      const managerData = localStorage.getItem('manager');
      const savedRole = localStorage.getItem('role');

      if (token && savedRole) {
        switch (savedRole) {
          case 'user':
            if (userData) setUser(JSON.parse(userData));
            break;
          case 'owner':
            if (ownerData) setUser(JSON.parse(ownerData));
            break;
          case 'admin':
            if (adminData) setUser(JSON.parse(adminData));
            break;
          case 'manager':
            if (managerData) setUser(JSON.parse(managerData));
            break;
        }
        setRole(savedRole);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (role, userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('role', role);

    switch (role) {
      case 'user':
        localStorage.setItem('user', JSON.stringify(userData));
        break;
      case 'owner':
        localStorage.setItem('owner', JSON.stringify(userData));
        break;
      case 'admin':
        localStorage.setItem('admin', JSON.stringify(userData));
        break;
      case 'manager':
        localStorage.setItem('manager', JSON.stringify(userData));
        break;
    }

    setUser(userData);
    setRole(role);

    // Navigate based on role
    switch (role) {
      case 'user':
        navigate('/user/dashboard');
        break;
      case 'owner':
        navigate('/owner/dashboard');
        break;
      case 'admin':
        navigate('/admin/dashboard');
        break;
      case 'manager':
        navigate('/manager/dashboard');
        break;
    }
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
    setRole(null);
    navigate('/');
  };

  const value = {
    user,
    role,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    checkAuthStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};