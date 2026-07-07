import { useState, useEffect } from 'react';
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

const NETWORK_OPTIONS = [
  { value: 'mtn', label: 'MTN Mobile Money' },
  { value: 'vodafone', label: 'Telecel Cash' },
  { value: 'airteltigo', label: 'AirtelTigo Money' },
];

export const BankView = ({ user, onUpdateUser }) => {
  const [action, setAction] = useState('deposit');
  const [phone, setPhone] = useState(user?.phone || '');
  const [network, setNetwork] = useState('mtn');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('error');
  const [isOpen, setIsOpen] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState(null);

  useEffect(() => {
    if (user?.phone) {
      setPhone(user.phone);
    }
  }, [user?.phone]);

  const showMessage = (text, type = 'error') => {
    setMessage(text);
    setMessageType(type);
  };

  const closePaymentWidget = () => {
    setIsOpen(false);
    setPaymentConfig(null);
  };

  useEffect(() => {
    if (!isOpen) return undefined;

    document.body.classList.add('payment-widget-open');
    return () => document.body.classList.remove('payment-widget-open');
  }, [isOpen]);

  const validatePhone = () => {
    if (!phone.trim()) {
      showMessage('Please enter your mobile money phone number');
      return false;
    }
    return true;
  };

  const saveWalletPhone = async () => {
    const result = await API.updateWalletPhone(phone, network);
    if (result.user && onUpdateUser) {
      onUpdateUser(result.user);
    }
    return result;
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

    if (!validatePhone()) return;

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

    setLoading(true);
    setMessage('');

    try {
      await saveWalletPhone();

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
          phone,
          network,
        },
        onSuccess: async (result) => {
          closePaymentWidget();

          try {
            const depositResult = await API.recordDeposit({
              amount: depositAmount,
              network,
              phone,
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
    } catch (error) {
      console.error('Deposit setup error:', error);
      showMessage(error.response?.data?.error || 'Failed to prepare deposit');
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

    if (!validatePhone()) return;

    if (withdrawAmount > user.balance) {
      showMessage('Insufficient balance');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const result = await API.requestWithdrawal(withdrawAmount, phone, network);

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

  const paymentWidget = paymentConfig ? (
    <PaymentWidget
      config={paymentConfig}
      isOpen={isOpen}
      onClose={closePaymentWidget}
    />
  ) : null;

  return (
    <>
      <motion.div
        className={`bank-view${isOpen ? ' bank-view--payment-open' : ''}`}
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
            <label>Mobile Money Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="024XXXXXXX or +233XXXXXXXXX"
              autoComplete="tel"
            />
          </div>

          <div className="input-group">
            <label>Mobile Network</label>
            <div className="bank-network-picker" role="group" aria-label="Mobile network">
              {NETWORK_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={network === option.value ? 'active' : ''}
                  onClick={() => setNetwork(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

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
              ? 'Enter your phone number and network here first, then complete payment in the Payloqa window.'
              : 'Your phone number and network will be sent to admin for withdrawal processing.'}
          </div>
        </div>
      </div>
      </motion.div>
      {paymentWidget}
    </>
  );
};
