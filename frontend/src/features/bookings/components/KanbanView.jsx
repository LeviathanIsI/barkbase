import { Card } from '@/components/ui/Card';

const KanbanView = ({ bookings, onBookingClick, onBookingMove }) => {
  return (
    <Card className="p-6">
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📋</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Kanban View</h3>
        <p className="text-gray-600">Workflow management with drag-and-drop coming soon...</p>
      </div>
    </Card>
  );
};

export default KanbanView;
