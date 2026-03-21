const functions = require('firebase-functions');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');

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
  sendSMS: async (phone, message) => {
    try {
      let formattedPhone = phone.replace(/\D/g, '');
      if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+' + formattedPhone;
      }
      
      console.log('📱 Sending SMS to:', formattedPhone);
      console.log('📱 Message:', message);

      const response = await axios.post(
        `${PAYLOQA_CONFIG.smsBaseURL}/sms/send`,
        {
          recipient_number: formattedPhone,
          sender_id: 'LuckyTriple',
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
      
      if (error.response?.data?.error === 'INSUFFICIENT_BALANCE') {
        console.error('⚠️ Payloqa wallet has insufficient balance!');
      } else if (error.response?.data?.error === 'INVALID_PHONE_NUMBER') {
        console.error('⚠️ Invalid phone number format:', phone);
      } else if (error.response?.data?.error === 'SERVICE_ACCESS_DENIED') {
        console.error('⚠️ SMS permission not granted. Contact Payloqa support.');
      }
      
      return { success: false, error: error.response?.data?.error };
    }
  },

  sendBulkSMS: async (phones, message) => {
    try {
      console.log(`📱 Sending bulk SMS to ${phones.length} recipients`);
      
      const results = [];
      
      for (const phone of phones) {
        try {
          const result = await payloqaAPI.sendSMS(phone, message);
          results.push({ phone, success: result.success });
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Failed to send SMS to ${phone}:`, error);
          results.push({ phone, success: false });
        }
      }
      
      const successCount = results.filter(r => r.success).length;
      console.log(`✅ Bulk SMS complete: ${successCount}/${phones.length} sent successfully`);
      
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

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  balance: { type: Number, default: 0 },
  isAdmin: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date }
});

const User = mongoose.model('User', userSchema);

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

const smsLogSchema = new mongoose.Schema({
  phones: { type: [String], required: true },
  message: { type: String, required: true },
  status: { type: String, enum: ['sent', 'failed'], required: true },
  sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  response: { type: Object },
  createdAt: { type: Date, default: Date.now }
});

const SMSLog = mongoose.model('SMSLog', smsLogSchema);

const gameSettingsSchema = new mongoose.Schema({
  houseFee: { type: Number, default: 10 },
  maxBet: { type: Number, default: 1000 },
  minBet: { type: Number, default: 1 },
  payoutMultipliers: {
    threeMatches: { type: Number, default: 100 },
    twoMatches: { type: Number, default: 10 },
    oneMatch: { type: Number, default: 2 }
  },
  updatedAt: { type: Date, default: Date.now },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const GameSettings = mongoose.model('GameSettings', gameSettingsSchema);

// ============================================================================
// MONGODB CONNECTION
// ============================================================================

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://waste_express:WaStEeXpReSs@cluster1.egrqlyu.mongodb.net/lucky_triple?retryWrites=true&w=majority&appName=Cluster1';
const JWT_SECRET = process.env.JWT_SECRET || 'myGameSecret123XYZ999';

let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb && mongoose.connection.readyState === 1) {
    console.log('Using cached database connection');
    return cachedDb;
  }

  try {
    console.log('Creating new database connection');
    const connection = await mongoose.connect(MONGODB_URI);
    cachedDb = connection;
    console.log('✅ Connected to MongoDB');
    return cachedDb;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
}

// ============================================================================
// MIDDLEWARE - AUTH
// ============================================================================

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
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

// ============================================================================
// ROUTES - AUTHENTICATION
// ============================================================================

app.post('/api/auth/signup', async (req, res) => {
  await connectToDatabase();
  
  try {
    const { email, password, phone } = req.body;

    if (!email || !password || !phone) {
      return res.status(400).json({ success: false, error: 'All fields are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      email,
      password: hashedPassword,
      phone,
      isAdmin: email.toLowerCase().includes('admin')
    });

    await user.save();

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

app.post('/api/auth/login', async (req, res) => {
  await connectToDatabase();
  
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ success: false, error: 'Invalid credentials' });
    }

    user.lastLogin = new Date();
    await user.save();

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
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  await connectToDatabase();
  
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

app.post('/api/payments/webhook', async (req, res) => {
  await connectToDatabase();
  
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

app.post('/api/withdrawals/request', authenticateToken, async (req, res) => {
  await connectToDatabase();
  
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

    try {
      await payloqaAPI.sendSMS(
        user.phone,
        `Your withdrawal request of GHS ${amount.toFixed(2)} has been submitted and is pending admin approval. You'll receive another SMS once processed. 📤`
      );
      console.log('✅ Withdrawal request SMS sent to user');
    } catch (smsError) {
      console.error('❌ User SMS failed:', smsError);
    }

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

app.get('/api/withdrawals/my-withdrawals', authenticateToken, async (req, res) => {
  await connectToDatabase();
  
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

app.post('/api/game/play', authenticateToken, async (req, res) => {
  await connectToDatabase();
  
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

    const winningNumbers = [
      Math.floor(Math.random() * 10),
      Math.floor(Math.random() * 10),
      Math.floor(Math.random() * 10)
    ];

    let matches = 0;
    guesses.forEach((guess, i) => {
      if (parseInt(guess) === winningNumbers[i]) matches++;
    });

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
      guesses,
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
    }

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

app.get('/api/game/history', authenticateToken, async (req, res) => {
  await connectToDatabase();
  
  try {
    const history = await GameHistory.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ success: true, history });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch game history' });
  }
});

app.get('/api/game/settings', async (req, res) => {
  await connectToDatabase();
  
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
// ROUTES - ADMIN
// ============================================================================

app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  await connectToDatabase();
  
  try {
    const users = await User.find({ isAdmin: false })
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

app.post('/api/admin/credit-user', authenticateToken, requireAdmin, async (req, res) => {
  await connectToDatabase();
  
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
      await payloqaAPI.sendSMS(
        user.phone,
        `Your account has been credited with GHS ${amount.toFixed(2)}! ${reason ? `Reason: ${reason}` : ''} New balance: GHS ${user.balance.toFixed(2)} 🎁`
      );
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

app.get('/api/admin/withdrawals', authenticateToken, requireAdmin, async (req, res) => {
  await connectToDatabase();
  
  try {
    const withdrawals = await Transaction.find({ type: 'withdrawal' })
      .populate('userId', 'email phone')
      .sort({ createdAt: -1 });

    res.json({ success: true, withdrawals });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch withdrawals' });
  }
});

app.post('/api/admin/approve-withdrawal', authenticateToken, requireAdmin, async (req, res) => {
  await connectToDatabase();
  
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
      await payloqaAPI.sendSMS(
        user.phone,
        `Your withdrawal request of GHS ${transaction.amount.toFixed(2)} has been approved! The funds will be sent to your account within 24 hours. 💰`
      );
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

app.post('/api/admin/reject-withdrawal', authenticateToken, requireAdmin, async (req, res) => {
  await connectToDatabase();
  
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
      await payloqaAPI.sendSMS(
        transaction.userId.phone,
        `Your withdrawal request of GHS ${transaction.amount.toFixed(2)} has been rejected. ${reason ? `Reason: ${reason}` : 'Please contact support for more information.'}`
      );
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

app.put('/api/admin/game-settings', authenticateToken, requireAdmin, async (req, res) => {
  await connectToDatabase();
  
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

app.post('/api/admin/send-sms', authenticateToken, requireAdmin, async (req, res) => {
  await connectToDatabase();
  
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

app.post('/api/admin/send-sms-all', authenticateToken, requireAdmin, async (req, res) => {
  await connectToDatabase();
  
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

app.get('/api/admin/sms-logs', authenticateToken, requireAdmin, async (req, res) => {
  await connectToDatabase();
  
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

app.get('/api/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
  await connectToDatabase();
  
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

// ============================================================================
// EXPORT FIREBASE CLOUD FUNCTION
// ============================================================================

exports.api = functions.https.onRequest(async (req, res) => {
  await connectToDatabase();
  return app(req, res);
});