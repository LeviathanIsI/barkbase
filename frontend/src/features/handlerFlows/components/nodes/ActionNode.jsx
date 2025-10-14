import BaseNode from './BaseNode';
import Badge from '@/components/ui/Badge';

const ActionNode = ({ recordId, data }) => {
  return (
    <BaseNode id={ recordId} data={data} variant="action">
      <div className="flex items-center gap-2">
        <Badge variant="primary" className="text-xs uppercase">Action</Badge>
      </div>
      <div className="text-sm font-semibold text-text">{data.label || 'Action'}</div>
      {data.description && (
        <div className="text-xs text-muted">{data.description}</div>
      )}
    </BaseNode>
  );
};

export default ActionNode;
