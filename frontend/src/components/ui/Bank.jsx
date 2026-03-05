import { useState } from 'react';
import { motion } from 'framer-motion';
import { API } from '../../api-helper';
import { PaymentWidget } from '@payloqa/payment-widget';
import '@payloqa/payment-widget/styles';

// ============================================================================
// BANK VIEW - Improved Mobile Responsive
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
    displayMode: 'modal',
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
      style={{
        width: '100%',
        maxWidth: '600px',
        margin: '0 auto',
        padding: '20px 16px'
      }}
    >
      <div className="bank-card">
        <h3 style={{ 
          textAlign: 'center', 
          marginBottom: '20px',
          fontSize: 'clamp(20px, 5vw, 24px)' 
        }}>
          💰 Your Bank
        </h3>
        
        <div className="bank-balance" style={{
          padding: '16px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '12px',
          marginBottom: '20px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div className="balance-label" style={{
            fontSize: '14px',
            color: 'rgba(255, 255, 255, 0.7)',
            marginBottom: '6px'
          }}>
            Current Balance
          </div>
          <div className="balance-amount" style={{
            fontSize: 'clamp(24px, 6vw, 32px)',
            fontWeight: 'bold',
            color: '#4CAF50'
          }}>
            GHS {user?.balance?.toFixed(2) || '0.00'}
          </div>
        </div>

        <div className="bank-tabs" style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '20px'
        }}>
          <button 
            className={action === 'deposit' ? 'active' : ''}
            onClick={() => setAction('deposit')}
            style={{
              flex: 1,
              padding: 'clamp(10px, 3vw, 14px)',
              fontSize: 'clamp(13px, 3.5vw, 15px)',
              background: action === 'deposit' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 255, 255, 0.08)',
              border: action === 'deposit' ? '2px solid #4CAF50' : '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '10px',
              color: '#fff',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            💳 Deposit
          </button>
          <button 
            className={action === 'withdraw' ? 'active' : ''}
            onClick={() => setAction('withdraw')}
            style={{
              flex: 1,
              padding: 'clamp(10px, 3vw, 14px)',
              fontSize: 'clamp(13px, 3.5vw, 15px)',
              background: action === 'withdraw' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 255, 255, 0.08)',
              border: action === 'withdraw' ? '2px solid #4CAF50' : '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '10px',
              color: '#fff',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            💸 Withdraw
          </button>
        </div>

        <div className="bank-form" style={{
          width: '100%'
        }}>
          {action === 'deposit' && (
            <div className="input-group" style={{
              marginBottom: '16px'
            }}>
              <label style={{
                display: 'block',
                fontSize: 'clamp(13px, 3.5vw, 15px)',
                marginBottom: '8px',
                color: '#fff'
              }}>
                Select Network
              </label>
              <select 
                value={network} 
                onChange={(e) => setNetwork(e.target.value)}
                style={{
                  width: '100%',
                  padding: 'clamp(10px, 3vw, 14px) clamp(12px, 3.5vw, 16px)',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                  color: '#fff',
                  fontSize: '16px', // Keep at 16px to prevent iOS zoom
                  boxSizing: 'border-box'
                }}
              >
                <option value="mtn">MTN Mobile Money</option>
                <option value="vodafone">Vodafone Cash</option>
                <option value="airteltigo">AirtelTigo Money</option>
              </select>
            </div>
          )}

          <div className="input-group" style={{
            marginBottom: '16px'
          }}>
            <label style={{
              display: 'block',
              fontSize: 'clamp(13px, 3.5vw, 15px)',
              marginBottom: '8px',
              color: '#fff'
            }}>
              Amount (GHS)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              min="1"
              step="0.01"
              style={{
                width: '100%',
                padding: 'clamp(10px, 3vw, 14px) clamp(12px, 3.5vw, 16px)',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '16px', // Keep at 16px to prevent iOS zoom
                boxSizing: 'border-box'
              }}
            />
          </div>

          {message && (
            <div 
              className={`bank-message ${message.includes('✅') || message.includes('success') ? 'success' : 'error'}`}
              style={{
                padding: 'clamp(10px, 3vw, 12px)',
                borderRadius: '10px',
                marginBottom: '12px',
                fontSize: 'clamp(13px, 3.5vw, 14px)',
                background: message.includes('✅') ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 68, 68, 0.1)',
                border: message.includes('✅') ? '1px solid rgba(76, 175, 80, 0.3)' : '1px solid rgba(255, 68, 68, 0.3)',
                color: message.includes('✅') ? '#4CAF50' : '#ff4444'
              }}
            >
              {message}
            </div>
          )}

          <button 
            className="bank-action-btn"
            onClick={action === 'deposit' ? handleDeposit : handleWithdraw}
            disabled={loading}
            style={{
              width: '100%',
              padding: 'clamp(12px, 3.5vw, 16px)',
              background: loading ? 'rgba(255, 255, 255, 0.1)' : 'linear-gradient(135deg, #4CAF50, #45a049)',
              border: 'none',
              borderRadius: '12px',
              color: '#fff',
              fontSize: 'clamp(14px, 4vw, 16px)',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              transition: 'all 0.2s',
              boxShadow: loading ? 'none' : '0 4px 15px rgba(76, 175, 80, 0.3)'
            }}
          >
            {loading ? 'Processing...' : (action === 'deposit' ? 'Deposit Funds' : 'Request Withdrawal')}
          </button>

          {action === 'deposit' && (
            <div className="bank-info" style={{
              padding: 'clamp(8px, 2.5vw, 10px)',
              marginTop: '12px',
              fontSize: 'clamp(12px, 3vw, 13px)',
              color: 'rgba(255, 255, 255, 0.6)',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              💳 Withdrawals are only made from MONDAYS to FRIDAYS.
            </div>
          )}

          {action === 'withdraw' && (
            <div className="bank-info" style={{
              padding: 'clamp(8px, 2.5vw, 10px)',
              marginTop: '12px',
              fontSize: 'clamp(12px, 3vw, 13px)',
              color: 'rgba(255, 255, 255, 0.6)',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
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
            setMessage('✅ Payment successful!');
            // Optionally refresh user balance here
          }}
        />
      </div>
    </motion.div>
  );
};