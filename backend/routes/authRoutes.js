const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // यहाँ स्पेलिंग और केस बिल्कुल सही है
const { protect } = require('../middleware/auth');
const router = express.Router();

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body || {};
    if (typeof name !== 'string' || !name.trim() || typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }

    const user = await User.create({ name, email, password, phone, role: 'guest' });
    res.status(201).json({
      _id: user._id, name: user.name, email: user.email, role: user.role,
      token: generateToken(user._id)
    });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Email already registered' });
    if (err.name === 'ValidationError') return res.status(400).json({ message: err.message });
    res.status(500).json({ message: 'Unable to register account' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (user && (await user.comparePassword(password))) {
      res.json({
        _id: user._id, name: user.name, email: user.email, role: user.role,
        token: generateToken(user._id)
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Unable to log in' });
  }
});

router.get('/me', protect, async (req, res) => {
  res.json(req.user);
});

router.put('/me', protect, async (req, res) => {
  try {
    const { name, phone } = req.body || {};
    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 80) {
      return res.status(400).json({ message: 'Name must be between 2 and 80 characters' });
    }
    if (phone !== undefined && (typeof phone !== 'string' || phone.length > 30)) {
      return res.status(400).json({ message: 'Phone number must be under 30 characters' });
    }
    const user = await User.findByIdAndUpdate(req.user._id, { name: name.trim(), phone: (phone || '').trim() }, { new: true, runValidators: true }).select('-password');
    res.json(user);
  } catch (err) {
    res.status(400).json({ message: 'Unable to update profile' });
  }
});

module.exports = router;
