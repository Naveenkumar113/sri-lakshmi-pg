import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('pg_auth_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('pg_auth_token'));
  const [loading, setLoading] = useState(true);

  // Modal prompt state for unauthenticated users clicking "Schedule a Visit" / "Book a Room"
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [authPromptAction, setAuthPromptAction] = useState('Schedule a Visit');
  const [pendingRedirect, setPendingRedirect] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('pg_auth_token');
      if (storedToken) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data);
          localStorage.setItem('pg_auth_user', JSON.stringify(res.data));
        } catch (err) {
          console.warn('Session expired or invalid token');
          localStorage.removeItem('pg_auth_token');
          localStorage.removeItem('pg_auth_user');
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { access_token, user: loggedUser } = res.data;
    localStorage.setItem('pg_auth_token', access_token);
    localStorage.setItem('pg_auth_user', JSON.stringify(loggedUser));
    setToken(access_token);
    setUser(loggedUser);
    setAuthPromptOpen(false);
    return loggedUser;
  };

  const register = async (userData) => {
    const res = await api.post('/auth/register', userData);
    const { access_token, user: newUser } = res.data;
    localStorage.setItem('pg_auth_token', access_token);
    localStorage.setItem('pg_auth_user', JSON.stringify(newUser));
    setToken(access_token);
    setUser(newUser);
    setAuthPromptOpen(false);
    return newUser;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // Ignore
    } finally {
      localStorage.removeItem('pg_auth_token');
      localStorage.removeItem('pg_auth_user');
      setUser(null);
      setToken(null);
    }
  };

  const updateUser = (updated) => {
    setUser(updated);
    localStorage.setItem('pg_auth_user', JSON.stringify(updated));
  };

  const requireAuth = (actionName = 'Schedule a Visit', redirectPath = null) => {
    if (!user) {
      setAuthPromptAction(actionName);
      setPendingRedirect(redirectPath);
      setAuthPromptOpen(true);
      return false;
    }
    return true;
  };

  const closeAuthPrompt = () => {
    setAuthPromptOpen(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'ADMIN',
        login,
        register,
        logout,
        updateUser,
        requireAuth,
        authPromptOpen,
        authPromptAction,
        pendingRedirect,
        closeAuthPrompt,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
