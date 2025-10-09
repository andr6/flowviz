/**
 * Notification Service
 *
 * Multi-channel notification system for alert delivery:
 * - Email (SMTP)
 * - Slack
 * - Microsoft Teams
 * - SMS (Twilio)
 * - PagerDuty
 * - Custom Webhooks
 */

import { Pool } from 'pg';

export type NotificationChannel = 'email' | 'slack' | 'teams' | 'sms' | 'pagerduty' | 'webhook';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'delivered' | 'read';

export interface NotificationConfig {
  id?: string;
  channel: NotificationChannel;
  name: string;
  enabled: boolean;
  config: Record<string, any>; // Channel-specific configuration
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Notification {
  id?: string;
  channel: NotificationChannel;
  configId?: string;
  recipients: string[]; // emails, phone numbers, user IDs, etc.
  subject?: string;
  message: string;
  priority: NotificationPriority;
  metadata?: Record<string, any>;
  status?: NotificationStatus;
  sentAt?: Date;
  deliveredAt?: Date;
  errorMessage?: string;
}

export interface NotificationTemplate {
  id?: string;
  name: string;
  channel: NotificationChannel;
  subjectTemplate: string;
  messageTemplate: string;
  priority: NotificationPriority;
  variables: string[]; // List of variables that can be interpolated
}

/**
 * Notification Service
 */
export class NotificationService {
  private pool: Pool;
  private configs: Map<string, NotificationConfig> = new Map();

  constructor(pool: Pool) {
    this.pool = pool;
    this.loadConfigurations();
  }

  /**
   * Load notification configurations from database
   */
  private async loadConfigurations(): Promise<void> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM notification_configs WHERE enabled = true'
      );

      for (const row of result.rows) {
        this.configs.set(row.id, {
          id: row.id,
          channel: row.channel,
          name: row.name,
          enabled: row.enabled,
          config: row.config,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        });
      }
    } catch (error) {
      console.error('Failed to load notification configurations:', error);
    }
  }

  /**
   * Send notification via specified channel
   */
  async sendNotification(notification: Notification): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Save notification to database
      const notificationId = await this.saveNotification(notification);

      // Get configuration if specified
      let config: NotificationConfig | undefined;
      if (notification.configId) {
        config = this.configs.get(notification.configId);
      } else {
        // Get default config for channel
        config = Array.from(this.configs.values()).find(
          c => c.channel === notification.channel && c.enabled
        );
      }

      if (!config) {
        throw new Error(`No enabled configuration found for channel: ${notification.channel}`);
      }

      // Send via appropriate channel
      let result: { success: boolean; messageId?: string; error?: string };

      switch (notification.channel) {
        case 'email':
          result = await this.sendEmail(notification, config);
          break;
        case 'slack':
          result = await this.sendSlack(notification, config);
          break;
        case 'teams':
          result = await this.sendTeams(notification, config);
          break;
        case 'sms':
          result = await this.sendSMS(notification, config);
          break;
        case 'pagerduty':
          result = await this.sendPagerDuty(notification, config);
          break;
        case 'webhook':
          result = await this.sendWebhook(notification, config);
          break;
        default:
          throw new Error(`Unsupported notification channel: ${notification.channel}`);
      }

      // Update notification status
      await this.updateNotificationStatus(
        notificationId,
        result.success ? 'sent' : 'failed',
        result.messageId,
        result.error
      );

      return result;
    } catch (error) {
      console.error('Failed to send notification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send bulk notifications
   */
  async sendBulkNotifications(notifications: Notification[]): Promise<Array<{ success: boolean; messageId?: string; error?: string }>> {
    const results: Array<{ success: boolean; messageId?: string; error?: string }> = [];

    for (const notification of notifications) {
      const result = await this.sendNotification(notification);
      results.push(result);
    }

    return results;
  }

  /**
   * Send notification from template
   */
  async sendFromTemplate(
    templateId: string,
    recipients: string[],
    variables: Record<string, any>,
    priority?: NotificationPriority
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // Get template
    const templateResult = await this.pool.query(
      'SELECT * FROM notification_templates WHERE id = $1',
      [templateId]
    );

    if (templateResult.rows.length === 0) {
      return { success: false, error: 'Template not found' };
    }

    const template = templateResult.rows[0];

    // Interpolate variables
    const subject = this.interpolateTemplate(template.subject_template, variables);
    const message = this.interpolateTemplate(template.message_template, variables);

    // Send notification
    return await this.sendNotification({
      channel: template.channel,
      recipients,
      subject,
      message,
      priority: priority || template.priority,
      metadata: { templateId, variables },
    });
  }

  // ============================================================================
  // Email Channel
  // ============================================================================

  private async sendEmail(
    notification: Notification,
    config: NotificationConfig
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const { smtpHost, smtpPort, smtpUser, smtpPassword, fromEmail, fromName } = config.config;

      // In production, use nodemailer or similar
      // For now, simulate email sending
      console.log(`Sending email to ${notification.recipients.join(', ')}`);
      console.log(`Subject: ${notification.subject}`);
      console.log(`Message: ${notification.message}`);

      // Simulate API call
      const messageId = `email-${Date.now()}`;

      // In production:
      // const transporter = nodemailer.createTransport({
      //   host: smtpHost,
      //   port: smtpPort,
      //   auth: { user: smtpUser, pass: smtpPassword }
      // });
      // const info = await transporter.sendMail({
      //   from: `"${fromName}" <${fromEmail}>`,
      //   to: notification.recipients.join(', '),
      //   subject: notification.subject,
      //   html: notification.message
      // });
      // return { success: true, messageId: info.messageId };

      return { success: true, messageId };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Email send failed',
      };
    }
  }

  // ============================================================================
  // Slack Channel
  // ============================================================================

  private async sendSlack(
    notification: Notification,
    config: NotificationConfig
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const { webhookUrl, channel, botToken } = config.config;

      // Use webhook or bot token
      const url = webhookUrl || 'https://slack.com/api/chat.postMessage';

      const payload: any = {
        text: notification.message,
        channel: notification.recipients[0] || channel,
      };

      // Add formatting based on priority
      if (notification.priority === 'urgent') {
        payload.attachments = [
          {
            color: 'danger',
            text: notification.message,
            title: notification.subject,
          },
        ];
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (botToken) {
        headers['Authorization'] = `Bearer ${botToken}`;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const result = await response.json();
        return { success: true, messageId: result.ts || result.message?.ts };
      } else {
        const error = await response.text();
        return { success: false, error };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Slack send failed',
      };
    }
  }

  // ============================================================================
  // Microsoft Teams Channel
  // ============================================================================

  private async sendTeams(
    notification: Notification,
    config: NotificationConfig
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const { webhookUrl } = config.config;

      // Create Teams adaptive card
      const card = {
        '@type': 'MessageCard',
        '@context': 'https://schema.org/extensions',
        themeColor: this.getPriorityColor(notification.priority),
        summary: notification.subject,
        sections: [
          {
            activityTitle: notification.subject,
            activitySubtitle: new Date().toLocaleString(),
            text: notification.message,
          },
        ],
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(card),
      });

      if (response.ok) {
        return { success: true, messageId: `teams-${Date.now()}` };
      } else {
        const error = await response.text();
        return { success: false, error };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Teams send failed',
      };
    }
  }

  // ============================================================================
  // SMS Channel (Twilio)
  // ============================================================================

  private async sendSMS(
    notification: Notification,
    config: NotificationConfig
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const { accountSid, authToken, fromNumber } = config.config;

      // Twilio API
      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

      const results: Array<{ success: boolean; messageId?: string; error?: string }> = [];

      for (const recipient of notification.recipients) {
        const body = new URLSearchParams({
          To: recipient,
          From: fromNumber,
          Body: notification.message,
        });

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: body.toString(),
        });

        if (response.ok) {
          const result = await response.json();
          results.push({ success: true, messageId: result.sid });
        } else {
          const error = await response.text();
          results.push({ success: false, error });
        }
      }

      // Return first result (or combine multiple)
      return results[0] || { success: false, error: 'No recipients' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'SMS send failed',
      };
    }
  }

  // ============================================================================
  // PagerDuty Channel
  // ============================================================================

  private async sendPagerDuty(
    notification: Notification,
    config: NotificationConfig
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const { routingKey, integrationKey } = config.config;

      const event = {
        routing_key: routingKey || integrationKey,
        event_action: 'trigger',
        payload: {
          summary: notification.subject || notification.message.substring(0, 100),
          severity: this.mapPriorityToSeverity(notification.priority),
          source: 'ThreatFlow Attack Simulation',
          custom_details: notification.metadata || {},
        },
      };

      const response = await fetch('https://events.pagerduty.com/v2/enqueue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });

      if (response.ok) {
        const result = await response.json();
        return { success: true, messageId: result.dedup_key };
      } else {
        const error = await response.text();
        return { success: false, error };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'PagerDuty send failed',
      };
    }
  }

  // ============================================================================
  // Custom Webhook Channel
  // ============================================================================

  private async sendWebhook(
    notification: Notification,
    config: NotificationConfig
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const { url, method, headers: customHeaders } = config.config;

      const payload = {
        channel: notification.channel,
        recipients: notification.recipients,
        subject: notification.subject,
        message: notification.message,
        priority: notification.priority,
        metadata: notification.metadata,
        timestamp: new Date().toISOString(),
      };

      const response = await fetch(url, {
        method: method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...customHeaders,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        return { success: true, messageId: `webhook-${Date.now()}` };
      } else {
        const error = await response.text();
        return { success: false, error };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Webhook send failed',
      };
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Save notification to database
   */
  private async saveNotification(notification: Notification): Promise<string> {
    const result = await this.pool.query(
      `INSERT INTO notifications (
        channel, config_id, recipients, subject, message, priority,
        metadata, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING id`,
      [
        notification.channel,
        notification.configId,
        JSON.stringify(notification.recipients),
        notification.subject,
        notification.message,
        notification.priority,
        JSON.stringify(notification.metadata || {}),
        'pending',
      ]
    );

    return result.rows[0].id;
  }

  /**
   * Update notification status
   */
  private async updateNotificationStatus(
    notificationId: string,
    status: NotificationStatus,
    messageId?: string,
    errorMessage?: string
  ): Promise<void> {
    const updates: string[] = ['status = $1'];
    const values: any[] = [status];
    let paramCount = 2;

    if (status === 'sent') {
      updates.push(`sent_at = NOW()`);
    }

    if (messageId) {
      updates.push(`message_id = $${paramCount++}`);
      values.push(messageId);
    }

    if (errorMessage) {
      updates.push(`error_message = $${paramCount++}`);
      values.push(errorMessage);
    }

    values.push(notificationId);

    await this.pool.query(
      `UPDATE notifications SET ${updates.join(', ')} WHERE id = $${paramCount}`,
      values
    );
  }

  /**
   * Interpolate template with variables
   */
  private interpolateTemplate(template: string, variables: Record<string, any>): string {
    let result = template;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      result = result.replace(regex, String(value));
    }

    return result;
  }

  /**
   * Get color for priority
   */
  private getPriorityColor(priority: NotificationPriority): string {
    const colors: Record<NotificationPriority, string> = {
      low: '#36a64f',
      normal: '#2196F3',
      high: '#ff9800',
      urgent: '#f44336',
    };
    return colors[priority];
  }

  /**
   * Map priority to PagerDuty severity
   */
  private mapPriorityToSeverity(priority: NotificationPriority): string {
    const map: Record<NotificationPriority, string> = {
      low: 'info',
      normal: 'warning',
      high: 'error',
      urgent: 'critical',
    };
    return map[priority];
  }

  /**
   * Get notification history
   */
  async getNotificationHistory(
    filters: {
      channel?: NotificationChannel;
      status?: NotificationStatus;
      priority?: NotificationPriority;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<Notification[]> {
    let query = 'SELECT * FROM notifications WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (filters.channel) {
      query += ` AND channel = $${paramCount++}`;
      params.push(filters.channel);
    }

    if (filters.status) {
      query += ` AND status = $${paramCount++}`;
      params.push(filters.status);
    }

    if (filters.priority) {
      query += ` AND priority = $${paramCount++}`;
      params.push(filters.priority);
    }

    if (filters.startDate) {
      query += ` AND created_at >= $${paramCount++}`;
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      query += ` AND created_at <= $${paramCount++}`;
      params.push(filters.endDate);
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    params.push(filters.limit || 50, filters.offset || 0);

    const result = await this.pool.query(query, params);

    return result.rows.map(row => ({
      id: row.id,
      channel: row.channel,
      configId: row.config_id,
      recipients: row.recipients,
      subject: row.subject,
      message: row.message,
      priority: row.priority,
      metadata: row.metadata,
      status: row.status,
      sentAt: row.sent_at,
      deliveredAt: row.delivered_at,
      errorMessage: row.error_message,
    }));
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(startDate?: Date, endDate?: Date): Promise<{
    totalSent: number;
    totalFailed: number;
    byChannel: Record<string, { sent: number; failed: number }>;
    byPriority: Record<string, { sent: number; failed: number }>;
  }> {
    let query = 'SELECT channel, priority, status, COUNT(*) as count FROM notifications WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (startDate) {
      query += ` AND created_at >= $${paramCount++}`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND created_at <= $${paramCount++}`;
      params.push(endDate);
    }

    query += ' GROUP BY channel, priority, status';

    const result = await this.pool.query(query, params);

    let totalSent = 0;
    let totalFailed = 0;
    const byChannel: Record<string, { sent: number; failed: number }> = {};
    const byPriority: Record<string, { sent: number; failed: number }> = {};

    for (const row of result.rows) {
      const count = parseInt(row.count);

      if (row.status === 'sent') {
        totalSent += count;
      } else if (row.status === 'failed') {
        totalFailed += count;
      }

      if (!byChannel[row.channel]) {
        byChannel[row.channel] = { sent: 0, failed: 0 };
      }
      if (!byPriority[row.priority]) {
        byPriority[row.priority] = { sent: 0, failed: 0 };
      }

      if (row.status === 'sent') {
        byChannel[row.channel].sent += count;
        byPriority[row.priority].sent += count;
      } else if (row.status === 'failed') {
        byChannel[row.channel].failed += count;
        byPriority[row.priority].failed += count;
      }
    }

    return {
      totalSent,
      totalFailed,
      byChannel,
      byPriority,
    };
  }
}

export default NotificationService;
