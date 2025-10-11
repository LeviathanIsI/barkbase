import { Plus } from 'lucide-react';
import { cn } from '@/lib/cn';
import NodeActions from './NodeActions';

const BaseNode = ({ id, data, children, className, variant = 'default' }) => {
  const variants = {
    default: 'bg-surface border-border',
    trigger: 'bg-blue-500/10 border-blue-500',
    condition: 'bg-yellow-500/10 border-yellow-500',
    action: 'bg-purple-500/10 border-purple-500',
    delay: 'bg-green-500/10 border-green-500',
    branch: 'bg-orange-500/10 border-orange-500',
    code: 'bg-cyan-500/10 border-cyan-500',
  };

  const stepIndex = data?.stepIndex;
  const totalSteps = data?.totalSteps || 1;

  const handleAddClick = (e) => {
    e.stopPropagation(); // Prevent node click event from firing
    console.log('[BaseNode] Plus button clicked', { stepIndex, hasOnInsert: !!data?.onInsert, data });
    if (data?.onInsert) {
      console.log('[BaseNode] Calling onInsert with stepIndex:', stepIndex);
      data.onInsert(stepIndex);
    } else {
      console.error('[BaseNode] No onInsert handler found in node data');
    }
  };

  return (
    <div className="relative">
      <div
        className={cn(
          'relative rounded-lg border-2 px-4 py-3 shadow-lg w-[500px] group',
          variants[variant],
          className
        )}
      >
        {/* Step Number Badge */}
        {stepIndex && (
          <div className="absolute -top-3 -left-3 w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold shadow-md border-2 border-white z-10">
            {stepIndex}
          </div>
        )}

        {/* Node Actions (Clone, Move, Delete) - Hidden for triggers */}
        {stepIndex > 1 && (
          <NodeActions
            nodeId={id}
            onClone={data?.onClone}
            onMoveUp={data?.onMoveUp}
            onMoveDown={data?.onMoveDown}
            onDelete={data?.onDelete}
            canMoveUp={stepIndex > 1}
            canMoveDown={stepIndex < totalSteps}
          />
        )}

        <div className="space-y-1">
          {children}
        </div>
      </div>

      {/* Insert Next Action Button */}
      <div className="relative flex items-center justify-center h-12 my-2">
        <button
          onClick={handleAddClick}
          className={cn(
            'w-10 h-10 rounded-full border-2 border-border bg-surface',
            'flex items-center justify-center',
            'hover:border-primary hover:bg-primary hover:text-white',
            'focus:border-primary focus:bg-primary focus:text-white',
            'transition-all shadow-md hover:shadow-lg'
          )}
          title="Add next action"
          aria-label="Add next action"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default BaseNode;
