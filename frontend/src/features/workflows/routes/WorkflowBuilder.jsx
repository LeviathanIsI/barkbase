/**
 * WorkflowBuilder - Main workflow builder page
 * Handles both creating new workflows and editing existing ones
 */
import { useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

import LoadingState from '@/components/ui/LoadingState';

import {
  useWorkflow,
  useWorkflowSteps,
  useCreateWorkflow,
  useUpdateWorkflow,
  useUpdateWorkflowSteps,
  useActivateWorkflow,
} from '../hooks';
import { useWorkflowBuilderStore } from '../stores/builderStore';

import BuilderHeader from '../components/builder/BuilderHeader';
import BuilderLeftPanel from '../components/builder/BuilderLeftPanel';
import BuilderCanvas from '../components/builder/BuilderCanvas';
import StepConfigPanel from '../components/builder/StepConfigPanel';

export default function WorkflowBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';

  // Store
  const {
    workflow,
    selectedStepId,
    panelMode,
    isDirty,
    isSaving,
    isInitialized,
    initializeNewWorkflow,
    loadWorkflow,
    reset,
    setSaving,
    markClean,
  } = useWorkflowBuilderStore();

  // Queries (only for existing workflows)
  const {
    data: workflowData,
    isLoading: isLoadingWorkflow,
  } = useWorkflow(isNew ? null : id);

  const {
    data: stepsData,
    isLoading: isLoadingSteps,
  } = useWorkflowSteps(isNew ? null : id);

  // Mutations
  const createWorkflowMutation = useCreateWorkflow();
  const updateWorkflowMutation = useUpdateWorkflow();
  const updateStepsMutation = useUpdateWorkflowSteps();
  const activateWorkflowMutation = useActivateWorkflow();

  // Initialize store
  useEffect(() => {
    if (isNew) {
      initializeNewWorkflow('pet');
    } else if (workflowData?.data && stepsData?.data && !isInitialized) {
      loadWorkflow(workflowData.data, stepsData.data.steps || []);
    }

    // Cleanup on unmount
    return () => {
      reset();
    };
  }, [isNew, workflowData, stepsData, isInitialized, initializeNewWorkflow, loadWorkflow, reset]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (isSaving) return;

    setSaving(true);

    try {
      const { workflow: workflowPayload, steps: stepsPayload } = useWorkflowBuilderStore.getState().toAPIFormat();

      if (isNew || !workflow.id) {
        // Create new workflow
        const result = await createWorkflowMutation.mutateAsync(workflowPayload);
        const newWorkflowId = result?.data?.workflow?.id;

        if (newWorkflowId) {
          // Save steps
          if (stepsPayload.length > 0) {
            await updateStepsMutation.mutateAsync({
              workflowId: newWorkflowId,
              steps: stepsPayload,
            });
          }

          // Update store with new ID
          useWorkflowBuilderStore.setState((state) => ({
            workflow: { ...state.workflow, id: newWorkflowId },
          }));

          // Navigate to the new workflow URL
          navigate(`/workflows/${newWorkflowId}`, { replace: true });
          toast.success('Workflow created');
        }
      } else {
        // Update existing workflow
        await updateWorkflowMutation.mutateAsync({
          workflowId: workflow.id,
          data: workflowPayload,
        });

        // Update steps
        await updateStepsMutation.mutateAsync({
          workflowId: workflow.id,
          steps: stepsPayload,
        });

        toast.success('Workflow saved');
      }

      markClean();
    } catch (error) {
      console.error('Failed to save workflow:', error);
      toast.error('Failed to save workflow');
    } finally {
      setSaving(false);
    }
  }, [
    isNew,
    workflow.id,
    isSaving,
    createWorkflowMutation,
    updateWorkflowMutation,
    updateStepsMutation,
    navigate,
    setSaving,
    markClean,
  ]);

  // Handle activate
  const handleActivate = useCallback(async () => {
    // Save first if dirty
    if (isDirty) {
      await handleSave();
    }

    if (!workflow.id) {
      toast.error('Please save the workflow first');
      return;
    }

    try {
      await activateWorkflowMutation.mutateAsync(workflow.id);
      toast.success('Workflow activated');
      navigate('/workflows');
    } catch (error) {
      console.error('Failed to activate workflow:', error);
      toast.error('Failed to activate workflow');
    }
  }, [workflow.id, isDirty, handleSave, activateWorkflowMutation, navigate]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+S or Cmd+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  // Loading state
  if (!isNew && (isLoadingWorkflow || isLoadingSteps || !isInitialized)) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--bb-color-bg-body)]">
        <LoadingState label="Loading workflow..." />
      </div>
    );
  }

  // Determine if we should show the config panel
  const showConfigPanel = selectedStepId && selectedStepId !== 'trigger' && panelMode === 'config';

  return (
    <div className="h-screen flex flex-col bg-[var(--bb-color-bg-body)]">
      {/* Header */}
      <BuilderHeader
        onSave={handleSave}
        onActivate={handleActivate}
        isSaving={isSaving}
      />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel */}
        <BuilderLeftPanel />

        {/* Center canvas */}
        <div className="flex-1 overflow-auto">
          <BuilderCanvas />
        </div>

        {/* Right config panel (when step selected) */}
        {showConfigPanel && (
          <StepConfigPanel />
        )}
      </div>
    </div>
  );
}
