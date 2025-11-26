import { Card } from '@/components/ui/Card';

const VisualLayoutView = ({ facilitiesData, onRunClick }) => {
  return (
    <Card className="p-6">
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📐</div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary mb-2">Visual Facility Layout</h3>
        <p className="text-gray-600 dark:text-text-secondary">Interactive floor plan with drag-and-drop kennel management coming soon...</p>
      </div>
    </Card>
  );
};

export default VisualLayoutView;
