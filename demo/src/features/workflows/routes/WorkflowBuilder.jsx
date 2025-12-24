/**
 * WorkflowBuilder - Main workflow builder page
 * Handles both creating new workflows and editing existing ones
 * Implements auto-persist: Create on first trigger save, auto-save subsequent changes
 */
import { useEffect, useCallback, useRef, useState } from 'react';
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
  usePauseWorkflow,
  useDeleteWorkflow,
  useCloneWorkflow,
} from '../hooks';
import { useWorkflowBuilderStore } from '../stores/builderStore';

import BuilderHeader from '../components/builder/BuilderHeader';
import BuilderLeftPanel from '../components/builder/BuilderLeftPanel';
import BuilderCanvas from '../components/builder/BuilderCanvas';
import StepConfigPanel from '../components/builder/StepConfigPanel';
import WorkflowSettings from '../components/builder/WorkflowSettings';
import PublishModal from '../components/builder/PublishModal';
import ReviewWorkflowSidebar from '../components/builder/ReviewWorkflowSidebar';
import EnrollExistingModal from '../components/builder/EnrollExistingModal';
import apiClient from '@/lib/apiClient';

export default function WorkflowBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';
  const isCreatingRef = useRef(false);

  // UI state
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showReviewSidebar, setShowReviewSidebar] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Pending trigger config (for active workflow trigger changes)
  const [pendingTriggerConfig, setPendingTriggerConfig] = useState(null);

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
    openSettings,
    setEntryCondition,
  } = useWorkflowBuilderStore();

  // Queries (only for existing workflows)
  const { data: workflowData, isLoading: isLoadingWorkflow } = useWorkflow(isNew ? null : id);

  const { data: stepsData, isLoading: isLoadingSteps } = useWorkflowSteps(isNew ? null : id);

  // Mutations
  const createWorkflowMutation = useCreateWorkflow();
  const updateWorkflowMutation = useUpdateWorkflow();
  const updateStepsMutation = useUpdateWorkflowSteps();
  const activateWorkflowMutation = useActivateWorkflow();
  const pauseWorkflowMutation = usePauseWorkflow();
  const deleteWorkflowMutation = useDeleteWorkflow();
  const cloneWorkflowMutation = useCloneWorkflow();

  // Initialize store
  useEffect(() => {
    if (isNew) {
      initializeNewWorkflow('pet');
    } else if (workflowData?.data && stepsData?.data && !isInitialized) {
      loadWorkflow(workflowData.data, stepsData.data.steps || []);
    }
  }, [isNew, id, workflowData, stepsData, isInitialized, initializeNewWorkflow, loadWorkflow]);

  // Cleanup only on unmount (leaving the builder entirely)
  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  /**
   * Create workflow in database (called on first trigger save)
   * Returns the new workflow ID
   */
  const createWorkflow = useCallback(
    async (triggerConfig) => {
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
        // Backend returns workflow directly in data, not nested under data.workflow
        const newWorkflowId = result?.data?.id;

        if (newWorkflowId) {
          // Update store with new ID
          setWorkflowId(newWorkflowId);

          // Navigate to the new workflow URL (replace history)
          navigate(`/workflows/${newWorkflowId}`, { replace: true });

          setSaveStatus('saved');
          markClean();
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
    },
    [workflow, createWorkflowMutation, navigate, setSaveStatus, setWorkflowId, markClean]
  );

  /**
   * Auto-save workflow changes (debounced)
   */
  const autoSave = useCallback(async () => {
    const state = useWorkflowBuilderStore.getState();

    // Skip if no workflow ID (shouldn't happen after trigger save)
    if (!state.workflow.id) {
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

  /**
   * Handle publish (turn on workflow)
   */
  const handlePublish = useCallback(
    async (options = {}) => {
      const { enrollExisting = false } = options;

      // If no workflow ID, can't publish
      if (!workflow.id) {
        toast.error('Please configure a trigger first');
        return;
      }

      setIsPublishing(true);

      // Wait for any pending saves
      if (saveStatus === 'saving') {
        toast('Waiting for save to complete...');
        await new Promise((resolve) => setTimeout(resolve, 1500));
        if (useWorkflowBuilderStore.getState().saveStatus === 'saving') {
          toast.error('Save still in progress. Please try again.');
          setIsPublishing(false);
          return;
        }
      }

      // Force save if dirty
      if (isDirty) {
        await autoSave();
      }

      try {
        // Use activate-with-enrollment endpoint if enrolling existing records
        if (enrollExisting && workflow.entryCondition?.triggerType === 'filter_criteria') {
          const { data: result } = await apiClient.post(
            `/api/v1/workflows/${workflow.id}/activate-with-enrollment`,
            { enrollExisting: true }
          );

          const enrolledCount = result.enrollment?.enrolled || 0;

          if (enrolledCount > 0) {
            toast.success(`Workflow activated! ${enrolledCount} records enrolled.`);
          } else {
            toast.success('Workflow activated!');
          }
        } else {
          await activateWorkflowMutation.mutateAsync(workflow.id);
          toast.success('Workflow published and activated');
        }

        navigate('/workflows');
      } catch (error) {
        console.error('Failed to publish workflow:', error);
        toast.error('Failed to publish workflow');
      } finally {
        setIsPublishing(false);
      }
    },
    [workflow.id, workflow.entryCondition?.triggerType, isDirty, saveStatus, autoSave, activateWorkflowMutation, navigate]
  );

  /**
   * Handle pause workflow
   */
  const handlePause = useCallback(async () => {
    if (!workflow.id) return;

    try {
      await pauseWorkflowMutation.mutateAsync(workflow.id);
      toast.success('Workflow paused');
    } catch (error) {
      console.error('Failed to pause workflow:', error);
      toast.error('Failed to pause workflow');
    }
  }, [workflow.id, pauseWorkflowMutation]);

  /**
   * Handle resume workflow
   */
  const handleResume = useCallback(async () => {
    if (!workflow.id) return;

    try {
      await activateWorkflowMutation.mutateAsync(workflow.id);
      toast.success('Workflow resumed');
    } catch (error) {
      console.error('Failed to resume workflow:', error);
      toast.error('Failed to resume workflow');
    }
  }, [workflow.id, activateWorkflowMutation]);

  /**
   * Handle duplicate workflow
   */
  const handleDuplicate = useCallback(async () => {
    if (!workflow.id) {
      toast.error('Save the workflow first before duplicating');
      return;
    }

    try {
      const result = await cloneWorkflowMutation.mutateAsync(workflow.id);
      const newId = result?.data?.id;
      if (newId) {
        toast.success('Workflow duplicated');
        navigate(`/workflows/${newId}`);
      }
    } catch (error) {
      console.error('Failed to duplicate workflow:', error);
      toast.error('Failed to duplicate workflow');
    }
  }, [workflow.id, cloneWorkflowMutation, navigate]);

  /**
   * Handle delete workflow
   */
  const handleDelete = useCallback(async () => {
    if (!workflow.id) {
      navigate('/workflows');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this workflow? This cannot be undone.')) {
      return;
    }

    try {
      await deleteWorkflowMutation.mutateAsync(workflow.id);
      toast.success('Workflow deleted');
      navigate('/workflows');
    } catch (error) {
      console.error('Failed to delete workflow:', error);
      toast.error('Failed to delete workflow');
    }
  }, [workflow.id, deleteWorkflowMutation, navigate]);

  /**
   * Handle review sidebar activation
   * Called when user clicks Activate in the ReviewWorkflowSidebar
   */
  const handleReviewActivate = useCallback(() => {
    setShowReviewSidebar(false);

    // If trigger is filter_criteria, show the enrollment modal
    if (workflow.entryCondition?.triggerType === 'filter_criteria') {
      setShowEnrollModal(true);
    } else {
      // For other trigger types, activate directly
      handlePublish({ enrollExisting: false });
    }
  }, [workflow.entryCondition?.triggerType, handlePublish]);

  /**
   * Handle enrollment modal activation
   * Called when user chooses to enroll (or not) in EnrollExistingModal
   */
  const handleEnrollActivate = useCallback(async (options) => {
    setShowEnrollModal(false);

    // If we have pending trigger config, apply it and optionally enroll
    if (pendingTriggerConfig) {
      // Apply the pending trigger config
      setEntryCondition(pendingTriggerConfig);

      // Force save to persist the trigger change
      await autoSave();

      // If enrolling, use activate-with-enrollment to enroll new matching records
      if (options.enrollExisting && pendingTriggerConfig.triggerType === 'filter_criteria') {
        try {
          const { data: result } = await apiClient.post(
            `/api/v1/workflows/${workflow.id}/activate-with-enrollment`,
            { enrollExisting: true }
          );
          const enrolledCount = result.enrollment?.enrolled || 0;
          if (enrolledCount > 0) {
            toast.success(`Trigger updated! ${enrolledCount} new records enrolled.`);
          } else {
            toast.success('Trigger updated!');
          }
        } catch (error) {
          console.error('Failed to enroll new records:', error);
          toast.success('Trigger updated (enrollment skipped due to error)');
        }
      } else {
        toast.success('Trigger updated!');
      }

      setPendingTriggerConfig(null);
    } else {
      // Normal activation flow (not a trigger change)
      await handlePublish(options);
    }
  }, [handlePublish, pendingTriggerConfig, setEntryCondition, autoSave, workflow.id]);

  /**
   * Handle trigger config change on active workflow
   * Called when user saves a trigger change on an already-active workflow with filter_criteria
   * Shows enrollment modal to ask if they want to enroll records matching new criteria
   */
  const handleActiveTriggerChange = useCallback((newTriggerConfig) => {
    // Store the pending config and show enrollment modal
    setPendingTriggerConfig(newTriggerConfig);
    setShowEnrollModal(true);
  }, []);

  /**
   * Handle closing enrollment modal (canceling trigger change on active workflow)
   */
  const handleEnrollModalClose = useCallback(() => {
    setShowEnrollModal(false);
    // If we had pending trigger config, clear it (user canceled)
    if (pendingTriggerConfig) {
      setPendingTriggerConfig(null);
      toast('Trigger change cancelled');
    }
  }, [pendingTriggerConfig]);

  /**
   * Handle open settings
   */
  const handleOpenSettings = useCallback((section) => {
    openSettings(section);
  }, [openSettings]);

  /**
   * Handle show keyboard shortcuts
   */
  const handleShowShortcuts = useCallback(() => {
    // TODO: Implement shortcuts modal
    toast('Keyboard shortcuts:\n\nCtrl+S - Save\nCtrl+Z - Undo\nCtrl+Shift+Z - Redo\nCtrl+\\ - Toggle left panel');
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      if (modifier) {
        switch (e.key.toLowerCase()) {
          case 's':
            e.preventDefault();
            handleManualSave();
            break;
          case 'z':
            e.preventDefault();
            // TODO: implement undo/redo
            break;
          case '\\':
            e.preventDefault();
            setShowLeftPanel((prev) => !prev);
            break;
          case '=':
          case '+':
            e.preventDefault();
            // Zoom in handled by canvas
            break;
          case '-':
            e.preventDefault();
            // Zoom out handled by canvas
            break;
          case '0':
            e.preventDefault();
            // Reset zoom handled by canvas
            break;
          case '/':
            e.preventDefault();
            handleShowShortcuts();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleManualSave, handleShowShortcuts]);

  // Loading state
  if (!isNew && (isLoadingWorkflow || isLoadingSteps || !isInitialized)) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--bb-color-bg-body)]">
        <LoadingState label="Loading workflow..." />
      </div>
    );
  }

  // Determine if we should show the config panel or settings panel
  const showConfigPanel = selectedStepId && selectedStepId !== 'trigger' && panelMode === 'config';
  const showSettingsPanel = panelMode === 'settings';

  return (
    <div className="h-screen flex flex-col bg-[var(--bb-color-bg-body)]">
      {/* Header */}
      <BuilderHeader
        onActivate={() => setShowReviewSidebar(true)}
        onOpenPublishModal={() => setShowReviewSidebar(true)}
        onPause={handlePause}
        onResume={handleResume}
        onSave={handleManualSave}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
        onOpenSettings={handleOpenSettings}
        onToggleLeftPanel={() => setShowLeftPanel((prev) => !prev)}
        showLeftPanel={showLeftPanel}
        onShowShortcuts={handleShowShortcuts}
        isPublishing={isPublishing}
        canUndo={false}
        canRedo={false}
      />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel - pass createWorkflow for first trigger save and active trigger change handler */}
        {showLeftPanel && (
          <BuilderLeftPanel
            onCreateWorkflow={createWorkflow}
            onActiveTriggerChange={handleActiveTriggerChange}
          />
        )}

        {/* Center canvas */}
        <div className="flex-1 overflow-auto">
          <BuilderCanvas />
        </div>

        {/* Right config panel (when step selected) */}
        {showConfigPanel && <StepConfigPanel />}

        {/* Right settings panel */}
        {showSettingsPanel && <WorkflowSettings />}
      </div>

      {/* Publish modal (kept for backwards compatibility) */}
      {showPublishModal && (
        <PublishModal
          workflow={workflow}
          steps={steps}
          onClose={() => setShowPublishModal(false)}
          onPublish={handlePublish}
        />
      )}

      {/* Review workflow sidebar (pre-activation checklist) */}
      {showReviewSidebar && (
        <ReviewWorkflowSidebar
          workflow={workflow}
          steps={steps}
          onClose={() => setShowReviewSidebar(false)}
          onActivate={handleReviewActivate}
          isActivating={isPublishing}
        />
      )}

      {/* Enroll existing modal (shown for filter_criteria workflows or active trigger changes) */}
      {showEnrollModal && (
        <EnrollExistingModal
          workflow={workflow}
          pendingFilterConfig={pendingTriggerConfig?.filterConfig}
          onClose={handleEnrollModalClose}
          onActivate={handleEnrollActivate}
        />
      )}
    </div>
  );
}
