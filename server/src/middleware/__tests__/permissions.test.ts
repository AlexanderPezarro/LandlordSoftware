// server/src/middleware/__tests__/permissions.test.ts
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Request, Response } from 'express';
import { Role } from '@prisma/client';
import { requireRole, requireWrite, requireAdmin } from '../permissions';

// Extend Request type to include user property
interface RequestWithUser extends Request {
  user?: {
    id: number;
    role: Role;
  };
}

describe('Permissions Middleware', () => {
  let mockRequest: Partial<RequestWithUser>;
  let mockResponse: Partial<Response>;
  let nextFunction: ReturnType<typeof jest.fn>;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis() as any,
      json: jest.fn() as any,
    };
    nextFunction = jest.fn();
  });

  describe('requireRole', () => {
    it('should allow ADMIN to access ADMIN routes', () => {
      mockRequest.user = { id: 1, role: Role.ADMIN };
      const middleware = requireRole(Role.ADMIN);

      middleware(mockRequest as RequestWithUser, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow ADMIN to access LANDLORD routes', () => {
      mockRequest.user = { id: 1, role: Role.ADMIN };
      const middleware = requireRole(Role.LANDLORD);

      middleware(mockRequest as RequestWithUser, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should allow ADMIN to access VIEWER routes', () => {
      mockRequest.user = { id: 1, role: Role.ADMIN };
      const middleware = requireRole(Role.VIEWER);

      middleware(mockRequest as RequestWithUser, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should allow LANDLORD to access LANDLORD routes', () => {
      mockRequest.user = { id: 2, role: Role.LANDLORD };
      const middleware = requireRole(Role.LANDLORD);

      middleware(mockRequest as RequestWithUser, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should allow LANDLORD to access VIEWER routes', () => {
      mockRequest.user = { id: 2, role: Role.LANDLORD };
      const middleware = requireRole(Role.VIEWER);

      middleware(mockRequest as RequestWithUser, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should not allow LANDLORD to access ADMIN routes', () => {
      mockRequest.user = { id: 2, role: Role.LANDLORD };
      const middleware = requireRole(Role.ADMIN);

      middleware(mockRequest as RequestWithUser, mockResponse as Response, nextFunction);

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Insufficient permissions. Required role: ADMIN',
      });
    });

    it('should allow VIEWER to access VIEWER routes', () => {
      mockRequest.user = { id: 3, role: Role.VIEWER };
      const middleware = requireRole(Role.VIEWER);

      middleware(mockRequest as RequestWithUser, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should not allow VIEWER to access LANDLORD routes', () => {
      mockRequest.user = { id: 3, role: Role.VIEWER };
      const middleware = requireRole(Role.LANDLORD);

      middleware(mockRequest as RequestWithUser, mockResponse as Response, nextFunction);

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Insufficient permissions. Required role: LANDLORD',
      });
    });

    it('should not allow VIEWER to access ADMIN routes', () => {
      mockRequest.user = { id: 3, role: Role.VIEWER };
      const middleware = requireRole(Role.ADMIN);

      middleware(mockRequest as RequestWithUser, mockResponse as Response, nextFunction);

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Insufficient permissions. Required role: ADMIN',
      });
    });

    it('should return 401 if user is not authenticated', () => {
      mockRequest.user = undefined;
      const middleware = requireRole(Role.VIEWER);

      middleware(mockRequest as RequestWithUser, mockResponse as Response, nextFunction);

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Not authenticated',
      });
    });
  });

  describe('requireWrite', () => {
    it('should allow ADMIN to access write routes', () => {
      mockRequest.user = { id: 1, role: Role.ADMIN };
      const middleware = requireWrite();

      middleware(mockRequest as RequestWithUser, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should allow LANDLORD to access write routes', () => {
      mockRequest.user = { id: 2, role: Role.LANDLORD };
      const middleware = requireWrite();

      middleware(mockRequest as RequestWithUser, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should not allow VIEWER to access write routes', () => {
      mockRequest.user = { id: 3, role: Role.VIEWER };
      const middleware = requireWrite();

      middleware(mockRequest as RequestWithUser, mockResponse as Response, nextFunction);

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Insufficient permissions. Required role: LANDLORD',
      });
    });
  });

  describe('requireAdmin', () => {
    it('should allow ADMIN to access admin routes', () => {
      mockRequest.user = { id: 1, role: Role.ADMIN };
      const middleware = requireAdmin();

      middleware(mockRequest as RequestWithUser, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should not allow LANDLORD to access admin routes', () => {
      mockRequest.user = { id: 2, role: Role.LANDLORD };
      const middleware = requireAdmin();

      middleware(mockRequest as RequestWithUser, mockResponse as Response, nextFunction);

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Insufficient permissions. Required role: ADMIN',
      });
    });

    it('should not allow VIEWER to access admin routes', () => {
      mockRequest.user = { id: 3, role: Role.VIEWER };
      const middleware = requireAdmin();

      middleware(mockRequest as RequestWithUser, mockResponse as Response, nextFunction);

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });
  });
});
