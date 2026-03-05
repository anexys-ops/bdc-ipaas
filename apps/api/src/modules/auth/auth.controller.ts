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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, AuthResponseDto, RefreshResponseDto } from './dto';
import { Public } from '../../common/decorators';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators';
import { AuthenticatedUser } from './interfaces';

@ApiTags('Authentification')
@Controller('auth')
export class AuthController {
  private readonly REFRESH_TOKEN_COOKIE = 'refreshToken';

  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Connexion utilisateur' })
  @ApiResponse({ status: 200, description: 'Connexion réussie', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Email ou mot de passe incorrect' })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponseDto> {
    const { response: authResponse, refreshToken } = await this.authService.login(loginDto);

    this.setRefreshTokenCookie(response, refreshToken);

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
  private setRefreshTokenCookie(response: Response, token: string): void {
    response.cookie(this.REFRESH_TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
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
