import { Plus } from 'lucide-react';
import { BaseEdge, EdgeLabelRenderer, getStraightPath } from 'reactflow';
import { cn } from '@/lib/cn';

export default function LinearEdge({ id, sourceX, sourceY, targetX, targetY, data }) {
  const [edgePath, labelX, labelY] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  const handleAddClick = () => {
    if (data?.onInsert) {
      data.onInsert(data.afterStepIndex);
    }
  };

  return (
    <>
      <BaseEdge id={id} path={edgePath} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="group"
        >
          {/* Insert Button */}
          <button
            onClick={handleAddClick}
            className={cn(
              'w-8 h-8 rounded-full border-2 border-border bg-surface',
              'flex items-center justify-center',
              'opacity-0 group-hover:opacity-100 transition-opacity',
              'hover:border-primary hover:bg-primary hover:text-white',
              'focus:opacity-100 focus:border-primary focus:bg-primary focus:text-white'
            )}
            title={`Insert step after ${data?.afterStepIndex || '?'}`}
            aria-label={`Insert step after ${data?.afterStepIndex || '?'}`}
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
