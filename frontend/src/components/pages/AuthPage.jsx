import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { API } from '../../api-helper';
import { CasinoBackground } from '../ui/CasinoBackground';

export const AuthPage = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [referralCode, setReferralCode] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      setReferralCode(ref);
      setIsLogin(false);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = isLogin
        ? await API.login(email, password)
        : await API.signup(email, password, phone, referralCode);

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
      <CasinoBackground />
      <motion.div
        className="auth-card auth-card--polished"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <div className="logo-section">
          <div className="logo-mark">LT</div>
          <h1>Lucky Triple Casino</h1>
          <p>Multiple games. Real wins. Payloqa-powered wallet.</p>
        </div>

        <div className="auth-tabs">
          <button
            type="button"
            className={isLogin ? 'active' : ''}
            onClick={() => setIsLogin(true)}
          >
            Login
          </button>
          <button
            type="button"
            className={isLogin ? '' : 'active'}
            onClick={() => setIsLogin(false)}
          >
            Sign Up
          </button>
        </div>

        {referralCode && !isLogin && (
          <div className="referral-banner">
            Signing up with referral code: <strong>{referralCode}</strong>
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
              placeholder="Enter your password"
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
            {loading ? 'Processing...' : (isLogin ? 'Enter Casino' : 'Create Account')}
          </button>
        </form>

        <div className="auth-features">
          <span>Lucky Triple</span>
          <span>Spin the Bottle</span>
          <span>More coming soon</span>
        </div>
      </motion.div>
    </div>
  );
};
