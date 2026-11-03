import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();
const configuredApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
export const API_URL = `${configuredApiUrl.replace(/\/+$/, '').replace(/\/api$/i, '')}/api`;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('hotelpro_user') || 'null');
      if (parsed?.token && parsed?._id) {
        setUser(parsed);
        axios.defaults.headers.common.Authorization = `Bearer ${parsed.token}`;
      } else {
        localStorage.removeItem('hotelpro_user');
      }
    } catch {
      localStorage.removeItem('hotelpro_user');
      delete axios.defaults.headers.common.Authorization;
    }
    setLoading(false);
  }, []);

  const login = (userData) => {
    if (!userData?.token || !userData?._id) throw new Error('Invalid login response');
    localStorage.setItem('hotelpro_user', JSON.stringify(userData));
    axios.defaults.headers.common.Authorization = `Bearer ${userData.token}`;
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('hotelpro_user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const updateUser = (updates) => {
    setUser(current => {
      if (!current) return current;
      const next = { ...current, ...updates };
      localStorage.setItem('hotelpro_user', JSON.stringify(next));
      return next;
    });
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
