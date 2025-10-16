import { Clock, Users, MessageCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const StaffAssignmentView = ({ pets }) => {
  const staff = [
    {
      id: 1,
      name: 'Jenny Martinez',
      shift: 'Morning Shift (8 AM - 2 PM)',
      status: 'active',
      location: 'Play Area A',
      assignedPets: [
        { name: 'Charlie', breed: 'Beagle', status: 'completed', time: '8:30 AM' },
        { name: 'Max', breed: 'German Shepherd', status: 'completed', time: '9:00 AM' },
        { name: 'Lucy', breed: 'Siamese Cat', status: 'pending', time: '10:00 AM', note: 'Arriving soon' }
      ],
      pendingTasks: [
        'Bella check-in (overdue)',
        'Lucy arrival prep (30 mins)'
      ]
    },
    {
      id: 2,
      name: 'Mike Thompson',
      shift: 'Afternoon Shift (2 PM - 8 PM)',
      status: 'scheduled',
      assignedPets: [
        { name: 'Buddy', breed: 'Husky', status: 'scheduled', time: '5:30 PM' },
        { name: 'Charlie', breed: 'Beagle', status: 'scheduled', time: '3:45 PM', note: 'Check-out' }
      ],
      pendingTasks: [
        'Afternoon play session (3:00 PM)',
        'Process check-outs (3:45 PM start)'
      ]
    }
  ];

  const unassignedPets = [
    { name: 'Bella', breed: 'Golden Retriever', reason: 'waiting for check-in' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Staff Assignments</h2>
        <Button variant="outline">
          Manage Staff
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {staff.map(staffMember => (
          <Card key={staffMember.id} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{staffMember.name}</h3>
                <p className="text-sm text-gray-600">{staffMember.shift}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-2 h-2 rounded-full ${
                    staffMember.status === 'active' ? 'bg-green-500' :
                    staffMember.status === 'scheduled' ? 'bg-blue-500' : 'bg-gray-500'
                  }`}></div>
                  <span className="text-sm text-gray-600 capitalize">{staffMember.status}</span>
                  {staffMember.location && (
                    <span className="text-sm text-gray-500">• {staffMember.location}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="mb-4">
              <h4 className="font-medium text-gray-900 mb-2">Assigned pets today:</h4>
              <div className="space-y-2">
                {staffMember.assignedPets.map((pet, index) => (
                  <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                    <div>
                      <div className="font-medium text-gray-900">
                        {pet.name} - {pet.breed}
                      </div>
                      <div className="text-sm text-gray-600">
                        {pet.time} {pet.note && `• ${pet.note}`}
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      pet.status === 'completed' ? 'bg-green-100 text-green-800' :
                      pet.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {pet.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {staffMember.pendingTasks.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium text-gray-900 mb-2">Tasks pending:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  {staffMember.pendingTasks.map((task, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></div>
                      {task}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <MessageCircle className="w-4 h-4 mr-1" />
                Message
              </Button>
              <Button variant="outline" size="sm">
                Reassign Pet
              </Button>
              <Button variant="outline" size="sm">
                View Schedule
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {unassignedPets.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">UNASSIGNED</h3>
          <div className="space-y-3">
            {unassignedPets.map((pet, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded">
                <div>
                  <div className="font-medium text-gray-900">
                    {pet.name} - {pet.breed}
                  </div>
                  <div className="text-sm text-gray-600">{pet.reason}</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    Auto-assign
                  </Button>
                  <Button size="sm" variant="outline">
                    Manual
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="text-center">
        <Button variant="outline">
          View Full Staff Schedule
        </Button>
      </div>
    </div>
  );
};

export default StaffAssignmentView;
