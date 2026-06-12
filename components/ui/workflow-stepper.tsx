import { Fragment } from 'react';

import { cn } from '@/lib/utils';

export type WorkflowStepState = 'pending' | 'active' | 'completed';

export interface WorkflowStepperItem {
  label: string;
  state: WorkflowStepState;
}

const stepLabelClass: Record<WorkflowStepState, string> = {
  pending: 'text-muted-foreground',
  active: 'text-primary',
  completed: 'text-primary',
};

const stepCircleClass: Record<WorkflowStepState, string> = {
  pending: 'bg-muted text-muted-foreground',
  active: 'bg-primary text-primary-foreground',
  completed: 'bg-primary/15 text-primary',
};

export function getWorkflowStepState(
  stepIndex: number,
  currentIndex: number,
  options?: { markCurrentAsCompleted?: boolean },
): WorkflowStepState {
  if (stepIndex < currentIndex) return 'completed';
  if (stepIndex > currentIndex) return 'pending';
  return options?.markCurrentAsCompleted ? 'completed' : 'active';
}

interface WorkflowStepperProps {
  steps: WorkflowStepperItem[];
  className?: string;
  mobileProgress?: {
    stepLabel: string;
    stepName: string;
    percent: number;
  };
}

export function WorkflowStepper({ steps, className, mobileProgress }: WorkflowStepperProps) {
  return (
    <>
      <div className={cn('hidden sm:flex items-center space-x-4', className)}>
        {steps.map((step, index) => (
          <Fragment key={step.label}>
            {index > 0 && <div className="flex-1 h-px bg-border" aria-hidden />}
            <div className={cn('flex items-center space-x-2', stepLabelClass[step.state])}>
              <div
                className={cn(
                  'size-6 rounded-full flex items-center justify-center text-sm font-medium',
                  stepCircleClass[step.state],
                )}
              >
                {index + 1}
              </div>
              <span className="text-sm font-medium">{step.label}</span>
            </div>
          </Fragment>
        ))}
      </div>

      {mobileProgress && (
        <div className="sm:hidden space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span>{mobileProgress.stepLabel}</span>
            <span className="text-muted-foreground">{mobileProgress.stepName}</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${mobileProgress.percent}%` }}
            />
          </div>
        </div>
      )}
    </>
  );
}
