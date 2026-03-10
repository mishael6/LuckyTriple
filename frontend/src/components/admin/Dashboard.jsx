import { useState, useEffect } from 'react';
import { API } from '../../api-helper';

// ============================================================================
// ADMIN DASHBOARD
// ============================================================================

export const AdminDashboard = ({ user, onLogout }) => {
  const [view, setView] = useState('stats');
  const [users, setUsers] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [gameSettings, setGameSettings] = useState(null);
  const [stats, setStats] = useState(null);
  const [smsLogs, setSmsLogs] = useState([]);
  const [spinHistory, setSpinHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  // SMS State
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [smsMessage, setSmsMessage] = useState('');
  const [sendingToAll, setSendingToAll] = useState(false);

  useEffect(() => {
    loadData();
  }, [view]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (view === 'users') {
        const response = await API.getAllUsers();
        if (response.success) setUsers(response.users);
      } else if (view === 'withdrawals') {
        const response = await API.getAllWithdrawals();
        if (response.success) setWithdrawals(response.withdrawals);
      } else if (view === 'settings') {
        const response = await API.getGameSettings();
        if (response.success) setGameSettings(response.settings);
      } else if (view === 'stats') {
        const response = await API.getDashboardStats();
        if (response.success) setStats(response.stats);
      } else if (view === 'sms') {
        const [usersRes, logsRes] = await Promise.all([
          API.getAllUsers(),
          API.getSMSLogs()
        ]);
        if (usersRes.success) setUsers(usersRes.users);
        if (logsRes.success) setSmsLogs(logsRes.logs);
      } else if (view === 'spin-history') {
        const response = await API.getAdminSpinHistory();
        if (response.success) setSpinHistory(response.history);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreditUser = async (userId) => {
    const amount = parseFloat(prompt('Enter credit amount:'));
    const reason = prompt('Reason (optional):');

    if (amount && amount > 0) {
      try {
        await API.creditUser(userId, amount, reason);
        alert('User credited successfully!');
        loadData();
      } catch (error) {
        alert(error.response?.data?.error || 'Failed to credit user');
      }
    }
  };

  const handleToggleBlock = async (userId) => {
    if (window.confirm('Are you sure you want to toggle the block status for this user?')) {
      try {
        const res = await API.toggleBlockUser(userId);
        alert(res.message);
        loadData();
      } catch (error) {
        alert(error.response?.data?.error || 'Failed to toggle block status');
      }
    }
  };

  const handleRemoveUser = async (userId) => {
    if (window.confirm('⚠️ WARNING: This will permanently delete this user and all their game/transaction history. Are you absolutely sure?')) {
      try {
        const res = await API.removeUser(userId);
        alert(res.message);
        loadData();
      } catch (error) {
        alert(error.response?.data?.error || 'Failed to delete user');
      }
    }
  };

  const handleApproveWithdrawal = async (transactionId) => {
    if (window.confirm('Approve this withdrawal?')) {
      try {
        await API.approveWithdrawal(transactionId);
        alert('Withdrawal approved! User will receive SMS notification.');
        loadData();
      } catch (error) {
        alert(error.response?.data?.error || 'Failed to approve withdrawal');
      }
    }
  };

  const handleRejectWithdrawal = async (transactionId) => {
    const reason = prompt('Rejection reason (optional):');
    try {
      await API.rejectWithdrawal(transactionId, reason);
      alert('Withdrawal rejected. User will receive SMS notification.');
      loadData();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to reject withdrawal');
    }
  };

  const handleUpdateSettings = async () => {
    try {
      await API.updateGameSettings(gameSettings);
      alert('Settings updated successfully!');
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to update settings');
    }
  };

  const handleSendSMS = async () => {
    if (!smsMessage) {
      alert('Please enter a message');
      return;
    }

    if (sendingToAll) {
      if (!window.confirm(`Send SMS to ALL ${users.length} users?`)) return;

      try {
        await API.sendSMSToAll(smsMessage);
        alert('SMS sent to all users!');
        setSmsMessage('');
        loadData();
      } catch (error) {
        alert(error.response?.data?.error || 'Failed to send SMS');
      }
    } else {
      if (selectedUsers.length === 0) {
        alert('Please select users');
        return;
      }

      try {
        await API.sendSMS(selectedUsers, smsMessage);
        alert(`SMS sent to ${selectedUsers.length} users!`);
        setSmsMessage('');
        setSelectedUsers([]);
        loadData();
      } catch (error) {
        alert(error.response?.data?.error || 'Failed to send SMS');
      }
    }
  };

  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <div className="admin-container">
      <nav className="admin-nav">
        <h2>👑 Admin Dashboard</h2>
        <div className="admin-nav-buttons">
          <button
            className={view === 'stats' ? 'active' : ''}
            onClick={() => setView('stats')}
          >
            📊 Stats
          </button>
          <button
            className={view === 'users' ? 'active' : ''}
            onClick={() => setView('users')}
          >
            👥 Users
          </button>
          <button
            className={view === 'withdrawals' ? 'active' : ''}
            onClick={() => setView('withdrawals')}
          >
            💸 Withdrawals
          </button>
          <button
            className={view === 'sms' ? 'active' : ''}
            onClick={() => setView('sms')}
          >
            📱 SMS
          </button>
          <button
            className={view === 'spin-history' ? 'active' : ''}
            onClick={() => setView('spin-history')}
          >
            🍾 Spin History
          </button>
          <button
            className={view === 'settings' ? 'active' : ''}
            onClick={() => setView('settings')}
          >
            ⚙️ Settings
          </button>
          <button onClick={onLogout} className="logout-btn">Logout</button>
        </div>
      </nav>

      <div className="admin-content">
        {loading && <div className="loading">Loading...</div>}

        {view === 'stats' && stats && (
          <div className="admin-section">
            <h3>Dashboard Statistics</h3>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">👥</div>
                <div className="stat-value">{stats.totalUsers}</div>
                <div className="stat-label">Total Users</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">💰</div>
                <div className="stat-value">GHS {stats.totalBalance.toFixed(2)}</div>
                <div className="stat-label">Total Balance</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">💳</div>
                <div className="stat-value">GHS {stats.totalDeposits.toFixed(2)}</div>
                <div className="stat-label">Total Deposits</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">💸</div>
                <div className="stat-value">GHS {stats.totalWithdrawals.toFixed(2)}</div>
                <div className="stat-label">Total Withdrawals</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🎰</div>
                <div className="stat-value">GHS {stats.totalBets.toFixed(2)}</div>
                <div className="stat-label">Total Bets</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🏆</div>
                <div className="stat-value">GHS {stats.totalWins.toFixed(2)}</div>
                <div className="stat-label">Total Wins</div>
              </div>
              <div className="stat-card highlight">
                <div className="stat-icon">📈</div>
                <div className="stat-value">GHS {stats.houseProfit.toFixed(2)}</div>
                <div className="stat-label">House Profit</div>
              </div>
              <div className="stat-card warning">
                <div className="stat-icon">⏳</div>
                <div className="stat-value">{stats.pendingWithdrawals}</div>
                <div className="stat-label">Pending Withdrawals</div>
              </div>
            </div>
          </div>
        )}

        {view === 'users' && (
          <div className="admin-section">
            <h3>Registered Users ({users.length})</h3>
            <div className="users-table">
              <table>
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Balance</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u._id} className={u.isBlocked ? 'blocked-user-row' : ''}>
                      <td>
                        {u.email}
                        {u.isBlocked && <span title="Blocked User" style={{ marginLeft: '8px' }}>🚫</span>}
                      </td>
                      <td>{u.phone}</td>
                      <td>GHS {u.balance.toFixed(2)}</td>
                      <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td>
                        <button
                          className="admin-btn-small"
                          onClick={() => handleCreditUser(u._id)}
                        >
                          💰 Credit
                        </button>
                        <button
                          className="admin-btn-small"
                          onClick={() => handleToggleBlock(u._id)}
                          style={{ marginLeft: '5px', backgroundColor: u.isBlocked ? '#4CAF50' : '#f44336' }}
                        >
                          {u.isBlocked ? '✅ Unblock' : '🚫 Block'}
                        </button>
                        <button
                          className="admin-btn-small"
                          onClick={() => handleRemoveUser(u._id)}
                          style={{ marginLeft: '5px', backgroundColor: '#d32f2f' }}
                        >
                          🗑️ Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {view === 'withdrawals' && (
          <div className="admin-section">
            <h3>Withdrawal Requests</h3>
            <div className="withdrawals-table">
              <table>
                <thead>
                  <tr>
                    <th>User Email</th>
                    <th>Phone</th>
                    <th>Amount</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map(w => (
                    <tr key={w._id}>
                      <td>{w.userId?.email || 'Unknown'}</td>
                      <td>{w.userId?.phone || 'N/A'}</td>
                      <td>GHS {w.amount.toFixed(2)}</td>
                      <td>{new Date(w.createdAt).toLocaleDateString()}</td>
                      <td>
                        <span className={`status-badge ${w.status}`}>
                          {w.status}
                        </span>
                      </td>
                      <td>
                        {w.status === 'pending' && (
                          <>
                            <button
                              className="admin-btn-approve"
                              onClick={() => handleApproveWithdrawal(w._id)}
                            >
                              ✓ Approve
                            </button>
                            <button
                              className="admin-btn-reject"
                              onClick={() => handleRejectWithdrawal(w._id)}
                            >
                              ✗ Reject
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {view === 'sms' && (
          <div className="admin-section">
            <h3>📱 Send SMS Notifications</h3>

            <div className="sms-send-section">
              <div className="sms-options">
                <label>
                  <input
                    type="radio"
                    checked={!sendingToAll}
                    onChange={() => setSendingToAll(false)}
                  />
                  Send to Selected Users
                </label>
                <label>
                  <input
                    type="radio"
                    checked={sendingToAll}
                    onChange={() => setSendingToAll(true)}
                  />
                  Send to All Users ({users.length})
                </label>
              </div>

              {!sendingToAll && (
                <div className="user-selection">
                  <h4>Select Users:</h4>
                  <div className="user-checkboxes">
                    {users.map(u => (
                      <label key={u._id} className="user-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(u._id)}
                          onChange={() => toggleUserSelection(u._id)}
                        />
                        {u.email} ({u.phone})
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="sms-compose">
                <label>Message:</label>
                <textarea
                  value={smsMessage}
                  onChange={(e) => setSmsMessage(e.target.value)}
                  placeholder="Type your message here..."
                  rows="5"
                />
                <button className="send-sms-btn" onClick={handleSendSMS}>
                  📤 Send SMS {sendingToAll ? `to All (${users.length})` : `to Selected (${selectedUsers.length})`}
                </button>
              </div>
            </div>

            <div className="sms-logs-section">
              <h4>SMS History</h4>
              <div className="sms-logs">
                {smsLogs.map(log => (
                  <div key={log._id} className={`sms-log-item ${log.status}`}>
                    <div className="sms-log-header">
                      <span className="sms-status">{log.status}</span>
                      <span className="sms-date">{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="sms-recipients">
                      To: {log.phones.length} recipient(s)
                    </div>
                    <div className="sms-message">{log.message}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {view === 'spin-history' && (
          <div className="admin-section">
            <h3>Spin the Bottle History</h3>
            <div className="withdrawals-table">
              <table>
                <thead>
                  <tr>
                    <th>User Email</th>
                    <th>Bet Amount</th>
                    <th>Multiplier</th>
                    <th>Prediction</th>
                    <th>Outcome</th>
                    <th>Date</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {spinHistory.map(h => (
                    <tr key={h._id}>
                      <td>{h.userId?.email || 'Unknown'}</td>
                      <td>GHS {h.betAmount.toFixed(2)}</td>
                      <td>x{h.multiplier}</td>
                      <td>{h.direction.toUpperCase()}</td>
                      <td>{h.outcome.toUpperCase()}</td>
                      <td>{new Date(h.createdAt).toLocaleDateString()} {new Date(h.createdAt).toLocaleTimeString()}</td>
                      <td>
                        <span className={`status-badge ${h.won ? 'completed' : 'rejected'}`}>
                          {h.won ? `+GHS ${h.profit.toFixed(2)}` : `-GHS ${Math.abs(h.profit).toFixed(2)}`}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {view === 'settings' && gameSettings && (
          <div className="admin-section">
            <h3>Game Settings</h3>
            <div className="settings-form">
              <div className="setting-item">
                <label>House Fee (%)</label>
                <input
                  type="number"
                  value={gameSettings.houseFee}
                  onChange={(e) => setGameSettings({ ...gameSettings, houseFee: parseInt(e.target.value) })}
                />
              </div>
              <div className="setting-item">
                <label>Maximum Bet (GHS)</label>
                <input
                  type="number"
                  value={gameSettings.maxBet}
                  onChange={(e) => setGameSettings({ ...gameSettings, maxBet: parseInt(e.target.value) })}
                />
              </div>
              <div className="setting-item">
                <label>Minimum Bet (GHS)</label>
                <input
                  type="number"
                  value={gameSettings.minBet}
                  onChange={(e) => setGameSettings({ ...gameSettings, minBet: parseInt(e.target.value) })}
                />
              </div>
              <h4>Payout Multipliers</h4>
              <div className="setting-item">
                <label>3 Matches Multiplier</label>
                <input
                  type="number"
                  value={gameSettings.payoutMultipliers.threeMatches}
                  onChange={(e) => setGameSettings({
                    ...gameSettings,
                    payoutMultipliers: { ...gameSettings.payoutMultipliers, threeMatches: parseInt(e.target.value) }
                  })}
                />
              </div>
              <div className="setting-item">
                <label>2 Matches Multiplier</label>
                <input
                  type="number"
                  value={gameSettings.payoutMultipliers.twoMatches}
                  onChange={(e) => setGameSettings({
                    ...gameSettings,
                    payoutMultipliers: { ...gameSettings.payoutMultipliers, twoMatches: parseInt(e.target.value) }
                  })}
                />
              </div>
              <div className="setting-item">
                <label>1 Match Multiplier</label>
                <input
                  type="number"
                  value={gameSettings.payoutMultipliers.oneMatch}
                  onChange={(e) => setGameSettings({
                    ...gameSettings,
                    payoutMultipliers: { ...gameSettings.payoutMultipliers, oneMatch: parseInt(e.target.value) }
                  })}
                />
              </div>

              <h4>Spin the Bottle Win Chances</h4>
              <div className="setting-item">
                <label>x2 Multiplier Win %</label>
                <input
                  type="number"
                  value={gameSettings.spinWinChances?.x2 || 45}
                  onChange={(e) => setGameSettings({
                    ...gameSettings,
                    spinWinChances: { ...gameSettings.spinWinChances, x2: parseInt(e.target.value) }
                  })}
                />
              </div>
              <div className="setting-item">
                <label>x3 Multiplier Win %</label>
                <input
                  type="number"
                  value={gameSettings.spinWinChances?.x3 || 30}
                  onChange={(e) => setGameSettings({
                    ...gameSettings,
                    spinWinChances: { ...gameSettings.spinWinChances, x3: parseInt(e.target.value) }
                  })}
                />
              </div>
              <div className="setting-item">
                <label>x4 Multiplier Win %</label>
                <input
                  type="number"
                  value={gameSettings.spinWinChances?.x4 || 20}
                  onChange={(e) => setGameSettings({
                    ...gameSettings,
                    spinWinChances: { ...gameSettings.spinWinChances, x4: parseInt(e.target.value) }
                  })}
                />
              </div>

              <button className="save-settings-btn" onClick={handleUpdateSettings}>
                Save Settings
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};