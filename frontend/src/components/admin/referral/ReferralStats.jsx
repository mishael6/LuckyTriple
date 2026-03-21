import { useState, useEffect } from 'react';
import { API } from '../../../api-helper';

export const ReferralStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const response = await API.getReferralSystemStats();
      if (response.success) {
        setStats(response.stats);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading stats...</div>;
  if (!stats) return <div>No stats available.</div>;

  return (
    <div className="referral-stats">
      <h2>Referral System Overview</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <h4>Total Referrers</h4>
          <p className="stat-value">{stats.totalReferrers}</p>
          <p className="stat-label">
            Approved: {stats.approvedReferrers} | Active: {stats.activeReferrers}
          </p>
        </div>

        <div className="stat-card">
          <h4>Total Referred Users</h4>
          <p className="stat-value">{stats.totalReferred}</p>
          <p className="stat-label">Users signed up via referrals</p>
        </div>

        <div className="stat-card">
          <h4>Total Commissions Paid</h4>
          <p className="stat-value">GHS {stats.totalCommissionsPaid.toFixed(2)}</p>
          <p className="stat-label">All time earnings</p>
        </div>

        <div className="stat-card">
          <h4>Pending Withdrawals</h4>
          <p className="stat-value">{stats.pendingWithdrawalsCount}</p>
          <p className="stat-label">
            Amount: GHS {stats.pendingWithdrawalsAmount?.toFixed(2) || '0.00'}
          </p>
        </div>
      </div>
    </div>
  );
};