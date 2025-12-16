/**
 * Workflow Builder Store
 * Zustand store for managing workflow builder state
 */
import { create } from 'zustand';
import { STEP_TYPES, DEFAULT_WORKFLOW_SETTINGS } from '../constants';

// Generate a unique ID
const generateId = () => crypto.randomUUID();

// Create an empty workflow
const createEmptyWorkflow = (objectType = 'pet') => ({
  id: null,
  name: 'Untitled workflow',
  description: '',
  objectType,
  status: 'draft',
  entryCondition: {
    triggerType: null, // 'manual', 'event', 'filter_criteria', 'schedule'
    eventType: null,
    filterConfig: null,
    scheduleConfig: null,
  },
  settings: { ...DEFAULT_WORKFLOW_SETTINGS },
});

// Create a terminus step (end of workflow) - Reserved for future use
const _createTerminusStep = () => ({
  id: generateId(),
  stepType: STEP_TYPES.TERMINUS,
  actionType: null,
  name: 'End',
  config: {},
  position: 999,
  parentStepId: null,
  branchPath: null,
});

export const useWorkflowBuilderStore = create((set, get) => ({
  // ===== STATE =====

  // Workflow metadata
  workflow: createEmptyWorkflow(),

  // Steps array (flat, tree structure via parentStepId + branchPath)
  steps: [],

  // UI state
  selectedStepId: null, // 'trigger' for trigger config, step ID for step config
  panelMode: 'trigger', // 'trigger' | 'trigger_config' | 'actions' | 'config' | 'settings' | null
  pendingTriggerType: null, // Trigger type being configured before saving
  pendingStepContext: null, // { afterStepId, branchPath } for where to insert new step
  isDirty: false,
  isSaving: false,
  isInitialized: false,
  saveStatus: 'idle', // 'idle' | 'saving' | 'saved' | 'error'

  // ===== INITIALIZATION =====

  /**
   * Initialize a new blank workflow
   */
  initializeNewWorkflow: (objectType = 'pet') => {
    set({
      workflow: createEmptyWorkflow(objectType),
      steps: [],
      selectedStepId: 'trigger',
      panelMode: 'trigger',
      pendingTriggerType: null,
      pendingStepContext: null,
      isDirty: false,
      isSaving: false,
      isInitialized: true,
      saveStatus: 'idle',
    });
  },

  /**
   * Load an existing workflow from API data
   */
  loadWorkflow: (workflowData, stepsData = []) => {
    // Convert API format to store format
    const workflow = {
      id: workflowData.id,
      name: workflowData.name || 'Untitled workflow',
      description: workflowData.description || '',
      objectType: workflowData.objectType || workflowData.object_type || 'pet',
      status: workflowData.status || 'draft',
      entryCondition: workflowData.entryCondition || workflowData.entry_condition || {
        triggerType: null,
        eventType: null,
        filterConfig: null,
        scheduleConfig: null,
      },
      settings: workflowData.settings || { ...DEFAULT_WORKFLOW_SETTINGS },
    };

    // Convert steps from API format
    const steps = stepsData.map((s) => ({
      id: s.id,
      stepType: s.stepType || s.step_type,
      actionType: s.actionType || s.action_type,
      name: s.name || getDefaultStepName(s.stepType || s.step_type, s.actionType || s.action_type),
      config: s.config || {},
      position: s.position,
      parentStepId: s.parentStepId || s.parent_step_id || null,
      branchPath: s.branchPath || s.branch_path || null,
    }));

    // Determine initial panel mode based on workflow state
    const hasTrigger = workflow.entryCondition?.triggerType;

    set({
      workflow,
      steps,
      selectedStepId: hasTrigger ? null : 'trigger',
      panelMode: hasTrigger ? null : 'trigger', // null means left panel shows nothing until + clicked
      pendingTriggerType: null,
      pendingStepContext: null,
      isDirty: false,
      isSaving: false,
      isInitialized: true,
      saveStatus: 'idle',
    });
  },

  /**
   * Reset store to initial state
   */
  reset: () => {
    set({
      workflow: createEmptyWorkflow(),
      steps: [],
      selectedStepId: null,
      panelMode: 'trigger',
      saveStatus: 'idle',
      pendingTriggerType: null,
      pendingStepContext: null,
      isDirty: false,
      isSaving: false,
      isInitialized: false,
    });
  },

  // ===== WORKFLOW ACTIONS =====

  /**
   * Update workflow name
   */
  setWorkflowName: (name) => {
    set((state) => ({
      workflow: { ...state.workflow, name },
      isDirty: true,
    }));
  },

  /**
   * Update workflow description
   */
  setWorkflowDescription: (description) => {
    set((state) => ({
      workflow: { ...state.workflow, description },
      isDirty: true,
    }));
  },

  /**
   * Update object type
   */
  setObjectType: (objectType) => {
    set((state) => ({
      workflow: { ...state.workflow, objectType },
      isDirty: true,
    }));
  },

  /**
   * Set entry condition (trigger configuration)
   * After saving trigger config, panelMode goes to null (canvas view)
   */
  setEntryCondition: (entryCondition) => {
    set((state) => ({
      workflow: { ...state.workflow, entryCondition },
      panelMode: entryCondition.triggerType ? null : 'trigger', // null = show canvas, left panel dormant
      pendingTriggerType: null, // Clear pending since it's now saved
      selectedStepId: null, // Deselect trigger
      isDirty: true,
    }));
  },

  /**
   * Set pending trigger type (before configuration is saved)
   * This puts the left panel in trigger_config mode
   */
  setPendingTriggerType: (triggerType) => {
    set({
      pendingTriggerType: triggerType,
      panelMode: 'trigger_config',
      selectedStepId: 'trigger',
    });
  },

  /**
   * Open action selector (when user clicks + button)
   * @param {string|null} afterStepId - Step ID to insert after (null for end of workflow)
   * @param {string|null} branchPath - Branch path for determinators ('yes' or 'no')
   */
  openActionSelector: (afterStepId = null, branchPath = null) => {
    set({
      panelMode: 'actions',
      selectedStepId: null,
      pendingStepContext: { afterStepId, branchPath },
    });
  },

  /**
   * Open settings panel
   */
  openSettings: () => {
    set({
      panelMode: 'settings',
      selectedStepId: null,
    });
  },

  /**
   * Update workflow settings
   */
  setWorkflowSettings: (settings) => {
    set((state) => ({
      workflow: {
        ...state.workflow,
        settings: { ...state.workflow.settings, ...settings },
      },
      isDirty: true,
    }));
  },

  // ===== STEP ACTIONS =====

  /**
   * Add a new step to the workflow
   */
  addStep: (stepType, actionType = null, afterStepId = null, branchPath = null) => {
    const state = get();
    const newStep = {
      id: generateId(),
      stepType,
      actionType,
      name: getDefaultStepName(stepType, actionType),
      config: getDefaultStepConfig(stepType, actionType),
      position: 0,
      parentStepId: null,
      branchPath,
    };

    let newSteps = [...state.steps];

    if (afterStepId) {
      // Find the step to insert after
      const afterIndex = newSteps.findIndex((s) => s.id === afterStepId);
      if (afterIndex !== -1) {
        // If the afterStep is a determinator and we have a branchPath, set parent
        const afterStep = newSteps[afterIndex];
        if (afterStep.stepType === STEP_TYPES.DETERMINATOR && branchPath) {
          newStep.parentStepId = afterStep.id;
        }
        // Insert after the specified step
        newSteps.splice(afterIndex + 1, 0, newStep);
      } else {
        // Fallback: add to end
        newSteps.push(newStep);
      }
    } else {
      // Add to end
      newSteps.push(newStep);
    }

    // Recalculate positions
    newSteps = recalculatePositions(newSteps);

    set({
      steps: newSteps,
      selectedStepId: newStep.id,
      panelMode: 'config',
      isDirty: true,
    });

    return newStep.id;
  },

  /**
   * Update an existing step
   */
  updateStep: (stepId, updates) => {
    set((state) => ({
      steps: state.steps.map((s) =>
        s.id === stepId ? { ...s, ...updates } : s
      ),
      isDirty: true,
    }));
  },

  /**
   * Delete a step
   */
  deleteStep: (stepId) => {
    set((state) => {
      // Remove the step and any child steps (for determinators)
      const stepToDelete = state.steps.find((s) => s.id === stepId);
      if (!stepToDelete) return state;

      let stepsToRemove = [stepId];

      // If this is a determinator, also remove all child steps
      if (stepToDelete.stepType === STEP_TYPES.DETERMINATOR) {
        const getChildStepIds = (parentId) => {
          const childIds = state.steps
            .filter((s) => s.parentStepId === parentId)
            .map((s) => s.id);
          return childIds.concat(childIds.flatMap(getChildStepIds));
        };
        stepsToRemove = stepsToRemove.concat(getChildStepIds(stepId));
      }

      let newSteps = state.steps.filter((s) => !stepsToRemove.includes(s.id));
      newSteps = recalculatePositions(newSteps);

      return {
        steps: newSteps,
        selectedStepId: state.selectedStepId === stepId ? null : state.selectedStepId,
        panelMode: state.selectedStepId === stepId ? 'actions' : state.panelMode,
        isDirty: true,
      };
    });
  },

  /**
   * Move a step to a new position
   */
  moveStep: (stepId, newPosition) => {
    set((state) => {
      const stepIndex = state.steps.findIndex((s) => s.id === stepId);
      if (stepIndex === -1) return state;

      const newSteps = [...state.steps];
      const [movedStep] = newSteps.splice(stepIndex, 1);
      newSteps.splice(newPosition, 0, movedStep);

      return {
        steps: recalculatePositions(newSteps),
        isDirty: true,
      };
    });
  },

  // ===== UI ACTIONS =====

  /**
   * Select a step for configuration
   */
  selectStep: (stepId) => {
    const state = get();
    if (stepId === 'trigger') {
      // Clicking trigger - show trigger config if configured, trigger selection if not
      const entryCondition = state.workflow.entryCondition;
      const hasTrigger = entryCondition?.triggerType;

      if (hasTrigger) {
        // Derive pendingTriggerType from saved entryCondition for the config panel
        let pendingTriggerType = null;
        if (entryCondition.triggerType === 'event' && entryCondition.eventType === 'property.changed') {
          pendingTriggerType = { type: 'event', eventType: 'property.changed' };
        } else if (entryCondition.triggerType === 'filter_criteria') {
          pendingTriggerType = 'filter_criteria';
        } else if (entryCondition.triggerType === 'schedule') {
          pendingTriggerType = 'schedule';
        } else if (entryCondition.triggerType === 'manual') {
          pendingTriggerType = 'manual';
        } else if (entryCondition.triggerType === 'event') {
          pendingTriggerType = { type: 'event', eventType: entryCondition.eventType };
        }

        set({
          selectedStepId: 'trigger',
          panelMode: 'trigger_config',
          pendingTriggerType,
        });
      } else {
        set({
          selectedStepId: 'trigger',
          panelMode: 'trigger',
          pendingTriggerType: null,
        });
      }
    } else if (stepId) {
      // Clicking a step - show step config
      set({
        selectedStepId: stepId,
        panelMode: 'config',
      });
    } else {
      // Deselecting
      set({
        selectedStepId: null,
        panelMode: null,
      });
    }
  },

  /**
   * Clear selection (close config panel, return to canvas view)
   */
  clearSelection: () => {
    set({
      selectedStepId: null,
      panelMode: null,
    });
  },

  /**
   * Set panel mode
   */
  setPanelMode: (panelMode) => {
    set({ panelMode });
  },

  /**
   * Mark workflow as saving
   */
  setSaving: (isSaving) => {
    set({ isSaving });
  },

  /**
   * Mark workflow as clean (saved)
   */
  markClean: () => {
    set({ isDirty: false, isSaving: false, saveStatus: 'saved' });
  },

  /**
   * Set save status indicator
   */
  setSaveStatus: (saveStatus) => {
    set({ saveStatus });
  },

  /**
   * Set workflow ID (after creation)
   */
  setWorkflowId: (id) => {
    set((state) => ({
      workflow: { ...state.workflow, id },
    }));
  },

  // ===== SERIALIZATION =====

  /**
   * Convert store state to API format
   */
  toAPIFormat: () => {
    const state = get();

    return {
      workflow: {
        name: state.workflow.name,
        description: state.workflow.description,
        object_type: state.workflow.objectType,
        status: state.workflow.status,
        entry_condition: state.workflow.entryCondition,
        settings: state.workflow.settings,
      },
      steps: state.steps.map((s) => ({
        id: s.id,
        step_type: s.stepType,
        action_type: s.actionType,
        name: s.name,
        config: s.config,
        position: s.position,
        parent_step_id: s.parentStepId,
        branch_path: s.branchPath,
      })),
    };
  },

  // ===== COMPUTED =====

  /**
   * Get steps for a specific branch (root level or under a parent)
   */
  getStepsForBranch: (parentStepId = null, branchPath = null) => {
    const state = get();
    return state.steps
      .filter((s) => s.parentStepId === parentStepId && s.branchPath === branchPath)
      .sort((a, b) => a.position - b.position);
  },

  /**
   * Get root level steps (not in any branch)
   */
  getRootSteps: () => {
    const state = get();
    return state.steps
      .filter((s) => !s.parentStepId)
      .sort((a, b) => a.position - b.position);
  },

  /**
   * Check if workflow has a configured trigger
   */
  hasTrigger: () => {
    const state = get();
    return !!state.workflow.entryCondition?.triggerType;
  },
}));

// ===== HELPER FUNCTIONS =====

/**
 * Get default step name based on type and action
 */
function getDefaultStepName(stepType, actionType) {
  const actionNames = {
    send_sms: 'Send SMS',
    send_email: 'Send email',
    send_notification: 'Send notification',
    create_task: 'Create task',
    update_field: 'Update field',
    add_to_segment: 'Add to segment',
    remove_from_segment: 'Remove from segment',
    enroll_in_workflow: 'Enroll in workflow',
    unenroll_from_workflow: 'Unenroll from workflow',
    webhook: 'Webhook',
  };

  const stepNames = {
    [STEP_TYPES.WAIT]: 'Wait',
    [STEP_TYPES.DETERMINATOR]: 'Determinator',
    [STEP_TYPES.GATE]: 'Gate',
    [STEP_TYPES.TERMINUS]: 'End',
  };

  if (actionType && actionNames[actionType]) {
    return actionNames[actionType];
  }

  return stepNames[stepType] || 'Step';
}

/**
 * Get default step config based on type and action
 */
function getDefaultStepConfig(stepType) {
  if (stepType === STEP_TYPES.WAIT) {
    return {
      waitType: 'duration',
      duration: 1,
      durationUnit: 'days',
    };
  }

  if (stepType === STEP_TYPES.DETERMINATOR || stepType === STEP_TYPES.GATE) {
    return {
      conditions: [],
      conditionLogic: 'and',
    };
  }

  return {};
}

/**
 * Recalculate positions for all steps
 */
function recalculatePositions(steps) {
  // Group by parent and branch
  const groups = {};

  steps.forEach((step) => {
    const key = `${step.parentStepId || 'root'}-${step.branchPath || 'main'}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(step);
  });

  // Assign positions within each group
  return steps.map((step) => {
    const key = `${step.parentStepId || 'root'}-${step.branchPath || 'main'}`;
    const group = groups[key];
    const index = group.indexOf(step);
    return { ...step, position: index };
  });
}

export default useWorkflowBuilderStore;
