import { Card } from '@/components/ui/Card';

const ComplianceMonitoring = ({ facilitiesData }) => {
  return (
    <Card className="p-6">
      <div className="text-center py-12">
        <div className="text-6xl mb-4">⚖️</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Compliance Monitoring</h3>
        <p className="text-gray-600">Safety alerts and regulatory compliance tracking coming soon...</p>
      </div>
    </Card>
  );
};

export default ComplianceMonitoring;
