import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

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

  constructor(private readonly configService: ConfigService) {
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
    this.logger.log(`Notification flow execution: ${flowId} - ${status}`);
  }

  async notifyQuotaWarning(tenantId: string, metricType: string, current: number, limit: number): Promise<void> {
    const percentage = Math.round((current / limit) * 100);
    if (percentage >= 80) {
      this.logger.warn(`Quota ${metricType} à ${percentage}% pour tenant ${tenantId}`);
    }
  }

  async notifySystemAlert(level: 'info' | 'warning' | 'critical', message: string, metadata?: Record<string, unknown>): Promise<void> {
    this.logger.log(`[ALERT:${level.toUpperCase()}] ${message}`);
  }
}
