import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from '../notifications/notifications.service';
import { RequestDemoDto } from './dto/request-demo.dto';
import { RequestQuoteDto } from './dto/request-quote.dto';
import { computeIndicativeMonthlyEuroHt } from './quote-estimate.util';

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

  @Post('quote-request')
  @ApiOperation({
    summary: 'Demande de devis / simulateur tarifaire (public, email au commercial)',
  })
  @ApiResponse({ status: 201, description: 'Demande envoyée' })
  @ApiResponse({ status: 400, description: 'Données invalides ou envoi impossible' })
  async requestQuote(@Body() dto: RequestQuoteDto): Promise<{ ok: boolean }> {
    const to =
      this.configService.get<string>('QUOTE_MAIL_TO') ??
      this.configService.get<string>('DEMO_MAIL_TO') ??
      'commercial@anexys.fr';

    const serverEstimate = computeIndicativeMonthlyEuroHt({
      connectors: dto.connectors,
      executionsPerMonth: dto.executionsPerMonth,
      mappings: dto.mappings,
    });

    const name = [dto.firstName, dto.lastName].filter(Boolean).join(' ');
    const subject = `[Devis Ultimate Edicloud] ${name} — ~${serverEstimate} € HT / mois (indicatif)`;

    const volumeLine = `Volume (exécutions / mois): ${dto.executionsPerMonth.toLocaleString('fr-FR')}`;
    const estimateNote =
      clientEstimateMatches(dto.clientEstimatedMonthlyHt, serverEstimate)
        ? `Estimation indicative serveur : ${serverEstimate} € HT / mois (identique à l’affichage client).`
        : `Estimation client : ${dto.clientEstimatedMonthlyHt} € HT — recalcul serveur : ${serverEstimate} € HT / mois.`;

    const text = [
      'Nouvelle demande depuis le simulateur tarifaire (page Tarifs / accueil).',
      '',
      `Prénom: ${dto.firstName}`,
      dto.lastName ? `Nom: ${dto.lastName}` : null,
      `Email: ${dto.email}`,
      dto.company ? `Société: ${dto.company}` : null,
      dto.phone ? `Téléphone: ${dto.phone}` : null,
      '',
      '--- Paramètres projet ---',
      `Connecteurs: ${dto.connectors}`,
      volumeLine,
      `Mappings: ${dto.mappings}`,
      '',
      estimateNote,
      '',
      dto.message ? `Message:\n${dto.message}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    const html = [
      '<p><strong>Demande de devis</strong> — simulateur Ultimate Edicloud.</p>',
      '<ul>',
      `<li><strong>Prénom :</strong> ${escapeHtml(dto.firstName)}</li>`,
      dto.lastName ? `<li><strong>Nom :</strong> ${escapeHtml(dto.lastName)}</li>` : null,
      `<li><strong>Email :</strong> ${escapeHtml(dto.email)}</li>`,
      dto.company ? `<li><strong>Société :</strong> ${escapeHtml(dto.company)}</li>` : null,
      dto.phone ? `<li><strong>Téléphone :</strong> ${escapeHtml(dto.phone)}</li>` : null,
      '</ul>',
      '<p><strong>Paramètres projet</strong></p>',
      '<ul>',
      `<li>Connecteurs : <strong>${dto.connectors}</strong></li>`,
      `<li>Volume : <strong>${escapeHtml(dto.executionsPerMonth.toLocaleString('fr-FR'))}</strong> exécutions / mois</li>`,
      `<li>Mappings : <strong>${dto.mappings}</strong></li>`,
      '</ul>',
      `<p><strong>Estimation indicative HT / mois (non contractuelle) :</strong> ${serverEstimate} €</p>`,
      !clientEstimateMatches(dto.clientEstimatedMonthlyHt, serverEstimate)
        ? `<p>Affichage client : ${dto.clientEstimatedMonthlyHt} € — écart avec le recalcul serveur.</p>`
        : null,
      dto.message ? `<p><strong>Message :</strong><br/>${escapeHtml(dto.message).replace(/\n/g, '<br/>')}</p>` : null,
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
      throw new BadRequestException("Impossible d'envoyer l'email. Vérifiez la configuration SMTP.");
    }

    return { ok: true };
  }
}

function clientEstimateMatches(client: number, server: number): boolean {
  return Math.round(client) === Math.round(server);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
