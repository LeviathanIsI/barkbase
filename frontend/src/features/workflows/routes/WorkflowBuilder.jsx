/**
 * WorkflowBuilder - Main workflow builder page
 * Handles both creating new workflows and editing existing ones
 * Implements auto-persist: Create on first trigger save, auto-save subsequent changes
 */
import { useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useDebouncedCallback } from 'use-debounce';

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
  const isCreatingRef = useRef(false);

  // Store
  const {
    workflow,
    steps,
    selectedStepId,
    panelMode,
    isDirty,
    saveStatus,
    isInitialized,
    initializeNewWorkflow,
    loadWorkflow,
    reset,
    setSaveStatus,
    setWorkflowId,
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

  /**
   * Create workflow in database (called on first trigger save)
   * Returns the new workflow ID
   */
  const createWorkflow = useCallback(async (triggerConfig) => {
    if (isCreatingRef.current) return null;
    isCreatingRef.current = true;

    setSaveStatus('saving');

    try {
      const workflowPayload = {
        name: workflow.name || 'Untitled workflow',
        description: workflow.description || '',
        object_type: triggerConfig.objectType || workflow.objectType,
        status: 'draft',
        entry_condition: {
          triggerType: triggerConfig.triggerType,
          eventType: triggerConfig.eventType || null,
          filterConfig: triggerConfig.filterConfig || null,
          scheduleConfig: triggerConfig.scheduleConfig || null,
        },
        settings: workflow.settings,
      };

      const result = await createWorkflowMutation.mutateAsync(workflowPayload);
      const newWorkflowId = result?.data?.workflow?.id;

      if (newWorkflowId) {
        // Update store with new ID
        setWorkflowId(newWorkflowId);

        // Navigate to the new workflow URL (replace history)
        navigate(`/workflows/${newWorkflowId}`, { replace: true });

        setSaveStatus('saved');
        return newWorkflowId;
      }

      setSaveStatus('error');
      return null;
    } catch (error) {
      console.error('Failed to create workflow:', error);
      setSaveStatus('error');
      toast.error('Failed to create workflow');
      return null;
    } finally {
      isCreatingRef.current = false;
    }
  }, [workflow, createWorkflowMutation, navigate, setSaveStatus, setWorkflowId]);

  /**
   * Auto-save workflow changes (debounced)
   */
  const autoSave = useCallback(async () => {
    const state = useWorkflowBuilderStore.getState();

    // Skip if no workflow ID (shouldn't happen after trigger save)
    if (!state.workflow.id) {
      console.warn('Auto-save skipped: No workflow ID');
      return;
    }

    setSaveStatus('saving');

    try {
      const { workflow: workflowPayload, steps: stepsPayload } = state.toAPIFormat();

      // Update workflow
      await updateWorkflowMutation.mutateAsync({
        workflowId: state.workflow.id,
        data: workflowPayload,
      });

      // Update steps
      await updateStepsMutation.mutateAsync({
        workflowId: state.workflow.id,
        steps: stepsPayload,
      });

      markClean();
    } catch (error) {
      console.error('Auto-save failed:', error);
      setSaveStatus('error');
    }
  }, [updateWorkflowMutation, updateStepsMutation, setSaveStatus, markClean]);

  // Debounced auto-save (1 second delay)
  const debouncedAutoSave = useDebouncedCallback(autoSave, 1000);

  /**
   * Trigger auto-save when workflow has ID and is dirty
   */
  useEffect(() => {
    // Only auto-save if:
    // 1. Workflow has an ID (was created)
    // 2. Has unsaved changes
    // 3. Not currently in 'saving' status
    if (workflow.id && isDirty && saveStatus !== 'saving') {
      debouncedAutoSave();
    }
  }, [workflow.id, isDirty, saveStatus, debouncedAutoSave, workflow, steps]);

  /**
   * Handle activate (turn on workflow)
   */
  const handleActivate = useCallback(async () => {
    // If no workflow ID, can't activate
    if (!workflow.id) {
      toast.error('Please configure a trigger first');
      return;
    }

    // Wait for any pending saves
    if (saveStatus === 'saving') {
      toast('Waiting for save to complete...');
      // Wait a bit and check again
      await new Promise(resolve => setTimeout(resolve, 1500));
      if (useWorkflowBuilderStore.getState().saveStatus === 'saving') {
        toast.error('Save still in progress. Please try again.');
        return;
      }
    }

    // Force save if dirty
    if (isDirty) {
      await autoSave();
    }

    try {
      await activateWorkflowMutation.mutateAsync(workflow.id);
      toast.success('Workflow activated');
      navigate('/workflows');
    } catch (error) {
      console.error('Failed to activate workflow:', error);
      toast.error('Failed to activate workflow');
    }
  }, [workflow.id, isDirty, saveStatus, autoSave, activateWorkflowMutation, navigate]);

  /**
   * Manual save (Ctrl+S)
   */
  const handleManualSave = useCallback(async () => {
    if (!workflow.id) {
      toast('Configure a trigger to create the workflow');
      return;
    }

    if (!isDirty) {
      toast('No changes to save');
      return;
    }

    await autoSave();
    toast.success('Saved');
  }, [workflow.id, isDirty, autoSave]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+S or Cmd+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleManualSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleManualSave]);

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
        onActivate={handleActivate}
      />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel - pass createWorkflow for first trigger save */}
        <BuilderLeftPanel onCreateWorkflow={createWorkflow} />

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
