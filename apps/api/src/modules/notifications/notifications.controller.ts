import { Controller, Get, Put, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import {
  NotificationSettingsResponseDto,
  UpdateNotificationSettingsDto,
  NotificationLogResponseDto,
} from './dto';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentTenant } from '../../common/decorators';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('settings')
  @ApiOperation({ summary: 'Récupérer les paramètres de notification du tenant' })
  @ApiResponse({ status: 200, description: 'Paramètres (webhook URL, email, seuils)', type: NotificationSettingsResponseDto })
  getSettings(@CurrentTenant() tenant: { id: string }): Promise<NotificationSettingsResponseDto> {
    return this.notificationsService.getSettings(tenant.id);
  }

  @Put('settings')
  @ApiOperation({ summary: 'Mettre à jour les paramètres de notification' })
  @ApiResponse({ status: 200, description: 'Paramètres mis à jour', type: NotificationSettingsResponseDto })
  updateSettings(
    @CurrentTenant() tenant: { id: string },
    @Body() dto: UpdateNotificationSettingsDto,
  ): Promise<NotificationSettingsResponseDto> {
    return this.notificationsService.updateSettings(tenant.id, dto);
  }

  @Post('test')
  @ApiOperation({ summary: 'Envoyer une notification de test (email + webhook)' })
  @ApiResponse({ status: 200, description: 'Résultat de l\'envoi (email, webhook)' })
  sendTest(@CurrentTenant() tenant: { id: string }): Promise<{ email: boolean; webhook: boolean }> {
    return this.notificationsService.sendTestNotification(tenant.id);
  }

  @Get('history')
  @ApiOperation({ summary: 'Historique des notifications envoyées (30 derniers jours)' })
  @ApiResponse({ status: 200, description: 'Liste des notifications', type: [NotificationLogResponseDto] })
  getHistory(@CurrentTenant() tenant: { id: string }): Promise<NotificationLogResponseDto[]> {
    return this.notificationsService.getHistory(tenant.id);
  }
}
