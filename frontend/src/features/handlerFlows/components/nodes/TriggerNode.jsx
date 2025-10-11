import BaseNode from './BaseNode';
import Badge from '@/components/ui/Badge';

const TriggerNode = ({ id, data }) => {
  return (
    <BaseNode id={id} data={data} variant="trigger">
      <div className="flex items-center gap-2">
        <Badge variant="info" className="text-xs uppercase">Trigger</Badge>
      </div>
      <div className="text-sm font-semibold text-text">{data.label || 'Trigger'}</div>
      {data.description && (
        <div className="text-xs text-muted">{data.description}</div>
      )}
    </BaseNode>
  );
};

export default TriggerNode;
