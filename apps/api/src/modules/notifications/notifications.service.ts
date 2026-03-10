import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  NotificationSettingsResponseDto,
  UpdateNotificationSettingsDto,
  NotificationLogResponseDto,
} from './dto';

export interface EmailNotification {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export interface WebhookNotification {
  url: string;
  payload: Record<string, unknown>;
  headers?: Record<string, string>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpPort = this.configService.get<number>('SMTP_PORT');
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');

    if (smtpHost && smtpUser) {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort || 587,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
      });
      this.logger.log('Transporter email initialisé');
    }
  }

  async sendEmail(notification: EmailNotification): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn('Transporter email non configuré');
      return false;
    }

    try {
      const from = this.configService.get<string>('SMTP_FROM') || 'noreply@anexys.com';
      await this.transporter.sendMail({ from, ...notification });
      this.logger.log(`Email envoyé à ${notification.to}`);
      return true;
    } catch (err) {
      this.logger.error(`Erreur envoi email: ${(err as Error).message}`);
      return false;
    }
  }

  async sendWebhook(notification: WebhookNotification): Promise<boolean> {
    try {
      const response = await fetch(notification.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...notification.headers },
        body: JSON.stringify(notification.payload),
      });

      if (!response.ok) {
        this.logger.warn(`Webhook échoué (${response.status}): ${notification.url}`);
        return false;
      }

      this.logger.log(`Webhook envoyé: ${notification.url}`);
      return true;
    } catch (err) {
      this.logger.error(`Erreur webhook: ${(err as Error).message}`);
      return false;
    }
  }

  async notifyFlowExecution(tenantId: string, flowId: string, status: 'success' | 'error', details?: Record<string, unknown>): Promise<void> {
    const payload = { event: 'flow_execution', tenantId, flowId, status, details, timestamp: new Date().toISOString() };
    this.logger.log(`Notification flow execution: ${flowId} - ${status}`, payload);
  }

  async notifyQuotaWarning(tenantId: string, metricType: string, current: number, limit: number): Promise<void> {
    const percentage = Math.round((current / limit) * 100);
    if (percentage >= 80) {
      this.logger.warn(`Quota ${metricType} à ${percentage}% pour tenant ${tenantId}`);
    }
  }

  async notifySystemAlert(level: 'info' | 'warning' | 'critical', message: string, metadata?: Record<string, unknown>): Promise<void> {
    this.logger.log(`[ALERT:${level.toUpperCase()}] ${message}`, metadata ?? {});
  }

  async getSettings(tenantId: string): Promise<NotificationSettingsResponseDto> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException(`Tenant non trouvé: ${tenantId}`);

    const settings = await this.prisma.notificationSettings.upsert({
      where: { tenantId },
      create: {
        tenantId,
        emailEnabled: true,
        emailRecipients: [],
        webhookEnabled: false,
        webhookUrl: null,
        alertOnFailure: true,
        alertOnQuota80: true,
      },
      update: {},
    });

    return {
      id: settings.id,
      tenantId: settings.tenantId,
      emailEnabled: settings.emailEnabled,
      emailRecipients: settings.emailRecipients,
      webhookEnabled: settings.webhookEnabled,
      webhookUrl: settings.webhookUrl,
      alertOnFailure: settings.alertOnFailure,
      alertOnQuota80: settings.alertOnQuota80,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
    };
  }

  async updateSettings(tenantId: string, dto: UpdateNotificationSettingsDto): Promise<NotificationSettingsResponseDto> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException(`Tenant non trouvé: ${tenantId}`);

    const updateData: {
      emailEnabled?: boolean;
      emailRecipients?: string[];
      webhookEnabled?: boolean;
      webhookUrl?: string | null;
      alertOnFailure?: boolean;
      alertOnQuota80?: boolean;
    } = {};
    if (dto.emailEnabled !== undefined) updateData.emailEnabled = dto.emailEnabled;
    if (dto.emailRecipients !== undefined) updateData.emailRecipients = dto.emailRecipients;
    if (dto.webhookEnabled !== undefined) updateData.webhookEnabled = dto.webhookEnabled;
    if (dto.webhookUrl !== undefined) updateData.webhookUrl = dto.webhookUrl;
    if (dto.alertOnFailure !== undefined) updateData.alertOnFailure = dto.alertOnFailure;
    if (dto.alertOnQuota80 !== undefined) updateData.alertOnQuota80 = dto.alertOnQuota80;

    const settings = await this.prisma.notificationSettings.upsert({
      where: { tenantId },
      create: {
        tenantId,
        emailEnabled: dto.emailEnabled ?? true,
        emailRecipients: dto.emailRecipients ?? [],
        webhookEnabled: dto.webhookEnabled ?? false,
        webhookUrl: dto.webhookUrl ?? null,
        alertOnFailure: dto.alertOnFailure ?? true,
        alertOnQuota80: dto.alertOnQuota80 ?? true,
      },
      update: updateData,
    });

    return {
      id: settings.id,
      tenantId: settings.tenantId,
      emailEnabled: settings.emailEnabled,
      emailRecipients: settings.emailRecipients,
      webhookEnabled: settings.webhookEnabled,
      webhookUrl: settings.webhookUrl,
      alertOnFailure: settings.alertOnFailure,
      alertOnQuota80: settings.alertOnQuota80,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
    };
  }

  async getHistory(tenantId: string): Promise<NotificationLogResponseDto[]> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException(`Tenant non trouvé: ${tenantId}`);

    const since = new Date();
    since.setDate(since.getDate() - 30);

    const logs = await this.prisma.notificationLog.findMany({
      where: { tenantId, sentAt: { gte: since } },
      orderBy: { sentAt: 'desc' },
    });

    return logs.map((log) => ({
      id: log.id,
      tenantId: log.tenantId,
      type: log.type,
      subject: log.subject,
      status: log.status,
      sentAt: log.sentAt,
    }));
  }

  async sendTestNotification(tenantId: string): Promise<{ email: boolean; webhook: boolean }> {
    const settings = await this.getSettings(tenantId);
    const subject = '[Test] Notification iPaas';
    const payload = { event: 'test', tenantId, message: 'Notification de test', timestamp: new Date().toISOString() };
    let emailOk = false;
    let webhookOk = false;

    if (settings.emailEnabled && settings.emailRecipients.length > 0) {
      for (const to of settings.emailRecipients) {
        const ok = await this.sendEmail({
          to,
          subject,
          text: 'Ceci est une notification de test. Si vous recevez ce message, les emails sont bien configurés.',
        });
        await this.logNotification(tenantId, 'EMAIL', subject, ok ? 'SENT' : 'FAILED');
        if (ok) emailOk = true;
      }
    }

    if (settings.webhookEnabled && settings.webhookUrl) {
      webhookOk = await this.sendWebhook({ url: settings.webhookUrl, payload });
      await this.logNotification(tenantId, 'WEBHOOK', subject, webhookOk ? 'SENT' : 'FAILED');
    }

    return { email: emailOk, webhook: webhookOk };
  }

  private async logNotification(tenantId: string, type: string, subject: string, status: string): Promise<void> {
    await this.prisma.notificationLog.create({
      data: { tenantId, type, subject, status },
    });
  }
}
