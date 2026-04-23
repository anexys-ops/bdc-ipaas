import {
  Injectable,
  UnauthorizedException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as jose from 'jose';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto, AuthResponseDto, RefreshResponseDto, UserResponseDto } from './dto';
import { JwtPayload, RefreshTokenPayload } from './interfaces';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly accessTokenExpires: string;
  private readonly refreshTokenExpires: string;
  private readonly refreshTokenExpiresMs: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.accessTokenExpires = this.configService.get<string>('JWT_ACCESS_EXPIRES') ?? '15m';
    this.refreshTokenExpires = this.configService.get<string>('JWT_REFRESH_EXPIRES') ?? '7d';
    this.refreshTokenExpiresMs = this.parseExpiresMs(this.refreshTokenExpires);
  }

  /**
   * Authentifie un utilisateur et génère les tokens JWT.
   */
  async login(loginDto: LoginDto): Promise<{ response: AuthResponseDto; refreshToken: string }> {
    const { email, password } = loginDto;
    const emailNormalized = email.trim().toLowerCase();

    const user = await this.prisma.user.findFirst({
      where: { email: emailNormalized },
      include: { tenant: true },
    });

    if (!user) {
      this.logger.warn(`Tentative de connexion échouée pour email: ${email}`);
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Compte désactivé');
    }

    if (!user.tenant.isActive) {
      throw new UnauthorizedException('Votre organisation a été désactivée');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      this.logger.warn(`Mot de passe incorrect pour userId: ${user.id}`);
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const accessToken = this.generateAccessToken(user, user.tenant.slug);
    const { token: refreshToken } = await this.createRefreshToken(user.id);

    this.logger.log(`Connexion réussie pour userId: ${user.id}`);

    return {
      response: {
        accessToken,
        user: this.mapUserToResponse(user, user.tenant.slug),
      },
      refreshToken,
    };
  }

  /**
   * Renouvelle l'access token à partir d'un refresh token valide.
   */
  async refreshAccessToken(refreshToken: string): Promise<RefreshResponseDto> {
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET') ?? 'dev-refresh-secret';

    let payload: RefreshTokenPayload;
    try {
      payload = this.jwtService.verify<RefreshTokenPayload>(refreshToken, {
        secret: refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Refresh token invalide ou expiré');
    }

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { id: payload.tokenId },
      include: {
        user: {
          include: { tenant: true },
        },
      },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Refresh token révoqué');
    }

    if (new Date() > storedToken.expiresAt) {
      await this.prisma.refreshToken.delete({ where: { id: storedToken.id } });
      throw new UnauthorizedException('Refresh token expiré');
    }

    if (!storedToken.user.isActive || !storedToken.user.tenant.isActive) {
      throw new UnauthorizedException('Compte ou organisation désactivé');
    }

    const accessToken = this.generateAccessToken(storedToken.user, storedToken.user.tenant.slug);

    return { accessToken };
  }

  /**
   * Révoque un refresh token (déconnexion).
   */
  async logout(refreshToken: string): Promise<void> {
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET') ?? 'dev-refresh-secret';

    try {
      const payload = this.jwtService.verify<RefreshTokenPayload>(refreshToken, {
        secret: refreshSecret,
      });

      await this.prisma.refreshToken.delete({
        where: { id: payload.tokenId },
      });

      this.logger.log(`Déconnexion réussie pour userId: ${payload.sub}`);
    } catch {
      this.logger.warn('Tentative de déconnexion avec token invalide');
    }
  }

  /**
   * Révoque tous les refresh tokens d'un utilisateur (déconnexion de tous les appareils).
   */
  async logoutAll(userId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });

    this.logger.log(`Tous les tokens révoqués pour userId: ${userId}`);
  }

  /**
   * Crée une session (tokens + user) pour un utilisateur déjà créé (ex: après signup).
   */
  async createSessionForUser(userId: string): Promise<{ response: AuthResponseDto; refreshToken: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user || !user.isActive || !user.tenant.isActive) {
      throw new UnauthorizedException('Utilisateur ou organisation invalide');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });

    const accessToken = this.generateAccessToken(user, user.tenant.slug);
    const { token: refreshToken } = await this.createRefreshToken(user.id);

    return {
      response: {
        accessToken,
        user: this.mapUserToResponse(user, user.tenant.slug),
      },
      refreshToken,
    };
  }

  /**
   * Vérifie un access token Keycloak (JWKS), rattache l’email à un utilisateur
   * applicatif et ouvre une session JWT + refresh comme le login classique.
   */
  async loginWithKeycloak(
    keycloakAccessToken: string,
  ): Promise<{ response: AuthResponseDto; refreshToken: string }> {
    const rawIssuer = this.configService.get<string>('KEYCLOAK_ISSUER')?.trim();
    if (!rawIssuer) {
      throw new BadRequestException('Keycloak n\'est pas configuré (KEYCLOAK_ISSUER manquant)');
    }
    const issuer = rawIssuer.replace(/\/$/, '');
    const emailNormalized = await this.verifyKeycloakAccessToken(keycloakAccessToken, issuer);

    const user = await this.prisma.user.findFirst({
      where: { email: emailNormalized },
      include: { tenant: true },
    });

    if (!user) {
      throw new UnauthorizedException('Aucun utilisateur applicatif associé à ce compte Keycloak');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Compte désactivé');
    }

    if (!user.tenant.isActive) {
      throw new UnauthorizedException('Votre organisation a été désactivée');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const accessToken = this.generateAccessToken(user, user.tenant.slug);
    const { token: refreshToken } = await this.createRefreshToken(user.id);

    this.logger.log(`Connexion Keycloak réussie pour userId: ${user.id}`);

    return {
      response: {
        accessToken,
        user: this.mapUserToResponse(user, user.tenant.slug),
      },
      refreshToken,
    };
  }

  private async verifyKeycloakAccessToken(token: string, configuredIssuer: string): Promise<string> {
    const issuerBase = configuredIssuer.replace(/\/$/, '');
    const wellKnownUrl = `${issuerBase}/.well-known/openid-configuration`;
    let discovery: { jwks_uri?: string; issuer?: string };
    try {
      const res = await fetch(wellKnownUrl);
      if (!res.ok) {
        throw new UnauthorizedException('Impossible de joindre la configuration OpenID de Keycloak');
      }
      discovery = (await res.json()) as { jwks_uri?: string; issuer?: string };
    } catch (e) {
      this.logger.warn(`Keycloak discovery failed: ${String((e as Error)?.message ?? e)}`);
      throw new UnauthorizedException('Configuration Keycloak inaccessible');
    }

    if (!discovery.jwks_uri) {
      throw new UnauthorizedException('Réponse Keycloak invalide (jwks_uri manquant)');
    }

    /**
     * L’ISS du token doit coller exactement à l’`issuer` renvoyé par la discovery
     * (souvent différent d’une config manuelle tronquée / alias d’hôte).
     */
    const verifyIssuer = (discovery.issuer ?? issuerBase).replace(/\/$/, '');

    const JWKS = jose.createRemoteJWKSet(new URL(discovery.jwks_uri));
    const clientId = this.configService.get<string>('KEYCLOAK_CLIENT_ID')?.trim();

    let payload: jose.JWTPayload;
    const verifyWithIssuer = (iss: string) =>
      jose.jwtVerify(token, JWKS, {
        issuer: iss,
        /** Décalage horloge Keycloak / conteneur */
        clockTolerance: 30,
      });
    try {
      const { payload: p } = await verifyWithIssuer(verifyIssuer);
      payload = p;
    } catch (e1) {
      if (verifyIssuer === issuerBase) {
        this.logger.warn(`Keycloak JWT verify failed: ${String((e1 as Error)?.message ?? e1)}`);
        throw new UnauthorizedException('Jeton Keycloak invalide ou expiré');
      }
      try {
        const { payload: p2 } = await verifyWithIssuer(issuerBase);
        payload = p2;
      } catch (e2) {
        this.logger.warn(`Keycloak JWT verify failed: ${String((e2 as Error)?.message ?? e2)}`);
        throw new UnauthorizedException('Jeton Keycloak invalide ou expiré');
      }
    }

    if (clientId) {
      const azp = typeof payload.azp === 'string' ? payload.azp : undefined;
      const aud = payload.aud;
      const audList = Array.isArray(aud) ? aud : aud != null ? [String(aud)] : [];
      const audOk = audList.includes(clientId);
      if (azp !== clientId && !audOk) {
        throw new UnauthorizedException('Jeton Keycloak non émis pour ce client applicatif');
      }
    }

    const withAt = (s: string) => s.includes('@');
    const emailRaw =
      typeof payload.email === 'string'
        ? payload.email
        : typeof payload.preferred_username === 'string' && withAt(payload.preferred_username)
          ? payload.preferred_username
          : typeof (payload as { upn?: unknown }).upn === 'string' &&
              withAt((payload as { upn: string }).upn)
            ? (payload as { upn: string }).upn
            : null;

    const emailNormalized = emailRaw?.trim().toLowerCase();
    if (!emailNormalized || !withAt(emailNormalized)) {
      throw new UnauthorizedException(
        'Le jeton Keycloak ne contient pas d\'email (email, preferred_username si format mail, ou upn)',
      );
    }

    return emailNormalized;
  }

  /**
   * Hash un mot de passe avec bcrypt.
   */
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Génère un access token JWT.
   */
  private generateAccessToken(
    user: { id: string; email: string; tenantId: string; role: string },
    tenantSlug: string,
  ): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      tenantSlug,
      role: user.role,
    };

    return this.jwtService.sign(payload, {
      expiresIn: this.accessTokenExpires,
    });
  }

  /**
   * Crée et stocke un refresh token.
   */
  private async createRefreshToken(userId: string): Promise<{ token: string; id: string }> {
    const tokenId = uuidv4();
    const expiresAt = new Date(Date.now() + this.refreshTokenExpiresMs);

    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET') ?? 'dev-refresh-secret';

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('Utilisateur non trouvé');
    }

    const payload: RefreshTokenPayload = {
      sub: userId,
      tenantId: user.tenantId,
      tokenId,
    };

    const token = this.jwtService.sign(payload, {
      secret: refreshSecret,
      expiresIn: this.refreshTokenExpires,
    });

    await this.prisma.refreshToken.create({
      data: {
        id: tokenId,
        userId,
        token,
        expiresAt,
      },
    });

    return { token, id: tokenId };
  }

  /**
   * Mappe un utilisateur vers le DTO de réponse.
   */
  private mapUserToResponse(
    user: { id: string; email: string; firstName: string; lastName: string; role: string; tenantId: string },
    tenantSlug: string,
  ): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      tenantId: user.tenantId,
      tenantSlug,
    };
  }

  /**
   * Parse une durée d'expiration (ex: '7d', '15m') en millisecondes.
   */
  private parseExpiresMs(expires: string): number {
    const match = expires.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 7 * 24 * 60 * 60 * 1000;
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return value * multipliers[unit];
  }
}
