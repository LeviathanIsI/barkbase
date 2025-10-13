import { useCallback, useEffect } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { nodeTypes } from './nodes';
import LinearEdge from './LinearEdge';

const edgeTypes = {
  linear: LinearEdge,
};

const WorkflowCanvas = ({
  initialNodes = [],
  initialEdges = [],
  onNodesChange: onNodesChangeProp,
  onEdgesChange: onEdgesChangeProp,
  onNodeClick,
  showMinimap = true,
  zoom = 100,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync external nodes/edges with internal state when they change
  useEffect(() => {
    console.log('[WorkflowCanvas] Syncing initialNodes to internal state', initialNodes.length, 'nodes');
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  useEffect(() => {
    console.log('[WorkflowCanvas] Syncing initialEdges to internal state', initialEdges.length, 'edges');
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  const onConnect = useCallback(
    (params) => {
      // Allow multiple edges for branching support
      const newEdge = {
        ...params,
        type: 'linear',
        animated: true,
      };

      setEdges((eds) => addEdge(newEdge, eds));
      onEdgesChangeProp?.(addEdge(newEdge, edges));
    },
    [setEdges, edges, onEdgesChangeProp]
  );

  const handleNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes);
      onNodesChangeProp?.(changes);
    },
    [onNodesChange, onNodesChangeProp]
  );

  const handleEdgesChange = useCallback(
    (changes) => {
      onEdgesChange(changes);
      onEdgesChangeProp?.(changes);
    },
    [onEdgesChange, onEdgesChangeProp]
  );

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        defaultZoom={zoom / 100}
        nodesDraggable={false}
        nodesConnectable={true}
        elementsSelectable={true}
        className="bg-background"
      >
        {showMinimap && (
          <MiniMap
            nodeStrokeWidth={3}
            zoomable
            pannable
            className="bg-surface border border-border"
          />
        )}
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
      </ReactFlow>
    </div>
  );
};

export default WorkflowCanvas;
