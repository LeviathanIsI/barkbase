import BaseNode from './BaseNode';
import Badge from '@/components/ui/Badge';

const CustomCodeNode = ({ recordId, data }) => {
  return (
    <BaseNode id={ recordId} data={data} variant="code">
      <div className="flex items-center gap-2">
        <Badge variant="info" className="text-xs uppercase">Custom code</Badge>
      </div>
      <div className="text-sm font-semibold text-text">{data.label || 'Custom code'}</div>
      {data.description && (
        <div className="text-xs text-muted">{data.description}</div>
      )}
    </BaseNode>
  );
};

export default CustomCodeNode;
