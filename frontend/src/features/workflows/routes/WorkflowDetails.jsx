/**
 * WorkflowDetails - Workflow details and analytics page
 * Shows performance metrics, enrollment history, and execution logs
 */
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit3,
  Play,
  Pause,
  Settings,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/cn';
import { useTimezoneUtils } from '@/lib/timezone';

import Button from '@/components/ui/Button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import LoadingState from '@/components/ui/LoadingState';

import {
  useWorkflow,
  useActivateWorkflow,
  usePauseWorkflow,
} from '../hooks';
import { WORKFLOW_STATUS_CONFIG, OBJECT_TYPE_CONFIG } from '../constants';

import PerformanceTab from '../components/details/PerformanceTab';
import EnrollmentHistoryTab from '../components/details/EnrollmentHistoryTab';
import ActionLogsTab from '../components/details/ActionLogsTab';
import SettingsTab from '../components/details/SettingsTab';

export default function WorkflowDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const tz = useTimezoneUtils();
  const [activeTab, setActiveTab] = useState('performance');

  // Queries
  const { data: workflowData, isLoading: isLoadingWorkflow } = useWorkflow(id);

  // Mutations
  const activateMutation = useActivateWorkflow();
  const pauseMutation = usePauseWorkflow();

  const workflow = workflowData?.data;

  // Handlers
  const handleActivate = async () => {
    try {
      await activateMutation.mutateAsync(id);
      toast.success('Workflow activated');
    } catch {
      toast.error('Failed to activate workflow');
    }
  };

  const handlePause = async () => {
    try {
      await pauseMutation.mutateAsync(id);
      toast.success('Workflow paused');
    } catch {
      toast.error('Failed to pause workflow');
    }
  };

  // Loading state
  if (isLoadingWorkflow) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--bb-color-bg-body)]">
        <LoadingState label="Loading workflow details..." />
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--bb-color-bg-body)]">
        <div className="text-[var(--bb-color-text-tertiary)]">
          Workflow not found
        </div>
      </div>
    );
  }

  const statusConfig = WORKFLOW_STATUS_CONFIG[workflow.status] || WORKFLOW_STATUS_CONFIG.draft;
  const objectConfig = OBJECT_TYPE_CONFIG[workflow.object_type] || {};
  const isActive = workflow.status === 'active';

  return (
    <div className="h-screen flex flex-col bg-[var(--bb-color-bg-body)]">
      {/* Header */}
      <div className="border-b border-[var(--bb-color-border-subtle)] bg-[var(--bb-color-bg-surface)]">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left side */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/workflows')}
                className={cn(
                  "p-2 rounded",
                  "text-[var(--bb-color-text-secondary)]",
                  "hover:bg-[var(--bb-color-bg-elevated)]"
                )}
              >
                <ArrowLeft size={20} />
              </button>

              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-semibold text-[var(--bb-color-text-primary)]">
                    {workflow.name}
                  </h1>
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-medium"
                    )}
                    style={{
                      backgroundColor: statusConfig.bgColor,
                      color: statusConfig.color,
                    }}
                  >
                    {statusConfig.label}
                  </span>
                </div>

                <div className="flex items-center gap-4 mt-1 text-sm text-[var(--bb-color-text-tertiary)]">
                  <span className="flex items-center gap-1">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: objectConfig.color }}
                    />
                    {objectConfig.label}
                  </span>
                  <span>
                    Created {tz.formatShortDate(workflow.created_at)}
                  </span>
                </div>
              </div>
            </div>

            {/* Right side - Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate(`/workflows/${id}`)}
                leftIcon={<Edit3 size={16} />}
              >
                Edit
              </Button>

              {isActive ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handlePause}
                  loading={pauseMutation.isPending}
                  leftIcon={<Pause size={16} />}
                >
                  Pause
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleActivate}
                  loading={activateMutation.isPending}
                  leftIcon={<Play size={16} />}
                >
                  Activate
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="enrollment">Enrollment History</TabsTrigger>
              <TabsTrigger value="logs">Action Logs</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'performance' && (
          <PerformanceTab workflowId={id} />
        )}
        {activeTab === 'enrollment' && (
          <EnrollmentHistoryTab workflowId={id} />
        )}
        {activeTab === 'logs' && (
          <ActionLogsTab workflowId={id} />
        )}
        {activeTab === 'settings' && (
          <SettingsTab workflow={workflow} />
        )}
      </div>
    </div>
  );
}
