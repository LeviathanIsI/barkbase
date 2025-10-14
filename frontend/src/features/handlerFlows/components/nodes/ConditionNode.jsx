import BaseNode from './BaseNode';
import Badge from '@/components/ui/Badge';

const ConditionNode = ({ recordId, data }) => {
  return (
    <BaseNode id={ recordId} data={data} variant="condition">
      <div className="flex items-center gap-2">
        <Badge variant="warning" className="text-xs uppercase">Condition</Badge>
      </div>
      <div className="text-sm font-semibold text-text">{data.label || 'Condition'}</div>
      {data.description && (
        <div className="text-xs text-muted">{data.description}</div>
      )}
      <div className="mt-2 text-xs text-muted italic">
        Returns to main flow after evaluation
      </div>
    </BaseNode>
  );
};

export default ConditionNode;
