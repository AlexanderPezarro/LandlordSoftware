// server/src/middleware/__tests__/permissions.test.ts
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { requireRole, requireWrite, requireAdmin } from '../permissions.js';

describe('Permissions Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn(() => ({ json: jsonMock }));
    mockNext = jest.fn();

    mockReq = {};
    mockRes = {
      status: statusMock as any,
    };
  });

  describe('requireRole', () => {
    describe('unauthenticated requests', () => {
      it('should return 401 if user is not authenticated', () => {
        const middleware = requireRole(Role.VIEWER);
        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(statusMock).toHaveBeenCalledWith(401);
        expect(jsonMock).toHaveBeenCalledWith({
          success: false,
          error: 'Not authenticated'
        });
        expect(mockNext).not.toHaveBeenCalled();
      });
    });

    describe('role hierarchy - ADMIN (level 3)', () => {
      beforeEach(() => {
        mockReq.user = { id: '1', email: 'admin@test.com', role: Role.ADMIN };
      });

      it('should allow ADMIN to access ADMIN routes', () => {
        const middleware = requireRole(Role.ADMIN);
        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(statusMock).not.toHaveBeenCalled();
      });

      it('should allow ADMIN to access LANDLORD routes', () => {
        const middleware = requireRole(Role.LANDLORD);
        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(statusMock).not.toHaveBeenCalled();
      });

      it('should allow ADMIN to access VIEWER routes', () => {
        const middleware = requireRole(Role.VIEWER);
        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(statusMock).not.toHaveBeenCalled();
      });
    });

    describe('role hierarchy - LANDLORD (level 2)', () => {
      beforeEach(() => {
        mockReq.user = { id: '2', email: 'landlord@test.com', role: Role.LANDLORD };
      });

      it('should block LANDLORD from ADMIN routes', () => {
        const middleware = requireRole(Role.ADMIN);
        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(statusMock).toHaveBeenCalledWith(403);
        expect(jsonMock).toHaveBeenCalledWith({
          success: false,
          error: 'Insufficient permissions. Required role: ADMIN'
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should allow LANDLORD to access LANDLORD routes', () => {
        const middleware = requireRole(Role.LANDLORD);
        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(statusMock).not.toHaveBeenCalled();
      });

      it('should allow LANDLORD to access VIEWER routes', () => {
        const middleware = requireRole(Role.VIEWER);
        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(statusMock).not.toHaveBeenCalled();
      });
    });

    describe('role hierarchy - VIEWER (level 1)', () => {
      beforeEach(() => {
        mockReq.user = { id: '3', email: 'viewer@test.com', role: Role.VIEWER };
      });

      it('should block VIEWER from ADMIN routes', () => {
        const middleware = requireRole(Role.ADMIN);
        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(statusMock).toHaveBeenCalledWith(403);
        expect(jsonMock).toHaveBeenCalledWith({
          success: false,
          error: 'Insufficient permissions. Required role: ADMIN'
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should block VIEWER from LANDLORD routes', () => {
        const middleware = requireRole(Role.LANDLORD);
        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(statusMock).toHaveBeenCalledWith(403);
        expect(jsonMock).toHaveBeenCalledWith({
          success: false,
          error: 'Insufficient permissions. Required role: LANDLORD'
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should allow VIEWER to access VIEWER routes', () => {
        const middleware = requireRole(Role.VIEWER);
        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(statusMock).not.toHaveBeenCalled();
      });
    });
  });

  describe('requireWrite', () => {
    it('should allow ADMIN users', () => {
      mockReq.user = { id: '1', email: 'admin@test.com', role: Role.ADMIN };
      const middleware = requireWrite();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should allow LANDLORD users', () => {
      mockReq.user = { id: '2', email: 'landlord@test.com', role: Role.LANDLORD };
      const middleware = requireWrite();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should block VIEWER users', () => {
      mockReq.user = { id: '3', email: 'viewer@test.com', role: Role.VIEWER };
      const middleware = requireWrite();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Insufficient permissions. Required role: LANDLORD'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for unauthenticated users', () => {
      const middleware = requireWrite();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Not authenticated'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireAdmin', () => {
    it('should allow ADMIN users', () => {
      mockReq.user = { id: '1', email: 'admin@test.com', role: Role.ADMIN };
      const middleware = requireAdmin();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should block LANDLORD users', () => {
      mockReq.user = { id: '2', email: 'landlord@test.com', role: Role.LANDLORD };
      const middleware = requireAdmin();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Insufficient permissions. Required role: ADMIN'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should block VIEWER users', () => {
      mockReq.user = { id: '3', email: 'viewer@test.com', role: Role.VIEWER };
      const middleware = requireAdmin();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Insufficient permissions. Required role: ADMIN'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for unauthenticated users', () => {
      const middleware = requireAdmin();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Not authenticated'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
