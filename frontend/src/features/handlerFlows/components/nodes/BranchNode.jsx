import { Handle, Position } from 'reactflow';
import BaseNode from './BaseNode';
import Badge from '@/components/ui/Badge';

const BranchNode = ({ data }) => {
  const branches = data.branches || 2;

  return (
    <div className="relative">
      <BaseNode variant="branch" hasOutput={false}>
        <div className="flex items-center gap-2">
          <Badge variant="warning" className="text-xs uppercase">Branch</Badge>
        </div>
        <div className="text-sm font-semibold text-text">{data.label || 'Branch'}</div>
        {data.description && (
          <div className="text-xs text-muted">{data.description}</div>
        )}
      </BaseNode>
      {/* Multiple outputs */}
      {Array.from({ length: branches }).map((_, i) => (
        <Handle
          key={i}
          type="source"
          position={Position.Bottom}
          id={`branch-${i}`}
          style={{ left: `${(100 / (branches + 1)) * (i + 1)}%` }}
          className="w-3 h-3 bg-border"
        />
      ))}
    </div>
  );
};

export default BranchNode;
