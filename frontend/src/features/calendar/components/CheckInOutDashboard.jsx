import { format } from 'date-fns';
import { CheckCircle, Clock, AlertTriangle, Phone, CreditCard, FileText } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const CheckInOutDashboard = ({ currentDate, onBookingClick }) => {
  const pendingCheckIns = [
    {
      id: 1,
      pet: 'Max',
      breed: 'Golden Retriever',
      owner: 'Sarah Johnson',
      kennel: 'K-1',
      scheduledTime: '2:00 PM',
      status: 'on-time',
      paymentStatus: 'paid'
    },
    {
      id: 2,
      pet: 'Bella',
      breed: 'Labrador',
      owner: 'Mike Thompson',
      kennel: 'K-3',
      scheduledTime: '10:00 AM',
      status: 'late',
      overdue: '3 hours',
      paymentStatus: 'paid',
      lastContact: 'No answer'
    },
    {
      id: 3,
      pet: 'Luna',
      breed: 'Poodle',
      owner: 'Emily Davis',
      kennel: 'K-5',
      scheduledTime: '4:00 PM',
      status: 'early',
      earlyBy: '4 hours',
      vaccinationExpires: '10 days',
      paymentStatus: 'paid'
    },
    {
      id: 4,
      pet: 'Buddy',
      breed: 'Husky',
      owner: 'Jessica Lee',
      kennel: 'K-2',
      scheduledTime: '5:30 PM',
      status: 'scheduled',
      paymentStatus: 'paid'
    }
  ];

  const pendingCheckOuts = [
    {
      id: 1,
      pet: 'Duke',
      breed: 'Terrier',
      owner: 'Tom Wilson',
      kennel: 'K-4',
      scheduledTime: '11:00 AM',
      status: 'ready',
      paymentStatus: 'paid',
      reportCardSent: true
    },
    {
      id: 2,
      pet: 'Charlie',
      breed: 'Beagle',
      owner: 'Amanda Brown',
      kennel: 'K-7',
      scheduledTime: '3:00 PM',
      status: 'outstanding-balance',
      outstandingAmount: 145,
      paymentStatus: 'unpaid'
    },
    {
      id: 3,
      pet: 'Rocky',
      breed: 'Shepherd',
      owner: 'David Martinez',
      kennel: 'OUT-1',
      scheduledTime: '6:00 PM',
      status: 'scheduled',
      paymentStatus: 'paid'
    }
  ];

  const completedToday = [
    { time: '8:00 AM', action: 'Daisy checked out' },
    { time: '9:30 AM', action: 'Cooper checked in' },
    { time: '10:15 AM', action: 'Bailey checked out' },
    { time: '11:45 AM', action: 'Sadie checked in' },
    { time: '1:30 PM', action: 'Tucker checked out' }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'on-time': return 'bg-green-100 border-green-300 text-green-800';
      case 'late': return 'bg-red-100 border-red-300 text-red-800';
      case 'early': return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'scheduled': return 'bg-gray-100 border-gray-300 text-gray-800';
      case 'ready': return 'bg-green-100 border-green-300 text-green-800';
      case 'outstanding-balance': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'late': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'early': return <Clock className="w-4 h-4 text-blue-600" />;
      case 'ready': return <CheckCircle className="w-4 h-4 text-green-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Check-ins & Check-outs</h2>
        <span className="text-sm text-gray-600">{format(currentDate, 'EEEE, MMMM d, yyyy')}</span>
      </div>

      {/* Pending Check-ins */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          PENDING CHECK-INS ({pendingCheckIns.length})
        </h3>

        <div className="space-y-4">
          {pendingCheckIns.map((checkin) => (
            <div key={checkin.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(checkin.status)}
                    <span className="font-medium text-gray-900">
                      {checkin.pet} - {checkin.breed}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(checkin.status)}`}>
                      {checkin.scheduledTime}
                      {checkin.status === 'late' && ` (${checkin.overdue} overdue)`}
                      {checkin.status === 'early' && ` (${checkin.earlyBy} early)`}
                    </span>
                  </div>

                  <div className="text-sm text-gray-600 mb-2">
                    Owner: {checkin.owner} • Kennel: {checkin.kennel} • {checkin.paymentStatus === 'paid' ? '✅ Paid' : '❌ Unpaid'}
                  </div>

                  {checkin.lastContact && (
                    <div className="text-sm text-gray-600 mb-2">
                      📞 Last contact: {checkin.lastContact}
                    </div>
                  )}

                  {checkin.vaccinationExpires && (
                    <div className="text-sm text-orange-600 mb-2">
                      ⚠️ Vaccination expires in {checkin.vaccinationExpires}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button size="sm">Check In Now</Button>
                  <Button size="sm" variant="outline">View Details</Button>
                  <Button size="sm" variant="outline">Contact Owner</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Pending Check-outs */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          PENDING CHECK-OUTS ({pendingCheckOuts.length})
        </h3>

        <div className="space-y-4">
          {pendingCheckOuts.map((checkout) => (
            <div key={checkout.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(checkout.status)}
                    <span className="font-medium text-gray-900">
                      {checkout.pet} - {checkout.breed}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(checkout.status)}`}>
                      {checkout.scheduledTime}
                      {checkout.outstandingAmount && ` ($${checkout.outstandingAmount} due)`}
                    </span>
                  </div>

                  <div className="text-sm text-gray-600 mb-2">
                    Owner: {checkout.owner} • Kennel: {checkout.kennel} • {checkout.paymentStatus === 'paid' ? '✅ Paid' : '❌ Unpaid'}
                  </div>

                  {checkout.reportCardSent && (
                    <div className="text-sm text-green-600">
                      Report card: ✅ Sent
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  {checkout.outstandingAmount ? (
                    <>
                      <Button size="sm" variant="outline">
                        <CreditCard className="w-4 h-4 mr-1" />
                        Process Payment
                      </Button>
                      <Button size="sm" variant="outline">Contact Owner</Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm">Check Out Now</Button>
                      <Button size="sm" variant="outline">View Stay Summary</Button>
                    </>
                  )}
                  <Button size="sm" variant="outline">
                    <FileText className="w-4 h-4 mr-1" />
                    Generate Report Card
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Completed Today */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          COMPLETED TODAY ({completedToday.length})
        </h3>

        <div className="space-y-2">
          {completedToday.map((item, index) => (
            <div key={index} className="flex items-center gap-3 text-sm text-gray-600">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>{item.time}</span>
              <span>{item.action}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <Button variant="outline">
            View Full Log
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default CheckInOutDashboard;
