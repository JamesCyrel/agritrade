const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Generate JWT token
const generateToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Determine redirect path based on role
const getRedirectPath = (role) => {
  const roleMap = {
    'CONSUMER': '/consumer/home',
    'FARMER': '/farmer/home',
    'ADMIN': '/admin/home'
  };
  return roleMap[role] || '/consumer/home';
};

// Register/Signup
exports.signup = async (req, res) => {
  try {
    const { email, phone, password, role } = req.body;

    // Validation
    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        message: 'Email or phone number is required'
      });
    }

    if (!password || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }

    if (!['CONSUMER', 'FARMER', 'ADMIN'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be CONSUMER, FARMER, or ADMIN'
      });
    }

    // Check if user already exists
    const existingUser = await User.findByEmailOrPhone(email, phone);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email or phone already exists'
      });
    }

    // Create user
    const user = await User.create({
      email: email || null,
      phone: phone || null,
      password,
      role
    });

    // Generate token
    const token = generateToken(user.user_id, user.role);

    // Return success response with redirect path
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        token,
        user: {
          user_id: user.user_id,
          email: user.email,
          phone: user.phone,
          role: user.role
        },
        redirectPath: getRedirectPath(user.role)
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    
    if (error.message === 'Email already exists' || error.message === 'Phone number already exists') {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const { email, phone, password } = req.body;

    // Validation
    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        message: 'Email or phone number is required'
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required'
      });
    }

    // Find user
    const user = await User.findByEmailOrPhone(email, phone);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email/phone or password'
      });
    }

    // Verify password
    const isPasswordValid = await User.verifyPassword(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email/phone or password'
      });
    }

    // Generate token
    const token = generateToken(user.user_id, user.role);

    // Return success response with redirect path
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          user_id: user.user_id,
          email: user.email,
          phone: user.phone,
          role: user.role,
          verification_status: user.verification_status
        },
        redirectPath: getRedirectPath(user.role)
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Verify token (for protected routes)
exports.verifyToken = (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    res.json({
      success: true,
      data: {
        userId: decoded.userId,
        role: decoded.role
      }
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

