import { useState } from 'react';
import { motion } from 'framer-motion';
import { API } from '../../api-helper';

const NETWORKS = [
  { id: 'mtn', label: 'MTN Mobile Money' },
  { id: 'vodafone', label: 'Telecel Cash' },
  { id: 'airteltigo', label: 'AirtelTigo Money' },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const BankView = ({ user, onUpdateUser }) => {
  const [action, setAction] = useState('deposit');
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState(user?.phone || '');
  const [network, setNetwork] = useState('mtn');
  const [otpCode, setOtpCode] = useState('');
  const [paymentId, setPaymentId] = useState(null);
  const [depositStep, setDepositStep] = useState('form');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('error');

  const showMessage = (text, type = 'error') => {
    setMessage(text);
    setMessageType(type);
  };

  const resetDepositFlow = () => {
    setPaymentId(null);
    setOtpCode('');
    setDepositStep('form');
  };

  const waitForPaymentCompletion = async (activePaymentId) => {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const statusResult = await API.getPaymentStatus(activePaymentId);

      if (!statusResult.success) {
        throw new Error(statusResult.error || 'Could not check payment status');
      }

      const status = statusResult.payment?.status;

      if (status === 'completed') {
        return statusResult.payment;
      }

      if (status === 'failed' || status === 'cancelled' || status === 'expired') {
        throw new Error(`Payment ${status}. Please try again.`);
      }

      await sleep(2000);
    }

    throw new Error('Payment is taking longer than expected. Check your MoMo app or try again.');
  };

  const handleDeposit = async () => {
    const depositAmount = parseFloat(amount);
    if (!depositAmount || depositAmount <= 0) {
      showMessage('Please enter a valid amount');
      return;
    }

    if (!phone?.trim()) {
      showMessage('Enter your mobile money phone number (e.g. 024XXXXXXX)');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const result = await API.initiatePayment(depositAmount, phone.trim(), network);

      if (!result.success) {
        showMessage(result.error || 'Failed to start payment');
        return;
      }

      setPaymentId(result.paymentId);
      setDepositStep('otp');
      showMessage(result.message || 'OTP sent to your phone. Enter it below.', 'success');
    } catch (error) {
      console.error('Deposit initiate error:', error);
      showMessage(error.response?.data?.error || 'Failed to start payment');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!paymentId) {
      showMessage('Start a new deposit first');
      return;
    }

    if (!otpCode.trim() || otpCode.trim().length < 4) {
      showMessage('Enter the OTP sent to your phone');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const verifyResult = await API.verifyPaymentOtp(paymentId, phone.trim(), otpCode.trim());

      if (!verifyResult.success) {
        showMessage(verifyResult.error || 'OTP verification failed');
        return;
      }

      setDepositStep('processing');
      showMessage('OTP verified. Approve the payment prompt on your phone...', 'success');

      const payment = await waitForPaymentCompletion(paymentId);
      const depositAmount = Number(payment.amount) || parseFloat(amount);

      const depositResult = await API.recordDeposit({
        amount: depositAmount,
        paymentId: payment.payment_id || paymentId,
        reference: payment.reference || paymentId,
        network: payment.network || network,
      });

      if (depositResult.success) {
        showMessage('Payment successful. Balance updated.', 'success');
        setAmount('');
        resetDepositFlow();
        if (onUpdateUser && depositResult.user) {
          onUpdateUser(depositResult.user);
        }
      }
    } catch (error) {
      console.error('Deposit verify error:', error);
      showMessage(error.response?.data?.error || error.message || 'Payment failed');
      setDepositStep('otp');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!paymentId) return;

    setLoading(true);
    setMessage('');

    try {
      const result = await API.resendPaymentOtp(paymentId, phone.trim());
      showMessage(result.message || 'OTP resent to your phone', result.success ? 'success' : 'error');
    } catch (error) {
      showMessage(error.response?.data?.error || 'Failed to resend OTP');
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
      const result = await API.requestWithdrawal(withdrawAmount, phone.trim() || user.phone, network);

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
            onClick={() => {
              setAction('deposit');
              resetDepositFlow();
              setMessage('');
            }}
          >
            Deposit
          </button>
          <button
            type="button"
            className={action === 'withdraw' ? 'active' : ''}
            onClick={() => {
              setAction('withdraw');
              resetDepositFlow();
              setMessage('');
            }}
          >
            Withdraw
          </button>
        </div>

        <div className="bank-form">
          {action === 'deposit' && depositStep === 'otp' && (
            <div className="deposit-otp-panel">
              <h4>Enter Payment OTP</h4>
              <p>
                Payloqa sent a code to <strong>{phone}</strong>. Enter it below, then approve the
                mobile money prompt on your phone.
              </p>
              <div className="input-group">
                <label>OTP Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter OTP"
                  maxLength={6}
                />
              </div>
              <div className="deposit-otp-actions">
                <button
                  type="button"
                  className="bank-action-btn"
                  onClick={handleVerifyOtp}
                  disabled={loading}
                >
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </button>
                <button
                  type="button"
                  className="bank-secondary-btn"
                  onClick={handleResendOtp}
                  disabled={loading}
                >
                  Resend OTP
                </button>
                <button
                  type="button"
                  className="bank-secondary-btn"
                  onClick={resetDepositFlow}
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {action === 'deposit' && depositStep === 'processing' && (
            <div className="deposit-otp-panel">
              <h4>Processing Payment</h4>
              <p>Check your phone and approve the MoMo payment prompt. This may take a moment...</p>
            </div>
          )}

          {(depositStep === 'form' || action === 'withdraw') && (
            <>
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

              <div className="input-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="024XXXXXXX"
                />
              </div>

              <div className="input-group">
                <label>Network</label>
                <div className="bank-network-picker">
                  {NETWORKS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={network === item.id ? 'active' : ''}
                      onClick={() => setNetwork(item.id)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {message && (
            <div className={`bank-message ${messageType}`}>
              {message}
            </div>
          )}

          {depositStep === 'form' && (
            <button
              type="button"
              className="bank-action-btn"
              onClick={action === 'deposit' ? handleDeposit : handleWithdraw}
              disabled={loading}
            >
              {loading ? 'Processing...' : (action === 'deposit' ? 'Deposit Funds' : 'Request Withdrawal')}
            </button>
          )}

          <div className="bank-info">
            {action === 'deposit'
              ? 'Payments go through Payloqa via our secure server. Use the phone number linked to your MoMo wallet.'
              : 'Withdrawals are processed after admin approval, typically within 24 hours.'}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
