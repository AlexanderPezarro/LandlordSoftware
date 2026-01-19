// server/src/middleware/permissions.ts
import { Request, Response, NextFunction } from 'express';
import { Role, Roles } from '../../../shared/types/user.types.js';

// Role hierarchy mapping
const roleHierarchy: Record<Role, number> = {
  [Roles.ADMIN]: 3,
  [Roles.LANDLORD]: 2,
  [Roles.VIEWER]: 1,
};

// Check if user has at least the required role level
export const requireRole = (requiredRole: Role) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
      return;
    }

    const userRoleLevel = roleHierarchy[req.user.role];
    const requiredRoleLevel = roleHierarchy[requiredRole];

    if (userRoleLevel >= requiredRoleLevel) {
      next();
    } else {
      res.status(403).json({
        success: false,
        error: `Insufficient permissions. Required role: ${requiredRole}`
      });
    }
  };
};

// Require LANDLORD or ADMIN (no VIEWER)
export const requireWrite = () => requireRole(Roles.LANDLORD);

// Require ADMIN only
export const requireAdmin = () => requireRole(Roles.ADMIN);
