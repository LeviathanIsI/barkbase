import TriggerNode from './TriggerNode';
import ConditionNode from './ConditionNode';
import ActionNode from './ActionNode';
import DelayNode from './DelayNode';
import CustomCodeNode from './CustomCodeNode';

export const nodeTypes = {
  trigger: TriggerNode,
  condition: ConditionNode,
  action: ActionNode,
  delay: DelayNode,
  customCode: CustomCodeNode,
};

export {
  TriggerNode,
  ConditionNode,
  ActionNode,
  DelayNode,
  CustomCodeNode,
};
