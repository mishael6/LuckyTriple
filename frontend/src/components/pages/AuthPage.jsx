import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { API } from '../../api-helper';

// ============================================================================
// AUTH PAGE
// ============================================================================

export const AuthPage = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [referralCode, setReferralCode] = useState('');

  // Detect referral code from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      setReferralCode(ref);
      setIsLogin(false); // Switch to signup mode
      console.log('✅ Referral code detected:', ref);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const result = isLogin 
        ? await API.login(email, password)
        : await API.signup(email, password, phone, referralCode); // ADDED referralCode here
      
      if (result.success) {
        localStorage.setItem('token', result.token);
        onLogin(result.user);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <motion.div 
        className="auth-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="logo-section">
          <div className="logo">🎰</div>
          <h1>Lucky Triple</h1>
          <p>Guess 3 numbers. Win big prizes.</p>
        </div>

        <div className="auth-tabs">
          <button 
            className={isLogin ? 'active' : ''}
            onClick={() => setIsLogin(true)}
          >
            Login
          </button>
          <button 
            className={isLogin ? '' : 'active'}
            onClick={() => setIsLogin(false)}
          >
            Sign Up
          </button>
        </div>

        {/* Show referral code banner when present */}
        {referralCode && !isLogin && (
          <div style={{
            background: '#d4edda',
            color: '#155724',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '16px',
            textAlign: 'center',
            fontWeight: 'bold'
          }}>
            🎉 Signing up with referral code: {referralCode}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
            />
          </div>

          <div className="input-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {!isLogin && (
            <div className="input-group">
              <label>Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+233XXXXXXXXX"
                required
              />
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Processing...' : (isLogin ? 'Login' : 'Create Account')}
          </button>
        </form>

        <div className="demo-hint">
          Guess three numbers from 1 - 9, every guess wins!
        </div>
      </motion.div>
    </div>
  );
};
