import { Router } from 'express';
import authService from '../services/auth.service.js';
import { LoginRequest } from '../../../shared/types/auth.types.js';
import { requireAuth } from '../middleware/auth.js';
import prisma from '../db/client.js';
import bcrypt from 'bcrypt';
import { SALT_ROUNDS } from '../config/constants.js';
import { ChangePasswordSchema, CreateUserSchema } from '../../../shared/validation/index.js';

const router = Router();

router.get('/setup-required', async (_req, res) => {
  try {
    const required = await authService.isSetupRequired();
    return res.json({
      success: true,
      setupRequired: required,
    });
  } catch (error) {
    console.error('Setup check error:', error);
    return res.status(500).json({
      success: false,
      error: 'Could not check setup status',
    });
  }
});

router.post('/register', async (req, res) => {
  try {
    // Validate input using existing CreateUserSchema
    const result = CreateUserSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error.issues[0].message,
      });
    }

    const { email, password } = result.data;

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Email address already registered',
      });
    }

    // Create user with auto-assigned role (ADMIN for first user, VIEWER otherwise)
    const user = await authService.createUserWithAutoRole(email, password);

    // Automatically log in the user by creating a session
    req.session.userId = user.id;

    return res.status(201).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred during registration',
    });
  }
});

router.post('/setup', async (req, res) => {
  try {
    // Security check: Only allow if no users exist
    const setupRequired = await authService.isSetupRequired();
    if (!setupRequired) {
      return res.status(403).json({
        success: false,
        error: 'Setup has already been completed',
      });
    }

    // Validate input using existing CreateUserSchema
    const result = CreateUserSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error.issues[0].message,
      });
    }

    const { email, password } = result.data;

    // Create the admin user
    const user = await authService.createUser(email, password);

    // Automatically log in the user by creating a session
    req.session.userId = user.id;

    return res.status(201).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Setup error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred during setup',
    });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body as LoginRequest;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password required',
      });
    }

    const user = await authService.validateCredentials(email, password);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    req.session.userId = user.id;

    return res.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred during login',
    });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        error: 'Could not log out',
      });
    }
    return res.json({ success: true });
  });
});

router.get('/me', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({
      success: false,
      error: 'Not authenticated',
    });
  }

  try {
    const user = await authService.getUserById(req.session.userId);
    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({
        success: false,
        error: 'User no longer exists',
      });
    }

    return res.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({
      success: false,
      error: 'Could not retrieve user',
    });
  }
});

// PUT /api/auth/password - Change password
router.put('/password', requireAuth, async (req, res) => {
  try {
    const result = ChangePasswordSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error.issues[0].message });
    }
    const { currentPassword, newPassword } = result.data;

    const user = await prisma.user.findUnique({ where: { id: req.session.userId } });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return res.status(400).json({ success: false, error: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await prisma.user.update({
      where: { id: req.session.userId },
      data: { password: hashedPassword },
    });

    return res.json({ success: true, message: 'Password updated' });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while changing password',
    });
  }
});

export default router;
