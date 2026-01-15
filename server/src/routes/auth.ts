import { Router } from 'express';
import authService from '../services/auth.service.js';
import { LoginRequest } from '../../../shared/types/auth.types.js';
import { requireAuth } from '../middleware/auth.js';
import prisma from '../db/client.js';
import bcrypt from 'bcrypt';
import { z } from 'zod';

const router = Router();

const SALT_ROUNDS = 10;

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
    const schema = z.object({
      currentPassword: z.string().min(1, 'Current password is required'),
      newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    });
    const result = schema.safeParse(req.body);
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
