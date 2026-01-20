import { Request, Response, NextFunction } from 'express';
import prisma from '../db/client.js';
import { Role } from '../../../shared/types/user.types.js';

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.session.userId) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }

  // Populate req.user for permission checks
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.session.userId },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated',
      });
      return;
    }

    req.user = {
      id: user.id,
      role: user.role as Role,
    };
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication error',
    });
  }
}
