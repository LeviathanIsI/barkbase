import { useState } from 'react';
import { Users, Plus, Edit2, Trash2, RefreshCw, Zap } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import LoadingState from '@/components/ui/LoadingState';
import { useSegments, useDeleteSegment, useRefreshSegments } from '@/features/communications/api';
import SegmentForm from './SegmentForm';
import SegmentMembers from './SegmentMembers';

const SegmentCard = ({ segment, onEdit, onDelete, onViewMembers }) => {
  const isAutomatic = segment.isAutomatic ?? segment.isDynamic ?? false;
  const isActive = segment.isActive ?? true;
  const memberCount = segment._count?.members ?? segment.memberCount ?? 0;
  const campaignCount = segment._count?.campaigns ?? 0;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h4 className="font-medium text-text">{segment.name}</h4>
            {segment.description && (
              <p className="text-sm text-text-secondary">{segment.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {isAutomatic && (
            <Badge variant="blue" size="sm">
              <Zap className="w-3 h-3 mr-1" />
              Auto
            </Badge>
          )}
          {!isActive && (
            <Badge variant="gray" size="sm">
              Inactive
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-text-secondary">
          <span>{memberCount} members</span>
          {campaignCount > 0 && (
            <span>{campaignCount} campaigns</span>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onViewMembers(segment)}
          >
            View Members
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onEdit(segment)}
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(segment)}
            className="text-danger hover:bg-danger/10"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default function SegmentList() {
  const [showForm, setShowForm] = useState(false);
  const [editingSegment, setEditingSegment] = useState(null);
  const [viewingSegment, setViewingSegment] = useState(null);
  
  const { data: segments, isLoading } = useSegments();
  const deleteSegment = useDeleteSegment();
  const refreshSegments = useRefreshSegments();

  const handleDelete = async (segment) => {
    if (window.confirm(`Are you sure you want to delete "${segment.name}"?`)) {
      await deleteSegment.mutateAsync(segment.recordId ?? segment.id);
    }
  };

  const handleRefresh = async () => {
    await refreshSegments.mutateAsync();
  };

  if (viewingSegment) {
    return (
      <SegmentMembers
        segment={viewingSegment}
        onBack={() => setViewingSegment(null)}
      />
    );
  }

  if (isLoading) {
    return <LoadingState label="Loading segments…" />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-text">Customer Segments</h2>
          <p className="text-text-secondary">
            Group customers for targeted marketing and personalized service
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            leftIcon={<RefreshCw className="w-4 h-4" />}
            onClick={handleRefresh}
            loading={refreshSegments.isPending}
          >
            Refresh Auto Segments
          </Button>
          <Button
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setEditingSegment(null);
              setShowForm(true);
            }}
          >
            Create Segment
          </Button>
        </div>
      </div>
      
      {showForm && (
        <Card className="mb-6">
          <SegmentForm
            segment={editingSegment}
            onClose={() => {
              setShowForm(false);
              setEditingSegment(null);
            }}
          />
        </Card>
      )}
      
      {segments?.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 dark:text-text-tertiary mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text mb-2">No segments yet</h3>
            <p className="text-text-secondary mb-4">
              Create your first segment to start organizing customers
            </p>
            <Button
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setShowForm(true)}
            >
              Create Segment
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {segments?.map((segment) => (
            <SegmentCard
              key={segment.recordId ?? segment.id}
              segment={segment}
              onEdit={(segment) => {
                setEditingSegment(segment);
                setShowForm(true);
              }}
              onDelete={handleDelete}
              onViewMembers={setViewingSegment}
            />
          ))}
        </div>
      )}
    </div>
  );
}

