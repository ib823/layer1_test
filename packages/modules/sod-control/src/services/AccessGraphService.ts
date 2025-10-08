/**
 * Access Graph Service
 *
 * Manages the canonical access graph:
 * - Normalizes data from connectors
 * - Persists to database
 * - Maintains snapshots for delta analysis
 */

import {
  CanonicalUser,
  CanonicalRole,
  CanonicalPermission,
  UserRoleAssignment,
  SystemConnection,
  SyncResult,
} from '../types';

export interface AccessGraphSnapshot {
  id: string;
  tenantId: string;
  snapshotDate: Date;
  snapshotType: 'SCHEDULED' | 'ON_DEMAND' | 'PRE_CHANGE' | 'POST_CHANGE' | 'CERTIFICATION';
  totalUsers: number;
  totalRoles: number;
  totalAssignments: number;
  totalSystems: number;
  snapshotData: {
    users: CanonicalUser[];
    roles: CanonicalRole[];
    permissions: CanonicalPermission[];
    assignments: UserRoleAssignment[];
  };
  snapshotHash: string;
}

export interface DeltaChange {
  changeType: 'USER_ADDED' | 'USER_REMOVED' | 'USER_MODIFIED' | 'ROLE_ASSIGNED' | 'ROLE_REVOKED' | 'ROLE_MODIFIED' | 'PERMISSION_CHANGED';
  entityType: 'USER' | 'ROLE' | 'ASSIGNMENT' | 'PERMISSION' | 'SYSTEM';
  entityId: string;
  entityName?: string;
  oldValue?: any;
  newValue?: any;
  introducesSodRisk: boolean;
  riskAssessment?: any;
}

export class AccessGraphService {
  private db: any; // Database connection (Knex or similar)

  constructor(db: any) {
    this.db = db;
  }

  /**
   * Persist normalized users to database
   */
  async persistUsers(users: CanonicalUser[]): Promise<void> {
    if (users.length === 0) return;

    // Batch insert with conflict handling (upsert)
    await this.db('access_graph_users')
      .insert(users.map(user => ({
        tenant_id: user.tenantId,
        user_id: user.userId,
        user_name: user.userName,
        email: user.email,
        full_name: user.fullName,
        source_system_id: user.sourceSystemId,
        is_active: user.isActive,
        is_locked: user.isLocked,
        user_type: user.userType,
        department: user.department,
        position: user.position,
        org_unit: user.orgUnit,
        cost_center: user.costCenter,
        manager_id: user.managerId,
        last_login_at: user.lastLoginAt,
        valid_from: user.validFrom,
        valid_to: user.validTo,
        source_data: JSON.stringify(user.sourceData),
        synced_at: new Date(),
      })))
      .onConflict(['tenant_id', 'source_system_id', 'user_id'])
      .merge();
  }

  /**
   * Persist normalized roles to database
   */
  async persistRoles(roles: CanonicalRole[]): Promise<void> {
    if (roles.length === 0) return;

    await this.db('access_graph_roles')
      .insert(roles.map(role => ({
        tenant_id: role.tenantId,
        role_id: role.roleId,
        role_name: role.roleName,
        role_description: role.roleDescription,
        source_system_id: role.sourceSystemId,
        role_type: role.roleType,
        is_technical: role.isTechnical,
        is_critical: role.isCritical,
        business_process: role.businessProcess,
        risk_level: role.riskLevel,
        parent_role_id: role.parentRoleId,
        source_data: JSON.stringify(role.sourceData),
        synced_at: new Date(),
      })))
      .onConflict(['tenant_id', 'source_system_id', 'role_id'])
      .merge();
  }

  /**
   * Persist normalized permissions to database
   */
  async persistPermissions(permissions: CanonicalPermission[]): Promise<void> {
    if (permissions.length === 0) return;

    await this.db('sod_permissions')
      .insert(permissions.map(perm => ({
        tenant_id: perm.tenantId,
        permission_code: perm.permissionCode,
        permission_name: perm.permissionName,
        source_system_id: perm.sourceSystemId,
        source_system_type: perm.sourceSystemType,
        auth_object: perm.authObject,
        field_values: JSON.stringify(perm.fieldValues),
        normalized_action: perm.normalizedAction,
        normalized_object: perm.normalizedObject,
        scope: JSON.stringify(perm.scope),
      })))
      .onConflict(['tenant_id', 'source_system_id', 'permission_code'])
      .merge();
  }

  /**
   * Persist user-role assignments to database
   */
  async persistAssignments(assignments: UserRoleAssignment[]): Promise<void> {
    if (assignments.length === 0) return;

    // First, resolve user and role IDs from canonical tables
    const enrichedAssignments = await Promise.all(
      assignments.map(async (assignment) => {
        const user = await this.db('access_graph_users')
          .where({
            tenant_id: assignment.tenantId,
            user_id: assignment.userId,
          })
          .first();

        const role = await this.db('access_graph_roles')
          .where({
            tenant_id: assignment.tenantId,
            role_id: assignment.roleId,
          })
          .first();

        if (!user || !role) {
          console.warn(`Skipping assignment: User or Role not found (user: ${assignment.userId}, role: ${assignment.roleId})`);
          return null;
        }

        return {
          tenant_id: assignment.tenantId,
          user_id: user.id, // Internal UUID
          role_id: role.id, // Internal UUID
          assignment_type: assignment.assignmentType,
          org_scope: JSON.stringify(assignment.orgScope),
          valid_from: assignment.validFrom,
          valid_to: assignment.validTo,
          assigned_by: assignment.assignedBy,
          assigned_at: assignment.assignedAt,
          assignment_reason: assignment.assignmentReason,
          ticket_reference: assignment.ticketReference,
          synced_at: new Date(),
        };
      })
    );

    const validAssignments = enrichedAssignments.filter(a => a !== null);

    if (validAssignments.length > 0) {
      await this.db('access_graph_assignments')
        .insert(validAssignments)
        .onConflict(['tenant_id', 'user_id', 'role_id', 'assignment_type'])
        .merge();
    }
  }

  /**
   * Create access graph snapshot
   */
  async createSnapshot(
    tenantId: string,
    snapshotType: AccessGraphSnapshot['snapshotType'],
    triggeredBy?: string
  ): Promise<AccessGraphSnapshot> {
    // Fetch all current access data
    const users = await this.db('access_graph_users')
      .where({ tenant_id: tenantId })
      .select('*');

    const roles = await this.db('access_graph_roles')
      .where({ tenant_id: tenantId })
      .select('*');

    const permissions = await this.db('sod_permissions')
      .where({ tenant_id: tenantId })
      .select('*');

    const assignments = await this.db('access_graph_assignments')
      .where({ tenant_id: tenantId })
      .select('*');

    const systems = await this.db('access_systems')
      .where({ tenant_id: tenantId })
      .select('*');

    const snapshotData = {
      users,
      roles,
      permissions,
      assignments,
    };

    // Calculate hash for tamper detection
    const snapshotHash = this.calculateHash(snapshotData);

    // Insert snapshot
    const [snapshot] = await this.db('access_graph_snapshots')
      .insert({
        tenant_id: tenantId,
        snapshot_date: new Date(),
        snapshot_type: snapshotType,
        triggered_by: triggeredBy,
        total_users: users.length,
        total_roles: roles.length,
        total_assignments: assignments.length,
        total_systems: systems.length,
        snapshot_data: JSON.stringify(snapshotData),
        snapshot_hash: snapshotHash,
        status: 'COMPLETED',
      })
      .returning('*');

    return {
      id: snapshot.id,
      tenantId: snapshot.tenant_id,
      snapshotDate: snapshot.snapshot_date,
      snapshotType: snapshot.snapshot_type,
      totalUsers: snapshot.total_users,
      totalRoles: snapshot.total_roles,
      totalAssignments: snapshot.total_assignments,
      totalSystems: snapshot.total_systems,
      snapshotData,
      snapshotHash: snapshot.snapshot_hash,
    };
  }

  /**
   * Compare two snapshots and detect deltas
   */
  async detectDeltas(
    fromSnapshotId: string,
    toSnapshotId: string
  ): Promise<DeltaChange[]> {
    const fromSnapshot = await this.db('access_graph_snapshots')
      .where({ id: fromSnapshotId })
      .first();

    const toSnapshot = await this.db('access_graph_snapshots')
      .where({ id: toSnapshotId })
      .first();

    if (!fromSnapshot || !toSnapshot) {
      throw new Error('Snapshot not found');
    }

    const fromData = JSON.parse(fromSnapshot.snapshot_data);
    const toData = JSON.parse(toSnapshot.snapshot_data);

    const deltas: DeltaChange[] = [];

    // Detect user changes
    deltas.push(...this.detectUserDeltas(fromData.users, toData.users));

    // Detect role assignment changes
    deltas.push(...this.detectAssignmentDeltas(fromData.assignments, toData.assignments));

    // Persist deltas
    if (deltas.length > 0) {
      await this.db('access_graph_deltas')
        .insert(deltas.map(delta => ({
          tenant_id: toSnapshot.tenant_id,
          from_snapshot_id: fromSnapshotId,
          to_snapshot_id: toSnapshotId,
          change_type: delta.changeType,
          entity_type: delta.entityType,
          entity_id: delta.entityId,
          entity_name: delta.entityName,
          old_value: JSON.stringify(delta.oldValue),
          new_value: JSON.stringify(delta.newValue),
          introduces_sod_risk: delta.introducesSodRisk,
          risk_assessment: JSON.stringify(delta.riskAssessment),
        })));
    }

    return deltas;
  }

  /**
   * Detect user deltas
   */
  private detectUserDeltas(fromUsers: any[], toUsers: any[]): DeltaChange[] {
    const deltas: DeltaChange[] = [];
    const fromUserMap = new Map(fromUsers.map(u => [u.user_id, u]));
    const toUserMap = new Map(toUsers.map(u => [u.user_id, u]));

    // Detect added users
    for (const [userId, user] of toUserMap) {
      if (!fromUserMap.has(userId)) {
        deltas.push({
          changeType: 'USER_ADDED',
          entityType: 'USER',
          entityId: userId,
          entityName: user.user_name,
          newValue: user,
          introducesSodRisk: false, // Will be assessed by rule engine
        });
      }
    }

    // Detect removed users
    for (const [userId, user] of fromUserMap) {
      if (!toUserMap.has(userId)) {
        deltas.push({
          changeType: 'USER_REMOVED',
          entityType: 'USER',
          entityId: userId,
          entityName: user.user_name,
          oldValue: user,
          introducesSodRisk: false,
        });
      }
    }

    return deltas;
  }

  /**
   * Detect assignment deltas
   */
  private detectAssignmentDeltas(fromAssignments: any[], toAssignments: any[]): DeltaChange[] {
    const deltas: DeltaChange[] = [];
    const fromMap = new Map(fromAssignments.map(a => [`${a.user_id}_${a.role_id}`, a]));
    const toMap = new Map(toAssignments.map(a => [`${a.user_id}_${a.role_id}`, a]));

    // Detect new assignments
    for (const [key, assignment] of toMap) {
      if (!fromMap.has(key)) {
        deltas.push({
          changeType: 'ROLE_ASSIGNED',
          entityType: 'ASSIGNMENT',
          entityId: key,
          newValue: assignment,
          introducesSodRisk: true, // Flag for SoD analysis
        });
      }
    }

    // Detect revoked assignments
    for (const [key, assignment] of fromMap) {
      if (!toMap.has(key)) {
        deltas.push({
          changeType: 'ROLE_REVOKED',
          entityType: 'ASSIGNMENT',
          entityId: key,
          oldValue: assignment,
          introducesSodRisk: false,
        });
      }
    }

    return deltas;
  }

  /**
   * Calculate SHA-256 hash of snapshot data
   */
  private calculateHash(data: any): string {
    const crypto = require('crypto');
    const dataString = JSON.stringify(data);
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  /**
   * Get latest snapshot for tenant
   */
  async getLatestSnapshot(tenantId: string): Promise<AccessGraphSnapshot | null> {
    const snapshot = await this.db('access_graph_snapshots')
      .where({ tenant_id: tenantId, status: 'COMPLETED' })
      .orderBy('snapshot_date', 'desc')
      .first();

    if (!snapshot) return null;

    return {
      id: snapshot.id,
      tenantId: snapshot.tenant_id,
      snapshotDate: snapshot.snapshot_date,
      snapshotType: snapshot.snapshot_type,
      totalUsers: snapshot.total_users,
      totalRoles: snapshot.total_roles,
      totalAssignments: snapshot.total_assignments,
      totalSystems: snapshot.total_systems,
      snapshotData: JSON.parse(snapshot.snapshot_data),
      snapshotHash: snapshot.snapshot_hash,
    };
  }

  /**
   * Full synchronization from connector
   */
  async syncFromConnector(
    tenantId: string,
    systemId: string,
    connector: any
  ): Promise<SyncResult> {
    try {
      // Extract data from connector
      const syncResult = await connector.syncAll();

      if (!syncResult.success) {
        return syncResult;
      }

      // Extract individual entities
      const users = await connector.extractUsers();
      const roles = await connector.extractRoles();
      const permissions = await connector.extractPermissions();
      const assignments = await connector.extractAssignments();

      // Persist to database
      await this.persistUsers(users);
      await this.persistRoles(roles);
      await this.persistPermissions(permissions);
      await this.persistAssignments(assignments);

      // Update system statistics
      await this.db('access_systems')
        .where({ id: systemId })
        .update({
          last_sync_at: new Date(),
          sync_status: 'ACTIVE',
          total_users: users.length,
          total_roles: roles.length,
          total_permissions: permissions.length,
          last_sync_error: null,
        });

      return syncResult;
    } catch (error: any) {
      // Update system with error
      await this.db('access_systems')
        .where({ id: systemId })
        .update({
          sync_status: 'ERROR',
          last_sync_error: error.message,
        });

      throw error;
    }
  }
}
