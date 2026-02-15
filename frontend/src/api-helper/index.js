
import axios from 'axios';
// ============================================================================
// API CONFIGURATION
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Configure axios defaults
axios.defaults.baseURL = API_BASE_URL;

// Add token to requests
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    config.headers['ngrok-skip-browser-warning'] = '69420';
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

  signup: async (email, password, phone) => {
    const response = await axios.post('/auth/signup', { email, password, phone });
    return response.data;
  },

  getMe: async () => {
    const response = await axios.get('/auth/me');
    return response.data;
  },

  // Payments
  initiateDeposit: async (amount, network) => {
    const response = await axios.post('/payments/deposit', { amount, network });
    return response.data;
  },

  verifyPayment: async (paymentId) => {
    const response = await axios.get(`/payments/verify/${paymentId}`);
    return response.data;
  },

  // Withdrawals
  requestWithdrawal: async (amount) => {
    const response = await axios.post('/withdrawals/request', { amount });
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
  }
};
