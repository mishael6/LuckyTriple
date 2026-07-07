import { useState } from 'react';
import { motion } from 'framer-motion';
import { API } from '../../api-helper';
import { PaymentWidget } from '@payloqa/payment-widget';
import '@payloqa/payment-widget/dist/payment-widget.css';

const isHttpsUrl = (url) => {
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
};

export const BankView = ({ user, onUpdateUser }) => {
  const [action, setAction] = useState('deposit');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('error');
  const [isOpen, setIsOpen] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState(null);

  const showMessage = (text, type = 'error') => {
    setMessage(text);
    setMessageType(type);
  };

  const closePaymentWidget = () => {
    setIsOpen(false);
    setPaymentConfig(null);
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

  const handleDeposit = () => {
    const depositAmount = parseFloat(amount);
    if (!depositAmount || depositAmount <= 0) {
      showMessage('Please enter a valid amount');
      return;
    }

    const apiKey = import.meta.env.VITE_PAYMENT_API_KEY;
    const platformId = import.meta.env.VITE_PAYMENT_PLATFORM_ID;
    const redirectUrl = import.meta.env.VITE_REDIRECT_URL;
    const webhookUrl = `${import.meta.env.VITE_API_URL}/payments/webhook`;

    if (!apiKey || !platformId) {
      showMessage('Payment is not configured. Please contact support.');
      return;
    }

    if (!redirectUrl || !isHttpsUrl(redirectUrl)) {
      showMessage('Payment redirect URL must be a valid HTTPS address.');
      return;
    }

    if (!webhookUrl.startsWith('https://')) {
      showMessage('Payment webhook URL must use HTTPS.');
      return;
    }

    setMessage('');
    setPaymentConfig({
      apiKey,
      platformId,
      amount: depositAmount,
      currency: 'GHS',
      primaryColor: '#f0a500',
      displayMode: 'modal',
      redirect_url: redirectUrl,
      webhookUrl,
      orderId: `ORDER-${Date.now()}`,
      metadata: {
        order_reference: `ORD-${Date.now()}`,
        user_id: user._id,
      },
      onSuccess: async (result) => {
        closePaymentWidget();

        try {
          const depositResult = await API.recordDeposit({
            amount: depositAmount,
            paymentId: result.payment_id,
            reference: result.reference || result.payment_id,
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
      },
      onError: (error) => {
        closePaymentWidget();
        showMessage(error?.message || 'Payment failed. Please try again.');
      },
    });
    setIsOpen(true);
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
      const result = await API.requestWithdrawal(withdrawAmount, user.phone, 'mtn');

      if (result.success) {
        showMessage('Withdrawal request submitted. Awaiting admin approval.', 'success');
        setAmount('');
        if (onUpdateUser && result.user) {
          onUpdateUser(result.user);
        }
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
            disabled={loading || (action === 'deposit' && isOpen)}
          >
            {loading ? 'Processing...' : (action === 'deposit' ? 'Deposit Funds' : 'Request Withdrawal')}
          </button>

          <div className="bank-info">
            {action === 'deposit'
              ? 'Secure payments via Payloqa. You will choose your network and phone number in the payment window.'
              : 'Withdrawals are processed after admin approval, typically within 24 hours.'}
          </div>
        </div>
      </div>

      {paymentConfig && (
        <PaymentWidget
          config={paymentConfig}
          isOpen={isOpen}
          onClose={closePaymentWidget}
        />
      )}
    </motion.div>
  );
};
