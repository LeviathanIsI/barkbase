import { PawPrint } from 'lucide-react';
import ObjectSetup from '@/components/shared/ObjectSetup';
import AssociationsTab from '../components/AssociationsTab';

const PetsAssociations = () => {
  return (
    <ObjectSetup
      objectName="pets"
      objectLabel="Pets"
      description="Configure pet records, properties, and lifecycle stages"
      icon={PawPrint}
    >
      <AssociationsTab objectType="pet" />
    </ObjectSetup>
  );
};

export default PetsAssociations;
