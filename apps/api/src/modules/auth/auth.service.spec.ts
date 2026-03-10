import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { AuthService } from './services/auth.service';

vi.mock('argon2', () => ({
  hash: vi.fn(),
  verify: vi.fn(),
}));

describe('AuthService', () => {
  let authService: AuthService;

  const mockPrisma = {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };

  const mockJwtService = {
    sign: vi.fn().mockReturnValue('mock-access-token'),
  };

  const mockConfigService = {
    getOrThrow: vi.fn().mockReturnValue('test-access-secret'),
    get: vi.fn().mockImplementation((key: string, defaultVal?: string) => {
      if (key === 'JWT_ACCESS_EXPIRES_IN') return '15m';
      if (key === 'JWT_REFRESH_EXPIRES_IN') return '7';
      return defaultVal;
    }),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Re-apply default implementations after clearAllMocks
    mockJwtService.sign.mockReturnValue('mock-access-token');
    mockConfigService.getOrThrow.mockReturnValue('test-access-secret');
    mockConfigService.get.mockImplementation((key: string, defaultVal?: string) => {
      if (key === 'JWT_ACCESS_EXPIRES_IN') return '15m';
      if (key === 'JWT_REFRESH_EXPIRES_IN') return '7';
      return defaultVal;
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    authService = new AuthService(mockPrisma as any, mockJwtService as any, mockConfigService as any);
  });

  describe('login', () => {
    const email = 'user@example.com';
    const password = 'securePassword123';
    const userId = 'user-uuid-1234';

    it('should return tokens for valid credentials', async () => {
      const mockUser = {
        id: userId,
        email,
        displayName: 'Test User',
        passwordHash: 'hashed-password',
        isActive: true,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      vi.mocked(argon2.verify).mockResolvedValue(true);
      mockPrisma.user.update.mockResolvedValue(mockUser);
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const result = await authService.login(email, password);

      expect(result).toEqual({
        accessToken: 'mock-access-token',
        refreshToken: expect.any(String),
        user: {
          id: userId,
          email,
          displayName: 'Test User',
        },
      });

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email },
        select: {
          id: true,
          email: true,
          displayName: true,
          passwordHash: true,
          isActive: true,
        },
      });

      expect(argon2.verify).toHaveBeenCalledWith('hashed-password', password);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        email,
        displayName: 'Test User',
        passwordHash: 'hashed-password',
        isActive: true,
      });
      vi.mocked(argon2.verify).mockResolvedValue(false);

      await expect(authService.login(email, password)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(authService.login(email, password)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        email,
        displayName: 'Test User',
        passwordHash: 'hashed-password',
        isActive: false,
      });

      await expect(authService.login(email, password)).rejects.toThrow(UnauthorizedException);
      expect(argon2.verify).not.toHaveBeenCalled();
    });
  });

  describe('register', () => {
    const email = 'newuser@example.com';
    const password = 'securePassword123';
    const displayName = 'New User';

    it('should create a user and return user data', async () => {
      const createdUser = { id: 'new-user-uuid', email, displayName };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      vi.mocked(argon2.hash).mockResolvedValue('argon2-hashed-password');
      mockPrisma.user.create.mockResolvedValue(createdUser);

      const result = await authService.register(email, password, displayName);

      expect(result).toEqual(createdUser);
      expect(argon2.hash).toHaveBeenCalledWith(password);
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: { email, passwordHash: 'argon2-hashed-password', displayName },
        select: { id: true, email: true, displayName: true },
      });
    });

    it('should throw ConflictException for duplicate email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing', email });

      await expect(authService.register(email, password, displayName)).rejects.toThrow(
        ConflictException,
      );
      expect(argon2.hash).not.toHaveBeenCalled();
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });
  });
});
