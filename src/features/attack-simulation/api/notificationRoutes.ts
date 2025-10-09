/**
 * Notification API Routes
 *
 * Provides endpoints for multi-channel notification management:
 * - Channel configuration (email, Slack, Teams, SMS, PagerDuty, webhooks)
 * - Notification sending (single and bulk)
 * - Template management
 * - Subscription preferences
 * - Delivery tracking
 */

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { NotificationService, NotificationConfig, Notification } from '../services/NotificationService';

export function setupNotificationRoutes(app: Router, pool: Pool): void {
  const notificationService = new NotificationService(pool);

  /**
   * GET /api/simulations/notifications/channels
   * List supported notification channels
   */
  app.get('/api/simulations/notifications/channels', async (req: Request, res: Response) => {
    res.json({
      success: true,
      channels: [
        {
          id: 'email',
          name: 'Email',
          description: 'Send notifications via SMTP',
          configFields: ['smtpHost', 'smtpPort', 'smtpUser', 'smtpPassword', 'fromEmail', 'fromName'],
        },
        {
          id: 'slack',
          name: 'Slack',
          description: 'Send messages to Slack channels or users',
          configFields: ['webhookUrl', 'botToken', 'channel'],
        },
        {
          id: 'teams',
          name: 'Microsoft Teams',
          description: 'Send adaptive cards to Teams channels',
          configFields: ['webhookUrl'],
        },
        {
          id: 'sms',
          name: 'SMS (Twilio)',
          description: 'Send SMS messages via Twilio',
          configFields: ['accountSid', 'authToken', 'fromNumber'],
        },
        {
          id: 'pagerduty',
          name: 'PagerDuty',
          description: 'Create PagerDuty incidents',
          configFields: ['routingKey', 'integrationKey'],
        },
        {
          id: 'webhook',
          name: 'Custom Webhook',
          description: 'Send notifications to custom HTTP endpoints',
          configFields: ['url', 'method', 'headers'],
        },
      ],
    });
  });

  /**
   * GET /api/simulations/notifications/configs
   * List notification configurations
   */
  app.get('/api/simulations/notifications/configs', async (req: Request, res: Response) => {
    try {
      const { channel, enabled } = req.query;

      let query = 'SELECT id, channel, name, enabled, created_at, updated_at FROM notification_configs WHERE 1=1';
      const params: any[] = [];
      let paramCount = 1;

      if (channel) {
        query += ` AND channel = $${paramCount++}`;
        params.push(channel);
      }

      if (enabled !== undefined) {
        query += ` AND enabled = $${paramCount++}`;
        params.push(enabled === 'true');
      }

      query += ' ORDER BY created_at DESC';

      const result = await pool.query(query, params);

      res.json({
        success: true,
        configs: result.rows,
      });
    } catch (error) {
      console.error('Failed to fetch notification configs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch notification configurations',
      });
    }
  });

  /**
   * POST /api/simulations/notifications/configs
   * Create notification configuration
   */
  app.post('/api/simulations/notifications/configs', async (req: Request, res: Response) => {
    try {
      const { channel, name, enabled, config } = req.body;

      if (!channel || !name || !config) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: channel, name, config',
        });
      }

      const result = await pool.query(
        `INSERT INTO notification_configs (
          channel, name, enabled, config, created_by
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
        [channel, name, enabled !== undefined ? enabled : true, JSON.stringify(config), req.body.userId || null]
      );

      res.json({
        success: true,
        config: {
          ...result.rows[0],
          config: '***', // Redact sensitive config
        },
      });
    } catch (error) {
      console.error('Failed to create notification config:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create configuration',
      });
    }
  });

  /**
   * PUT /api/simulations/notifications/configs/:id
   * Update notification configuration
   */
  app.put('/api/simulations/notifications/configs/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, enabled, config } = req.body;

      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (name) {
        updates.push(`name = $${paramCount++}`);
        values.push(name);
      }

      if (enabled !== undefined) {
        updates.push(`enabled = $${paramCount++}`);
        values.push(enabled);
      }

      if (config) {
        updates.push(`config = $${paramCount++}`);
        values.push(JSON.stringify(config));
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No fields to update',
        });
      }

      updates.push(`updated_at = NOW()`);
      values.push(id);

      const query = `UPDATE notification_configs SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
      const result = await pool.query(query, values);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Configuration not found',
        });
      }

      res.json({
        success: true,
        config: {
          ...result.rows[0],
          config: '***',
        },
      });
    } catch (error) {
      console.error('Failed to update notification config:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update configuration',
      });
    }
  });

  /**
   * DELETE /api/simulations/notifications/configs/:id
   * Delete notification configuration
   */
  app.delete('/api/simulations/notifications/configs/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await pool.query('DELETE FROM notification_configs WHERE id = $1 RETURNING id', [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Configuration not found',
        });
      }

      res.json({
        success: true,
        message: 'Configuration deleted successfully',
      });
    } catch (error) {
      console.error('Failed to delete notification config:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete configuration',
      });
    }
  });

  /**
   * POST /api/simulations/notifications/send
   * Send notification
   */
  app.post('/api/simulations/notifications/send', async (req: Request, res: Response) => {
    try {
      const notification: Notification = req.body;

      if (!notification.channel || !notification.recipients || !notification.message) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: channel, recipients, message',
        });
      }

      const result = await notificationService.sendNotification(notification);

      res.json(result);
    } catch (error) {
      console.error('Failed to send notification:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send notification',
      });
    }
  });

  /**
   * POST /api/simulations/notifications/send-bulk
   * Send bulk notifications
   */
  app.post('/api/simulations/notifications/send-bulk', async (req: Request, res: Response) => {
    try {
      const { notifications } = req.body;

      if (!notifications || !Array.isArray(notifications)) {
        return res.status(400).json({
          success: false,
          error: 'Missing or invalid parameter: notifications (must be an array)',
        });
      }

      const results = await notificationService.sendBulkNotifications(notifications);

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;

      res.json({
        success: true,
        summary: {
          total: results.length,
          succeeded: successCount,
          failed: failureCount,
        },
        results,
      });
    } catch (error) {
      console.error('Failed to send bulk notifications:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send bulk notifications',
      });
    }
  });

  /**
   * POST /api/simulations/notifications/send-from-template
   * Send notification from template
   */
  app.post('/api/simulations/notifications/send-from-template', async (req: Request, res: Response) => {
    try {
      const { templateId, recipients, variables, priority } = req.body;

      if (!templateId || !recipients || !Array.isArray(recipients)) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: templateId, recipients (array)',
        });
      }

      const result = await notificationService.sendFromTemplate(templateId, recipients, variables || {}, priority);

      res.json(result);
    } catch (error) {
      console.error('Failed to send notification from template:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send notification',
      });
    }
  });

  /**
   * GET /api/simulations/notifications/history
   * Get notification history
   */
  app.get('/api/simulations/notifications/history', async (req: Request, res: Response) => {
    try {
      const { channel, status, priority, startDate, endDate, limit, offset } = req.query;

      const filters: any = {
        channel,
        status,
        priority,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: limit ? Number(limit) : 50,
        offset: offset ? Number(offset) : 0,
      };

      const notifications = await notificationService.getNotificationHistory(filters);

      res.json({
        success: true,
        notifications,
        pagination: {
          limit: filters.limit,
          offset: filters.offset,
        },
      });
    } catch (error) {
      console.error('Failed to fetch notification history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch notification history',
      });
    }
  });

  /**
   * GET /api/simulations/notifications/stats
   * Get notification statistics
   */
  app.get('/api/simulations/notifications/stats', async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.query;

      const stats = await notificationService.getNotificationStats(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json({
        success: true,
        stats,
      });
    } catch (error) {
      console.error('Failed to fetch notification stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch notification statistics',
      });
    }
  });

  /**
   * GET /api/simulations/notifications/templates
   * List notification templates
   */
  app.get('/api/simulations/notifications/templates', async (req: Request, res: Response) => {
    try {
      const { channel, isActive } = req.query;

      let query = 'SELECT * FROM notification_templates WHERE 1=1';
      const params: any[] = [];
      let paramCount = 1;

      if (channel) {
        query += ` AND channel = $${paramCount++}`;
        params.push(channel);
      }

      if (isActive !== undefined) {
        query += ` AND is_active = $${paramCount++}`;
        params.push(isActive === 'true');
      }

      query += ' ORDER BY created_at DESC';

      const result = await pool.query(query, params);

      res.json({
        success: true,
        templates: result.rows,
      });
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch notification templates',
      });
    }
  });

  /**
   * POST /api/simulations/notifications/templates
   * Create notification template
   */
  app.post('/api/simulations/notifications/templates', async (req: Request, res: Response) => {
    try {
      const {
        name,
        description,
        channel,
        subjectTemplate,
        messageTemplate,
        priority,
        variables,
        isActive,
      } = req.body;

      if (!name || !channel || !messageTemplate) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: name, channel, messageTemplate',
        });
      }

      const result = await pool.query(
        `INSERT INTO notification_templates (
          name, description, channel, subject_template, message_template,
          priority, variables, is_active, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          name,
          description,
          channel,
          subjectTemplate,
          messageTemplate,
          priority || 'normal',
          variables || [],
          isActive !== undefined ? isActive : true,
          req.body.userId || null,
        ]
      );

      res.json({
        success: true,
        template: result.rows[0],
      });
    } catch (error) {
      console.error('Failed to create template:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create template',
      });
    }
  });

  /**
   * PUT /api/simulations/notifications/templates/:id
   * Update notification template
   */
  app.put('/api/simulations/notifications/templates/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      const fields = [
        'name',
        'description',
        'subject_template',
        'message_template',
        'priority',
        'variables',
        'is_active',
      ];

      for (const field of fields) {
        const camelField = field.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
        if (req.body[camelField] !== undefined) {
          updates.push(`${field} = $${paramCount++}`);
          values.push(req.body[camelField]);
        }
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No fields to update',
        });
      }

      updates.push(`updated_at = NOW()`);
      values.push(id);

      const query = `UPDATE notification_templates SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
      const result = await pool.query(query, values);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Template not found',
        });
      }

      res.json({
        success: true,
        template: result.rows[0],
      });
    } catch (error) {
      console.error('Failed to update template:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update template',
      });
    }
  });

  /**
   * DELETE /api/simulations/notifications/templates/:id
   * Delete notification template
   */
  app.delete('/api/simulations/notifications/templates/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await pool.query('DELETE FROM notification_templates WHERE id = $1 RETURNING id', [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Template not found',
        });
      }

      res.json({
        success: true,
        message: 'Template deleted successfully',
      });
    } catch (error) {
      console.error('Failed to delete template:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete template',
      });
    }
  });

  /**
   * GET /api/simulations/notifications/subscriptions
   * List user notification subscriptions
   */
  app.get('/api/simulations/notifications/subscriptions', async (req: Request, res: Response) => {
    try {
      const { userId, eventType, enabled } = req.query;

      let query = 'SELECT * FROM notification_subscriptions WHERE 1=1';
      const params: any[] = [];
      let paramCount = 1;

      if (userId) {
        query += ` AND user_id = $${paramCount++}`;
        params.push(userId);
      }

      if (eventType) {
        query += ` AND event_type = $${paramCount++}`;
        params.push(eventType);
      }

      if (enabled !== undefined) {
        query += ` AND enabled = $${paramCount++}`;
        params.push(enabled === 'true');
      }

      query += ' ORDER BY created_at DESC';

      const result = await pool.query(query, params);

      res.json({
        success: true,
        subscriptions: result.rows,
      });
    } catch (error) {
      console.error('Failed to fetch subscriptions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch subscriptions',
      });
    }
  });

  /**
   * POST /api/simulations/notifications/subscriptions
   * Create notification subscription
   */
  app.post('/api/simulations/notifications/subscriptions', async (req: Request, res: Response) => {
    try {
      const { userId, eventType, channels, enabled, filterConditions } = req.body;

      if (!userId || !eventType || !channels || !Array.isArray(channels)) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: userId, eventType, channels (array)',
        });
      }

      const result = await pool.query(
        `INSERT INTO notification_subscriptions (
          user_id, event_type, channels, enabled, filter_conditions
        ) VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id, event_type) DO UPDATE SET
          channels = EXCLUDED.channels,
          enabled = EXCLUDED.enabled,
          filter_conditions = EXCLUDED.filter_conditions,
          updated_at = NOW()
        RETURNING *`,
        [userId, eventType, channels, enabled !== undefined ? enabled : true, JSON.stringify(filterConditions || {})]
      );

      res.json({
        success: true,
        subscription: result.rows[0],
      });
    } catch (error) {
      console.error('Failed to create subscription:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create subscription',
      });
    }
  });

  /**
   * DELETE /api/simulations/notifications/subscriptions/:id
   * Delete notification subscription
   */
  app.delete('/api/simulations/notifications/subscriptions/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await pool.query('DELETE FROM notification_subscriptions WHERE id = $1 RETURNING id', [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Subscription not found',
        });
      }

      res.json({
        success: true,
        message: 'Subscription deleted successfully',
      });
    } catch (error) {
      console.error('Failed to delete subscription:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete subscription',
      });
    }
  });
}

export default setupNotificationRoutes;
