import { EventBus, EventType } from '@sap-framework/core';

export interface WorkflowStep {
  id: string;
  name: string;
  action: () => Promise<void>;
  onSuccess?: string;
  onFailure?: string;
}

export interface Workflow {
  id: string;
  name: string;
  steps: WorkflowStep[];
  currentStep?: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
}

export class WorkflowEngine {
  private workflows: Map<string, Workflow> = new Map();

  async executeWorkflow(workflow: Workflow): Promise<void> {
    this.workflows.set(workflow.id, workflow);
    workflow.status = 'RUNNING';

    EventBus.emit(EventType.WORKFLOW_STARTED, { workflowId: workflow.id });

    try {
      for (const step of workflow.steps) {
        workflow.currentStep = step.id;
        await step.action();
      }

      workflow.status = 'COMPLETED';
      EventBus.emit(EventType.WORKFLOW_COMPLETED, { workflowId: workflow.id });
    } catch (error) {
      workflow.status = 'FAILED';
      EventBus.emit(EventType.WORKFLOW_FAILED, { 
        workflowId: workflow.id, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  getWorkflow(id: string): Workflow | undefined {
    return this.workflows.get(id);
  }
}