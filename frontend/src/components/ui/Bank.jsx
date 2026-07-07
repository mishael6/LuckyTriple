import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { API } from '../../api-helper';

const NETWORK_OPTIONS = [
  { value: 'mtn', label: 'MTN Mobile Money' },
  { value: 'vodafone', label: 'Telecel Cash' },
  { value: 'airteltigo', label: 'AirtelTigo Money' },
];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const BankView = ({ user, onUpdateUser }) => {
  const [action, setAction] = useState('deposit');
  const [phone, setPhone] = useState(user?.phone || '');
  const [network, setNetwork] = useState('mtn');
  const [amount, setAmount] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [paymentId, setPaymentId] = useState('');
  const [depositStep, setDepositStep] = useState('form');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('error');

  useEffect(() => {
    if (user?.phone) {
      setPhone(user.phone);
    }
  }, [user?.phone]);

  const showMessage = (text, type = 'error') => {
    setMessage(text);
    setMessageType(type);
  };

  const resetDepositFlow = () => {
    setDepositStep('form');
    setPaymentId('');
    setOtpCode('');
  };

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

  const pollPaymentCompletion = async (activePaymentId) => {
    for (let attempt = 0; attempt < 15; attempt += 1) {
      const statusResult = await API.getPaymentStatus(activePaymentId);
      const status = statusResult.payment?.status;

      if (status === 'completed') {
        return statusResult.payment;
      }

      if (status === 'failed' || status === 'cancelled' || status === 'expired') {
        throw new Error(`Payment ${status}`);
      }

      await wait(2000);
    }

    throw new Error('Payment is still processing. Please check your balance shortly.');
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

    setLoading(true);
    setMessage('');

    try {
      await saveWalletPhone();

      const result = await API.initiatePayment(depositAmount, phone, network);
      if (!result.success || !result.paymentId) {
        showMessage(result.error || 'Failed to start payment');
        return;
      }

      setPaymentId(result.paymentId);
      setDepositStep('otp');
      setOtpCode('');
      showMessage(result.message || 'OTP sent to your phone. Enter it below.', 'success');
    } catch (error) {
      console.error('Deposit error:', error);
      showMessage(error.response?.data?.error || 'Failed to initiate deposit');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!paymentId) {
      showMessage('Payment session expired. Please start again.');
      resetDepositFlow();
      return;
    }

    if (!otpCode.trim() || otpCode.trim().length < 4) {
      showMessage('Enter the OTP code sent to your phone');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const verifyResult = await API.verifyPaymentOtp(paymentId, phone, otpCode.trim());
      if (!verifyResult.success) {
        showMessage(verifyResult.error || 'Invalid OTP code');
        return;
      }

      setDepositStep('processing');
      showMessage('OTP verified. Completing payment...', 'success');

      const payment = await pollPaymentCompletion(paymentId);
      const depositAmount = parseFloat(amount);

      const depositResult = await API.recordDeposit({
        amount: depositAmount,
        network,
        phone,
        paymentId: payment.payment_id || paymentId,
        reference: payment.reference || payment.payment_id || paymentId,
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
      console.error('OTP verification error:', error);
      showMessage(error.response?.data?.error || error.message || 'Payment verification failed');
      if (depositStep === 'processing') {
        setDepositStep('otp');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!paymentId) return;

    setLoading(true);
    try {
      const result = await API.resendPaymentOtp(paymentId, phone);
      showMessage(result.message || 'OTP resent successfully.', 'success');
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
              <p>Payloqa sent a code to <strong>{phone}</strong>. Enter it to complete your deposit.</p>
              <div className="input-group">
                <label>OTP Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
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
                  onClick={() => {
                    resetDepositFlow();
                    showMessage('Deposit cancelled. You can start again.');
                  }}
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
              <p>Please wait while Payloqa confirms your mobile money payment...</p>
            </div>
          )}

          {(action !== 'deposit' || depositStep === 'form') && (
            <>
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
            </>
          )}

          {message && (
            <div className={`bank-message ${messageType}`}>
              {message}
            </div>
          )}

          {(action !== 'deposit' || depositStep === 'form') && (
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
              ? 'Enter your phone, network, and amount. Payloqa will send an OTP to complete the deposit.'
              : 'Your phone number and network will be sent to admin for withdrawal processing.'}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
