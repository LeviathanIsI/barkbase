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
  settingsSection: null, // Which settings section to show: 'reenrollment' | 'suppression' | 'goals' | 'timing' | 'unenrollment' | null
  triggerConfigTab: 'triggers', // Which tab to show in trigger config panel: 'triggers' | 'settings'
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

    // Convert steps from API format with backwards compatibility
    const steps = stepsData.map((s) => {
      // Handle backwards compatibility: convert old branchPath to branchId
      let branchId = s.branchId || s.branch_id || null;
      const branchPath = s.branchPath || s.branch_path;

      // If using old format (yes/no branchPath), keep it as-is for now
      // The canvas will handle both formats during transition
      if (!branchId && branchPath) {
        branchId = branchPath; // Use 'yes'/'no' as branch IDs for legacy data
      }

      return {
        id: s.id,
        stepType: s.stepType || s.step_type,
        actionType: s.actionType || s.action_type,
        name: s.name || getDefaultStepName(s.stepType || s.step_type, s.actionType || s.action_type),
        config: s.config || {},
        position: s.position,
        parentStepId: s.parentStepId || s.parent_step_id || null,
        branchId,
      };
    });

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
   * @param {string|null} branchId - Branch ID for determinator branches
   */
  openActionSelector: (afterStepId = null, branchId = null) => {
    set({
      panelMode: 'actions',
      selectedStepId: null,
      pendingStepContext: { afterStepId, branchId },
    });
  },

  /**
   * Open settings panel
   * @param {string} section - Optional section to show: 'reenrollment', 'suppression', 'goals', 'timing', 'unenrollment'
   */
  openSettings: (section = null) => {
    set({
      panelMode: 'settings',
      settingsSection: section,
      selectedStepId: null,
    });
  },

  /**
   * Open trigger config panel with specific tab
   * @param {string} tab - Tab to show: 'triggers' or 'settings'
   */
  openTriggerConfig: (tab = 'triggers') => {
    const state = get();
    set({
      panelMode: 'trigger_config',
      triggerConfigTab: tab,
      selectedStepId: 'trigger',
      // Determine the pending trigger type from current entry condition
      pendingTriggerType: state.workflow?.entryCondition?.triggerType === 'event'
        ? { type: 'event', eventType: state.workflow?.entryCondition?.eventType }
        : state.workflow?.entryCondition?.triggerType || null,
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
   * @param {string} stepType - Step type (action, wait, determinator, etc.)
   * @param {string|null} actionType - Action type for action steps
   * @param {string|null} afterStepId - Step ID to insert after (null for end)
   * @param {string|null} branchId - Branch ID for determinator branches
   */
  addStep: (stepType, actionType = null, afterStepId = null, branchId = null) => {
    const state = get();
    const newStep = {
      id: generateId(),
      stepType,
      actionType,
      name: getDefaultStepName(stepType, actionType),
      config: getDefaultStepConfig(stepType, actionType),
      position: 0,
      parentStepId: null,
      branchId, // Branch ID for multi-branch determinators
    };

    let newSteps = [...state.steps];

    if (afterStepId) {
      // Find the step to insert after
      const afterIndex = newSteps.findIndex((s) => s.id === afterStepId);
      if (afterIndex !== -1) {
        // If the afterStep is a determinator and we have a branchId, set parent
        const afterStep = newSteps[afterIndex];
        if (afterStep.stepType === STEP_TYPES.DETERMINATOR && branchId) {
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
          triggerConfigTab: 'triggers',
          pendingTriggerType,
        });
      } else {
        set({
          selectedStepId: 'trigger',
          panelMode: 'trigger',
          triggerConfigTab: 'triggers',
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
   * Computes explicit step connections (next_step_id, yes_step_id, no_step_id)
   * for enterprise workflow execution
   */
  toAPIFormat: () => {
    const state = get();

    // Build step connections map
    const stepConnections = computeStepConnections(state.steps);

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
        branch_id: s.branchId,
        // Explicit step connections (enterprise)
        next_step_id: stepConnections[s.id]?.next_step_id || null,
        yes_step_id: stepConnections[s.id]?.yes_step_id || null,
        no_step_id: stepConnections[s.id]?.no_step_id || null,
      })),
    };
  },

  // ===== COMPUTED =====

  /**
   * Get steps for a specific branch (root level or under a parent)
   * @param {string|null} parentStepId - Parent determinator step ID
   * @param {string|null} branchId - Branch ID within the determinator
   */
  getStepsForBranch: (parentStepId = null, branchId = null) => {
    const state = get();
    return state.steps
      .filter((s) => s.parentStepId === parentStepId && s.branchId === branchId)
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

  if (stepType === STEP_TYPES.DETERMINATOR) {
    // Multi-branch determinator with default "None matched" branch
    const defaultBranchId = generateId();
    const noneMatchedId = 'none-matched';
    return {
      branches: [
        {
          id: defaultBranchId,
          name: 'Branch 1',
          conditions: { logic: 'and', conditions: [] },
          order: 0,
        },
        {
          id: noneMatchedId,
          name: 'None matched',
          conditions: null, // No conditions - this is the default fallback
          order: 999,
          isDefault: true, // Cannot be deleted
        },
      ],
    };
  }

  if (stepType === STEP_TYPES.GATE) {
    return {
      conditions: { logic: 'and', conditions: [] },
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
    const key = `${step.parentStepId || 'root'}-${step.branchId || 'main'}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(step);
  });

  // Assign positions within each group
  return steps.map((step) => {
    const key = `${step.parentStepId || 'root'}-${step.branchId || 'main'}`;
    const group = groups[key];
    const index = group.indexOf(step);
    return { ...step, position: index };
  });
}

/**
 * Compute explicit step connections (enterprise)
 * This enables GO-TO connections and explicit branch targeting
 *
 * For each step, determines:
 * - next_step_id: The next step in linear flow
 * - yes_step_id: First step in YES branch (for determinators)
 * - no_step_id: First step in NO branch (for determinators)
 *
 * @param {Array} steps - All workflow steps
 * @returns {Object} Map of stepId -> { next_step_id, yes_step_id, no_step_id }
 */
function computeStepConnections(steps) {
  const connections = {};

  // Group steps by parent and branch for easy lookup
  const stepsByParentAndBranch = {};
  steps.forEach((step) => {
    const key = `${step.parentStepId || 'root'}-${step.branchId || 'main'}`;
    if (!stepsByParentAndBranch[key]) {
      stepsByParentAndBranch[key] = [];
    }
    stepsByParentAndBranch[key].push(step);
  });

  // Sort each group by position
  Object.keys(stepsByParentAndBranch).forEach((key) => {
    stepsByParentAndBranch[key].sort((a, b) => a.position - b.position);
  });

  // Helper to find steps in a specific branch of a determinator
  const findBranchSteps = (parentId, branchId) => {
    const key = `${parentId}-${branchId}`;
    return stepsByParentAndBranch[key] || [];
  };

  // Helper to find the next step after current in the same branch
  const findNextSibling = (step) => {
    const key = `${step.parentStepId || 'root'}-${step.branchId || 'main'}`;
    const siblings = stepsByParentAndBranch[key] || [];
    const currentIndex = siblings.findIndex((s) => s.id === step.id);
    if (currentIndex >= 0 && currentIndex < siblings.length - 1) {
      return siblings[currentIndex + 1];
    }
    return null;
  };

  // Helper to find where to go after a branch ends (parent's next sibling)
  const findAfterBranch = (parentId) => {
    const parent = steps.find((s) => s.id === parentId);
    if (!parent) return null;

    // Find parent's next sibling
    const nextSibling = findNextSibling(parent);
    if (nextSibling) return nextSibling;

    // If parent has no next sibling, recursively check grandparent
    if (parent.parentStepId) {
      return findAfterBranch(parent.parentStepId);
    }

    return null;
  };

  // Process each step
  steps.forEach((step) => {
    connections[step.id] = {
      next_step_id: null,
      yes_step_id: null,
      no_step_id: null,
    };

    // For determinators, handle branching connections
    if (step.stepType === STEP_TYPES.DETERMINATOR) {
      const branches = step.config?.branches || [];

      // Check if this is multi-branch (has branches with UUIDs) or legacy yes/no
      const isMultiBranch = branches.length > 0 && branches.some((b) => !['yes', 'no'].includes(b.id));

      if (isMultiBranch) {
        // Multi-branch: Don't set yes_step_id/no_step_id
        // The backend routes via branch_id + findFirstStepInBranch
        // Set next_step_id to the step after the determinator (merge point)
        const nextSibling = findNextSibling(step);
        if (nextSibling) {
          connections[step.id].next_step_id = nextSibling.id;
        }
      } else {
        // Legacy binary yes/no branching
        branches.forEach((branch) => {
          const branchSteps = findBranchSteps(step.id, branch.id);
          if (branchSteps.length > 0) {
            const firstStepId = branchSteps[0].id;
            const branchName = branch.name?.toLowerCase() || '';

            // Check for legacy yes/no branch IDs or names
            const isYesBranch = branch.id === 'yes' || branchName === 'yes';
            const isNoBranch = branch.id === 'no' || branchName === 'no';

            if (isYesBranch) {
              connections[step.id].yes_step_id = firstStepId;
            } else if (isNoBranch || branch.isDefault) {
              connections[step.id].no_step_id = firstStepId;
            }
          }
        });

        // If no branches have steps, next_step_id is the step after determinator
        if (!connections[step.id].yes_step_id && !connections[step.id].no_step_id) {
          const nextSibling = findNextSibling(step);
          if (nextSibling) {
            connections[step.id].next_step_id = nextSibling.id;
          }
        }
      }
    } else if (step.stepType === STEP_TYPES.TERMINUS) {
      // Terminus steps don't connect to anything
      connections[step.id].next_step_id = null;
    } else {
      // Regular steps: connect to next sibling
      const nextSibling = findNextSibling(step);
      if (nextSibling) {
        connections[step.id].next_step_id = nextSibling.id;
      } else if (step.parentStepId) {
        // End of a branch - go to after the parent determinator
        const afterBranch = findAfterBranch(step.parentStepId);
        if (afterBranch) {
          connections[step.id].next_step_id = afterBranch.id;
        }
      }
      // If no next sibling and no parent, this is the last step (null is correct)
    }
  });

  return connections;
}

export default useWorkflowBuilderStore;
