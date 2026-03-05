import {
  Injectable,
  UnauthorizedException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
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

    const user = await this.prisma.user.findFirst({
      where: { email: email.toLowerCase() },
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
