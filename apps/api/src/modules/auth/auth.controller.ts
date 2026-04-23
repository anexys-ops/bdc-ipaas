import {
  Controller,
  Post,
  Body,
  Res,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { TenantsService } from '../tenants/tenants.service';
import { Plan } from '../tenants/dto/create-tenant.dto';
import { TenantUserRole } from '../tenants/dto/create-tenant-user.dto';
import { LoginDto, AuthResponseDto, RefreshResponseDto, SignupTrialDto, KeycloakLoginDto } from './dto';
import { Public, Audit } from '../../common/decorators';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators';
import { AuthenticatedUser } from './interfaces';
import { AuditService } from '../audit/audit.service';

@ApiTags('Authentification')
@Controller('auth')
export class AuthController {
  private readonly REFRESH_TOKEN_COOKIE = 'refreshToken';

  constructor(
    private readonly authService: AuthService,
    private readonly tenantsService: TenantsService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {}

  @Post('signup-trial')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer un compte d\'essai (tenant + admin)' })
  @ApiResponse({ status: 201, description: 'Compte créé, utilisateur connecté', type: AuthResponseDto })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 409, description: 'Slug ou email déjà utilisé' })
  async signupTrial(
    @Body() dto: SignupTrialDto,
    @Res({ passthrough: true }) response: Response,
    @Req() request: Request,
  ): Promise<AuthResponseDto> {
    const slug = dto.companyName
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    if (slug.length < 3) {
      throw new BadRequestException('Le nom d\'entreprise doit produire un identifiant d\'au moins 3 caractères (lettres, chiffres, tirets)');
    }
    const tenant = await this.tenantsService.create({
      slug,
      name: dto.companyName.trim(),
      plan: Plan.FREE,
    });
    const user = await this.tenantsService.createUser(tenant.id, {
      email: dto.email,
      password: dto.password,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: TenantUserRole.ADMIN,
    });
    const { response: authResponse, refreshToken } =
      await this.authService.createSessionForUser(user.id);
    this.setRefreshTokenCookie(response, refreshToken);
    await this.auditService.log({
      tenantId: tenant.id,
      userId: user.id,
      action: 'SIGNUP_TRIAL',
      resource: 'auth',
      ipAddress: request.ip ?? request.socket?.remoteAddress,
      userAgent: request.get('user-agent') ?? undefined,
    });
    return authResponse;
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Connexion utilisateur' })
  @ApiResponse({ status: 200, description: 'Connexion réussie', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Email ou mot de passe incorrect' })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
    @Req() request: Request,
  ): Promise<AuthResponseDto> {
    const { response: authResponse, refreshToken } = await this.authService.login(loginDto);

    this.setRefreshTokenCookie(response, refreshToken);

    await this.auditService.log({
      tenantId: authResponse.user.tenantId,
      userId: authResponse.user.id,
      action: 'LOGIN',
      resource: 'auth',
      ipAddress: request.ip ?? request.socket?.remoteAddress,
      userAgent: request.get('user-agent') ?? undefined,
    });

    return authResponse;
  }

  @Post('keycloak')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Échange un access token Keycloak contre une session applicative (JWT + cookie refresh)' })
  @ApiResponse({ status: 200, description: 'Session créée', type: AuthResponseDto })
  @ApiResponse({ status: 400, description: 'Keycloak non configuré ou corps invalide' })
  @ApiResponse({ status: 401, description: 'Jeton Keycloak invalide ou utilisateur inconnu' })
  async loginWithKeycloak(
    @Body() dto: KeycloakLoginDto,
    @Res({ passthrough: true }) response: Response,
    @Req() request: Request,
  ): Promise<AuthResponseDto> {
    const { response: authResponse, refreshToken } = await this.authService.loginWithKeycloak(
      dto.keycloakAccessToken,
    );

    this.setRefreshTokenCookie(response, refreshToken);

    await this.auditService.log({
      tenantId: authResponse.user.tenantId,
      userId: authResponse.user.id,
      action: 'LOGIN',
      resource: 'auth',
      ipAddress: request.ip ?? request.socket?.remoteAddress,
      userAgent: request.get('user-agent') ?? undefined,
    });

    return authResponse;
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renouveler le token d\'accès' })
  @ApiResponse({ status: 200, description: 'Token renouvelé', type: RefreshResponseDto })
  @ApiResponse({ status: 401, description: 'Refresh token invalide ou expiré' })
  async refresh(
    @Req() request: Request,
  ): Promise<RefreshResponseDto> {
    const refreshToken = this.getRefreshTokenFromCookie(request);

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token manquant');
    }

    return this.authService.refreshAccessToken(refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @Audit('LOGOUT', 'auth')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Déconnexion' })
  @ApiResponse({ status: 204, description: 'Déconnexion réussie' })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const refreshToken = this.getRefreshTokenFromCookie(request);

    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }

    this.clearRefreshTokenCookie(response);
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @Audit('LOGOUT_ALL', 'auth')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Déconnexion de tous les appareils' })
  @ApiResponse({ status: 204, description: 'Tous les appareils déconnectés' })
  async logoutAll(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.authService.logoutAll(user.id);
    this.clearRefreshTokenCookie(response);
  }

  /**
   * Définit le refresh token dans un cookie httpOnly sécurisé.
   */
  private getRefreshTokenSameSite(): 'strict' | 'lax' | 'none' {
    const raw = this.configService.get<string>('REFRESH_TOKEN_SAMESITE')?.trim().toLowerCase();
    if (raw === 'strict' || raw === 'lax' || raw === 'none') {
      return raw;
    }
    /**
     * Lax (défaut) : le refresh part du front (souvent autre sous-domaine que l’API) ;
     * en Strict, le cookie n’était pas toujours envoyé sur le POST /auth/keycloak ou /auth/refresh.
     */
    return 'lax';
  }

  private isRefreshTokenSecure(): boolean {
    if (this.getRefreshTokenSameSite() === 'none') {
      return true;
    }
    return process.env.NODE_ENV === 'production';
  }

  private setRefreshTokenCookie(response: Response, token: string): void {
    response.cookie(this.REFRESH_TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: this.isRefreshTokenSecure(),
      sameSite: this.getRefreshTokenSameSite(),
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/v1/auth',
    });
  }

  /**
   * Supprime le cookie de refresh token.
   */
  private clearRefreshTokenCookie(response: Response): void {
    response.clearCookie(this.REFRESH_TOKEN_COOKIE, {
      path: '/api/v1/auth',
      sameSite: this.getRefreshTokenSameSite(),
      secure: this.isRefreshTokenSecure(),
    });
  }

  /**
   * Récupère le refresh token depuis le cookie.
   */
  private getRefreshTokenFromCookie(request: Request): string | undefined {
    const cookies = request.cookies as Record<string, string> | undefined;
    return cookies?.[this.REFRESH_TOKEN_COOKIE];
  }
}
