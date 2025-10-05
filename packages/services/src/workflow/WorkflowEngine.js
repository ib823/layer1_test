"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.workflowEngine = exports.WorkflowEngine = void 0;
const core_1 = require("@sap-framework/core");
class WorkflowEngine {
    workflows = new Map();
    approvalChains = new Map();
    notificationTriggers = [];
    escalationRules = [];
    transitionHistory = new Map();
    constructor() {
        // Initialize default approval chains
        this.initializeDefaultApprovalChains();
        this.initializeDefaultNotifications();
        this.initializeDefaultEscalationRules();
    }
    /**
     * Create a new remediation workflow
     */
    createWorkflow(params) {
        const workflowId = this.generateId();
        const now = new Date();
        // Get approval chain if specified
        let steps = [];
        if (params.approvalChainId) {
            const chain = this.approvalChains.get(params.approvalChainId);
            if (chain) {
                steps = chain.steps.map((step, index) => ({
                    id: `${workflowId}-step-${index}`,
                    name: `Approval Level ${step.level}`,
                    assignedRole: step.approverRole,
                    status: index === 0 ? 'pending' : 'pending',
                    dueDate: new Date(now.getTime() + step.timeoutHours * 60 * 60 * 1000),
                    requiredApprovers: step.requiredApprovals,
                    currentApprovers: 0,
                }));
            }
        }
        // If no approval chain, create single-step workflow
        if (steps.length === 0) {
            steps = [
                {
                    id: `${workflowId}-step-0`,
                    name: 'Remediation',
                    status: 'pending',
                    dueDate: params.dueDate,
                },
            ];
        }
        const workflow = {
            id: workflowId,
            violationId: params.violationId,
            tenantId: params.tenantId,
            type: params.type,
            status: 'pending',
            priority: params.priority,
            createdAt: now,
            createdBy: params.createdBy,
            updatedAt: now,
            dueDate: params.dueDate,
            steps,
            currentStepIndex: 0,
            metadata: params.metadata || {},
        };
        this.workflows.set(workflowId, workflow);
        // Emit event
        core_1.EventBus.publish(core_1.EventType.WORKFLOW_CREATED, { workflow });
        // Trigger notifications
        this.triggerNotifications('workflow_created', workflow);
        return workflow;
    }
    /**
     * Transition workflow to new status
     */
    transition(params) {
        const workflow = this.workflows.get(params.workflowId);
        if (!workflow) {
            throw new Error(`Workflow not found: ${params.workflowId}`);
        }
        const fromStatus = workflow.status;
        const toStatus = this.determineNextStatus(workflow, params.action);
        // Validate transition
        if (!this.isValidTransition(fromStatus, toStatus, params.action)) {
            throw new Error(`Invalid transition: ${fromStatus} -> ${toStatus} via ${params.action}`);
        }
        // Record transition
        const transition = {
            workflowId: params.workflowId,
            fromStatus,
            toStatus,
            action: params.action,
            performedBy: params.performedBy,
            performedAt: new Date(),
            comment: params.comment,
            metadata: params.metadata,
        };
        const history = this.transitionHistory.get(params.workflowId) || [];
        history.push(transition);
        this.transitionHistory.set(params.workflowId, history);
        // Update workflow
        workflow.status = toStatus;
        workflow.updatedAt = new Date();
        // Update current step
        const currentStep = workflow.steps[workflow.currentStepIndex];
        if (currentStep) {
            currentStep.status = toStatus;
            if (params.action === 'approve') {
                currentStep.currentApprovers = (currentStep.currentApprovers || 0) + 1;
                currentStep.completedBy = params.performedBy;
                // Move to next step if required approvals met
                if (currentStep.requiredApprovers &&
                    currentStep.currentApprovers >= currentStep.requiredApprovers) {
                    currentStep.completedAt = new Date();
                    workflow.currentStepIndex++;
                    // If all steps complete, mark workflow as approved
                    if (workflow.currentStepIndex >= workflow.steps.length) {
                        workflow.status = 'approved';
                    }
                }
            }
            else if (params.action === 'resolve') {
                currentStep.completedAt = new Date();
                currentStep.completedBy = params.performedBy;
            }
        }
        // Emit event
        core_1.EventBus.publish(core_1.EventType.WORKFLOW_UPDATED, { workflow, transition });
        // Trigger notifications
        this.triggerNotifications(`workflow_${params.action}`, workflow);
        return workflow;
    }
    /**
     * Assign workflow to user or role
     */
    assign(workflowId, assignedTo, assignedBy) {
        const workflow = this.workflows.get(workflowId);
        if (!workflow) {
            throw new Error(`Workflow not found: ${workflowId}`);
        }
        const currentStep = workflow.steps[workflow.currentStepIndex];
        if (currentStep) {
            currentStep.assignedTo = assignedTo;
        }
        workflow.updatedAt = new Date();
        // Emit event
        core_1.EventBus.publish(core_1.EventType.WORKFLOW_UPDATED, { workflow, assignedTo, assignedBy });
        // Trigger notifications
        this.triggerNotifications('workflow_assigned', workflow);
        return workflow;
    }
    /**
     * Add comment to workflow
     */
    addComment(workflowId, comment, author) {
        const workflow = this.workflows.get(workflowId);
        if (!workflow) {
            throw new Error(`Workflow not found: ${workflowId}`);
        }
        if (!workflow.metadata.comments) {
            workflow.metadata.comments = [];
        }
        workflow.metadata.comments.push({
            text: comment,
            author,
            timestamp: new Date(),
        });
        workflow.updatedAt = new Date();
        core_1.EventBus.publish(core_1.EventType.WORKFLOW_UPDATED, { workflow, comment, author });
    }
    /**
     * Check for SLA violations and escalate
     */
    checkEscalations() {
        const now = new Date();
        for (const workflow of this.workflows.values()) {
            // Skip completed workflows
            if (['resolved', 'cancelled', 'rejected'].includes(workflow.status)) {
                continue;
            }
            // Check current step due date
            const currentStep = workflow.steps[workflow.currentStepIndex];
            if (currentStep?.dueDate && currentStep.dueDate < now) {
                // Apply escalation rules
                for (const rule of this.escalationRules) {
                    if (rule.condition(workflow)) {
                        this.applyEscalationRule(workflow, rule);
                    }
                }
            }
        }
    }
    /**
     * Get workflow by ID
     */
    getWorkflow(workflowId) {
        return this.workflows.get(workflowId);
    }
    /**
     * Get all workflows for a violation
     */
    getWorkflowsByViolation(violationId) {
        return Array.from(this.workflows.values()).filter((w) => w.violationId === violationId);
    }
    /**
     * Get workflow transition history
     */
    getTransitionHistory(workflowId) {
        return this.transitionHistory.get(workflowId) || [];
    }
    /**
     * Register custom approval chain
     */
    registerApprovalChain(chain) {
        this.approvalChains.set(chain.id, chain);
    }
    /**
     * Register notification trigger
     */
    registerNotificationTrigger(trigger) {
        this.notificationTriggers.push(trigger);
    }
    /**
     * Register escalation rule
     */
    registerEscalationRule(rule) {
        this.escalationRules.push(rule);
    }
    // ========== Private Helper Methods ==========
    determineNextStatus(workflow, action) {
        const statusMap = {
            submit: 'in_review',
            approve: 'approved',
            reject: 'rejected',
            assign: 'in_progress',
            resolve: 'resolved',
            escalate: 'escalated',
            cancel: 'cancelled',
        };
        return statusMap[action] || workflow.status;
    }
    isValidTransition(from, to, action) {
        // Define valid transitions
        const validTransitions = {
            pending: ['in_review', 'cancelled'],
            in_review: ['approved', 'rejected', 'escalated', 'cancelled'],
            approved: ['in_progress', 'resolved'],
            rejected: ['pending', 'cancelled'],
            in_progress: ['resolved', 'escalated', 'cancelled'],
            escalated: ['in_review', 'approved', 'rejected', 'cancelled'],
        };
        return validTransitions[from]?.includes(to) || false;
    }
    applyEscalationRule(workflow, rule) {
        switch (rule.action) {
            case 'escalate':
                if (rule.escalateTo) {
                    this.transition({
                        workflowId: workflow.id,
                        action: 'escalate',
                        performedBy: 'system',
                        comment: `Auto-escalated due to rule: ${rule.name}`,
                    });
                    if (rule.escalateTo) {
                        this.assign(workflow.id, rule.escalateTo, 'system');
                    }
                }
                break;
            case 'notify':
                this.triggerNotifications('workflow_escalated', workflow);
                break;
            case 'auto_approve':
                this.transition({
                    workflowId: workflow.id,
                    action: 'approve',
                    performedBy: 'system',
                    comment: `Auto-approved due to rule: ${rule.name}`,
                });
                break;
            case 'auto_reject':
                this.transition({
                    workflowId: workflow.id,
                    action: 'reject',
                    performedBy: 'system',
                    comment: `Auto-rejected due to rule: ${rule.name}`,
                });
                break;
        }
    }
    triggerNotifications(event, workflow) {
        for (const trigger of this.notificationTriggers) {
            if (trigger.event === event) {
                if (trigger.condition && !trigger.condition(workflow)) {
                    continue;
                }
                // Emit notification event
                core_1.EventBus.publish(core_1.EventType.NOTIFICATION_SENT, {
                    recipients: trigger.recipients,
                    channels: trigger.channels,
                    template: trigger.template,
                    workflow,
                });
            }
        }
    }
    initializeDefaultApprovalChains() {
        // Critical violations - 3-level approval
        this.registerApprovalChain({
            id: 'critical-3-level',
            name: 'Critical Violations (3 Levels)',
            steps: [
                { level: 1, approverRole: 'manager', requiredApprovals: 1, timeoutHours: 24 },
                { level: 2, approverRole: 'director', requiredApprovals: 1, timeoutHours: 48 },
                { level: 3, approverRole: 'ciso', requiredApprovals: 1, timeoutHours: 72 },
            ],
        });
        // High violations - 2-level approval
        this.registerApprovalChain({
            id: 'high-2-level',
            name: 'High Violations (2 Levels)',
            steps: [
                { level: 1, approverRole: 'manager', requiredApprovals: 1, timeoutHours: 48 },
                { level: 2, approverRole: 'director', requiredApprovals: 1, timeoutHours: 96 },
            ],
        });
        // Medium/Low violations - 1-level approval
        this.registerApprovalChain({
            id: 'standard-1-level',
            name: 'Standard Violations (1 Level)',
            steps: [{ level: 1, approverRole: 'manager', requiredApprovals: 1, timeoutHours: 120 }],
        });
    }
    initializeDefaultNotifications() {
        // Workflow created
        this.registerNotificationTrigger({
            event: 'workflow_created',
            recipients: ['assignee', 'creator'],
            channels: ['email', 'in_app'],
            template: 'workflow_created',
        });
        // Workflow approved
        this.registerNotificationTrigger({
            event: 'workflow_approve',
            recipients: ['creator', 'assignee'],
            channels: ['email', 'in_app'],
            template: 'workflow_approved',
        });
        // Workflow escalated
        this.registerNotificationTrigger({
            event: 'workflow_escalated',
            recipients: ['manager', 'director', 'ciso'],
            channels: ['email', 'in_app', 'sms'],
            template: 'workflow_escalated',
            condition: (w) => w.priority === 'critical',
        });
    }
    initializeDefaultEscalationRules() {
        // Escalate critical workflows after 24 hours
        this.registerEscalationRule({
            id: 'critical-24h',
            name: 'Escalate critical violations after 24 hours',
            condition: (w) => {
                const hoursSinceCreation = (Date.now() - w.createdAt.getTime()) / (1000 * 60 * 60);
                return w.priority === 'critical' && hoursSinceCreation > 24;
            },
            action: 'escalate',
            escalateTo: 'director',
            notifyChannels: ['email', 'sms'],
        });
        // Escalate high violations after 72 hours
        this.registerEscalationRule({
            id: 'high-72h',
            name: 'Escalate high violations after 72 hours',
            condition: (w) => {
                const hoursSinceCreation = (Date.now() - w.createdAt.getTime()) / (1000 * 60 * 60);
                return w.priority === 'high' && hoursSinceCreation > 72;
            },
            action: 'escalate',
            escalateTo: 'manager',
            notifyChannels: ['email'],
        });
    }
    generateId() {
        return `wf-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
}
exports.WorkflowEngine = WorkflowEngine;
/**
 * Singleton instance
 */
exports.workflowEngine = new WorkflowEngine();
//# sourceMappingURL=WorkflowEngine.js.map