/**
 * Workflow Engine - Manage remediation workflows, approvals, and notifications
 *
 * Capabilities:
 * - Remediation workflow management
 * - Multi-level approval chains
 * - Notification triggers
 * - SLA tracking and escalation
 * - Workflow state management
 */
export type WorkflowStatus = 'pending' | 'in_review' | 'approved' | 'rejected' | 'in_progress' | 'resolved' | 'escalated' | 'cancelled';
export type WorkflowAction = 'submit' | 'approve' | 'reject' | 'assign' | 'resolve' | 'escalate' | 'cancel' | 'comment';
export type NotificationType = 'email' | 'in_app' | 'sms' | 'webhook';
export interface WorkflowStep {
    id: string;
    name: string;
    assignedTo?: string;
    assignedRole?: string;
    status: WorkflowStatus;
    dueDate?: Date;
    completedAt?: Date;
    completedBy?: string;
    requiredApprovers?: number;
    currentApprovers?: number;
}
export interface Workflow {
    id: string;
    violationId: string;
    tenantId: string;
    type: 'remediation' | 'approval' | 'escalation';
    status: WorkflowStatus;
    priority: 'critical' | 'high' | 'medium' | 'low';
    createdAt: Date;
    createdBy: string;
    updatedAt: Date;
    dueDate?: Date;
    steps: WorkflowStep[];
    currentStepIndex: number;
    metadata: Record<string, any>;
}
export interface WorkflowTransition {
    workflowId: string;
    fromStatus: WorkflowStatus;
    toStatus: WorkflowStatus;
    action: WorkflowAction;
    performedBy: string;
    performedAt: Date;
    comment?: string;
    metadata?: Record<string, any>;
}
export interface ApprovalChain {
    id: string;
    name: string;
    steps: Array<{
        level: number;
        approverRole: string;
        requiredApprovals: number;
        timeoutHours: number;
    }>;
}
export interface NotificationTrigger {
    event: string;
    recipients: string[];
    channels: NotificationType[];
    template: string;
    condition?: (workflow: Workflow) => boolean;
}
export interface EscalationRule {
    id: string;
    name: string;
    condition: (workflow: Workflow) => boolean;
    action: 'escalate' | 'notify' | 'auto_approve' | 'auto_reject';
    escalateTo?: string;
    notifyChannels?: NotificationType[];
}
export declare class WorkflowEngine {
    private workflows;
    private approvalChains;
    private notificationTriggers;
    private escalationRules;
    private transitionHistory;
    constructor();
    /**
     * Create a new remediation workflow
     */
    createWorkflow(params: {
        violationId: string;
        tenantId: string;
        type: 'remediation' | 'approval' | 'escalation';
        priority: 'critical' | 'high' | 'medium' | 'low';
        createdBy: string;
        approvalChainId?: string;
        dueDate?: Date;
        metadata?: Record<string, any>;
    }): Workflow;
    /**
     * Transition workflow to new status
     */
    transition(params: {
        workflowId: string;
        action: WorkflowAction;
        performedBy: string;
        comment?: string;
        metadata?: Record<string, any>;
    }): Workflow;
    /**
     * Assign workflow to user or role
     */
    assign(workflowId: string, assignedTo: string, assignedBy: string): Workflow;
    /**
     * Add comment to workflow
     */
    addComment(workflowId: string, comment: string, author: string): void;
    /**
     * Check for SLA violations and escalate
     */
    checkEscalations(): void;
    /**
     * Get workflow by ID
     */
    getWorkflow(workflowId: string): Workflow | undefined;
    /**
     * Get all workflows for a violation
     */
    getWorkflowsByViolation(violationId: string): Workflow[];
    /**
     * Get workflow transition history
     */
    getTransitionHistory(workflowId: string): WorkflowTransition[];
    /**
     * Register custom approval chain
     */
    registerApprovalChain(chain: ApprovalChain): void;
    /**
     * Register notification trigger
     */
    registerNotificationTrigger(trigger: NotificationTrigger): void;
    /**
     * Register escalation rule
     */
    registerEscalationRule(rule: EscalationRule): void;
    private determineNextStatus;
    private isValidTransition;
    private applyEscalationRule;
    private triggerNotifications;
    private initializeDefaultApprovalChains;
    private initializeDefaultNotifications;
    private initializeDefaultEscalationRules;
    private generateId;
}
/**
 * Singleton instance
 */
export declare const workflowEngine: WorkflowEngine;
//# sourceMappingURL=WorkflowEngine.d.ts.map