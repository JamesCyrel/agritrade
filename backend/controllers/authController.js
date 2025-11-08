const User = require('../models/User');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');
const { OAuth2Client } = require('google-auth-library');

const getGoogleClientAudiences = () => {
  const audiences = [
    process.env.GOOGLE_WEB_CLIENT_ID,
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    process.env.GOOGLE_ANDROID_CLIENT_ID,
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
  ].filter(Boolean);

  if (!audiences.length) {
    console.warn('⚠️  Missing Google client IDs. Set GOOGLE_WEB_CLIENT_ID and/or EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (and Android variants).');
  }

  return audiences;
};

const googleClient = new OAuth2Client();

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

// Google Sign-In
exports.googleSignIn = async (req, res) => {
  try {
    const {
      id_token: idToken,
      credential,
      access_token: accessToken,
      user,
      role
    } = req.body;

    const tokenToVerify = idToken || credential;
    const audiences = getGoogleClientAudiences();

    let googleProfile = {
      email: user?.email,
      name: user?.name,
      email_verified: undefined
    };

    if (tokenToVerify) {
      if (!audiences.length) {
        return res.status(500).json({
          success: false,
          message: 'Google Sign-In is not configured on the server'
        });
      }

      let ticket;
      try {
        ticket = await googleClient.verifyIdToken({
          idToken: tokenToVerify,
          audience: audiences
        });
      } catch (verificationError) {
        console.error('Google ID token verification failed:', verificationError);
        return res.status(401).json({
          success: false,
          message: 'Invalid Google ID token'
        });
      }

      const payload = ticket.getPayload();
      googleProfile.email = payload?.email || googleProfile.email;
      googleProfile.name = payload?.name || googleProfile.name;
      googleProfile.email_verified = payload?.email_verified;
    } else if (accessToken) {
      // Fallback: verify Supabase access token
      const { data: supabaseUser, error: supabaseError } = await supabase.auth.getUser(accessToken);

      if (supabaseError || !supabaseUser?.user) {
        console.error('Supabase token verification error:', supabaseError);
        return res.status(401).json({
          success: false,
          message: 'Invalid authentication token'
        });
      }

      googleProfile.email = supabaseUser.user.email || googleProfile.email;
      googleProfile.name =
        supabaseUser.user.user_metadata?.full_name ||
        supabaseUser.user.user_metadata?.name ||
        googleProfile.name;
      googleProfile.email_verified = supabaseUser.user.email_confirmed_at ? true : googleProfile.email_verified;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Missing Google authentication token'
      });
    }

    if (!googleProfile.email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required for Google Sign-In'
      });
    }

    if (googleProfile.email_verified === false) {
      return res.status(401).json({
        success: false,
        message: 'Email address is not verified with Google'
      });
    }

    // Check if user already exists
    let dbUser = await User.findByEmailOrPhone(googleProfile.email, null);

    if (dbUser) {
      // User exists, generate token and return
      const token = generateToken(dbUser.user_id, dbUser.role);

      return res.json({
        success: true,
        message: 'Login successful',
        data: {
          token,
          user: {
            user_id: dbUser.user_id,
            email: dbUser.email,
            phone: dbUser.phone,
            role: dbUser.role,
            verification_status: dbUser.verification_status
          },
          redirectPath: getRedirectPath(dbUser.role)
        }
      });
    }

    // User doesn't exist, create new user
    // If role is provided (from signup), use it; otherwise default to CONSUMER
    const userRole = role && ['CONSUMER', 'FARMER', 'ADMIN'].includes(role) ? role : 'CONSUMER';

    try {
      dbUser = await User.createOAuthUser({
        email: googleProfile.email,
        phone: null,
        role: userRole,
        full_name: googleProfile.name || null,
      });

      // Generate token
      const token = generateToken(dbUser.user_id, dbUser.role);

      return res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          token,
          user: {
            user_id: dbUser.user_id,
            email: dbUser.email,
            phone: dbUser.phone,
            role: dbUser.role
          },
          redirectPath: getRedirectPath(dbUser.role)
        }
      });
    } catch (createError) {
      console.error('Error creating OAuth user:', createError);
      
      if (createError.message === 'Email already exists') {
        // Race condition: user was created between check and create
        // Try to find the user again
        dbUser = await User.findByEmailOrPhone(user.email, null);
        if (dbUser) {
          const token = generateToken(dbUser.user_id, dbUser.role);
          return res.json({
            success: true,
            message: 'Login successful',
            data: {
              token,
              user: {
                user_id: dbUser.user_id,
                email: dbUser.email,
                phone: dbUser.phone,
                role: dbUser.role,
                verification_status: dbUser.verification_status
              },
              redirectPath: getRedirectPath(dbUser.role)
            }
          });
        }
      }

      throw createError;
    }
  } catch (error) {
    console.error('Google Sign-In error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

