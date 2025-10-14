import { useState } from 'react';
import { ArrowLeft, UserPlus, UserMinus, Dog } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import { 
  useSegmentMembers, 
  useAddSegmentMembers, 
  useRemoveSegmentMembers 
} from '@/features/communications/api';
import { useOwners } from '@/features/owners/api';

const MemberCard = ({ member, onRemove, canManage }) => {
  const owner = member.owner;
  
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-medium text-text">
            {owner.firstName} {owner.lastName}
          </h4>
          <p className="text-sm text-text-secondary">{owner.email}</p>
          <div className="flex items-center gap-4 mt-2 text-sm text-text-muted">
            <span className="flex items-center gap-1">
              <Dog className="w-4 h-4" />
              {owner._count.pets} pets
            </span>
            <span>{owner._count.bookings} bookings</span>
          </div>
        </div>
        
        {canManage && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onRemove(owner.recordId)}
            className="text-danger hover:bg-danger/10"
          >
            <UserMinus className="w-4 h-4" />
          </Button>
        )}
      </div>
    </Card>
  );
};

const AddMembersForm = ({ segment, onClose }) => {
  const [selectedOwners, setSelectedOwners] = useState([]);
  const { data: owners, isLoading } = useOwners({ limit: 100 });
  const addMembers = useAddSegmentMembers();
  
  // Filter out owners already in segment
  const existingMemberIds = new Set(
    segment.members?.map(m => m.ownerId) || []
  );
  const availableOwners = owners?.data?.filter(
    owner => !existingMemberIds.has(owner.recordId)
  ) || [];

  const handleAdd = async () => {
    if (selectedOwners.length === 0) return;
    
    try {
      await addMembers.mutateAsync({
        segmentId: segment.recordId,
        ownerIds: selectedOwners,
      });
      onClose();
    } catch (error) {
      console.error('Failed to add members:', error);
    }
  };

  return (
    <Card className="mb-6">
      <h4 className="font-medium text-text mb-4">Add Members to Segment</h4>
      
      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : availableOwners.length === 0 ? (
        <p className="text-center py-8 text-text-secondary">
          No available customers to add
        </p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
          {availableOwners.map((owner) => (
            <label
              key={owner.recordId}
              className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
            >
              <input
                type="checkbox"
                value={owner.recordId}
                checked={selectedOwners.includes(owner.recordId)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedOwners([...selectedOwners, owner.recordId]);
                  } else {
                    setSelectedOwners(selectedOwners.filter(recordId => id !== owner.recordId));
                  }
                }}
                className="h-4 w-4 text-primary rounded"
              />
              <div className="flex-1">
                <span className="font-medium text-sm">
                  {owner.firstName} {owner.lastName}
                </span>
                <span className="text-sm text-text-secondary ml-2">
                  {owner.email}
                </span>
              </div>
            </label>
          ))}
        </div>
      )}
      
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleAdd}
          loading={addMembers.isPending}
          disabled={selectedOwners.length === 0}
        >
          Add {selectedOwners.length} Members
        </Button>
      </div>
    </Card>
  );
};

export default function SegmentMembers({ segment, onBack }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const { 
    data, 
    isLoading, 
    fetchNextPage, 
    hasNextPage 
  } = useSegmentMembers(segment.recordId);
  
  const removeMembers = useRemoveSegmentMembers();
  
  const members = data?.pages?.flatMap(page => page.data) || [];
  const canManage = !segment.isAutomatic;

  const handleRemove = async (ownerId) => {
    if (window.confirm('Remove this member from the segment?')) {
      await removeMembers.mutateAsync({
        segmentId: segment.recordId,
        ownerIds: [ownerId],
      });
    }
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          onClick={onBack}
        >
          Back to Segments
        </Button>
        
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-text">{segment.name}</h2>
          <p className="text-text-secondary">
            {data?.pages?.[0]?.total || 0} members
            {segment.isAutomatic && ' (automatically managed)'}
          </p>
        </div>
        
        {canManage && (
          <Button
            leftIcon={<UserPlus className="w-4 h-4" />}
            onClick={() => setShowAddForm(true)}
          >
            Add Members
          </Button>
        )}
      </div>
      
      {showAddForm && (
        <AddMembersForm
          segment={{ ...segment, members }}
          onClose={() => setShowAddForm(false)}
        />
      )}
      
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : members.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-text-secondary">No members in this segment yet</p>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {members.map((member) => (
              <MemberCard
                key={member.recordId}
                member={member}
                onRemove={handleRemove}
                canManage={canManage}
              />
            ))}
          </div>
          
          {hasNextPage && (
            <div className="text-center mt-6">
              <Button
                variant="ghost"
                onClick={() => fetchNextPage()}
              >
                Load More
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

