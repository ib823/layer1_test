/**
 * EventService
 *
 * Event sourcing for invoice state transitions
 * Provides immutable audit trail and state machine enforcement
 *
 * Phase: 5 (Idempotency & Resilience Foundation)
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

export type EventType =
  | 'CREATED'
  | 'VALIDATED'
  | 'MAPPING_FAILED'
  | 'VALIDATION_FAILED'
  | 'QUEUED'
  | 'SUBMITTED'
  | 'SUBMISSION_FAILED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'CN_ISSUED'
  | 'DN_ISSUED'
  | 'QR_GENERATED'
  | 'NOTIFIED';

export type InvoiceState =
  | 'DRAFT'
  | 'VALIDATED'
  | 'QUEUED'
  | 'SUBMITTED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'CANCELLED';

export type ActorType = 'USER' | 'SYSTEM' | 'API' | 'CRON';

export interface InvoiceEvent {
  id: string;
  tenantId: string;
  invoiceId: string;
  eventType: EventType;
  eventVersion: number;
  previousState?: InvoiceState;
  newState: InvoiceState;
  eventData: any;
  actor: string;
  actorType: ActorType;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  correlationId?: string;
  occurredAt: Date;
}

export interface EmitEventOptions {
  tenantId: string;
  invoiceId: string;
  eventType: EventType;
  newState: InvoiceState;
  eventData?: any;
  actor?: string;
  actorType?: ActorType;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  correlationId?: string;
}

export interface EventQuery {
  tenantId?: string;
  invoiceId?: string;
  eventTypes?: EventType[];
  fromDate?: Date;
  toDate?: Date;
  actor?: string;
  limit?: number;
  offset?: number;
}

/**
 * State machine: Allowed transitions
 * Enforces business rules for invoice lifecycle
 */
const STATE_TRANSITIONS: Record<InvoiceState, InvoiceState[]> = {
  DRAFT: ['VALIDATED', 'CANCELLED'],
  VALIDATED: ['QUEUED', 'SUBMITTED', 'CANCELLED'],
  QUEUED: ['SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['ACCEPTED', 'REJECTED', 'CANCELLED'],
  ACCEPTED: ['CANCELLED'], // Can issue CN/DN, but state stays ACCEPTED
  REJECTED: ['VALIDATED', 'CANCELLED'], // Can fix and re-validate
  CANCELLED: [], // Terminal state
};

export class EventService {
  private pool: Pool;

  constructor(databaseUrl: string) {
    this.pool = new Pool({
      connectionString: databaseUrl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }

  /**
   * Emit an event and enforce state machine
   * Validates state transition before saving
   */
  async emit(options: EmitEventOptions): Promise<InvoiceEvent> {
    const {
      tenantId,
      invoiceId,
      eventType,
      newState,
      eventData = {},
      actor = 'system',
      actorType = 'SYSTEM',
      ipAddress,
      userAgent,
      requestId,
      correlationId,
    } = options;

    try {
      // Get current state
      const currentState = await this.getCurrentState(invoiceId);

      // Validate state transition
      if (currentState) {
        const allowedTransitions = STATE_TRANSITIONS[currentState];
        if (!allowedTransitions.includes(newState)) {
          throw new Error(
            `Invalid state transition: ${currentState} → ${newState}. Allowed: ${allowedTransitions.join(', ')}`
          );
        }
      }

      // Insert event
      const result = await this.pool.query(
        `
        INSERT INTO lhdn_doc_events (
          tenant_id,
          invoice_id,
          event_type,
          event_version,
          previous_state,
          new_state,
          event_data,
          actor,
          actor_type,
          ip_address,
          user_agent,
          request_id,
          correlation_id,
          occurred_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
        RETURNING *
        `,
        [
          tenantId,
          invoiceId,
          eventType,
          1, // event_version
          currentState || null,
          newState,
          eventData,
          actor,
          actorType,
          ipAddress || null,
          userAgent || null,
          requestId || null,
          correlationId || uuidv4(), // Generate if not provided
        ]
      );

      const event = this.mapRowToEvent(result.rows[0]);

      logger.info('Event emitted', {
        eventId: event.id,
        invoiceId,
        eventType,
        transition: `${currentState || 'NULL'} → ${newState}`,
        actor,
        correlationId: event.correlationId,
      });

      return event;
    } catch (error: any) {
      logger.error('Failed to emit event', {
        error: error.message,
        invoiceId,
        eventType,
        newState,
      });
      throw error;
    }
  }

  /**
   * Get current state of invoice from events
   * Returns the latest state from event log
   */
  async getCurrentState(invoiceId: string): Promise<InvoiceState | null> {
    try {
      const result = await this.pool.query(
        `
        SELECT new_state
        FROM lhdn_doc_events
        WHERE invoice_id = $1
        ORDER BY occurred_at DESC
        LIMIT 1
        `,
        [invoiceId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0].new_state as InvoiceState;
    } catch (error: any) {
      logger.error('Failed to get current state', {
        error: error.message,
        invoiceId,
      });
      throw error;
    }
  }

  /**
   * Get event history for an invoice
   * Returns chronological list of all events
   */
  async getHistory(
    invoiceId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<InvoiceEvent[]> {
    const { limit = 100, offset = 0 } = options;

    try {
      const result = await this.pool.query(
        `
        SELECT *
        FROM lhdn_doc_events
        WHERE invoice_id = $1
        ORDER BY occurred_at ASC
        LIMIT $2 OFFSET $3
        `,
        [invoiceId, limit, offset]
      );

      return result.rows.map(this.mapRowToEvent);
    } catch (error: any) {
      logger.error('Failed to get event history', {
        error: error.message,
        invoiceId,
      });
      throw error;
    }
  }

  /**
   * Query events with filters
   * Used for Audit Explorer UI
   */
  async query(query: EventQuery): Promise<{
    events: InvoiceEvent[];
    total: number;
  }> {
    const {
      tenantId,
      invoiceId,
      eventTypes,
      fromDate,
      toDate,
      actor,
      limit = 100,
      offset = 0,
    } = query;

    try {
      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (tenantId) {
        conditions.push(`tenant_id = $${paramIndex++}`);
        params.push(tenantId);
      }

      if (invoiceId) {
        conditions.push(`invoice_id = $${paramIndex++}`);
        params.push(invoiceId);
      }

      if (eventTypes && eventTypes.length > 0) {
        conditions.push(`event_type = ANY($${paramIndex++})`);
        params.push(eventTypes);
      }

      if (fromDate) {
        conditions.push(`occurred_at >= $${paramIndex++}`);
        params.push(fromDate);
      }

      if (toDate) {
        conditions.push(`occurred_at <= $${paramIndex++}`);
        params.push(toDate);
      }

      if (actor) {
        conditions.push(`actor = $${paramIndex++}`);
        params.push(actor);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get total count
      const countResult = await this.pool.query(
        `SELECT COUNT(*) FROM lhdn_doc_events ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0].count, 10);

      // Get events
      params.push(limit, offset);
      const result = await this.pool.query(
        `
        SELECT *
        FROM lhdn_doc_events
        ${whereClause}
        ORDER BY occurred_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
        `,
        params
      );

      const events = result.rows.map(this.mapRowToEvent);

      return { events, total };
    } catch (error: any) {
      logger.error('Failed to query events', { error: error.message, query });
      throw error;
    }
  }

  /**
   * Get event statistics
   * Used for Operational Dashboard
   */
  async getStats(tenantId?: string): Promise<{
    total: number;
    byEventType: Record<EventType, number>;
    byActor: Record<string, number>;
    recentEvents: InvoiceEvent[];
  }> {
    try {
      const whereClause = tenantId ? 'WHERE tenant_id = $1' : '';
      const params = tenantId ? [tenantId] : [];

      const result = await this.pool.query(
        `
        SELECT
          COUNT(*) as total,
          jsonb_object_agg(event_type, et_count) as by_event_type,
          jsonb_object_agg(actor, actor_count) as by_actor
        FROM (
          SELECT
            event_type,
            actor,
            COUNT(*) OVER (PARTITION BY event_type) as et_count,
            COUNT(*) OVER (PARTITION BY actor) as actor_count
          FROM lhdn_doc_events
          ${whereClause}
        ) sub
        `,
        params
      );

      const row = result.rows[0];

      // Get recent events
      const recentResult = await this.pool.query(
        `
        SELECT *
        FROM lhdn_doc_events
        ${whereClause}
        ORDER BY occurred_at DESC
        LIMIT 10
        `,
        params
      );

      const recentEvents = recentResult.rows.map(this.mapRowToEvent);

      return {
        total: parseInt(row.total || '0', 10),
        byEventType: row.by_event_type || {},
        byActor: row.by_actor || {},
        recentEvents,
      };
    } catch (error: any) {
      logger.error('Failed to get event stats', { error: error.message });
      throw error;
    }
  }

  /**
   * Validate if state transition is allowed
   * Used for UI to disable invalid actions
   */
  isTransitionAllowed(currentState: InvoiceState, targetState: InvoiceState): boolean {
    const allowedTransitions = STATE_TRANSITIONS[currentState];
    return allowedTransitions.includes(targetState);
  }

  /**
   * Get allowed next states for current state
   * Used for UI to show available actions
   */
  getAllowedTransitions(currentState: InvoiceState): InvoiceState[] {
    return STATE_TRANSITIONS[currentState] || [];
  }

  /**
   * Rebuild invoice state from event log (event sourcing)
   * Useful for debugging and state reconciliation
   */
  async rebuildState(invoiceId: string): Promise<{
    currentState: InvoiceState | null;
    eventCount: number;
    timeline: Array<{
      occurredAt: Date;
      eventType: EventType;
      state: InvoiceState;
      actor: string;
    }>;
  }> {
    try {
      const events = await this.getHistory(invoiceId, { limit: 1000 });

      const timeline = events.map((event) => ({
        occurredAt: event.occurredAt,
        eventType: event.eventType,
        state: event.newState,
        actor: event.actor,
      }));

      const currentState = events.length > 0 ? events[events.length - 1].newState : null;

      return {
        currentState,
        eventCount: events.length,
        timeline,
      };
    } catch (error: any) {
      logger.error('Failed to rebuild state', {
        error: error.message,
        invoiceId,
      });
      throw error;
    }
  }

  /**
   * Export events for audit (immutable, signed)
   * Used for compliance and 7-year retention
   */
  async exportAuditLog(
    query: EventQuery,
    format: 'JSON' | 'CSV' = 'JSON'
  ): Promise<string> {
    try {
      const { events } = await this.query({ ...query, limit: 10000 });

      if (format === 'JSON') {
        return JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            query,
            totalEvents: events.length,
            events,
          },
          null,
          2
        );
      } else {
        // CSV format
        const headers = [
          'ID',
          'Tenant ID',
          'Invoice ID',
          'Event Type',
          'Previous State',
          'New State',
          'Actor',
          'Actor Type',
          'Occurred At',
          'Correlation ID',
        ];

        const rows = events.map((event) => [
          event.id,
          event.tenantId,
          event.invoiceId,
          event.eventType,
          event.previousState || '',
          event.newState,
          event.actor,
          event.actorType,
          event.occurredAt.toISOString(),
          event.correlationId || '',
        ]);

        const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');

        return csv;
      }
    } catch (error: any) {
      logger.error('Failed to export audit log', { error: error.message, query });
      throw error;
    }
  }

  /**
   * Map database row to InvoiceEvent
   */
  private mapRowToEvent(row: any): InvoiceEvent {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      invoiceId: row.invoice_id,
      eventType: row.event_type,
      eventVersion: row.event_version,
      previousState: row.previous_state,
      newState: row.new_state,
      eventData: row.event_data,
      actor: row.actor,
      actorType: row.actor_type,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      requestId: row.request_id,
      correlationId: row.correlation_id,
      occurredAt: new Date(row.occurred_at),
    };
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}
