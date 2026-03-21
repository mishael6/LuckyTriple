import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const ReferralDashboard = ({ referrer, onLogout }) => {
  const [view, setView] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const token = localStorage.getItem('referrerToken');
  const referralLink = `${window.location.origin}/signup?ref=${referrer.referralCode}`;

  useEffect(() => {
    loadData();
  }, [view]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (view === 'overview') {
        await loadStats();
      } else if (view === 'users') {
        await loadUsers();
      } else if (view === 'withdrawals') {
        await loadWithdrawals();
      }
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/referral/stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    if (data.success) setStats(data.stats);
  };

  const loadUsers = async () => {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/referral/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    if (data.success) setUsers(data.users);
  };

  const loadWithdrawals = async () => {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/referral/withdrawals`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    if (data.success) setWithdrawals(data.withdrawals);
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    const amount = parseFloat(withdrawAmount);

    if (amount < 50) {
      alert('Minimum withdrawal is GHS 50');
      return;
    }

    if (amount > referrer.commissionBalance) {
      alert('Insufficient balance');
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/referral/withdraw`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount })
      });

      const data = await response.json();
      if (data.success) {
        alert('Withdrawal request submitted!');
        setWithdrawAmount('');
        setShowWithdrawForm(false);
        loadWithdrawals();
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert('Request failed.');
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="referral-dashboard">
      <nav className="top-nav">
        <div className="nav-left">
          <h2>🔗 Referral Dashboard</h2>
        </div>
        <div className="nav-center">
          <button className={view === 'overview' ? 'active' : ''} onClick={() => setView('overview')}>
            📊 Overview
          </button>
          <button className={view === 'users' ? 'active' : ''} onClick={() => setView('users')}>
            👥 Users
          </button>
          <button className={view === 'withdrawals' ? 'active' : ''} onClick={() => setView('withdrawals')}>
            🏦 Withdrawals
          </button>
        </div>
        <div className="nav-right">
          <div className="balance-display">
            <span className="balance-label">Balance</span>
            <span className="balance-amount">GHS {referrer.commissionBalance?.toFixed(2) || '0.00'}</span>
          </div>
          <button onClick={onLogout} className="logout-btn">Logout</button>
        </div>
      </nav>

      <div className="dashboard-content">
        <AnimatePresence mode="wait">
          {view === 'overview' && stats && (
            <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="referral-link-card">
                <h3>Your Referral Link</h3>
                <div className="link-container">
                  <input type="text" value={referralLink} readOnly />
                  <button onClick={copyLink}>{copiedLink ? '✓ Copied!' : 'Copy Link'}</button>
                </div>
                <p className="referral-code">Code: <strong>{referrer.referralCode}</strong></p>
              </div>

              <div className="stats-grid">
                <div className="stat-card">
                  <h4>Total Referrals</h4>
                  <p className="stat-value">{stats.totalReferrals}</p>
                  <p className="stat-label">Active: {stats.activeReferrals}</p>
                </div>
                <div className="stat-card">
                  <h4>Commission Balance</h4>
                  <p className="stat-value">GHS {stats.commissionBalance.toFixed(2)}</p>
                  <p className="stat-label">Rate: {referrer.commissionRate}%</p>
                </div>
                <div className="stat-card">
                  <h4>Total Earnings</h4>
                  <p className="stat-value">GHS {stats.totalEarnings.toFixed(2)}</p>
                </div>
                <div className="stat-card">
                  <h4>Today's Earnings</h4>
                  <p className="stat-value">GHS {stats.todayEarnings.toFixed(2)}</p>
                </div>
              </div>

              <div className="withdraw-section">
                {!showWithdrawForm ? (
                  <button className="btn-primary" onClick={() => setShowWithdrawForm(true)} disabled={referrer.commissionBalance < 50}>
                    💸 Request Withdrawal
                  </button>
                ) : (
                  <form onSubmit={handleWithdraw} className="withdraw-form">
                    <input type="number" placeholder="Amount (min GHS 50)" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} min="50" step="0.01" required />
                    <button type="submit">Submit</button>
                    <button type="button" onClick={() => setShowWithdrawForm(false)}>Cancel</button>
                  </form>
                )}
              </div>
            </motion.div>
          )}

          {view === 'users' && (
            <motion.div key="users" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h3>Referred Users ({users.length})</h3>
              {loading ? <p>Loading...</p> : users.length === 0 ? <p>No users yet.</p> : (
                <table>
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Joined</th>
                      <th>Wins</th>
                      <th>Win Amount</th>
                      <th>Commission</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => (
                      <tr key={user._id}>
                        <td>{user.email}</td>
                        <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                        <td>{user.totalWins}</td>
                        <td>GHS {user.totalWinAmount?.toFixed(2) || '0.00'}</td>
                        <td>GHS {user.commissionEarned?.toFixed(2) || '0.00'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </motion.div>
          )}

          {view === 'withdrawals' && (
            <motion.div key="withdrawals" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h3>Withdrawal History</h3>
              {loading ? <p>Loading...</p> : withdrawals.length === 0 ? <p>No withdrawals yet.</p> : (
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawals.map(w => (
                      <tr key={w._id}>
                        <td>{new Date(w.createdAt).toLocaleString()}</td>
                        <td>GHS {w.amount.toFixed(2)}</td>
                        <td><span className={`status-badge status-${w.status}`}>{w.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};