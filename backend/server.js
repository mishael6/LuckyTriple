// ============================================================================
// SERVER.JS - Node.js Backend with MongoDB & Payloqa Integration
// ============================================================================

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config();

// NOTE:
// Some routes (including referrer auth) reference `JWT_SECRET` and `connectToDatabase`.
// Those were missing from this standalone server file, which can cause requests to
// never resolve on the client (e.g., referral login shows "Loading..." forever).
const JWT_SECRET = process.env.JWT_SECRET || 'myGameSecret123XYZ999';

let cachedDb = null;
async function connectToDatabase() {
  // If the app already connected during startup, don't reconnect.
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (cachedDb && mongoose.connection.readyState !== 0) return cachedDb;

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/lucky-triple';
  cachedDb = await mongoose.connect(uri);
  return cachedDb;
}

const app = express();

// ============================================================================
// MIDDLEWARE
// ============================================================================

app.use(cors());
app.use(express.json());

// ============================================================================
// PAYLOQA API CONFIGURATION
// ============================================================================

const PAYLOQA_CONFIG = {
  apiKey: process.env.PAYLOQA_API_KEY || 'pk_live_of502pjkel',
  platformId: process.env.PAYLOQA_PLATFORM_ID || 'plat_xvadsq3rx0f',
  smsBaseURL: 'https://sms.payloqa.com/api/v1',
  paymentsBaseURL: 'https://payments.payloqa.com/api/v1/payments'
};

const payloqaAPI = {
  // ============================================================================
  // SMS FUNCTIONS
  // ============================================================================

  sendSMS: async (phone, message) => {
    try {
      // Format phone number to E.164 format
      let formattedPhone = phone.replace(/\D/g, '');

      // Convert local Ghana 10-digit numbers (e.g. 055...) to international 233 format
      if (formattedPhone.startsWith('0') && formattedPhone.length === 10) {
        formattedPhone = '233' + formattedPhone.substring(1);
      }

      // Add + prefix if not present
      if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+' + formattedPhone;
      }

      console.log('📱 Sending SMS to:', formattedPhone);
      console.log('📱 Message:', message);

      const response = await axios.post(
        `${PAYLOQA_CONFIG.smsBaseURL}/sms/send`,
        {
          recipient_number: formattedPhone,
          sender_id: 'LuckyTriple', // Change to 'Payloqa' if not registered
          message: message,
          usage_message_type: 'notification'
        },
        {
          headers: {
            'X-API-Key': PAYLOQA_CONFIG.apiKey,
            'X-Platform-Id': PAYLOQA_CONFIG.platformId,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ SMS sent successfully:', response.data);

      return {
        success: true,
        messageId: response.data.data?.message_id,
        cost: response.data.data?.cost,
        status: response.data.data?.status
      };
    } catch (error) {
      console.error('❌ SMS Error:', error.response?.data || error.message);

      let errorMessage = 'Failed to send SMS';

      // Log specific errors
      if (error.response?.data?.error === 'INSUFFICIENT_BALANCE') {
        errorMessage = 'Payloqa wallet has insufficient balance!';
        console.error('⚠️ ' + errorMessage);
      } else if (error.response?.data?.error === 'INVALID_PHONE_NUMBER') {
        errorMessage = `Invalid phone number format: ${phone}`;
        console.error('⚠️ ' + errorMessage);
      } else if (error.response?.data?.error === 'SERVICE_ACCESS_DENIED') {
        errorMessage = 'SMS permission not granted. Contact Payloqa support.';
        console.error('⚠️ ' + errorMessage);
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (typeof error.response?.data === 'string') {
        errorMessage = error.response.data;
      } else if (error.message) {
        errorMessage = error.message;
      }

      throw new Error(errorMessage);
    }
  },

  // Send SMS to multiple recipients
  sendBulkSMS: async (phones, message) => {
    try {
      console.log(`📱 Sending bulk SMS to ${phones.length} recipients`);

      const results = [];

      // Send SMS one by one
      for (const phone of phones) {
        try {
          const result = await payloqaAPI.sendSMS(phone, message);
          results.push({ phone, success: result.success });

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Failed to send SMS to ${phone}:`, error);
          results.push({ phone, success: false });
        }
      }

      const successCount = results.filter(r => r.success).length;
      console.log(`✅ Bulk SMS complete: ${successCount}/${phones.length} sent`);

      return {
        success: true,
        total: phones.length,
        sent: successCount,
        failed: phones.length - successCount,
        results
      };
    } catch (error) {
      console.error('❌ Bulk SMS Error:', error);
      return { success: false, error: error.message };
    }
  }
};

// ============================================================================
// DATABASE MODELS
// ============================================================================

// User Model
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  balance: { type: Number, default: 0 },
  isAdmin: { type: Boolean, default: false },
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Referrer', default: null }, // ADD THIS
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date }
});
const User = mongoose.model('User', userSchema);

// Transaction Model
const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['deposit', 'withdrawal', 'bet', 'win', 'credit'], required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'completed', 'approved', 'rejected'], default: 'pending' },
  reference: { type: String },
  paymentDetails: { type: Object },
  createdAt: { type: Date, default: Date.now },
  processedAt: { type: Date },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const Transaction = mongoose.model('Transaction', transactionSchema);

// Game History Model
const gameHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  betAmount: { type: Number, required: true },
  guesses: { type: [Number], required: true },
  winningNumbers: { type: [Number], required: true },
  matches: { type: Number, required: true },
  profit: { type: Number, required: true },
  balanceBefore: { type: Number },
  balanceAfter: { type: Number },
  createdAt: { type: Date, default: Date.now }
});

const GameHistory = mongoose.model('GameHistory', gameHistorySchema);

// SMS Log Model
const smsLogSchema = new mongoose.Schema({
  phones: { type: [String], required: true },
  message: { type: String, required: true },
  status: { type: String, enum: ['sent', 'failed'], required: true },
  sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  response: { type: Object },
  createdAt: { type: Date, default: Date.now }
});

const SMSLog = mongoose.model('SMSLog', smsLogSchema);

// Spin Game History Model
const spinGameHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  betAmount: { type: Number, required: true },
  direction: { type: String, enum: ['up', 'bottom'], required: true },
  multiplier: { type: Number, enum: [2, 3, 4], required: true },
  outcome: { type: String, enum: ['up', 'bottom'], required: true },
  won: { type: Boolean, required: true },
  profit: { type: Number, required: true },
  balanceBefore: { type: Number },
  balanceAfter: { type: Number },
  createdAt: { type: Date, default: Date.now }
});

const SpinGameHistory = mongoose.model('SpinGameHistory', spinGameHistorySchema);

// Game Settings Model
const gameSettingsSchema = new mongoose.Schema({
  houseFee: { type: Number, default: 10 },
  maxBet: { type: Number, default: 1000 },
  minBet: { type: Number, default: 1 },
  payoutMultipliers: {
    threeMatches: { type: Number, default: 100 },
    twoMatches: { type: Number, default: 10 },
    oneMatch: { type: Number, default: 2 }
  },
  spinWinChances: {
    x2: { type: Number, default: 45 },
    x3: { type: Number, default: 30 },
    x4: { type: Number, default: 20 }
  },
  updatedAt: { type: Date, default: Date.now },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const GameSettings = mongoose.model('GameSettings', gameSettingsSchema);

// ============================================================================
// MIDDLEWARE - AUTH
// ============================================================================

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

const requireAdmin = (req, res, next) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  next();
};

const authenticateReferrer = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, referrer) => {
    if (err || !referrer.isReferrer) {
      return res.status(403).json({ success: false, error: 'Invalid referrer token' });
    }
    req.referrer = referrer;
    next();
  });
};

// ============================================================================
// ROUTES - AUTHENTICATION
// ============================================================================

// Sign Up
app.post('/api/auth/signup', async (req, res) => {
  await connectToDatabase();
  
  try {
    const { email, password, phone, referralCode } = req.body;

    if (!email || !password || !phone) {
      return res.status(400).json({ success: false, error: 'All fields are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let referrerId = null;
    if (referralCode) {
      const referrer = await Referrer.findOne({ 
        referralCode: referralCode.toUpperCase().trim(),
        isApproved: true,
        isActive: true 
      });
      
      if (referrer) {
        referrerId = referrer._id;
        referrer.totalReferrals += 1;
        await referrer.save();
        console.log(`✅ Referred by: ${referrer.email}`);
      }
    }

    const user = new User({
      email,
      password: hashedPassword,
      phone,
      referredBy: referrerId,
      isAdmin: email.toLowerCase().includes('admin')
    });

    await user.save();

    if (referrerId) {
      await ReferralStats.create({
        referrerId: referrerId,
        userId: user._id
      });
    }

    try {
      await payloqaAPI.sendSMS(
        phone,
        `Welcome to Lucky Triple! 🎰 Your account has been created successfully. Start playing and win big!`
      );
    } catch (smsError) {
      console.error('Welcome SMS failed:', smsError);
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, isAdmin: user.isAdmin },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      user: {
        _id: user._id,
        email: user.email,
        phone: user.phone,
        balance: user.balance,
        isAdmin: user.isAdmin
      },
      token
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, error: 'Invalid credentials' });
    }

    if (user.isBlocked) {
      return res.status(403).json({ success: false, error: 'Your account has been blocked. Please contact support.' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ success: false, error: 'Invalid credentials' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { id: user._id, email: user.email, isAdmin: user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      user: {
        _id: user._id,
        email: user.email,
        phone: user.phone,
        balance: user.balance,
        isAdmin: user.isAdmin
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Get Current User
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ============================================================================
// ROUTES - PAYMENTS & DEPOSITS
// ============================================================================

// Payment Callback (Webhook from Payloqa)
app.post('/api/payments/webhook', async (req, res) => {
  try {
    console.log('📨 Webhook received:', req.body);

    const { status, amount, metadata } = req.body;

    console.log('Payment status:', status, 'User ID:', metadata?.user_id);

    if (status === 'completed') {
      const user = await User.findById(metadata.user_id);

      if (!user) {
        console.error('❌ User not found:', metadata.user_id);
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      const numAmount = parseFloat(amount);
      user.balance = Number(user.balance) + numAmount;
      await user.save();

      console.log(`✅ Balance updated for ${user.email}: GHS ${user.balance}`);

      // Send deposit confirmation SMS
      try {
        await payloqaAPI.sendSMS(
          user.phone,
          `Your deposit of GHS ${numAmount.toFixed(2)} was successful! Your new balance is GHS ${user.balance.toFixed(2)}. 🎰`
        );
      } catch (smsError) {
        console.error('❌ Deposit SMS failed:', smsError);
      }

      res.status(200).json({ success: true, message: 'Payment processed' });
    } else if (status === 'failed') {
      console.log('❌ Payment failed');
      res.status(200).json({ success: true, message: 'Payment failed' });
    } else {
      console.log('⏳ Payment still processing');
      res.status(200).json({ success: true, message: 'Payment processing' });
    }
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ success: false, error: 'Callback processing failed' });
  }
});

// ============================================================================
// ROUTES - WITHDRAWALS
// ============================================================================

// Request Withdrawal
app.post('/api/withdrawals/request', authenticateToken, async (req, res) => {
  try {
    const { amount } = req.body;
    const user = await User.findById(req.user.id);

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid amount' });
    }

    if (user.balance < amount) {
      return res.status(400).json({ success: false, error: 'Insufficient balance' });
    }

    const transaction = new Transaction({
      userId: user._id,
      type: 'withdrawal',
      amount,
      status: 'pending',
      reference: `WTH_${Date.now()}_${user._id}`
    });
    await transaction.save();

    // ✅ Send SMS to user
    try {
      await payloqaAPI.sendSMS(
        user.phone,
        `Your withdrawal request of GHS ${amount.toFixed(2)} has been submitted and is pending admin approval. You'll receive another SMS once processed. 📤`
      );
      console.log('✅ Withdrawal request SMS sent to user');
    } catch (smsError) {
      console.error('❌ User SMS failed:', smsError);
    }

    // ✅ Notify all admins
    try {
      const admins = await User.find({ isAdmin: true });
      for (const admin of admins) {
        await payloqaAPI.sendSMS(
          admin.phone,
          `🔔 New withdrawal request: GHS ${amount.toFixed(2)} from ${user.email}. Login to approve/reject.`
        );
      }
      console.log('✅ Admin notification SMS sent');
    } catch (smsError) {
      console.error('❌ Admin SMS failed:', smsError);
    }

    res.json({
      success: true,
      message: 'Withdrawal request submitted. You will receive an SMS when processed.',
      transaction
    });
  } catch (error) {
    console.error('Withdrawal request error:', error);
    res.status(500).json({ success: false, error: 'Failed to submit withdrawal request' });
  }
});

// Get User Withdrawals
app.get('/api/withdrawals/my-withdrawals', authenticateToken, async (req, res) => {
  try {
    const withdrawals = await Transaction.find({
      userId: req.user.id,
      type: 'withdrawal'
    }).sort({ createdAt: -1 });

    res.json({ success: true, withdrawals });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch withdrawals' });
  }
});

// ============================================================================
// ROUTES - GAME
// ============================================================================

// Play Game
// Play Game
app.post('/api/game/play', authenticateToken, async (req, res) => {
  try {
    const { bet, guesses } = req.body;
    const user = await User.findById(req.user.id);

    if (!bet || bet <= 0 || !guesses || guesses.length !== 3) {
      return res.status(400).json({ success: false, error: 'Invalid game parameters' });
    }

    let settings = await GameSettings.findOne();
    if (!settings) {
      settings = await GameSettings.create({});
    }

    if (bet < settings.minBet || bet > settings.maxBet) {
      return res.status(400).json({
        success: false,
        error: `Bet must be between GHS ${settings.minBet} and GHS ${settings.maxBet}`
      });
    }

    if (user.balance < bet) {
      return res.status(400).json({ success: false, error: 'Insufficient balance' });
    }

    // ============================================================================
    // NEW GAME LOGIC - WEIGHTED WIN RATES
    // ============================================================================

    // Convert guesses to numbers
    const playerGuesses = guesses.map(g => parseInt(g));

    // Decide outcome based on probability
    const random = Math.random() * 100;

    let winningNumbers;
    let targetMatches;

    if (random < 5) {
      // 5% chance - Triple match (JACKPOT!)
      targetMatches = 3;
      winningNumbers = [...playerGuesses];
      console.log('🎰 Jackpot outcome generated!');

    } else if (random < 30) {
      // 25% chance - Double match
      targetMatches = 2;

      // Pick 2 random positions to match
      const positions = [0, 1, 2];
      const shuffled = positions.sort(() => Math.random() - 0.5);
      const matchPositions = shuffled.slice(0, 2);

      winningNumbers = [
        Math.floor(Math.random() * 10),
        Math.floor(Math.random() * 10),
        Math.floor(Math.random() * 10)
      ];

      // Set the matching positions
      matchPositions.forEach(pos => {
        winningNumbers[pos] = playerGuesses[pos];
      });

      console.log('🌟 Double match outcome generated');

    } else if (random < 60) {
      // 30% chance - Single match
      targetMatches = 1;

      // Pick 1 random position to match
      const matchPosition = Math.floor(Math.random() * 3);

      winningNumbers = [
        Math.floor(Math.random() * 10),
        Math.floor(Math.random() * 10),
        Math.floor(Math.random() * 10)
      ];

      // Set the matching position
      winningNumbers[matchPosition] = playerGuesses[matchPosition];

      // Make sure other positions DON'T match
      for (let i = 0; i < 3; i++) {
        if (i !== matchPosition) {
          while (winningNumbers[i] === playerGuesses[i]) {
            winningNumbers[i] = Math.floor(Math.random() * 10);
          }
        }
      }

      console.log('👍 Single match outcome generated');

    } else {
      // 40% chance - No match
      targetMatches = 0;

      winningNumbers = [
        Math.floor(Math.random() * 10),
        Math.floor(Math.random() * 10),
        Math.floor(Math.random() * 10)
      ];

      // Make sure NONE match
      for (let i = 0; i < 3; i++) {
        while (winningNumbers[i] === playerGuesses[i]) {
          winningNumbers[i] = Math.floor(Math.random() * 10);
        }
      }

      console.log('😔 No match outcome generated');
    }

    // Calculate actual matches (verify our logic worked)
    let matches = 0;
    playerGuesses.forEach((guess, i) => {
      if (guess === winningNumbers[i]) matches++;
    });

    // Calculate winnings
    let winAmount = 0;
    if (matches === 3) winAmount = bet * settings.payoutMultipliers.threeMatches;
    else if (matches === 2) winAmount = bet * settings.payoutMultipliers.twoMatches;
    else if (matches === 1) winAmount = bet * settings.payoutMultipliers.oneMatch;

    const profit = winAmount - bet;
    const balanceBefore = user.balance;

    user.balance += profit;
    await user.save();

    const gameHistory = new GameHistory({
      userId: user._id,
      betAmount: bet,
      guesses: playerGuesses,
      winningNumbers,
      matches,
      profit,
      balanceBefore,
      balanceAfter: user.balance
    });
    await gameHistory.save();

    await Transaction.create({
      userId: user._id,
      type: 'bet',
      amount: bet,
      status: 'completed',
      processedAt: new Date()
    });

    if (winAmount > 0) {
      await Transaction.create({
        userId: user._id,
        type: 'win',
        amount: winAmount,
        status: 'completed',
        processedAt: new Date()
      });

      // ADD THIS LINE:
      await calculateAndPayCommission(user._id, gameHistory._id, winAmount);
    }

    // Send SMS for big wins
    if (matches >= 2) {
      try {
        await payloqaAPI.sendSMS(
          user.phone,
          `🎉 Congratulations! You won GHS ${winAmount.toFixed(2)} with ${matches} matches! Your new balance is GHS ${user.balance.toFixed(2)}. 🎰`
        );
      } catch (smsError) {
        console.error('Win SMS failed:', smsError);
      }
    }

    console.log(`🎲 Game result: ${matches} matches, Profit: GHS ${profit.toFixed(2)}`);

    res.json({
      success: true,
      winningNumbers,
      matches,
      profit,
      newBalance: user.balance,
      message: matches > 0 ? 'You won!' : 'Better luck next time!'
    });
  } catch (error) {
    console.error('Game play error:', error);
    res.status(500).json({ success: false, error: 'Game error occurred' });
  }
});

// Get Game History
app.get('/api/game/history', authenticateToken, async (req, res) => {
  try {
    const history = await GameHistory.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ success: true, history });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch game history' });
  }
});

// Spin the Bottle Play
app.post('/api/game/spin', authenticateToken, async (req, res) => {
  try {
    const { bet, direction, multiplier } = req.body;
    const user = await User.findById(req.user.id);

    if (!bet || bet <= 0 || !['up', 'bottom'].includes(direction) || ![2, 3, 4].includes(multiplier)) {
      return res.status(400).json({ success: false, error: 'Invalid game parameters' });
    }

    let settings = await GameSettings.findOne();
    if (!settings) settings = await GameSettings.create({});

    if (bet < settings.minBet || bet > settings.maxBet) {
      return res.status(400).json({
        success: false,
        error: `Bet must be between GHS ${settings.minBet} and GHS ${settings.maxBet}`
      });
    }

    if (user.balance < bet) {
      return res.status(400).json({ success: false, error: 'Insufficient balance' });
    }

    // Determine chance of winning based on admin settings
    const winChance = settings.spinWinChances[`x${multiplier}`];
    const random = Math.random() * 100;
    const won = random <= winChance;

    const outcome = won ? direction : (direction === 'up' ? 'bottom' : 'up');

    let profit = 0;
    if (won) {
      profit = (bet * multiplier) - bet;
    } else {
      profit = -bet;
    }

    const balanceBefore = user.balance;
    user.balance += profit;
    await user.save();

    const spinHistory = new SpinGameHistory({
      userId: user._id,
      betAmount: bet,
      direction,
      multiplier,
      outcome,
      won,
      profit,
      balanceBefore,
      balanceAfter: user.balance
    });
    await spinHistory.save();

    await Transaction.create({
      userId: user._id,
      type: 'bet',
      amount: bet,
      status: 'completed',
      reference: 'Spin the Bottle',
      processedAt: new Date()
    });

    if (won) {
      await Transaction.create({
        userId: user._id,
        type: 'win',
        amount: bet * multiplier,
        status: 'completed',
        reference: 'Spin the Bottle Win',
        processedAt: new Date()
      });

      // ADD THIS LINE:
      await calculateAndPayCommission(user._id, spinHistory._id, bet * multiplier);

      // Try to send success SMS for big wins
      if (multiplier >= 3) {
        try {
          await payloqaAPI.sendSMS(
            user.phone,
            `🍾 You won GHS ${(bet * multiplier).toFixed(2)} on Spin the Bottle (x${multiplier})! New balance: GHS ${user.balance.toFixed(2)}.`
          );
        } catch (e) { }
      }
    }

    res.json({
      success: true,
      outcome,
      won,
      profit,
      newBalance: user.balance,
      message: won ? `You won! GHS ${profit.toFixed(2)} added.` : 'Better luck next time!'
    });
  } catch (error) {
    console.error('Spin game error:', error);
    res.status(500).json({ success: false, error: 'Spin game error occurred' });
  }
});

// Get Spin Game History
app.get('/api/game/spin-history', authenticateToken, async (req, res) => {
  try {
    const history = await SpinGameHistory.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ success: true, history });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch spin history' });
  }
});

// Get Game Settings
app.get('/api/game/settings', async (req, res) => {
  try {
    let settings = await GameSettings.findOne();
    if (!settings) {
      settings = await GameSettings.create({});
    }
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch settings' });
  }
});

// ============================================================================
// REFERRAL SYSTEM MODELS
// ============================================================================

const referrerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  referralCode: { type: String, required: true, unique: true, index: true },
  commissionBalance: { type: Number, default: 0 },
  totalEarnings: { type: Number, default: 0 },
  totalReferrals: { type: Number, default: 0 },
  commissionRate: { type: Number, default: 10 },
  isApproved: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date }
});

const Referrer = mongoose.model('Referrer', referrerSchema);

const referralStatsSchema = new mongoose.Schema({
  referrerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Referrer', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  totalGames: { type: Number, default: 0 },
  totalWins: { type: Number, default: 0 },
  totalWinAmount: { type: Number, default: 0 },
  commissionEarned: { type: Number, default: 0 },
  lastActivity: { type: Date, default: Date.now }
});

const ReferralStats = mongoose.model('ReferralStats', referralStatsSchema);

const commissionTransactionSchema = new mongoose.Schema({
  referrerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Referrer', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  gameId: { type: mongoose.Schema.Types.ObjectId, ref: 'GameHistory', required: true },
  winAmount: { type: Number, required: true },
  commissionAmount: { type: Number, required: true },
  commissionRate: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'paid'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

const CommissionTransaction = mongoose.model('CommissionTransaction', commissionTransactionSchema);

const referrerWithdrawalSchema = new mongoose.Schema({
  referrerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Referrer', required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  reference: { type: String },
  paymentDetails: { type: Object },
  rejectionReason: { type: String },
  createdAt: { type: Date, default: Date.now },
  processedAt: { type: Date },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const ReferrerWithdrawal = mongoose.model('ReferrerWithdrawal', referrerWithdrawalSchema);

// ============================================================================
// HELPER FUNCTIONS - REFERRAL
// ============================================================================

function generateReferralCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'REF_';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function calculateAndPayCommission(userId, gameId, winAmount) {
  try {
    const user = await User.findById(userId).populate('referredBy');
    
    if (!user.referredBy) return;

    const referrer = user.referredBy;
    
    if (!referrer.isApproved || !referrer.isActive) {
      console.log('Referrer not approved or inactive');
      return;
    }

    const commissionRate = referrer.commissionRate / 100;
    const commissionAmount = winAmount * commissionRate;

    referrer.commissionBalance += commissionAmount;
    referrer.totalEarnings += commissionAmount;
    await referrer.save();

    await CommissionTransaction.create({
      referrerId: referrer._id,
      userId: user._id,
      gameId: gameId,
      winAmount: winAmount,
      commissionAmount: commissionAmount,
      commissionRate: referrer.commissionRate,
      status: 'pending'
    });

    let stats = await ReferralStats.findOne({ referrerId: referrer._id, userId: user._id });
    if (!stats) {
      stats = new ReferralStats({
        referrerId: referrer._id,
        userId: user._id
      });
    }
    stats.totalWins += 1;
    stats.totalWinAmount += winAmount;
    stats.commissionEarned += commissionAmount;
    stats.totalGames += 1;
    stats.lastActivity = new Date();
    await stats.save();

    console.log(`💰 Commission: GHS ${commissionAmount.toFixed(2)} → ${referrer.email}`);
  } catch (error) {
    console.error('Commission error:', error);
  }
}

// ============================================================================
// ROUTES - ADMIN
// ============================================================================

// Get All Users
app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await User.find({ isAdmin: false })
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

// Credit User
app.post('/api/admin/credit-user', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId, amount, reason } = req.body;

    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid parameters' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    user.balance += amount;
    await user.save();

    await Transaction.create({
      userId: user._id,
      type: 'credit',
      amount,
      status: 'completed',
      processedAt: new Date(),
      processedBy: req.user.id,
      reference: reason || 'Admin credit'
    });

    try {
      const message = `Your account has been credited with GHS ${amount.toFixed(2)}! ${reason ? `Reason: ${reason}` : ''} New balance: GHS ${user.balance.toFixed(2)} 🎁`;
      const smsResponse = await payloqaAPI.sendSMS(user.phone, message);

      await SMSLog.create({
        phones: [user.phone],
        message: message,
        status: smsResponse.success ? 'sent' : 'failed',
        sentBy: req.user.id,
        response: smsResponse
      });
    } catch (smsError) {
      console.error('Credit SMS failed:', smsError);
    }

    res.json({
      success: true,
      message: 'User credited successfully',
      newBalance: user.balance
    });
  } catch (error) {
    console.error('Credit user error:', error);
    res.status(500).json({ success: false, error: 'Failed to credit user' });
  }
});

// Get All Withdrawals
app.get('/api/admin/withdrawals', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const withdrawals = await Transaction.find({ type: 'withdrawal' })
      .populate('userId', 'email phone')
      .sort({ createdAt: -1 });

    res.json({ success: true, withdrawals });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch withdrawals' });
  }
});

// Approve Withdrawal
app.post('/api/admin/approve-withdrawal', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { transactionId } = req.body;

    const transaction = await Transaction.findById(transactionId).populate('userId');
    if (!transaction) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }

    if (transaction.status !== 'pending') {
      return res.status(400).json({ success: false, error: 'Transaction already processed' });
    }

    const user = transaction.userId;

    if (user.balance < transaction.amount) {
      return res.status(400).json({ success: false, error: 'User has insufficient balance' });
    }

    user.balance -= transaction.amount;
    await user.save();

    transaction.status = 'approved';
    transaction.processedAt = new Date();
    transaction.processedBy = req.user.id;
    await transaction.save();

    try {
      const message = `Your withdrawal request of GHS ${transaction.amount.toFixed(2)} has been approved! The funds will be sent to your account within 24 hours. 💰`;
      const smsResponse = await payloqaAPI.sendSMS(user.phone, message);

      await SMSLog.create({
        phones: [user.phone],
        message: message,
        status: smsResponse.success ? 'sent' : 'failed',
        sentBy: req.user.id,
        response: smsResponse
      });
    } catch (smsError) {
      console.error('Withdrawal approval SMS failed:', smsError);
    }

    res.json({
      success: true,
      message: 'Withdrawal approved successfully'
    });
  } catch (error) {
    console.error('Approve withdrawal error:', error);
    res.status(500).json({ success: false, error: 'Failed to approve withdrawal' });
  }
});

// Reject Withdrawal
app.post('/api/admin/reject-withdrawal', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { transactionId, reason } = req.body;

    const transaction = await Transaction.findById(transactionId).populate('userId');
    if (!transaction) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }

    if (transaction.status !== 'pending') {
      return res.status(400).json({ success: false, error: 'Transaction already processed' });
    }

    transaction.status = 'rejected';
    transaction.processedAt = new Date();
    transaction.processedBy = req.user.id;
    transaction.reference = reason || 'Rejected by admin';
    await transaction.save();

    try {
      const message = `Your withdrawal request of GHS ${transaction.amount.toFixed(2)} has been rejected. ${reason ? `Reason: ${reason}` : 'Please contact support for more information.'}`;
      const smsResponse = await payloqaAPI.sendSMS(transaction.userId.phone, message);

      await SMSLog.create({
        phones: [transaction.userId.phone],
        message: message,
        status: smsResponse.success ? 'sent' : 'failed',
        sentBy: req.user.id,
        response: smsResponse
      });
    } catch (smsError) {
      console.error('Withdrawal rejection SMS failed:', smsError);
    }

    res.json({
      success: true,
      message: 'Withdrawal rejected'
    });
  } catch (error) {
    console.error('Reject withdrawal error:', error);
    res.status(500).json({ success: false, error: 'Failed to reject withdrawal' });
  }
});

// Update Game Settings
app.put('/api/admin/game-settings', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { houseFee, maxBet, minBet, payoutMultipliers } = req.body;

    let settings = await GameSettings.findOne();
    if (!settings) {
      settings = new GameSettings();
    }

    if (houseFee !== undefined) settings.houseFee = houseFee;
    if (maxBet !== undefined) settings.maxBet = maxBet;
    if (minBet !== undefined) settings.minBet = minBet;
    if (payoutMultipliers) settings.payoutMultipliers = payoutMultipliers;

    settings.updatedAt = new Date();
    settings.updatedBy = req.user.id;
    await settings.save();

    res.json({
      success: true,
      message: 'Game settings updated successfully',
      settings
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ success: false, error: 'Failed to update settings' });
  }
});

// Send SMS to Users
app.post('/api/admin/send-sms', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userIds, message } = req.body;

    if (!message || !userIds || userIds.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid parameters' });
    }

    const users = await User.find({ _id: { $in: userIds } });
    const phones = users.map(u => u.phone);

    const smsResponse = await payloqaAPI.sendBulkSMS(phones, message);

    await SMSLog.create({
      phones,
      message,
      status: 'sent',
      sentBy: req.user.id,
      response: smsResponse
    });

    res.json({
      success: true,
      message: `SMS sent to ${phones.length} users`,
      details: smsResponse
    });
  } catch (error) {
    console.error('Send SMS error:', error);

    try {
      await SMSLog.create({
        phones: req.body.userIds || [],
        message: req.body.message || '',
        status: 'failed',
        sentBy: req.user.id,
        response: { error: error.message }
      });
    } catch (logError) {
      console.error('Failed to log SMS error:', logError);
    }

    res.status(500).json({ success: false, error: 'Failed to send SMS' });
  }
});

// Send SMS to All Users
app.post('/api/admin/send-sms-all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    const users = await User.find({ isAdmin: false });
    const phones = users.map(u => u.phone);

    if (phones.length === 0) {
      return res.status(400).json({ success: false, error: 'No users to send SMS to' });
    }

    const smsResponse = await payloqaAPI.sendBulkSMS(phones, message);

    await SMSLog.create({
      phones,
      message,
      status: 'sent',
      sentBy: req.user.id,
      response: smsResponse
    });

    res.json({
      success: true,
      message: `SMS sent to all ${phones.length} users`,
      details: smsResponse
    });
  } catch (error) {
    console.error('Send SMS to all error:', error);
    res.status(500).json({ success: false, error: 'Failed to send SMS' });
  }
});

// Get SMS Logs
app.get('/api/admin/sms-logs', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const logs = await SMSLog.find()
      .populate('sentBy', 'email')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch SMS logs' });
  }
});

// Get Dashboard Stats
app.get('/api/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ isAdmin: false });
    const totalBalance = await User.aggregate([
      { $match: { isAdmin: false } },
      { $group: { _id: null, total: { $sum: '$balance' } } }
    ]);

    const totalDeposits = await Transaction.aggregate([
      { $match: { type: 'deposit', status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const totalWithdrawals = await Transaction.aggregate([
      { $match: { type: 'withdrawal', status: 'approved' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const totalBets = await Transaction.aggregate([
      { $match: { type: 'bet' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const totalWins = await Transaction.aggregate([
      { $match: { type: 'win' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const pendingWithdrawals = await Transaction.countDocuments({
      type: 'withdrawal',
      status: 'pending'
    });

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalBalance: totalBalance[0]?.total || 0,
        totalDeposits: totalDeposits[0]?.total || 0,
        totalWithdrawals: totalWithdrawals[0]?.total || 0,
        totalBets: totalBets[0]?.total || 0,
        totalWins: totalWins[0]?.total || 0,
        pendingWithdrawals,
        houseProfit: (totalBets[0]?.total || 0) - (totalWins[0]?.total || 0)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

// Admin Get All Spin History
app.get('/api/admin/spin-history', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const history = await SpinGameHistory.find()
      .populate('userId', 'email phone')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ success: true, history });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch admin spin history' });
  }
});

// Toggle Block User
app.post('/api/admin/toggle-block-user', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (user.isAdmin) {
      return res.status(403).json({ success: false, error: 'Cannot block administrative accounts' });
    }

    user.isBlocked = !user.isBlocked;
    await user.save();

    res.json({ success: true, message: `User ${user.isBlocked ? 'blocked' : 'unblocked'} successfully`, isBlocked: user.isBlocked });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to toggle user ban state' });
  }
});

// Delete User
app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (user.isAdmin) {
      return res.status(403).json({ success: false, error: 'Cannot delete administrative accounts' });
    }

    // Clean up related data to prevent orphaned records.
    await Transaction.deleteMany({ userId: user._id });
    await GameHistory.deleteMany({ userId: user._id });

    // Actually delete the user
    await User.findByIdAndDelete(userId);

    res.json({ success: true, message: 'User and associated data completely removed from system' });
  } catch (error) {
    console.error('Failed to delete user:', error);
    res.status(500).json({ success: false, error: 'Failed to remove user' });
  }
});

// ============================================================================
// ROUTES - REFERRAL SYSTEM
// ============================================================================

// Referrer Signup
app.post('/api/referral/signup', async (req, res) => {
  await connectToDatabase();
  
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password || !phone) {
      return res.status(400).json({ success: false, error: 'All fields are required' });
    }

    const existingReferrer = await Referrer.findOne({ email });
    if (existingReferrer) {
      return res.status(400).json({ success: false, error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let referralCode;
    let isUnique = false;
    while (!isUnique) {
      referralCode = generateReferralCode();
      const existing = await Referrer.findOne({ referralCode });
      if (!existing) isUnique = true;
    }

    const referrer = new Referrer({
      name,
      email,
      password: hashedPassword,
      phone,
      referralCode,
      isApproved: false
    });

    await referrer.save();

    try {
      await payloqaAPI.sendSMS(
        phone,
        `Welcome to Lucky Triple Referral Program! Your account is pending admin approval. You'll receive an SMS once approved. 🎰`
      );
    } catch (smsError) {
      console.error('Referrer SMS failed:', smsError);
    }

    res.json({
      success: true,
      message: 'Account created successfully. Pending admin approval.',
      referrer: {
        name: referrer.name,
        email: referrer.email,
        isApproved: false
      }
    });
  } catch (error) {
    console.error('Referrer signup error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Referrer Login
app.post('/api/referral/login', async (req, res) => {
  await connectToDatabase();
  
  try {
    const { email, password } = req.body;

    const referrer = await Referrer.findOne({ email });
    if (!referrer) {
      return res.status(400).json({ success: false, error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, referrer.password);
    if (!isValidPassword) {
      return res.status(400).json({ success: false, error: 'Invalid credentials' });
    }

    if (!referrer.isApproved) {
      return res.status(403).json({ success: false, error: 'Account pending admin approval' });
    }

    if (!referrer.isActive) {
      return res.status(403).json({ success: false, error: 'Account deactivated. Contact admin.' });
    }

    referrer.lastLogin = new Date();
    await referrer.save();

    const token = jwt.sign(
      { id: referrer._id, email: referrer.email, isReferrer: true },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      referrer: {
        _id: referrer._id,
        name: referrer.name,
        email: referrer.email,
        phone: referrer.phone,
        referralCode: referrer.referralCode,
        commissionBalance: referrer.commissionBalance,
        totalEarnings: referrer.totalEarnings,
        commissionRate: referrer.commissionRate
      },
      token
    });
  } catch (error) {
    console.error('Referrer login error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Get Referrer Info
app.get('/api/referral/me', authenticateReferrer, async (req, res) => {
  await connectToDatabase();
  
  try {
    const referrer = await Referrer.findById(req.referrer.id).select('-password');
    res.json({ success: true, referrer });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Get Referrer Dashboard Stats
app.get('/api/referral/stats', authenticateReferrer, async (req, res) => {
  await connectToDatabase();
  
  try {
    const referrer = await Referrer.findById(req.referrer.id);
    
    const totalUsers = await User.countDocuments({ referredBy: referrer._id });
    const activeUsers = await ReferralStats.countDocuments({ 
      referrerId: referrer._id,
      lastActivity: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });

    const todayCommissions = await CommissionTransaction.aggregate([
      {
        $match: {
          referrerId: referrer._id,
          createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
        }
      },
      { $group: { _id: null, total: { $sum: '$commissionAmount' } } }
    ]);

    const monthlyCommissions = await CommissionTransaction.aggregate([
      {
        $match: {
          referrerId: referrer._id,
          createdAt: { $gte: new Date(new Date().setDate(1)) }
        }
      },
      { $group: { _id: null, total: { $sum: '$commissionAmount' } } }
    ]);

    res.json({
      success: true,
      stats: {
        totalReferrals: totalUsers,
        activeReferrals: activeUsers,
        commissionBalance: referrer.commissionBalance,
        totalEarnings: referrer.totalEarnings,
        todayEarnings: todayCommissions[0]?.total || 0,
        monthlyEarnings: monthlyCommissions[0]?.total || 0,
        commissionRate: referrer.commissionRate
      }
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

// Get Referred Users
app.get('/api/referral/users', authenticateReferrer, async (req, res) => {
  await connectToDatabase();
  
  try {
    const users = await User.find({ referredBy: req.referrer.id })
      .select('-password')
      .sort({ createdAt: -1 });

    const usersWithStats = await Promise.all(users.map(async (user) => {
      const stats = await ReferralStats.findOne({ 
        referrerId: req.referrer.id, 
        userId: user._id 
      });

      return {
        _id: user._id,
        email: user.email,
        phone: user.phone,
        balance: user.balance,
        createdAt: user.createdAt,
        totalGames: stats?.totalGames || 0,
        totalWins: stats?.totalWins || 0,
        totalWinAmount: stats?.totalWinAmount || 0,
        commissionEarned: stats?.commissionEarned || 0,
        lastActivity: stats?.lastActivity
      };
    }));

    res.json({ success: true, users: usersWithStats });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

// Get Commission History
app.get('/api/referral/commissions', authenticateReferrer, async (req, res) => {
  await connectToDatabase();
  
  try {
    const commissions = await CommissionTransaction.find({ 
      referrerId: req.referrer.id 
    })
      .populate('userId', 'email')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ success: true, commissions });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch commissions' });
  }
});

// Request Withdrawal
app.post('/api/referral/withdraw', authenticateReferrer, async (req, res) => {
  await connectToDatabase();
  
  try {
    const { amount } = req.body;
    const referrer = await Referrer.findById(req.referrer.id);

    const MIN_WITHDRAWAL = 50;

    if (!amount || amount < MIN_WITHDRAWAL) {
      return res.status(400).json({ 
        success: false, 
        error: `Minimum withdrawal is GHS ${MIN_WITHDRAWAL}` 
      });
    }

    if (referrer.commissionBalance < amount) {
      return res.status(400).json({ success: false, error: 'Insufficient balance' });
    }

    const withdrawal = new ReferrerWithdrawal({
      referrerId: referrer._id,
      amount,
      reference: `RWTD_${Date.now()}_${referrer._id}`,
      status: 'pending'
    });
    await withdrawal.save();

    try {
      await payloqaAPI.sendSMS(
        referrer.phone,
        `Withdrawal request: GHS ${amount.toFixed(2)} submitted. Pending admin approval. 📤`
      );
    } catch (smsError) {
      console.error('Withdrawal SMS failed:', smsError);
    }

    res.json({
      success: true,
      message: 'Withdrawal request submitted',
      withdrawal
    });
  } catch (error) {
    console.error('Withdrawal error:', error);
    res.status(500).json({ success: false, error: 'Failed to submit withdrawal' });
  }
});

// Get Withdrawal History
app.get('/api/referral/withdrawals', authenticateReferrer, async (req, res) => {
  await connectToDatabase();
  
  try {
    const withdrawals = await ReferrerWithdrawal.find({ 
      referrerId: req.referrer.id 
    }).sort({ createdAt: -1 });

    res.json({ success: true, withdrawals });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch withdrawals' });
  }
});

// ============================================================================
// ADMIN ROUTES - REFERRER MANAGEMENT
// ============================================================================

// Get All Referrers
app.get('/api/admin/referrers', authenticateToken, requireAdmin, async (req, res) => {
  await connectToDatabase();
  
  try {
    const referrers = await Referrer.find()
      .select('-password')
      .sort({ createdAt: -1 });

    const referrersWithStats = await Promise.all(referrers.map(async (ref) => {
      const totalUsers = await User.countDocuments({ referredBy: ref._id });
      const totalCommissions = await CommissionTransaction.aggregate([
        { $match: { referrerId: ref._id } },
        { $group: { _id: null, total: { $sum: '$commissionAmount' } } }
      ]);

      return {
        ...ref.toObject(),
        stats: {
          totalReferrals: totalUsers,
          totalCommissions: totalCommissions[0]?.total || 0
        }
      };
    }));

    res.json({ success: true, referrers: referrersWithStats });
  } catch (error) {
    console.error('Get referrers error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch referrers' });
  }
});

// Approve Referrer
app.post('/api/admin/approve-referrer', authenticateToken, requireAdmin, async (req, res) => {
  await connectToDatabase();
  
  try {
    const { referrerId } = req.body;

    const referrer = await Referrer.findById(referrerId);
    if (!referrer) {
      return res.status(404).json({ success: false, error: 'Referrer not found' });
    }

    if (referrer.isApproved) {
      return res.status(400).json({ success: false, error: 'Already approved' });
    }

    referrer.isApproved = true;
    referrer.approvedBy = req.user.id;
    referrer.approvedAt = new Date();
    await referrer.save();

    try {
      await payloqaAPI.sendSMS(
        referrer.phone,
        `Congratulations! Your referral account has been approved. Login now and start earning commissions! Your referral code: ${referrer.referralCode} 🎉`
      );
    } catch (smsError) {
      console.error('Approval SMS failed:', smsError);
    }

    res.json({
      success: true,
      message: 'Referrer approved successfully'
    });
  } catch (error) {
    console.error('Approve referrer error:', error);
    res.status(500).json({ success: false, error: 'Failed to approve referrer' });
  }
});

// Update Referrer Settings
app.put('/api/admin/referrer/:id', authenticateToken, requireAdmin, async (req, res) => {
  await connectToDatabase();
  
  try {
    const { commissionRate, isActive } = req.body;
    const referrer = await Referrer.findById(req.params.id);

    if (!referrer) {
      return res.status(404).json({ success: false, error: 'Referrer not found' });
    }

    if (commissionRate !== undefined) {
      referrer.commissionRate = commissionRate;
    }
    if (isActive !== undefined) {
      referrer.isActive = isActive;
    }

    await referrer.save();

    res.json({
      success: true,
      message: 'Referrer updated successfully',
      referrer
    });
  } catch (error) {
    console.error('Update referrer error:', error);
    res.status(500).json({ success: false, error: 'Failed to update referrer' });
  }
});

// Get Referrer Withdrawals (Admin)
app.get('/api/admin/referrer-withdrawals', authenticateToken, requireAdmin, async (req, res) => {
  await connectToDatabase();
  
  try {
    const withdrawals = await ReferrerWithdrawal.find()
      .populate('referrerId', 'name email phone')
      .sort({ createdAt: -1 });

    res.json({ success: true, withdrawals });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch withdrawals' });
  }
});

// Approve Referrer Withdrawal
app.post('/api/admin/approve-referrer-withdrawal', authenticateToken, requireAdmin, async (req, res) => {
  await connectToDatabase();
  
  try {
    const { withdrawalId } = req.body;

    const withdrawal = await ReferrerWithdrawal.findById(withdrawalId).populate('referrerId');
    if (!withdrawal) {
      return res.status(404).json({ success: false, error: 'Withdrawal not found' });
    }

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ success: false, error: 'Already processed' });
    }

    const referrer = withdrawal.referrerId;

    if (referrer.commissionBalance < withdrawal.amount) {
      return res.status(400).json({ success: false, error: 'Insufficient balance' });
    }

    referrer.commissionBalance -= withdrawal.amount;
    await referrer.save();

    withdrawal.status = 'approved';
    withdrawal.processedAt = new Date();
    withdrawal.processedBy = req.user.id;
    await withdrawal.save();

    try {
      await payloqaAPI.sendSMS(
        referrer.phone,
        `Your withdrawal of GHS ${withdrawal.amount.toFixed(2)} has been approved! Funds will be sent within 24 hours. 💰`
      );
    } catch (smsError) {
      console.error('Approval SMS failed:', smsError);
    }

    res.json({
      success: true,
      message: 'Withdrawal approved successfully'
    });
  } catch (error) {
    console.error('Approve withdrawal error:', error);
    res.status(500).json({ success: false, error: 'Failed to approve withdrawal' });
  }
});

// Reject Referrer Withdrawal
app.post('/api/admin/reject-referrer-withdrawal', authenticateToken, requireAdmin, async (req, res) => {
  await connectToDatabase();
  
  try {
    const { withdrawalId, reason } = req.body;

    const withdrawal = await ReferrerWithdrawal.findById(withdrawalId).populate('referrerId');
    if (!withdrawal) {
      return res.status(404).json({ success: false, error: 'Withdrawal not found' });
    }

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ success: false, error: 'Already processed' });
    }

    withdrawal.status = 'rejected';
    withdrawal.rejectionReason = reason || 'Rejected by admin';
    withdrawal.processedAt = new Date();
    withdrawal.processedBy = req.user.id;
    await withdrawal.save();

    try {
      await payloqaAPI.sendSMS(
        withdrawal.referrerId.phone,
        `Your withdrawal of GHS ${withdrawal.amount.toFixed(2)} was rejected. ${reason ? `Reason: ${reason}` : 'Contact support for details.'}`
      );
    } catch (smsError) {
      console.error('Rejection SMS failed:', smsError);
    }

    res.json({
      success: true,
      message: 'Withdrawal rejected'
    });
  } catch (error) {
    console.error('Reject withdrawal error:', error);
    res.status(500).json({ success: false, error: 'Failed to reject withdrawal' });
  }
});

// Get Referral System Stats (Admin)
app.get('/api/admin/referral-system-stats', authenticateToken, requireAdmin, async (req, res) => {
  await connectToDatabase();
  
  try {
    const totalReferrers = await Referrer.countDocuments();
    const approvedReferrers = await Referrer.countDocuments({ isApproved: true });
    const activeReferrers = await Referrer.countDocuments({ isApproved: true, isActive: true });
    
    const totalReferred = await User.countDocuments({ referredBy: { $ne: null } });
    
    const totalCommissions = await CommissionTransaction.aggregate([
      { $group: { _id: null, total: { $sum: '$commissionAmount' } } }
    ]);

    const pendingWithdrawals = await ReferrerWithdrawal.aggregate([
      { $match: { status: 'pending' } },
      { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$amount' } } }
    ]);

    res.json({
      success: true,
      stats: {
        totalReferrers,
        approvedReferrers,
        activeReferrers,
        totalReferred,
        totalCommissionsPaid: totalCommissions[0]?.total || 0,
        pendingWithdrawalsCount: pendingWithdrawals[0]?.count || 0,
        pendingWithdrawalsAmount: pendingWithdrawals[0]?.total || 0
      }
    });
  } catch (error) {
    console.error('System stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

// ============================================================================
// DATABASE CONNECTION & SERVER START
// ============================================================================

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lucky-triple';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 API: http://localhost:${PORT}/api`);
      console.log(`🌐 Webhook URL: ${process.env.BACKEND_URL || 'http://localhost:5000'}/api/payments/webhook`);
    });
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  });

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
});
