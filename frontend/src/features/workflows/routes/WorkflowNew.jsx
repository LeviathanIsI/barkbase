/**
 * Workflow Creation Entry Point
 * Immediately creates a new workflow and redirects to builder with trigger panel open
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { createWorkflow } from '../api';
import toast from 'react-hot-toast';

export default function WorkflowNewPage() {
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    const createNewWorkflow = async () => {
      try {
        // Create a new draft workflow
        const workflowData = {
          name: `Unnamed workflow - ${new Date().toISOString()}`,
          object_type: 'pet', // Default, will be set when trigger is configured
          status: 'draft',
          entry_condition: {
            trigger_type: 'manual', // Default to manual until configured
          },
          settings: {},
        };

        const response = await createWorkflow(workflowData);

        if (response.data?.id) {
          // Redirect to builder with trigger panel open
          navigate(`/workflows/${response.data.id}?panel=trigger`, { replace: true });
        } else {
          throw new Error('Failed to create workflow');
        }
      } catch (err) {
        console.error('Failed to create workflow:', err);
        setError(err.message || 'Failed to create workflow');
        toast.error('Failed to create workflow');
        // Redirect back to workflows list after a delay
        setTimeout(() => navigate('/workflows'), 2000);
      }
    };

    createNewWorkflow();
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-[calc(100vh-120px)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-2">{error}</p>
          <p className="text-sm text-[color:var(--bb-color-text-muted)]">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-120px)] flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-[color:var(--bb-color-accent)]" />
        <p className="text-[color:var(--bb-color-text-primary)]">Creating workflow...</p>
      </div>
    </div>
  );
}
