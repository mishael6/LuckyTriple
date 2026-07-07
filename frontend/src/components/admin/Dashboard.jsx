import { useState, useEffect } from 'react';
import { API } from '../../api-helper';
import { ReferrerManagement } from './referral/ReferrerManagement';
import { ReferrerWithdrawals } from './referral/ReferrerWithdrawals';
import { ReferralStats } from './referral/ReferralStats';
import { AdminGameSettings } from './AdminGameSettings';

// ============================================================================
// ADMIN DASHBOARD
// ============================================================================

const NETWORK_LABELS = {
  mtn: 'MTN',
  vodafone: 'Telecel',
  airteltigo: 'AirtelTigo',
};

export const AdminDashboard = ({ user, onLogout }) => {
  const [view, setView] = useState('stats');
  const [users, setUsers] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [gameSettings, setGameSettings] = useState(null);
  const [stats, setStats] = useState(null);
  const [smsLogs, setSmsLogs] = useState([]);
  const [spinHistory, setSpinHistory] = useState([]);
  const [slotsHistory, setSlotsHistory] = useState([]);
  const [rouletteHistory, setRouletteHistory] = useState([]);
  const [coinHistory, setCoinHistory] = useState([]);
  const [diceHistory, setDiceHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [wipingDatabase, setWipingDatabase] = useState(false);

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
      } else if (view === 'slots-history') {
        const response = await API.getAdminSlotsHistory();
        if (response.success) setSlotsHistory(response.history);
      } else if (view === 'roulette-history') {
        const response = await API.getAdminRouletteHistory();
        if (response.success) setRouletteHistory(response.history);
      } else if (view === 'coin-history') {
        const response = await API.getAdminCoinHistory();
        if (response.success) setCoinHistory(response.history);
      } else if (view === 'dice-history') {
        const response = await API.getAdminDiceHistory();
        if (response.success) setDiceHistory(response.history);
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

  const handleWipeDatabase = async () => {
    const confirmed = window.confirm(
      '⚠️ DANGER: This will permanently delete ALL users, transactions, game history, SMS logs, and referral data.\n\nAdmin accounts will be kept. Game settings will be kept.\n\nAre you sure you want to continue?'
    );

    if (!confirmed) return;

    const confirmation = prompt('Type DELETE ALL DATA to confirm this action:');
    if (confirmation !== 'DELETE ALL DATA') {
      alert('Wipe cancelled. Confirmation text did not match.');
      return;
    }

    setWipingDatabase(true);
    try {
      const result = await API.wipeDatabase('DELETE ALL DATA');
      alert(`${result.message}\n\nDeleted:\n- Users: ${result.deleted.users}\n- Transactions: ${result.deleted.transactions}\n- Game rounds: ${result.deleted.gameHistory + result.deleted.spinHistory + result.deleted.slotsHistory + result.deleted.rouletteHistory + result.deleted.coinHistory + result.deleted.diceHistory}`);
      loadData();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to wipe database');
    } finally {
      setWipingDatabase(false);
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
            🍾 Spin
          </button>
          <button
            className={view === 'slots-history' ? 'active' : ''}
            onClick={() => setView('slots-history')}
          >
            🎰 Slots
          </button>
          <button className={view === 'roulette-history' ? 'active' : ''} onClick={() => setView('roulette-history')}>🎡 Roulette</button>
          <button className={view === 'coin-history' ? 'active' : ''} onClick={() => setView('coin-history')}>🪙 Coin</button>
          <button className={view === 'dice-history' ? 'active' : ''} onClick={() => setView('dice-history')}>🎲 Dice</button>
          <button
            className={view === 'settings' ? 'active' : ''}
            onClick={() => setView('settings')}
          >
            ⚙️ Game Control
          </button>
          <button onClick={() => setView('referral-stats')}>📊 Referral Stats</button>
          <button onClick={() => setView('referrers')}>👥 Referrers</button>
          <button onClick={() => setView('referrer-withdrawals')}>💸 Referrer Withdrawals</button>
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

            <div className="admin-danger-zone">
              <h4>Danger Zone</h4>
              <p>
                Permanently delete all database records except admin accounts.
                This removes users, balances, transactions, game history, SMS logs, and referral data.
                Game settings are preserved.
              </p>
              <button
                type="button"
                className="admin-btn-wipe"
                onClick={handleWipeDatabase}
                disabled={wipingDatabase}
              >
                {wipingDatabase ? 'Wiping database...' : '🗑️ Delete All Data (Keep Admins)'}
              </button>
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
                    <th>Payout Phone</th>
                    <th>Network</th>
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
                      <td>{w.paymentDetails?.phone || w.userId?.phone || 'N/A'}</td>
                      <td>{NETWORK_LABELS[w.paymentDetails?.network] || w.paymentDetails?.network || 'N/A'}</td>
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

        {view === 'slots-history' && (
          <div className="admin-section">
            <h3>🎰 Lucky Slots History</h3>
            <div className="withdrawals-table">
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Bet</th>
                    <th>Reels</th>
                    <th>Tier</th>
                    <th>Multiplier</th>
                    <th>Result</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {slotsHistory.map((h) => (
                    <tr key={h._id}>
                      <td>{h.userId?.email || 'Unknown'}</td>
                      <td>GHS {h.betAmount.toFixed(2)}</td>
                      <td>{(h.reels || []).join(' ')}</td>
                      <td>{h.winTier}</td>
                      <td>{h.multiplier}x</td>
                      <td>
                        <span className={`status-badge ${h.won ? 'completed' : 'rejected'}`}>
                          {h.won ? `+GHS ${h.profit.toFixed(2)}` : `-GHS ${Math.abs(h.profit).toFixed(2)}`}
                        </span>
                      </td>
                      <td>{new Date(h.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {view === 'roulette-history' && (
          <div className="admin-section">
            <h3>🎡 Golden Roulette History</h3>
            <div className="withdrawals-table">
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Bet</th>
                    <th>Pick</th>
                    <th>Multiplier</th>
                    <th>Outcome</th>
                    <th>Result</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {rouletteHistory.map((h) => (
                    <tr key={h._id}>
                      <td>{h.userId?.email || 'Unknown'}</td>
                      <td>GHS {h.betAmount.toFixed(2)}</td>
                      <td>{h.choice || h.betType}</td>
                      <td>x{h.multiplier}</td>
                      <td>{h.outcome || h.spinColor}</td>
                      <td>
                        <span className={`status-badge ${h.won ? 'completed' : 'rejected'}`}>
                          {h.won ? `+GHS ${h.profit.toFixed(2)}` : `-GHS ${Math.abs(h.profit).toFixed(2)}`}
                        </span>
                      </td>
                      <td>{new Date(h.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {view === 'coin-history' && (
          <div className="admin-section">
            <h3>🪙 Coin Flip History</h3>
            <div className="withdrawals-table">
              <table>
                <thead>
                  <tr><th>User</th><th>Bet</th><th>Pick</th><th>Mult</th><th>Outcome</th><th>Result</th><th>Date</th></tr>
                </thead>
                <tbody>
                  {coinHistory.map((h) => (
                    <tr key={h._id}>
                      <td>{h.userId?.email || 'Unknown'}</td>
                      <td>GHS {h.betAmount.toFixed(2)}</td>
                      <td>{h.choice}</td>
                      <td>x{h.multiplier}</td>
                      <td>{h.outcome}</td>
                      <td><span className={`status-badge ${h.won ? 'completed' : 'rejected'}`}>{h.won ? `+GHS ${h.profit.toFixed(2)}` : `-GHS ${Math.abs(h.profit).toFixed(2)}`}</span></td>
                      <td>{new Date(h.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {view === 'dice-history' && (
          <div className="admin-section">
            <h3>🎲 Dice Duel History</h3>
            <div className="withdrawals-table">
              <table>
                <thead>
                  <tr><th>User</th><th>Bet</th><th>Pick</th><th>Mult</th><th>Roll</th><th>Outcome</th><th>Result</th><th>Date</th></tr>
                </thead>
                <tbody>
                  {diceHistory.map((h) => (
                    <tr key={h._id}>
                      <td>{h.userId?.email || 'Unknown'}</td>
                      <td>GHS {h.betAmount.toFixed(2)}</td>
                      <td>{h.choice}</td>
                      <td>x{h.multiplier}</td>
                      <td>{h.diceRoll}</td>
                      <td>{h.outcome}</td>
                      <td><span className={`status-badge ${h.won ? 'completed' : 'rejected'}`}>{h.won ? `+GHS ${h.profit.toFixed(2)}` : `-GHS ${Math.abs(h.profit).toFixed(2)}`}</span></td>
                      <td>{new Date(h.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {view === 'settings' && gameSettings && (
          <div className="admin-section">
            <h3>🎛️ Game Control Center</h3>
            <p className="admin-section-desc">Control difficulty, win rates, payouts, and enable/disable every game.</p>
            <AdminGameSettings
              gameSettings={gameSettings}
              setGameSettings={setGameSettings}
              onSave={handleUpdateSettings}
            />
          </div>
        )}
        {view === 'referral-stats' && <ReferralStats />}
        {view === 'referrers' && <ReferrerManagement />}
        {view === 'referrer-withdrawals' && <ReferrerWithdrawals />}
      </div>
    </div>
  );
};