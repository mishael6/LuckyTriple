import axios from 'axios';
// ============================================================================
// API CONFIGURATION
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

console.log('🔗 API Base URL:', API_BASE_URL);

// Configure axios defaults
axios.defaults.baseURL = API_BASE_URL;

// Add token to requests
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// API functions
export const API = {
  // Auth
  login: async (email, password) => {
    const response = await axios.post('/auth/login', { email, password });
    return response.data;
  },

  signup: async (email, password, phone, referralCode) => {
    const response = await axios.post('/auth/signup', { email, password, phone, referralCode });
    return response.data;
  },

  getMe: async () => {
    const response = await axios.get('/auth/me');
    return response.data;
  },

  updateWalletPhone: async (phone, network) => {
    const response = await axios.put('/user/wallet-phone', { phone, network });
    return response.data;
  },

  // Payments
  initiatePayment: async (amount, phone, network) => {
    const response = await axios.post('/payments/initiate', { amount, phone, network });
    return response.data;
  },

  verifyPaymentOtp: async (paymentId, phone, otpCode) => {
    const response = await axios.post('/payments/verify-otp', { paymentId, phone, otpCode });
    return response.data;
  },

  resendPaymentOtp: async (paymentId, phone) => {
    const response = await axios.post('/payments/resend-otp', { paymentId, phone });
    return response.data;
  },

  getPaymentStatus: async (paymentId) => {
    const response = await axios.get(`/payments/status/${paymentId}`);
    return response.data;
  },

  recordDeposit: async ({ amount, network, paymentId, reference, phone }) => {
    const response = await axios.post('/payments/deposit', {
      amount,
      network,
      paymentId,
      reference,
      phone,
    });
    return response.data;
  },

  verifyPayment: async (paymentId) => {
    const response = await axios.get(`/payments/status/${paymentId}`);
    return response.data;
  },

  // Withdrawals
  requestWithdrawal: async (amount, phone, network) => {
    const response = await axios.post('/withdrawals/request', { amount, phone, network });
    return response.data;
  },

  getMyWithdrawals: async () => {
    const response = await axios.get('/withdrawals/my-withdrawals');
    return response.data;
  },

  // Game
  playGame: async (bet, guesses) => {
    const response = await axios.post('/game/play', { bet, guesses });
    return response.data;
  },

  getGameHistory: async () => {
    const response = await axios.get('/game/history');
    return response.data;
  },

  getGameSettings: async () => {
    const response = await axios.get('/game/settings');
    return response.data;
  },

  // Spin Game
  playSpinGame: async (bet, direction, multiplier) => {
    const response = await axios.post('/game/spin', { bet, direction, multiplier });
    return response.data;
  },

  getSpinGameHistory: async () => {
    const response = await axios.get('/game/spin-history');
    return response.data;
  },

  playSlotsGame: async (bet) => {
    const response = await axios.post('/game/slots', { bet });
    return response.data;
  },

  getSlotsGameHistory: async () => {
    const response = await axios.get('/game/slots-history');
    return response.data;
  },

  playRouletteGame: async (bet, choice, multiplier) => {
    const response = await axios.post('/game/roulette', { bet, choice, multiplier });
    return response.data;
  },

  playCoinGame: async (bet, choice, multiplier) => {
    const response = await axios.post('/game/coin', { bet, choice, multiplier });
    return response.data;
  },

  playDiceGame: async (bet, choice, multiplier) => {
    const response = await axios.post('/game/dice', { bet, choice, multiplier });
    return response.data;
  },

  getRouletteGameHistory: async () => {
    const response = await axios.get('/game/roulette-history');
    return response.data;
  },

  // Admin
  getAllUsers: async () => {
    const response = await axios.get('/admin/users');
    return response.data;
  },

  creditUser: async (userId, amount, reason) => {
    const response = await axios.post('/admin/credit-user', { userId, amount, reason });
    return response.data;
  },

  getAllWithdrawals: async () => {
    const response = await axios.get('/admin/withdrawals');
    return response.data;
  },

  approveWithdrawal: async (transactionId) => {
    const response = await axios.post('/admin/approve-withdrawal', { transactionId });
    return response.data;
  },

  rejectWithdrawal: async (transactionId, reason) => {
    const response = await axios.post('/admin/reject-withdrawal', { transactionId, reason });
    return response.data;
  },

  getAdminSpinHistory: async () => {
    const response = await axios.get('/admin/spin-history');
    return response.data;
  },

  getAdminSlotsHistory: async () => {
    const response = await axios.get('/admin/slots-history');
    return response.data;
  },

  getAdminRouletteHistory: async () => {
    const response = await axios.get('/admin/roulette-history');
    return response.data;
  },

  getAdminCoinHistory: async () => {
    const response = await axios.get('/admin/coin-history');
    return response.data;
  },

  getAdminDiceHistory: async () => {
    const response = await axios.get('/admin/dice-history');
    return response.data;
  },

  updateGameSettings: async (settings) => {
    const response = await axios.put('/admin/game-settings', settings);
    return response.data;
  },

  sendSMS: async (userIds, message) => {
    const response = await axios.post('/admin/send-sms', { userIds, message });
    return response.data;
  },

  sendSMSToAll: async (message) => {
    const response = await axios.post('/admin/send-sms-all', { message });
    return response.data;
  },

  getSMSLogs: async () => {
    const response = await axios.get('/admin/sms-logs');
    return response.data;
  },

  getDashboardStats: async () => {
    const response = await axios.get('/admin/stats');
    return response.data;
  },

  toggleBlockUser: async (userId) => {
    const response = await axios.post('/admin/toggle-block-user', { userId });
    return response.data;
  },

  removeUser: async (userId) => {
    const response = await axios.delete(`/admin/users/${userId}`);
    return response.data;
  },

  wipeDatabase: async (confirmation) => {
    const response = await axios.post('/admin/wipe-database', { confirmation });
    return response.data;
  },

  // Referral Admin Routes
  getReferrers: async () => {
    const response = await axios.get('/admin/referrers');
    return response.data;
  },

  approveReferrer: async (referrerId) => {
    const response = await axios.post('/admin/approve-referrer', { referrerId });
    return response.data;
  },

  updateReferrer: async (referrerId, updates) => {
    const response = await axios.put(`/admin/referrer/${referrerId}`, updates);
    return response.data;
  },

  getReferrerWithdrawals: async () => {
    const response = await axios.get('/admin/referrer-withdrawals');
    return response.data;
  },

  approveReferrerWithdrawal: async (withdrawalId) => {
    const response = await axios.post('/admin/approve-referrer-withdrawal', { withdrawalId });
    return response.data;
  },

  rejectReferrerWithdrawal: async (withdrawalId, reason) => {
    const response = await axios.post('/admin/reject-referrer-withdrawal', { withdrawalId, reason });
    return response.data;
  },

  getReferralSystemStats: async () => {
    const response = await axios.get('/admin/referral-system-stats');
    return response.data;
  }
};
