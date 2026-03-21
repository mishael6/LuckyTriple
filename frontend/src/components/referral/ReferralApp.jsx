import { useState, useEffect } from 'react';
import { ReferralAuth } from './ReferralAuth';
import { ReferralDashboard } from './ReferralDashboard';

export const ReferralApp = () => {
  const [referrer, setReferrer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('referrerToken');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/referral/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        setReferrer(data.referrer);
      } else {
        localStorage.removeItem('referrerToken');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('referrerToken');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (referrerData) => {
    setReferrer(referrerData);
  };

  const handleLogout = () => {
    localStorage.removeItem('referrerToken');
    setReferrer(null);
  };

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  return referrer ? (
    <ReferralDashboard referrer={referrer} onLogout={handleLogout} />
  ) : (
    <ReferralAuth onLogin={handleLogin} />
  );
};