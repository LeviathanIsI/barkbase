import TwoPaneOpsLayout from '../components/TwoPaneOpsLayout';
import { PageHeader } from '@/components/ui/Card';

const Operations = () => {
  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title="Operations Center"
        description="Manage daily arrivals, departures, and staff scheduling in one place"
      />
      <div className="flex-1 min-h-0">
        <TwoPaneOpsLayout />
      </div>
    </div>
  );
};

export default Operations;


