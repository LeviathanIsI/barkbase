import { useState, useCallback, useEffect } from 'react';
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

// Sample initial nodes for demo (linear flow)
// Positions will be calculated by linearLayout utilities
const initialNodes = [
  {
    id: '1',
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
  const tenant = useTenantStore((state) => state.tenant);
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [workflowName, setWorkflowName] = useState('Unnamed workflow');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showMinimap, setShowMinimap] = useState(true);

  // Sidebar state
  const [sidebarMode, setSidebarMode] = useState(null); // null, 'add', or 'edit'
  const [selectedNode, setSelectedNode] = useState(null);
  const [addAfterStepIndex, setAddAfterStepIndex] = useState(null);

  // Initialize with stepIndices on mount
  useEffect(() => {
    const nodesWithIndices = assignStepIndices(initialNodes);
    setNodes(nodesWithIndices);
    // Edges will be created by the separate useEffect that depends on nodes
  }, []);

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
    console.log('[WorkflowBuilder] handleOpenAddAction called with:', afterStepIndex);
    setAddAfterStepIndex(afterStepIndex);
    setSidebarMode('add');
    setSelectedNode(null);
    console.log('[WorkflowBuilder] Sidebar mode set to: add');
  }, []);

  // Handle selecting an action from the sidebar
  const handleNodeSelect = useCallback((nodeConfig) => {
    // If we're editing a trigger node, update it instead of creating new
    if (selectedNode?.type === 'trigger') {
      setNodes((currentNodes) => {
        return currentNodes.map(node => {
          if (node.id === selectedNode.id) {
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
        const newNode = {
          id: `node-${Date.now()}`,
          type: nodeConfig.type,
          position: { x: 0, y: 0 }, // Will be set by linearLayout
          data: {
            label: nodeConfig.label,
            description: nodeConfig.description || '',
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
      const nodeExists = currentNodes.some(n => n.id === node.id);
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
        if (node.id === nodeId) {
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
      if (current && current.id === nodeId) {
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

  // Update edges whenever nodes change to maintain linear flow
  useEffect(() => {
    const newEdges = createSequentialEdges(nodes, handleOpenAddAction);
    setEdges(newEdges);
  }, [nodes, handleOpenAddAction]);

  // Enrich all nodes with handlers (runs when handlers are available or nodes change)
  useEffect(() => {
    setNodes((currentNodes) => {
      // Check if enrichment is needed (any node missing handlers)
      const needsEnrichment = currentNodes.some(node => !node.data?.onClone);
      if (!needsEnrichment && currentNodes.every(node => node.data?.totalSteps === currentNodes.length)) {
        console.log('[WorkflowBuilder] Skipping enrichment - handlers already present');
        return currentNodes; // Skip enrichment to avoid infinite loop
      }

      console.log('[WorkflowBuilder] Enriching nodes with handlers');
      return currentNodes.map((node, index) => {
        const enriched = {
          ...node,
          data: {
            ...node.data,
            stepIndex: node.data?.stepIndex || index + 1,
            totalSteps: currentNodes.length,
            onClone: handleCloneNode,
            onMoveUp: (id) => handleMoveNode(id, 'up'),
            onMoveDown: (id) => handleMoveNode(id, 'down'),
            onDelete: handleDeleteNode,
            onInsert: handleOpenAddAction,
          },
        };
        console.log('[WorkflowBuilder] Enriched node:', node.id, 'has onInsert:', !!enriched.data.onInsert);
        return enriched;
      });
    });
  }, [nodes, handleCloneNode, handleMoveNode, handleDeleteNode, handleOpenAddAction]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      // TODO: Implement save logic
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setHasUnsavedChanges(false);
      // eslint-disable-next-line no-console
      console.log('Saved workflow:', { name: workflowName, nodes, edges });
    } finally {
      setIsSaving(false);
    }
  }, [workflowName, nodes, edges]);

  const handleValidate = useCallback(() => {
    // TODO: Implement validation logic
    // eslint-disable-next-line no-console
    console.log('Validating workflow...');
  }, []);

  const handleRun = useCallback(() => {
    // TODO: Implement test run logic
    // eslint-disable-next-line no-console
    console.log('Running workflow...');
  }, []);

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      {/* Flow Header */}
      <FlowHeader
        title={workflowName}
        onTitleChange={setWorkflowName}
        hasUnsavedChanges={hasUnsavedChanges}
        onSave={handleSave}
        onValidate={handleValidate}
        onRun={handleRun}
        isSaving={isSaving}
        tenant={tenant?.slug || 'testing'}
        plan={tenant?.plan || 'FREE'}
      />

      {/* Main Content: Sidebar + Canvas */}
      <WorkflowCanvasWrapper
        nodes={nodes}
        edges={edges}
        showMinimap={showMinimap}
        setShowMinimap={setShowMinimap}
        onNodesChange={(changes) => console.log('Nodes changed:', changes)}
        onEdgesChange={(changes) => console.log('Edges changed:', changes)}
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
