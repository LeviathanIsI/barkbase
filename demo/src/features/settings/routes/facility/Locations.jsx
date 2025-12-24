import { useState } from 'react';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import StyledSelect from '@/components/ui/StyledSelect';
import SettingsPage from '../../components/SettingsPage';
import { Building, MapPin, Plus, Edit, Trash2 } from 'lucide-react';

const Locations = () => {
  const [buildings, setBuildings] = useState([
    { recordId: 1, name: 'Main Building', description: 'Primary facility with reception and grooming', kennelCount: 20 },
    { recordId: 2, name: 'South Wing', description: 'Quiet area for senior dogs and medical care', kennelCount: 12 },
    { recordId: 3, name: 'Outdoor Pavilion', description: 'Covered outdoor runs and play areas', kennelCount: 8 },
  ]);

  const [areas, setAreas] = useState([
    { recordId: 1, name: 'Reception Area', buildingId: 1, description: 'Front desk and waiting area' },
    { recordId: 2, name: 'Grooming Station', buildingId: 1, description: 'Professional grooming facilities' },
    { recordId: 3, name: 'Medical Suite', buildingId: 2, description: 'Veterinary examination and treatment' },
    { recordId: 4, name: 'Isolation Ward', buildingId: 2, description: 'Quarantine and recovery area' },
    { recordId: 5, name: 'Large Dog Play Area', buildingId: 3, description: 'Outdoor exercise for large breeds' },
  ]);

  const getBuildingName = (buildingId) => {
    const building = buildings.find(b => b.recordId === buildingId);
    return building ? building.name : 'Unknown Building';
  };

  return (
    <SettingsPage 
      title="Facility Locations" 
      description="Organize your facility into buildings and areas for better management and navigation"
    >
      <Card 
        title="Buildings & Structures" 
        description="Define the main buildings and structures in your facility."
      >
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Building className="w-5 h-5 text-muted" />
              <span className="text-sm font-medium">{buildings.length} buildings configured</span>
            </div>
            <Button size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Add Building
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {buildings.map((building) => (
              <div key={building.recordId} className="rounded-lg border border-border bg-surface/30 p-4">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-text">{building.name}</h4>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost">
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="ghost">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted mb-3">{building.description}</p>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" size="sm">
                    {building.kennelCount} accommodations
                  </Badge>
                  <Badge variant="info" size="sm">Active</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card 
        title="Areas & Zones" 
        description="Define specific areas within your buildings for precise location tracking."
      >
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-muted" />
              <span className="text-sm font-medium">{areas.length} areas defined</span>
            </div>
            <Button size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Add Area
            </Button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[600px]">
              <thead className="bg-surface/50">
                <tr className="text-left text-xs font-medium text-muted uppercase tracking-wide">
                  <th className="px-4 py-3">Area Name</th>
                  <th className="px-4 py-3">Building</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {areas.map((area) => (
                  <tr key={area.recordId} className="hover:bg-surface/30">
                    <td className="px-4 py-3">
                      <span className="font-medium text-text">{area.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" size="sm">
                        {getBuildingName(area.buildingId)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted">{area.description}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost">
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      <Card 
        title="Kennel Location Assignments" 
        description="Assign specific kennels to buildings and areas for precise tracking."
      >
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-text">Building</label>
              <StyledSelect
                options={[
                  { value: '', label: 'Select building...' },
                  ...buildings.map(building => ({
                    value: building.recordId.toString(),
                    label: building.name,
                  })),
                ]}
                isClearable={false}
                isSearchable={false}
                placeholder="Select building..."
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-text">Area</label>
              <StyledSelect
                options={[
                  { value: '', label: 'Select area...' },
                  ...areas.map(area => ({
                    value: area.recordId.toString(),
                    label: area.name,
                  })),
                ]}
                isClearable={false}
                isSearchable={false}
                placeholder="Select area..."
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-text">Kennel Range</label>
              <div className="flex gap-2">
                <Input placeholder="From" size="sm" />
                <Input placeholder="To" size="sm" />
              </div>
            </div>
          </div>
          <Button>Assign Locations</Button>
        </div>
      </Card>

      <Card 
        title="Emergency Information" 
        description="Configure emergency procedures and evacuation routes."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-text">Primary Evacuation Route</label>
            <textarea 
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              rows="3"
              placeholder="Describe the primary evacuation route from each building..."
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-text">Emergency Assembly Point</label>
            <Input placeholder="e.g., Front parking lot, South field" />
            <div className="mt-2">
              <label className="mb-2 block text-sm font-medium text-text">Emergency Contacts</label>
              <Input placeholder="Emergency contact numbers" />
            </div>
          </div>
        </div>
      </Card>
    </SettingsPage>
  );
};

export default Locations;

