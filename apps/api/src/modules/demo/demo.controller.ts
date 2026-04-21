import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from '../notifications/notifications.service';
import { RequestDemoDto } from './dto/request-demo.dto';

@ApiTags('Demo')
@Controller('demo')
export class DemoController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
  ) {}

  @Post('request')
  @ApiOperation({ summary: 'Demande de démo (public, envoie un email au commercial)' })
  @ApiResponse({ status: 201, description: 'Demande enregistrée' })
  @ApiResponse({ status: 400, description: 'Données invalides ou email non configuré' })
  async requestDemo(@Body() dto: RequestDemoDto): Promise<{ ok: boolean }> {
    const to = this.configService.get<string>('DEMO_MAIL_TO');
    if (!to) {
      throw new BadRequestException('Envoi de démo non configuré (DEMO_MAIL_TO manquant)');
    }

    const name = [dto.firstName, dto.lastName].filter(Boolean).join(' ');
    const subject = `[Demande de démo] ${name} - ${dto.company || dto.email}`;
    const text = [
      `Demande de démo reçue depuis le site Ultimate Edicloud`,
      '',
      `Prénom: ${dto.firstName}`,
      dto.lastName ? `Nom: ${dto.lastName}` : null,
      `Email: ${dto.email}`,
      dto.company ? `Société: ${dto.company}` : null,
      dto.message ? `Message: ${dto.message}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    const html = [
      '<p><strong>Demande de démo</strong> reçue depuis le site Ultimate Edicloud.</p>',
      '<ul>',
      `<li><strong>Prénom:</strong> ${escapeHtml(dto.firstName)}</li>`,
      dto.lastName ? `<li><strong>Nom:</strong> ${escapeHtml(dto.lastName)}</li>` : null,
      `<li><strong>Email:</strong> ${escapeHtml(dto.email)}</li>`,
      dto.company ? `<li><strong>Société:</strong> ${escapeHtml(dto.company)}</li>` : null,
      '</ul>',
      dto.message ? `<p><strong>Message:</strong><br/>${escapeHtml(dto.message).replace(/\n/g, '<br/>')}</p>` : null,
    ]
      .filter(Boolean)
      .join('\n');

    const sent = await this.notificationsService.sendEmail({
      to,
      subject,
      text,
      html,
    });

    if (!sent) {
      throw new BadRequestException('Impossible d\'envoyer l\'email. Vérifiez la configuration SMTP.');
    }

    return { ok: true };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
