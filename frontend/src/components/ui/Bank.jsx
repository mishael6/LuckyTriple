import { useState } from 'react';
import { motion } from 'framer-motion';
import { API } from '../../api-helper';
import { PaymentWidget } from '@payloqa/payment-widget';
import '@payloqa/payment-widget/styles';



// ============================================================================
// BANK VIEW
// ============================================================================

export const BankView = ({ user, onUpdateUser }) => {
  const [action, setAction] = useState('deposit');
  const [amount, setAmount] = useState('');
  const [network, setNetwork] = useState('mtn');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [isOpen, setIsOpen] = useState(false);

  const paymentConfig = {
    apiKey: import.meta.env.VITE_PAYMENT_API_KEY,
    platformId: import.meta.env.VITE_PAYMENT_PLATFORM_ID,
    amount: Number(amount),
    network: network,
    currency: 'GHS',
    primaryColor: '#f0a500',
    displayMode: 'modal', // or 'inline'
    redirect_url: import.meta.env.VITE_REDIRECT_URL,
    webhookUrl: import.meta.env.VITE_API_URL + '/payments/webhook',
    orderId: 'ORDER-12345',
    metadata: {
      order_reference: 'ORD-12345',
      user_id: user?._id
    }
  };

  if (!user) {
    return (
      <div className="bank-view">
        <div className="bank-card">
          <h3>❌ Error</h3>
          <p>User data not loaded. Please refresh the page.</p>
        </div>
      </div>
    );
  }

  const handleDeposit = async () => {
  const depositAmount = parseFloat(amount);
  if (!depositAmount || depositAmount <= 0) {
    setMessage('Please enter a valid amount');
    return;
  }

  setLoading(true);
  setMessage('');

  try {
    setIsOpen(true);
  } catch (error) {
    console.error('Deposit error:', error);
    setMessage(error.response?.data?.error || '❌ Failed to initiate deposit');
  } finally {
    setLoading(false);
  }
};

  const handleWithdraw = async () => {
    const withdrawAmount = parseFloat(amount);
    if (!withdrawAmount || withdrawAmount <= 0) {
      setMessage('Please enter a valid amount');
      return;
    }

    if (withdrawAmount > user.balance) {
      setMessage('Insufficient balance');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const result = await API.requestWithdrawal(withdrawAmount);
      
      if (result.success) {
        setMessage('✅ Withdrawal request submitted! Waiting for admin approval.');
        setAmount('');
      }
    } catch (error) {
      console.error('Withdrawal error:', error);
      setMessage(error.response?.data?.error || 'Failed to request withdrawal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      className="bank-view"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="bank-card">
        <h3>💰 Your Bank</h3>
        
        <div className="bank-balance">
          <div className="balance-label">Current Balance</div>
          <div className="balance-amount">GHS {user?.balance?.toFixed(2) || '0.00'}</div>
        </div>

        <div className="bank-tabs">
          <button 
            className={action === 'deposit' ? 'active' : ''}
            onClick={() => setAction('deposit')}
          >
            💳 Deposit
          </button>
          <button 
            className={action === 'withdraw' ? 'active' : ''}
            onClick={() => setAction('withdraw')}
          >
            💸 Withdraw
          </button>
        </div>

        <div className="bank-form">
          <div className="input-group">
            <label>Amount (GHS)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              min="1"
              step="0.01"
            />
          </div>

          {message && (
            <div className={`bank-message ${message.includes('✅') || message.includes('success') ? 'success' : 'error'}`}>
              {message}
            </div>
          )}

          <button 
            className="bank-action-btn"
            onClick={action === 'deposit' ? handleDeposit : handleWithdraw}
            disabled={loading}
          >
            {loading ? 'Processing...' : (action === 'deposit' ? 'Deposit Funds' : 'Request Withdrawal')}
          </button>

          {action === 'deposit' && (
            <div className="bank-info">
              💳 TEST MODE: Payments auto-complete (no real money)
            </div>
          )}

          {action === 'withdraw' && (
            <div className="bank-info">
              ⏳ Withdrawals require admin approval.
            </div>
          )}
        </div>
      <PaymentWidget
      config={paymentConfig}
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      onSuccess={(result) => {
        console.log('Payment successful:', result);
        setIsOpen(false);
      }}
    />
      </div>
    </motion.div>
  );
};