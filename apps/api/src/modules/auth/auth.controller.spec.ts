import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response, Request } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuditService } from '../audit/audit.service';
import { TenantsService } from '../tenants/tenants.service';
import { LoginDto, KeycloakLoginDto } from './dto';
import type { AuthenticatedUser } from './interfaces';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;
  let auditService: AuditService;

  const mockAuthResponse = {
    accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
    user: {
      id: 'user-1',
      email: 'admin@anexys.fr',
      firstName: 'Admin',
      lastName: 'User',
      role: 'SUPER_ADMIN',
      tenantId: 'tenant-1',
      tenantSlug: 'anexys',
    },
  };

  const mockAuthService = {
    login: jest.fn().mockResolvedValue({
      response: mockAuthResponse,
      refreshToken: 'refresh-token-123',
    }),
    loginWithKeycloak: jest.fn().mockResolvedValue({
      response: mockAuthResponse,
      refreshToken: 'refresh-token-kc',
    }),
    refreshAccessToken: jest.fn().mockResolvedValue({ accessToken: mockAuthResponse.accessToken }),
    logout: jest.fn().mockResolvedValue(undefined),
    logoutAll: jest.fn().mockResolvedValue(undefined),
  };

  const mockAuditService = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  const mockTenantsService = {
    create: jest.fn(),
    createUser: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue(undefined),
  };

  const mockResponse = {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  } as unknown as Response;

  const mockRequest = {
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' },
    get: jest.fn().mockReturnValue('test-agent'),
    cookies: {} as Record<string, string>,
  } as unknown as Request;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockRequest.cookies = {};

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: AuditService, useValue: mockAuditService },
        { provide: TenantsService, useValue: mockTenantsService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    auditService = module.get<AuditService>(AuditService);
  });

  describe('POST /auth/login', () => {
    it('retourne 200 et accessToken + user avec credentials valides', async () => {
      const dto: LoginDto = { email: 'admin@anexys.fr', password: 'MotDePasse123!' };
      const result = await controller.login(dto, mockResponse, mockRequest);

      expect(result).toEqual(mockAuthResponse);
      expect(result.accessToken).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(dto.email);
      expect(result.user.id).toBeDefined();
      expect(authService.login).toHaveBeenCalledWith(dto);
      expect(mockResponse.cookie).toHaveBeenCalled();
      expect(auditService.log).toHaveBeenCalled();
    });

    it('retourne 401 si AuthService lance UnauthorizedException', async () => {
      mockAuthService.login.mockRejectedValueOnce(new UnauthorizedException('Email ou mot de passe incorrect'));

      await expect(
        controller.login(
          { email: 'bad@test.fr', password: 'wrong' } as LoginDto,
          mockResponse,
          mockRequest,
        ),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockResponse.cookie).not.toHaveBeenCalled();
    });
  });

  describe('POST /auth/keycloak', () => {
    it('retourne 200 et pose le cookie refresh', async () => {
      const dto: KeycloakLoginDto = { keycloakAccessToken: 'kc-access-token' };
      const result = await controller.loginWithKeycloak(dto, mockResponse, mockRequest);

      expect(result).toEqual(mockAuthResponse);
      expect(authService.loginWithKeycloak).toHaveBeenCalledWith('kc-access-token');
      expect(mockResponse.cookie).toHaveBeenCalled();
      expect(auditService.log).toHaveBeenCalled();
    });
  });

  describe('POST /auth/refresh', () => {
    it('retourne 200 et accessToken si refresh token présent dans le cookie', async () => {
      mockRequest.cookies = { refreshToken: 'valid-refresh-token' };

      const result = await controller.refresh(mockRequest);

      expect(result).toEqual({ accessToken: mockAuthResponse.accessToken });
      expect(authService.refreshAccessToken).toHaveBeenCalledWith('valid-refresh-token');
    });

    it('retourne 401 si refresh token manquant', async () => {
      mockRequest.cookies = {};

      await expect(controller.refresh(mockRequest)).rejects.toThrow(UnauthorizedException);
      expect(authService.refreshAccessToken).not.toHaveBeenCalled();
    });

    it('retourne 401 si refresh token invalide ou expiré', async () => {
      mockRequest.cookies = { refreshToken: 'invalid' };
      mockAuthService.refreshAccessToken.mockRejectedValueOnce(
        new UnauthorizedException('Refresh token invalide ou expiré'),
      );

      await expect(controller.refresh(mockRequest)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('POST /auth/logout', () => {
    it('retourne 204 et efface le cookie', async () => {
      mockRequest.cookies = { refreshToken: 'token-to-revoke' };

      await controller.logout(mockRequest, mockResponse);

      expect(authService.logout).toHaveBeenCalledWith('token-to-revoke');
      expect(mockResponse.clearCookie).toHaveBeenCalled();
    });
  });

  describe('POST /auth/logout-all', () => {
    it('retourne 204 et efface le cookie', async () => {
      const user: AuthenticatedUser = {
        id: 'user-1',
        email: 'admin@anexys.fr',
        tenantId: 'tenant-1',
        tenantSlug: 'anexys',
        role: 'SUPER_ADMIN',
        firstName: 'Admin',
        lastName: 'Anexys',
      };

      await controller.logoutAll(user, mockResponse);

      expect(authService.logoutAll).toHaveBeenCalledWith('user-1');
      expect(mockResponse.clearCookie).toHaveBeenCalled();
    });
  });
});
