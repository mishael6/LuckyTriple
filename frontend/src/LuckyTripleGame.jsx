import React, { useState, useEffect } from 'react';
import { AuthPage } from './components/pages/AuthPage';
import { GamePage } from './components/pages/GamePage';
import { AdminDashboard } from './components/admin/Dashboard';
import { API } from './api-helper';

// ============================================================================
// MAIN APP
// ============================================================================

export default function LuckyTripleGame() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const response = await API.getMe();
        if (response.success) {
          setUser(response.user);
        }
      } catch (error) {
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  };

  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('token');
  };

  const handleUpdateUser = (updatedUser) => {
    setUser(updatedUser);
  };

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  if (!user) {
    return <AuthPage onLogin={handleLogin} />;
  }

  if (user.isAdmin) {
    return <AdminDashboard user={user} onLogout={handleLogout} />;
  }

  return <GamePage user={user} onLogout={handleLogout} onUpdateUser={handleUpdateUser} />;
}