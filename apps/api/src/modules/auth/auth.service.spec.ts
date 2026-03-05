import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    passwordHash: '',
    firstName: 'John',
    lastName: 'Doe',
    role: 'ADMIN',
    tenantId: 'tenant-123',
    isActive: true,
    lastLoginAt: null,
    createdAt: new Date(),
    tenant: {
      id: 'tenant-123',
      slug: 'test-tenant',
      name: 'Test Tenant',
      isActive: true,
      plan: 'PRO',
    },
  };

  const mockPrismaService = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-token'),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        JWT_ACCESS_SECRET: 'test-secret',
        JWT_REFRESH_SECRET: 'test-refresh-secret',
        JWT_ACCESS_EXPIRES: '15m',
        JWT_REFRESH_EXPIRES: '7d',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const passwordHash = await bcrypt.hash('ValidPassword123!', 12);
    mockUser.passwordHash = passwordHash;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  it('devrait être défini', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('devrait authentifier un utilisateur avec des credentials valides', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(mockUser);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.refreshToken.create.mockResolvedValue({
        id: 'token-id',
        token: 'mock-refresh-token',
      });

      const result = await service.login({
        email: 'test@example.com',
        password: 'ValidPassword123!',
      });

      expect(result.response.accessToken).toBeDefined();
      expect(result.response.user.email).toBe('test@example.com');
      expect(result.refreshToken).toBeDefined();
    });

    it('devrait rejeter un email invalide', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'invalid@example.com',
          password: 'password',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('devrait rejeter un mot de passe invalide', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'wrong-password',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('devrait rejeter un utilisateur désactivé', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'ValidPassword123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('devrait rejeter un tenant désactivé', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({
        ...mockUser,
        tenant: { ...mockUser.tenant, isActive: false },
      });

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'ValidPassword123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshAccessToken', () => {
    it('devrait rejeter un token de refresh invalide', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshAccessToken('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('devrait rejeter un token de refresh révoqué', async () => {
      mockJwtService.verify.mockReturnValue({
        sub: 'user-123',
        tenantId: 'tenant-123',
        tokenId: 'token-123',
      });
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refreshAccessToken('valid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('devrait supprimer le refresh token', async () => {
      mockJwtService.verify.mockReturnValue({
        sub: 'user-123',
        tenantId: 'tenant-123',
        tokenId: 'token-123',
      });
      mockPrismaService.refreshToken.delete.mockResolvedValue({});

      await service.logout('valid-refresh-token');

      expect(mockPrismaService.refreshToken.delete).toHaveBeenCalledWith({
        where: { id: 'token-123' },
      });
    });
  });

  describe('logoutAll', () => {
    it('devrait supprimer tous les refresh tokens d\'un utilisateur', async () => {
      mockPrismaService.refreshToken.deleteMany.mockResolvedValue({ count: 3 });

      await service.logoutAll('user-123');

      expect(mockPrismaService.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      });
    });
  });

  describe('hashPassword', () => {
    it('devrait hasher un mot de passe correctement', async () => {
      const password = 'TestPassword123!';
      const hash = await service.hashPassword(password);

      expect(hash).not.toBe(password);
      expect(await bcrypt.compare(password, hash)).toBe(true);
    });
  });
});
