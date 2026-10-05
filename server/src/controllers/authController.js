import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import { env } from '../config/env.js';
import { recordAuditLog } from '../middlewares/auditLogger.js';

export const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    const user = await User.findOne({ username: username.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Contact compliance administrator.'
      });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        role: user.role
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    user.lastLogin = new Date();
    await user.save();

    await recordAuditLog({
      req,
      userId: user._id,
      username: user.username,
      userRole: user.role,
      action: 'USER_LOGIN_SUCCESS',
      entity: 'USER',
      entityId: user.username,
      previousValue: null,
      newValue: { loginTime: user.lastLogin }
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          lastLogin: user.lastLogin
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      user: {
        id: req.user._id,
        username: req.user.username,
        email: req.user.email,
        fullName: req.user.fullName,
        role: req.user.role,
        lastLogin: req.user.lastLogin
      }
    }
  });
};

export const logout = async (req, res) => {
  if (req.user) {
    await recordAuditLog({
      req,
      userId: req.user._id,
      username: req.user.username,
      userRole: req.user.role,
      action: 'USER_LOGOUT',
      entity: 'USER',
      entityId: req.user.username
    });
  }
  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
};

export const getUsers = async (req, res, next) => {
  try {
    const users = await User.find({ isActive: true })
      .select('_id username fullName role email')
      .sort({ fullName: 1 })
      .lean();

    res.status(200).json({
      success: true,
      data: users
    });
  } catch (err) {
    next(err);
  }
};
