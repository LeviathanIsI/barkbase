import BaseNode from './BaseNode';
import Badge from '@/components/ui/Badge';

const DelayNode = ({ id, data }) => {
  return (
    <BaseNode id={id} data={data} variant="delay">
      <div className="flex items-center gap-2">
        <Badge variant="success" className="text-xs uppercase">Delay</Badge>
      </div>
      <div className="text-sm font-semibold text-text">{data.label || 'Delay'}</div>
      {data.description && (
        <div className="text-xs text-muted">{data.description}</div>
      )}
    </BaseNode>
  );
};

export default DelayNode;
