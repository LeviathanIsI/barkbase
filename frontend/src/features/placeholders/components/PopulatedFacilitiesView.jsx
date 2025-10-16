import { useState } from 'react';
import { Building, MapPin, Users, Clock, AlertTriangle, Plus, Search, Settings, Eye, BarChart3 } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const PopulatedFacilitiesView = ({ facilitiesData, onRunClick }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [buildingFilter, setBuildingFilter] = useState('all');

  // Calculate capacity stats
  const totalBoardingCapacity = 34;
  const currentBoardingOccupancy = 18;
  const totalDaycareCapacity = 37;
  const currentDaycareOccupancy = 24;

  const boardingUtilization = Math.round((currentBoardingOccupancy / totalBoardingCapacity) * 100);
  const daycareUtilization = Math.round((currentDaycareOccupancy / totalDaycareCapacity) * 100);

  // Filter runs based on search and filters
  const filteredRuns = facilitiesData.buildings.flatMap(building =>
    building.runs.filter(run => {
      const matchesSearch = !searchTerm ||
        run.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        run.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (run.pet && run.pet.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = statusFilter === 'all' || run.status === statusFilter;
      const matchesType = typeFilter === 'all' || run.type.includes(typeFilter);
      const matchesBuilding = buildingFilter === 'all' || building.id === buildingFilter;

      return matchesSearch && matchesStatus && matchesType && matchesBuilding;
    })
  );

  const RunCard = ({ run, building }) => {
    const getStatusColor = (status) => {
      switch (status) {
        case 'occupied': return 'bg-green-100 border-green-300 text-green-800';
        case 'available': return 'bg-blue-100 border-blue-300 text-blue-800';
        case 'maintenance': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
        default: return 'bg-gray-100 border-gray-300 text-gray-800';
      }
    };

    const getStatusIcon = (status) => {
      switch (status) {
        case 'occupied': return '🟢';
        case 'available': return '✅';
        case 'maintenance': return '⚠️';
        default: return '❌';
      }
    };

    return (
      <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => onRunClick(run)}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-gray-900">{run.name}</h4>
              <span className={`px-2 py-1 rounded-full text-xs border ${getStatusColor(run.status)}`}>
                {getStatusIcon(run.status)} {run.status}
              </span>
            </div>
            <p className="text-sm text-gray-600">{run.type} • {run.size}</p>
            <p className="text-xs text-gray-500">{building.name}</p>
          </div>
        </div>

        {run.pet && (
          <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded">
            <p className="text-sm font-medium text-green-900">
              🐕 {run.pet} ({run.petBreed})
            </p>
            <p className="text-xs text-green-700">
              {run.checkoutDate ? `Out: ${new Date(run.checkoutDate).toLocaleDateString()}` : 'Current guest'}
            </p>
          </div>
        )}

        {run.status === 'maintenance' && (
          <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm font-medium text-yellow-900">Cleaning/repairs</p>
            <p className="text-xs text-yellow-700">Back: Oct 16, 2025</p>
          </div>
        )}

        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onRunClick(run); }}>
            <Eye className="w-3 h-3 mr-1" />
            View
          </Button>
          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); /* handle edit */ }}>
            <Settings className="w-3 h-3 mr-1" />
            Edit
          </Button>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Capacity Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-600">TOTAL CAPACITY</p>
              <p className="text-2xl font-bold text-gray-900">{totalBoardingCapacity + totalDaycareCapacity}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Boarding:</span>
              <span className="font-medium">{totalBoardingCapacity} kennels</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Daycare:</span>
              <span className="font-medium">{totalDaycareCapacity} spots</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-600">CURRENT OCCUPANCY</p>
              <p className="text-2xl font-bold text-gray-900">{currentBoardingOccupancy + currentDaycareOccupancy}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Boarding:</span>
              <span className="font-medium">{currentBoardingOccupancy}/{totalBoardingCapacity} ({boardingUtilization}%)</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Daycare:</span>
              <span className="font-medium">{currentDaycareOccupancy}/{totalDaycareCapacity} ({daycareUtilization}%)</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-600">UTILIZATION TODAY</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(((currentBoardingOccupancy + currentDaycareOccupancy) / (totalBoardingCapacity + totalDaycareCapacity)) * 100)}%
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline">
              <Eye className="w-3 h-3 mr-1" />
              View Dashboard
            </Button>
            <Button size="sm" variant="outline">
              <BarChart3 className="w-3 h-3 mr-1" />
              Analytics
            </Button>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Run
        </Button>
        <Button variant="outline">
          <MapPin className="w-4 h-4 mr-2" />
          Visual Layout View
        </Button>
        <Button variant="outline">
          <BarChart3 className="w-4 h-4 mr-2" />
          Capacity Analytics
        </Button>
      </div>

      {/* Filters and Search */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search runs by name, ID, or pet..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="available">Available</option>
              <option value="occupied">Occupied</option>
              <option value="maintenance">Maintenance</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
              <option value="luxury">Luxury</option>
              <option value="outdoor">Outdoor</option>
              <option value="cat">Cat</option>
            </select>

            <select
              value={buildingFilter}
              onChange={(e) => setBuildingFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Buildings</option>
              <option value="building-a">Building A</option>
              <option value="outdoor">Outdoor Runs</option>
            </select>
          </div>

          <div className="text-sm text-gray-600">
            Showing {filteredRuns.length} runs
          </div>
        </div>
      </Card>

      {/* Boarding Kennels */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">
          🏠 Boarding Kennels ({currentBoardingOccupancy}/{totalBoardingCapacity} occupied)
        </h3>

        {/* Building A - Small Kennels */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Building className="w-4 h-4" />
            Building A: Small Kennels (up to 25 lbs)
          </h4>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {facilitiesData.buildings[0].runs
              .filter(run => run.type === 'small')
              .map(run => (
                <RunCard key={run.id} run={run} building={facilitiesData.buildings[0]} />
              ))}
          </div>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="outline">
              <Plus className="w-3 h-3 mr-1" />
              Add Small Kennel
            </Button>
            <Button size="sm" variant="outline">
              View All (5 total)
            </Button>
          </div>
        </div>

        {/* Building A - Medium Kennels */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Building className="w-4 h-4" />
            Building A: Medium Kennels (25-60 lbs)
          </h4>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {facilitiesData.buildings[0].runs
              .filter(run => run.type === 'medium')
              .map(run => (
                <RunCard key={run.id} run={run} building={facilitiesData.buildings[0]} />
              ))}
          </div>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="outline">
              <Plus className="w-3 h-3 mr-1" />
              Add Medium Kennel
            </Button>
            <Button size="sm" variant="outline">
              View All (8 total)
            </Button>
          </div>
        </div>

        {/* Building A - Large Kennels */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Building className="w-4 h-4" />
            Building A: Large Kennels (60-90 lbs)
          </h4>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {facilitiesData.buildings[0].runs
              .filter(run => run.type === 'large')
              .map(run => (
                <RunCard key={run.id} run={run} building={facilitiesData.buildings[0]} />
              ))}
          </div>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="outline">
              <Plus className="w-3 h-3 mr-1" />
              Add Large Kennel
            </Button>
            <Button size="sm" variant="outline">
              View All (6 total)
            </Button>
          </div>
        </div>
      </div>

      {/* Luxury Suites */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
          <Building className="w-4 h-4" />
          Building A: Luxury Suites
        </h4>
        <div className="grid gap-4 md:grid-cols-2">
          {facilitiesData.buildings[0].runs
            .filter(run => run.type === 'luxury')
            .map(run => (
              <RunCard key={run.id} run={run} building={facilitiesData.buildings[0]} />
            ))}
        </div>
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="outline">
            <Plus className="w-3 h-3 mr-1" />
            Add Luxury Suite
          </Button>
          <Button size="sm" variant="outline">
            View All (2 total)
          </Button>
        </div>
      </div>

      {/* Outdoor Runs */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Outdoor Runs
        </h4>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {facilitiesData.buildings[1].runs.map(run => (
            <RunCard key={run.id} run={run} building={facilitiesData.buildings[1]} />
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="outline">
            <Plus className="w-3 h-3 mr-1" />
            Add Outdoor Run
          </Button>
          <Button size="sm" variant="outline">
            View All (4 total)
          </Button>
        </div>
      </div>

      {/* Daycare Areas */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">
          🎾 Daycare Areas ({currentDaycareOccupancy}/{totalDaycareCapacity} present)
        </h3>

        {facilitiesData.daycareAreas.map(area => (
          <Card key={area.id} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-lg font-semibold text-gray-900">{area.name}</h4>
                <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                  <span>Max capacity: {area.maxCapacity} dogs</span>
                  <span>Currently: {area.currentCount} dogs</span>
                  <span className={area.currentCount > area.maxCapacity * 0.8 ? 'text-orange-600 font-medium' : ''}>
                    {Math.round((area.currentCount / area.maxCapacity) * 100)}% full
                  </span>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Staff assigned: {area.staffAssigned}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Eye className="w-4 h-4 mr-1" />
                  View Schedule
                </Button>
                <Button variant="outline" size="sm">
                  <Users className="w-4 h-4 mr-1" />
                  Assign Dog
                </Button>
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4 mr-1" />
                  Staff Management
                </Button>
              </div>
            </div>

            {area.currentCount > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Dogs currently in area:</p>
                <div className="flex flex-wrap gap-2">
                  {area.pets.slice(0, 6).map((pet, index) => (
                    <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                      {pet}
                    </span>
                  ))}
                  {area.pets.length > 6 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">
                      +{area.pets.length - 6} more
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                area.currentCount >= area.maxCapacity ? 'bg-red-100 text-red-800' :
                area.currentCount >= area.maxCapacity * 0.8 ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                {area.currentCount >= area.maxCapacity ? 'At Capacity' :
                 area.currentCount >= area.maxCapacity * 0.8 ? 'Limited New Admissions' :
                 'Space Available'}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Cat Boarding */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          🐱 Cat Boarding (4/6 occupied)
        </h3>

        <div>
          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Building className="w-4 h-4" />
            Building B: Cat Condos
          </h4>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {facilitiesData.catAreas.map(catArea => (
              <Card key={catArea.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-900">{catArea.name}</h4>
                    <p className="text-sm text-gray-600">Cat Condo • Multi-level</p>
                    <p className="text-xs text-gray-500">Building B</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs border ${
                    catArea.status === 'occupied'
                      ? 'bg-green-100 border-green-300 text-green-800'
                      : 'bg-blue-100 border-blue-300 text-blue-800'
                  }`}>
                    {catArea.status === 'occupied' ? '🟢 Occupied' : '✅ Available'}
                  </span>
                </div>

                {catArea.pet && (
                  <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded">
                    <p className="text-sm font-medium text-green-900">
                      🐱 {catArea.pet} ({catArea.petBreed})
                    </p>
                    <p className="text-xs text-green-700">
                      {catArea.checkoutDate ? `Out: ${new Date(catArea.checkoutDate).toLocaleDateString()}` : 'Current guest'}
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => onRunClick(catArea)}>
                    <Eye className="w-3 h-3 mr-1" />
                    View
                  </Button>
                  <Button size="sm" variant="outline">
                    <Settings className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                </div>
              </Card>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="outline">
              <Plus className="w-3 h-3 mr-1" />
              Add Cat Condo
            </Button>
            <Button size="sm" variant="outline">
              View All (6 total)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PopulatedFacilitiesView;
