/**
 * ActionConfigurator
 * Router component that selects the appropriate action config panel
 * based on the action type.
 */

import EmailSendConfig from './actionConfigs/EmailSendConfig';
import SmsSendConfig from './actionConfigs/SmsSendConfig';
import TaskCreateConfig from './actionConfigs/TaskCreateConfig';
import NoteCreateConfig from './actionConfigs/NoteCreateConfig';
import PrintDocumentConfig from './actionConfigs/PrintDocumentConfig';
import HttpWebhookConfig from './actionConfigs/HttpWebhookConfig';
import FieldSetConfig from './actionConfigs/FieldSetConfig';
import FieldIncrementConfig from './actionConfigs/FieldIncrementConfig';
import SegmentAddConfig from './actionConfigs/SegmentAddConfig';
import SegmentRemoveConfig from './actionConfigs/SegmentRemoveConfig';
import FeeAddConfig from './actionConfigs/FeeAddConfig';
import DiscountApplyConfig from './actionConfigs/DiscountApplyConfig';
import InvoiceCreateConfig from './actionConfigs/InvoiceCreateConfig';
import StatusUpdateConfig from './actionConfigs/StatusUpdateConfig';
import VaccinationRemindConfig from './actionConfigs/VaccinationRemindConfig';
import ReservationCreateConfig from './actionConfigs/ReservationCreateConfig';
import ReservationCancelConfig from './actionConfigs/ReservationCancelConfig';
import ReviewRequestConfig from './actionConfigs/ReviewRequestConfig';
import OwnerNotifyConfig from './actionConfigs/OwnerNotifyConfig';
import TeamNotifyConfig from './actionConfigs/TeamNotifyConfig';
import FileGenerateConfig from './actionConfigs/FileGenerateConfig';
import PdfGenerateConfig from './actionConfigs/PdfGenerateConfig';
import QueueEnqueueConfig from './actionConfigs/QueueEnqueueConfig';
import CustomJsConfig from './actionConfigs/CustomJsConfig';

/**
 * Action type to component mapping
 * Each action type routes to its dedicated config component
 */
const ACTION_CONFIG_MAP = {
  'email.send': EmailSendConfig,
  'sms.send': SmsSendConfig,
  'task.create': TaskCreateConfig,
  'note.create': NoteCreateConfig,
  'print.document': PrintDocumentConfig,
  'http.webhook': HttpWebhookConfig,
  'field.set': FieldSetConfig,
  'field.increment': FieldIncrementConfig,
  'segment.add': SegmentAddConfig,
  'segment.remove': SegmentRemoveConfig,
  'fee.add': FeeAddConfig,
  'discount.apply': DiscountApplyConfig,
  'invoice.create': InvoiceCreateConfig,
  'status.update': StatusUpdateConfig,
  'vaccination.remind': VaccinationRemindConfig,
  'reservation.create': ReservationCreateConfig,
  'reservation.cancel': ReservationCancelConfig,
  'review.request': ReviewRequestConfig,
  'owner.notify': OwnerNotifyConfig,
  'team.notify': TeamNotifyConfig,
  'file.generate': FileGenerateConfig,
  'pdf.generate': PdfGenerateConfig,
  'queue.enqueue': QueueEnqueueConfig,
  'custom.js': CustomJsConfig,
};

/**
 * Default/Fallback configuration panel
 * Shown when action type is not recognized or not yet configured
 */
const DefaultConfig = ({ node, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-text mb-3">Action Configuration</h3>
        <div className="p-4 rounded-lg border border-border bg-background">
          <div className="text-sm font-medium text-text mb-2">
            {node?.data?.label || 'Untitled Action'}
          </div>
          <div className="text-xs text-muted mb-4">
            Action Type: {node?.data?.actionType || 'Not specified'}
          </div>
          <div className="p-3 rounded-lg border border-yellow-500/30 bg-yellow-50 dark:bg-yellow-950/10">
            <p className="text-xs text-yellow-300">
              {node?.data?.actionType
                ? `Configuration panel for "${node.data.actionType}" is not implemented yet.`
                : 'Please select an action type from the sidebar.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Main ActionConfigurator component
 * Routes to the appropriate config panel based on actionType
 */
const ActionConfigurator = ({ node, onUpdate }) => {
  const actionType = node?.data?.actionType;

  // Get the config component for this action type
  const ConfigComponent = ACTION_CONFIG_MAP[actionType] || DefaultConfig;

  return <ConfigComponent node={node} onUpdate={onUpdate} />;
};

export default ActionConfigurator;
