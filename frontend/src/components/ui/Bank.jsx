import { useState } from 'react';
import { motion } from 'framer-motion';
import { API } from '../../api-helper';
import { PaymentWidget } from '@payloqa/payment-widget';
import '@payloqa/payment-widget/styles';

export const BankView = ({ user, onUpdateUser }) => {
  const [action, setAction] = useState('deposit');
  const [amount, setAmount] = useState('');
  const [network, setNetwork] = useState('mtn');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('error');
  const [isOpen, setIsOpen] = useState(false);

  const paymentConfig = {
    apiKey: import.meta.env.VITE_PAYMENT_API_KEY,
    platformId: import.meta.env.VITE_PAYMENT_PLATFORM_ID,
    amount: Number(amount),
    network,
    currency: 'GHS',
    primaryColor: '#f0a500',
    displayMode: 'modal',
    redirect_url: import.meta.env.VITE_REDIRECT_URL,
    webhookUrl: import.meta.env.VITE_API_URL + '/payments/webhook',
    orderId: `ORDER-${Date.now()}`,
    metadata: {
      order_reference: `ORD-${Date.now()}`,
      user_id: user?._id,
    },
  };

  const showMessage = (text, type = 'error') => {
    setMessage(text);
    setMessageType(type);
  };

  if (!user) {
    return (
      <div className="bank-view">
        <div className="bank-card">
          <h3>Wallet unavailable</h3>
          <p className="game-subtitle">User data not loaded. Please refresh the page.</p>
        </div>
      </div>
    );
  }

  const handleDeposit = async () => {
    const depositAmount = parseFloat(amount);
    if (!depositAmount || depositAmount <= 0) {
      showMessage('Please enter a valid amount');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      setIsOpen(true);
    } catch (error) {
      console.error('Deposit error:', error);
      showMessage(error.response?.data?.error || 'Failed to initiate deposit');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    const withdrawAmount = parseFloat(amount);
    if (!withdrawAmount || withdrawAmount <= 0) {
      showMessage('Please enter a valid amount');
      return;
    }

    if (withdrawAmount > user.balance) {
      showMessage('Insufficient balance');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const result = await API.requestWithdrawal(withdrawAmount);

      if (result.success) {
        showMessage('Withdrawal request submitted. Awaiting admin approval.', 'success');
        setAmount('');
      }
    } catch (error) {
      console.error('Withdrawal error:', error);
      showMessage(error.response?.data?.error || 'Failed to request withdrawal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="bank-view"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35 }}
    >
      <div className="bank-card bank-card--polished">
        <h3>Your Wallet</h3>
        <p className="game-subtitle">Deposit with Payloqa mobile money. Withdraw anytime.</p>

        <div className="bank-balance">
          <div className="balance-label">Current Balance</div>
          <div className="balance-amount">GHS {user?.balance?.toFixed(2) || '0.00'}</div>
        </div>

        <div className="bank-tabs">
          <button
            type="button"
            className={action === 'deposit' ? 'active' : ''}
            onClick={() => setAction('deposit')}
          >
            Deposit
          </button>
          <button
            type="button"
            className={action === 'withdraw' ? 'active' : ''}
            onClick={() => setAction('withdraw')}
          >
            Withdraw
          </button>
        </div>

        <div className="bank-form">
          {action === 'deposit' && (
            <div className="input-group">
              <label>Mobile Network</label>
              <select value={network} onChange={(e) => setNetwork(e.target.value)}>
                <option value="mtn">MTN Mobile Money</option>
                <option value="vodafone">Vodafone Cash</option>
                <option value="airteltigo">AirtelTigo Money</option>
              </select>
            </div>
          )}

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
            <div className={`bank-message ${messageType}`}>
              {message}
            </div>
          )}

          <button
            type="button"
            className="bank-action-btn"
            onClick={action === 'deposit' ? handleDeposit : handleWithdraw}
            disabled={loading}
          >
            {loading ? 'Processing...' : (action === 'deposit' ? 'Deposit Funds' : 'Request Withdrawal')}
          </button>

          <div className="bank-info">
            {action === 'deposit'
              ? 'Secure payments via Payloqa. MTN, Vodafone, and AirtelTigo supported.'
              : 'Withdrawals are processed after admin approval, typically within 24 hours.'}
          </div>
        </div>

        <PaymentWidget
          config={paymentConfig}
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onSuccess={async (result) => {
            console.log('Payment successful:', result);
            setIsOpen(false);

            try {
              const depositResult = await API.recordDeposit({
                amount: Number(amount),
                network,
                paymentId: result.transactionId || result.id,
                reference: result.reference,
              });

              if (depositResult.success) {
                showMessage('Payment successful. Balance updated.', 'success');
                setAmount('');
                if (onUpdateUser && depositResult.user) {
                  onUpdateUser(depositResult.user);
                }
              }
            } catch (error) {
              console.error('Failed to record deposit:', error);
              showMessage('Payment received but balance update failed. Contact support.');
            }
          }}
        />
      </div>
    </motion.div>
  );
};
