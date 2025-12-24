import { Users } from 'lucide-react';
import ObjectSetup from '@/components/shared/ObjectSetup';
import AssociationsTab from '../components/AssociationsTab';

const OwnersAssociations = () => {
  return (
    <ObjectSetup
      objectName="owners"
      objectLabel="Owners"
      description="Configure owner records, properties, and lifecycle stages"
      icon={Users}
    >
      <AssociationsTab objectType="owner" />
    </ObjectSetup>
  );
};

export default OwnersAssociations;
