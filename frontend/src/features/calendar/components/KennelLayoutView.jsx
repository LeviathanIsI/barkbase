import { Edit, Move, AlertTriangle, Plus } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const KennelLayoutView = ({ currentDate, onBookingClick, filters }) => {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Kennel Layout</h2>
        <Button variant="outline">
          <Edit className="w-4 h-4 mr-2" />
          Edit Layout
        </Button>
      </div>

      <p className="text-gray-600 mb-6">
        Visual overview of your facility
      </p>

      {/* Indoor Runs */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🏠 INDOOR RUNS - Building A</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { id: 'K-1', size: 'Large', occupied: true, pet: 'Max - Golden Retriever', outDate: 'Oct 18' },
            { id: 'K-2', size: 'Medium', occupied: true, pet: 'Buddy - Husky', outDate: 'Oct 16' },
            { id: 'K-3', size: 'Large', occupied: true, pet: 'Bella - Labrador', outDate: 'Oct 17' },
            { id: 'K-4', size: 'Small', occupied: true, pet: 'Duke - Terrier', outDate: 'Oct 15' },
            { id: 'K-5', size: 'Large', occupied: true, pet: 'Luna - Poodle', outDate: 'Oct 19' },
            { id: 'K-6', size: 'Medium', occupied: false },
            { id: 'K-7', size: 'Large', occupied: true, pet: 'Rocky - Shepherd', outDate: 'Oct 20' },
            { id: 'K-8', size: 'Medium', occupied: false }
          ].map(kennel => (
            <div key={kennel.id} className={`border-2 rounded-lg p-4 ${kennel.occupied ? 'border-green-300 bg-green-50' : 'border-gray-300 bg-gray-50'}`}>
              <div className="text-center">
                <div className="font-semibold text-gray-900">{kennel.id}</div>
                <div className="text-sm text-gray-600">{kennel.size}</div>
                {kennel.occupied ? (
                  <div className="mt-2">
                    <div className="text-xs font-medium text-green-800">✅ {kennel.pet}</div>
                    <div className="text-xs text-gray-600">Out: {kennel.outDate}</div>
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-gray-500">🟢 OPEN</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Outdoor Runs */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🌳 OUTDOOR RUNS - Play Area</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { id: 'OUT-1', size: 'X-Large', occupied: true, pet: 'Rocky - Shepherd' },
            { id: 'OUT-2', size: 'Large', occupied: false },
            { id: 'OUT-3', size: 'Medium', occupied: false }
          ].map(kennel => (
            <div key={kennel.id} className={`border-2 rounded-lg p-4 ${kennel.occupied ? 'border-green-300 bg-green-50' : 'border-gray-300 bg-gray-50'}`}>
              <div className="text-center">
                <div className="font-semibold text-gray-900">{kennel.id}</div>
                <div className="text-sm text-gray-600">{kennel.size}</div>
                {kennel.occupied ? (
                  <div className="mt-2">
                    <div className="text-xs font-medium text-green-800">✅ {kennel.pet}</div>
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-gray-500">🟢 OPEN</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Capacity Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-blue-900">CAPACITY: 13/20 kennels occupied (65%)</div>
            <div className="text-sm text-blue-700">• 7 available now</div>
            <div className="text-sm text-blue-700">• 2 check-outs today (K-4, K-5 will open)</div>
            <div className="text-sm text-blue-700">• 3 check-ins pending</div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline">
          <Move className="w-4 h-4 mr-2" />
          Assign Kennel
        </Button>
        <Button variant="outline">
          <Move className="w-4 h-4 mr-2" />
          Move Pet
        </Button>
        <Button variant="outline">
          <AlertTriangle className="w-4 h-4 mr-2" />
          Mark Maintenance
        </Button>
        <Button variant="outline">
          <Plus className="w-4 h-4 mr-2" />
          Add Kennel
        </Button>
      </div>
    </Card>
  );
};

export default KennelLayoutView;
