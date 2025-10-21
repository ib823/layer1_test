/**
 * Event Service Integration Tests
 *
 * Tests event sourcing and state machine enforcement with real database
 */

import { EventService } from '../../src/services/EventService';
import { TestEnvironment } from './setup';

describe('EventService Integration Tests', () => {
  let service: EventService;
  let connectionString: string;
  const tenantId = '00000000-0000-0000-0000-000000000001';
  const invoiceId = '00000000-0000-0000-0000-000000000020';

  beforeAll(async () => {
    connectionString = TestEnvironment.getConnectionString();
  }, 300000);

  beforeEach(async () => {
    await TestEnvironment.cleanup();
    await TestEnvironment.insertFixtures();

    service = new EventService(connectionString);
  });

  afterEach(async () => {
    await service.close();
  });

  describe('Event Emission', () => {
    it('should emit event and transition state', async () => {
      const event = await service.emit({
        tenantId,
        invoiceId,
        eventType: 'CREATED',
        newState: 'DRAFT',
        eventData: { test: 'data' },
        actor: 'test-user',
        actorType: 'USER',
      });

      expect(event.id).toBeDefined();
      expect(event.tenantId).toBe(tenantId);
      expect(event.invoiceId).toBe(invoiceId);
      expect(event.eventType).toBe('CREATED');
      expect(event.newState).toBe('DRAFT');
      expect(event.previousState).toBeNull();
    });

    it('should track previous state on subsequent events', async () => {
      await service.emit({
        tenantId,
        invoiceId,
        eventType: 'CREATED',
        newState: 'DRAFT',
        actor: 'test-user',
      });

      const event2 = await service.emit({
        tenantId,
        invoiceId,
        eventType: 'VALIDATED',
        newState: 'VALIDATED',
        actor: 'system',
        actorType: 'SYSTEM',
      });

      expect(event2.previousState).toBe('DRAFT');
      expect(event2.newState).toBe('VALIDATED');
    });
  });

  describe('State Machine Enforcement', () => {
    it('should allow valid state transitions', async () => {
      // DRAFT → VALIDATED
      await service.emit({
        tenantId,
        invoiceId,
        eventType: 'CREATED',
        newState: 'DRAFT',
        actor: 'test-user',
      });

      await expect(
        service.emit({
          tenantId,
          invoiceId,
          eventType: 'VALIDATED',
          newState: 'VALIDATED',
          actor: 'system',
        })
      ).resolves.toBeDefined();
    });

    it('should reject invalid state transitions', async () => {
      // DRAFT → ACCEPTED (invalid, must go through VALIDATED/SUBMITTED)
      await service.emit({
        tenantId,
        invoiceId,
        eventType: 'CREATED',
        newState: 'DRAFT',
        actor: 'test-user',
      });

      await expect(
        service.emit({
          tenantId,
          invoiceId,
          eventType: 'ACCEPTED',
          newState: 'ACCEPTED',
          actor: 'system',
        })
      ).rejects.toThrow('Invalid state transition');
    });

    it('should enforce terminal state (CANCELLED)', async () => {
      // Set up: DRAFT → CANCELLED
      await service.emit({
        tenantId,
        invoiceId,
        eventType: 'CREATED',
        newState: 'DRAFT',
        actor: 'test-user',
      });

      await service.emit({
        tenantId,
        invoiceId,
        eventType: 'CANCELLED',
        newState: 'CANCELLED',
        actor: 'test-user',
      });

      // Try to transition from CANCELLED (should fail)
      await expect(
        service.emit({
          tenantId,
          invoiceId,
          eventType: 'VALIDATED',
          newState: 'VALIDATED',
          actor: 'system',
        })
      ).rejects.toThrow('Invalid state transition');
    });

    it('should allow REJECTED → VALIDATED (resubmission)', async () => {
      // Set up full flow to REJECTED
      await service.emit({
        tenantId,
        invoiceId,
        eventType: 'CREATED',
        newState: 'DRAFT',
        actor: 'test-user',
      });

      await service.emit({
        tenantId,
        invoiceId,
        eventType: 'VALIDATED',
        newState: 'VALIDATED',
        actor: 'system',
      });

      await service.emit({
        tenantId,
        invoiceId,
        eventType: 'SUBMITTED',
        newState: 'SUBMITTED',
        actor: 'system',
      });

      await service.emit({
        tenantId,
        invoiceId,
        eventType: 'REJECTED',
        newState: 'REJECTED',
        actor: 'system',
      });

      // Re-validate for resubmission
      await expect(
        service.emit({
          tenantId,
          invoiceId,
          eventType: 'VALIDATED',
          newState: 'VALIDATED',
          actor: 'system',
        })
      ).resolves.toBeDefined();
    });
  });

  describe('Event History', () => {
    it('should retrieve event history chronologically', async () => {
      // Create event chain
      await service.emit({
        tenantId,
        invoiceId,
        eventType: 'CREATED',
        newState: 'DRAFT',
        actor: 'user1',
      });

      await service.emit({
        tenantId,
        invoiceId,
        eventType: 'VALIDATED',
        newState: 'VALIDATED',
        actor: 'system',
      });

      await service.emit({
        tenantId,
        invoiceId,
        eventType: 'SUBMITTED',
        newState: 'SUBMITTED',
        actor: 'system',
      });

      const history = await service.getHistory(invoiceId);

      expect(history.length).toBe(3);
      expect(history[0].eventType).toBe('CREATED');
      expect(history[1].eventType).toBe('VALIDATED');
      expect(history[2].eventType).toBe('SUBMITTED');
    });

    it('should support pagination in history', async () => {
      // Create 10 events
      await service.emit({
        tenantId,
        invoiceId,
        eventType: 'CREATED',
        newState: 'DRAFT',
        actor: 'user',
      });

      for (let i = 0; i < 9; i++) {
        await service.emit({
          tenantId,
          invoiceId,
          eventType: 'VALIDATED',
          newState: 'VALIDATED',
          actor: 'system',
          eventData: { iteration: i },
        });
      }

      const page1 = await service.getHistory(invoiceId, { limit: 5, offset: 0 });
      const page2 = await service.getHistory(invoiceId, { limit: 5, offset: 5 });

      expect(page1.length).toBe(5);
      expect(page2.length).toBe(5);
    });
  });

  describe('Event Querying', () => {
    it('should filter events by type', async () => {
      const invoice2 = '00000000-0000-0000-0000-000000000021';

      await service.emit({
        tenantId,
        invoiceId,
        eventType: 'CREATED',
        newState: 'DRAFT',
        actor: 'user',
      });

      await service.emit({
        tenantId,
        invoiceId: invoice2,
        eventType: 'VALIDATED',
        newState: 'VALIDATED',
        actor: 'system',
      });

      const { events } = await service.query({
        tenantId,
        eventTypes: ['CREATED'],
      });

      expect(events.length).toBe(1);
      expect(events[0].eventType).toBe('CREATED');
    });

    it('should filter events by actor', async () => {
      await service.emit({
        tenantId,
        invoiceId,
        eventType: 'CREATED',
        newState: 'DRAFT',
        actor: 'user1',
      });

      await service.emit({
        tenantId,
        invoiceId,
        eventType: 'VALIDATED',
        newState: 'VALIDATED',
        actor: 'system',
      });

      const { events } = await service.query({
        tenantId,
        actor: 'user1',
      });

      expect(events.length).toBe(1);
      expect(events[0].actor).toBe('user1');
    });

    it('should return total count', async () => {
      await service.emit({
        tenantId,
        invoiceId,
        eventType: 'CREATED',
        newState: 'DRAFT',
        actor: 'user',
      });

      await service.emit({
        tenantId,
        invoiceId,
        eventType: 'VALIDATED',
        newState: 'VALIDATED',
        actor: 'system',
      });

      const { total } = await service.query({ tenantId });

      expect(total).toBe(2);
    });
  });

  describe('State Reconstruction', () => {
    it('should rebuild current state from events', async () => {
      // Create event chain
      await service.emit({
        tenantId,
        invoiceId,
        eventType: 'CREATED',
        newState: 'DRAFT',
        actor: 'user',
      });

      await service.emit({
        tenantId,
        invoiceId,
        eventType: 'VALIDATED',
        newState: 'VALIDATED',
        actor: 'system',
      });

      await service.emit({
        tenantId,
        invoiceId,
        eventType: 'SUBMITTED',
        newState: 'SUBMITTED',
        actor: 'system',
      });

      const state = await service.rebuildState(invoiceId);

      expect(state.currentState).toBe('SUBMITTED');
      expect(state.eventCount).toBe(3);
      expect(state.timeline.length).toBe(3);
    });
  });

  describe('Audit Export', () => {
    it('should export events as JSON', async () => {
      await service.emit({
        tenantId,
        invoiceId,
        eventType: 'CREATED',
        newState: 'DRAFT',
        actor: 'user',
      });

      const json = await service.exportAuditLog({ tenantId }, 'JSON');
      const parsed = JSON.parse(json);

      expect(parsed.totalEvents).toBe(1);
      expect(parsed.events[0].eventType).toBe('CREATED');
    });

    it('should export events as CSV', async () => {
      await service.emit({
        tenantId,
        invoiceId,
        eventType: 'CREATED',
        newState: 'DRAFT',
        actor: 'user',
      });

      const csv = await service.exportAuditLog({ tenantId }, 'CSV');

      expect(csv).toContain('ID,Tenant ID,Invoice ID');
      expect(csv).toContain('CREATED');
    });
  });

  describe('Correlation Tracking', () => {
    it('should track correlation ID across related events', async () => {
      const correlationId = 'corr-12345';

      await service.emit({
        tenantId,
        invoiceId,
        eventType: 'CREATED',
        newState: 'DRAFT',
        actor: 'user',
        correlationId,
      });

      await service.emit({
        tenantId,
        invoiceId,
        eventType: 'VALIDATED',
        newState: 'VALIDATED',
        actor: 'system',
        correlationId,
      });

      const { events } = await service.query({ tenantId });

      expect(events[0].correlationId).toBe(correlationId);
      expect(events[1].correlationId).toBe(correlationId);
    });
  });

  describe('Immutability', () => {
    it('should prevent event modification (database trigger)', async () => {
      const event = await service.emit({
        tenantId,
        invoiceId,
        eventType: 'CREATED',
        newState: 'DRAFT',
        actor: 'user',
      });

      const pool = TestEnvironment.getPool();

      // Try to update event (should fail due to trigger)
      await expect(
        pool.query(`UPDATE lhdn_doc_events SET actor = 'hacker' WHERE id = $1`, [event.id])
      ).rejects.toThrow();
    });

    it('should prevent event deletion (database trigger)', async () => {
      const event = await service.emit({
        tenantId,
        invoiceId,
        eventType: 'CREATED',
        newState: 'DRAFT',
        actor: 'user',
      });

      const pool = TestEnvironment.getPool();

      // Try to delete event (should fail due to trigger)
      await expect(
        pool.query(`DELETE FROM lhdn_doc_events WHERE id = $1`, [event.id])
      ).rejects.toThrow();
    });
  });
});
