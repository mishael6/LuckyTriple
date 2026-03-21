import { useState, useEffect } from 'react';
import { API } from '../../../api-helper';

export const ReferrerWithdrawals = () => {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  useEffect(() => {
    loadWithdrawals();
  }, []);

  const loadWithdrawals = async () => {
    setLoading(true);
    try {
      const response = await API.getReferrerWithdrawals();
      if (response.success) {
        setWithdrawals(response.withdrawals);
      }
    } catch (error) {
      console.error('Failed to load withdrawals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (withdrawalId) => {
    if (!confirm('Approve this withdrawal? This will deduct the amount from referrer balance.')) return;

    try {
      const response = await API.approveReferrerWithdrawal(withdrawalId);
      if (response.success) {
        alert('Withdrawal approved! Referrer will receive SMS notification.');
        loadWithdrawals();
      } else {
        alert(response.error || 'Failed to approve withdrawal');
      }
    } catch (error) {
      alert('Failed to approve withdrawal');
    }
  };

  const handleReject = async (withdrawalId) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    try {
      const response = await API.rejectReferrerWithdrawal(withdrawalId, reason);
      if (response.success) {
        alert('Withdrawal rejected! Referrer will receive SMS notification.');
        loadWithdrawals();
      }
    } catch (error) {
      alert('Failed to reject withdrawal');
    }
  };

  const filteredWithdrawals = withdrawals.filter(w => {
    if (filter === 'pending') return w.status === 'pending';
    if (filter === 'approved') return w.status === 'approved';
    if (filter === 'rejected') return w.status === 'rejected';
    return true;
  });

  if (loading) return <div>Loading withdrawals...</div>;

  return (
    <div className="referrer-withdrawals">
      <div className="section-header">
        <h2>Referrer Withdrawals ({withdrawals.length})</h2>
        <div className="filter-buttons">
          <button 
            className={filter === 'pending' ? 'active' : ''} 
            onClick={() => setFilter('pending')}
          >
            Pending ({withdrawals.filter(w => w.status === 'pending').length})
          </button>
          <button 
            className={filter === 'approved' ? 'active' : ''} 
            onClick={() => setFilter('approved')}
          >
            Approved ({withdrawals.filter(w => w.status === 'approved').length})
          </button>
          <button 
            className={filter === 'rejected' ? 'active' : ''} 
            onClick={() => setFilter('rejected')}
          >
            Rejected ({withdrawals.filter(w => w.status === 'rejected').length})
          </button>
          <button 
            className={filter === 'all' ? 'active' : ''} 
            onClick={() => setFilter('all')}
          >
            All ({withdrawals.length})
          </button>
        </div>
      </div>

      {filteredWithdrawals.length === 0 ? (
        <p>No {filter} withdrawals.</p>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Referrer</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Amount</th>
                <th>Reference</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredWithdrawals.map(w => (
                <tr key={w._id}>
                  <td>{new Date(w.createdAt).toLocaleString()}</td>
                  <td>{w.referrerId?.name || 'N/A'}</td>
                  <td>{w.referrerId?.email || 'N/A'}</td>
                  <td>{w.referrerId?.phone || 'N/A'}</td>
                  <td><strong>GHS {w.amount.toFixed(2)}</strong></td>
                  <td><small>{w.reference}</small></td>
                  <td>
                    <span className={`status-badge status-${w.status}`}>
                      {w.status}
                    </span>
                  </td>
                  <td>
                    {w.status === 'pending' ? (
                      <div className="action-buttons">
                        <button 
                          className="btn-small btn-approve"
                          onClick={() => handleApprove(w._id)}
                        >
                          ✓ Approve
                        </button>
                        <button 
                          className="btn-small btn-reject"
                          onClick={() => handleReject(w._id)}
                        >
                          ✗ Reject
                        </button>
                      </div>
                    ) : (
                      <small>
                        {w.processedAt && `Processed: ${new Date(w.processedAt).toLocaleDateString()}`}
                        {w.rejectionReason && <div>Reason: {w.rejectionReason}</div>}
                      </small>
                    )}
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