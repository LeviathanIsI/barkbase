import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import WorkflowCanvas from '../components/WorkflowCanvas';
import ContextSidebar from '../components/ContextSidebar';
import FlowHeader from '../components/FlowHeader';
import CanvasToolbar from '../components/CanvasToolbar';
import { useTenantStore } from '@/stores/tenant';
import {
  assignStepIndices,
  createSequentialEdges,
  insertNodeAtIndex,
  removeNodeAtIndex,
  moveNode,
  cloneNode,
} from '../utils/linearLayout';
import {
  toFlowDefinition,
  fromFlowDefinition,
} from '../utils/flowDefinitionMapper';
import { validateFlowDefinition } from '../utils/validateDefinition';
import {
  useHandlerFlowQuery,
  useCreateHandlerFlowMutation,
  useUpdateHandlerFlowMutation,
  useValidateFlowMutation,
  usePublishHandlerFlowMutation,
} from '../api';

// Sample initial nodes for demo (linear flow)
// Positions will be calculated by linearLayout utilities
const initialNodes = [
  { recordId: '1',
    type: 'trigger',
    position: { x: 0, y: 0 }, // Will be set by linearLayout
    data: {
      label: 'Set up trigger',
      description: 'Click to choose what starts this flow',
      triggerType: null, // Not configured yet
    },
  },
];

const initialEdges = [];

// Canvas controls wrapper component
function WorkflowCanvasWrapper({
  nodes,
  edges,
  showMinimap,
  setShowMinimap,
  onNodesChange,
  onEdgesChange,
  onNodeClick,
  sidebarMode,
  selectedNode,
  onCloseSidebar,
  onNodeSelect,
  onNodeUpdate,
}) {
  const [zoom, setZoom] = useState(100);

  return (
    <div className="flex-1 flex overflow-hidden">
      <ContextSidebar
        mode={sidebarMode}
        selectedNode={selectedNode}
        onClose={onCloseSidebar}
        onNodeSelect={onNodeSelect}
        onNodeUpdate={onNodeUpdate}
      />
      <div className="flex-1 relative">
        <CanvasToolbar
          zoomLevel={zoom}
          onZoomIn={() => setZoom((z) => Math.min(z + 10, 200))}
          onZoomOut={() => setZoom((z) => Math.max(z - 10, 10))}
          onZoomReset={() => setZoom(100)}
          showMinimap={showMinimap}
          onToggleMinimap={() => setShowMinimap(!showMinimap)}
        />
        <WorkflowCanvas
          initialNodes={nodes}
          initialEdges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          zoom={zoom}
          showMinimap={showMinimap}
        />
      </div>
    </div>
  );
}

export default function WorkflowBuilder() {
  const { flowId } = useParams();
  const navigate = useNavigate();
  const tenant = useTenantStore((state) => state.tenant);

  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [workflowName, setWorkflowName] = useState('Unnamed workflow');
  const [workflowDescription, setWorkflowDescription] = useState('');
  const [triggerConfig, setTriggerConfig] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showMinimap, setShowMinimap] = useState(true);

  // API hooks
  const { data: flowData, isLoading: isLoadingFlow } = useHandlerFlowQuery(flowId);
  const createFlowMutation = useCreateHandlerFlowMutation();
  const updateFlowMutation = useUpdateHandlerFlowMutation();
  const validateFlowMutation = useValidateFlowMutation();
  const publishFlowMutation = usePublishHandlerFlowMutation();

  // Sidebar state
  const [sidebarMode, setSidebarMode] = useState(null); // null, 'add', or 'edit'
  const [selectedNode, setSelectedNode] = useState(null);
  const [addAfterStepIndex, setAddAfterStepIndex] = useState(null);

  // Load flow data if editing existing flow
  useEffect(() => {
    if (flowData && flowData.definition) {
      const { nodes: loadedNodes, edges: loadedEdges, name, description, triggerConfig: loadedTriggerConfig } = fromFlowDefinition(flowData.definition);

      // Assign step indices if not present
      const nodesWithIndices = assignStepIndices(loadedNodes);

      setNodes(nodesWithIndices);
      setEdges(loadedEdges);
      setWorkflowName(name);
      setWorkflowDescription(description || '');
      setTriggerConfig(loadedTriggerConfig || {});
      setHasUnsavedChanges(false);
    }
  }, [flowData]);

  // Initialize with stepIndices on mount (only if no flowId)
  useEffect(() => {
    if (!flowId) {
      const nodesWithIndices = assignStepIndices(initialNodes);
      setNodes(nodesWithIndices);
    }
    // Edges will be created by the separate useEffect that depends on nodes
  }, [flowId]);

  // Track changes to nodes/edges
  useEffect(() => {
    setHasUnsavedChanges(true);
  }, [nodes, edges]);

  // Node action handlers for linear mode
  const handleCloneNode = useCallback((nodeId) => {
    setNodes((currentNodes) => {
      const updated = cloneNode(currentNodes, nodeId);
      return updated;
    });
  }, []);

  const handleMoveNode = useCallback((nodeId, direction) => {
    setNodes((currentNodes) => {
      const updated = moveNode(currentNodes, nodeId, direction);
      return updated;
    });
  }, []);

  const handleDeleteNode = useCallback((nodeId) => {
    // Always close sidebar when deleting any node to prevent showing deleted node config
    setSidebarMode(null);
    setSelectedNode(null);
    setAddAfterStepIndex(null);

    setNodes((currentNodes) => {
      const updated = removeNodeAtIndex(currentNodes, nodeId);
      return updated;
    });
  }, []);

  // Open sidebar to add action
  const handleOpenAddAction = useCallback((afterStepIndex) => {
    setAddAfterStepIndex(afterStepIndex);
    setSidebarMode('add');
    setSelectedNode(null);
  }, []);

  // Handle selecting an action from the sidebar
  const handleNodeSelect = useCallback((nodeConfig) => {
    // If we're editing a trigger node, update it instead of creating new
    if (selectedNode?.type === 'trigger') {
      setNodes((currentNodes) => {
        return currentNodes.map(node => {
          if (node.recordId === selectedNode.recordId) {
            return {
              ...node,
              data: {
                ...node.data,
                ...nodeConfig,
                label: nodeConfig.label,
                description: nodeConfig.description || '',
                triggerType: nodeConfig.triggerType,
                eventId: nodeConfig.eventId,
                object: nodeConfig.object,
              },
            };
          }
          return node;
        });
      });
    } else {
      // Adding a new action node
      setNodes((currentNodes) => {
        const newNode = { recordId: `node-${Date.now()}`,
          type: nodeConfig.type,
          position: { x: 0, y: 0 }, // Will be set by linearLayout
          data: {
            label: nodeConfig.label,
            description: nodeConfig.description || '',
            actionType: nodeConfig.actionType, // CRITICAL: Save actionType so config panel works
          },
        };

        // Insert at the specified position
        const insertIndex = addAfterStepIndex !== null ? addAfterStepIndex + 1 : currentNodes.length + 1;
        const updated = insertNodeAtIndex(currentNodes, newNode, insertIndex);
        return updated;
      });
    }

    // Close sidebar after adding/updating
    setSidebarMode(null);
    setAddAfterStepIndex(null);
    setSelectedNode(null);
  }, [addAfterStepIndex, selectedNode]);

  // Handle clicking on a node to edit it
  const handleNodeClick = useCallback((event, node) => {
    // Check if the node still exists in the current nodes array
    // This prevents opening the sidebar for a node that was just deleted
    setNodes((currentNodes) => {
      const nodeExists = currentNodes.some(n => n.recordId === node.recordId);
      if (nodeExists) {
        setSelectedNode(node);
        setSidebarMode('edit');
      }
      return currentNodes; // Don't modify nodes, just use this to access current state
    });
  }, []);

  // Close sidebar
  const handleCloseSidebar = useCallback(() => {
    setSidebarMode(null);
    setSelectedNode(null);
    setAddAfterStepIndex(null);
  }, []);

  // Update node data from configuration panel
  const handleNodeUpdate = useCallback((nodeId, newData) => {
    setNodes((currentNodes) => {
      return currentNodes.map(node => {
        if (node.recordId === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              ...newData,
            },
          };
        }
        return node;
      });
    });

    // Also update the selected node state to reflect changes
    setSelectedNode((current) => {
      if (current && current.recordId === nodeId) {
        return {
          ...current,
          data: {
            ...current.data,
            ...newData,
          },
        };
      }
      return current;
    });
  }, []);

  // Update edges when nodes change, but preserve manually created edges
  useEffect(() => {
    setEdges((currentEdges) => {
      const sorted = nodes.sort((a, b) => (a.data.stepIndex || 0) - (b.data.stepIndex || 0));
      const newEdges = [];
      const nodesWithOutgoingEdges = new Set(currentEdges.map(e => e.source));

      // For each node, if it doesn't have an outgoing edge, create a default sequential edge
      for (let i = 0; i < sorted.length - 1; i++) {
        const currentNode = sorted[i];
        const nextNode = sorted[i + 1];

        // Check if this node already has manual edges
        const hasManualEdges = nodesWithOutgoingEdges.has(currentNode.recordId);

        if (!hasManualEdges) {
          // Create default sequential edge
          newEdges.push({ recordId: `e${currentNode.recordId}-${nextNode.recordId}`,
            source: currentNode.recordId,
            target: nextNode.recordId,
            animated: true,
            type: 'linear',
            data: {
              afterStepIndex: currentNode.data?.stepIndex || (i + 1),
              onInsert: handleOpenAddAction,
            },
          });
        }
      }

      // Preserve all manual edges (those not in the newEdges)
      const manualEdges = currentEdges.filter(edge => {
        // Keep edges that still have valid source and target nodes
        const sourceExists = nodes.some(n => n.recordId === edge.source);
        const targetExists = nodes.some(n => n.recordId === edge.target);
        return sourceExists && targetExists;
      });

      // Combine manual edges with new default edges (manual edges take precedence)
      const existingEdgeKeys = new Set(manualEdges.map(e => `${e.source}-${e.target}`));
      const defaultEdges = newEdges.filter(e => !existingEdgeKeys.has(`${e.source}-${e.target}`));

      return [...manualEdges, ...defaultEdges];
    });
  }, [nodes, handleOpenAddAction]);

  // Enrich all nodes with handlers (runs when handlers are available or nodes change)
  useEffect(() => {
    setNodes((currentNodes) => {
      // Check if enrichment is needed (any node missing handlers)
      const needsEnrichment = currentNodes.some(node => !node.data?.onClone);
      if (!needsEnrichment && currentNodes.every(node => node.data?.totalSteps === currentNodes.length)) {
        return currentNodes; // Skip enrichment to avoid infinite loop
      }

      return currentNodes.map((node, index) => {
        const enriched = {
          ...node,
          data: {
            ...node.data,
            stepIndex: node.data?.stepIndex || index + 1,
            totalSteps: currentNodes.length,
            onClone: handleCloneNode,
            onMoveUp: (recordId) => handleMoveNode(recordId, 'up'),
            onMoveDown: (recordId) => handleMoveNode(recordId, 'down'),
            onDelete: handleDeleteNode,
            onInsert: handleOpenAddAction,
          },
        };
        return enriched;
      });
    });
  }, [nodes, handleCloneNode, handleMoveNode, handleDeleteNode, handleOpenAddAction]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      // Convert to FlowDefinition format
      const definition = toFlowDefinition({
        nodes,
        edges,
        name: workflowName,
        description: workflowDescription,
        triggerConfig,
      });

      // Validate before saving
      const validation = validateFlowDefinition(definition);
      if (!validation.valid) {
        const errorList = validation.errors.join('\n• ');
        alert(`Cannot save: Flow has validation errors:\n\n• ${errorList}`);
        setIsSaving(false);
        return;
      }

      let result;

      if (flowId) {
        // Update existing flow
        result = await updateFlowMutation.mutateAsync({
          flowId,
          name: workflowName,
          description: workflowDescription,
          definition,
        });
      } else {
        // Create new flow
        result = await createFlowMutation.mutateAsync({
          name: workflowName,
          description: workflowDescription,
          definition,
        });

        // Navigate to the new flow's edit page
        if (result?.recordId) {
          navigate(`/workflows/${result.recordId}/edit`, { replace: true });
        }
      }

      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to save workflow:', error);
      // TODO: Show error toast
    } finally {
      setIsSaving(false);
    }
  }, [workflowName, workflowDescription, triggerConfig, nodes, edges, flowId, updateFlowMutation, createFlowMutation, navigate]);

  const handleValidate = useCallback(async () => {
    try {
      // Convert to FlowDefinition format
      const definition = toFlowDefinition({
        nodes,
        edges,
        name: workflowName,
        description: workflowDescription,
        triggerConfig,
      });

      // Client-side validation first (fast)
      const clientValidation = validateFlowDefinition(definition);

      if (!clientValidation.valid) {
        const errorList = clientValidation.errors.join('\n• ');
        alert(`Validation failed:\n\n• ${errorList}`);
        return;
      }

      // Server-side validation (optional additional checks)
      try {
        const serverResult = await validateFlowMutation.mutateAsync(definition);

        if (serverResult.valid) {
          alert('✓ Flow is valid and ready to publish!');
        } else {
          const errorList = serverResult.errors.join('\n• ');
          alert(`Server validation failed:\n\n• ${errorList}`);
        }
      } catch (serverError) {
        // If server validation fails, at least client validation passed
        console.warn('Server validation unavailable:', serverError);
        alert('✓ Client-side validation passed! (Server validation unavailable)');
      }
    } catch (error) {
      console.error('Validation error:', error);
      alert(`Validation error: ${error.message}`);
    }
  }, [nodes, edges, workflowName, workflowDescription, triggerConfig, validateFlowMutation]);

  const handlePublish = useCallback(async () => {
    if (!flowId) {
      alert('Please save the workflow before publishing');
      return;
    }

    try {
      await publishFlowMutation.mutateAsync({ flowId });
      alert('✓ Flow published successfully! It is now active.');
    } catch (error) {
      console.error('Publish error:', error);
      alert(`Publish error: ${error.message}`);
    }
  }, [flowId, publishFlowMutation]);

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      {/* Flow Header */}
      <FlowHeader
        title={workflowName}
        onTitleChange={setWorkflowName}
        hasUnsavedChanges={hasUnsavedChanges}
        onSave={handleSave}
        onValidate={handleValidate}
        onPublish={handlePublish}
        isSaving={isSaving}
        tenant={tenant?.slug || 'testing'}
        plan={tenant?.plan || 'FREE'}
        flowId={flowId}
        flowStatus={flowData?.status || 'draft'}
      />

      {/* Main Content: Sidebar + Canvas */}
      <WorkflowCanvasWrapper
        nodes={nodes}
        edges={edges}
        showMinimap={showMinimap}
        setShowMinimap={setShowMinimap}
        onNodeClick={handleNodeClick}
        sidebarMode={sidebarMode}
        selectedNode={selectedNode}
        onCloseSidebar={handleCloseSidebar}
        onNodeSelect={handleNodeSelect}
        onNodeUpdate={handleNodeUpdate}
      />
    </div>
  );
}
