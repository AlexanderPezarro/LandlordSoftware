import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import prisma from '../db/client.js';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { SALT_ROUNDS } from '../config/constants.js';
import { CreateUserSchema } from '../../../shared/validation/index.js';

const router = Router();

// GET /api/users - List all users
router.get('/', requireAuth, async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ success: true, users });
  } catch (error) {
    console.error('Get users error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while fetching users',
    });
  }
});

// POST /api/users - Create new user
router.post('/', requireAuth, async (req, res) => {
  try {
    const result = CreateUserSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error.issues[0].message });
    }
    const { email, password } = result.data;

    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ success: false, error: 'Email already in use' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await prisma.user.create({
      data: { email, password: hashedPassword },
      select: { id: true, email: true, createdAt: true },
    });
    return res.status(201).json({ success: true, user });
  } catch (error) {
    console.error('Create user error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while creating user',
    });
  }
});

// DELETE /api/users/:id - Delete user
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate UUID format
    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID format',
      });
    }

    // Prevent self-delete
    if (req.session.userId === id) {
      return res.status(400).json({ success: false, error: 'Cannot delete yourself' });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    await prisma.user.delete({ where: { id } });
    return res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while deleting user',
    });
  }
});

export default router;
