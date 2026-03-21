import { useState, useEffect } from 'react';
import { API } from '../../../api-helper';

export const ReferrerManagement = () => {
  const [referrers, setReferrers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, approved, inactive

  useEffect(() => {
    loadReferrers();
  }, []);

  const loadReferrers = async () => {
    setLoading(true);
    try {
      const response = await API.getReferrers();
      if (response.success) {
        setReferrers(response.referrers);
      }
    } catch (error) {
      console.error('Failed to load referrers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (referrerId) => {
    if (!confirm('Approve this referrer account?')) return;

    try {
      const response = await API.approveReferrer(referrerId);
      if (response.success) {
        alert('Referrer approved! They will receive an SMS notification.');
        loadReferrers();
      }
    } catch (error) {
      alert('Failed to approve referrer');
    }
  };

  const handleUpdateCommission = async (referrerId, currentRate) => {
    const newRate = prompt(`Enter new commission rate (current: ${currentRate}%):`, currentRate);
    if (!newRate || newRate === currentRate.toString()) return;

    try {
      const response = await API.updateReferrer(referrerId, { commissionRate: parseFloat(newRate) });
      if (response.success) {
        alert('Commission rate updated!');
        loadReferrers();
      }
    } catch (error) {
      alert('Failed to update commission rate');
    }
  };

  const handleToggleActive = async (referrerId, currentStatus) => {
    const action = currentStatus ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${action} this referrer?`)) return;

    try {
      const response = await API.updateReferrer(referrerId, { isActive: !currentStatus });
      if (response.success) {
        alert(`Referrer ${action}d!`);
        loadReferrers();
      }
    } catch (error) {
      alert(`Failed to ${action} referrer`);
    }
  };

  const filteredReferrers = referrers.filter(ref => {
    if (filter === 'pending') return !ref.isApproved;
    if (filter === 'approved') return ref.isApproved && ref.isActive;
    if (filter === 'inactive') return !ref.isActive;
    return true;
  });

  if (loading) return <div>Loading referrers...</div>;

  return (
    <div className="referrer-management">
      <div className="section-header">
        <h2>Referrer Management ({referrers.length})</h2>
        <div className="filter-buttons">
          <button 
            className={filter === 'all' ? 'active' : ''} 
            onClick={() => setFilter('all')}
          >
            All ({referrers.length})
          </button>
          <button 
            className={filter === 'pending' ? 'active' : ''} 
            onClick={() => setFilter('pending')}
          >
            Pending ({referrers.filter(r => !r.isApproved).length})
          </button>
          <button 
            className={filter === 'approved' ? 'active' : ''} 
            onClick={() => setFilter('approved')}
          >
            Approved ({referrers.filter(r => r.isApproved && r.isActive).length})
          </button>
          <button 
            className={filter === 'inactive' ? 'active' : ''} 
            onClick={() => setFilter('inactive')}
          >
            Inactive ({referrers.filter(r => !r.isActive).length})
          </button>
        </div>
      </div>

      {filteredReferrers.length === 0 ? (
        <p>No referrers found.</p>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Code</th>
                <th>Referrals</th>
                <th>Commission</th>
                <th>Balance</th>
                <th>Total Earned</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReferrers.map(ref => (
                <tr key={ref._id}>
                  <td>{ref.name}</td>
                  <td>{ref.email}</td>
                  <td><strong>{ref.referralCode}</strong></td>
                  <td>{ref.stats?.totalReferrals || 0}</td>
                  <td>{ref.commissionRate}%</td>
                  <td>GHS {ref.commissionBalance.toFixed(2)}</td>
                  <td>GHS {ref.totalEarnings.toFixed(2)}</td>
                  <td>
                    {!ref.isApproved ? (
                      <span className="status-badge status-pending">Pending</span>
                    ) : !ref.isActive ? (
                      <span className="status-badge status-rejected">Inactive</span>
                    ) : (
                      <span className="status-badge status-approved">Active</span>
                    )}
                  </td>
                  <td>
                    <div className="action-buttons">
                      {!ref.isApproved && (
                        <button 
                          className="btn-small btn-approve"
                          onClick={() => handleApprove(ref._id)}
                        >
                          ✓ Approve
                        </button>
                      )}
                      {ref.isApproved && (
                        <>
                          <button 
                            className="btn-small"
                            onClick={() => handleUpdateCommission(ref._id, ref.commissionRate)}
                          >
                            📊 Rate
                          </button>
                          <button 
                            className="btn-small"
                            onClick={() => handleToggleActive(ref._id, ref.isActive)}
                          >
                            {ref.isActive ? '🔒 Deactivate' : '🔓 Activate'}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};